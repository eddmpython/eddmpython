---
id: operation.blogMedia
title: 블로그 이미지와 영상
category: operation
purpose: 글에 붙는 이미지와 영상의 의미 계약, 색상 계약, Hugging Face 발행 순서를 정한다.
whenToUse:
  - 글에 이미지 넣기
  - plan.json 필드
  - 이미지 색상
  - og 이미지
  - Hugging Face 업로드
  - 이미지가 Git 에 들어갔다
  - 본문에 영상 넣기
verify:
  - cd site && npm run verify:media
  - cd site && npm run check:blog
status: observed
---

# 블로그 이미지와 영상

이미지는 글을 꾸미려고 넣지 않는다. **설명만으로 공간, 장면, 물성, 전후 차이를 따라가기
어려울 때** 쓴다. 각 이미지는 어느 문단 뒤에서 무엇을 이해시키는지 먼저 정한다.

**절마다 생성 이미지를 요구하지 않는다.** 그 규칙이 발행 40편 전부에서 H2 수와 이미지 수를
1 대 1 로 묶었고, 이미지 제작 비용이 절 개수의 상한까지 정하고 있었다.

다만 절마다 **시각물**은 있어야 한다. 영상, 실제 화면, 실행 칸도 시각물이므로 그 절에 맞는
것을 고르면 된다. 판정 기준은 `../eddmpython-course/memory/blogWriter.md` 의 `시각물` 절이다.
**서로 다른 H2 가 같은 이미지를 다시 쓰는 것은 막는다.**

## 세 파일이 각각 맡는 것

| 무엇 | 어디 | 추적 |
|---|---|---|
| 의미와 출처 계획 | `blog/media/plan.json` | Git |
| 교안의 의미와 출처 계획 | `../eddmpython-course/curriculum/<카테고리>/plan.json` | 형제 비공개 저장소 |
| 글과 원격 객체의 대응 | `blog/media/catalog.json` | Git |
| 실제 바이트 | Hugging Face `eddmpython/eddmpython-media` | 원격만 |

### plan 을 둘로 나눈 이유

`plan.json` 은 자산마다 `sectionHeading` 과 `contentAnchor` 를 들고 있고 그 둘은 본문 문장
그대로다. `contentAnchor` 는 `check:post` 가 본문에 실제로 있는 문장인지 대조하는 필드라서
정의상 본문에서 복사한 것이다.

교안은 유료 자료이므로 그 문장이 공개 저장소에 올라가면 안 된다. 그래서 **plan 만 갈랐다.**
이미지 바이트와 `catalog.json` 은 블로그와 그대로 공유한다. catalog 에는 `alt` 와
`visualSubject` 와 `sourcePost` 만 들어가고 그것은 이미지 설명이다.

```bash
python -X utf8 blog/scripts/generate_flux.py <post-id> --plan ../eddmpython-course/curriculum/01-automation-start/plan.json
python -X utf8 blog/scripts/publish_media.py --asset <post-id>/<key> --plan ../eddmpython-course/curriculum/01-automation-start/plan.json --reviewed
```

**`--plan` 을 주면 글 파일을 그 plan 이 있는 폴더 아래에서 찾는다.** 교안 글이 plan 옆에
있기 때문이다. 블로그는 plan 이 `blog/media/` 이고 글이 `blog/content/` 라 배치가 다르므로
블로그 자산에는 `--plan` 을 주지 않는다. 주면 글을 못 찾는다.

**바이트는 저장소에 커밋하지 않는다.** SVG 를 포함해 `blog/` 아래에 이미지 파일을 두지 않는다.
`check:blog` 가 막는다. 작업본은 저장소 밖에 둔다.

```text
../eddmpython.out/blog-media/<post id>/<assetKey>.webp
```

PNG, JPG, GIF 도 지원하지만 새 래스터는 용량과 품질을 확인한 WebP 를 먼저 고른다.

## plan.json 계약

**최상위에 `version` 과 `promptContract` 가 있고 자산은 `assets` 아래에 들어간다.**
`check-blog.mjs` 와 `publish_media.py` 가 둘 다 이 래퍼를 요구한다.

