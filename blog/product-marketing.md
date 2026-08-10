# Product Marketing Context

**Document version:** v1  
**Last updated:** 2026-08-10

이 파일은 블로그·랜딩 카피가 공유하는 제품 맥락이다. 확인된 공개 표면만 적는다.
운영 절차는 `skills/specs/operation/productMarketing.md`를 본다.

## Studio: eddmpython

**One-liner:** Python과 데이터로 일하는 독립 제품을 발견하고 바로 실행해 보게 하는 스튜디오.  
**What it does:** DartLab, Codaro, xlpod, pyproc의 공개 진실과 공식 경로를 한 사이트에서 연결한다.  
**Not:** 공용 고객 계정, 결제 허브, 제품 소스 모노레포.  
**Conversion action:** 제품 공식 경로 열기 또는 블로그에서 첫 실행.

**Words to use:** 설치 없이, 브라우저에서, 확인된 화면, 공식 경로  
**Words to avoid:** 혁신 AI, 올인원 플랫폼, 공용 로그인, 검증되지 않은 사용자 수

## Products

| Product | One-liner | Reader starting point | Hire for | Do not claim |
|---|---|---|---|---|
| Codaro | 브라우저에서 Python 레슨을 열고 고쳐 실행하는 학습 도구 | Python 설치와 Codaro 이름을 모를 수 있음 | 설치 전 첫 실행, 한 줄 수정 후 결과 확인, 이후 Local로 파일 작업 | 가입 필수, 완전 자동 취업 보장 |
| xlpod | 스프레드시트와 Python을 한 작업 공간에서 연결하는 도구 | Excel 반복 작업은 알지만 xlpod는 처음일 수 있음 | 표 반복 줄이기, 셀과 코드 연결 | 계정 없는 영구 무료 확정 |
| DartLab | 공시·재무를 Python과 화면으로 읽는 분석 도구 | 종목과 공시는 알지만 DartLab은 처음일 수 있음 | 기업 한 곳으로 열기, 공시 원문 확인 | 투자 수익 보장 |
| pyproc | 브라우저에서 Python을 돌리는 런타임 | 개발 용어에 익숙할 수 있음 | 페이지 안 실행 셀, 데모 | 모든 패키지 지원 단정 |

## Blog packaging defaults

- 기본 각도: 문제 또는 결과. 브랜드 사용법은 예외.
- 제목에서 제품명을 지워도 검색 의도 유지 (`PIPELINE.md` 1.5절).
- 본문에서 제품 소개는 문제를 말한 뒤 한두 문장.
- CTA는 열 URL과 누를 버튼 이름을 쓴다.

## Proof sources

- 홈 제품 문구: `site/src/products.ts`
- 블로그 사실: 해당 제품 공개 URL과 직접 실행
- 이미지·OG: `blog/media/` + Hugging Face 객체

## Changelog

- v1 (2026-08-10) — 블로그 유입 패키징 게이트와 함께 초기 맥락 작성. Codaro 브랜드 선행 제목 실패를 반영.
