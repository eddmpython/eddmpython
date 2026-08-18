# blog

발행 글과 집필 규칙의 정본이다. 공개 URL은 `/blog/{slug}` 한 형태다. 카테고리는 URL에 넣지 않는다.

## 어디에 무엇을 두나

| 경로 | 역할 |
|---|---|
| `PIPELINE.md` | 한 편을 쓰는 규칙 |
| `product-marketing.md` | 제품 카피 맥락 |
| `order.json` | `/blog` 목록의 카테고리와 읽기 순서 |
| `media/` | 이미지 계획과 HF 객체 대응 |
| `scripts/` | 미디어 발행 스크립트 |
| `embeds/` | 본문에 붙는 실행 셀 |
| `<category-slug>/` | 카테고리 한 묶음의 글과 원장 |

카테고리 폴더 이름과 `order.json`의 category slug는 같다.

## 카테고리 하나를 열 때

1. 폴더를 만든다. 예: `blog/work-process-automation/`
2. 그 안에 `README.md`와 `원장.md`를 둔다. 원장에 글 제목 사슬을 먼저 적는다.
3. `order.json`의 `categories`에 같은 slug를 넣는다.
4. 글 파일은 `blog/<category-slug>/NNN-kebab.md`다. `NNN`은 저장소 전체에서 001부터 빈 번호 없이 이어진다.
5. 목록에 올릴 글만 `order.json`의 `posts`에 넣는다. 나머지는 `archived`에 두고 URL은 살린다.

새 카테고리의 글 제목 사슬은 그 폴더의 `원장.md`가 정본이다. 이 파일은 폴더 규칙만 적는다.

## 지금 있는 카테고리

| 폴더 | 목록 제목 | 원장 |
|---|---|---|
| `work-process-automation/` | 업무프로세스자동화 | [원장.md](work-process-automation/원장.md) |
