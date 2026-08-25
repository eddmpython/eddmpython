---
name: eddmpython-blog-writing
description: 전역 blog-writing 규칙에 eddmpython의 한국어 블로그 발행, SEO 필드, 이미지, 공개 검증 절차를 덧붙인다. eddmpython 저장소에서 블로그 초안, 개요, 전체 교정, 어려운 설명, 관련 없는 이미지, 검색 제목, blog/posts/*/index.md 작업에 사용한다. 랜딩 카피만 고치거나 이미지만 단독 제작할 때는 사용하지 않는다.
---

# eddmpython 블로그 쓰기

이 파일은 저장소 전용 확장이다. 일반 집필 규칙은 전역 `$blog-writing`을 먼저 사용한다. 이 파일에는 eddmpython에서만 필요한 정본과 검사 순서만 둔다.

집필 규칙 문서가 다섯 개로 갈라져 서로 어긋난 적이 있다. 2026-08-19 에 하나로 합쳤다.
eddmpython에서 새로 알아낸 규칙은 `../eddmpython-course/memory/rules/blogWriter.md`에 넣는다. 다른 저장소에도 필요한 일반 규칙은 전역 `$blog-writing`을 고친다.

## 열 순서

1. **전역 `$blog-writing`** 모든 저장소에서 쓰는 쉬운 말, 직접 쓰기, 사실과 문체 규칙
2. **`../eddmpython-course/memory/rules/blogWriter.md`** eddmpython 글쓰기 규칙 정본. 강행 조항, 섹션 뼈대를 먼저 세우는 순서,
   절마다 하는 일 네 가지, 한 문장으로 남는 것, 다른 눈이 보는 네 가지, 닫는 법, 함정
3. **`../eddmpython-course/memory/evidence/writingVoice.md`** 문체 실측 근거. 규칙은 2번에 있다
4. **`skills/specs/operation/blogPublishing.md`** 발행 계약. 파일 이름, frontmatter, 검사, 배포
5. `skills/specs/operation/blogMedia.md` 이미지 계약. media.json, 색상, Hugging Face
6. `skills/specs/operation/blogCopy.md` 제목과 summary. 유입 패키징 게이트
7. `skills/specs/operation/productMarketing.md` 제품 맥락과 쓰지 말 말

규칙 문서의 전체 인덱스는 `../eddmpython-course/memory/MEMORY.md` 다.

## 이 폴더의 참고 자료

규칙이 아니라 eddmpython 본보기다. 저장소 작법과 어긋나면 `memory/rules/blogWriter.md`가 이기고,
쉬운 말과 직접 쓰기가 어긋나면 전역 `$blog-writing`이 이긴다.

- [article-template.md](references/article-template.md) 글 한 편의 전체 양식
- [image-brief.md](references/image-brief.md) 이미지 선택 기준
- [readability-cases.md](references/readability-cases.md) 고치기 전과 후의 예

## 검사

```powershell
npm run check:post -- <파일 경로>
```

검사가 통과해도 독립성, 깊이, 글맛, 이미지 의미가 자동으로 보장되지 않는다.
`../eddmpython-course/memory/rules/blogWriter.md` 의 관문은 사람이 읽어서 통과시킨다.
