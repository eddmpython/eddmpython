/**
 * 브랜드 심볼 정본.
 *
 * 여기 있는 것은 심볼 하나뿐이다. 심볼에 워드마크를 붙인 로고 락업은
 * components/Logo.tsx 가 조립한다. 이 파일에 글자를 넣지 않는다.
 *
 * 심볼 형태는 여기에서만 정의한다. 랜딩(React)과 favicon.svg(정적 파일)가
 * 같은 좌표를 읽으므로 둘이 어긋날 수 없다. favicon 은 vite.config.ts 의
 * brandAssets 플러그인이 이 모듈에서 생성한다. public/ 에 사본을 두지 않는다.
 *
 * 형태
 * - 매듭을 이루며 스스로를 물고 도는 뱀이다. Python 과 반복을 한 형태로 잡는다.
 * - 몸통, 머리, 혀가 하나의 채움 경로다. 겹치는 구간은 evenodd 로 뚫린다.
 * - 눈만 별도 요소다. 심볼에서 유일하게 색이 고정된 부분이다.
 *
 * 좌표 규칙
 * - transform 없이 좌표에 스케일을 구워 넣었다. 중첩 변환이 없다.
 * - 잉크 경계가 viewBox 에 꼭 맞는다. 여백은 쓰는 쪽이 정한다.
 * - 가로세로 1.13 로 정사각에 가깝다. 앱 아이콘 마스크에 그대로 들어간다.
 *
 * 작은 크기에서
 * - 16px 에서 머리와 혀가 사라지고 추상 매듭으로 읽힌다. 의도한 결과다.
 *   덩어리감을 지키려고 획을 얇게 깎지 않는다. 실측에서 획을 깎으면
 *   통로는 열리지만 마크가 힘을 잃었다.
 * - 24px 부터 머리와 혀가 살아난다.
 *
 * 이 파일은 React 를 import 하지 않는다. vite.config.ts(Node)에서도 읽는다.
 */

