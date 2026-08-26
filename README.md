<p align="center">
  <a href="https://eddmpython.com">
    <img src="https://eddmpython.com/brand/icon-dark.svg" width="88" height="88" alt="eddmpython 심볼. 한 획으로 감긴 나선과 그 위에 뜬 점" />
  </a>
</p>

<h1 align="center">eddmpython</h1>

<p align="center">
  Python과 AI로 재무, 데이터, 반복 업무를 분석하고<br />
  다시 실행할 수 있는 제품으로 만듭니다.
</p>

<p align="center">
  <strong><a href="https://eddmpython.com">제품 둘러보기</a></strong>
  &nbsp;·&nbsp;
  <a href="https://eddmpython.com/blog">만들면서 배운 것 읽기</a>
  &nbsp;·&nbsp;
  <a href="https://eddmpython.com/brand">브랜드</a>
  &nbsp;·&nbsp;
  <a href="https://www.youtube.com/@eddmpython">YouTube</a>
  &nbsp;·&nbsp;
  <a href="https://www.threads.com/@eddmpython">Threads</a>
</p>

<p align="center">
  <a href="https://eddmpython.com">
    <img src="./site/public/og.png" width="100%" alt="eddmpython, 복잡한 업무를 실제로 작동하는 자동화로" />
  </a>
</p>

## 지금 바로 써보는 제품

<table>
  <tr>
    <td width="50%" valign="top">
      <a href="https://eddmpython.github.io/dartlab/">
        <img src="./site/public/shots/hero-dartlab.webp" width="100%" alt="DartLab Terminal 제품 화면" />
      </a>
      <h3>DartLab</h3>
      <p><strong>종목코드 하나. 기업의 전체 이야기.</strong></p>
      <p>한국 DART와 미국 SEC EDGAR 공시를 Python 한 줄로 읽고 비교합니다. 재무제표부터 2,664개 상장사 스캔과 34개 산업 지도까지 같은 문법으로 이어집니다.</p>
      <p><a href="https://eddmpython.github.io/dartlab/"><strong>문서 보기</strong></a> · <a href="https://pypi.org/project/dartlab/">PyPI</a> · <a href="https://github.com/eddmpython/dartlab">GitHub</a></p>
    </td>
    <td width="50%" valign="top">
      <a href="https://eddmpython.github.io/codaro/">
        <img src="./site/public/shots/hero-codaro.webp" width="100%" alt="Codaro Web Learn 제품 화면" />
      </a>
      <h3>Codaro</h3>
      <p><strong>다운로드 없이 시작하는 Python 학습.</strong></p>
      <p>설치도 가입도 없이 브라우저에서 배우고, 고치고, 바로 실행합니다. 남길 결과를 기준으로 짠 472개 레슨은 실제 파일과 자동화를 다루는 Local 스튜디오로 이어집니다.</p>
      <p><a href="https://eddmpython.github.io/codaro/"><strong>Web Learn 열기</strong></a> · <a href="https://github.com/eddmpython/codaro/releases/latest">Windows 런처</a> · <a href="https://github.com/eddmpython/codaro">GitHub</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="https://xlpod.eddmpython.com/">
        <img src="./site/public/shots/hero-xlpod.webp" width="100%" alt="xlpod 스프레드시트 시작 화면" />
      </a>
      <h3>xlpod</h3>
      <p><strong>셀 수식 안에서 진짜 Python이 도는 스프레드시트.</strong></p>
      <p>Excel, Google Sheets, OneDrive, SharePoint 원본을 그대로 열고 셀 수식에서 Python을 실행합니다. 결과도 새 포맷이 아닌 원본에 되돌려 저장합니다.</p>
      <p><a href="https://xlpod.eddmpython.com/"><strong>앱 열기</strong></a></p>
    </td>
    <td width="50%" valign="top">
      <a href="https://eddmpython.github.io/pyproc/">
        <img src="./site/public/shots/hero-pyproc.webp" width="100%" alt="pyproc 영속 Python 컴퓨터 제품 화면" />
      </a>
      <h3>pyproc</h3>
      <p><strong>브라우저 안에 살아 있는 Python 컴퓨터.</strong></p>
      <p>서버 없이 실제 CPython을 실행하고 탭이 닫혀도 상태를 유지합니다. 체크포인트와 되감기, 워커별 독립 인터프리터 병렬 실행까지 브라우저 안에서 제공합니다.</p>
      <p><a href="https://eddmpython.github.io/pyproc/"><strong>데모 열기</strong></a> · <a href="https://www.npmjs.com/package/pyproc">npm</a> · <a href="https://github.com/eddmpython/pyproc">GitHub</a></p>
    </td>
  </tr>
