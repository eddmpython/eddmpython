/**
 * 강의장 화면을 찍는다. 로컬 wrangler dev 가 떠 있어야 한다.
 *
 * 사용: node scripts/classroom-shot.mjs [baseUrl]
 * 출력: ../../eddmpython.out/classroom-shots/
 *
 * 강의장은 sitemap 에 없고 비밀번호 뒤에 있어서 verify:visual 이 못 본다. 그래서 따로 찍는다.
 * 그래도 규칙은 같다. DOM 이 통과했다고 넘어가지 않고 실제 픽셀을 눈으로 본다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
const OUT = resolve(SITE_ROOT, "../../eddmpython.out/classroom-shots");
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const password = process.env.CR_PASSWORD ?? "eddm2026";

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 1000, isMobile: false, hasTouch: false },
  { id: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

await mkdir(OUT, { recursive: true });

for (const viewport of VIEWPORTS) {
  const manifestPath = join(OUT, `pyproc-control.${viewport.id}.json`);
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
        timeoutMs: 180000,
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
            mobile: viewport.isMobile,
            touch: viewport.hasTouch,
          },
          externalEffects: "acknowledged",
          purpose: "eddmpython 강의장 화면 검수",
          artifacts: {
            maxArtifactBytes: 33554432,
            maxTotalBytes: 134217728,
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

  const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE_ROOT, timeoutMs: 30000 });
  if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
  const client = await PyProcControlClient.start(manifestPath, {
    cwd: SITE_ROOT,
    startupTimeoutMs: 180000,
    shutdownTimeoutMs: 30000,
  });

  /** lazy 이미지를 강제로 로드하고 다 뜰 때까지 기다린다. 안 하면 빈 자리로 찍힌다. */
  const hydrate = async (sessionRef) => {
    await client.command(
      sessionRef,
      "Runtime.evaluate",
      {
        expression: `(async () => {
          const imgs = [...document.images];
          imgs.forEach((i) => { i.loading = 'eager'; if (i.dataset.src) i.src = i.dataset.src; });
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise((r) => setTimeout(r, 400));
          window.scrollTo(0, 0);
          await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => {
            i.addEventListener('load', r, { once: true });
            i.addEventListener('error', r, { once: true });
          })));
          return { total: imgs.length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length };
        })()`,
        awaitPromise: true,
        returnByValue: true,
      },
      { expectedRisk: "externalEffect", timeoutMs: 120000 },
    );
  };

  const save = async (sessionRef, name) => {
    await hydrate(sessionRef);
    const captured = await client.act(
      sessionRef,
      [{ kind: "screenshot", format: "jpeg", fullPage: true, expectedRisk: "read" }],
      { timeoutMs: 60000 },
    );
    const image = captured.attachments.find((i) => i.mimeType === "image/jpeg");
    if (!image) throw new Error(`screenshot 없음: ${name}`);
    const file = join(OUT, `${name}.${viewport.id}.jpg`);
    await writeFile(file, image.bytes);
    console.log(`  ${file}`);
    const ref = captured.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
  };

  try {
    // 1) 잠긴 상태의 로그인 화면
    let opened = await client.openTarget(`${base}/cr`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    let session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    await save(session, "01-login");

    // 2) 비밀번호를 넣고 들어간 목록
    // type 액션이 없으므로 값을 직접 넣고 제출한다.
    await client.command(
      session,
      "Runtime.evaluate",
      {
        expression: `(() => {
          const i = document.querySelector('input[name="password"]');
          i.value = ${JSON.stringify(password)};
          document.querySelector('form').submit();
        })()`,
        awaitPromise: false,
        returnByValue: true,
      },
      { expectedRisk: "externalEffect", timeoutMs: 30000 },
    );
    await client.act(
      session,
      [{ kind: "waitFor", selector: "h1", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    await save(session, "02-room");

    // 3) 열린 글 한 편
    opened = await client.openTarget(`${base}/cr/01-automation-start/004-python-basic-syntax`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    await save(session, "03-post");
  } finally {
    await client.stop?.({ timeoutMs: 30000 });
  }
}
console.log(`강의장 화면 ${VIEWPORTS.length * 3}장, ${OUT}`);
