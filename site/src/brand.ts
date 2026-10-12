/**
 * 확정한 EDDM 심볼의 정본.
 * 두 경로와 두 번째 경로의 이동, viewBox를 승인된 SVG 그대로 보존한다.
 * React, Worker, 정적 SVG, OG 이미지와 Windows 아이콘이 같은 도형을 소비한다.
 */
import { DESIGN } from "./design.ts";

const parts: readonly { d: string; transform?: string }[] = [
  {
    d: "M16 28L76 8V34C76 62 96 82 124 82H160V126Q160 142 144 148L56 178Q46 182 36 178L12 169Q0 165 0 151V50Q0 34 16 28Z",
  },
  {
    d: "M76 8L96 1Q102 -1 110 2L148 14Q160 18 160 32V82H124C96 82 76 62 76 34Z",
    transform: "translate(18 -18)",
  },
];

export const SYMBOL = {
  width: 222,
  height: 222,
  viewBox: "-22 -28 222 222",
  parts,
} as const;

/** Manrope 550에서 만든 승인 EDDM 윤곽선. 고지는 /brand/manropeLicense.txt에 보존한다. */
export const WORDMARK = {
  width: 371.586,
  height: 100,
  viewBox: "0 0 371.586 100",
  parts: [
    { d: "M0 100V0H63.542V12.72H13.449V42.384H55.208V55.104H13.449V87.28H63.542V100Z" },
    { d: "M81.042 100V0H112.13Q113.571 0 117.367 0.069Q121.163 0.139 124.653 0.613Q136.302 2.13 144.227 9.045Q152.153 15.961 156.18 26.612Q160.208 37.263 160.208 50Q160.208 62.766 156.18 73.417Q152.153 84.068 144.227 90.969Q136.302 97.87 124.653 99.387Q121.192 99.832 117.352 99.916Q113.513 100 112.13 100ZM94.826 87.199H112.13Q114.612 87.199 117.879 87.052Q121.146 86.904 123.6 86.447Q131.516 84.983 136.429 79.714Q141.343 74.445 143.64 66.681Q145.938 58.918 145.938 50Q145.938 40.88 143.6 33.116Q141.262 25.353 136.328 20.165Q131.395 14.977 123.6 13.553Q121.146 13.055 117.836 12.928Q114.525 12.801 112.13 12.801H94.826Z" },
    { d: "M177.153 100V0H208.241Q209.682 0 213.478 0.069Q217.274 0.139 220.764 0.613Q232.413 2.13 240.338 9.045Q248.264 15.961 252.292 26.612Q256.319 37.263 256.319 50Q256.319 62.766 252.292 73.417Q248.264 84.068 240.338 90.969Q232.413 97.87 220.764 99.387Q217.303 99.832 213.463 99.916Q209.624 100 208.241 100ZM190.937 87.199H208.241Q210.723 87.199 213.99 87.052Q217.257 86.904 219.711 86.447Q227.627 84.983 232.541 79.714Q237.454 74.445 239.751 66.681Q242.049 58.918 242.049 50Q242.049 40.88 239.711 33.116Q237.373 25.353 232.439 20.165Q227.506 14.977 219.711 13.553Q217.257 13.055 213.947 12.928Q210.637 12.801 208.241 12.801H190.937Z" },
    { d: "M273.264 100V0H285.463L322.454 77.443L359.271 0H371.586V99.942H358.866V29.34L325.729 100H319.12L285.984 29.34V100Z" },
  ],
} as const;

/** 승인된 가로 조합: 심볼 108, 글자 높이 72, 사이 간격 14. */
export const LOGO = {
  width: 389.54192,
  height: 108,
  viewBox: "0 0 389.54192 108",
  symbolSize: 108,
  wordmarkTransform: "translate(122 18) scale(.72)",
} as const;

export const BRAND = {
  carbon: DESIGN.palette.carbon,
  ivory: DESIGN.palette.ivory,
  paper: DESIGN.palette.paper,
  accent: DESIGN.palette.brand,
} as const;

/** 모든 SVG 소비자가 같은 두 경로를 출력한다. 심볼 전체에 한 색을 쓴다. */
export function symbolMarkup({ ink = "currentColor" }: { ink?: string } = {}): string {
  return SYMBOL.parts
    .map(
      (part) =>
        `<path fill="${ink}" d="${part.d}"${part.transform ? ` transform="${part.transform}"` : ""}/>`,
    )
    .join("");
}

export function symbolSvg({ ink = BRAND.carbon }: { ink?: string } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SYMBOL.viewBox}" role="img" aria-label="EDDM 심볼">${symbolMarkup({ ink })}</svg>\n`;
}

/** 승인된 글자 윤곽선 네 개를 같은 색으로 출력한다. 런타임 폰트에 의존하지 않는다. */
export function wordmarkMarkup({ ink = "currentColor" }: { ink?: string } = {}): string {
  return WORDMARK.parts.map((part) => `<path fill="${ink}" d="${part.d}"/>`).join("");
}

export function wordmarkSvg({ ink = BRAND.carbon }: { ink?: string } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK.viewBox}" role="img" aria-label="EDDM">${wordmarkMarkup({ ink })}</svg>\n`;
}

