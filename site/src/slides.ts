import type { ProductKey } from "./productMarks";

/** 히어로 뷰어에 도는 실제 제품 화면. 전부 라이브 제품을 캡처한 것이다. */
export type Slide = {
  id: string;
  productKey: ProductKey;
  product: string;
  /* Tailwind 색 유틸 클래스 */
  dotClass: string;
  label: string;
  caption: string;
  shot: string;
  alt: string;
  href: string;
};

export const SLIDES: Slide[] = [
  {
    id: "terminal",
    productKey: "dartlab",
    product: "DartLab",
    dotClass: "bg-dartlab",
    label: "터미널",
    caption: "거시 국면, 스캔 등급, 주가, 재무제표를 한 화면에",
    shot: "/shots/hero-dartlab.webp",
    alt: "DartLab Terminal 에서 삼성전자를 분석하는 화면",
    href: "https://eddmpython.github.io/dartlab/terminal",
  },
  {
    id: "viewer",
    productKey: "dartlab",
    product: "DartLab",
    dotClass: "bg-dartlab",
    label: "공시뷰어",
    caption: "분기 보고서를 나란히 놓고 원문 그대로 비교",
    shot: "/shots/hero-viewer.webp",
    alt: "DartLab 공시뷰어에서 삼성전자 분기 보고서를 분기별로 비교하는 화면",
    href: "https://eddmpython.github.io/dartlab/viewer",
  },
  {
    id: "scan",
    productKey: "dartlab",
    product: "DartLab",
    dotClass: "bg-dartlab",
    label: "전종목 스캔",
    caption: "2,664 개 상장사를 조건으로 걸러 신호까지",
    shot: "/shots/hero-scan.webp",
    alt: "DartLab Scan Studio 에서 상장사를 조건으로 스캔하는 화면",
    href: "https://eddmpython.github.io/dartlab/scan",
  },
  {
    id: "map",
    productKey: "dartlab",
    product: "DartLab",
    dotClass: "bg-dartlab",
    label: "산업지도",
    caption: "34 개 산업과 공급 플로우를 하나의 그래프로",
    shot: "/shots/hero-map.webp",
    alt: "DartLab 산업지도에서 34개 산업과 공급망 네트워크를 보는 화면",
    href: "https://eddmpython.github.io/dartlab/map",
  },
  {
    id: "learn",
    productKey: "codaro",
    product: "Codaro",
    dotClass: "bg-codaro",
    label: "학습",
    caption: "문법 목차가 아니라 남길 결과를 기준으로 472 개 레슨",
    shot: "/shots/hero-learn.webp",
    alt: "Codaro 학습 페이지에서 결과 기준으로 레슨을 고르는 화면",
    href: "https://eddmpython.github.io/codaro/learn/",
  },
  {
    id: "codaro",
    productKey: "codaro",
    product: "Codaro",
    dotClass: "bg-codaro",
    label: "웹 실행",
    caption: "설치도 가입도 없이 페이지 안에서 Python 실행",
    shot: "/shots/hero-codaro.webp",
    alt: "Codaro Web Learn 에서 브라우저로 Python 을 실행하는 화면",
    href: "https://eddmpython.github.io/codaro/",
  },
  {
    id: "pyproc",
    productKey: "pyproc",
    product: "pyproc",
    dotClass: "bg-pyproc",
    label: "Python 머신",
    caption: "서버 없이 브라우저 안에서 도는 영속 Python 컴퓨터",
    shot: "/shots/hero-pyproc.webp",
    alt: "pyproc 데모 페이지: 브라우저 안 영속 Python 컴퓨터",
    href: "https://eddmpython.github.io/pyproc/",
  },
  {
    id: "xlpod",
    productKey: "xlpod",
    product: "xlpod",
    dotClass: "bg-xlpod",
    label: "스프레드시트",
    caption: "Excel, Google Drive, OneDrive, SharePoint 를 그대로 열기",
    shot: "/shots/hero-xlpod.webp",
    alt: "xlpod 시작 화면: Excel, Google Drive, OneDrive, SharePoint 연결",
    href: "https://xlpod.eddmpython.com/",
  },
];

export function firstSlideIndex(productKey: ProductKey): number {
  const index = SLIDES.findIndex((slide) => slide.productKey === productKey);
  return index < 0 ? 0 : index;
}
