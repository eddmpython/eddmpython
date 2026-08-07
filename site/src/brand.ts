/**
 * 브랜드 마크 정본.
 *
 * 마크 형태는 여기에서만 정의한다. 랜딩(React)과 favicon.svg(정적 파일)가
 * 같은 좌표를 읽으므로 둘이 어긋날 수 없다. favicon 은 vite.config.ts 의
 * brandAssets 플러그인이 이 모듈에서 생성한다. public/ 에 사본을 두지 않는다.
 *
 * 좌표 규칙
 * - transform 없이 좌표에 스케일을 구워 넣었다. 중첩 변환이 없다.
 * - 잉크 경계가 viewBox 에 꼭 맞는다. 여백은 쓰는 쪽이 정한다.
 * - 눈은 색이 아니라 구멍이다. head 를 evenodd 로 칠하면 배경이 비친다.
 *   덕분에 밝은 배경, 어두운 배경, 파비콘 칩 어디에 놓아도 눈이 보인다.
 *   고정 색을 쓰면 문맥마다 대비가 깨지고 브랜드 팔레트에 없는 색이 는다.
 *
 * 이 파일은 React 를 import 하지 않는다. vite.config.ts(Node)에서도 읽는다.
 */

export const MARK = {
  viewBox: "0 0 100 72.36",
  width: 100,
  height: 72.36,
  strokeWidth: 8.81,
  /** 코일을 그리며 소문자 e 를 만드는 몸통. 단선 스트로크. */
  body:
    "M29.1 36.57 C43.36 35.73 53.43 29.86 54.27 19.79 C55.11 8.88 43.36 3.01 30.78 4.69 " +
    "C13.16 7.2 2.25 22.31 4.77 39.09 C8.12 58.39 24.91 70.13 43.36 67.61 " +
    "C58.47 65.94 68.54 57.55 73.57 47.48 C76.93 41.6 80.28 39.93 85.32 40.77",
  /** 머리. 바깥 윤곽 + 눈 구멍. fill-rule="evenodd" 로 칠해야 눈이 뚫린다. */
  head:
    "M81.79 36.32 C86.32 33.8 92.45 34.05 96.73 36.74 C100.42 39 101.09 42.28 98.24 44.96 " +
    "C94.8 48.15 88.84 48.74 84.56 46.47 C80.95 44.62 79.53 41.35 80.62 38.75 " +
    "C80.87 37.91 81.29 36.99 81.79 36.32 Z " +
    "M89.93 37.58 C92.03 36.74 94.21 37.83 94.46 39.67 C94.71 41.6 93.12 43.11 91.27 42.78 " +
    "C89.43 42.53 88.51 40.6 89.26 38.92 C89.43 38.42 89.68 37.91 89.93 37.58 Z",
} as const;

/** styles.css 의 --eddm-* 토큰과 같은 값. 정적 SVG 는 CSS 변수를 못 읽어서 여기서 쓴다. */
export const BRAND = {
  carbon: "#101514",
  ivory: "#f5f3ee",
} as const;

/**
 * 브라우저 탭 아이콘 본문.
 *
 * currentColor 를 쓸 수 없다. 파비콘은 문서 문맥 밖에서 렌더되어 상속받을 색이
 * 없고, 브라우저는 이를 검정으로 처리한다. 어두운 탭 배경에서 마크가 사라진다.
 * 그래서 칩 배경과 마크 색을 명시한다.
 *
 * 마크가 가로 1.38:1 이라 정사각 안에서는 세로가 남는다. 칩을 깔아 그 여백을
 * 형태로 쓰고, 16px 에서 획이 끊기지 않도록 스트로크를 광학 보정한다.
 */
export function faviconSvg(): string {
  const scale = 0.84;
  const w = MARK.width * scale;
  const h = MARK.height * scale;
  const x = (100 - w) / 2;
  const y = (100 - h) / 2;
  // 16px 에서 1px 아래로 떨어지지 않게 굵힌다. 큰 크기에서는 차이가 보이지 않는다.
  const stroke = MARK.strokeWidth * 1.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${BRAND.carbon}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})">
    <path d="${MARK.body}" fill="none" stroke="${BRAND.ivory}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${MARK.head}" fill="${BRAND.ivory}" fill-rule="evenodd"/>
  </g>
</svg>
`;
}
