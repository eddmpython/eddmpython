/**
 * 디자인 토큰이 한 곳에서만 정의되는지 본다.
 *
 * 정본은 `src/design.ts` 의 DESIGN이다. 랜딩과 Worker 표면은 같은 생성 함수가 만든
 * `--eddm-*` 의미 변수를 쓰고, styles.css는 Tailwind 이름을 그 변수에 연결만 한다.
 *
 * 두 가지를 본다.
 * 1. 모든 렌더 진입점이 디자인 변수 생성 함수를 쓰는가
 * 2. styles.css가 디자인 값을 복제하지 않고 의미 변수만 소비하는가
 * 3. 브랜드 색을 쓰는 파일이 hex를 직접 적고 있지 않은가
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DESIGN, designCssVars, themeColor } from "../src/design.ts";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const add = (where, msg) => problems.push(`${where}: ${msg}`);

// 1. 랜딩 CSS는 값을 복제하지 않고 디자인 의미 변수만 Tailwind 이름에 연결한다.
const css = await readFile(join(SITE, "src/styles.css"), "utf8");
if (/:root\s*\{[^}]*--eddm-/s.test(css)) {
  add("src/styles.css", "디자인 값을 :root에 복제했습니다. designCssVars()를 씁니다");
}
for (const name of ["carbon", "ink", "ivory", "accent", "dartlab", "codaro", "xlpod", "pyproc"]) {
  if (!css.includes(`var(--eddm-${name})`)) add("src/styles.css", `--eddm-${name} 의미 변수를 소비하지 않습니다`);
}

// 폰트 스택도 한 벌이어야 한다. 다르면 자간이 달라져 같은 헤더가 아니게 된다.
if (!css.includes("var(--eddm-font-sans)") || !css.includes("var(--eddm-font-mono)")) {
  add("src/styles.css", "글꼴 스택을 design.ts의 의미 변수에 연결하지 않았습니다");
}

const app = await readFile(join(SITE, "src/App.tsx"), "utf8");
const serverEntry = await readFile(join(SITE, "src/entry-server.tsx"), "utf8");
if (!app.includes('designCssVars("dark")')) add("src/App.tsx", "랜딩에 디자인 변수를 주입하지 않습니다");
if (!serverEntry.includes('designCssVars("dark")')) add("src/entry-server.tsx", "미리 렌더한 페이지에 디자인 변수를 주입하지 않습니다");

// 섹션 제목 값을 정본에 두고도 소비자가 숫자를 다시 쓰면 위계가 다시 갈라진다.
const sectionConsumers = {
  "classroom.ts": "font-size:var(--eddm-section-title-size-mobile)",
  "src/components/Markdown.tsx": "eddm-section-title",
};
for (const [rel, needle] of Object.entries(sectionConsumers)) {
  const text = await readFile(join(SITE, rel), "utf8");
  if (!text.includes(needle)) add(rel, "섹션 제목이 design.ts의 공용 타이포그래피 토큰을 쓰지 않습니다");
}

/**
 * 2. 브랜드 hex 를 직접 적은 곳.
 *
 * 정본(design.ts)과 로고 모듈은 당연히 값을 담는다.
 * 그 밖의 파일이 브랜드 색을 직접 적으면 정본이 둘이 된다.
 */
const BRAND_HEX = [
  DESIGN.palette.carbon,
  DESIGN.palette.ink,
  DESIGN.palette.ivory,
  DESIGN.palette.alert,
];
const EXEMPT = new Set(["src/design.ts", "src/brand.ts", "scripts/check-brand.mjs"]);
const SCAN = ["shell.ts", "admin.ts", "classroom.ts", "classroom-render.ts", "worker.ts"];

for (const rel of SCAN) {
  if (EXEMPT.has(rel)) continue;
  let text;
  try {
    text = await readFile(join(SITE, rel), "utf8");
  } catch {
    continue;
  }
  for (const hex of BRAND_HEX) {
    // 대소문자와 8자리 알파 표기(#f5f3ee8c)까지 잡는다
    const re = new RegExp(hex.replace("#", "#") + "([0-9a-f]{2})?", "gi");
    const hits = text.match(re);
    if (hits) {
      add(rel, `브랜드 색 ${hex}를 직접 적었습니다 (${hits.length}곳). design.ts의 DESIGN을 씁니다`);
    }
  }
}

/**
 * 3. hex 를 변수로 바꾸다 알파가 밖에 남은 자리.
 *
 * `#d8be9166` 을 `var(--eddm-sand)` 로 바꾸면 `var(--eddm-sand)66` 이 된다. CSS 는 그 선언을
 * 통째로 버리므로 테두리가 조용히 사라진다. 실제로 다섯 곳이 그렇게 됐다.
 */
