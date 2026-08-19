---
id: operation.productMarketing
title: 제품 마케팅 맥락
category: operation
purpose: 블로그와 랜딩 카피가 같은 제품 정의, 독자, 쓰지 말 말을 쓰도록 확인된 제품 맥락을 한곳에 둔다.
whenToUse:
  - 이 제품 누구한테 팔지
  - 포지셔닝
  - product marketing
  - 제품 한 줄 정의
  - 쓰면 안 되는 말
  - DartLab 데이터 규모
  - 마케팅 맥락 문서
status: observed
---

# 제품 마케팅 맥락

**Document version: v4**

블로그와 랜딩 카피가 공유하는 제품 맥락이다. **확인된 공개 표면만 적는다.**
v4 에서 `blog/product-marketing.md` 를 이 문서로 합쳤다. 운영 절차와 맥락이 두 파일로
갈라져 있어서 한쪽만 고치는 일이 생겼다.

`coreyhaines31/marketingskills` 의 product-marketing 을 이 저장소 규모에 맞게 줄인 것이다.
전체 CMO OS 를 두지 않고 **한 페이지 맥락**만 유지한다.

## 스튜디오

| 항목 | 내용 |
|---|---|
| One-liner | Python 과 데이터로 일하는 독립 제품을 발견하고 바로 실행해 보게 하는 스튜디오 |
| What it does | DartLab, Codaro, xlpod, pyproc 의 공개 진실과 공식 경로를 한 사이트에서 연결한다 |
| Not | 공용 고객 계정, 결제 허브, 제품 소스 모노레포 |
| Conversion action | 제품 공식 경로 열기 또는 블로그에서 첫 실행 |

**쓸 말**: 설치 없이, 브라우저에서, 확인된 화면, 공식 경로
**쓰지 말 말**: 혁신 AI, 올인원 플랫폼, 공용 로그인, 검증되지 않은 사용자 수

## 제품

| Product | One-liner | 독자 출발점 | 무엇을 위해 쓰나 | 주장하면 안 되는 것 |
|---|---|---|---|---|
| Codaro | 브라우저에서 Python 레슨을 열고 고쳐 실행하는 학습 도구 | Python 설치와 Codaro 이름을 모를 수 있음 | 설치 전 첫 실행, 한 줄 수정 후 결과 확인, 이후 Local 로 파일 작업 | 가입 필수, 완전 자동 취업 보장 |
| xlpod | 스프레드시트와 Python 을 한 작업 공간에서 연결하는 도구 | Excel 반복 작업은 알지만 xlpod 는 처음일 수 있음 | 표 반복 줄이기, 셀과 코드 연결 | 계정 없는 영구 무료 확정 |
| DartLab | 공시와 재무를 Python 과 화면으로 읽는 분석 도구 | 종목과 공시는 알지만 DartLab 은 처음일 수 있음 | 기업 한 곳으로 열기, 공시 원문 확인, 400 GB+ 공개 데이터셋 받기 | 투자 수익 보장 |
| pyproc | 브라우저에서 Python 을 돌리는 런타임 | 개발 용어에 익숙할 수 있음 | 페이지 안 실행 셀, 데모 | 모든 패키지 지원 단정 |

## 블로그 패키징 기본값

- 기본 각도는 문제 또는 결과다. 브랜드 사용법은 예외다
- **제목에서 제품명을 지워도 검색 의도가 남아야 한다.** 판정 문항은 [blogCopy.md](blogCopy.md) 다
- 본문에서 제품 소개는 문제를 말한 뒤 한두 문장이다
- CTA 는 열 URL 과 누를 버튼 이름을 쓴다

## 근거 위치

- 홈 제품 문구: `site/src/products.ts`
- DartLab 데이터 사실: `https://huggingface.co/datasets/eddmpython/dartlab-data`
- DartLab 파일 목록: `https://huggingface.co/api/datasets/eddmpython/dartlab-data`
- 블로그 사실: 해당 제품 공개 URL 과 직접 실행
- 이미지와 og: `blog/media/` 와 Hugging Face 객체

### DartLab 데이터 스냅샷

2026-08-14 에 Hugging Face 공개 API 의 저장소 파일 목록을 직접 세었다. 데이터 종류마다 회사
범위가 다르므로 **이를 하나의 상장사 수로 표현하지 않는다.**

| 기준 | 실측값 | 공개 문구 |
|---|---:|---|
| Hugging Face 전체 파일 규모 | 457 GB | 400 GB+ |
| `dart/panel/*.parquet` | 2,939개 | 한국 기업별 공시 패널 |
| `edgar/panel/*.parquet` | 7,870개 | 미국 기업별 공시 패널 |
| `edgar/financeStmt/*.parquet` | 6,442개 | 필요할 때만 별도 표기 |
| `edgar/prices/company/*.parquet` | 4,122개 | 필요할 때만 별도 표기 |

## 언제 고치나

- 새 제품이 홈에 올라가거나 빠질 때
- 제품 한 줄 정의, 공개 범위, 쓰지 말 말이 바뀔 때
- 블로그 제목이 반복해서 브랜드 사용법으로 샐 때

## 고치는 순서

1. `site/src/products.ts`, 제품 랜딩 URL, 확인된 README 를 읽는다
2. 데이터셋 수치는 소개문을 다시 인용하지 않고 **공개 API 의 실제 파일 목록을 센다**
3. 확인하지 못한 수치와 미검증 후기는 넣지 않는다
4. 스튜디오와 제품을 표로 구분한다
5. 각 제품에 한 줄 정의, 독자 출발점, 무엇을 위해 쓰나, 주장하면 안 되는 것만 적는다
6. 아래 changelog 에 무엇을 왜 바꿨는지 한 줄 남긴다

## 넣지 않는 것

- 공용 고객 계정이나 결제 약속
- 제품 소스 복제
- 확인되지 않은 전환율과 사용자 수
- SNS 자동 게시 설정

## Changelog

- v4 (2026-08-19): `blog/product-marketing.md` 를 이 문서로 합침. 운영규칙은 Skill OS 한곳에 둔다
- v3 (2026-08-14): Hugging Face 소개문 대신 실제 파일 목록을 세어 DartLab 데이터 규모를 바로잡음
- v2 (2026-08-14): DartLab 공개 데이터셋을 제품 근거와 전환 경로에 추가
- v1 (2026-08-10): 블로그 유입 패키징 게이트와 함께 초기 맥락 작성. Codaro 브랜드 선행 제목 실패를 반영

## 롤백

이 파일을 이전 커밋으로 되돌린다. 사이트 빌드 산출물이 이 파일을 직접 렌더하지 않으므로
배포 롤백은 필요 없다.
