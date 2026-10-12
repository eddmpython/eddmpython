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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SYMBOL.viewBox}" role="img" aria-label="eddmpython">${symbolMarkup({ ink })}</svg>\n`;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${tile.size} ${tile.size}" role="img" aria-label="eddmpython">
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
