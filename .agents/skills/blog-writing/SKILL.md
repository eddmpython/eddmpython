---
name: blog-writing
description: eddmpython의 한국어 블로그를 주제 조사부터 SEO 제목, 섹션 설계, 쉬운 본문, 관련 이미지 브리프, 검수와 발행까지 한 세트로 만들고 고친다. 블로그 초안, 개요, 전체 교정, 추상적인 글, 관련 없는 이미지, 후킹 제목, 검색 유입, blog/*/*.md 작업에 사용한다. 랜딩 카피만 고치거나 이미지만 단독 제작할 때는 사용하지 않는다.
---

# 블로그 작가 스킬

이 파일은 스킬을 켜는 포인터다. **규칙을 여기 적지 않는다.**

집필 규칙 문서가 다섯 개로 갈라져 서로 어긋난 적이 있다. 2026-08-19 에 하나로 합쳤다.
새로 알아낸 규칙은 `memory/blogWriter.md` 에 넣는다. 새 파일을 만들지 않는다.

## 열 순서

1. **`memory/blogWriter.md`** 작가 파이프라인. 절 뼈대를 먼저 세우는 순서, 아홉 관문,
   절마다 하는 일 네 가지, 한 문장으로 남는 것, 다른 눈이 보는 네 가지, 닫는 법, 함정
2. **`memory/writingVoice.md`** 문체 작법
3. **카테고리 폴더의 `원장.md`** 커리큘럼과 절 사슬
4. **`skills/specs/operation/blogPublishing.md`** 발행 계약. 파일 이름, frontmatter, 검사, 배포
5. `skills/specs/operation/blogMedia.md` 이미지 계약. plan.json, 색상, Hugging Face
6. `skills/specs/operation/blogCopy.md` 제목과 summary. 유입 패키징 게이트
7. `skills/specs/operation/productMarketing.md` 제품 맥락과 쓰지 말 말

규칙 문서의 전체 인덱스는 `memory/MEMORY.md` 다.

## 이 폴더의 참고 자료

규칙이 아니라 본보기다. `blogWriter.md` 와 어긋나면 `blogWriter.md` 가 이긴다.

- [article-template.md](references/article-template.md) 글 한 편의 전체 양식
- [image-brief.md](references/image-brief.md) 이미지 선택 기준
- [readability-cases.md](references/readability-cases.md) 고치기 전과 후의 예

## 검사

```powershell
npm run check:post -- <파일 경로>
```

검사가 통과해도 독립성, 깊이, 글맛, 이미지 의미가 자동으로 보장되지 않는다.
`memory/blogWriter.md` 의 관문은 사람이 읽어서 통과시킨다.
