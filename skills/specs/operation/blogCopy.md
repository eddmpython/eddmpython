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
  - cd site && npm run test:blog-style
  - cd site && npm run check:blog
status: curated
---

# 블로그 카피와 제목

`marketingskills`의 copywriting과 copy-editing 원칙 중 **블로그 유입 패키징**에 쓰는 것만 남긴다.
랜딩 CRO, 광고, 이메일 카피는 이 문서 범위가 아니다.

## 먼저 읽을 것

1. [productMarketing.md](productMarketing.md) 의 제품 표와 쓰지 말 말
2. 해당 글의 `readerStartingPoint`, `readerQuestion`
3. 아래 유입 패키징 게이트 세 문항

## 유입 패키징 게이트

제목과 summary 를 쓰기 전에 세 문항을 모두 통과해야 한다. 하나라도 실패하면 제목을 고친다.
**제품 이름보다 독자의 문제나 결과가 먼저 나와야 한다.**

1. **브랜드 지움 테스트.** 제목에서 Codaro, xlpod, DartLab, pyproc, eddmpython 이름을 지워도
   검색 의도가 남는가. 남는 것이 없으면 브랜드 사용법 제목이다
2. **인지도 테스트.** `readerStartingPoint` 에 그 제품 이름을 처음 본다고 적혀 있으면, 제목과
   summary 가 제품 사용법을 전제하지 않아야 한다. 먼저 무엇을 할 수 있는지가 나와야 한다
3. **결과 선행 테스트.** summary 첫 절이 제품명으로 시작하지 않고, 독자가 얻는 결과나 피하려는
   문제로 시작하는가

통과한 뒤에만 `title`, `summary`, `readerQuestion` 을 확정한다. 본문 초입에서 제품 이름은
문제를 말한 뒤 한두 문장으로 소개한다. `Codaro 사용법` 처럼 인지도 없는 브랜드를 제목 앞에
두지 않는다.

## 제목 규칙

- 질문이거나 주장이다. 명사 나열 금지 (`blogPublishing` frontmatter 계약).
- 제품 이름보다 독자가 검색할 문제나 결과가 앞에 온다.
- 브랜드를 지워도 의미가 남는지 확인한다.
- `primaryKeyword`의 주요 단어를 모두 넣고 `searchIntent`에 맞는 후크를 쓴다.
- 제목은 15자 이상 60자 이하로 쓰고 summary와 도입 두 문단이 같은 약속에 답하게 한다.
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
- beginner 글은 [blogPublishing.md](blogPublishing.md) 의 길이 한도를 지킨다.

본문을 새로 쓰거나 전체 교정할 때는 전역 `$blog-writing`을 반드시 사용한다. 파일 형식과 발행
순서는 [blogPublishing.md](blogPublishing.md)에서 직접 확인한다.
`cd site && npm run test:blog-style`과 `npm run test:blog-package`로 검사 규칙 표본을 먼저 확인하고
`npm run check:blog`로 실제 글을 검사한다.

## 편집 순서

초안이 있으면 아래만 고친다.

1. 제목과 summary 에 위 유입 패키징 게이트 세 문항 적용
2. 첫 두 문단에서 브랜드 선행 제거
3. CTA를 `시작하기` 대신 열 화면과 누를 버튼으로 바꿈
4. 사실과 다른 약속 삭제

## 롤백

글 파일의 `title`, `summary`, 도입만 이전 문장으로 되돌린다. 블로그는 수정 날짜를 저장하지 않는다.
