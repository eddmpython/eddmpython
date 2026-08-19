---
id: operation.blogPublishing
title: 블로그 발행
category: operation
purpose: 글 파일을 어디에 두면 무엇이 자동으로 만들어지고 어떤 검사를 지나 어떻게 배포되는지 정한다.
whenToUse:
  - 글 추가하기
  - frontmatter 필드
  - 카테고리 만들기
  - slug 규칙
  - sitemap 에 글이 안 들어간다
  - 발행 전 검사
  - 글 내리기
verify:
  - cd site && npm run check:blog
  - cd site && npm run verify:media
  - cd site && npm run build
  - cd site && npm run verify:visual
status: observed
---

# 블로그 발행

이 문서는 **기계 계약**이다. 파일 이름, frontmatter, 검사, 배포 순서를 정한다.
**글을 어떻게 쓰는지는 여기 없다.** 작가 파이프라인은 `memory/blogWriter.md` 이고
추적하지 않는다. 규칙 문서 전체 인덱스는 `memory/MEMORY.md` 다.

## 정본은 한 곳이다

```
blog/content/<category-slug>/NNN-kebab.md
```

여기가 글의 정본이다. `NNN` 은 저장소 전체에서 `001` 부터 빈 번호 없이 늘어나는 고정 발행
순번이다. 새 글은 현재 가장 큰 번호에 1을 더한다. 파일 stem 전체가 post id 이자 미디어 키다.
공개 경로는 frontmatter `slug` 이고 `/blog/{slug}` 한 형태다.

사이트는 빌드 타임에 카테고리 폴더를 읽는다 (`site/src/posts.ts` 의 `import.meta.glob`).
런타임 fetch 도 CMS 도 없다. **글 파일 원문 전체가 공개 JS 번들에 문자열로 구워진다.**
frontmatter 도 본문도 예외가 아니다. 설계 메모와 내부 판단을 글 파일에 넣지 않는 이유다.

파일 순번은 발행 뒤 바꾸지 않는다. 발행일과 수정일은 저장하지 않고 구조화 데이터, sitemap,
RSS 에도 넣지 않는다. 사이트가 읽는 것은 `site/src/posts.ts` 의 `blog/content/*/???-*.md` glob 이라
**세 자리 숫자로 시작하지 않는 파일은 글 목록에 아예 들어가지 않는다.** 대소문자와 무관하다.

파일 하나를 넣으면 빌드가 함께 만든다.

- `/blog/{slug}` 실제 HTML 페이지 (프리렌더, 날짜 없음)
- `/blog` 목록의 항목
- `sitemap.xml` 항목
- `rss.xml` 항목
- 페이지별 title, description, og, canonical, `BlogPosting` 구조화 데이터

예전에 날짜가 들어간 URL 은 Worker 의 `LEGACY_BLOG` 가 301 로 새 slug 로 보낸다.

## frontmatter 계약

`site/scripts/check-blog.mjs` 의 `requiredMeta` 가 검사한다. 빠지면 `npm test` 가 실패하고
배포까지 못 간다. **필수 11개다.**

| 필드 | 설명 |
|---|---|
| `title` | 질문이거나 주장. 명사 나열 금지. 인지도 없는 제품명을 앞에 두지 않는다. **15자 이상 60자 이하** |
| `slug` | 공개 URL `/blog/{slug}`. 짧은 소문자 kebab, 날짜 금지 |
| `author` | 화면과 구조화 데이터에 함께 표시할 글쓴이 |
| `section` | 글 하나의 소주제. 카테고리와 층이 다르다 |
| `summary` | 목록과 검색 결과에서 글을 열 이유를 설명하는 한두 문장 |
| `readerQuestion` | 이 글이 끝까지 답할 질문 하나 |
| `readerTakeaway` | 독자가 글을 덮고 기억할 한 문장 |
| `readerLevel` | `beginner`, `working`, `advanced` 중 하나. 지시 없으면 `beginner` |
| `readerStartingPoint` | 독자가 이미 아는 것과 아직 모르는 것 |
| `primaryKeyword` | 제목과 summary 와 H2 하나에 함께 쓸 두 단어 이상의 검색어 |
| `searchIntent` | `explanation`, `how-to`, `troubleshooting`, `comparison` 중 하나 |