export const SYMBOL = {
  viewBox: "0 0 414.20 367.96",
  width: 414.20,
  height: 367.96,
  /** 몸통, 머리, 혀. 하나의 채움 경로이며 겹침은 evenodd 로 뚫는다. */
  shape:
    "M263.4 0.7L244.8 3.4L227.2 8.5L211.6 15.5L196.3 25.1L181.2 37.8L167.5 52.7L156.4 68.3L147.2 85.6L140.5 103.3L135.6 122.6L133.1 142.1L132.9 161.2L135.2 181.3L140.3 203.4L147.8 226.2L153.6 238.8L155.3 240.9L157.4 241.1L160.8 239.3L167.1 232.8L194.8 210.1L196.5 207.9L196.8 205.3L196.2 200.8L190.5 178.6L188.3 164.2L188.0 147.9L190.0 132.4L194.8 116.1L198.0 108.5L202.1 100.8L207.0 93.6L212.1 87.4L217.8 81.8L223.6 77.2L232.6 71.8L242.3 67.7L252.7 64.9L264.0 63.2L272.9 62.9L281.8 63.5L320.9 68.9L329.8 69.0L337.5 68.2L343.5 66.6L348.0 64.6L352.9 61.0L357.8 55.3L360.6 53.8L363.7 53.3L371.2 54.2L377.9 56.6L383.0 61.5L390.1 71.9L391.9 72.6L393.2 71.6L393.5 68.7L392.7 62.5L390.4 57.1L391.2 56.0L396.0 54.2L397.4 53.1L400.5 47.8L400.9 46.5L400.5 45.5L397.4 45.4L390.1 48.7L384.0 50.3L377.5 50.4L369.9 49.2L366.7 47.4L364.2 44.7L360.9 32.2L359.0 28.8L355.6 24.8L346.7 18.0L332.4 10.4L317.2 4.9L300.7 1.4L282.5 0.0L263.4 0.7ZM113.7 108.5L94.7 111.1L84.1 113.9L73.8 117.5L63.6 122.2L54.2 127.5L45.2 133.7L36.9 140.7L29.7 147.9L22.8 156.1L16.8 165.0L11.6 174.3L7.3 184.1L4.2 193.7L1.8 204.1L0.4 214.7L0.0 225.4L0.6 236.1L2.2 246.7L5.0 257.7L8.7 267.8L13.3 277.6L18.8 286.8L25.2 295.5L32.4 303.5L39.9 310.3L48.6 316.8L57.8 322.3L67.6 326.9L77.7 330.6L87.6 333.0L97.7 334.4L108.5 334.9L118.6 334.3L128.1 332.9L138.0 330.6L147.6 327.4L156.8 323.4L165.7 318.8L184.4 306.2L199.7 293.9L243.0 256.7L261.6 240.1L275.7 226.5L283.8 217.6L290.5 208.3L295.4 198.8L296.8 192.8L296.6 190.8L295.7 189.3L294.3 188.5L291.9 188.2L274.0 188.9L247.1 188.5L242.0 188.9L238.5 189.9L234.2 192.1L230.6 194.6L199.3 223.0L158.9 257.8L149.4 265.2L141.5 270.3L135.3 273.4L128.8 275.9L121.7 277.8L114.9 278.7L108.5 278.9L102.2 278.2L96.0 276.8L89.4 274.4L81.5 270.2L74.2 264.9L67.5 258.1L62.3 250.9L58.3 243.0L55.9 235.3L54.8 227.3L54.9 218.5L57.1 207.4L61.3 196.7L67.4 187.0L75.2 178.7L82.9 173.2L91.5 169.0L101.1 166.6L114.3 165.4L117.2 164.4L119.1 162.4L119.6 158.8L119.2 145.8L119.5 138.4L123.1 119.8L123.3 112.9L121.6 110.3L118.0 108.8L113.7 108.5ZM207.6 120.3L205.9 122.6L204.1 127.3L202.0 141.7L201.8 163.4L201.2 169.4L201.5 171.5L202.4 172.7L204.6 173.6L210.9 174.6L223.1 175.2L272.8 174.3L291.4 175.0L308.3 177.5L316.1 179.8L322.8 182.5L330.7 187.0L338.3 193.2L345.0 200.6L350.3 208.4L354.9 217.6L358.2 227.1L360.2 237.1L360.7 247.0L360.1 256.0L358.1 265.4L355.0 274.4L350.7 282.8L345.3 290.5L339.4 296.8L332.6 302.1L325.0 306.4L313.8 310.3L302.5 311.9L291.2 311.5L280.3 308.9L271.8 305.1L264.6 300.2L258.0 294.1L246.6 281.1L242.8 277.9L240.2 277.1L237.7 278.1L232.9 281.8L219.0 294.8L204.7 306.1L202.6 309.2L201.9 312.5L202.7 315.4L205.0 319.4L212.2 327.4L223.3 337.8L232.4 345.2L240.9 351.1L250.1 356.1L259.8 360.4L269.9 363.7L280.4 366.2L291.2 367.6L301.9 368.0L312.7 367.2L322.6 365.6L333.5 362.6L343.6 358.8L353.2 354.1L362.8 348.2L372.3 341.0L380.9 332.9L388.7 324.0L395.6 314.3L401.4 303.9L406.2 293.0L409.9 281.5L412.4 269.7L413.9 257.0L414.2 243.6L413.2 230.3L411.1 217.8L408.0 205.7L403.4 193.4L398.3 182.8L391.8 172.1L385.4 163.6L378.6 156.0L370.8 148.5L362.3 141.7L353.4 135.7L344.5 130.8L334.8 126.5L325.3 123.3L307.6 119.8L287.5 118.3L262.1 118.5L229.4 120.0L212.9 118.6L209.9 118.9L207.6 120.3Z",
  /** 눈. 머리 위에 얹는다. */
  eye: { cx: 303.71, cy: 28.24, rx: 9.64, ry: 7.58 },
} as const;

