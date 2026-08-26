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
것을 고르면 된다. 판정 기준은 이 문서의 `눈으로 확인한다` 절이다.
**서로 다른 H2 가 같은 이미지를 다시 쓰는 것은 막는다.**

## 세 파일이 각각 맡는 것

| 무엇 | 어디 | 추적 |
|---|---|---|
| 의미와 출처 계획 | 각 글 폴더의 `blog/posts/<글>/media.json` | Git |
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
있기 때문이다. 블로그는 글 폴더 안에 본문과 계획이 함께 있으므로
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
    "palettePolicy": "eddmpython-gray-master-v1",
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

### 부제가 있는 절이면 이미지는 부제 아래에 붙는다

`role: section` 이미지가 앉는 자리는 그 절에 H3 부제가 있느냐로 갈린다.

| 그 절의 모양 | `sectionSubtitle` | `placement` |
|---|---|---|
| H2 아래 H3 부제가 있다 | 그 H3 원문과 같아야 한다 | `H3 부제 바로 뒤` |
| H2 아래 부제가 없다 | 비운다 | `H2 제목 바로 뒤` |

부제는 15자 이상 80자 이하다. 어느 쪽이든 **이미지는 그 절에서 가장 먼저 오는 것**이어야 하고
`contentAnchor` 는 이미지 **아래**의 문장이어야 한다. `check-blog.mjs` 가 그 절의 본문에서
찾는다.

한때 `publish_media.py` 가 `role: section` 에 부제를 무조건 요구하고 placement 를
`H3 부제 바로 뒤` 하나로 강제했다. 그러면 부제가 필요 없는 절에 부제를 지어내야 이미지를
붙일 수 있다. 전역 `$blog-writing`은 같은 뜻을 되풀이하는 소제목을 지우라고 하므로 두 규칙이
정면으로 부딪혔고, 001 의 절들이 실제로 그 자리에 있었다. 2026-08-26 에 두 스크립트가 같은
판정을 하도록 고쳤다. **부제의 유무는 본문이 정하고 이 계약은 이미지가 앉을 자리만 가른다.**

**본문을 먼저 쓰고 그 뒤에 plan 을 적는다.** 그 절의 서술 문단이 없으면 `contentAnchor` 를
지어내게 된다. `generate_flux.py` 는 이 값들을 자유 장면 프롬프트보다 높은 우선순위로 붙인다.

## 색상 계약

DartLab 카드뉴스에서 가져온 핵심은 이미지에 문장을 구워 넣는 형식이 아니다. **큰 문장은 HTML 과
마크다운이 맡고 이미지는 그 문장이 말하는 의미 장면만 맡는다.** 텍스트를 이미지 밖에 두면
모바일에서도 선명하고, 오탈자를 전체 재생성 없이 고칠 수 있으며, 검색과 접근성 도구가 제목과
캡션을 읽을 수 있다. 세로 카드 비율과 화려한 SNS 장식은 가져오지 않았다.

### 모델은 색을 만들지 않는다

**이미지 모델에게 색을 맡기지 않는다.** 모델은 장면만 만들고 색은 스크립트가 입힌다.
새로 만들거나 교체하는 생성 이미지는 `visualProfile: eddmpython-dark-v2` 와
`palettePolicy: eddmpython-gray-master-v1` 을 쓴다. `dark-editorial-v1` 과
`eddmpython-carbon-ivory-sand-v1` 은 옛 자산을 알아보기 위한 이전 값이며 새 작업에 고르지 않는다.

2026-08-26 까지는 프롬프트에 `sand #d8be91` 을 적어 모델이 강조색을 직접 그렸다. 그래서
강조색이 이미지 바이트 안에 굳었다. 그날 운영자가 골드를 전면 금지하고 강조색을 `#f56565` 로
바꿨을 때 코드의 색은 `design.ts` 한 줄로 따라왔지만 이미 발행한 이미지는 따라오지 못했다.
픽셀은 `check:design` 이 볼 수 없고 다시 만들려면 유료 API 를 그 수만큼 부르면서 모델이 매번
다른 그림을 내놓는다.

그래서 두 단계로 갈랐다.

| 무엇 | 누가 만드나 | 어디에 |
|---|---|---|
| 원본 `<assetKey>.master.png` | `generate_flux.py` 가 모델을 불러 만든다. 무손실 PNG | **발행본과 같이 HF** |
| 발행본 `<assetKey>.webp` | `paint_media.py` 가 원본에 강조색을 입힌다 | 검수 후 HF |

