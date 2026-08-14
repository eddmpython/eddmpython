---
id: operation.adsense
title: 블로그 AdSense 광고
category: operation
purpose: 승인된 AdSense 코드를 글 상세에만 싣고 CSP, ads.txt, 배포 검증 범위를 정한다.
whenToUse:
  - 블로그 광고
  - AdSense
  - ads.txt
  - 광고가 보이지 않는다
verify:
  - cd site && npm run build
  - cd site && npm run verify:visual
status: observed
---

# 블로그 AdSense 광고

## 공개 범위

광고 코드는 알려진 `/blog/{slug}` 글 상세 HTML에만 들어간다. 홈, 블로그 목록, 404, 제품 문서에는
넣지 않는다. 광고가 있는 글에서 다른 내부 경로로 이동할 때는 문서를 새로 받아 광고 런타임이 홈에
남지 않게 한다.

게시자 ID와 광고 판매자 선언은 공개 식별자다. 자격증명이나 API 비밀값으로 다루지 않는다. AdSense
로그인 정보와 API 키는 이 저장소에 넣지 않는다.

## 만들어지는 것

`site/vite.config.ts`의 프리렌더 단계가 `type: article` 페이지의 `head`에 승인 코드를 한 번 넣는다.
`site/public/ads.txt`는 빌드 때 사이트 루트의 `/ads.txt`로 복사된다.

현재 코드는 자동 광고 로더다. 고정 위치 광고 단위를 추가하려면 AdSense에서 발급한 `data-ad-slot`을
별도 계약으로 추가한다. 임의 번호를 만들지 않는다.

## CSP

AdSense는 광고 공급 도메인이 바뀔 수 있어 고정 도메인 나열만으로 안정적으로 동작하지 않는다.
`site/worker.ts`는 글 상세 HTML에만 HTTPS 스크립트, 연결, 프레임을 허용하는 전용 CSP를 붙인다.
다른 경로는 더 좁은 기존 CSP를 유지한다.

## 검사

`npm run build` 안의 `verify:seo`가 다음을 확인한다.

- 홈과 블로그 목록에는 승인 코드가 없다
- 모든 알려진 글 상세에는 정확한 게시자 ID의 코드가 한 번 있다
- `/ads.txt` 내용이 승인된 판매자 선언과 같다

배포 뒤에는 캐시버스터를 붙인 글에서 스크립트 응답, 브라우저 console, 광고 네트워크 요청을 확인한다.
광고 차단 확장 프로그램이 없는 검증 전용 브라우저를 쓴다. 광고 소재가 즉시 채워지지 않아도 승인 코드
요청과 정책 차단 여부는 구분해서 기록한다.

## 되돌리기

프리렌더의 AdSense 주입, 글 전용 CSP, `site/public/ads.txt`를 함께 되돌린다. 일부만 지우면 광고 요청은
남아 있는데 판매자 선언이나 보안 정책만 달라질 수 있다.
