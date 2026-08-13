---
id: operation.productMarketing
title: 제품 마케팅 맥락
category: operation
purpose: 블로그와 랜딩 카피가 같은 제품 정의, 독자, 쓰지 말 말을 쓰도록 마케팅 맥락 문서를 만들고 유지한다.
whenToUse:
  - 이 제품 누구한테 팔지
  - 포지셔닝
  - product marketing
  - ICP
  - 제품 한 줄 정의
  - 마케팅 맥락 문서
status: curated
---

# 제품 마케팅 맥락

`coreyhaines31/marketingskills`의 product-marketing  ide를 이 저장소 규모에 맞게 줄인 것이다.
전체 CMO OS를 두지 않는다. **한 페이지 맥락 문서**만 유지한다.

## 정본

```
blog/product-marketing.md
```

다른 마케팅 스킬(`operation.blogCopy`, `operation.contentStrategy`)과 블로그 집필은 이 파일을
먼저 읽는다. `.agents/`에 두지 않는다. 이 저장소는 공개 운영 문서가 `skills/`와 `blog/`에 산다.

## 언제 고치나

- 새 제품이 홈에 올라가거나 빠질 때
- 제품 한 줄 정의, 가격/공개 범위, 쓰지 말 말이 바뀔 때
- 블로그 제목이 반복해서 브랜드 사용법으로 샐 때

## 작성 순서

1. `site/src/products.ts`, 제품 랜딩 URL, 확인된 README를 읽는다.
2. 데이터셋 수치는 소개문을 다시 인용하지 않고 공개 API의 실제 파일 목록을 센다.
3. 확인하지 못한 수치, 미검증 후기는 넣지 않는다.
4. 스튜디오(eddmpython)와 제품(Codaro, xlpod, DartLab, pyproc)을 표로 구분한다.
5. 각 제품에 한 줄 정의, 독자 출발점, Jobs to be done, 쓰지 말 말만 적는다.
6. Changelog에 무엇을 왜 바꿨는지 한 줄 남긴다.

## 넣지 않는 것

- 공용 고객 계정이나 결제 약속
- 제품 소스 복제
- 확인되지 않은 전환율, 사용자 수
- SNS 자동 게시 설정

## 롤백

`blog/product-marketing.md`를 이전 커밋으로 되돌린다. 사이트 빌드 산출물은 이 파일을 직접
렌더하지 않으므로 배포 롤백은 필요 없다.
