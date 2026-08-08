# eddmpython

**복잡한 업무를, 실제로 작동하는 자동화로.**

Python 과 AI 로 재무, 데이터, 반복 업무를 분석하고 다시 실행할 수 있는 도구로 만듭니다.
공시 데이터 분석, Python 학습, 스프레드시트 자동화, 브라우저 Python 런타임까지 네 개의
제품을 만들고 있습니다.

**[eddmpython.com](https://eddmpython.com)** 에서 설치 없이 바로 실행해 볼 수 있습니다.

이 저장소는 브랜드 랜딩, 제품 카탈로그, 블로그, 그리고 공개용 AI 에이전트 규칙 템플릿을
담습니다. 각 제품의 소스는 저장소별로 분리되어 있습니다.

## 저장소 구성

| 경로 | 역할 |
|---|---|
| `site/` | React 랜딩, 제품 진입점, 블로그 렌더링과 Cloudflare Worker |
| `blog/` | 발행 글과 집필 파이프라인의 정본 |
| `agent-template/` | 프로젝트에 복사해 쓰는 공개용 AI 작업 환경 템플릿 |

이 저장소는 각 제품의 소개와 진입점을 소유합니다. DartLab, Codaro, xlpod, pyproc의 제품 소스와
인증, 라이선스, 배포 계약은 각 제품 저장소가 소유합니다.

## 제품

### DartLab · 한국 DART 와 미국 SEC EDGAR 공시를 Python 한 줄로

종목코드 하나로 재무제표, 재무비율, 신용위험, 산업 위치까지 같은 문법으로 이어집니다.
2,664 개 상장사 전종목 스캔과 34 개 산업 지도를 제공합니다.

```bash
pip install dartlab
```

[문서](https://eddmpython.github.io/dartlab/) · [PyPI](https://pypi.org/project/dartlab/) · [GitHub](https://github.com/eddmpython/dartlab) · [데이터셋](https://huggingface.co/eddmpython)

### Codaro · 설치 없이 브라우저에서 시작하는 Python 학습

문법 목차가 아니라 남길 결과를 기준으로 472 개 레슨이 짜여 있습니다. 실제 파일과 예약
자동화가 필요해지면 같은 학습 상태를 그대로 Local 스튜디오로 이어갑니다.

[Web Learn](https://eddmpython.github.io/codaro/) · [GitHub](https://github.com/eddmpython/codaro) · [Windows 런처](https://github.com/eddmpython/codaro/releases/latest)

### xlpod · 셀 수식 안에서 진짜 Python 이 도는 스프레드시트

Excel, Google Sheets, OneDrive, SharePoint 원본을 그대로 열고, 셀 수식에서 Python 을
실행하고, 결과를 원본에 되돌려 저장합니다. 새 포맷으로 옮기지 않습니다.

[앱 열기](https://xlpod.eddmpython.com/)

### pyproc · 서버 없이 브라우저 안에서 도는 영속 Python 컴퓨터

WebAssembly 위에서 실제 CPython 을 돌리고 탭이 닫혀도 상태를 유지합니다. 체크포인트와
되감기, 워커별 독립 인터프리터 병렬 실행을 제공합니다.

```bash
npm install pyproc
```

[데모](https://eddmpython.github.io/pyproc/) · [npm](https://www.npmjs.com/package/pyproc) · [GitHub](https://github.com/eddmpython/pyproc)

## AI 작업 환경 템플릿

AI 코딩 에이전트에게 저장소를 맡길 때 루트에 두는 규칙 템플릿입니다. Claude Code, Cursor,
Codex처럼 `CLAUDE.md`나 `AGENTS.md`를 읽는 도구가 같은 제품 경계와 검증 절차에 도착하게 합니다.
두 파일 중 하나만 규칙 정본으로 두며, 주로 쓰는 도구에 맞춰 정본과 진입점 역할을 바꿀 수 있습니다.

위 제품들을 만들면서 실제로 사고가 났던 지점을 역산해서 남겼습니다. 거짓 실패를 사실로
보고한 일, 지킬 코드가 없는데 게이트만 늘린 일, 참조 대상을 읽지 않고 반영했다고 말한 일
같은 것들입니다. 일반론은 넣지 않았습니다.

두 파일의 역할, 자리표시자, 적용 순서는 [agent-template/README.md](agent-template/README.md)에
있습니다.

## 블로그

제품 발표보다 만들면서 확인한 실패, 결정, 작업 방식을 설명합니다. 첫 글은 같은 AI도 저장소에
따라 다르게 일하는 이유와 이 저장소의 에이전트 템플릿을 함께 다룹니다.

[AI에게 프롬프트보다 먼저 필요한 것](blog/2026-08-08-ai-needs-an-environment.md)

발행 글은 `blog/YYYY-MM-DD-slug.md`가 정본입니다. 사이트 빌드가 글 페이지, sitemap, RSS를 함께
만듭니다. 주제 선정, 사실 검토, 글맛 편집, 발행 검증은 [블로그 파이프라인](blog/PIPELINE.md)을
따릅니다.

본문 이미지와 글별 공유 이미지는 Git에 넣지 않습니다. ImageGen, 공식 자료, 라이선스 이미지의
의미와 출처는 `blog/media/plan.json`에 남기고, 실제 파일은 Hugging Face의 콘텐츠 주소 객체로
발행합니다. `blog/media/catalog.json`이 글과 원격 객체의 대응을 맡습니다.

## site

브랜드 랜딩입니다. React 19, TypeScript, Vite, Tailwind CSS v4 로 만들고 Cloudflare
Workers 에서 서빙합니다. 빌드 타임에 모든 경로를 HTML 로 프리렌더하므로 검색엔진과
공유 카드가 빈 껍데기를 읽지 않습니다.

랜딩의 실행 셀은 데모가 아닙니다. `pyproc` 이 브라우저 안에 Python 머신을 띄우고,
`micropip` 으로 DartLab 을 설치하고, 실제 공시 데이터를 가져옵니다. 서버로 코드를
보내지 않습니다.

```bash
cd site
npm install
npm run dev      # 개발 서버
npm run check:blog # 글 파일과 frontmatter 검사
npm run verify:media # catalog에 등록한 HF 이미지 원격 확인
npm run test     # 블로그 검사와 타입 체크
npm run build    # 프로덕션 빌드 (산출물은 저장소 형제 폴더 eddmpython.out)
npm run deploy   # Cloudflare Workers 배포
```

빌드 산출물은 작업 트리를 더럽히지 않도록 저장소 밖으로 내보냅니다.

## 라이선스

코드는 MIT 입니다. 브랜드 자산 (이름, 로고, 워드마크, 제품 스크린샷) 은 예외이며,
스크린샷에 담긴 제3자 콘텐츠도 각 소유자의 것입니다. 자세한 조건은 [LICENSE](LICENSE) 에 있습니다.

## 문의

[GitHub](https://github.com/eddmpython) · [Threads](https://www.threads.com/@eddmpython) · [YouTube](https://www.youtube.com/@eddmpython) · eddmpython@gmail.com
