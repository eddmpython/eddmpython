import { readFileSync } from "node:fs";

const curriculum = JSON.parse(
  readFileSync(new URL("../../blog/curriculum.json", import.meta.url), "utf8"),
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
      TEXT("#curriculum-title", "Python과 AI 업무자동화"),
      COUNT('section[aria-labelledby="curriculum-title"] ol > li', {
        exact: curriculum.stages.length,
      }),
      COUNT('a[href^="/blog/"]', { min: 1 }),
    ],
  },
  {
    match: (path) => path.startsWith("/blog/"),
    checks: [
      VISIBLE("article#content"),
      COUNT("article#content h1", { exact: 1 }),
      COUNT("article#content h2", { min: 1 }),
      COUNT('nav[aria-label="글 목차"]', { exact: 1 }),
      EQUAL_COUNT("article#content h2", "article#content img"),
      COUNT(
        'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
        { exact: 1 },
      ),
    ],
  },
  {
    match: (path) => path === "/blog/python-basic-syntax",
    id: "python-basic-syntax",
    checks: [
      TEXT("article#content h1", "Python 기초문법 6가지를 영상과 실행 셀로 배우는 방법"),
      COUNT('button[aria-label="YouTube 영상 재생"]', { exact: 1 }),
      COUNT('a[href="https://www.youtube.com/shorts/priwCYZJ8h4"]', { exact: 1 }),
      COUNT('aside[aria-label^="Codaro 실습 셀:"]', { exact: 7 }),
      VISIBLE('aside[aria-label="Codaro 실습 셀: 기준금액으로 거래 분류하기"] textarea'),
    ],
    captures: [
      {
        id: "shorts-and-first-cell",
        selector: '[data-youtube-player="priwCYZJ8h4"]',
      },
      {
        id: "condition-cell",
        selector: 'aside[aria-label="Codaro 실습 셀: 기준금액으로 거래 분류하기"]',
      },
    ],
    interactions: [
      {
        id: "run-condition-example",
        type: "click-until-text",
        click:
          'aside[aria-label="Codaro 실습 셀: 기준금액으로 거래 분류하기"] button',
        target:
          'aside[aria-label="Codaro 실습 셀: 기준금액으로 거래 분류하기"] output',
        includes: "100,000원: 확인필요",
        timeoutMs: 120_000,
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
