---
id: operation.blogPublishing
title: 블로그 발행
category: operation
purpose: 글을 어디에 두면 무엇이 자동으로 만들어지고 이미지는 어디에 두는지 정한다.
whenToUse:
  - 글 추가하기
  - frontmatter 필드
  - 글 이미지 어디에 두나
  - sitemap 에 글이 안 들어간다
  - 발행 전 검사
verify:
  - cd site && npm run check:blog
  - cd site && npm run verify:media
  - cd site && npm run build
  - cd site && npm run verify:visual
status: observed
---

# 블로그 발행

## 정본은 한 곳이다

```
blog/NNN-kebab.md
```

여기가 글의 정본이다. `NNN`은 `001`부터 빈 번호 없이 늘어나는 고정 발행 순번이다. 새 글은 현재
가장 큰 번호에 1을 더한다. 파일 stem 전체는 post id이자 미디어 키다. 공개 경로는 frontmatter
`slug`다. 사이트는 빌드 타임에 이
폴더를 읽는다 (`site/src/posts.ts` 의
`import.meta.glob`). 런타임 fetch 도 CMS 도 없다.

파일 순번은 발행 뒤 바꾸지 않는다. 발행일과 수정일은 저장하지 않는다. `/blog`의 공개 읽기 순서는
`blog/order.json`의 `order`로만 관리한다. 이 파일에는 강의 시간표와 차시 메타데이터를 넣지 않는다.

파일 하나를 넣으면 빌드가 함께 만든다.

- `/blog/{slug}` 실제 HTML 페이지 (프리렌더, 날짜 없음)
- `/blog` 목록의 항목
- `sitemap.xml` 항목
- `rss.xml` 항목
- 페이지별 title, description, og, canonical, `BlogPosting` 구조화 데이터

예전에 날짜가 들어간 URL은 Worker가 301로 새 slug로 보낸다.

## frontmatter 계약

`site/scripts/check-blog.mjs` 가 검사한다. 빠지면 `npm test` 가 실패하고 배포까지 못 간다.

| 필드 | 설명 |
|---|---|
| `title` | 질문이거나 주장. 명사 나열 금지. 인지도 없는 제품명을 앞에 두지 않음 (`blog/PIPELINE.md` 1.5절) |
| `slug` | 공개 URL `/blog/{slug}`. 짧은 소문자 kebab, 날짜 금지. 예: `no-install` |
| `author` | 글쓴이 |
| `section` | 글의 갈래 |
| `summary` | 목록과 검색 결과에 나가는 한두 문장 |
| `readerQuestion` | 이 글이 답하는 독자 질문 하나 |
| `readerTakeaway` | 독자가 들고 나가는 한 문장 |
| `readerLevel` | `beginner`, `working`, `advanced` 중 하나 |
| `readerStartingPoint` | 독자가 이미 아는 것과 아직 모르는 것을 적은 문장 |
| `primaryKeyword` | 제목, summary, 도입에서 함께 답할 두 단어 이상의 검색어 |
| `searchIntent` | `explanation`, `how-to`, `troubleshooting`, `comparison` 중 하나 |
| `depthContract` | 일반 글은 `standalone-deep-v1`, 프로젝트와 문제 해결 글은 `standalone-project-v1` |
| `ogImage` | 공유 이미지 URL. Hugging Face 콘텐츠 주소 객체 |
| `ogImageAlt` | 이미지 설명 |
| `ogImageWidth` / `ogImageHeight` / `ogImageType` | 이미지 규격 |

`readerQuestion` 과 `readerTakeaway` 가 없으면 글이 기능 나열로 흐르기 쉽다.
`readerStartingPoint` 가 없으면 글쓴이가 아는 말을 독자도 안다고 착각하기 쉽다. 별도 지시가
없으면 `readerLevel`은 `beginner`로 쓴다. 자세한 작성 방법은 `blog/PIPELINE.md`를 본다.

041번 이후 새 글에는 `depthContract`가 필수다. 기존 글을 전면 교정할 때도 알맞은 계약을 추가한다.

