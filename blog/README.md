# blog

발행 글과 그 글이 쓰는 자산만 있다. **규칙 문서는 여기 없다.**

| 무엇 | 어디 |
|---|---|
| 글을 쓰기 전에 여는 작가 파이프라인 | `../eddmpython-course/memory/rules/blogWriter.md` (비공개 형제 저장소, 추적 안 함) |
| 문체 실측 근거 (규칙 아님) | `../eddmpython-course/memory/evidence/writingVoice.md` (비공개 형제 저장소, 추적 안 함) |
| 규칙 문서 전체 인덱스 | `../eddmpython-course/memory/MEMORY.md` (비공개 형제 저장소, 추적 안 함) |
| 파일 이름, frontmatter, 카테고리, 검사, 배포 | `skills/specs/operation/blogPublishing.md` |
| 이미지와 영상 계약 | `skills/specs/operation/blogMedia.md` |
| 제목과 summary | `skills/specs/operation/blogCopy.md` |
| 제품 맥락 | `skills/specs/operation/productMarketing.md` |

**이 폴더에 규칙 문서를 새로 만들지 않는다.** 판단과 작법은 `../eddmpython-course/memory/`, 기계가 강제하는 계약은
`skills/specs/` 다. 2026-08-19 에 집필 규칙이 다섯 곳으로 갈라져 서로 어긋난 뒤 정한 규칙이다.

## 이 폴더에 있는 것

| 경로 | 역할 |
|---|---|
| `media/` | 이미지 계획 (`plan.json`) 과 HF 객체 대응 (`catalog.json`) |

| `scripts/` | 미디어 발행과 검사 스크립트 |
| **`content/<NN-카테고리>/`** | **공개 글. 글은 여기에만 있다** |

**목록을 따로 관리하는 파일은 없다.** 발행 순번은 파일 이름의 `NNN`, 카테고리와 그 순서는
폴더 이름, 공개 URL 과 아카이브 여부는 frontmatter 다. 2026-08-24 에 `order.json` 을 없앴고
까닭은 `skills/specs/operation/blogPublishing.md` 에 있다.

`content/` 아래만 글이다. 나머지는 기계다. 검사기가 `content` 만 걷고 나머지는 아예 들어가지
않는다. 새 기계 폴더를 만들어도 검사기를 고칠 필요가 없다.

글 하나가 폴더 하나다. `blog/posts/<NNN-kebab>/` 안에 본문 `index.md`, 이미지 계획 `media.json`, 그 글이 품는 도구 `tool/` 이 함께 있다. 공개 URL 은 frontmatter `slug` 이고
`/blog/{slug}` 한 형태다. 카테고리를 URL 에 넣지 않는다.

## 카테고리 폴더

**블로그는 그때그때 올리는 단편이다.** 제품 소개, 사용법, 그날 쓰고 싶은 글.
연재도 세트도 원장도 요구하지 않는다. **글이 하나도 없는 구간이 정상이다.**

파이썬 업무자동화 커리큘럼은 2026-08-19 에 유료 강의로 옮겼다. 정본은 형제 비공개 저장소
`../eddmpython-course/curriculum/` 이고 **공개하지 않는다.** 블로그로 되돌리지 않는다.

카테고리는 폴더를 만들면 생긴다. 두 자리 번호로 시작하고 그 번호가 순서다.

블로그에는 원장을 두지 않는다. 사이트가 글 파일 원문 전체를 공개 JS 번들로 굽기 때문에 설계
메모도 글 파일에 넣지 않는다. 유료 교안의 합의된 순서와 섹션 사슬만 비공개 형제 저장소
`../eddmpython-course/memory/curriculum/원장.md`에 둔다.
