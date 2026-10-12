---
id: operation.brandAssets
title: 브랜드 자산
category: operation
purpose: 확정한 심볼과 EDDM 워드마크의 정본, 웹과 앱 아이콘, OG 이미지의 소비 계약을 정한다.
whenToUse:
  - 로고 바꾸기
  - 파비콘이 안 바뀐다
  - 브랜드 자산 내려받기
  - og 이미지 다시 만들기
  - 심볼 색
  - 16px 에서 안 보인다
verify:
  - cd site && npm run build
  - cd site && npm run verify:visual -- --route=brand
  - curl -s https://eddmpython.com/favicon.svg | head -c 200
  - curl -s https://eddmpython.com/brand/mark-dark.svg | head -c 200
status: observed
---

# 브랜드 자산

## 심볼과 디자인 정본

`site/src/brand.ts`가 심볼과 워드마크, 로고 조합의 정본이고 `site/src/design.ts`가 색, 테마, 글꼴, 모서리,
공용 글자 위계의 정본이다. 다른 곳에 좌표와 색상값을 다시 정하지 않는다.

2026-10-12에 승인된 심볼은 두 개의 채움 경로다. `SYMBOL.parts`가 각 경로의 `d`와
선택적 `transform`을 보존한다. 두 번째 경로의 `translate(18 -18)`과
`viewBox="-22 -28 222 222"`도 승인된 형태의 일부다. `width`와 `height`는 모두 222다.
두 도형은 한 색으로 쓰며 따로 움직이거나 크기를 바꾸지 않는다. 이전 나선과 점은 사용하지 않는다.

`symbolMarkup({ ink })` 하나가 두 경로를 출력한다. SVG 소비자가 경로를 따로 조립하거나
원을 더하지 않는다. 기본값은 `currentColor`이고, 정적 자산은 `symbolSvg({ ink })`로
색이 명시된 SVG를 만든다.

같은 날 승인된 대문자 `EDDM`은 `WORDMARK.parts`의 네 경로다. `width: 371.586`,
`height: 100`, `viewBox="0 0 371.586 100"`을 보존하고 `wordmarkMarkup({ ink })`와
`wordmarkSvg({ ink })`로 출력한다. 글자를 다시 입력하거나 글꼴을 로드해 대체하지 않는다.

가로 로고는 `LOGO`가 소유한다. 심볼 108, 글자 높이 72, 간격 14이고
`viewBox="0 0 389.54192 108"` 안에서 글자는 `translate(122 18) scale(.72)`로 놓인다.
`logoMarkup({ ink })`가 두 요소를 조합하고 `logoSvg({ ink })`가 독립 SVG를 만든다.
화면별로 심볼과 글자 간격을 다시 정하지 않는다. 헤더는 전체 높이 32px로 축소한다.
심볼은 그대로 유지하며 이전 `eddm.py` 표기와 미승인 세로 조합은 사용하지 않는다.

| 쓰는 곳 | 소비 계약 |
|---|---|
| 랜딩 헤더와 푸터 | `components/Logo.tsx`가 `logoMarkup()`을 읽는다 |
| 운영장과 강의방 머리띠 | `shell.ts`가 `logoMarkup()`을 부른다 |
| 강의 모드 바 | `classroom.ts`가 `symbolMarkup()`과 `wordmarkMarkup()`을 부른다 |
| `favicon.svg`와 `/brand/*.svg` | `vite.config.ts`의 `brandAssets` 플러그인이 `BRAND_ASSETS`를 읽는다 |
| `og.png` | `scripts/og.mjs`가 같은 심볼과 워드마크 마크업을 렌더한다 |
| `/brand` 화면 | `pages/Brand.tsx`가 같은 마크업과 파일 목록을 읽는다 |
| 강의 스튜디오 | 비공개 강의 저장소가 공개 모듈의 `logoSvg()`와 `symbolSvg()`를 읽는다 |
| Windows 강의장과 스튜디오 아이콘 | 비공개 설치 스크립트가 `SYMBOL.parts`와 `ICON_TILE`, `ICON_FINISHES.dark`를 읽는다 |

제품 마크는 `src/productMarks.ts`가 가리키는 별도 자산이다. EDDM 심볼을 바꿀 때
DartLab, Codaro, xlpod, pyproc, 돈값 등 제품의 로고를 바꾸지 않는다.

## 색과 앱 아이콘

심볼과 워드마크는 같은 단색을 쓴다. `BRAND.accent`는 `DESIGN.palette.brand`를 읽으며
강조색 칩에 사용한다. 버튼, 링크, 선택 상태와 강의 진행선은
`--eddm-accent`와 파생 변수를 소비한다. 화면 파일에 색상값을 다시 적지 않는다.

정적 SVG는 CSS 변수를 상속받을 수 없으므로 `BRAND`를 통해 색상값을 읽는다.
파비콘 역시 배경과 심볼 색을 명시한다. `ICON_FINISHES`가 네 가지 마감의 정본이다.

| 마감 | 칩 | 심볼 전체 | 쓰는 자리 |
|---|---|---|---|
| `light` | paper | carbon | 밝은 독과 밝은 문서 위 |
| `dark` | carbon | ivory | 기본값, 파비콘 |
| `brand` | brand | paper | 강조색 칩 |
| `outline` | carbon | ivory | 어두운 바탕에서 테두리로 칩을 구분 |

강조색 칩은 두 도형을 함께 밝게 반전한다. 심볼의 일부만 강조색으로 칠하지 않는다.

