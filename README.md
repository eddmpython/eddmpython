# eddmpython

복잡한 업무를, 실제로 작동하는 자동화로.

Python과 AI로 재무·데이터·반복 업무를 분석하고, 다시 실행할 수 있는 도구와 시스템으로 만듭니다.

**[eddmpython.com](https://eddmpython.com)**

이 저장소는 브랜드 랜딩과 제품 카탈로그를 관리합니다. 각 제품의 소스는 저장소별로 분리되어 있습니다.

## 제품

| 제품 | 소개 | 진입점 |
|---|---|---|
| DartLab | 한국 DART와 미국 SEC EDGAR 공시를 한 줄의 Python으로 읽고 비교하는 라이브러리 | [문서](https://eddmpython.github.io/dartlab/) · [PyPI](https://pypi.org/project/dartlab/) · [GitHub](https://github.com/eddmpython/dartlab) |
| Codaro | 다운로드 없이 시작하는 Python 학습. 같은 학습 상태를 Local 자동화 스튜디오로 이어가는 도구 | [Web Learn](https://eddmpython.github.io/codaro/) · [GitHub](https://github.com/eddmpython/codaro) |
| xlpod | 셀 수식 안에서 진짜 Python이 도는 브라우저 스프레드시트 | [앱](https://xlpod.eddmpython.com/) |
| pyproc | 서버 없이 브라우저 안에서 도는 영속 Python 컴퓨터 | [데모](https://eddmpython.github.io/pyproc/) · [npm](https://www.npmjs.com/package/pyproc) · [GitHub](https://github.com/eddmpython/pyproc) |

## agent-template/

AI 코딩 에이전트에게 저장소를 맡길 때 쓰는 초기 규칙 템플릿입니다. 위 제품들을 만들면서
실제로 사고가 났던 지점만 남긴 규칙이라, 그대로 복사해서 자리표시자만 채우면 됩니다.

자세한 내용은 [agent-template/README.md](agent-template/README.md)를 보세요.

## site/

브랜드 랜딩. React 19 + TypeScript + Vite + Tailwind CSS v4, Cloudflare Workers 정적 자산으로 서빙합니다.
pyproc 섹션의 실행 셀은 실제 `pyproc` 패키지로 브라우저 안에서 Python을 돌립니다.

```bash
cd site
npm install
npm run dev      # 개발 서버
npm run test     # 타입 체크
npm run build    # 프로덕션 빌드 (산출물은 저장소 형제 폴더 eddmpython.out/site-dist)
npm run deploy   # Cloudflare Workers 배포
```

빌드 산출물은 작업 트리를 더럽히지 않도록 저장소 밖으로 내보냅니다.

## 라이선스

코드는 MIT입니다. 브랜드 자산 (이름, 로고, 제품 스크린샷) 은 예외입니다. [LICENSE](LICENSE)를 보세요.

문의: [GitHub](https://github.com/eddmpython) · eddmpython@gmail.com
