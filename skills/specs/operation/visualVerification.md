---
id: operation.visualVerification
title: 시각 검증과 배포 승인
category: operation
purpose: 프로덕션 빌드를 데스크톱과 모바일 폭으로 렌더하고 확인한 증거를 배포 승인에 묶는다.
whenToUse:
  - 화면을 바꿨다
  - 모바일 레이아웃 확인
  - pyproc-control 스크린샷
  - 시각 검증 승인
  - deploy가 시각 승인에서 막힌다
verify:
  - cd site && npm run verify:visual
  - cd site && npm run check:visual
status: observed
---

# 시각 검증과 배포 승인

## 개념

빌드 통과와 화면 확인은 다른 증거다. 시각 검증은 아래 두 층으로 나눈다.

1. 저장소에 고정한 `pyproc-control`이 프로덕션 빌드를 실제 Chromium 계열 브라우저로 렌더한다
2. 사람이나 화면을 볼 수 있는 에이전트가 데스크톱과 모바일 스크린샷을 확인하고 그 실행을 승인한다

자동 검사는 가로 넘침, 깨진 이미지, 브라우저 오류, 필수 요소와 글의 H2별 이미지 수를 잡는다. 하지만
문장의 시각적 위계, 이미지와 설명의 연결, 지나치게 큰 여백처럼 화면을 보고 판단해야 하는 문제까지
자동 검사 통과로 대신하지 않는다.

캡처 직전에는 전환과 애니메이션을 멈추고 `fade-up`과 `reveal` 요소를 완료 상태로 고정한다. 자동으로
넘어가는 제품 뷰어는 처음 보였을 슬라이드를 시간으로 추측하지 않고, 계약에 적은 버튼을 직접 눌러 각
제품 링크와 문장을 확인한다.

## 검증 API

`site/scripts/visual-api.mjs`가 세 가지 함수를 제공한다.

| 함수 | 역할 |
|---|---|
| `captureVisualEvidence()` | 빌드를 렌더하고 스크린샷과 JSON 보고서를 만든다 |
| `approveVisualEvidence(runId)` | 실제로 확인한 전체 검증 실행을 빌드 지문에 묶는다 |
| `assertVisualApproval()` | 현재 빌드와 승인된 빌드 지문이 같은지 확인한다 |

경로별 필수 요소와 화면 폭은 `site/scripts/visual-contract.mjs`에 선언한다. sitemap의 모든 페이지는
자동으로 검증 대상이 된다. 새 상호작용 표면처럼 별도 증거가 필요한 페이지는 이 계약에 필수 요소,
클릭 뒤 기대 결과, 확대 캡처 대상을 추가한다. Codaro 글은 실행 버튼을 누른 뒤 실제 브라우저 Python
출력에 기대 문장이 나타나야 통과한다.

## 실행 순서

```bash
cd site
npm run build
npm run verify:visual
```

검증은 `../../eddmpython.out/visual/<run-id>/`에 다음 증거를 남긴다.

- sitemap의 모든 페이지를 1440 x 1000으로 렌더한 데스크톱 전체 화면
- 같은 페이지를 390 x 844로 렌더한 모바일 전체 화면
- 브라우저의 한 장 캡처 높이를 넘는 긴 페이지는 위에서 아래까지 겹치지 않는 여러 구간 화면
- 각 페이지의 첫 뷰포트와 계약에서 지정한 상호작용 표면의 확대 화면
- 브라우저 오류, 이미지 상태, 가로 넘침, DOM 계약 결과를 담은 `visual-report.json`
- 정확한 출처, 허용 동작, 화면 폭을 선언한 `pyproc-control.<viewport>.json`

명령 출력의 run id를 확인하고 모든 화면을 실제로 본 다음 승인한다.

페이지 높이가 30,000 CSS px 이하면 기존처럼 `full.jpg` 한 장을 만든다. 더 길면 브라우저를 현재
뷰포트 높이만큼 스크롤하며 `full-01.jpg`, `full-02.jpg` 순서로 마지막까지 캡처한다. 마지막 화면은
페이지 끝을 맞추기 위해 앞 화면과 일부 겹칠 수 있지만 빠지는 구간은 없다. 스크롤 위치와 마지막 도달은
`npm run test:visual-plan`이 검사하며 승인할 때는 해당 경로의 모든 구간을 순서대로 확인한다.

```bash
npm run approve:visual -- --run=<run-id>
npm run check:visual
```

`--route=<id>`로 일부 경로만 렌더하거나 `--base-url=<url>`로 외부 주소를 확인할 수 있다. 이 실행은
진단에는 쓸 수 있지만 전체 로컬 빌드 승인이 아니므로 배포 승인에는 사용할 수 없다.

배포 뒤에는 운영 주소를 `--base-url`로 다시 검사한다. 이 검사는 로컬 미리보기에는 없는 CDN의
자동 삽입 스크립트, 보안 헤더, 외부 네트워크 실패까지 브라우저 오류로 드러낸다. Cloudflare Web
Analytics 자동 삽입은 `static.cloudflareinsights.com`의 스크립트만 허용하고 측정 요청은 같은 출처의
`/cdn-cgi/rum`으로 보낸다. CSP를 넓은 와일드카드로 풀지 않는다.

## 승인이 막는 것

승인은 빌드 디렉터리의 모든 파일로 만든 SHA-256 지문과 연결된다. 승인 뒤 소스나 HTML, CSS, 이미지
URL이 바뀌어 빌드 결과가 달라지면 `npm run check:visual`이 실패한다. 이전 스크린샷으로 새 화면을
배포하는 일을 막기 위한 경계다.

`npm run deploy`는 빌드를 다시 만든 뒤 시각 승인 지문을 확인하고 Wrangler를 실행한다. 따라서 화면을
바꾼 작업은 `build`, `capture`, 실제 이미지 확인, `approve`, `deploy` 순서로 끝낸다.

## 브라우저 선택

검증기는 저장소에 정확히 고정한 `pyproc` 패키지의 공개 `pyproc/control` API로 같은 패키지의
`pyproc-control` 프로세스를 시작한다. 별도 실행 파일을 써야 하면 `BROWSER_PATH`에 절대 경로를
지정한다. 허용 출처와 동작은 실행마다 저장소 밖 manifest에 선언하고 기본 브라우저 프로필과 쿠키는
사용하지 않는다.

## 되돌리기

시각 검증 코드는 공개 화면 번들에 포함되지 않는다. 문제가 생기면 `visual-api.mjs`,
`visual-contract.mjs`, `visual.mjs`와 package script를 이전 커밋으로 되돌린다. 저장소 밖 승인 파일은
다음 전체 capture와 approve로 교체한다.
