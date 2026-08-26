/**
 * 브랜드 크롬.
 *
 * eddmpython 의 모든 서버 렌더 화면이 여기서 시작한다. 운영장(`admin.ts`)과
 * 강의방(`classroom.ts`)이 같은 머리띠, 같은 색, 같은 글꼴, 같은 테마 토글을 쓴다.
 *
 * **비공개 화면이라고 브랜딩을 빼지 않는다.** 운영장은 로그인해야 보이고 색인도 안 되지만
 * 그것이 다른 옷을 입을 이유는 되지 않는다. 한때 운영 화면이 자기 색을 따로 적어 배경이
 * 미묘하게 달랐고(강의장 carbon, 운영 화면은 그보다 어두운 값), 같은 브랜드인데 화면을
 * 옮기면 이상했다. 색 값은 여기서도 적지 않는다. `src/design.ts` 의 DESIGN이 정본이고
 * `scripts/check-brand.mjs` 가 이 파일에 hex 가 나타나면 배포를 막는다.
 */
import { SYMBOL, BRAND } from "./src/brand";
import { DESIGN, designCssVars, themeColor } from "./src/design";
import { SOCIAL } from "./src/social";
import { esc } from "./classroom-render";
import { randomHex } from "./auth";

/**
 * 바탕, 머리띠, 게이트, 폼. 화면 종류와 무관하게 같은 것.
 *
 * 화면마다의 CSS 는 각자 들고 와서 뒤에 붙인다. 여기에 운영장이나 글 화면의 선택자를
 * 넣지 않는다. 넣는 순간 한쪽만 쓰는 규칙이 모두에게 실린다.
 */