asset id 는 `<post id>/<영문 kebab 키>` 이고 post id 는 `NNN-kebab` 파일 stem 이다.
`publish_media.py` 의 `ASSET_ID_RE` 가 `\d{3}-kebab/kebab` 만 받는다. 날짜형 이름은 거부된다.

```json
{
  "version": 2,
  "promptContract": "section-grounded-v2",
  "assets": {
    "004-python-basic-syntax/variables-values": {
      "post": "004-python-basic-syntax",
      "assetKey": "variables-values",
    "role": "section",
    "sectionHeading": "이 이미지가 바로 뒤따르는 H2 원문",
    "sectionSubtitle": "본문 H3와 같은 한 줄 부제",
    "contentAnchor": "이미지가 설명할 본문의 실제 문장",
    "visualSubject": "화면, 파일, 코드, 명령, 결과처럼 눈으로 확인할 대상",
    "visualRelationship": "대상의 전후, 원인과 결과, 순서",
    "visualProfile": "eddmpython-dark-v2",
    "palettePolicy": "eddmpython-carbon-ivory-sand-v1",
    "alt": "이미지를 보지 못해도 내용을 이해할 수 있는 설명",
    "placement": "H3 부제 바로 뒤",
    "narrativeUse": "독자가 글의 문제 장면을 한눈에 이해한다",
    "sourcePolicy": "auto",
    "sourceKind": "imagegen",
      "prompt": "구도, 재질, 조명처럼 의미를 바꾸지 않는 장면 지시"
    }
  }
}
```

`role` 은 공유 대표 이미지 `hero`, 각 H2 의 첫 이미지 `section`, 추가 설명 이미지 `support`
중 하나다. 대표 이미지가 특정 H2 의 의미 장면과 맞으면 `section` 이미지 하나를 og 에도 함께
써도 된다.

`check:post` 가 대조하는 것이 셋이다.

- `sectionHeading` 이 본문 H2 원문과 **정확히** 같은가
- 부제를 쓴 절이면 `sectionSubtitle` 이 H3 원문과 같은가
- `contentAnchor` 가 그 절의 설명에 **실제로 있는 문장**인가

### `role: section` 은 부제를 요구한다

`check-blog.mjs` 와 `publish_media.py` 가 다르다. **엄격한 쪽은 발행 스크립트다.**

| 무엇 | `check-blog.mjs` | `publish_media.py` |
|---|---|---|
| `sectionSubtitle` | 선택 | **필수** (필드가 비면 발행 실패) |
| `placement` | `H3 부제 바로 뒤` 와 `H2 제목 바로 뒤` 둘 다 허용 | `role: section` 이면 **반드시** `H3 부제 바로 뒤` |

따라서 **본문 이미지를 붙일 절에는 H3 부제를 쓴다.** 부제 없이 `section` 이미지를 계획하면
`npm test` 는 통과하고 발행 단계에서 막힌다. 부제는 15자 이상 80자 이하다.
부제를 안 쓸 절이라면 이미지 대신 영상이나 실행 칸을 시각물로 쓴다.

**본문을 먼저 쓰고 그 뒤에 plan 을 적는다.** 그 절의 서술 문단이 없으면 `contentAnchor` 를
지어내게 된다. `generate_flux.py` 는 이 값들을 자유 장면 프롬프트보다 높은 우선순위로 붙인다.

## 색상 계약

DartLab 카드뉴스에서 가져온 핵심은 이미지에 문장을 구워 넣는 형식이 아니다. **큰 문장은 HTML 과
마크다운이 맡고 이미지는 그 문장이 말하는 의미 장면만 맡는다.** 텍스트를 이미지 밖에 두면
모바일에서도 선명하고, 오탈자를 전체 재생성 없이 고칠 수 있으며, 검색과 접근성 도구가 제목과
캡션을 읽을 수 있다. 세로 카드 비율과 화려한 SNS 장식은 가져오지 않았다.

새로 만들거나 교체하는 생성 이미지는 `visualProfile: eddmpython-dark-v2` 와
`palettePolicy: eddmpython-carbon-ivory-sand-v1` 을 쓴다. `dark-editorial-v1` 은 기존 자산을
찾기 위한 이전 값이며 새 작업에 고르지 않는다.

