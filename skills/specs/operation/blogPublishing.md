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

## 섹션은 제목, 이미지, 설명으로 읽힌다

모든 H2는 아래 순서를 지킨다.

1. 독자의 다음 궁금증을 여는 H2
2. H2 바로 뒤의 고유한 섹션 이미지와 캡션
3. 이미지를 실제 사례와 판단으로 연결하는 설명

섹션 이미지는 `blog/media/plan.json`에서 `role: section`, 실제 H2와 같은 `sectionHeading`,
`visualProfile: dark-editorial-v1`을 가진다. 다른 H2의 이미지를 재사용하지 않는다. 이미지는 차콜과
그레이 중심의 낮은 채도로 만들고 글자, 숫자, 코드, 로고를 바이트 안에 굽지 않는다. 제목과 캡션은
HTML로 렌더해야 모바일, 검색, 접근성 표면에서 같은 문장을 유지할 수 있다.

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

1. `blog/YYYY-MM-DD-slug.md` 를 쓰고 모든 H2의 이미지 자리를 함께 정한다. 규칙은 `blog/PIPELINE.md`
2. 섹션별 이미지를 만들고 `blog/media/plan.json` 에 H2, 의미, 출처, 최종 프롬프트를 남긴다
3. `publish_media.py` 로 Hugging Face 에 올리고 `catalog.json` 을 갱신한다
4. `cd site && npm test` 로 frontmatter 와 타입을 확인한다
5. `npm run verify:media` 로 원격 객체를 확인한다
6. `npm run deploy`
7. 캐시버스터를 붙인 글 페이지에서 H2별 본문 이미지 수와 URL, `og:image`, `twitter:image`를
   plan과 catalog의 기대값에 대조한다
8. `/blog`, `rss.xml`, `sitemap.xml`의 반영과 홈, favicon, 404, `xlpod.eddmpython.com`의 상태를
   확인한다

1단계부터 8단계까지가 한 번의 발행이다. Git push, HF 업로드, 빌드 성공 중 하나에서 멈추지 않는다.
메인 사이트는 Cloudflare Worker이므로 Git push만으로는 공개 화면이 바뀌지 않는다. 초안이나 검토만
요청받은 경우를 제외하고 공개 글을 수정하거나 발행했다면 별도 지시를 기다리지 않고 이 절차를 끝낸다.

## 글을 지울 때

파일을 지우고 다시 빌드하면 페이지, sitemap, RSS 에서 함께 빠진다.
다만 **이미 배포된 주소는 엣지 캐시에 잠시 남는다.** 캐시버스터로 404 를 확인한다.