export const SHELL_STYLE = `
${designCssVars("adaptive")}
/**
 * 라이트가 기본이다. 2026-08-24 운영자 지시다.
 *
 * 다크를 \`:root\` 에 깔고 라이트를 덮던 것을 뒤집었다. 저장한 선택이 없거나 스크립트가
 * 아직 안 돌았을 때 무엇으로 뜨는지가 곧 기본값이고, 그 자리를 CSS 가 정한다. 스크립트만
 * 고치면 스크립트가 막힌 화면에서 다크가 나온다.
 *
 * \`:not([data-theme="dark"])\` 를 쓰는 이유는 속성이 아직 안 붙은 첫 순간도 라이트로
 * 잡기 위해서다. 다크는 그 속성이 붙어야만 걸린다.
 */
* { box-sizing: border-box; }
html { min-height:100%; background:var(--eddm-carbon); scrollbar-color:var(--eddm-line-strong) var(--eddm-carbon); }
body { min-height:100vh; min-height:100dvh; margin:0; background:var(--eddm-carbon); color:var(--eddm-ivory); font-family:var(--eddm-font-sans); word-break:keep-all; -webkit-font-smoothing:antialiased;
  line-height:1.7; -webkit-text-size-adjust:100%; }
:focus-visible { outline:2px solid var(--eddm-accent-dim); outline-offset:2px; border-radius:.25rem; }
.sr-only { position:absolute !important; width:1px !important; height:1px !important; padding:0 !important;
  margin:-1px !important; overflow:hidden !important; clip:rect(0,0,0,0) !important;
  white-space:nowrap !important; border:0 !important; }
::selection { background:var(--eddm-accent-line); }
.wrap { max-width:56rem; margin:0 auto; padding:2.5rem 1.25rem 5rem; }
.wrap.wide { max-width:88rem; }

/* 머리띠. 랜딩 Nav.tsx 의 실측값 그대로다. 값을 바꾸면 두 화면이 어긋난다 */
.hd { display:flex; flex-direction:column; align-items:center; gap:20px; margin-bottom:56px; }
.hd-logo { display:flex; align-items:center; gap:10px; text-decoration:none; border:0; color:inherit; }
.hd-symbol { height:21px; width:auto; color:var(--eddm-ivory); display:block; }
.hd-word { font-size:15px; letter-spacing:-.025em; line-height:1.5; color:var(--eddm-ivory); }
.hd-word b { font-weight:700; }
.hd-word i { font-style:normal; font-weight:700; color:var(--eddm-dot); }
.hd-right { display:flex; flex-wrap:wrap; align-items:center; justify-content:center;
  column-gap:20px; row-gap:10px; font-size:14px; line-height:1.4285714; color:var(--eddm-text); }
.hd .nav-link { color:inherit; text-decoration:none; border:0; transition:color .15s cubic-bezier(.4,0,.2,1); }
.hd .nav-link:hover { color:var(--eddm-ivory); }
.hd-icons { display:flex; align-items:center; gap:14px; }
.hd .nav-icon { color:var(--eddm-text-muted); border:0; transition:color .15s cubic-bezier(.4,0,.2,1); }
.hd .nav-icon:hover { color:var(--eddm-ivory); }
.hd .nav-icon svg { height:18px; width:18px; display:block; }
/* 테마 토글은 옆의 SNS 아이콘과 같은 것이다. 상자를 두르면 그것만 단추처럼 튀어 보인다 */
.theme-toggle { display:grid; place-items:center; width:18px; height:18px; margin:0; padding:0;
  border:0; border-radius:0; background:none; color:var(--eddm-text-muted); cursor:pointer;
  transition:color .15s cubic-bezier(.4,0,.2,1); }
.theme-toggle:hover { color:var(--eddm-ivory); }
.theme-toggle svg { display:none; width:18px; height:18px; }
:root:not([data-theme="dark"]) .theme-toggle .theme-icon-moon { display:block; }
:root[data-theme="dark"] .theme-toggle .theme-icon-sun { display:block; }
@media (min-width:768px) {
  .hd { flex-direction:row; justify-content:space-between; gap:0; margin-bottom:64px; }
}

.eyebrow { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase;
  color:var(--eddm-sand); margin:0 0 .6rem; }
.hero { margin-bottom:2.5rem; }
.hero h1 { margin:0 0 .6rem; font-size:1.9rem; letter-spacing:-.02em; line-height:1.25; }
.hero .sub { margin:0; color:var(--eddm-text-muted); }
/* 카드 위에 강조 띠를 얹지 않는다. 그 띠는 내용이 아니라 상자를 먼저 읽게 만든다 */
.gate { max-width:42rem; margin:0 auto; padding:2rem;
  border:1px solid var(--eddm-line-base); border-radius:1rem; background:var(--eddm-raise); }
.gate h1 { font-size:clamp(1.75rem,5vw,2.35rem); line-height:1.2; letter-spacing:-.03em; }
.gate .sub { max-width:34rem; margin-bottom:0; color:var(--eddm-text-muted); line-height:1.8; }
.gate form { margin-top:2rem; }
/* 카드에 폼만 있는 화면. 위아래 여백이 같아야 한다 */
.gate form:first-child { margin-top:0; }
.gate input[type=password] { background:var(--eddm-carbon); }
@media (max-width:520px) {
  .gate { padding:1.5rem; }
  .gate form { flex-direction:column; }
  .gate input[type=password] { flex:0 0 auto; width:100%; }
  .gate button { width:100%; }
}
h1 { font-size:1.6rem; letter-spacing:-0.01em; margin:0 0 .35rem; }
.sub { color:var(--eddm-text); font-size:.95rem; margin:0 0 2rem; }
form { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:1.5rem; }
input[type=password] { flex:1 1 14rem; min-width:0; padding:.7rem .9rem; border-radius:.6rem;
  border:1px solid var(--eddm-line-strong); background:var(--eddm-raise); color:inherit; font-size:1rem; }
button { padding:.7rem 1.1rem; border-radius:.6rem; border:1px solid var(--eddm-accent-line); background:var(--eddm-accent-bg);
  color:var(--eddm-sand); font-size:.95rem; cursor:pointer; }
button:hover { background:var(--eddm-accent-bg); }
.err { color:var(--eddm-danger); margin-top:1rem; font-size:.92rem; }
`;

