---
id: skills.README
title: eddmpython Skill OS
category: start
purpose: 이 저장소의 운영 정본 진입점. 무엇이 어떻게 배포되고 무엇을 건드리면 안 되는지 여기서 찾는다.
whenToUse:
  - 어디에 배포되나
  - 어떻게 배포하나
  - 롤백은 어떻게 하나
  - 도메인 구조
  - 무엇을 건드리면 안 되나
status: curated
---

# eddmpython Skill OS

지금 실제로 도는 구조와 절차의 정본이다. 여기 없는 절차는 아직 없는 것이다.

## 정보 3층

같은 사실을 두 곳에 쓰지 않는다.

| 층 | 내용 | 위치 |
|---|---|---|
| 강행규칙 | 위반하면 사고가 나는 것 | 루트 `CLAUDE.md` (추적하지 않음) |
| 계약 | 지금 실제로 도는 구조와 절차 | **`skills/specs/`** |
| 예정 | 아직 짓지 않은 설계와 진행 | 커밋 메시지와 이슈 |

`README.md` 는 바깥을 향한 소개다. 운영 절차를 거기에 복제하지 않는다.

## 카테고리

| 카테고리 | 위치 | 의미 |
|---|---|---|
| `start` | `specs/start/` | 처음 여는 사람이 먼저 읽는 것 |
| `operation` | `specs/operation/` | 배포, 도메인, 자산, 발행, 위생 |

dartlab 은 `engines` 와 `recipes` 를 더 두지만 이 저장소에는 그 표면이 없다.
없는 카테고리를 미리 만들지 않는다.

## 운영 스킬

| id | 무엇 |
|---|---|
| [`operation.deploy`](specs/operation/deploy.md) | 어디에 어떻게 배포하고 어떻게 되돌리나 |
| [`operation.domains`](specs/operation/domains.md) | 호스트네임이 어느 워커에 붙어 있나. 무엇을 지우면 안 되나 |
| [`operation.productProxy`](specs/operation/productProxy.md) | 제품 문서를 apex 하위 경로로 넘기는 구조 |
| [`operation.seoContract`](specs/operation/seoContract.md) | 프리렌더, 구조화 데이터, sitemap, RSS 가 지켜야 할 계약 |
| [`operation.brandAssets`](specs/operation/brandAssets.md) | 심볼 정본과 파비콘, og 이미지 생성 |
| [`operation.blogPublishing`](specs/operation/blogPublishing.md) | 글을 어디에 두고 무엇이 자동으로 만들어지나 |
| [`operation.workspace`](specs/operation/workspace.md) | 산출물과 임시 파일을 어디에 두나 |
| [`operation.secrets`](specs/operation/secrets.md) | 공개 저장소에서 지켜야 할 경계 |

## 스킬 추가

`SCHEMA.md` 를 따른다. frontmatter 가 규격에 맞는지는 아래가 검사한다.

```bash
cd site && npm run check:skills
```
