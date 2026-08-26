/**
 * 글 상세를 실제 브라우저로 열어 본문 아래 영역까지 눈으로 본다.
 *
 * 빌드 통과는 화면이 맞다는 증거가 아니다. 특히 댓글은 남의 서비스가 iframe 으로 들어오는
 * 자리라 우리 빌드가 아무리 깨끗해도 CSP 한 줄이나 앱 설치 하나에 막혀 빈 칸이 된다.
 * 그림만 보지 않고 다음을 함께 검사한다.
 *
 *  - giscus 가 이 페이지 head 에 꽂는 스타일시트가 CSP 를 통과하는가 (link#giscus-css)
 *  - iframe 이 실제로 뜨는가
 *  - iframe 이 안 떠도 남는 대체 링크가 있는가
 *  - 데스크톱과 모바일에서 가로로 넘치지 않는가
 *
 * 사용: node scripts/blog-shot.mjs [주소] [slug]
 *   기본은 http://localhost:8788 과 python-qr 이다.
 *   로컬은 `npx wrangler dev --port 8788 --persist-to ../../eddmpython.out/wrangler-state` 로 띄운다.
 *   Worker 를 거쳐야 CSP 가 실제로 붙으므로 vite preview 로는 이 검사가 성립하지 않는다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(SITE, "../../eddmpython.out/blog-shot");
const base = (process.argv[2] ?? "http://localhost:8788").replace(/\/$/, "");
const slug = process.argv[3] ?? "python-qr";
const target = `${base}/blog/${slug}`;

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 1000, mobile: false, touch: false },
  { id: "mobile", width: 390, height: 844, mobile: true, touch: true },
];

await mkdir(OUT, { recursive: true });
console.log(`${target}`);

const checks = [];
const record = (label, ok, detail) => {
  checks.push(ok);
  console.log(`  ${ok ? "통과" : "실패"}  ${label}${detail ? `  ${detail}` : ""}`);
};

for (const viewport of VIEWPORTS) {
  const manifestPath = join(OUT, `pyproc-control.${viewport.id}.json`);
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
        timeoutMs: 300000,
        browser: {
          enabled: true,
          provider: "nativeCdp",
          allowedOrigins: [new URL(base).origin],
          maxRisk: "externalEffect",
          actions: ["snapshot", "screenshot", "waitFor", "navigate", "click"],
          methods: ["Runtime.evaluate"],
          viewport: {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: 1,
            mobile: viewport.mobile,
            touch: viewport.touch,
          },
          externalEffects: "acknowledged",
          purpose: "eddmpython 글 상세 화면 검수",
          artifacts: {
            maxArtifactBytes: 33554432,
            maxTotalBytes: 268435456,
            maxArtifacts: 64,
            inlineMaxBytes: 4194304,
            ttlMs: 900000,
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE, timeoutMs: 30000 });
  if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
  const client = await PyProcControlClient.start(manifestPath, {
    cwd: SITE,
    startupTimeoutMs: 300000,
    shutdownTimeoutMs: 30000,
  });

  try {
    const opened = await client.openTarget(target, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 60000,
    });
    const session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

    const ev = async (expression) => {
      const result = await client.command(
        session,
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
        { expectedRisk: "externalEffect", timeoutMs: 120000 },
      );
      return result?.output?.result?.result?.value;
    };

    // 댓글 iframe 은 lazy 라 뷰포트에 닿아야 src 요청이 나간다.
    await ev(`(async () => {
      const h = [...document.querySelectorAll('h2')].find(x => x.textContent.trim() === '댓글');
      h?.scrollIntoView({ block: 'center' });
      await new Promise(r => setTimeout(r, 7000));
      return true;
    })()`);

    const state = await ev(`(() => {
      const iframe = document.querySelector('iframe.giscus-frame');
      const link = document.querySelector('link#giscus-css');
      return {
        cssLink: Boolean(link),
        cssHref: link?.href ?? null,
        script: Boolean(document.querySelector('script[src*="giscus.app/client.js"]')),
        iframe: Boolean(iframe),
        iframeHeight: Math.round(iframe?.getBoundingClientRect().height ?? 0),
        fallback: Boolean(document.querySelector('a[href$="/discussions"]')),
        docWidth: document.documentElement.scrollWidth,
        winWidth: window.innerWidth,
      };
    })()`);

    console.log(`[${viewport.id}] ${viewport.width}x${viewport.height}`);
    record("giscus 스타일시트가 CSP 를 통과한다", state.cssLink, state.cssHref ?? "");
    record("client.js 가 삽입된다", state.script);
    record("댓글 iframe 이 뜬다", state.iframe, state.iframe ? `높이 ${state.iframeHeight}px` : "");
    record("iframe 이 죽어도 남는 링크가 있다", state.fallback);
    record(
      "가로로 넘치지 않는다",
      state.docWidth <= state.winWidth,
      `${state.docWidth} / ${state.winWidth}`,
    );

    const shot = await client.act(
      session,
      [{ kind: "screenshot", format: "jpeg", fullPage: false, expectedRisk: "read" }],
      { timeoutMs: 120000 },
    );
    const image = shot.attachments.find((a) => a.mimeType === "image/jpeg");
    if (image) {
      const file = join(OUT, `${slug}.comments.${viewport.id}.jpg`);
      await writeFile(file, image.bytes);
      console.log(`  ${file}`);
    }
    const ref = shot.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
  } finally {
    // 메서드 이름은 close 다. stop 은 없다.
    await client.close().catch(() => {});
  }
}

const failed = checks.filter((ok) => !ok).length;
console.log(failed ? `\n검사 ${failed} 개 실패` : "\n검사 전부 통과");
process.exit(failed ? 1 : 0);
