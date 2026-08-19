# blog

발행 글과 발행 계약의 정본이다. **집필 규칙은 여기 없다.**
글을 쓰기 전에 여는 작가 파이프라인은 `memory/blogWriter.md` 이고 전체 인덱스는
`memory/MEMORY.md` 다. 규칙 문서를 이 폴더에 새로 만들지 않는다. 공개 URL은 `/blog/{slug}` 한 형태다. 카테고리는 URL에 넣지 않는다.

## 어디에 무엇을 두나

| 경로 | 역할 |
|---|---|
| `PIPELINE.md` | 발행 계약과 이미지 규칙. 다 쓴 뒤에 본다 |
| `product-marketing.md` | 제품 카피 맥락 |
| `order.json` | `/blog` 목록의 카테고리와 읽기 순서 |
| `media/` | 이미지 계획과 HF 객체 대응 |
| `scripts/` | 미디어 발행 스크립트와 원장 대조 도구 |
| `embeds/` | 본문에 붙는 실행 셀 |
| `<category-slug>/` | 카테고리 한 묶음의 글과 원장 |

카테고리 폴더 이름과 `order.json`의 category slug는 같다.

## 카테고리 하나를 열 때

1. 폴더를 만든다. 예: `blog/work-automation/`
2. 그 안에 `README.md`와 `원장.md`를 둔다. 원장에 글 제목 사슬을 먼저 적는다.
   **원장은 추적하지 않는다.** `.gitignore` 가 막는다. 커리큘럼 설계와 내부 판단이 들어 있어서다.
3. `order.json`의 `categories`에 같은 slug를 넣는다.
4. 글 파일은 `blog/<category-slug>/NNN-kebab.md`다. `NNN`은 저장소 전체에서 001부터 빈 번호 없이 이어진다.
5. 목록에 올릴 글만 `order.json`의 `posts`에 넣는다. 나머지는 `archived`에 두고 URL은 살린다.

새 카테고리의 글 제목 사슬과 글마다의 절 사슬은 그 폴더의 `원장.md`가 정본이다.
이 파일은 폴더 규칙만 적는다.

## 절 사슬을 볼 때

설계 메모는 글 파일 안에 두지 않는다. 사이트가 글 원문 전체를 공개 JS 번들로 굽기 때문이다.
까닭과 절 판정 어휘는 `PIPELINE.md`의 `예고는 이음이 아니다` 항에 있다.

```text
python blog/scripts/outline.py                 원장과 본문 H2 를 대조한다
python blog/scripts/outline.py --chain          절 사슬을 한 화면에 편다
```

이 도구는 게이트가 아니다. `npm test`에 걸지 않는다. 글을 고치는 동안 쓴다.

## 지금 있는 카테고리

| 폴더 | 목록 제목 | 원장 |
|---|---|---|
| `work-automation/` | 업무자동화 | `work-automation/원장.md` (추적하지 않음) |
