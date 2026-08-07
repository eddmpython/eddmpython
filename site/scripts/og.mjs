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
 * 래스터화는 로컬에 설치된 Chromium 계열 브라우저를 쓴다. 빌드 의존성이 아니라
 * 개발 도구다. BROWSER_PATH 환경변수로 경로를 지정할 수 있다.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { MARK, BRAND } from "../src/brand.ts";
import { PRODUCTS } from "../src/products.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "public", "og.png");

/* styles.css 의 --eddm-* 토큰. Tailwind 클래스명에서 실제 값으로 옮긴다. */
const DOT = {
  "bg-dartlab": "#7da2e8",
  "bg-codaro": "#dfa14e",
  "bg-xlpod": "#57b98a",
  "bg-pyproc": "#b48ddb",
};

const CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function findBrowser() {
  for (const p of CANDIDATES) {
    if (p && existsSync(p)) return p;
  }
  throw new Error(
    "Chromium 계열 브라우저를 찾지 못했습니다. BROWSER_PATH 로 경로를 지정합니다",
  );
}

const markSvg = (width) => `
<svg viewBox="${MARK.viewBox}" width="${width}" style="display:block">
  <path d="${MARK.body}" fill="none" stroke="${BRAND.ivory}" stroke-width="${MARK.strokeWidth}"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${MARK.head}" fill="${BRAND.ivory}"/>
  <path d="${MARK.eye}" fill="${BRAND.eye}"/>
</svg>`;

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
  .brand span{font-weight:400;color:${BRAND.ivory}b3}
  h1{font-size:63px;line-height:1.28;font-weight:700;letter-spacing:-.03em;word-break:keep-all}
  ul{display:flex;gap:30px;margin-top:38px;list-style:none;font-size:25px;color:${BRAND.ivory}cc}
  li{display:flex;align-items:center;gap:10px}
  i{width:11px;height:11px;border-radius:50%;display:block}
</style></head>
<body>
  <div style="flex:none">${markSvg(258)}</div>
  <div>
    <div class="brand"><b>eddm</b><span>python</span></div>
    <h1>복잡한 업무를,<br>실제로 작동하는 자동화로.</h1>
    <ul>${PRODUCTS.map(
      (p) => `<li><i style="background:${DOT[p.dotClass]}"></i>${p.name}</li>`,
    ).join("")}</ul>
  </div>
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), "eddm-og-"));
try {
  const page = join(tmp, "og.html");
  writeFileSync(page, html, "utf8");
  execFileSync(
    findBrowser(),
    [
      "--headless=old",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      "--virtual-time-budget=6000",
      `--screenshot=${OUT}`,
      `file:///${page.replace(/\\/g, "/")}`,
    ],
    { stdio: "ignore" },
  );
  console.log(`og.png 생성 완료: ${OUT}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
