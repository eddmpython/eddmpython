---
id: operation.seoContract
title: 검색 노출 계약
category: operation
purpose: 크롤러가 받는 HTML, 구조화 데이터, sitemap, RSS 가 무엇을 보장하고 어디서 만들어지는지 정한다.
whenToUse:
  - 검색에 안 나온다
  - 공유 카드가 비어 보인다
  - 프리렌더
  - JSON-LD
  - sitemap 이 어디서 만들어지나
  - SPA 인데 크롤링 되나
verify:
  - cd site && npm run build
  - cd site && npm run verify:seo
status: observed
---

# 검색 노출 계약

## 지키는 것

**모든 공개 경로는 빌드 타임에 완성된 HTML 로 나온다.** JavaScript 를 실행하지 않는
크롤러도 본문을 읽을 수 있다.

| 경로 | 크롤러가 받는 본문 |
|---|---|
| `/` | 약 3,991 자 |
| `/blog` | 약 328 자 |
| `/blog/{slug}` | 글 길이에 비례 |

프리렌더를 붙이기 전에는 **세 경로 모두 0 자였다.** SPA 껍데기만 나갔다.
네이버 크롤러와 AI 크롤러는 JavaScript 실행이 약해서 이 상태로는 내용이 없는 것과 같았다.

## 어떻게 만들어지나

`site/vite.config.ts` 의 `prerender` 플러그인이 클라이언트 빌드 뒤에 한 번 더 돈다.

1. `src/entry-server.tsx` 로 SSR 번들을 만든다. 산출물이 저장소 밖이라
   `ssr.noExternal` 로 의존성을 전부 번들에 넣는다
2. `src/seo.ts` 의 `allPages()` 가 경로별 메타를 준다
3. 경로마다 `renderToString` 결과를 `index.html` 껍데기에 넣고, title, description,
   og, twitter, canonical, JSON-LD 를 그 페이지 값으로 바꾼다
4. 같은 목록에서 `sitemap.xml` 과 `rss.xml` 을 만든다

브라우저에서는 `src/main.tsx` 가 `hydrateRoot` 로 이어받는다. 루트에 자식이 있으면 붙이고
없으면 새로 그린다. **실행 셀과 시트는 hydrate 이후 그대로 동작한다.**

## 정본은 한 곳이다

경로별 메타, 구조화 데이터, sitemap, RSS 가 **전부 `src/seo.ts` 하나에서 나온다.**
한 페이지의 제목을 고치려고 여러 파일을 만지지 않는다.

블로그 글은 `primaryKeyword`와 `searchIntent`를 frontmatter에 함께 둔다. 제목, summary, 도입 두
문단은 핵심 검색어의 주요 단어를 빠뜨리지 않고 같은 문제나 결과에 답한다. explanation 제목은 이유나
질문, how-to 제목은 방법이나 순서, troubleshooting 제목은 문제나 해결, comparison 제목은 차이나
선택이 보여야 한다. `site/scripts/blog-package.mjs`와 `check:blog`가 이 약속을 검사한다.

## 구조화 데이터

| 페이지 | 담는 것 |
|---|---|
| `/` | `Organization`, `WebSite`, 제품 `ItemList` |
| `/blog` | `Blog`, `CollectionPage`, `BreadcrumbList` |
| `/blog/{slug}` | `BlogPosting`, `WebPage`, `ImageObject`, `BreadcrumbList` |

## 검사

`npm run verify:seo` 가 빌드된 HTML 을 읽어 계약을 확인한다. `npm run build` 안에서
자동으로 돈다. 실패하면 배포까지 가지 않는다.

배포 뒤에는 `pyproc-control` 운영 검증으로 Cloudflare Web Analytics가 CSP에 막히지 않는지도 확인한다.
자동 삽입 스크립트는 `static.cloudflareinsights.com`만 허용하고 측정 요청은 같은 출처의
`/cdn-cgi/rum`을 사용한다. 검색 메타데이터가 맞아도 운영 브라우저 콘솔과 네트워크 오류가 남으면
완료로 보지 않는다.

## 하지 말 것

- 프리렌더를 끄고 SPA 로 되돌리지 않는다. 본문이 다시 0 자가 된다.
- `src/seo.ts` 를 거치지 않고 `index.html` 에 페이지별 메타를 직접 쓰지 않는다.
  껍데기의 값은 프리렌더가 덮어쓰는 기본값일 뿐이다.
- 브라우저 API 를 컴포넌트 본문에서 직접 부르지 않는다. `window` 와 `document` 는
  `useEffect` 안에서만 쓴다. 본문에서 부르면 SSR 이 깨진다.

## 되돌리기

`site/vite.config.ts` 의 plugins 에서 `prerender()` 를 빼면 SPA 로 돌아간다.
그 경우 `/blog` 계열은 실제 HTML 이 없어지므로 워커에 SPA fallback 을 다시 넣어야 한다.
