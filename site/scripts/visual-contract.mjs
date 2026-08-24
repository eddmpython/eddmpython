import { readFileSync } from "node:fs";

const blogOrder = JSON.parse(
  readFileSync(new URL("../../blog/order.json", import.meta.url), "utf8"),
);

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
const AT_MOST_COUNT = (left, right) => ({ type: "at-most-count", left, right });

const ROUTE_RULES = [
  {
    match: (path) => path === "/",
    id: "home",
    checks: [
      VISIBLE("main#content"),
      TEXT("main#content h1", "실제로 작동하는 자동화로"),
      TEXT("main#content", "다루는 것"),
      COUNT('img[src^="/brand/"]', { min: 4 }),
      VISIBLE("a[data-hero-product-link]"),
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
        id: "select-dartlab-terminal",
        type: "click-until-text",
        click: 'button[aria-label="DartLab 터미널 보기"]',
        target: 'a[data-hero-product-link][href="https://eddmpython.github.io/dartlab/terminal"]',
        includes: "DartLab 열기",
      },
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
      COUNT("main#content h1", { exact: 1 }),
      COUNT("main#content time", { exact: 0 }),
      COUNT("[data-blog-list] > li", {
        exact: blogOrder.posts.length,
      }),
      // 목록은 카테고리로 묶지 않고 최신 글이 위에 온다. 2026-08-24 운영자 지시다.
      // 번호를 화면에 내지 않으므로 첫 글의 제목으로 순서를 확인한다.
      COUNT("[data-blog-category]", { exact: 0 }),
      COUNT("[data-blog-thumb]", { exact: blogOrder.posts.length }),
      COUNT('main#content a[href^="/blog/"]', {
        exact: blogOrder.posts.length,
      }),
    ],
  },
  {
    match: (path) => path.startsWith("/blog/"),
    checks: [
      VISIBLE("article#content"),
      COUNT("article#content h1", { exact: 1 }),
      COUNT("article#content h2", { min: 1 }),
      COUNT('nav[aria-label="글 목차"]', { exact: 1 }),
      // 이미지 없는 절을 허용한다. 이미지가 H2보다 많으면 여전히 실패한다.
      COUNT("article#content img", { min: 1 }),
      AT_MOST_COUNT("article#content img", "article#content h2"),
      COUNT(
        'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
        { exact: 1 },
      ),
    ],
    interactions: [
      {
        id: "toc-second-heading",
        type: "click-hash-target",
        click: 'nav[aria-label="글 목차"] li:nth-child(2) a',
        viewports: ["desktop"],
        minTop: 80,
        maxTop: 112,
        captureAfter: true,
      },
    ],
  },
  {
    match: (path) => path === "/blog/python-types",
    id: "python-types",
    checks: [
      TEXT("article#content h1", "Python 실행 순서와 자료형"),
      COUNT('aside[aria-label^="Codaro 실습 셀:"]', { exact: 3 }),
      VISIBLE(
        'aside[aria-label="Codaro 실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"] textarea',
      ),
    ],
    captures: [
      {
        id: "amount-conversion-cell",
        selector:
          'aside[aria-label="Codaro 실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"]',
      },
    ],
    interactions: [
      {
        id: "run-amount-conversion",
        type: "click-until-text",
        click:
          'aside[aria-label="Codaro 실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"] button',
        target:
          'aside[aria-label="Codaro 실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"] output',
        includes: "합계 150,000원",
        timeoutMs: 120_000,
      },
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
