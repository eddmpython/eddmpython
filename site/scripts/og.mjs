/**
 * og.png 생성기.
 *
 * 공유 미리보기 이미지는 정적 PNG 여야 한다. 주요 플랫폼(X, Facebook, 카카오)이
 * og:image 로 SVG 를 받지 않는다. 그래서 이 파일만 빌드가 아니라 손으로 돌린다.
 *
 *   npm run og
 *
 * 마크 좌표와 제품 목록은 src/brand.ts 와 src/products.ts 에서 읽는다.
 * 이미지에 옛 로고나 없어진 제품이 남는 일이 생기지 않는다.
 *
 * 래스터화는 프로젝트에 고정한 pyproc/control 공개 API를 쓴다.
 * EDDMPYTHON_RUN_DIR에 작업별 실행 공간을 지정하고, 필요한 경우 BROWSER_PATH를 지정한다.
 */
import { once } from "node:events";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { executionRoot } from "./executionWorkspace.mjs";

import { SYMBOL, BRAND, symbolMarkup } from "../src/brand.ts";
import { PRODUCTS } from "../src/products.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "public", "og.png");

/* styles.css 의 --eddm-* 토큰. Tailwind 클래스명에서 실제 값으로 옮긴다. */
const DOT = {
  "bg-accent": BRAND.accent,
  "bg-dartlab": "#7da2e8",
  "bg-codaro": "#dfa14e",
  "bg-xlpod": "#57b98a",
  "bg-pyproc": "#ff5a36",
};

/** 심볼 단독. 도형은 brand.ts 가 낸다. 여기서 좌표를 다시 적지 않는다. */
const symbolSvg = (width) => `
<svg viewBox="${SYMBOL.viewBox}" width="${width}" style="display:block">${symbolMarkup({ ink: BRAND.ivory })}</svg>`;

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{
    background:${BRAND.carbon};
    background-image:radial-gradient(120% 90% at 18% 42%, #1b2220 0%, ${BRAND.carbon} 62%);
    color:${BRAND.ivory};
    font-family:"Pretendard Variable",Pretendard,system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;
    display:flex;align-items:center;gap:82px;padding:0 96px;
  }
  .brand{font-size:31px;letter-spacing:-.02em;margin-bottom:30px}
  .brand b{font-weight:700}
  .brand span{font-weight:700;color:${BRAND.accent}}
  h1{font-size:63px;line-height:1.28;font-weight:700;letter-spacing:-.03em;word-break:keep-all}
  ul{display:flex;gap:30px;margin-top:38px;list-style:none;font-size:25px;color:${BRAND.ivory}cc}
  li{display:flex;align-items:center;gap:10px}
  i{width:11px;height:11px;border-radius:50%;display:block}
</style></head>
<body>
  <!-- 심볼과 워드마크가 떨어져 있어도 한 덩어리로 읽히는 로고 락업이다. -->
  <div style="flex:none">${symbolSvg(258)}</div>
  <div>
    <div class="brand"><b>eddm</b><span>.py</span></div>
    <h1>복잡한 업무를,<br>실제로 작동하는 자동화로.</h1>
    <ul>${PRODUCTS.map(
      (p) => `<li><i style="background:${DOT[p.dotClass]}"></i>${p.name}</li>`,
    ).join("")}</ul>
  </div>
</body></html>`;

const runDir = mkdtempSync(join(executionRoot(), "og-"));
const server = createServer((request, response) => {
  if (request.url !== "/og") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
});
let client;
try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const manifestPath = join(runDir, "pyproc-control.json");
  const executable = process.env.BROWSER_PATH?.trim();
  writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
    timeoutMs: 180000,
    browser: {
      enabled: true,
      provider: "nativeCdp",
      allowedOrigins: [origin],
      maxRisk: "externalEffect",
      actions: ["navigate", "screenshot"],
      methods: ["Runtime.evaluate"],
      viewport: { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false, touch: false },
      ...(executable ? { executable } : {}),
      externalEffects: "acknowledged",
      purpose: "eddmpython 공유 이미지 생성",
    },
  }, null, 2), "utf8");
  const processOptions = {
    cwd: resolve(HERE, ".."),
    env: { ...process.env, TEMP: runDir, TMP: runDir, TMPDIR: runDir },
    startupTimeoutMs: 180000,
    shutdownTimeoutMs: 30000,
  };
  const preflight = await PyProcControlClient.check(manifestPath, {
    ...processOptions,
    timeoutMs: 30000,
  });
  if (preflight.ok !== true) throw new Error(`pyproc-control preflight 실패: ${JSON.stringify(preflight)}`);
  client = await PyProcControlClient.start(manifestPath, processOptions);
  const opened = await client.openTarget(`${origin}/og`, {
    expectedRisk: "externalEffect",
    waitUntil: "load",
    timeoutMs: 60000,
  });
  const attached = await client.attachSession(opened.output.targetRef);
  const ready = await client.command(
    attached.output,
    "Runtime.evaluate",
    {
      expression: `(async () => {
        await document.fonts.ready;
        await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
        return { width: innerWidth, height: innerHeight, fontReady: document.fonts.check('700 63px "Pretendard Variable"') };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    },
    { expectedRisk: "externalEffect", timeoutMs: 60000 },
  );
  const layout = ready.output?.result?.result?.value;
  if (!layout?.fontReady || layout.width !== 1200 || layout.height !== 630) {
    throw new Error(`OG 글꼴 또는 화면 준비 실패: ${JSON.stringify(ready.output)}`);
  }
  const captured = await client.act(attached.output, [
    { kind: "screenshot", format: "png", expectedRisk: "read" },
  ], { timeoutMs: 60000 });
  const image = captured.attachments.find((item) => item.mimeType === "image/png");
  if (!image) throw new Error("OG PNG screenshot attachment가 없습니다");
  const png = Buffer.from(image.bytes);
  if (png.length < 24 || png.toString("hex", 0, 8) !== "89504e470d0a1a0a"
      || png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
    throw new Error("OG PNG가 1200 × 630이 아닙니다");
  }
  writeFileSync(OUT, png);
  console.log(`og.png 생성 완료: ${OUT}`);
} finally {
  try {
    await client?.close();
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    rmSync(runDir, { recursive: true, force: true });
  }
}