이미지를 붙이면 다섯 개가 더 필수가 된다. `ogImage`, `ogImageAlt`, `ogImageWidth`,
`ogImageHeight`, `ogImageType` 이다. 발행 전에는 `media://asset-key`, 발행 뒤에는 Hugging Face
객체 URL 이다. 자세한 것은 [blogMedia.md](blogMedia.md) 를 본다.

`readerStartingPoint` 에 `초보자` 라고만 쓰지 않는다. `파이썬을 설치해 본 적이 없고 셀과 .py 의
뜻을 모른다` 처럼 독자가 모르는 말을 적는다.

frontmatter 파서는 `^([A-Za-z][A-Za-z0-9]*):\s*(.*)$` 한 줄 정규식이다. **여러 줄 배열을 넣으면
그 줄에서 실패한다.** 목록형 메타데이터를 추가하려면 파서를 먼저 고친다.

## 카테고리와 공개 읽기 순서

`blog/order.json` 이 카테고리와 목록 순서의 정본이다. 카테고리 하나가 강의 한 묶음이며
폴더 이름과 category slug 는 같다.

```json
{
  "version": 3,
  "categories": [
    { "slug": "work-automation", "title": "업무자동화", "order": 1, "summary": "..." }
  ],
  "posts": [{ "order": 1, "slug": "what-is-python", "category": "work-automation" }]
}
```

**공개 URL 에 카테고리를 넣지 않는다.** 카테고리는 `/blog` 목록에서 묶어 보여 주는 데만 쓴다.

**카테고리 하나가 세트 하나다.** 4~6편이고, 그 세트만 읽어도 독자의 일 하나가 실제로 돌아야
한다. 준비만 하는 세트는 만들지 않는다. 편당 2,000자 근처이므로 세트 하나가 1만자 안팎이고
한 자리에서 읽힌다. 큰 카테고리 하나에 40편을 넣던 앞 구조를 2026-08-19 에 이렇게 바꿨다.

순서는 두 가지뿐이고 서로 독립이다.

- **파일 순번** `NNN`: 저장소와 미디어에서 글을 구분하는 고정 번호
- **`order.json` 의 `order`**: `/blog` 에서 쓰는 공개 읽기 순서. 1부터 빈 번호 없이

`order.json` 에 강의 시간, 차시, 선수 단계, 학습 성과를 넣지 않는다. 공개 읽기 순서는 처음
방문한 사람이 목록을 훑기 좋은 편집 순서일 뿐 시간표도 선수 관계도 아니다. 중간에 새 주제가
필요하면 `order` 만 다시 정렬하고 이미 발행한 파일 순번과 slug 는 바꾸지 않는다.

`check:blog` 가 카테고리 slug 형식과 중복, order 연속성, summary 길이, 모든 글의 `category` 가
실제로 존재하는지 검사한다.

### 새 카테고리를 열 때

1. 폴더를 만든다. 예: `blog/content/work-automation/`
2. 그 안에 `README.md` 와 `원장.md` 를 둔다. **원장은 추적하지 않는다.** 커리큘럼 설계와
   내부 판단이 들어 있어서다
3. `order.json` 의 `categories` 에 같은 slug 를 넣는다
4. 목록에 올릴 글만 `posts` 에 넣는다

## 공개 slug 규칙

| 규칙 | 내용 |
|---|---|
| 문자 | 소문자 영문, 숫자, 하이픈만. 날짜로 시작 금지 |
| 길이 | 4자 이상 40자 이하. 보통 2~4 단어 |
| 뜻 | 제목 전체를 옮기지 말고 독자가 주제를 바로 읽게 짧게 |
| 제품명 | 인지도가 약한 제품명을 slug 앞에 두지 않는다 |
| 고정 | 한 번 공개한 slug 는 바꾸지 않는다. 바꾸면 Worker `LEGACY_BLOG` 에 301 을 남긴다 |

