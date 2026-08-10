---
id: operation.README
title: Operation 카테고리 hub
category: operation
purpose: 배포, 도메인, 자산, 발행, 위생 규칙의 진입점.
whenToUse:
  - 운영 문서 목록
  - 어떤 절차가 있나
status: curated
---

# Operation

지금 실제로 도는 절차다. 각 문서는 무엇을 하는지, 왜 그렇게 정했는지, 어떻게 되돌리는지를 담는다.

| id | 무엇 | 먼저 읽을 때 |
|---|---|---|
| [`operation.deploy`](deploy.md) | 배포와 롤백 | 사이트를 처음 올릴 때 |
| [`operation.domains`](domains.md) | 호스트네임과 DNS | 도메인을 건드리기 전에 |
| [`operation.productProxy`](productProxy.md) | 제품 문서 하위 경로 | 제품 문서 주소를 다룰 때 |
| [`operation.seoContract`](seoContract.md) | 검색 노출 계약 | 렌더 방식을 바꾸기 전에 |
| [`operation.brandAssets`](brandAssets.md) | 심볼과 파비콘, og | 로고를 바꿀 때 |
| [`operation.blogPublishing`](blogPublishing.md) | 글 발행 | 글을 올릴 때 |
| [`operation.productMarketing`](productMarketing.md) | 제품 마케팅 맥락 | 포지셔닝·한 줄 정의가 필요할 때 |
| [`operation.blogCopy`](blogCopy.md) | 블로그 제목과 카피 | 제목·summary가 약할 때 |
| [`operation.contentStrategy`](contentStrategy.md) | 글 주제 전략 | 다음 글을 고를 때 |
| [`operation.visualVerification`](visualVerification.md) | 시각 검증과 승인 | 화면을 바꾸고 배포하기 전에 |
| [`operation.workspace`](workspace.md) | 산출물과 임시 파일 | 작업을 끝낼 때 |
| [`operation.secrets`](secrets.md) | 비밀정보와 공개 경계 | 커밋과 공개 전에 |

## 공통 원칙

- 실측한 것만 적는다. 명령은 실제로 돌려 보고 옮긴다
- 되돌리는 법이 없는 절차는 완성되지 않은 절차다
- 시도했다가 되돌린 것은 이유와 함께 남긴다. 다음 사람이 같은 길을 다시 가지 않게 한다
