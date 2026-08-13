export const VISUAL_VIEWPORTS = [
  {
    id: "desktop",
    label: "데스크톱",
    width: 1440,
    height: 1000,
    isMobile: false,
    hasTouch: false,
  },
  {
    id: "mobile",
    label: "모바일",
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  },
];

const VISIBLE = (selector) => ({ type: "visible", selector });
const COUNT = (selector, expected) => ({ type: "count", selector, ...expected });
const TEXT = (selector, includes) => ({ type: "text", selector, includes });
const EQUAL_COUNT = (left, right) => ({ type: "equal-count", left, right });

const ROUTE_RULES = [
  {
    match: (path) => path === "/",
    id: "home",
    checks: [
      VISIBLE("main#content"),
      TEXT("main#content h1", "실제로 작동하는 자동화로"),
      TEXT("main#content", "다루는 것"),
      COUNT('img[src^="/brand/"]', { min: 4 }),
      VISIBLE(
        'a[data-hero-product-link][href="https://eddmpython.github.io/dartlab/terminal"]',
      ),
      VISIBLE("#products"),
      TEXT("#data", "400 GB+"),
      TEXT("#data", "7,870"),
      VISIBLE(
        '#data a[href="https://huggingface.co/datasets/eddmpython/dartlab-data"]',
      ),
      TEXT("#euddeum", "으뜸이"),
      COUNT('#euddeum img[src^="/brand/euddeum-"]', { exact: 4 }),
    ],
    captures: [
      {
        id: "hero-product-link",
        selector: "a[data-hero-product-link]",
      },
      {
        id: "dartlab-data",
        selector: "#data article",
      },
      {
        id: "euddeum",
        selector: "#euddeum",
      },
    ],
    interactions: [
      {
        id: "select-xlpod",
        type: "click-until-text",
        click: 'button[data-product-key="xlpod"]',
        target: 'a[data-hero-product-link][href="https://xlpod.eddmpython.com/"]',
        includes: "xlpod 열기",
      },
    ],
  },
  {
    match: (path) => path === "/blog",
    id: "blog",
    checks: [
      VISIBLE("main#content"),
      TEXT("main#content h1", "블로그"),
      COUNT('a[href^="/blog/"]', { min: 1 }),
    ],
  },
  {
    match: (path) => path.startsWith("/blog/"),
    checks: [
      VISIBLE("article#content"),
      COUNT("article#content h1", { exact: 1 }),
      COUNT("article#content h2", { min: 1 }),
      EQUAL_COUNT("article#content h2", "article#content img"),
    ],
  },
  {
    match: (path) => path === "/blog/no-install",
    id: "codaro-guide",
    checks: [
      TEXT("article#content h1", "설치 없이 Python 첫 코드를 실행하는 방법"),
      COUNT('aside[aria-label^="Codaro 실습 셀:"]', { exact: 1 }),
      VISIBLE('textarea[aria-label="Python 코드"]'),
      TEXT('aside[aria-label^="Codaro 실습 셀:"] button', "실행"),
    ],
    captures: [
      {
        id: "codaro-cell",
        selector: 'aside[aria-label^="Codaro 실습 셀:"]',
      },
    ],
    interactions: [
      {
        id: "run-example",
        type: "click-until-text",
        click: 'aside[aria-label^="Codaro 실습 셀:"] button',
        target: 'aside[aria-label^="Codaro 실습 셀:"] output',
        includes: "1위: 서울",
        timeoutMs: 120_000,
      },
    ],
  },
];

function fallbackId(path) {
  return path === "/"
    ? "home"
    : path
        .replace(/^\//, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "page";
}

export function visualContractFor(path) {
  const matched = ROUTE_RULES.filter((rule) => rule.match(path));
  return {
    id: matched.findLast((rule) => rule.id)?.id ?? fallbackId(path),
    path,
    checks: matched.flatMap((rule) => rule.checks),
    captures: matched.flatMap((rule) => rule.captures ?? []),
    interactions: matched.flatMap((rule) => rule.interactions ?? []),
  };
}
