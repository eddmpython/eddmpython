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
status: observed
---

# 블로그 발행

## 정본은 한 곳이다

```
blog/YYYY-MM-DD-slug.md
```

여기가 글의 정본이다. 사이트는 빌드 타임에 이 폴더를 읽는다 (`site/src/posts.ts` 의
`import.meta.glob`). 런타임 fetch 도 CMS 도 없다.

파일 하나를 넣으면 빌드가 함께 만든다.

- `/blog/{slug}` 실제 HTML 페이지 (프리렌더)
- `/blog` 목록의 항목
- `sitemap.xml` 항목
- `rss.xml` 항목
- 페이지별 title, description, og, canonical, `BlogPosting` 구조화 데이터

## frontmatter 계약

`site/scripts/check-blog.mjs` 가 검사한다. 빠지면 `npm test` 가 실패하고 배포까지 못 간다.

| 필드 | 설명 |
|---|---|
| `title` | 질문이거나 주장. 명사 나열 금지 |
| `date` | 발행일 `YYYY-MM-DD` |
| `modified` | 마지막 수정일 |
| `author` | 글쓴이 |
| `section` | 글의 갈래 |
| `summary` | 목록과 검색 결과에 나가는 한두 문장 |
| `readerQuestion` | 이 글이 답하는 독자 질문 하나 |
| `readerTakeaway` | 독자가 들고 나가는 한 문장 |
| `ogImage` | 공유 이미지 URL. Hugging Face 콘텐츠 주소 객체 |
| `ogImageAlt` | 이미지 설명 |
| `ogImageWidth` / `ogImageHeight` / `ogImageType` | 이미지 규격 |

`readerQuestion` 과 `readerTakeaway` 가 필수인 이유는 이것이 없으면 글이 기능 나열로
흘러가기 때문이다. 쓰는 방법은 `blog/PIPELINE.md` 를 본다.

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

1. `blog/YYYY-MM-DD-slug.md` 를 쓴다. 규칙은 `blog/PIPELINE.md`
2. 이미지를 만들고 `blog/media/plan.json` 에 의미와 출처를 남긴다
3. `publish_media.py` 로 Hugging Face 에 올리고 `catalog.json` 을 갱신한다
4. `cd site && npm test` 로 frontmatter 와 타입을 확인한다
5. `npm run verify:media` 로 원격 객체를 확인한다
6. `npm run deploy`
7. `/blog` 목록과 글 페이지, `rss.xml` 을 눈으로 확인한다

## 글을 지울 때

파일을 지우고 다시 빌드하면 페이지, sitemap, RSS 에서 함께 빠진다.
다만 **이미 배포된 주소는 엣지 캐시에 잠시 남는다.** 캐시버스터로 404 를 확인한다.