- 본문 폭에 맞는 3:2 가로형을 기본으로 하고 ImageGen 은 1536 x 1024 를 먼저 쓴다
- 배경과 가장 큰 면은 carbon `#101514`
- 주요 피사체와 밝은 면은 ivory `#f5f3ee`
- 강조색은 sand `#d8be91` 하나만 작은 면적에
- 나머지는 검정, 흑연, 웜그레이처럼 채도가 거의 없는 중성색만
- 파랑, 청록, 초록, 보라, 분홍, 빨강, 금색, 네온은 **성공과 실패 표시에도** 쓰지 않는다
- 성공, 실패, 선택, 경로는 색을 늘리지 않고 모양, 선 굵기, 명암, 위치 차이로 구분한다
- 글자, 숫자, 코드, 로고, 가짜 제품 화면을 이미지 바이트에 넣지 않는다
- 평면 인포그래픽과 장식 배경 대신 공간, 물성, 전후 차이, 작동 경로가 보이는 한 장면을 만든다
- 같은 구도와 소품을 반복하지 않고 그 H2 의 주장 하나만 시각화한다
- 프롬프트의 자유 장면 지시가 색상 계약과 충돌하면 **색상 계약이 이긴다**

## 무엇으로 만드나

| 대상 | `sourceKind` | `visualProfile` | 함께 적을 것 |
|---|---|---|---|
| 개념 장면, 전후 차이, 사진이 없는 설명 | `imagegen` | `eddmpython-dark-v2` | 위 색상 계약 |
| 실제 제품 화면 | `screenshot` | `product-screen-v1` | `sourceUrl`, `captureState` |
| 화면 녹화 | `recording` | `source-original-v1` | `captureState`, `credit` |
| 인물, 행사, 장소 | `official` 또는 `licensed` | `source-original-v1` | `sourceUrl`, `credit`, `license` |

**제품 화면, 코드 내용, 실제 문서 모양이 중요하면 생성 이미지로 흉내 내지 않는다.** 확인된
화면이나 공식 자료를 쓴다. 실제 화면은 기능을 사실대로 보여 주기 위해 원래 색을 보존하며 생성
이미지 팔레트로 다시 칠하지 않는다.

녹화 작업본은 저장소 밖 staging 의 `.mp4` 이며 Git 에 넣지 않는다. 본문에는 이미지와 같은
`![대체 텍스트](media://asset-key "캡션")` 자리를 쓰고 사이트가 재생 컨트롤이 있는 영상으로
렌더한다. **로그인, 비밀번호, 신청자 이름, 주민번호가 보이는 녹화는 올리지 않는다.**
영상은 og 이미지로 쓰지 않는다.

## 눈으로 확인한다

생성본은 대체 텍스트가 아니라 **실제 픽셀을 본다.**

- `visualSubject` 가 보이는가
- `visualRelationship` 을 캡션 없이도 읽을 수 있는가
- 다른 H2 이미지와 바꿨을 때 바로 어색한가

공방, 길, 문, 기계 같은 범용 비유가 본문의 실제 파일, 화면, 결과를 밀어내면 다시 만든다.
피사체 오매치, 가짜 공식 로고, 식별 인물 왜곡이 있으면 교체한다.
**통과한 파일만 `--reviewed` 로 발행한다.**

## Hugging Face 발행

본문에는 먼저 자리표시자를 둔다. 같은 이미지를 공유 카드에도 쓰려면 frontmatter 에
`ogImage: media://hero` 를 추가한다. 업로더가 plan 의 대체 텍스트와 실제 너비, 높이, MIME 을
frontmatter 에 함께 기록한다.

```markdown
![대체 텍스트](media://hero "독자에게 보이는 선택 캡션")
```

발행 전 준비는 한 번만 한다.

```bash
python -m pip install -r blog/requirements.txt
```

데이터셋을 처음 만들 때만 `--create-repo` 를 붙이고 이후에는 뺀다.

