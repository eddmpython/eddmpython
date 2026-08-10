/** 랜딩 히어로에 쓰는 제품 공개 마크. 각 제품 사이트의 brand/avatar 정본을 가져온 것이다. */
export type ProductKey = "dartlab" | "codaro" | "xlpod" | "pyproc";

export type ProductMark = {
  key: ProductKey;
  name: string;
  src: string;
  /** 마크 SVG는 contain, 캐릭터 아바타는 cover */
  fit: "cover" | "contain";
  /** 활성 링에 쓰는 Tailwind ring 색 */
  ringClass: string;
  /** 활성 글로우. --eddm-* 토큰만 쓴다. */
  glow: string;
};

export const PRODUCT_MARKS: ProductMark[] = [
  {
    key: "dartlab",
    name: "DartLab",
    src: "/brand/dartlab-avatar.png",
    fit: "cover",
    ringClass: "ring-dartlab",
    glow: "color-mix(in srgb, var(--eddm-dartlab) 45%, transparent)",
  },
  {
    key: "codaro",
    name: "Codaro",
    src: "/brand/codaro-avatar.png",
    fit: "cover",
    ringClass: "ring-codaro",
    glow: "color-mix(in srgb, var(--eddm-codaro) 45%, transparent)",
  },
  {
    key: "xlpod",
    name: "xlpod",
    src: "/brand/xlpod-mark.svg",
    fit: "contain",
    ringClass: "ring-xlpod",
    glow: "color-mix(in srgb, var(--eddm-xlpod) 45%, transparent)",
  },
  {
    key: "pyproc",
    name: "pyproc",
    src: "/brand/pyproc-mark.svg",
    fit: "contain",
    ringClass: "ring-pyproc",
    glow: "color-mix(in srgb, var(--eddm-pyproc) 45%, transparent)",
  },
];