for (const rel of [...SCAN, "src/styles.css"]) {
  let text;
  try {
    text = await readFile(join(SITE, rel), "utf8");
  } catch {
    continue;
  }
  const broken = text.match(/var\(--eddm-[a-z-]+\)[0-9a-f]{2}(?![0-9a-z])/gi);
  if (broken) {
    add(rel, `변수 뒤에 알파가 남았습니다: ${[...new Set(broken)].join(", ")}`);
  }
}

// 강의장 테마 표면은 라이트와 다크에서 같은 의미 토큰을 써야 한다. 배경과 글자에 고정 hex 를
// 다시 넣으면 한쪽 테마에서만 맞는 코드 블록과 실행 칸이 생긴다.
const classroom = await readFile(join(SITE, "classroom.ts"), "utf8");
const admin = await readFile(join(SITE, "admin.ts"), "utf8");
const shell = await readFile(join(SITE, "shell.ts"), "utf8");
const fixedThemeColors = (classroom + admin + shell).match(
  /(?:background(?:-color)?|color|border(?:-[a-z]+)?-color)\s*:\s*#[0-9a-f]{3,8}/gi,
);
if (fixedThemeColors) {
  add(
    "서버 렌더 표면",
    `테마 표면에 고정 색을 썼습니다: ${[...new Set(fixedThemeColors)].join(", ")}. --eddm-* 의미 토큰을 씁니다`,
  );
}
// 테마 토큰은 디자인 생성 함수가 깐다. 운영장과 강의방이 같은 것을 물려받는다.
const adaptiveCss = designCssVars("adaptive");
for (const name of ["--eddm-code-surface", "--eddm-code-focus", "--eddm-danger", "--eddm-overlay"]) {
  if (!adaptiveCss.includes(name)) add("src/design.ts", `${name} 테마 토큰이 없습니다`);
}
if (!shell.includes('designCssVars("adaptive")')) add("shell.ts", "공용 크롬이 adaptive 디자인 변수를 쓰지 않습니다");
/**
 * 운영장이 브랜드 크롬을 실제로 입는지 본다.
 *
 * 비공개 화면이라고 브랜딩을 빼는 것을 막는다. hex 검사만으로는 머리띠도 글꼴도 없는
 * 맨 화면이 통과한다. 로그인해야 보이는 화면이라는 것은 다른 옷을 입을 이유가 아니다.
 */
for (const [needle, why] of [
  ['from "./shell"', "공용 크롬을 import 하지 않습니다"],
  ["header()", "브랜드 머리띠를 넣지 않습니다"],
  ["page({", "공용 문서 뼈대를 쓰지 않습니다"],
]) {
  if (!admin.includes(needle)) add("admin.ts", why);
}

/**
 * 강의 장면의 강조에 테두리와 후광을 두르지 않는다.
 *
 * 2026-08-24 운영자 지시로 원천 금지했다. 짚어야 할 대상에 선을 두르면 그 선이 학습 대상보다
 * 먼저 눈에 들어오고, 화면 뒤에서 보는 사람에게는 내용이 아니라 상자만 남는다. 강조는 밝기와
 * 흐림의 대비로만 한다. 규칙을 적어 두는 것으로는 다시 들어오므로 여기서 막는다.
 *
 * 키보드 초점 링(`:focus-visible`)은 대상이 아니다. 그것은 강조가 아니라 접근성 장치다.
 */