## 블로그가 원문이고 강의가 참조한다

블로그는 강의 차시를 길게 풀어 쓴 자료가 아니다. 검색이나 공유 링크로 한 편만 연 독자가 정의,
원리, 실제 예제, 실패와 검증을 모두 이해할 수 있는 독립 원문이다. 강의 시간, 차시 범위, 슬라이드
장수는 글의 목차와 분량을 줄이는 근거로 쓰지 않는다.

새 글과 전면 교정 글은 의미 있는 H2 여섯 개와 공백을 뺀 서술 본문 3,000자 이상을 기본 출발선으로
삼는다. 프로젝트와 문제 해결 글은 H2 일곱 개와 서술 본문 4,000자 이상을 출발선으로 삼는다. 숫자는
정의, 작동 원리, 완성 예제, 다른 선택지, 실패와 복구, 검증, 적용 범위를 너무 일찍 생략하지 않게 하는
하한선이며 반복 문장으로 채울 목표가 아니다.

강의 슬라이드는 공개 `/blog/{slug}`를 깊이 읽기 링크로 사용한다. 여러 슬라이드가 같은 글을 참조할 수
있고, 한 슬라이드도 여러 글을 참조할 수 있다. 슬라이드는 수업에 필요한 행동과 핵심 그림을 압축하지만
블로그 원문을 강의 시간에 맞춰 줄이거나 차시 요약으로 바꾸지 않는다.

## 초보자가 읽을 수 있는지 확인한다

사용법 글은 제품 구조가 아니라 독자가 움직이는 순서로 쓴다. 어디를 여는지, 무엇을 누르는지,
무엇을 바꾸는지, 성공하면 무엇이 보이는지, 다음 기능은 언제 필요한지 순서대로 설명한다.

`beginner` 글에는 다음 제한을 적용한다.

- H2는 32자를 넘기지 않는다
- 일반 문단은 220자를 넘기지 않는다
- 한 문장은 160자를 넘기지 않는다
- 처음 나오는 기술 용어는 같은 자리에서 쉬운 말로 설명한다

길이 검사는 `site/scripts/check-blog.mjs`가 맡는다. 용어 설명과 문단 사이의 순서는 사람이
데스크톱과 모바일 화면을 읽으면서 확인한다.

같은 검사는 내용 없는 관용구, 추상어만 이어지는 문단, 실제 예가 없는 H2도 막는다. 검사 규칙은
`site/scripts/blog-style.mjs`, 오탐과 누락을 막는 표본은 `site/scripts/test-blog-style.mjs`에 있다.
기계 검사는 자연스러운 말투를 완전히 판정하지 못하므로 새 글과 전체 교정에는 `$blog-writing` 스킬을
함께 사용한다.

## 섹션은 제목, 부제, 이미지, 설명으로 읽힌다

모든 H2는 아래 순서를 지킨다.

1. 독자의 다음 궁금증을 여는 H2
2. 이 절에서 얻을 결과를 쉬운 말로 적은 H3 한 줄 부제
3. 고유한 섹션 이미지와 캡션
4. 코드와 목록보다 먼저 나오는 쉬운 서술형 설명
5. 선택 사항인 코드, 실제 예시, 설명 목록이나 표

섹션 이미지는 `blog/media/plan.json`에서 `role: section`, 실제 H2와 H3에 맞는 `sectionHeading`,
`sectionSubtitle`, 본문 원문 `contentAnchor`, 실제 피사체 `visualSubject`, 설명할 관계
`visualRelationship`을 가진다. 다른 H2의 이미지를 재사용하지 않는다.