</table>

## 두 줄로 시작하기

```bash
pip install dartlab
npm install pyproc
```

DartLab은 Python에서 바로 기업을 열고, pyproc은 웹 제품 안에 영속 Python 머신을 심습니다. Codaro와 xlpod은 설치 없이 각 웹 앱에서 시작할 수 있습니다.

## DartLab을 받치는 대량 데이터

[**eddmpython/dartlab-data**](https://huggingface.co/datasets/eddmpython/dartlab-data)는 한국 DART와 미국 SEC EDGAR 공시를 Parquet으로 구조화한 공개 데이터셋입니다. 실제 저장소 파일 목록을 세면 기업별 공시 패널은 한국 2,939개, 미국 7,870개입니다. 재무제표와 시세는 제공 범위가 서로 달라 하나의 상장사 수로 합치지 않습니다.

<table>
  <tr>
    <td align="center"><strong>457 GB</strong><br /><sub>전체 파일 규모</sub></td>
    <td align="center"><strong>2,939개</strong><br /><sub>한국 기업별 공시 패널</sub></td>
    <td align="center"><strong>7,870개</strong><br /><sub>미국 기업별 공시 패널</sub></td>
    <td align="center"><strong>매일</strong><br /><sub>증분 업데이트</sub></td>
  </tr>
</table>

<p align="center">
  <strong><a href="https://huggingface.co/datasets/eddmpython/dartlab-data">Hugging Face에서 DartLab 데이터 열기</a></strong>
  &nbsp;·&nbsp;
  2026.08.14 파일 기준 · CC BY 4.0
</p>

## 한 획으로 그린 나선

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://eddmpython.com/brand/mark-dark.svg" />
    <img src="https://eddmpython.com/brand/mark-light.svg" width="200" alt="eddmpython 심볼" />
  </picture>
</p>

심볼은 한 획입니다. 안쪽 끝에서 가로획으로 나가 위로 감고, 바깥을 한 바퀴 돌아, 오른쪽 아래로 빠져나오며 가늘어집니다. 치솟은 끝 바로 위에 점이 하나 뜹니다.

한 획 안에 네 갈래가 겹쳐 있습니다. 어느 하나만 보여도 틀린 읽기가 아닙니다.

| 읽기 | 어디가 |
|---|---|
| 소문자 **e** | 가로획과 바깥 바퀴가 e 의 눈과 배 |
| 한글 **으** | 둥근 바퀴가 ㅇ, 가로획이 ㅡ |
| **뱀** | 감긴 몸통과 빠져나오는 꼬리 |
| **성장** | 가늘어지는 꼬리와 그 위의 정점 |

나선이라 안쪽에 갇힌 구멍이 없습니다. 가운데 여백은 바깥까지 이어지는 한 줄기 골이고, 그래서 16px 로 줄여도 골이 막히지 않습니다.

<table>
  <tr>
    <td width="25%" align="center"><img src="https://eddmpython.com/brand/icon-light.svg" width="84" alt="밝은 칩 마감" /><br /><sub>밝은 칩</sub></td>
    <td width="25%" align="center"><img src="https://eddmpython.com/brand/icon-dark.svg" width="84" alt="어두운 칩 마감" /><br /><sub>어두운 칩</sub></td>
    <td width="25%" align="center"><img src="https://eddmpython.com/brand/icon-brand.svg" width="84" alt="강조색 칩 마감" /><br /><sub>강조 칩</sub></td>
    <td width="25%" align="center"><img src="https://eddmpython.com/brand/icon-outline.svg" width="84" alt="테두리 칩 마감" /><br /><sub>테두리 칩</sub></td>
  </tr>
</table>

심볼은 좌표가 아니라 작도 규칙으로 정의되어 있습니다. 획 두께와 반지름 몇 개가 정본이고 나머지는 접선 조건에서 풀려 나옵니다. 그래서 획을 굵게 바꾸면 감아 올리는 호의 반지름이 따라 바뀌고 이음매는 저절로 맞습니다. 파비콘, 앱 아이콘, og 이미지, 강의 화면 머리띠가 전부 같은 규칙 하나를 읽습니다.

<p align="center">
  <strong><a href="https://eddmpython.com/brand">브랜드 자산 보기</a></strong>
  &nbsp;·&nbsp;
  <a href="https://eddmpython.com/brand/mark-dark.svg">심볼 SVG</a>
  &nbsp;·&nbsp;
  <a href="https://eddmpython.com/brand/icon-dark.svg">앱 아이콘</a>
  &nbsp;·&nbsp;
  <code>#f56565</code>
</p>

## 안녕하세요, 으뜸이입니다

으뜸이를 캐릭터화한 분홍 뱀입니다. 심볼이 브랜드의 얼굴이라면 으뜸이는 목소리입니다. 낯선 데이터와 도구를 조금 더 가깝게 설명하려고 GitHub, Threads, YouTube의 아바타와 콘텐츠에 다양한 포즈로 등장합니다.

<p align="center">
  <img src="./site/public/brand/euddeum-avatar.webp" width="180" alt="EDDM Python 이름표를 든 으뜸이 SNS 아바타" />
</p>

<table>
  <tr>
    <td width="33.33%" align="center" valign="top">
      <a href="https://www.threads.com/@eddmpython">
        <img src="./site/public/brand/euddeum-wave.webp" width="100%" alt="꼬리를 흔들며 인사하는 으뜸이" />
      </a>
      <br /><strong>반갑게 인사하고</strong><br /><sub>Threads</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="https://www.youtube.com/@eddmpython">
        <img src="./site/public/brand/euddeum-analyze.webp" width="100%" alt="돋보기로 데이터를 분석하는 으뜸이" />
      </a>
      <br /><strong>데이터를 들여다보고</strong><br /><sub>YouTube</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="https://github.com/eddmpython">
        <img src="./site/public/brand/euddeum-build.webp" width="100%" alt="노트북으로 제품을 만드는 으뜸이" />
      </a>
      <br /><strong>작동하는 것을 만들어요</strong><br /><sub>GitHub</sub>
    </td>
  </tr>
</table>

## 우리가 만드는 방식

- 설명용 모형보다 지금 실행되는 제품 화면을 먼저 보여 줍니다.
- 확인하지 않은 기능과 숫자는 랜딩에 쓰지 않습니다.
- 같은 사실을 두 곳에서 소유하지 않습니다. 심볼도 색도 정본 하나에서 계산되어 나옵니다.
- 각 제품은 자신의 인증, 데이터, 배포 경계를 소유하고 eddmpython은 발견과 공식 진입점을 연결합니다.
- 실패와 결정은 감추지 않고 [블로그](https://eddmpython.com/blog)에 다시 쓸 수 있는 판단 기준으로 남깁니다.

<details>
<summary><strong>이 저장소가 궁금하다면</strong></summary>

이 저장소는 eddmpython의 공개 브랜드 표면입니다. 제품 소스는 각 저장소에 분리되어 있고, 여기에는 랜딩과 제품 카탈로그, 블로그, 공개용 AI 작업 환경 템플릿이 있습니다.

| 경로 | 역할 |
|---|---|
| `site/` | React 19, TypeScript, Vite 기반 랜딩과 Cloudflare Worker |
| `site/src/brand.ts` | 심볼 정본. 좌표가 아니라 작도 규칙이 들어 있고 파비콘과 브랜드 자산이 여기서 나온다 |
| `site/src/design.ts` | 색과 테마 정본. 강조색은 이 파일의 한 줄에서 갈라진다 |
| `blog/` | 발행 글. **글 하나가 폴더 하나**이고 그 글에 딸린 이미지 계획과 도구가 같은 폴더에 있다 |
| `skills/` | 배포, 도메인, SEO, 브랜드 자산, 발행 절차의 정본 |

브랜드 자산 파일은 저장소에 두지 않습니다. 빌드가 `site/src/brand.ts` 에서 만들어 `/brand/` 아래로 냅니다. 사본을 두면 심볼을 고친 다음 날부터 그 사본만 옛 형태로 남기 때문입니다.

AI 작업 환경 템플릿의 역할과 적용 순서는 [blog/posts/001-ai-needs-an-environment/agent-template/README.md](blog/posts/001-ai-needs-an-environment/agent-template/README.md)에 정리되어 있습니다.

</details>

## 함께 보기

[웹사이트](https://eddmpython.com) · [블로그](https://eddmpython.com/blog) · [브랜드](https://eddmpython.com/brand) · [DartLab 데이터](https://huggingface.co/datasets/eddmpython/dartlab-data) · [Hugging Face](https://huggingface.co/eddmpython) · [Threads](https://www.threads.com/@eddmpython) · [YouTube](https://www.youtube.com/@eddmpython) · [이메일](mailto:eddmpython@gmail.com)

코드는 MIT 라이선스로 공개합니다. 브랜드 자산과 제품 스크린샷의 조건은 [LICENSE](LICENSE)를 확인해 주세요