```bash
python -X utf8 blog/scripts/publish_media.py --asset 20260808-example/hero --reviewed
```

스크립트는 이 순서를 바꾸지 않는다.

1. plan 과 저장소 밖 작업본을 검증한다
2. 파일 바이트의 SHA-256 을 계산한다
3. `objects/sha256/<앞 두 글자>/<전체 해시>.<확장자>` 에 올린다
4. 원격 객체가 실제로 존재하는지 다시 확인한다
5. catalog 에 바이트 수, MIME, 너비, 높이를 기록하고 본문의 `media://` 를 Hugging Face URL 로 바꾼다
6. 성공한 로컬 작업본과 빈 staging 폴더를 삭제한다

**참조가 끊긴 객체를 자동으로 지우지 않는다.** 글을 갈아엎어도 이미지는 남는다.

**업로드나 원격 확인이 실패하면 본문과 catalog 를 바꾸지 않는다.** 원격 검증 전에 공개 참조를
바꾸지 않고, catalog 갱신 전에 로컬 원본을 지우지 않는다.

## 보존하고 찾아 쓰고 나중에 지운다

**`catalog.objects` 는 지금 글이 안 쓰는 이미지도 그대로 들고 있는다.** 2026-08-19 까지는
`publish_media.py` 가 발행할 때마다 참조 없는 객체를 조건 없이 지웠다. 그 시점에 참조 없는
객체가 260개였고 한 번만 발행하면 전부 사라질 참이었다. 004 가 옛 글 이미지 여덟 장을 다시 쓸
수 있었던 것이 이 색인 덕분이라 자동 삭제를 없앴다.

객체 레코드는 자기 설명을 함께 가진다. `alt`, `visualSubject`, `sourcePost` 다. 글이 사라져도
무엇이 그려진 이미지인지 남는다.

```bash
python -X utf8 blog/scripts/publish_media.py --find 전표      다시 쓸 이미지를 설명으로 찾는다
python -X utf8 blog/scripts/publish_media.py --prune-objects  참조 없는 것을 보여만 준다
python -X utf8 blog/scripts/publish_media.py --prune-objects --apply   실제로 정리한다
```

`--find` 는 지금 쓰는 것과 안 쓰는 것을 함께 보여 준다. 찾은 객체를 다시 쓰려면 새 글의
`plan.json` 에 항목을 만들고 같은 `sha256` 을 catalog 에 이어 준다.

**`--prune-objects` 는 교안 참조를 함께 센다.** 교안 plan 은 공개 catalog 의 `assets` 에
등록되지 않으므로 catalog 만 보면 교안이 쓰는 객체가 전부 참조 없음으로 보인다.
2026-08-19 에 실제로 279개 전부가 삭제 대상으로 잡혔다. `course_referenced_sha()` 가
교안 plan 의 `inventory` 와 `assets`, 그리고 교안 본문의 sha 를 모아 그것을 막는다.

`--prune-objects` 는 **catalog 레코드만** 지운다. Hugging Face 의 실제 바이트는 그대로 남으므로
이미 배포된 글의 이미지가 깨지지 않는다. 원격까지 지우는 것은 되돌릴 수 없으니 따로 한다.

발행 스크립트는 이미 설정된 셸 환경변수를 먼저 쓰고, 없으면 eddmpython 루트 `.env`,
형제 DartLab `.env` 순서로 읽는다. **`HF_TOKEN` 은 이 로컬 저장소에만 두고 Git, 문서, 로그에
값을 남기지 않는다.** 경계는 [secrets.md](secrets.md) 다.

## 확인과 롤백

```bash
cd site && npm run verify:media
```

원격에 실제로 있는지 본다. 배포 뒤에는 캐시버스터를 붙인 글 URL 에서 H2별 이미지와
`og:image`, `twitter:image` 가 plan 과 catalog 의 기대값과 같은지 대조한다.

롤백은 본문의 이미지 주소와 `catalog.json` 을 이전 커밋으로 되돌린 뒤 다시 배포한다.
Hugging Face 객체는 콘텐츠 주소라 지우지 않아도 되고, 지우면 옛 배포가 깨진다.