좋은 예: `no-install`, `ai-environment`
나쁜 예: `2026-08-09-codaro-guide` (날짜), `run-python-without-install` (제목 나열로 김),
`codaro_guide` (밑줄)

미디어 plan 과 catalog 키의 `post` 필드는 파일 stem 을 유지한다. 공개 slug 와 달라도 된다.

## 아카이브

`order.json` 의 `archived` 에 넣은 글은 `/blog` 목록에서만 빠진다. **글 파일과 공개 URL 과
sitemap 은 그대로 둔다.** 검색에 색인된 글을 실제로 내리면 유입이 죽고 되돌릴 수 없다.

```json
{ "archived": [{ "slug": "no-install", "note": "목록에서 뺀 이유" }] }
```

모든 글 파일은 `posts` 또는 `archived` 중 정확히 한 곳에 있어야 한다. `check:blog` 가 양쪽에
동시에 있거나 어느 쪽에도 없는 경우를 막고 `note` 가 비면 실패시킨다. 왜 뺐는지 적지 않으면
나중에 되돌릴 근거가 사라진다.

커리큘럼을 다시 짤 때는 글을 지우지 않고 아카이브로 내린 뒤 새 순서로 다시 쓴 것부터 한 편씩
`posts` 에 올린다.

## 블로그가 원문이고 강의가 참조한다

방향은 항상 `독립 블로그 원문 -> 강의 슬라이드의 요약과 참조 링크` 다. 슬라이드는 수업에 필요한
행동과 핵심 그림만 압축하고, 정의의 전체 설명, 원리, 전체 코드, 실패 사례, 추가 근거는 블로그
링크에서 읽게 한다. **교안이 짧아졌다고 블로그를 줄이지 않는다.**

강의 구성, 수업 시간, 슬라이드 순서, 실습 결과, 완료 기준, 분 단위 진행, 개입 기준, 수행평가
배점은 비공개 `course/` 에서 관리한다. 공개 블로그에 강의용 stage id 를 만들지 않는다. 강의가
참조 대상을 찾는 키는 공개 slug `/blog/{slug}` 다. 여러 슬라이드가 같은 글을 참조할 수 있고
한 슬라이드도 여러 글을 참조할 수 있다.

## 게이트는 두 개다

예전에는 한 편을 고칠 때마다 `check:blog` 가 40편을 전부 다시 쟀다. 규칙 하나를 넣으려면 기존
40편이 모두 통과해야 했고, 통과시키려고 `v1` 과 `v2` 같은 계약 버전을 만들어 붙였다. 그 복잡함은
전부 게이트가 전역이라서 생긴 것이었다.

**`npm run check:post -- <파일 경로>`** 는 그 한 편만 본다. 글을 쓰는 동안 도는 게이트다.
문장 단위 추상 검사, 서술 문단 줄바꿈, 절의 제목과 부제와 이미지 순서, H4 보조자료 라벨,
코드 앞뒤 설명 길이, `sectionHeading` 과 `contentAnchor` 가 본문과 같은지를 검사한다.

**`npm run check:blog`** 는 인자 없이 같은 스크립트를 돌린다. 여러 글 사이의 관계 (파일 순번,
slug 중복, `order.json` 정합, 미디어 catalog 참조 무결성, SHA-256 경로, `blog/` 아래 로컬 이미지
차단, em dash, 명령형 뒤 마침표) 에 더해 **모든 글의 문장 품질도 함께 잰다.**

