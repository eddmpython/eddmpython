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

## 정본은 한 파일이다

`site/src/brand.ts` 가 심볼 좌표와 색의 정본이다. **다른 곳에 좌표를 다시 적지 않는다.**

| 쓰는 곳 | 어떻게 |
|---|---|
| 랜딩 헤더와 푸터 | `components/Logo.tsx` 가 `SYMBOL` 을 읽는다 |
| `favicon.svg` | `vite.config.ts` 의 `brandAssets` 플러그인이 `faviconSvg()` 로 만든다 |
| `og.png` | `npm run og` 가 같은 좌표로 그린다 |

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

매듭을 이루며 스스로를 무는 뱀이다. Python 과 반복을 한 형태로 잡는다.

- 몸통, 머리, 혀가 하나의 채움 경로다. 겹치는 구간은 `evenodd` 로 뚫린다
- 눈만 별도 요소다. 심볼에서 유일하게 색이 고정된 부분이다
- 잉크 경계가 viewBox 에 꼭 맞는다. 여백은 쓰는 쪽이 정한다
- 가로세로 1.13 으로 정사각에 가깝다. 앱 아이콘 마스크에 그대로 들어간다

## 심볼 눈은 모래빛이다

심볼과 UI에는 핑크 계열을 쓰지 않는다. 실측으로 **48px 아래에서는 눈이 보이지 않으므로**
작은 크기의 판독에는 영향이 없고, 큰 크기에서만 브랜드 색으로 읽힌다.

## 작은 크기에서 획을 깎지 않는다

실측 결과다. 이유를 남기는 것은 **다음 사람이 같은 최적화를 다시 시도하지 않게** 하기 위해서다.

- 잉크 사이 틈 1,113 개를 재니 하위 5% 가 512px 기준 13px 이다. 32px 로 줄이면 0.81px 라
  통로가 닫힌다
- 그래서 형태를 침식해 통로를 17~18px 로 벌린 판을 만들어 비교했다
- **7 배로 확대해 보니 침식판이 16px 에서 더 나빴다.** 통로는 열리는데 획이 얇아져
  마크가 힘을 잃는다

작은 크기에서는 통로 분리보다 덩어리감이 이긴다. 수치가 가리킨 방향과 눈이 가리킨 방향이
달랐고 눈을 따랐다.

16px 에서는 머리와 혀가 사라지고 추상 매듭으로 읽힌다. **의도한 결과다.**
24px 부터 머리와 혀가 살아난다.

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
