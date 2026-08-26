/**
 * giscus iframe 안으로 들어가 우리 테마 CSS 가 실제로 먹었는지 본다.
 *
 * 바깥 페이지에서는 cross-origin 이라 아무것도 못 본다. CDP 로 그 프레임 타겟에 직접 붙어야
 * 계산된 색을 읽을 수 있다. 일회용 진단이 아니라, 남의 서비스가 우리 브랜드를 입었는지
 * 확인할 유일한 방법이라 남긴다.
 *
 * 사용: node scripts/giscus-probe.mjs [주소]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(SITE, "../../eddmpython.out/blog-shot");
const base = (process.argv[2] ?? "http://localhost:8788").replace(/\/$/, "");
const target = `${base}/blog/python-qr`;

await mkdir(OUT, { recursive: true });
const manifestPath = join(OUT, "pyproc-control.probe.json");
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
        // giscus 프레임 타겟에 붙어야 하므로 그 출처도 허용한다.
        allowedOrigins: [new URL(base).origin, "https://giscus.app"],
        maxRisk: "externalEffect",
        actions: ["snapshot", "screenshot", "waitFor", "navigate", "click"],
        methods: ["Runtime.evaluate"],
        viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, touch: false },
        externalEffects: "acknowledged",
        purpose: "giscus 테마 적용 확인",
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
  const page = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

  const ev = async (session, expression) => {
    const r = await client.command(
      session,
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      { expectedRisk: "externalEffect", timeoutMs: 120000 },
    );
    return r?.output?.result?.result?.value;
  };

  await ev(
    page,
    `(async () => {
      [...document.querySelectorAll('h2')].find(x => x.textContent.trim() === '댓글')?.scrollIntoView({ block: 'center' });
      await new Promise(r => setTimeout(r, 7000));
      return true;
    })()`,
  );

  const themeUrl = await ev(page, `document.querySelector('iframe.giscus-frame')?.src ?? ''`);
  console.log("iframe src:");
  console.log(`  ${decodeURIComponent(themeUrl).slice(0, 300)}`);

  /*
   * iframe 은 별도 타겟으로 잡히지 않는다. 같은 주소를 최상위로 다시 열면 same-origin 이
   * 되어 그 안의 계산된 색을 읽을 수 있다. 위젯 페이지는 theme 을 쿼리로 받으므로 바깥에
   * 박힌 것과 똑같은 조건이 된다.
   */
  if (!themeUrl) throw new Error("iframe src 를 읽지 못했다");
  const direct = await client.openTarget(themeUrl, {
    expectedRisk: "externalEffect",
    waitUntil: "load",
    timeoutMs: 60000,
  });
  const inner = (await client.attachSession(direct.output.targetRef, { timeoutMs: 30000 })).output;
  await ev(inner, `new Promise(r => setTimeout(() => r(true), 4000))`);
  const state = await ev(
    inner,
    `(() => {
      const root = getComputedStyle(document.documentElement);
      const btn = [...document.querySelectorAll('.btn-primary')].pop();
      const sheets = [...document.styleSheets].map(s => {
        let rules = -1;
        try { rules = s.cssRules.length; } catch (e) { rules = -2; }
        return { href: s.href, rules };
      });
      return {
        varBg: root.getPropertyValue('--color-btn-primary-bg').trim(),
        varText: root.getPropertyValue('--color-btn-primary-text').trim(),
        varAccent: root.getPropertyValue('--color-accent-fg').trim(),
        btnFound: Boolean(btn),
        btnClass: btn?.className ?? null,
        btnBg: btn ? getComputedStyle(btn).backgroundColor : null,
        btnColor: btn ? getComputedStyle(btn).color : null,
        sheets,
      };
    })()`,
  );

  console.log("\niframe 안에서 계산된 값:");
  console.log(`  --color-btn-primary-bg   : ${state.varBg || "(빈 값)"}`);
  console.log(`  --color-btn-primary-text : ${state.varText || "(빈 값)"}`);
  console.log(`  --color-accent-fg        : ${state.varAccent || "(빈 값)"}`);
  console.log(`  버튼 발견               : ${state.btnFound} ${state.btnClass ?? ""}`);
  console.log(`  버튼 실제 배경          : ${state.btnBg}`);
  console.log(`  버튼 실제 글자색        : ${state.btnColor}`);
  console.log("\n로드된 스타일시트 (rules -2 는 cross-origin 이라 못 읽음):");
  for (const s of state.sheets) console.log(`  rules=${s.rules}  ${s.href ?? "(inline)"}`);
} finally {
  await client.close().catch(() => {});
}