`STRICT = Boolean(targetPost)` 이므로 전체 검사에서 꺼지는 것은 다섯 개뿐이다. `lintProseTexture`,
`requireCodeLabels`, `openLabels`, `checkLabels`, `strictAnchor` 다. 나머지는 전편에 그대로 돈다.
title 길이, 부제 길이, 절 첫 블록, 절 설명 길이, beginner 한도, 빈 관용구, 이미지 대조가 전부
포함된다. 한 편만 고쳤어도 다른 글이 깨져 있으면 `npm test` 가 실패한다.

`strictLead` 는 두 모드 모두 `false` 로 고정되어 있다. **절의 제목과 부제와 이미지 순서를 강제하는
검사는 지금 한 번도 돌지 않는다.**

기계가 강제하는 형식은 이렇다.

- 서술 문단은 소스에서도 한 줄이다. 하드 줄바꿈은 `check:post` 가 막는다
- 추상어를 쓴 문장에는 **그 문장 안에** 파일, 화면, 명령, 값, 오류 중 하나가 있어야 한다.
  이웃 문장에 있는 것으로는 인정하지 않는다
- `title` 은 15자 이상 60자 이하다. `check-blog.mjs` 는 10~70 으로 재고 `blog-package.mjs` 는
  15~60 으로 잰다. 둘 다 항상 돌므로 **실효 게이트는 좁은 쪽인 15~60** 이다
- H3 부제를 쓴 절이면 부제는 **15자 이상 80자 이하**다
- **절의 첫 블록은 코드나 목록이 아닌 60자 이상의 서술 문단**이다
- **절 전체 설명은 120자를 넘는다.** 이미지가 있는 절만이 아니라 모든 절에 적용된다
- `beginner` 글은 H2 32자, 일반 문단 220자, 한 문장 160자를 넘기지 않는다
- 본문에 `지난편`, `이전편`, `다음편`, `이전 글`, `다음 글` 을 쓰지 않는다
- 코드 블록은 `#### 예시 코드: 금액 문자열을 숫자로 바꾸기` 처럼 역할과 개념이 함께 보이는
  H4 아래에 둔다. `코드`, `예시`, `참고`, `내용`, `정리`, `설명`, `기타`, `자료` 처럼 그 자체로
  아무것도 알려 주지 않는 역할어는 막는다. 같은 H4 범위에 입력, 핵심 줄이 바꾸는 값, 예상 결과를
  합쳐 80자 이상 서술한다
- 핵심어는 제목과 summary 와 H2 하나에만 요구한다. 도입 두 문단에도 핵심어 전체를 넣게 하던
  규칙은 뺐다. 그 규칙이 발행 40편 중 29편의 첫 문장을 `핵심어 + 을 또는 를` 로 시작하게 만들었다

검사 규칙은 두 파일에 나뉘어 있다. 문장 단위 어투와 금지어는 `site/scripts/blog-style.mjs`,
title 과 부제와 절 구조와 H4 라벨은 `site/scripts/blog-package.mjs` 다. 오탐과 누락을 막는
표본은 각각 `test-blog-style.mjs` 와 `test-blog-package.mjs` 에 있다.

**글자 수 하한은 쓰지 않는다.** 2026-08-17 에 발행 40편을 실측해 없앴다. 까닭은
`memory/blogWriter.md` 에 있다.

## 실행 칸

제품을 직접 실행해야 이해되는 글은 정적 코드 블록에서 멈추지 않는다. 예제를
`blog/embeds/codaro-cells.json` 에 제목, 설명, 실행 코드, 전체 Web Run URL 로 등록하고 본문에
아래 주소를 다른 내용 없는 한 줄로 둔다.

```text
https://eddmpython.com/codaro/run/?example=<example-id>
```

사이트가 이 줄을 브라우저에서 실행할 수 있는 코드 입력칸으로 바꾼다. 블로그 안에서는 코드를
바꾸고 결과를 보는 기능만 제공한다. 답 검사, 학습 기록 저장, 다음 레슨 이동은 셀 아래의 전체
Web Run 링크에서 쓸 수 있다고 정확히 적는다.

## 글 하나 발행하는 순서