새로 만들거나 교체하는 생성 이미지는 `visualProfile: eddmpython-dark-v2`와
`palettePolicy: eddmpython-carbon-ivory-sand-v1`을 쓴다. 배경 `#101514`, 주요 밝은 면 `#f5f3ee`,
작은 강조 `#d8be91`, 저채도 중성색만 허용한다. 파랑, 청록, 초록, 보라, 분홍, 빨강, 금색, 네온은
쓰지 않고 성공과 실패는 모양, 명암, 선 굵기, 위치로 구분한다. `dark-editorial-v1`은 이전 자산을 찾는
값일 뿐 새 작업에 사용하지 않는다. 실제 제품 스크린샷은 원래 화면 색을 보존한다. 글자, 숫자, 코드,
로고는 생성 이미지 바이트 안에 굽지 않는다. 제목과 캡션은 HTML로 렌더해야 모바일, 검색, 접근성
표면에서 같은 문장을 유지할 수 있다.

DartLab 카드뉴스의 원칙 중 이미지와 큰 문장을 분리하고, 각 이미지가 그 문장이 말하는 장면을 맡는
부분을 가져왔다. 세로 카드 비율과 화려한 SNS 장식은 가져오지 않는다. 블로그 본문에는 3:2 가로형과
충분한 설명이 맞다. 구체적인 프롬프트와 눈검수 기준은 `blog/PIPELINE.md`가 정본이다.

## 이미지는 Git 에 넣지 않는다

본문 이미지와 글별 공유 이미지의 **바이트는 저장소에 커밋하지 않는다.**

| 무엇 | 어디 |
|---|---|
| 의미와 출처 계획 | `blog/media/plan.json` |
| 글과 원격 객체의 대응 | `blog/media/catalog.json` |
| 실제 파일 | Hugging Face `eddmpython/eddmpython-media` 콘텐츠 주소 객체 |

발행 전에 원격에 실제로 있는지 확인한다.

```bash
cd site && npm run verify:media
```

## 글 하나 발행하는 순서

1. 독자의 출발점과 첫 행동을 정하고, 직접 답, 정의, 원리, 완성 예제, 다른 선택지, 실패와 복구,
   검증, 적용 범위를 채운 깊이 설계표를 만든다. `blog/PIPELINE.md` 1.5절 유입 패키징 게이트를 통과한
   뒤 다음 세 자리 순번으로 `blog/NNN-slug.md`를 쓰고 모든 H2의 이미지 자리를 함께 정한다. 카피 판단은
   `operation.blogCopy`, 주제 선택은 `operation.contentStrategy`, 제품 맥락은
   `blog/product-marketing.md`를 본다.
2. 섹션별 쉬운 설명을 먼저 쓴 뒤 `blog/media/plan.json`에 H2, H3, 본문 원문, 피사체, 관계, 출처,
   장면 프롬프트를 남긴다
3. 실제 픽셀을 본문과 대조하고 `publish_media.py --reviewed`로 Hugging Face에 올린 뒤
   `catalog.json`을 갱신한다
4. `cd site && npm test` 로 문장 품질 표본, frontmatter 와 타입을 확인한다
5. `npm run verify:media` 로 원격 객체를 확인한다
6. `npm run verify:visual`로 모든 페이지의 데스크톱과 모바일 화면을 만들고 실제로 확인한다
7. `npm run approve:visual -- --run=<run-id>`로 확인한 빌드를 승인한다
8. `npm run deploy`
9. 캐시버스터를 붙인 글 페이지에서 H2별 본문 이미지 수와 URL, `og:image`, `twitter:image`를
   plan과 catalog의 기대값에 대조한다
10. `/blog`, `rss.xml`, `sitemap.xml`의 반영과 홈, favicon, 404, `xlpod.eddmpython.com`의 상태를
   확인한다

1단계부터 10단계까지가 한 번의 발행이다. Git push, HF 업로드, 빌드 성공 중 하나에서 멈추지 않는다.
메인 사이트는 Cloudflare Worker이므로 Git push만으로는 공개 화면이 바뀌지 않는다. 초안이나 검토만
요청받은 경우를 제외하고 공개 글을 수정하거나 발행했다면 별도 지시를 기다리지 않고 이 절차를 끝낸다.

## 글을 지울 때

파일을 지우고 다시 빌드하면 페이지, sitemap, RSS 에서 함께 빠진다.
다만 **이미 배포된 주소는 엣지 캐시에 잠시 남는다.** 캐시버스터로 404 를 확인한다.