/** styles.css 의 --eddm-* 토큰과 같은 값. 정적 SVG 는 CSS 변수를 못 읽어서 여기서 쓴다. */
export const BRAND = {
  carbon: "#101514",
  ivory: "#f5f3ee",
  // BRAND.ivory 를 TOKENS.color.sand 가 그대로 쓴다. 강조는 색이 아니라 밝기다.
  /**
   * 심볼의 눈. 저장소 강행규칙이 핑크 계열을 금지해서 모래빛을 쓴다.
   * 실측에서 48px 아래로는 눈이 보이지 않으므로 작은 크기의 판독에는
   * 영향이 없고, 큰 크기에서 브랜드 색으로 읽히는 유일한 점이다.
   */
  eye: "#d8be91",
} as const;

/**
 * 브랜드 토큰 정본.
 *
 * **같은 값을 두 번 적지 않는다.** 랜딩(styles.css), 강의장(classroom.ts), 운영 화면
 * (scripts/classroom-admin.mjs)이 각자 색을 적고 있었고 그래서 배경이 미묘하게 달랐다
 * (강의장 #101514, 운영 화면 #0d1211). 같은 브랜드인데 화면을 옮기면 이상했다.
 *
 * CSS 를 쓰는 쪽은 `cssVars()` 로 변수를 깔고 `var(--eddm-*)` 를 참조한다. Tailwind 를
 * 쓰는 랜딩은 styles.css 의 `:root` 가 같은 값을 들고 있고 `scripts/check-brand.mjs` 가
 * 그 둘이 어긋나면 막는다.
 *
 * 알파 단계에 이름을 준 이유는 `#f5f3ee8c` 같은 값이 화면마다 제각각 나오던 것을 막기
 * 위해서다. 글자는 네 단계, 선은 세 단계면 충분하다.
 */