1. `memory/blogWriter.md` 의 작가 파이프라인을 통과한다. **[blogCopy.md](blogCopy.md) 의 유입
   패키징 게이트는 제목을 확정하기 전에 본다.** 주제 선택은
   [contentStrategy.md](contentStrategy.md), 제품 맥락은
   [productMarketing.md](productMarketing.md) 다
2. 다음 세 자리 순번으로 `blog/content/<category-slug>/NNN-slug.md` 를 쓴다
3. 이미지가 있으면 [blogMedia.md](blogMedia.md) 의 순서로 계획하고 Hugging Face 에 올린다
4. `cd site && npm run check:post -- <파일 경로>` 로 한 편을 검사한다
5. `npm test` 로 전체 계약과 타입을 확인한다
6. `npm run verify:media` 로 원격 객체를 확인한다
7. `npm run build`
8. `npm run verify:visual` 로 모든 페이지의 데스크톱과 모바일 화면을 만들고 **직접 읽는다**
9. `npm run approve:visual -- --run=<run-id>` 로 확인한 빌드를 승인한다
10. `npm run deploy`
11. 캐시버스터를 붙인 글 페이지에서 H2별 본문 이미지 수와 URL, `og:image`, `twitter:image` 를
    plan 과 catalog 의 기대값에 대조한다
12. `/blog`, `rss.xml`, `sitemap.xml` 의 반영과 홈, favicon, 404, `xlpod.eddmpython.com` 의
    상태를 확인한다

**1단계부터 12단계까지가 한 번의 발행이다.** Git push, Hugging Face 업로드, 빌드 성공은 각각
중간 단계다. 메인 사이트는 Cloudflare Worker 이므로 Git push 만으로는 공개 화면이 바뀌지 않는다.
초안이나 검토만 요청받은 경우를 빼고, 공개 글을 고쳤거나 발행했다면 별도 지시를 기다리지 않고
이 절차를 끝낸다.

`verify:visual` 은 sitemap 의 모든 페이지를 데스크톱과 모바일 폭으로 렌더하고 가로 넘침, 깨진
이미지, 브라우저 오류, H2 와 이미지 수를 검사한다. 저장소 밖에 생성된 두 화면 폭의 전체
스크린샷을 직접 읽고 제목 줄바꿈, 본문 폭, 이미지 크기와 캡션, 표와 코드의 가로 넘침을 확인한
뒤 그 run id 를 승인한다. **승인 뒤 빌드가 바뀌면 `deploy` 는 중단된다.** 자세한 것은
[visualVerification.md](visualVerification.md) 다.

## 옛 글은 저장소 밖에 있다

2026-08-19 에 커리큘럼을 다시 열면서 옛 글 39편을 저장소에서 내렸다. 지운 것이 아니라 옮겼다.

```text
../eddmpython.out/blog-archive/     옛 글 39편, old-plan.json, old-catalog.json
```

**참고용이다. 공개 표면이 아니다.** 새 글을 쓸 때 그때 뭘 어떻게 설명했는지 보고, 쓸 만한
이미지가 있으면 `--find` 로 찾아 다시 쓴다. 저장소로 되돌리지 않는다. Git 이력의
`e937827^` 에도 그대로 있다.

## 롤백

| 무엇 | 어떻게 |
|---|---|
| 글 내용 | 글 파일을 이전 커밋으로 되돌리고 발행 순서를 다시 돈다. 수정 날짜를 저장하지 않으므로 흔적이 남지 않는다 |
| 목록에서 빼기 | 파일을 지우지 않고 `order.json` 의 `archived` 로 옮긴다. URL 과 sitemap 은 산다 |
| 글 삭제 | 파일을 지우고 다시 빌드하면 페이지, sitemap, RSS 에서 함께 빠진다. **이미 배포된 주소는 엣지 캐시에 잠시 남는다.** 캐시버스터로 404 를 확인한다 |
| 배포 | [deploy.md](deploy.md) 의 Worker 롤백을 따른다 |
