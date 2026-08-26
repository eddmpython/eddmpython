import { readdirSync, readFileSync } from "node:fs";

/**
 * `/blog` 목록에 나갈 글 수를 파일에서 센다.
 *
 * 예전에는 `order.json` 의 `posts` 길이를 썼다. 그 파일이 정본이 아니라 파일 목록을 손으로
 * 옮겨 적은 것이라, 글을 추가하고 목록에 안 적으면 화면과 계약이 같이 틀린 채로 통과했다.
 * 2026-08-24 에 그 파일을 없앴다. 지금은 글 파일을 직접 세고 아카이브한 글만 뺀다.
 */
const postsRoot = new URL("../../blog/posts/", import.meta.url);
const listedPostCount = readdirSync(postsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{3}-[a-z0-9-]+$/.test(entry.name))
  .map((dir) => readFileSync(new URL(`${dir.name}/index.md`, postsRoot), "utf8"))
  .filter((raw) => !/^archived:\s*true\s*$/m.test(raw)).length;

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
        exact: listedPostCount,
      }),
      // 목록은 카테고리로 묶지 않고 최신 글이 위에 온다. 2026-08-24 운영자 지시다.
      // 번호를 화면에 내지 않으므로 첫 글의 제목으로 순서를 확인한다.
      COUNT("[data-blog-category]", { exact: 0 }),
      COUNT("[data-blog-thumb]", { exact: listedPostCount }),
      COUNT('main#content a[href^="/blog/"]', {
        exact: listedPostCount,
      }),
    ],
  },
  {
    // 브랜드 자산 화면. 여기 보이는 마크는 그림이 아니라 src/brand.ts 가 그 자리에서
    // 계산해 낸 실물이다. 심볼을 고쳐 경로가 깨지면 이 화면이 먼저 무너지므로
    // 락업·마감·크기·팔레트가 전부 살아 있는지 세어서 확인한다.
    match: (path) => path === "/brand",
    id: "brand",
    checks: [
      VISIBLE("main#content"),
      TEXT("main#content h1", "한 획으로 그린 나선"),
      COUNT("main#content h1", { exact: 1 }),
      // 심볼이 그려지려면 path 가 있어야 한다. 화면 전체에서 넉넉히 잡는다.
      COUNT("main#content svg path", { min: 12 }),
      VISIBLE("#origin"),
      VISIBLE("#lockup"),
      VISIBLE("#icon"),
      VISIBLE("#size"),
      VISIBLE("#color"),
      VISIBLE("#files"),
      // 마감 네 가지가 다 있어야 한다. 하나라도 빠지면 자산 목록이 거짓이 된다.
      COUNT("#icon svg", { exact: 4 }),
      // 16px 부터 64px 까지 다섯 단계.
      COUNT("#size svg", { exact: 5 }),
      TEXT("#color", "#f56565"),
      // 내려받는 파일은 빌드가 만든 실제 주소여야 한다. 화면은 `BRAND_ASSETS` 를 그대로
      // 훑으므로 목록과 어긋날 수 없고, 여기서 확인하는 것은 그 목록 자체가 일곱 개를
      // 그대로 들고 있는지다. 한때 빌드는 일곱 개를 내는데 화면은 네 개만 보여 줬다.
      COUNT("#files a", { exact: 7 }),
      VISIBLE('#files a[href="/brand/mark-dark.svg"]'),
      VISIBLE('#files a[href="/brand/mark-light.svg"]'),
      VISIBLE('#files a[href="/brand/icon-light.svg"]'),
      VISIBLE('#files a[href="/brand/icon-dark.svg"]'),
      VISIBLE('#files a[href="/brand/icon-brand.svg"]'),
      VISIBLE('#files a[href="/brand/icon-outline.svg"]'),
      VISIBLE('#files a[href="/favicon.svg"]'),
    ],
    captures: [
      { id: "lockup", selector: "#lockup" },
      { id: "icon-finishes", selector: "#icon" },
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
      COUNT('aside[aria-label^="실습 셀:"]', { exact: 3 }),
      VISIBLE(
        'aside[aria-label="실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"] textarea',
      ),
    ],
    captures: [
      {
        id: "amount-conversion-cell",
        selector:
          'aside[aria-label="실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"]',
      },
    ],
    interactions: [
      {
        id: "run-amount-conversion",
        type: "click-until-text",
        click:
          'aside[aria-label="실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"] button',
        target:
          'aside[aria-label="실습 셀: 문자 금액을 계산 가능한 숫자로 바꾸기"] output',
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
      COUNT('aside[aria-label^="실습 셀:"]', { exact: 1 }),
      VISIBLE('textarea[aria-label="Python 코드"]'),
      TEXT('aside[aria-label^="실습 셀:"] button', "실행"),
    ],
    captures: [
      {
        id: "codaro-cell",
        selector: 'aside[aria-label^="실습 셀:"]',
      },
    ],
    interactions: [
      {
        id: "run-example",
        type: "click-until-text",
        click: 'aside[aria-label^="실습 셀:"] button',
        target: 'aside[aria-label^="실습 셀:"] output',
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
