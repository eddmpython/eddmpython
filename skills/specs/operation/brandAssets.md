---
id: operation.brandAssets
title: 브랜드 자산
category: operation
purpose: 심볼 정본이 어디에 있고 파비콘과 og 이미지가 어떻게 만들어지는지, 작은 크기에서 무엇을 고치면 안 되는지 정한다.
whenToUse:
  - 로고 바꾸기
  - 파비콘이 안 바뀐다
  - og 이미지 다시 만들기
  - 심볼 색
  - 16px 에서 안 보인다
verify:
  - cd site && npm run build
  - curl -s https://eddmpython.com/favicon.svg | head -c 200
status: observed
---

# 브랜드 자산

## 로고와 디자인 정본을 나눈다

`site/src/brand.ts`는 심볼 좌표의 정본이고 `site/src/design.ts`는 색, 테마, 글꼴, 모서리,
공용 글자 위계의 정본이다. **다른 곳에 좌표, 색상값, 공용 수치를 다시 정하지 않는다.**

| 쓰는 곳 | 어떻게 |
|---|---|
| 랜딩 헤더와 푸터 | `components/Logo.tsx` 가 `SYMBOL` 을 읽는다 |
| `favicon.svg` | `vite.config.ts` 의 `brandAssets` 플러그인이 `faviconSvg()` 로 만든다 |
| `og.png` | `npm run og` 가 같은 좌표로 그린다 |

공개 블로그와 강의장의 섹션 제목은 `DESIGN.typography.sectionTitle` 하나를 쓴다. 모바일과
데스크톱 크기, 행간, 굵기, 자간을 그 객체에서 정하고 두 렌더러는 CSS 변수로 소비한다.
Tailwind 진입점 `src/styles.css`는 값 없이 `--eddm-*` 의미 변수만 연결하고, React와 Worker는
`designCssVars()`가 만든 같은 변수를 받는다. `npm run check:design`이 값 복제와 두 렌더러의
실제 소비를 함께 검사한다.

강조색은 `DESIGN.accent.dark`와 `DESIGN.accent.light`가 정본이다. 버튼, 링크,
선택 상태와 강의 진행선은 `--eddm-accent`와 그 파생 변수만 소비한다. 강조색을 바꿀 때 화면별
CSS를 찾지 않는다. 로고 점의 `DESIGN.palette.dot`은 강조색과 별개다.

`public/favicon.svg` 를 두지 않는다. 사본을 두면 랜딩 마크를 고칠 때 파비콘만 옛 형태로
남는다. dev 는 미들웨어로, build 는 dist 파일로 같은 문자열을 낸다.

제품 마크(DartLab·Codaro 아바타, xlpod·pyproc 마크)는 `site/public/brand/` 에 두고
`src/productMarks.ts` 가 가리킨다. 제품 사이트 공개 brand URL에서 가져온 것이며, 제품
소스를 복제한 것이 아니다.

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

## 심볼

소문자 `e` 다. 원에서 오른쪽 위를 가로획으로 끊고 아래를 오른쪽으로 뻗었다.

- 획이 하나의 채움 경로다. 안쪽 구멍은 `evenodd` 로 뚫린다
- 오른쪽 아래의 점만 별도 요소다. 심볼에서 유일하게 색이 고정된 부분이다
- 잉크 경계가 viewBox 에 꼭 맞는다. 여백은 쓰는 쪽이 정한다
- 가로세로 1.18 이다. 점이 오른쪽으로 나오는 만큼 `e` 자체는 정사각에 가깝다

**2026-08-26 에 매듭 뱀에서 이 형태로 바꿨다.** 운영자가 정본 이미지를 주었고 그것을
벡터로 옮겼다. 그 전 심볼의 눈과 모래빛은 이제 없다.

## 심볼의 점과 강조색은 같은 값이다

`DESIGN.palette.brand` 가 정본이고 값은 `#f56565` 다. **저장소의 모든 강조가 이 한 값에서
갈라진다.** 로고 심볼의 점, 워드마크의 `.py`, 버튼, 링크, 선택 상태, 강의 진행선이 전부
여기서 나온다. 강조색을 바꾸려면 그 한 줄만 고친다.

라이트 테마는 `PALETTE.brandDeep`(`#c53030`) 을 쓴다. 브랜드 색은 다크 배경에서 6.08:1 로
잘 읽히지만 라이트 배경에서는 2.73:1 이라 글자와 선으로 쓸 수 없다. 같은 색조를 유지하면서
4.93:1 까지 올린 값이고 두 값 다 실제로 재서 정했다.

정적 SVG(파비콘, og)는 CSS 변수를 못 읽으므로 `BRAND` 를 통해 원값을 읽는다. 그 밖의 화면은
`--eddm-accent` 와 파생 변수를 쓴다. `npm run check:design` 이 브랜드 색을 화면 파일에
직접 적은 자리와 골드를 함께 막는다.

## 워드마크는 `eddm.py` 다

로고 락업의 글자는 `eddm.py` 이고 `.py` 가 점 색을 쓴다. **문서 본문과 도메인에서 부르는
이름은 `eddmpython` 그대로다.** 워드마크만 짧은 표기를 쓰는 것이고 본문의 브랜드 이름을
이 표기로 바꾸지 않는다.

## 작은 크기에서 획을 깎지 않는다

16px 파비콘까지 렌더해서 확인했다. 가로획의 통로가 좁아지지만 `e` 로 읽히고 점도 2~3px 로
남아 색 점 하나로 보인다. 통로를 벌리려고 획을 얇게 깎지 않는다.

앞 심볼에서 얻은 결론을 그대로 둔다. 작은 크기에서는 통로 분리보다 덩어리감이 이긴다.
침식해서 통로를 벌린 판을 7 배로 확대해 비교했더니 16px 에서 더 나빴다. 통로는 열리는데
획이 얇아져 마크가 힘을 잃는다. 수치가 가리킨 방향과 눈이 가리킨 방향이 달랐고 눈을 따랐다.

## 파비콘 여백

칩 안에서 12% 여백을 둔다. iOS 스퀘어클과 Android 원형 마스크 양쪽에서 잘리지 않는 값으로
실제 렌더해서 정했다. 0% 는 잘린다.

파비콘은 `currentColor` 를 쓸 수 없다. 문서 문맥 밖에서 렌더되어 상속받을 색이 없고
브라우저가 검정으로 처리한다. 그래서 칩 배경과 심볼 색을 명시한다.

## 심볼을 바꿀 때

1. `site/src/brand.ts` 의 `SYMBOL` 만 고친다
2. `npm run build` 로 파비콘이 함께 갱신되는지 확인한다
3. `npm run og` 로 og 이미지를 다시 만든다
4. 16, 24, 32, 48px 로 실제 렌더해서 눈으로 본다. 수치만 보고 정하지 않는다