/**
 * 첫 화면을 그리기 전에 저장한 선택을 적용한다. body 뒤에서 바꾸면 화면이 한 번 번쩍이므로
 * head 에서 먼저 실행한다.
 *
 * **기본은 라이트다.** 시스템 설정을 따라가지 않는다. 한때 저장한 선택이 없으면
 * `prefers-color-scheme` 을 읽었고, 그래서 같은 주소가 보는 사람의 OS 설정에 따라 다르게
 * 떴다. 강의 화면은 운영자와 수강생이 같은 것을 봐야 한다. 고른 사람만 그 선택을 가진다.
 *
 * 두 `catch` 는 비워 둔다. 저장소가 막힌 브라우저에서도 기본 라이트는 이미 적용됐고,
 * 저장 실패는 다음 페이지의 유지에만 영향을 준다. 설명을 이 문자열 안에 주석으로 적지
 * 않는다. 그대로 응답에 실린다.
 */
const THEME_INIT_SCRIPT = `
(() => {
  const root = document.documentElement;
  const key = "eddmpython-classroom-theme";
  const choices = new Set(["light", "dark"]);
  let saved = "light";
  try {
    const value = localStorage.getItem(key);
    if (value && choices.has(value)) saved = value;
  } catch {}
  const set = (choice, persist = true) => {
    const resolved = choices.has(choice) ? choice : "light";
    root.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? "${themeColor("light")}" : "${themeColor("dark")}");
    if (persist) {
      try { localStorage.setItem(key, resolved); } catch {}
    }
    root.dispatchEvent(new CustomEvent("eddmthemechange", { detail: { resolved } }));
  };
  window.__eddmTheme = { key, set };
  set(saved, false);
})();
`;

/** 아이콘 토글을 테마에 연결한다. 다른 탭에서 바꾼 선택도 따라온다. */
const THEME_SCRIPT = `
(() => {
  const api = window.__eddmTheme;
  if (!api) return;
  const root = document.documentElement;
  const toggles = [...document.querySelectorAll("[data-theme-toggle]")];
  if (!toggles.length) return;
  const sync = () => {
    const current = root.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "light" ? "dark" : "light";
    const label = next === "light" ? "라이트 테마로 변경" : "다크 테마로 변경";
    for (const toggle of toggles) {
      toggle.dataset.nextTheme = next;
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }
  };
  for (const toggle of toggles) {
    toggle.addEventListener("click", () => api.set(toggle.dataset.nextTheme));
  }
  root.addEventListener("eddmthemechange", sync);
  window.addEventListener("storage", (event) => {
    if (event.key === api.key) api.set(event.newValue ?? "light", false);
  });
  sync();
})();
`;

const SITE = "https://eddmpython.com";

/** 랜딩 `Nav.tsx` 의 링크 그대로. 강의장은 다른 출처라 절대 주소로 건다. */
const NAV_LINKS = [
  { label: "제품", href: `${SITE}/#products` },
  { label: "데이터", href: `${SITE}/#data` },
  { label: "블로그", href: `${SITE}/blog` },
  { label: "FAQ", href: `${SITE}/#faq` },
];

/**
 * SNS 아이콘. `src/components/icons.tsx` 의 path 를 옮겨 왔다.
 *
 * 심볼과 주소는 `src/brand.ts` 와 `src/social.ts` 에서 그대로 import 하는데 아이콘만
 * 옮겨 적는 이유는 그쪽이 React 컴포넌트라서다. 랜딩에서 아이콘을 고치면 여기도 고친다.
 */
