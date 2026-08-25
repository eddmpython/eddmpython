---
name: eddmpython-blog-writing
description: 전역 blog-writing 규칙에 eddmpython의 한국어 블로그 발행, SEO 필드, 이미지, 공개 검증 절차를 덧붙인다. eddmpython 저장소에서 블로그 초안, 개요, 전체 교정, 어려운 설명, 관련 없는 이미지, 검색 제목, blog/posts/*/index.md 작업에 사용한다. 랜딩 카피만 고치거나 이미지만 단독 제작할 때는 사용하지 않는다.
---

# eddmpython 블로그 쓰기

이 파일은 저장소 전용 확장이다. `blog/posts/*/index.md`를 쓰거나 전체 교정할 때는 전역
`$blog-writing`을 먼저 사용한다. 공통 집필 규칙을 이 저장소에 복사하지 않는다. 전역 스킬을
열 수 없으면 작업을 이어 가지 말고 해당 경로를 보고한다.

## 필요한 문서만 연다

1. **전역 `$blog-writing`** 쉬운 말, 글의 구조, 사실과 문체, AI가 실행할 수 있는 글
2. **`$human-voice`** 한국어 글을 전체 교정하거나 발행 전 문체를 검사할 때
3. **`skills/specs/operation/blogCopy.md`** 제목, summary, 도입을 고칠 때
4. **`skills/specs/operation/blogPublishing.md`** 글 파일, frontmatter, 검사와 발행 순서
5. **`skills/specs/operation/blogMedia.md`** 이미지나 영상을 추가하거나 바꿀 때
6. **`skills/specs/operation/productMarketing.md`** 제품 이름, 기능, 수치를 쓸 때

해당하지 않는 문서는 열지 않는다. eddmpython에서만 필요한 운영 계약은 `skills/specs/`에 두고,
다른 저장소에도 필요한 집필 규칙은 전역 `$blog-writing`만 고친다.

## 검사

```powershell
cd site
npm run check:post -- <글 폴더 이름>
```

검사가 통과해도 독립성, 깊이, 글맛, 이미지 의미가 자동으로 보장되지 않는다.
전역 `$blog-writing`의 문장 검사와 AI 실행 문서 여섯 항목은 사람이 읽어서 확인한다.
