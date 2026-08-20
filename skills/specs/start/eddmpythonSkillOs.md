---
id: start.eddmpythonSkillOs
title: 이 저장소가 소유하는 것
category: start
purpose: 이 저장소의 경계와 구성, 그리고 어디로 가야 무엇이 있는지 알려준다.
whenToUse:
  - 이 저장소는 뭐하는 곳인가
  - 제품 소스가 여기 있나
  - 어디를 봐야 하나
  - 경계
status: curated
---

# 이 저장소가 소유하는 것

## 소유하는 것

eddmpython 브랜드 표면이다.

| 경로 | 무엇 |
|---|---|
| `site/` | 랜딩, 블로그 렌더링, Cloudflare Worker |
| `blog/` | 발행 글, 카테고리 원장, 미디어 계획. **규칙 문서는 없다** |
| `agent-template/` | 복사해 쓰는 공개용 AI 작업 환경 템플릿 |
| `skills/` | 운영 절차의 정본 |

## 소유하지 않는 것

**제품 소스를 복제하지 않는다.** DartLab, Codaro, xlpod, pyproc 은 릴리스, 패키지, URL,
서비스 계약으로만 연결한다.

고객 인증, 세션, 라이선스, 다운로드 권한은 각 제품이 소유한다. 공용 고객 계정과 공용
OAuth 를 여기에 만들지 않는다.

같은 Cloudflare 계정에 xlpod 계열 워커가 함께 산다. 이 저장소 작업으로 건드리지 않는다.
`operation.domains` 를 본다.

## 어디로 가나

| 알고 싶은 것 | 어디 |
|---|---|
| 위반하면 사고가 나는 규칙 | 루트 `CLAUDE.md` (추적하지 않음) |
| 지금 실제로 도는 절차 | `skills/specs/operation/` |
| 바깥을 향한 소개 | 루트 `README.md` |
| 글 쓰는 방법 | `../eddmpython-course/memory/blogWriter.md` (비공개 형제 저장소, 추적 안 함) |
| 블로그 발행 계약 | `skills/specs/operation/blogPublishing.md` |
| 규칙 문서 전체 인덱스 | `../eddmpython-course/memory/MEMORY.md` (비공개 형제 저장소, 추적 안 함) |
| 제품 마케팅 맥락 | `skills/specs/operation/productMarketing.md` |
| 다른 프로젝트에 쓸 규칙 템플릿 | `agent-template/` |

## 이 저장소의 실패 방식

문서가 실물보다 낡는 것이다. 랜딩 카피, README, 운영 문서가 각각 다른 시점의 사실을
말하기 시작하면 어느 것이 맞는지 아무도 모른다.

그래서 두 가지를 지킨다.

- **같은 사실을 두 곳에 쓰지 않는다.** 겹치면 한쪽은 포인터만 둔다
- **실측한 것만 적는다.** 확인하지 않았으면 확인하지 않았다고 쓴다