```bash
python -X utf8 blog/scripts/generate_flux.py <post-id>     # 원본
python -X utf8 blog/scripts/paint_media.py <post-id>       # 발행본
python -X utf8 blog/scripts/publish_media.py --asset <id> --reviewed   # 둘 다 올라간다
```

**강조색이 바뀌면 원본은 그대로 두고 `paint_media.py` 만 다시 돌린다.** 모델을 다시 부르지
않으므로 비용이 들지 않고, 결정적이라 같은 원본에서 언제나 같은 그림이 나온다. 실측으로
확인했다. 같은 원본을 같은 강조색으로 다시 칠하면 sha256 까지 같은 바이트가 나온다.

### 원본도 허깅페이스에 올린다

**원본은 발행본과 같은 무게로 다룬다.** 같은 `objects/sha256/` 공간에 올라가고 자산 레코드가
그것을 가리킨다.

```json
"005-python-history/hero": {
  "post": "005-python-history",
  "assetKey": "hero",
  "sha256": "2d262b...",
  "path": "objects/sha256/2d/2d262b....webp",
  "masterSha256": "7fb240...",
  "masterPath": "objects/sha256/7f/7fb240....png"
}
```

객체 쪽에는 `"role": "master"` 가 붙어 발행본과 구분된다.

2026-08-27 까지는 원본이 로컬 staging 에만 있었다. 발행 스크립트가 발행본만 올리고 원본은
올리지도 지우지도 않았기 때문이다. 그래서 **다시 칠할 유일한 재료가 한 기계에만** 있었고
어느 게이트도 그것을 몰랐다.

발행본에서 휘도를 되뽑아 대신 쓰는 길도 재 봤다. 원본에서 새 색으로 칠한 것과 견주니 픽셀의
68% 가 8/255 넘게 어긋났고 최대 차이가 82/255 였다. 발행본에는 강조색과 밝기 보정이 이미
섞여 있어 재료가 못 된다. 그래서 원본을 보관하는 것 말고 다른 방법이 없다.

**다시 칠하는 기계에 원본이 없는 것이 정상이다.** `paint_media.py` 가 catalog 의
`masterPath` 를 보고 알아서 내려받는다. 그래서 어느 기계에서든 아래 두 줄이면 끝난다.

```bash
python -X utf8 blog/scripts/paint_media.py <post-id>
python -X utf8 blog/scripts/publish_media.py --asset <id> --reviewed
```

`check:blog` 가 `palettePolicy: eddmpython-gray-master-v1` 인 자산에 `masterSha256` 이 없으면
막는다. `--prune-objects` 도 `masterSha256` 을 참조로 세므로 원본을 지우지 않는다.

### 유일본을 감시 없이 두지 않는다

원본을 허깅페이스로 옮기면 **그곳이 유일본**이 된다. 감시가 없으면 옮긴 의미가 없다.
사라진 것을 다시 칠하려 할 때 알게 되고, 그때는 몇 년 뒤일 수 있다.

`--verify` 가 그 감시다. HF 트리 API 를 한 번 불러 파일 목록과 LFS oid 를 받는다. oid 가 그
파일 내용의 sha256 이고 우리 객체 주소가 바로 그 값이라, **바이트를 하나도 안 받고 콘텐츠 주소
계약 자체를 검증한다.** 인증도 `huggingface-hub` 도 필요 없다. 실측으로 객체 295개를 요청 1회,
0.4초에 확인한다.

```bash
python -X utf8 blog/scripts/publish_media.py --verify
```

존재만 보지 않는다. 네 가지를 나눠 잡고 각각 다른 말로 알린다.

| 무엇 | 뜻 |
|---|---|
| 없음 | 그 바이트가 원격에서 사라졌다 |
| 내용이 다름 | 같은 주소에 다른 파일이 있다. 콘텐츠 주소 계약이 깨졌다 |
| 해시 확인 못 함 | 파일은 있는데 내용을 대조할 수 없다. 통과로 세지 않는다 |
| 크기가 다름 | catalog 의 `bytes` 와 어긋난다 |

`.github/workflows/media.yml` 이 매일 돌리고 어긋나면 `media-integrity` 라벨로 이슈를 연다.
이미 열린 것이 있으면 새로 열지 않고 댓글로 잇는다. 매일 새 이슈를 열면 알림이 무뎌진다.

**원본이 섞여 있으면 그 이미지는 다시 만들 수 없다.** 그래서 보고가 원본과 발행본을 나눠 센다.