const EMPHASIS_BAN = /(outline\s*:\s*(?!0)|box-shadow\s*:\s*(?!none)|drop-shadow\s*\()/;
for (const line of classroom.split(/\r?\n/)) {
  if (!/\.scene-canvas|\.lecture-scene/.test(line)) continue;
  if (/focus-visible/.test(line)) continue;
  if (EMPHASIS_BAN.test(line)) {
    add("classroom.ts", `강의 장면 강조에 테두리나 후광을 썼습니다: ${line.trim().slice(0, 90)}`);
  }
}

/**
 * 골드는 브랜드 마크의 눈에만 남는다.
 *
 * 강조색과 별개인 로고 눈 색을 위의 BRAND_HEX 검사가 보지 않으므로 따로 확인한다.
 * 강조를 다시 골드로 칠하는 것을 막으려면 값 자체를 따로 걸어야 한다.
 */
const GOLD = DESIGN.palette.eye;
for (const rel of SCAN) {
  let text;
  try {
    text = await readFile(join(SITE, rel), "utf8");
  } catch {
    continue;
  }
  const hits = text.match(new RegExp(GOLD + "([0-9a-f]{2})?", "gi"));
  if (hits) add(rel, `골드 ${GOLD} 를 썼습니다 (${hits.length}곳). 골드는 브랜드 마크의 눈에만 남습니다`);
}

/** 로그인과 조종 화면이 `강의 관리`라는 같은 제품 이름을 쓴다. */
const gate = admin.match(/function loginPage\([\s\S]*?\n\}/)?.[0] ?? "";
if (!gate) add("admin.ts", "loginPage 를 찾지 못했습니다");
else {
  if (!gate.includes('title: "강의 관리"')) add("admin.ts", "로그인 탭 이름이 강의 관리가 아닙니다");
  if (!gate.includes("<h1>강의 관리</h1>")) add("admin.ts", "로그인 화면에 강의 관리 제목이 없습니다");
  if (!gate.includes('name="password"')) add("admin.ts", "로그인 화면에 비밀번호 칸이 없습니다");
  for (const detail of ["강의방 목록", "포함할 커리큘럼", "운영 세션"]) {
    if (gate.includes(detail)) add("admin.ts", `로그인 전에 ${detail} 정보를 내보냅니다`);
  }
}

const consoleView = admin.match(/function consolePage\(\)[\s\S]*?\n\}/)?.[0] ?? "";
if (!consoleView) add("admin.ts", "consolePage 를 찾지 못했습니다");
else {
  if (!consoleView.includes('title: "강의 관리"')) add("admin.ts", "조종 화면 탭 이름이 강의 관리가 아닙니다");
  if (!consoleView.includes('class="adm-title">강의 관리</h1>')) add("admin.ts", "조종 화면에 강의 관리 제목이 없습니다");
  if (consoleView.indexOf('class="new"') > consoleView.indexOf('id="rooms"')) {
    add("admin.ts", "새 강의방의 URL과 비밀번호 입력이 강의방 목록보다 뒤에 있습니다");
  }
}
if (admin.includes("수강생에게 보임")) add("admin.ts", "커리큘럼 상태에 수강생에게 보임 문구를 씁니다");
if (!admin.includes('type="checkbox" data-act="toggle"')) add("admin.ts", "커리큘럼 포함 체크박스가 없습니다");
if (admin.includes("수강생 입장 닫기")) add("admin.ts", "공개한 강의방을 다시 닫는 버튼이 있습니다. 끝난 방은 삭제합니다");
if (admin.includes('"입장 가능"') || admin.includes('"준비 중"')) add("admin.ts", "행동 없는 강의방 상태 문구를 표시합니다");
if (admin.includes('" 만듦"') || admin.includes("const day =")) add("admin.ts", "강의방 생성일을 표시합니다");
if (!admin.includes('class="copy-icon" data-act="copy"')) add("admin.ts", "강의방 URL 옆 복사 아이콘이 없습니다");
if (!admin.includes('class="danger head-action delete-action"')) add("admin.ts", "강의방 삭제가 카드 우상단에 없습니다");

/**
 * 코드 주석을 브라우저로 내보내지 않는다.
 *
 * CSS 와 인라인 스크립트는 템플릿 리터럴이라 주석이 그대로 응답에 실린다. 그 주석에는
 * 실패 이력과 운영자 지시가 적혀 있고, 로그인 화면은 아무나 열어 볼 수 있다. CSS 는
 * page() 가 걷어내고, 인라인 스크립트는 애초에 문자열 안에 주석을 쓰지 않는다.
 */