`ICON_TILE`이 칩 크기, 모서리, 테두리와 심볼 배치를 소유한다. 심볼의 viewBox를 칩 한 변의
12%만큼 들인 상자에 맞추고 음수 원점을 보정한다. `x`, `y`는 이 보정이 들어간 이동값이며
SVG 소비자는 `transform`을 그대로 쓴다. Windows는 같은 `x`, `y`, `scale`을 적용한 뒤
각 `parts`의 변환을 개별 적용한다. 앞 경로의 변환을 다음 경로에 누적하지 않는다.

viewBox 안에도 여백이 있으므로 12%는 실제 잉크 경계까지의 여백이 아니다. 승인된 viewBox와
도형 간격을 유지하며 16, 24, 32, 48, 64px 실제 크기를 확인한다. 작은 크기용 도형을 별도로
다시 그리거나 일부를 지우지 않는다.

## 자산 파일

`BRAND_ASSETS`가 내려받을 파일의 정본 목록이다. dev는 미들웨어로 같은 문자열을 내고,
build는 파일로 쓴다. 생성되는 SVG 사본을 `public/`에 따로 보관하지 않는다.

| URL | 자산 |
|---|---|
| `/brand/logo-dark.svg` | 밝은 단색 가로 로고, 어두운 바탕용 |
| `/brand/logo-light.svg` | 어두운 단색 가로 로고, 밝은 바탕용 |
| `/brand/wordmark-dark.svg` | 밝은 단색 EDDM 워드마크, 어두운 바탕용 |
| `/brand/wordmark-light.svg` | 어두운 단색 EDDM 워드마크, 밝은 바탕용 |
| `/brand/mark-dark.svg` | 밝은 단색 심볼, 어두운 바탕용 |
| `/brand/mark-light.svg` | 어두운 단색 심볼, 밝은 바탕용 |
| `/brand/icon-light.svg` | 밝은 칩 |
| `/brand/icon-dark.svg` | 어두운 칩 |
| `/brand/icon-brand.svg` | 강조색 칩 |
| `/brand/icon-outline.svg` | 테두리 칩 |
| `/favicon.svg` | `dark` 마감의 앱 아이콘 |

`/brand`는 같은 파일 목록으로 11개 다운로드 링크를 만들며, 로고와 워드마크, 심볼, 네 가지 칩, 작은 크기를
보여 준다. 브랜드 시트 이미지를 따로 만들어 도형 정본을 복제하지 않는다.

## 워드마크 출처

글자 윤곽선은 [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope)의 가변 글꼴에서
굵기 550, 글자 사이 12 font units로 만든 승인본이다. 원본 파일은 `Manrope[wght].ttf`이며
SHA-256은 `3AE11C49DB0455A3CC33E37D380F20FDB8C7F8B41DC07625C177E3D87A9D6AE6`이다.
배포에 폰트 바이너리는 포함하지 않는다. 저작권과 SIL Open Font License 1.1 원문은
`site/public/brand/manropeLicense.txt`에 보존한다.

## 변경과 확인

1. `brand.ts`에서 승인된 심볼 두 경로와 글자 네 경로, 변환과 viewBox의 동일성을 확인한다
2. React와 Worker가 `logoMarkup()`을, 정적 자산이 `BRAND_ASSETS`를 소비하는지 확인한다
3. `npm run build`로 파비콘과 열 개 브랜드 SVG, TypeScript와 디자인 검사를 확인한다
4. OG 이미지는 `npm run og`로 별도 갱신한다. 일반 빌드는 OG 이미지 바이트를 다시 만들지 않는다
5. 프로젝트가 고정한 공개 pyproc 경로로 `/brand`의 데스크톱과 모바일, 16px 심볼과 아이콘을 렌더해 확인한다
6. README의 심볼 설명을 함께 갱신한다. 제품 로고와 캐릭터 설명은 유지한다
7. 배포 후 실제 자산 URL을 캐시버스터로 확인한다. 랜딩과 별도 classroom Worker의 공용 머리띠를 모두 확인한다
8. Windows 바로가기는 `-iconsOnly`로 실행 중인 스튜디오를 종료하지 않고 갱신할 수 있다. 창 아이콘은 EXE에 포함되므로 종료 후 일반 재설치가 필요하며 단순 재실행만으로 바뀌지 않는다. 서버가 읽는 심볼 모듈은 다음 정상 재시작 때 반영된다

색, 공용 글꼴과 제목 위계는 계속 `DESIGN`이 소유한다. `npm run check:design`이 색상값 복제와
공용 토큰 사용을 검사한다. 전체 배포 절차와 개발 산출물 경계는 해당 운영 문서를 따른다.

## 으뜸이 캐릭터

으뜸이는 eddmpython의 SNS 아바타에 쓰는 분홍 뱀 캐릭터다. 브랜드 심볼을 캐릭터로 다시
그린 것이 아니라 사람 으뜸이를 캐릭터화한 별도 자산이다. 심볼을 대신하지 않으며 헤더,
파비콘, 제품 마크에는 쓰지 않는다.

| 파일 | 포즈 | 연결 채널 |
|---|---|---|
| `site/public/brand/euddeum-avatar.webp` | EDDM Python 이름표를 든 원본 아바타 | SNS 공통 |
| `site/public/brand/euddeum-wave.webp` | 꼬리로 인사 | Threads |
| `site/public/brand/euddeum-analyze.webp` | 돋보기로 데이터 분석 | YouTube |
| `site/public/brand/euddeum-build.webp` | 노트북으로 제품 만들기 | GitHub |

2026-08-14에 공개 GitHub 프로필 아바타를 정체성 기준으로 삼아 ImageGen으로 생성했다.
분홍색은 이 캐릭터 이미지 픽셀 안에서만 허용한다. UI 배경, 테두리, 글자, 강조색과
`--eddm-*` 토큰에는 확장하지 않는다.
