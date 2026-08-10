---
id: operation.blogCopy
title: 블로그 카피와 제목
category: operation
purpose: 블로그 제목, summary, 도입 문단이 인지도 없는 브랜드를 전제하지 않고 독자 문제와 결과로 읽히게 한다.
whenToUse:
  - 제목이 이상하다
  - 카피 고쳐줘
  - SEO 제목
  - summary 다시
  - Codaro 사용법 같은 제목
  - copywriting
  - copy editing
verify:
  - cd site && npm run check:blog
status: curated
---

# 블로그 카피와 제목

`marketingskills`의 copywriting과 copy-editing 원칙 중 **블로그 유입 패키징**에 쓰는 것만 남긴다.
랜딩 CRO, 광고, 이메일 카피는 이 문서 범위가 아니다.

## 먼저 읽을 것

1. `blog/product-marketing.md`
2. 해당 글의 `readerStartingPoint`, `readerQuestion`
3. `blog/PIPELINE.md` 1.5절 유입 패키징 게이트

## 제목 규칙

- 질문이거나 주장이다. 명사 나열 금지 (`blogPublishing` frontmatter 계약).
- 제품 이름보다 독자가 검색할 문제나 결과가 앞에 온다.
- 브랜드를 지워도 의미가 남는지 확인한다.
- 예:
  - 나쁨: `Codaro 사용법: 첫 코드 실행부터 내 파일 다루기`
  - 좋음: `설치 없이 Python 첫 코드를 실행하는 방법`

## summary 규칙

- 목록과 검색 결과에 나가는 한두 문장이다.
- 첫 절을 제품명으로 시작하지 않는다.
- 독자가 얻는 결과 또는 피하려는 문제로 시작한다.
- 확인된 동작만 약속한다. `혁신`, `차세대`, `완전 자동` 같은 수식은 쓰지 않는다.

## 도입 문단 규칙

1. 독자가 겪는 장면
2. 그 전에 할 수 있는 일
3. 그때 쓰는 도구 이름을 한두 문장으로 소개
4. 이 글에서 따라 할 순서

제품 역사, 기능 목록, 아키텍처는 뒤로 보낸다.

## 문장 품질

- 명확함이 재치보다 앞선다.
- 기능보다 독자 행동과 화면에 보이는 결과.
- 모호한 말(`최적화`, `효율적`, `강력한`) 대신 구체적 행동.
- 수동태와 수식어를 줄인다.
- beginner 글은 `PIPELINE.md` 길이 한도를 지킨다.

## 편집 순서

초안이 있으면 아래만 고친다.

1. 제목과 summary에 1.5절 세 문항 적용
2. 첫 두 문단에서 브랜드 선행 제거
3. CTA를 `시작하기` 대신 열 화면과 누를 버튼으로 바꿈
4. 사실과 다른 약속 삭제

## 롤백

글 파일의 `title`, `summary`, 도입만 이전 문장으로 되돌리고 `modified`를 그에 맞게 조정한다.