const NAV_ICONS = [
  {
    label: "GitHub",
    href: SOCIAL.github,
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>`,
  },
  {
    label: "Threads",
    href: SOCIAL.threads,
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.27 11.13a6.9 6.9 0 0 0-.26-.12c-.15-2.82-1.7-4.44-4.29-4.46h-.04c-1.55 0-2.84.66-3.63 1.87l1.43.98c.6-.9 1.53-1.1 2.2-1.1h.03c.83 0 1.46.25 1.86.72.3.35.5.83.6 1.44a10.9 10.9 0 0 0-2.4-.12c-2.42.14-3.98 1.55-3.87 3.51.05 1 .55 1.85 1.4 2.4.72.47 1.65.7 2.62.65 1.28-.07 2.28-.56 2.98-1.45.53-.68.87-1.56 1.02-2.66.62.37 1.07.87 1.32 1.46.43 1.01.46 2.68-.9 4.03-1.19 1.19-2.62 1.7-4.78 1.72-2.4-.02-4.21-.79-5.39-2.28C4.98 16.3 4.42 14.36 4.4 12c.02-2.36.58-4.3 1.67-5.72C7.25 4.79 9.06 4.02 11.46 4c2.42.02 4.26.79 5.48 2.29.6.73 1.05 1.66 1.35 2.73l1.68-.45c-.36-1.32-.93-2.46-1.7-3.4C16.7 3.24 14.4 2.24 11.47 2.22h-.01c-2.93.02-5.2 1.02-6.75 2.97C3.33 6.92 2.62 9.2 2.6 11.99v.02c.02 2.79.73 5.07 2.11 6.8 1.55 1.95 3.82 2.95 6.75 2.97h.01c2.6-.02 4.44-.7 5.95-2.21 1.98-1.98 1.92-4.46 1.27-5.98-.47-1.1-1.36-1.99-2.57-2.58Zm-4.44 4.06c-1.07.06-2.19-.42-2.24-1.42-.04-.74.53-1.57 2.3-1.67l.4-.01c.64 0 1.24.06 1.79.18-.2 2.54-1.4 2.86-2.25 2.92Z"/></svg>`,
  },
  {
    label: "YouTube",
    href: SOCIAL.youtube,
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.09 0 12 0 12s0 3.91.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.91 24 12 24 12s0-3.91-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/></svg>`,
  },
  {
    label: "메일",
    href: SOCIAL.mail,
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>`,
  },
];

/** 같은 테마 조작을 읽기 화면과 강의 셸에 투영한다. */
export function themeToggle(extraClass = ""): string {
  const className = `theme-toggle${extraClass ? ` ${extraClass}` : ""}`;
  return `<button type="button" class="${esc(className)}" data-theme-toggle aria-label="화면 테마 변경" title="화면 테마 변경">
    <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56"/>
    </svg>
    <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>
    </svg>
  </button>`;
}

/**
 * 브랜드 머리띠. 랜딩 `Nav.tsx` 와 같은 것을 낸다.
 *
 * 강의장은 Worker 가 HTML 문자열로 뽑는 화면이라 React 컴포넌트를 부를 수 없다. 대신
 * 심볼 좌표(`src/brand.ts`)와 주소(`src/social.ts`)는 정본을 그대로 import 한다.
 * 복사해 두면 한쪽을 고칠 때 다른 쪽이 조용히 어긋난다.
 *
 * 링크는 새 탭으로 연다. 강의 중에 수강생이 눌러 강의 화면을 잃으면 안 된다.
 */
export function header(): string {
  const links = NAV_LINKS.map(
    (l) => `<a class="nav-link" href="${esc(l.href)}" target="_blank" rel="noreferrer">${esc(l.label)}</a>`,
  ).join("");
  const icons = NAV_ICONS.map(
    (i) =>
      `<a class="nav-icon" href="${esc(i.href)}"${
        i.href.startsWith("mailto:") ? "" : ' target="_blank"'
      } rel="noreferrer" aria-label="${esc(i.label)}">${i.svg}</a>`,
  ).join("");
  return `<nav class="hd">
  <a class="hd-logo" href="${esc(SITE)}" target="_blank" rel="noreferrer" aria-label="eddmpython 홈">
    <svg class="hd-symbol" viewBox="${esc(SYMBOL.viewBox)}" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${esc(
      SYMBOL.shape,
    )}"/><rect x="${SYMBOL.dot.x}" y="${SYMBOL.dot.y}" width="${SYMBOL.dot.width}" height="${
    SYMBOL.dot.height
  }" rx="${SYMBOL.dot.rx}" fill="${esc(BRAND.dot)}"/></svg>
    <span class="hd-word"><b>eddm</b><i>.py</i></span>
  </a>
  <div class="hd-right">${links}<span class="hd-icons">${icons}
    ${themeToggle()}
    </span>
  </div>
</nav>`;
}