export const TOKENS = {
  color: {
    /** 바탕. 모든 표면이 같은 검정을 쓴다 */
    carbon: BRAND.carbon,
    /** carbon 보다 한 단 어두운 면. 화면 프레임 받침 */
    ink: "#0c0f0e",
    /** 글자 기본 */
    ivory: BRAND.ivory,
    /**
     * 강조.
     *
     * **골드를 쓰지 않는다.** 2026-08-24 운영자 지시다. 강조는 색이 아니라 밝기로 한다.
     * 본문 글자가 ivory 75% 라서 강조는 100% 로 더 밝게 두면 그것으로 읽힌다. 색을 얹으면
     * 강조한 것이 아니라 색칠한 것이 되고, 화면 뒤에서 보는 사람에게는 색이 먼저 들어온다.
     *
     * 골드는 `BRAND.eye` 한 자리에만 남는다. 그것은 브랜드 마크의 눈이고 로고이지 강조 표현이
     * 아니다. 마크 밖으로 넓히지 않는다.
     */
    sand: BRAND.ivory,
    /** 운영 화면에서 프로덕션을 가리키는 경고색. 다른 자리에 쓰지 않는다 */
    alert: "#e0552d",
    dartlab: "#7da2e8",
    codaro: "#dfa14e",
    xlpod: "#57b98a",
    pyproc: "#ff5a36",
  },
  /** 글자 밝기 네 단계. 본문, 보조, 흐림, 라벨 */
  text: {
    body: "rgba(245,243,238,.75)",
    muted: "rgba(245,243,238,.55)",
    dim: "rgba(245,243,238,.45)",
    faint: "rgba(245,243,238,.35)",
  },
  /** 선 세 단계. 구분선, 테두리, 눈에 띄는 테두리 */
  line: {
    soft: "rgba(255,255,255,.08)",
    base: "rgba(255,255,255,.11)",
    strong: "rgba(255,255,255,.17)",
  },
  /** 살짝 뜬 면. 카드 배경과 hover */
  surface: {
    raise: "rgba(255,255,255,.04)",
    hover: "rgba(255,255,255,.08)",
  },
  /**
   * 강조를 옅게 쓰는 자리. 선택된 항목의 배경과 선.
   *
   * 골드 rgba 였다가 2026-08-24 에 ivory 로 바꿨다. 값만 바뀌고 쓰는 자리는 그대로다.
   */
  accent: {
    line: "rgba(245,243,238,.28)",
    bg: "rgba(245,243,238,.07)",
    dim: "rgba(245,243,238,.55)",
  },
  radius: { sm: ".45rem", md: ".7rem", lg: ".85rem", xl: "1rem" },
  font: {
    sans: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  /** 공개 글과 강의장 본문이 함께 쓰는 섹션 제목 위계 */
  typography: {
    sectionTitle: {
      mobile: "1.375rem",
      desktop: "1.5rem",
      lineHeight: "1.35",
      weight: "600",
      tracking: "-.015em",
    },
  },
  /** 랜딩이 CDN 에서 받는 글꼴. 강의장과 운영 화면도 같은 것을 받아야 자간이 같다 */
  fontHref:
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
} as const;

/** `:root` 에 깔 CSS 변수. CSS 를 직접 쓰는 표면이 이걸로 시작한다. */
export function cssVars(): string {
  const c = TOKENS.color;
  const t = TOKENS;
  const section = t.typography.sectionTitle;
  return `:root{--eddm-carbon:${c.carbon};--eddm-ink:${c.ink};--eddm-ivory:${c.ivory};--eddm-sand:${c.sand};--eddm-alert:${c.alert};--eddm-text:${t.text.body};--eddm-text-muted:${t.text.muted};--eddm-text-dim:${t.text.dim};--eddm-text-faint:${t.text.faint};--eddm-line:${t.line.soft};--eddm-line-base:${t.line.base};--eddm-line-strong:${t.line.strong};--eddm-raise:${t.surface.raise};--eddm-hover:${t.surface.hover};--eddm-accent-line:${t.accent.line};--eddm-accent-bg:${t.accent.bg};--eddm-accent-dim:${t.accent.dim};--eddm-section-title-size-mobile:${section.mobile};--eddm-section-title-size-desktop:${section.desktop};--eddm-section-title-line-height:${section.lineHeight};--eddm-section-title-weight:${section.weight};--eddm-section-title-tracking:${section.tracking}}`;
}

/**
 * 브라우저 탭 아이콘 본문. 파비콘에는 로고가 아니라 심볼만 넣는다.
 * 16px 짜리 정사각에 글자를 넣으면 읽히지 않는다.
 *
 * currentColor 를 쓸 수 없다. 파비콘은 문서 문맥 밖에서 렌더되어 상속받을 색이
 * 없고, 브라우저는 이를 검정으로 처리한다. 어두운 탭 배경에서 심볼이 사라진다.
 * 그래서 칩 배경과 심볼 색을 명시한다.
 *
 * 심볼이 가로 1.13:1 이라 정사각에 거의 맞는다. 칩 안에서 12% 여백을 두면
 * iOS 스퀘어클과 Android 원형 마스크 양쪽에서 잘리지 않는다.
 */
export function faviconSvg(): string {
  const pad = 12;
  const box = 100 - pad * 2;
  const scale = Math.min(box / SYMBOL.width, box / SYMBOL.height);
  const w = SYMBOL.width * scale;
  const h = SYMBOL.height * scale;
  const x = (100 - w) / 2;
  const y = (100 - h) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${BRAND.carbon}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${SYMBOL.shape}" fill="${BRAND.ivory}" fill-rule="evenodd"/>
    <ellipse cx="${SYMBOL.eye.cx}" cy="${SYMBOL.eye.cy}" rx="${SYMBOL.eye.rx}" ry="${SYMBOL.eye.ry}" fill="${BRAND.eye}"/>
  </g>
</svg>
`;
}