if (/<style>\$\{SHELL_STYLE\}/.test(shell)) {
  add("shell.ts", "CSS 를 걷어내지 않고 그대로 넣습니다. 주석이 응답에 실립니다");
}
if (!/const style = [\s\S]{0,200}?\.replace\(/.test(shell)) {
  add("shell.ts", "page() 가 CSS 주석을 걷어내는 자리가 없습니다");
}
for (const [name, re] of [
  ["THEME_INIT_SCRIPT", /const THEME_INIT_SCRIPT = `([\s\S]*?)`;/],
  ["THEME_SCRIPT", /const THEME_SCRIPT = `([\s\S]*?)`;/],
]) {
  const body = shell.match(re)?.[1] ?? "";
  if (!body) add("shell.ts", `${name} 을 찾지 못했습니다`);
  else if (/^\s*\/\//m.test(body)) {
    add("shell.ts", `${name} 안에 주석이 있습니다. 설명은 함수 위에 적습니다`);
  }
}

/**
 * 카드 위에 강조 띠를 얹지 않는다.
 *
 * 2026-08-24 운영자 지시다. 로그인 카드 위에 2px 짜리 밝은 선이 깔려 있었다. 그 선은
 * 아무것도 알려 주지 않으면서 카드보다 먼저 눈에 들어온다. 읽어야 할 것은 제목과 입력
 * 칸인데 상자의 윤곽이 먼저 읽힌다. 강조는 밝기로 하고 장식으로 하지 않는다.
 *
 * 두 가지 모양을 다 막는다. `::before` 로 깐 절대위치 띠와 강조색 `border-top` 이다.
 * 앞의 것만 막으면 다음에는 뒤의 모양으로 다시 들어온다. 구분선(`--eddm-line*`)은
 * 대상이 아니다. 그것은 장식이 아니라 영역을 나누는 선이다.
 */
const SURFACES = { "shell.ts": shell, "admin.ts": admin, "classroom.ts": classroom };
for (const [rel, text] of Object.entries(SURFACES)) {
  for (const block of text.match(/[^{}\n]*::(?:before|after)[^{}]*\{[^}]*\}/g) ?? []) {
    const flat = block.replace(/\s+/g, "");
    if (!/position:absolute/.test(flat)) continue;
    if (!/(?:top|bottom):0/.test(flat)) continue;
    if (!/height:(?:[0-3](?:\.\d+)?px|\.\d+rem)/.test(flat)) continue;
    if (!/background/.test(flat)) continue;
    add(rel, `카드에 장식 띠를 얹었습니다: ${block.split("{")[0].trim().slice(0, 60)}`);
  }
  const bar = text.match(/border-top\s*:\s*[\d.]+(?:px|rem)\s+solid\s+var\(--eddm-(?:sand|ivory|accent-line)\)/g);
  if (bar) add(rel, `카드 위에 강조색 선을 그었습니다: ${[...new Set(bar)].join(", ")}`);
}

/**
 * 머리띠의 테마 토글은 옆의 SNS 아이콘과 같은 것이다.
 *
 * 상자를 두르면 링크 넷 옆에서 그것만 단추처럼 튀고, 머리띠에서 가장 안 중요한 것이
 * 가장 눈에 띈다. 2026-08-24 운영자 지시로 테두리를 뺐다.
 */
const toggleRule = shell.match(/\.theme-toggle\s*\{[^}]*\}/)?.[0]?.replace(/\s+/g, "") ?? "";
if (!toggleRule) add("shell.ts", ".theme-toggle 규칙이 없습니다");
else if (!/border:0/.test(toggleRule) || /background:var\(/.test(toggleRule)) {
  add("shell.ts", "테마 토글에 테두리나 배경을 둘렀습니다. 옆의 아이콘과 같은 것이어야 합니다");
}

/**
 * 기본 테마는 라이트다. 2026-08-24 운영자 지시다.
 *
 * 세 가지가 같이 맞아야 실제로 라이트로 뜬다. CSS 기본값, 스크립트가 저장값 없이 고르는
 * 값, 그리고 브라우저 UI 색이다. 하나만 고치면 나머지가 다크로 남아 첫 화면이 번쩍인다.
 * 시스템 설정을 읽지 않는 것도 여기서 지킨다. 같은 주소가 보는 사람의 OS 에 따라 다르게
 * 뜨면 운영자와 수강생이 다른 화면을 본다.
 */
if (!adaptiveCss.includes(':root:not([data-theme="dark"])')) {
  add("src/design.ts", "라이트가 CSS 기본값이 아닙니다. 다크는 [data-theme=\"dark\"]가 붙을 때만 걸립니다");
}
if (!/let saved = "light"/.test(shell)) {
  add("shell.ts", "저장한 선택이 없을 때의 기본이 라이트가 아닙니다");
}
// 주석은 대상이 아니다. 실제로 시스템 설정을 읽는 코드만 잡는다.
if (/matchMedia\s*\(|@media\s*\(\s*prefers-color-scheme/.test(shell)) {
  add("shell.ts", "시스템 테마를 읽습니다. 기본은 라이트 하나이고 고른 사람만 그 선택을 가집니다");
}
if (!shell.includes('content="${esc(themeColor("light"))}"') || themeColor("light") !== DESIGN.theme.light.canvas) {
  add("shell.ts", "theme-color 기본값이 라이트 바탕이 아닙니다");
}

if (problems.length) {
  console.error("디자인 토큰이 갈라졌습니다.\n");
  for (const p of problems) console.error("  " + p);
  console.error("\n정본은 src/design.ts 의 DESIGN입니다.");
  process.exit(1);
}

console.log(`design ok: 단일 토큰 정본, 표면 ${SCAN.length}곳`);