/**
 * HTML 문서 하나.
 *
 * `style` 을 받는 이유는 화면마다 붙일 CSS 가 다르기 때문이다. 공통 부분은 이 함수가
 * 앞에 깔고 화면이 자기 것을 뒤에 얹는다. 한 화면의 규칙이 다른 화면으로 새지 않는다.
 *
 * `noindex` 는 여기 한 곳에만 적는다. 이 함수를 거치는 화면은 운영장이든 강의방이든
 * 검색에 잡히면 안 된다. 각 화면이 따로 적게 두면 새 화면에서 빠뜨린다.
 */
export type PageOptions = {
  title: string;
  /** 이 화면이 쓰는 CSS. SHELL_STYLE 뒤에 붙는다 */
  style: string;
  inner: string;
  /** body 끝에 붙일 마크업. 오버레이처럼 wrap 밖에 있어야 하는 것 */
  extraBody?: string;
  /** 테마 스크립트 뒤에 이어 붙일 스크립트 */
  script?: string;
  wide?: boolean;
  /**
   * 이 화면에 실행 칸이 있는지.
   *
   * 실행 칸이 있는 글에만 파이썬 배포판 출처를 연다. 목록 화면과 실행 칸 없는 글까지
   * 열어 둘 이유가 없다. CSP 는 좁을수록 좋다.
   */
  cells?: boolean;
  status?: number;
  headers?: Record<string, string>;
};

export function page(opts: PageOptions): Response {
  const nonce = randomHex(16);
  const cells = opts.cells ?? false;
  /**
   * CSS 주석은 브라우저로 내보내지 않는다.
   *
   * 이 파일과 화면 파일의 CSS 는 왜 그렇게 됐는지를 주석으로 들고 있다. 실패 이력과
   * 운영자 지시가 그대로 적혀 있는데 템플릿 리터럴이라 응답에 통째로 실렸다. 로그인
   * 화면은 아무나 열어 볼 수 있고 그 주석이 이 문 뒤에 무엇이 있는지 알려 준다.
   * 설명은 소스에 남기고 나가는 바이트에서만 뺀다.
   */
  const style = `${SHELL_STYLE}${opts.style}`.replace(/\/\*[\s\S]*?\*\//g, "");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${esc(themeColor("light"))}">
<title>${esc(opts.title)} | eddmpython</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="${DESIGN.fontHref}">
<script nonce="${nonce}">${THEME_INIT_SCRIPT}</script>
<style>${style}</style></head>
<body><div class="wrap${opts.wide ? " wide" : ""}">${opts.inner}</div>
${opts.extraBody ?? ""}
<script nonce="${nonce}">${THEME_SCRIPT}${opts.script ?? ""}</script></body></html>`;
  return new Response(html, {
    status: opts.status ?? 200,
    headers: {
      ...(opts.headers ?? {}),
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data: https:",
        "media-src 'self' https:",
        // 랜딩과 같은 글꼴을 쓰려고 연다. 글꼴이 다르면 같은 화면이 아니다.
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "font-src 'self' https://cdn.jsdelivr.net",
        // 실행 칸이 있는 글만 파이썬 배포판을 받아 온다. wasm 을 컴파일하므로 그 권한도 같이 연다.
        `script-src 'nonce-${nonce}'${cells ? " 'wasm-unsafe-eval' https://cdn.jsdelivr.net" : ""}`,
        `connect-src 'self'${cells ? " https://cdn.jsdelivr.net" : ""}`,
        // course-embed 는 https 문서를 sandbox iframe 으로 격리한다. 교안의 raw HTML 은 실행하지 않는다.
        "frame-src 'self' https:",
        ...(cells ? ["worker-src 'self' blob:"] : []),
      ].join("; "),
    },
  });
}