/** React, Worker, 스튜디오와 다운로드 SVG가 공유하는 승인 가로 조합. */
export function logoMarkup({ ink = "currentColor" }: { ink?: string } = {}): string {
  return `<svg width="${LOGO.symbolSize}" height="${LOGO.symbolSize}" viewBox="${SYMBOL.viewBox}">${symbolMarkup({ ink })}</svg><g transform="${LOGO.wordmarkTransform}">${wordmarkMarkup({ ink })}</g>`;
}

export function logoSvg({ ink = BRAND.carbon }: { ink?: string } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.viewBox}" role="img" aria-label="EDDM">${logoMarkup({ ink })}</svg>\n`;
}

/** 칩의 배경과 심볼 전체의 색. 강조색 칩에서도 두 도형을 함께 반전한다. */
export const ICON_FINISHES = {
  light: { tile: BRAND.paper, ink: BRAND.carbon, outlined: false },
  dark: { tile: BRAND.carbon, ink: BRAND.ivory, outlined: false },
  brand: { tile: BRAND.accent, ink: BRAND.paper, outlined: false },
  outline: { tile: BRAND.carbon, ink: BRAND.ivory, outlined: true },
} as const;

export type IconFinish = keyof typeof ICON_FINISHES;

/** SVG viewBox의 음수 원점을 보정한 공통 아이콘 배치. */
export const ICON_TILE = (() => {
  const size = 100;
  const inset = 12;
  const box = size - inset * 2;
  const trim = (value: number) => Math.round(value * 1e6) / 1e6;
  const scale = trim(Math.min(box / SYMBOL.width, box / SYMBOL.height));
  const [minX, minY] = SYMBOL.viewBox.split(" ").map(Number);
  const width = SYMBOL.width * scale;
  const height = SYMBOL.height * scale;
  const x = trim((size - width) / 2 - minX * scale);
  const y = trim((size - height) / 2 - minY * scale);
  return {
    size,
    radius: 22,
    edge: { inset: 1.5, radius: 20.5, width: 3, opacity: 0.22 },
    scale,
    x,
    y,
    transform: `translate(${x} ${y}) scale(${scale})`,
    padX: trim((size - width) / 2),
    padY: trim((size - height) / 2),
  };
})();

export function appIconSvg(
  finish: IconFinish = "dark",
  size = ICON_TILE.size,
): string {
  const colors = ICON_FINISHES[finish];
  const tile = ICON_TILE;
  const inner = tile.size - tile.edge.inset * 2;
  const edge = colors.outlined
    ? `<rect x="${tile.edge.inset}" y="${tile.edge.inset}" width="${inner}" height="${inner}" rx="${tile.edge.radius}" fill="none" stroke="${colors.ink}" stroke-opacity="${tile.edge.opacity}" stroke-width="${tile.edge.width}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${tile.size} ${tile.size}" role="img" aria-label="EDDM">
  <rect width="${tile.size}" height="${tile.size}" rx="${tile.radius}" fill="${colors.tile}"/>${edge}
  <g transform="${tile.transform}">${symbolMarkup({ ink: colors.ink })}</g>
</svg>\n`;
}

/** 문서의 글자색을 상속받지 않는 파비콘에는 배경과 심볼 색을 명시한다. */
export function faviconSvg(): string {
  return appIconSvg("dark");
}

/** 빌드와 /brand 화면이 함께 소비하는 다운로드 파일 목록. */
export const BRAND_ASSETS = [
  {
    file: "brand/logo-dark.svg",
    label: "로고 (밝은 획)",
    note: "어두운 바탕용",
    svg: () => logoSvg({ ink: BRAND.ivory }),
  },
  {
    file: "brand/logo-light.svg",
    label: "로고 (어두운 획)",
    note: "밝은 바탕용",
    svg: () => logoSvg({ ink: BRAND.carbon }),
  },
  {
    file: "brand/wordmark-dark.svg",
    label: "워드마크 (밝은 획)",
    note: "어두운 바탕용",
    svg: () => wordmarkSvg({ ink: BRAND.ivory }),
  },
  {
    file: "brand/wordmark-light.svg",
    label: "워드마크 (어두운 획)",
    note: "밝은 바탕용",
    svg: () => wordmarkSvg({ ink: BRAND.carbon }),
  },
  {
    file: "brand/mark-dark.svg",
    label: "심볼 (밝은 획)",
    note: "어두운 바탕용",
    svg: () => symbolSvg({ ink: BRAND.ivory }),
  },
  {
    file: "brand/mark-light.svg",
    label: "심볼 (어두운 획)",
    note: "밝은 바탕용",
    svg: () => symbolSvg({ ink: BRAND.carbon }),
  },
  {
    file: "brand/icon-light.svg",
    label: "앱 아이콘 (밝은 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("light", 512),
  },
  {
    file: "brand/icon-dark.svg",
    label: "앱 아이콘 (어두운 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("dark", 512),
  },
  {
    file: "brand/icon-brand.svg",
    label: "앱 아이콘 (강조 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("brand", 512),
  },
  {
    file: "brand/icon-outline.svg",
    label: "앱 아이콘 (테두리 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("outline", 512),
  },
  {
    file: "favicon.svg",
    label: "파비콘",
    note: "탭 아이콘",
    svg: faviconSvg,
  },
] as const;
