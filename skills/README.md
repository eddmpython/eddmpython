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

블로그를 쓰거나 고칠 때는 저장소 전용 `$blog-writing` 스킬을 사용한다. 파일은
`.agents/skills/blog-writing/SKILL.md`에 있고, 자세한 운영 계약은 아래 `operation.blogPublishing`과
`operation.blogCopy`가 맡는다.

사이트, 제품 카탈로그, SEO, 배포, 도메인, 자산, 공개 경계를 다루는 작업은 저장소 전용
`$eddmpython-operations` 스킬을 사용한다. 파일은 `.agents/skills/eddmpython-operations/SKILL.md`에
있고, 이 문서와 아래 운영 계약으로 작업을 연결하는 얇은 라우터다.

## 정보 4층

같은 사실을 두 곳에 쓰지 않는다.

| 층 | 내용 | 위치 |
|---|---|---|
| 강행규칙 | 위반하면 사고가 나는 것 | 루트 `CLAUDE.md` (추적하지 않음) |
| 운영 계약 | 지금 실제로 도는 구조와 절차. 기계가 강제하는 것 | **`skills/specs/`** |
| 우리 규칙 | 운영자와 에이전트가 정한 판단과 작법 | `memory/` (추적하지 않음). 인덱스는 `memory/MEMORY.md` |
| 예정 | 아직 짓지 않은 설계와 진행 | 커밋 메시지와 이슈 |

**규칙 문서를 다른 폴더에 새로 만들지 않는다.** 운영 계약은 여기, 판단과 작법은 `memory/` 다.
2026-08-19 에 집필 규칙 문서가 여섯 곳으로 갈라져 서로 어긋난 뒤 정한 규칙이다. 그중 하나는
글 파일 경로와 카테고리 정책을, 다른 하나는 폐기된 글자 수 하한을 그대로 들고 있었다.

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
| [`operation.adsense`](specs/operation/adsense.md) | 글 상세 광고 코드, CSP, ads.txt 계약 |
| [`operation.brandAssets`](specs/operation/brandAssets.md) | 심볼 정본과 파비콘, og 이미지 생성 |
| [`operation.blogPublishing`](specs/operation/blogPublishing.md) | 글을 어디에 두고 무엇이 자동으로 만들어지나 |
| [`operation.blogMedia`](specs/operation/blogMedia.md) | 이미지와 영상의 의미 계약, 색상, Hugging Face 발행 |
| [`operation.classroom`](specs/operation/classroom.md) | 강의장을 열고 닫고 카테고리를 푸는 방법 |
| [`operation.productMarketing`](specs/operation/productMarketing.md) | 제품 마케팅 맥락 문서 유지 |
| [`operation.blogCopy`](specs/operation/blogCopy.md) | 블로그 제목, summary, 도입 카피 |
| [`operation.contentStrategy`](specs/operation/contentStrategy.md) | 다음에 쓸 글 주제와 각도 |
| [`operation.visualVerification`](specs/operation/visualVerification.md) | 데스크톱과 모바일 렌더 증거를 배포 승인에 묶는 방법 |
| [`operation.workspace`](specs/operation/workspace.md) | 산출물과 임시 파일을 어디에 두나 |
| [`operation.secrets`](specs/operation/secrets.md) | 공개 저장소에서 지켜야 할 경계 |

## 스킬 추가

`SCHEMA.md` 를 따른다. frontmatter 가 규격에 맞는지는 아래가 검사한다.

```bash
cd site && npm run check:skills
```