경로와 파일 이름 규칙의 정본은 `blog/scripts/media_paths.py` 다. `generate_flux.py`,
`paint_media.py`, `publish_media.py` 와 `site/scripts/workspace-contract.mjs` 가 전부 거기서
읽는다. 한때 `MASTER_SUFFIX` 가 네 곳에, 스테이징 경로가 다섯 곳에 각각 적혀 있었다.

원본을 받아 오는 쪽도 대조한다. `paint_media.py` 는 내려받은 바이트와 이미 있는 로컬 파일 모두
`masterSha256` 과 견주고, 다르면 다시 받거나 죽는다. 잘린 파일이 유일본 자리를 조용히 차지하는
것을 막는다. 부정 대조는 `blog/scripts/test_media_safety.py` 에 있다.

### 어디에 무슨 색이 앉나

`paint_media.py` 가 `site/src/design.ts` 의 `DESIGN.palette` 를 실행 시점에 읽는다.
**색 값을 이 문서에도 그 스크립트에도 적어 두지 않는다.** 정본은 `design.ts` 하나다.

- **원본의 색은 무조건 버린다.** 발행본은 원본의 휘도만 쓴다. 모델이 회색 지시를 안 지켜도
  결과가 같다. 실제로 한 번에 만든 열두 장 가운데 넷이 채도 0.2 초과 픽셀 22~71% 로 나왔다
- **밝기는 원본에 맡기지 않는다.** 원본의 중앙값을 어두운 목표값으로 옮기는 감마를 매번 구해
  씌운다. 모델이 흰 배경으로 그려도 발행본은 어두운 판이 된다
- **강조는 가장 밝은 쪽부터 정해진 비율만큼만 앉는다.** 고정한 휘도가 아니라 백분위다.
  고정값을 쓰면 원본이 밝을수록 강조가 넓어져 같은 규칙에서 결과가 열 배 달라진다
- 그림자에서 밝은 면으로 가는 무채색 경사는 `carbon` 에서 `ivory` 로 간다
- 강조색은 배경보다 밝아야 한다. 이 방식은 밝은 구간을 강조색 쪽으로 당기므로 어두운 강조색은
  빛을 지운다. 스크립트가 대비를 재서 막는다

### 스크립트가 막는 것

- 강조가 앉은 자리를 감싸는 사각형이 화면의 12% 를 넘으면 실패한다. 강조 하나가 아니라
  흩뿌린 반짝임이라는 뜻이다. 이 값은 열두 장을 눈으로 갈라 놓고 잰 뒤 정했다. 쓸 만한 넉
  장이 0.2~6.6%, 버린 여덟 장이 14.5~45.4% 였고 그 사이가 비어 있었다
- 강조색이 배경보다 충분히 밝지 않으면 실패한다

**게이트가 통과시켜도 실물을 본다.** 면적과 퍼짐은 잴 수 있지만 강조가 의미 있는 자리에
앉았는지는 눈으로만 판정된다.

### 장면에 요구하는 것

- 본문 폭에 맞는 3:2 가로형을 기본으로 한다
- 글자, 숫자, 코드, 로고, 가짜 제품 화면을 이미지 바이트에 넣지 않는다.
  **금지는 프롬프트에 한 번만 적으면 모델이 흘린다.** `generate_flux.py` 가 사람, 화면, 글자
  금지를 마지막에 한 번 더 적는 이유다
- 장면 프롬프트 자체가 화면이나 코드를 그리라고 하면 뒤의 금지가 이기지 못한다.
  **프롬프트에 화면과 글자를 등장시키지 않는다**
- 성공, 실패, 선택, 경로는 색을 늘리지 않고 모양, 선 굵기, 명암, 위치 차이로 구분한다
- 평면 인포그래픽과 장식 배경 대신 공간, 물성, 전후 차이, 작동 경로가 보이는 한 장면을 만든다
- 같은 구도와 소품을 반복하지 않고 그 H2 의 주장 하나만 시각화한다

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
5. **회색 원본이 옆에 있으면 같은 방식으로 올리고 다시 확인한다**
6. catalog 에 바이트 수, MIME, 너비, 높이를 기록하고, 원본이 있으면 `masterSha256` 과
   `masterPath` 를 자산에 적는다. 본문의 `media://` 를 Hugging Face URL 로 바꾼다
7. 성공한 로컬 작업본과 원본과 빈 staging 폴더를 삭제한다

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
