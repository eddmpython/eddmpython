---
title: Python 프로젝트 폴더 구조: 다른 컴퓨터에서도 똑같이 실행하는 법
slug: python-project-runbook
author: eddmpython
section: Python 실행환경
summary: Python 프로젝트 폴더 구조를 입력, 소스, 결과, 테스트로 나누고 pyproject.toml과 uv.lock 및 README를 묶어 새 컴퓨터에서도 같은 Excel 요약을 만드는 방법을 설명합니다.
readerQuestion: Python 프로젝트 폴더에 무엇을 남겨야 처음 받은 사람도 같은 명령으로 같은 결과를 만들 수 있을까?
readerTakeaway: 코드와 입력 계약, 잠긴 의존성, 실행 명령, 결과 검사를 한 프로젝트 루트에 함께 두고 빈 폴더에서 다시 실행해야 재현 여부를 확인할 수 있다.
readerLevel: beginner
readerStartingPoint: 파일과 폴더는 구분하지만 Python 프로젝트, 패키지, pyproject.toml, uv.lock, 가상환경, 테스트라는 말을 처음 봅니다.
primaryKeyword: Python 프로젝트 폴더 구조
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e9/e9e4d1d04b62b97caa3a550191f433f10b896c12292ded6c1a1654bc3103f934.png
ogImageAlt: 코드와 입력 및 잠금 파일과 실행 명령과 검사가 하나의 재현 가능한 결과를 만드는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

어제 만든 Excel 자동화를 동료에게 보냈는데 `ModuleNotFoundError`가 나오거나 입력 파일을 찾지 못할 수
있습니다. `main.py` 하나만 전달하면 필요한 라이브러리, 실행할 폴더, 입력 형식과 성공 기준이 빠지기
때문입니다.

이 글에서는 Python 프로젝트 폴더 구조를 처음부터 만듭니다. 합성 Excel을 생성하고, 항목별 합계를 새
파일에 저장하며, pytest로 8가지 결과를 확인합니다. 마지막에는 기존 가상환경이 없는 새 폴더에서 같은
명령을 다시 실행합니다.

## 다시 실행된다는 뜻부터 정합니다

### 코드만 같다는 말과 결과까지 확인됐다는 말을 구분합니다

![코드와 입력 및 잠금 파일과 실행 명령과 검사가 하나의 재현 가능한 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e9/e9e4d1d04b62b97caa3a550191f433f10b896c12292ded6c1a1654bc3103f934.png "다섯 항목 중 하나가 빠지면 다른 컴퓨터의 결과를 같은 작업이라고 확인하기 어렵습니다")

프로젝트를 다시 실행한다는 말은 파일이 열렸다는 뜻이 아닙니다. 같은 입력을 넣고 같은 명령을 실행했을
때 약속한 행 수와 금액 합계가 나와야 합니다. 실패하면 어느 준비 단계에서 달라졌는지도 찾을 수 있어야
합니다.

이 조건을 재현 가능성이라고 부릅니다. 이 글에서는 소스 코드, 입력 형식, Python과 라이브러리 버전,
실행 명령, 결과 검사를 함께 남긴 상태를 뜻합니다. `.py` 파일 하나만 같아서는 이 다섯 항목을 증명할 수
없습니다.

재현 가능성과 파일 바이트가 완전히 같다는 말도 다릅니다. Excel 파일은 내부 ZIP 시간 정보 때문에 셀
값이 같아도 SHA-256이 달라질 수 있습니다. 그래서 결과 파일의 해시보다 시트 이름, 행 수, 항목별 합계와
총금액을 검사합니다.

#### 설명 목록: 재현에 필요한 다섯 증거 구분하기

| 증거 | 이 글에서 남기는 파일이나 명령 | 확인할 결과 |
|---|---|---|
| 소스 코드 | `src/expense_automation/app.py` | 입력을 읽고 합계를 저장함 |
| 입력 계약 | `expenses` 시트와 열 세 개 | 잘못된 시트와 열을 거부함 |
| 실행 조건 | `pyproject.toml`, `uv.lock` | 잠긴 라이브러리를 설치함 |
| 실행 명령 | `README.md` | 처음 받은 사람이 그대로 복사함 |
| 결과 검사 | `tests/test_app.py` | pytest 8개가 통과함 |

무엇을 증명할지 정했으므로, 이제 각 증거가 섞이지 않도록 프로젝트 루트부터 나눌 차례입니다.

## 프로젝트 루트에서 책임을 나눕니다

### 가장 위 폴더 하나를 기준으로 원본과 코드와 결과의 위치를 고정합니다

![프로젝트 루트 아래 입력과 소스와 테스트와 결과 폴더가 서로 다른 책임으로 나뉜 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a2/a270a8fc9d6aaba4c2e9d1d667e4ca434961c612277ebbba8d8d4dae7994ed0f.png "프로젝트 루트를 기준으로 보면 읽을 파일과 고칠 코드와 지워도 되는 결과를 이름만으로 구분할 수 있습니다")

프로젝트 루트는 `pyproject.toml`이 있는 가장 위 폴더입니다. PowerShell에서 이 폴더를 연 뒤 명령을
실행합니다. `input`, `src`, `tests`, `output`은 각각 원본, 프로그램, 검사, 생성 결과만 맡습니다.

폴더를 나누는 목적은 보기 좋게 정리하는 데 있지 않습니다. `src`의 코드는 `input`을 읽기만 하고
`output`에 새 파일을 씁니다. 테스트는 실제 업무 파일 대신 매번 새 임시 폴더를 사용하므로 원본을
건드리지 않습니다.

#### 입력 예시: 완성할 프로젝트 파일 지도 읽기

아래 트리에서 들여쓰기는 부모 폴더와 자식 파일의 관계를 보여 줍니다. `src` 안의
`expense_automation`은 Python이 불러올 수 있는 패키지이고, `scripts`에는 합성 입력을 한 번 만드는
보조 프로그램이 들어갑니다. 실행 뒤에는 `input`과 `output`에 Excel 파일이 생깁니다.

```text
expense-automation/
├─ input/
│  └─ expenses.xlsx
├─ output/
│  └─ expense_summary.xlsx
├─ scripts/
│  └─ create_sample_input.py
├─ src/
│  └─ expense_automation/
│     ├─ __init__.py
│     └─ app.py
├─ tests/
│  └─ test_app.py
├─ .gitignore
├─ .python-version
├─ pyproject.toml
├─ uv.lock
└─ README.md
```

이제 폴더가 많아 보일 수 있습니다. 모든 자동화에 이 구조가 필요한지 판단하려면 스크립트와 패키지의
차이를 먼저 알아야 합니다.

## 스크립트와 패키지 중 하나를 고릅니다

### 한 파일 실험과 여러 파일 프로젝트의 기준을 실행 방법으로 비교합니다

![한 파일 스크립트와 설치되는 소스 패키지가 서로 다른 테스트와 실행 요구에 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/81/813bf48e3146e990e4ad935132cf21e891459aadaf1272ff6ec404a9d05080b4.png "한 번 쓰고 버릴 코드는 한 파일로 충분하지만 명령과 테스트를 공유하려면 패키지 구조가 유리합니다")

스크립트는 `python main.py`처럼 파일 하나를 바로 실행하는 프로그램입니다. 패키지는 여러 Python
파일을 하나의 이름으로 불러올 수 있게 묶은 폴더입니다. 패키지 폴더에는 보통 `__init__.py`가 있어
Python 코드라는 사실을 표시합니다.

파일 변환을 한 번 시험하고 버린다면 `main.py` 하나가 더 쉽습니다. 반면 읽기, 검증, 합계, 저장을
나누고 pytest에서 함수를 불러오려면 패키지가 안전합니다. 이 글은 동료가 반복 실행할 업무를 다루므로
`src/expense_automation` 패키지를 선택합니다.

`src`는 source의 줄임말이며 실행 코드가 들어가는 폴더입니다. 프로젝트 루트에 같은 이름의 임시
파일이 있어도 설치된 패키지와 헷갈리지 않게 합니다. pytest도 새 프로젝트에 `src` 배치를 권장하며,
테스트가 설치된 코드를 불러오는지 확인하기 쉬워집니다.

#### 설명 목록: 자동화 크기에 맞는 시작 형태 고르기

| 지금 하려는 일 | 알맞은 형태 | 이유 |
|---|---|---|
| CSV 한 번 열어 열 이름 확인 | `main.py` 한 파일 | 다시 쓸 함수와 설치 명령이 아직 없음 |
| 매달 Excel을 같은 규칙으로 요약 | 패키지 프로젝트 | 함수, 명령, 테스트를 함께 유지함 |
| 다른 팀도 설치해 명령으로 사용 | 패키지와 명령 진입점 | `uv run expense-report`로 파일 위치를 숨기지 않음 |
| 서버와 데이터베이스까지 운영 | 애플리케이션 구조와 배포 설정 | 이 글의 로컬 파일 예제를 넘어감 |

패키지를 선택했으므로 손으로 빈 파일을 여러 개 만들기보다 uv가 기본 뼈대를 만들게 할 수 있습니다.

## uv로 실행 가능한 뼈대를 만듭니다

### PowerShell에서 명령 다섯 개를 실행해 패키지와 의존성 파일을 만듭니다

![PowerShell 명령이 프로젝트 루트와 소스 패키지와 설정 파일과 잠금 파일을 차례로 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/24/24d7eea4bf390f460821442d8f945293776a0d03bb5f996ce50eb598646a12a0.png "초기화와 라이브러리 추가 명령을 실행하면 손으로 맞추기 어려운 프로젝트 파일이 함께 생깁니다")

PowerShell은 Windows에서 글자로 명령을 입력하는 프로그램입니다. 터미널은 PowerShell 같은 명령 입력
창을 부르는 일반 이름입니다. 먼저 `uv --version`을 실행해 uv가 설치됐는지 확인합니다.

uv는 Python 버전, 가상환경과 라이브러리를 프로젝트 단위로 관리하는 도구입니다. 가상환경은 이
프로젝트만 사용하는 Python과 라이브러리 공간입니다. 다른 프로젝트에서 설치한 openpyxl과 섞이지
않도록 프로젝트 루트의 `.venv`에 만들어집니다.

#### 실행 명령: 패키지 프로젝트와 두 라이브러리 준비하기

첫 명령에서 `uv`와 버전 번호가 보이면 준비가 된 것입니다. `--package`는 `src` 아래 패키지와 실행
명령을 연결할 수 있는 설정을 만듭니다. openpyxl은 Excel 파일을 읽고 쓰며, pytest는 결과가 기대값과
같은지 자동으로 확인합니다.

```powershell
uv --version
uv init --package expense-automation
Set-Location expense-automation
uv add openpyxl
uv add --dev pytest
New-Item -ItemType Directory -Force input, output, scripts, tests
```

`uv add openpyxl`은 실행에 필요한 라이브러리를 `[project].dependencies`에 넣습니다. `--dev`로 추가한
pytest는 프로그램 사용자가 아니라 개발과 검사에만 필요하므로 `dev` 의존성 그룹에 들어갑니다. 두
명령은 `uv.lock`과 `.venv`도 함께 갱신합니다.

uv가 없다면 [uv 공식 설치 문서](https://docs.astral.sh/uv/getting-started/installation/)에서 운영체제에
맞는 명령을 먼저 확인합니다. 설치 경로를 추측해 복사하지 않고 `uv --version`이 성공하는지로 설치
결과를 판단합니다.

생성된 파일이 왜 두 종류의 버전을 기록하는지 이해하면 잠금 파일을 잘못 지우거나 직접 고치는 일을
막을 수 있습니다.

## 두 설정 파일은 질문이 다릅니다

### 허용할 버전 범위와 이번에 선택된 정확한 버전을 따로 기록합니다

![pyproject의 허용 범위와 uv lock의 정확한 선택이 하나의 프로젝트 가상환경으로 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17bd9f99f179eaeb531a3ef5ea3a41ed4840cb0f6ae4acf8a7560507664596ef.png "사람이 정한 허용 범위와 도구가 해석한 정확한 버전은 서로 대신할 수 없는 두 기록입니다")

`pyproject.toml`은 프로젝트 이름, 필요한 Python 범위와 직접 사용하는 라이브러리를 사람이 읽을 수
있게 적는 설정 파일입니다. `openpyxl>=3.1,<4`는 3.1 이상이면서 4보다 작은 버전을 허용한다는 뜻입니다.

`uv.lock`은 그 범위를 계산해 실제로 선택한 openpyxl과 하위 라이브러리 버전을 기록합니다. 하위
라이브러리는 openpyxl이 내부에서 필요로 하는 다른 패키지입니다. 잠금 파일은 uv가 관리하므로 사람이
줄을 직접 고치지 않습니다.

`.python-version`은 이 프로젝트에서 기본으로 고를 Python 버전을 한 줄로 적는 파일입니다.
`requires-python = ">=3.12"`가 지원하는 넓은 범위라면 `.python-version`의 `3.13`은 현재 프로젝트가
기본으로 선택할 한 버전입니다. 두 값이 서로 어긋나면 가상환경을 만들기 전에 맞춰야 합니다.

#### 예시 코드: 실행 의존성과 검사 의존성 나누기

`uv init --package`가 만든 `pyproject.toml`에서 프로젝트 설명과 의존성 및 pytest 설정을 아래처럼
확인합니다. `uv_build`의 버전 범위는 설치한 uv 버전에 따라 다를 수 있으므로 생성된 값을 유지합니다.
`[project.scripts]`는 명령 이름을 `app.py`의 `main` 함수와 연결합니다.

`[build-system]`이 있으면 uv가 `src/expense_automation`을 프로젝트 환경에 설치합니다. 설치는 파일을
복사해 굳히는 대신 소스 수정이 바로 반영되는 편집 가능 상태로 이뤄집니다. 이 연결이 없으면
`expense-report` 명령과 테스트의 패키지 import가 동작하지 않을 수 있습니다.

```toml
[project]
name = "expense-automation"
version = "0.1.0"
description = "Create and verify an Excel expense summary"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
  "openpyxl>=3.1,<4",
]

[project.scripts]
expense-report = "expense_automation.app:main"

[build-system]
requires = ["uv_build>=0.8.22,<0.9.0"]
build-backend = "uv_build"

[dependency-groups]
dev = [
  "pytest>=8.4,<10",
]

[tool.pytest.ini_options]
addopts = ["--import-mode=importlib", "-q"]
testpaths = ["tests"]
```

#### 실행 명령: 잠금 파일과 가상환경의 일치 확인하기

`uv lock --check`는 `pyproject.toml`이 바뀌었는데 잠금 파일이 그대로인 상태를 찾아냅니다.
`uv sync --locked`는 잠금 파일을 자동으로 고치지 않고 그 내용대로 `.venv`를 준비합니다. 받은 사람이
실수로 새로운 버전을 선택하지 않게 하려면 두 명령 모두 `--locked` 또는 `--check` 검사를 사용합니다.

```powershell
uv lock --check
uv sync --locked
uv run --locked python -c "import openpyxl; print(openpyxl.__version__)"
```

버전이 같아도 코드 안에 `C:\Users\내이름`이 들어 있으면 다른 컴퓨터에서 실패합니다. 다음으로 파일
위치를 코드에 숨기지 않는 방법이 필요합니다.

## 경로는 명령에서 분명하게 줍니다

### 입력과 출력 위치를 옵션으로 받아 사용자 이름이 달라도 실행되게 합니다

![명령의 입력과 출력 옵션이 서로 분리된 Excel 원본과 결과 파일에 정확히 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c8/c8cc29146575e718fda8329c35fb9d91c2db56d240cd9fcc753545d34990766a.png "프로그램 안의 고정 사용자 경로 대신 명령에 적힌 두 경로가 실제 읽기와 쓰기 대상을 정합니다")

경로는 파일이 있는 위치를 글자로 나타낸 값입니다. `C:\Users\minsu\Desktop\expenses.xlsx`를 코드에
직접 쓰면 민수의 컴퓨터에서만 동작합니다. 이런 값을 하드코딩된 경로라고 부릅니다.

이 프로젝트는 `--input`과 `--output` 뒤에 경로를 받습니다. 옵션은 명령의 동작을 바꾸는 이름이고,
그 뒤 값이 실제 파일 위치입니다. 상대 경로인 `input/expenses.xlsx`는 현재 연 프로젝트 루트를 기준으로
읽습니다.

Python의 `Path`는 Windows의 역슬래시와 macOS 및 Linux의 슬래시 차이를 운영체제에 맞게 처리합니다.
다만 상대 경로의 기준은 명령을 실행한 폴더이므로 README 첫 줄에 “프로젝트 루트에서 실행”이라고
분명히 적습니다.

#### 실패 예시: 한 사람의 바탕화면을 코드에 고정하기

아래 코드는 다른 사용자 이름과 다른 드라이브에서 즉시 실패합니다. 파일을 찾지 못했을 때 코드를
고치는 방식도 좋지 않습니다. 입력 파일이 바뀔 때마다 소스 코드까지 달라져 어떤 코드로 어떤 입력을
처리했는지 구분하기 어렵기 때문입니다.

```python
input_path = "C:\\Users\\minsu\\Desktop\\expenses.xlsx"
output_path = "C:\\Users\\minsu\\Desktop\\summary.xlsx"
```

#### 실행 명령: 같은 코드에 다른 파일 경로 전달하기

아래 명령은 프로그램 코드를 바꾸지 않고 읽을 파일과 쓸 파일만 바꿉니다. 첫 경로가 없으면 실행을
멈추고, 두 번째 경로의 부모 폴더가 없으면 프로그램이 만듭니다. 성공하면 터미널에 입력 행과 총금액 및
결과 파일의 절대 경로가 보입니다.

```powershell
uv run --locked expense-report `
  --input input\expenses.xlsx `
  --output output\expense_summary.xlsx
```

경로를 전달해도 같은 파일을 입력과 출력에 쓰면 원본을 덮을 수 있습니다. 따라서 폴더뿐 아니라 읽기와
쓰기 규칙도 코드에서 분리해야 합니다.

## 원본은 읽고 새 결과를 씁니다

### 입력 Excel을 저장하지 않고 임시 파일을 완성한 뒤 결과 이름으로 바꿉니다

![읽기 전용 Excel 원본이 검증과 합계를 지나 별도의 임시 파일과 최종 결과 파일로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4a/4ae7a14e3c602b415020c9db2027ef0255f827ffe64967a3598fe9ff5064a032.png "원본에는 저장 화살표가 없고 완성된 임시 파일만 최종 결과 이름을 받습니다")

openpyxl의 `Workbook.save()`는 같은 이름의 파일을 경고 없이 덮어씁니다. 그래서 입력 통합 문서를 연
뒤 그 객체에 `save(input_path)`를 호출하지 않습니다. 출력용 통합 문서는 새로 만들고 `output` 폴더의
다른 이름으로 저장합니다.

이 예제는 먼저 `.expense_summary.tmp.xlsx`를 완성한 다음 `expense_summary.xlsx`로 바꿉니다. 저장
도중 오류가 나면 이전 결과 파일을 바로 건드리지 않는 장점이 있습니다. 같은 드라이브의 로컬 폴더를
기준으로 한 보호이며 네트워크 드라이브와 동기화 폴더에서 완전한 원자성을 보장하지는 않습니다.

원자성은 파일 교체가 한 번에 끝나거나 아예 실패해 중간 상태를 보이지 않는 성질입니다. 이 예제는
로컬 파일 이름 교체로 위험을 줄이지만 저장 장치와 동기화 프로그램의 동작까지 통제하지는 못합니다.

결과 파일을 Excel에서 열어 둔 Windows에서는 이름 교체가 `PermissionError`로 실패할 수 있습니다.
이때 결과 파일을 닫고 다시 실행합니다. 기존 결과를 삭제하고 오류를 숨기면 원인을 확인할 증거까지
사라지므로 프로그램은 실패 메시지를 그대로 보여 줍니다.

#### 설명 목록: 처리 전에 확인할 시트와 열과 값

| 항목 | 허용하는 값 | 거부하는 예 |
|---|---|---|
| 시트 이름 | `expenses` | `Sheet1`, `지출` |
| 첫 행 | `date`, `category`, `amount` 순서 | 열 이름 누락 또는 순서 변경 |
| 날짜 | 비어 있지 않은 날짜나 문자열 | 빈 셀 |
| 항목 | 공백이 아닌 문자열 | 빈 셀, 숫자만 있는 셀 |
| 금액 | 원 단위 정수 | `1000.5`, `TRUE`, 문자 |

실제 원본을 시험 재료로 쓰면 잘못된 코드를 고치는 동안 파일이 손상될 수 있습니다. 그래서 입력 계약과
같은 작은 합성 Excel을 먼저 만듭니다.

## 합성 Excel로 입력을 고정합니다

### 공개해도 되는 다섯 행을 만들어 실행 결과와 테스트 기준으로 사용합니다

![다섯 행의 합성 지출 데이터가 정해진 시트와 세 열을 가진 Excel 입력 파일로 만들어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4f/4f5fe6f157cd765be92a249db561306138f38321370b8e512629ed46c7310149.png "실제 개인정보 대신 알려진 다섯 행을 사용하면 합계 138,500원을 누구나 다시 확인할 수 있습니다")

합성 데이터는 실제 사람과 거래를 복사하지 않고 시험을 위해 만든 값입니다. 이 글은 날짜 다섯 개,
항목 네 개와 정수 금액만 사용합니다. 입력이 이미 알려져 있으므로 총금액 `138,500`이 나오지 않으면
코드나 파일이 달라졌다고 판단할 수 있습니다.

아래 파일은 `scripts/create_sample_input.py`입니다. 오직 `input/expenses.xlsx`라는 합성 파일을 새로
만드므로 실제 원본 이름으로 바꾸지 않습니다. 실행 뒤 Excel을 열면 `expenses` 시트와 여섯 행이
보여야 합니다. 첫 행은 열 이름이고 나머지 다섯 행이 데이터입니다.

#### 예시 코드: 계약에 맞는 합성 Excel 입력 만들기

`Workbook()`은 빈 통합 문서를 만들고 `append()`는 한 행씩 값을 넣습니다. 마지막 `save()`가
`input/expenses.xlsx`를 만들며, 이미 같은 이름의 파일이 있으면 덮어씁니다. 이 파일은 합성 입력 전용인
경우에만 다시 생성합니다.

```python
from pathlib import Path

from openpyxl import Workbook


input_path = Path("input/expenses.xlsx")
input_path.parent.mkdir(parents=True, exist_ok=True)

workbook = Workbook()
sheet = workbook.active
sheet.title = "expenses"
sheet.append(["date", "category", "amount"])
sheet.append(["2026-08-01", "교통", 12_500])
sheet.append(["2026-08-02", "식비", 18_000])
sheet.append(["2026-08-03", "소모품", 23_000])
sheet.append(["2026-08-04", "교통", 15_000])
sheet.append(["2026-08-05", "교육", 70_000])
workbook.save(input_path)
workbook.close()

print(f"합성 입력 생성: {input_path.resolve()}")
```

#### 실행 명령: 합성 파일의 위치와 셀 값 확인하기

첫 명령은 프로젝트 환경의 openpyxl로 생성 스크립트를 실행합니다. 두 번째 명령은 파일이 실제로
생겼는지 보여 줍니다. 화면에 `expenses.xlsx`가 보이면 파일 생성이 끝났고, 프로그램은 이 파일을 읽어
입력 계약부터 검사할 수 있습니다.

```powershell
uv run --locked python scripts\create_sample_input.py
Get-ChildItem input\expenses.xlsx
```

입력이 일정해졌으므로 이제 프로그램은 시트와 열을 믿고 계산하기 전에 잘못된 값을 구체적인 행 번호로
거부해야 합니다.

## 읽기와 검증을 한곳에 모읍니다

### Excel을 한 번 열어 시트와 열과 각 행을 검사한 뒤 정상 값만 돌려줍니다

![Excel 시트의 행들이 시트 이름과 열 순서와 값 검사를 차례로 지나 정상 기록 목록이 되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/50/50ae595087562fdc3e668d2e2eadd3c7c6c0736b508b5630702406166d06b32d.png "검사를 통과한 행만 합계 단계로 넘어가고 잘못된 행은 번호가 있는 오류로 멈춥니다")

`read_expenses()`는 파일을 읽는 함수입니다. 함수는 입력을 받아 정해진 일을 하고 결과를 돌려주는 이름
있는 코드입니다. 이 함수의 입력은 `Path`이고 결과는 날짜, 항목과 금액을 가진 튜플 목록입니다.

튜플은 여러 값을 순서대로 묶지만 만든 뒤 항목을 바꾸지 않는 값입니다. `Expense = tuple[str, str,
int]`는 한 지출이 문자열 두 개와 정수 하나라는 설명입니다. 타입 표시는 사람이 읽고 도구가 검사하는
힌트이며, 실행 중 잘못된 값은 아래 조건문이 실제로 막습니다.

`read_only=True`는 큰 파일을 읽을 때 메모리 사용을 줄입니다. `data_only=True`는 수식 글자 대신 Excel이
마지막으로 저장한 계산값을 읽습니다. openpyxl은 수식을 계산하지 않으므로 저장된 계산값이 오래됐을 수
있다는 한계는 뒤의 실패 절에서 다시 확인합니다.

#### 예시 코드: 시트와 세 열 및 행별 값을 검증하기

아래 내용을 `src/expense_automation/app.py`의 앞부분에 적습니다. `try`와 `finally`는 중간 검사가
실패해도 통합 문서를 닫습니다. 빈 행은 건너뛰지만 일부 값만 빈 행과 소수 금액은 오류로 중단합니다.

```python
from argparse import ArgumentParser
from collections.abc import Iterable
from pathlib import Path

from openpyxl import Workbook, load_workbook

Expense = tuple[str, str, int]
REQUIRED_HEADERS = ("date", "category", "amount")


def read_expenses(input_path: Path) -> list[Expense]:
    if not input_path.is_file():
        raise FileNotFoundError(f"입력 파일이 없습니다: {input_path}")

    workbook = load_workbook(input_path, read_only=True, data_only=True)
    try:
        if "expenses" not in workbook.sheetnames:
            raise ValueError("expenses 시트가 없습니다")

        sheet = workbook["expenses"]
        headers = tuple(cell.value for cell in sheet[1][:3])
        if headers != REQUIRED_HEADERS:
            raise ValueError(
                "첫 행은 date, category, amount 순서여야 합니다"
            )

        expenses: list[Expense] = []
        for row_number, values in enumerate(
            sheet.iter_rows(min_row=2, max_col=3, values_only=True),
            start=2,
        ):
            if all(value is None for value in values):
                continue

            date_value, category_value, amount_value = values
            if date_value is None or not str(date_value).strip():
                raise ValueError(f"{row_number}행 date가 비었습니다")
            if not isinstance(category_value, str) or not category_value.strip():
                raise ValueError(f"{row_number}행 category가 비었습니다")
            if (
                isinstance(amount_value, bool)
                or not isinstance(amount_value, (int, float))
                or not float(amount_value).is_integer()
            ):
                raise ValueError(f"{row_number}행 amount는 정수여야 합니다")

            expenses.append(
                (
                    str(date_value).strip(),
                    category_value.strip(),
                    int(amount_value),
                )
            )
    finally:
        workbook.close()

    if not expenses:
        raise ValueError("처리할 지출 행이 없습니다")
    return expenses
```

이 함수는 계산과 저장을 하지 않습니다. 읽기 오류와 합계 오류를 구분하려면 정상 목록을 만드는 단계와
그 목록을 계산하고 저장하는 단계를 따로 두는 편이 좋습니다.

## 합계와 저장을 따로 검사합니다

### 정상 지출을 항목별로 더하고 완성된 통합 문서만 결과 이름으로 바꿉니다

![검증된 지출 목록이 항목별 합계와 임시 Excel 저장을 지나 최종 요약 파일이 되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d1/d1cd2ac9e50c84718e1783846d70cbe2c1a35e064b912f8656beca0bfafe8e14.png "읽기와 계산과 저장이 함수 세 개로 나뉘어 어느 단계의 값이 틀렸는지 따로 확인할 수 있습니다")

`summarize_expenses()`는 같은 항목의 금액을 더한 딕셔너리를 돌려줍니다. 딕셔너리는 이름과 값을 한 쌍으로
저장합니다. 여기서는 `교통`이라는 이름에 `27,500`이라는 합계가 연결됩니다.

`write_summary()`는 계산 결과만 받아 새 통합 문서를 만듭니다. 먼저 점으로 시작하는 임시 파일을 저장한
뒤 `replace()`로 최종 이름을 붙입니다. `run()`은 읽기, 계산, 저장 세 함수를 순서대로 호출하고 입력 행
수와 총금액을 반환합니다.

#### 예시 코드: 항목별 합계와 안전한 출력 파일 완성하기

아래 코드를 같은 `app.py`의 `read_expenses()` 다음에 이어 붙입니다. `ArgumentParser`는 명령에서
`--input`과 `--output`을 읽습니다. 예상한 파일 오류는 `ERROR:`로 짧게 보여 주고 종료하므로 터미널과
자동 실행 도구가 실패를 알아챌 수 있습니다.

```python
def summarize_expenses(expenses: Iterable[Expense]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for _, category, amount in expenses:
        summary[category] = summary.get(category, 0) + amount
    return summary


def write_summary(summary: dict[str, int], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_name(
        f".{output_path.stem}.tmp{output_path.suffix}"
    )

    workbook = Workbook()
    try:
        sheet = workbook.active
        sheet.title = "summary"
        sheet.append(["category", "amount"])
        for category in sorted(summary):
            sheet.append([category, summary[category]])
        sheet.append(["TOTAL", sum(summary.values())])
        workbook.save(temporary_path)
        temporary_path.replace(output_path)
    finally:
        workbook.close()
        if temporary_path.exists():
            temporary_path.unlink()


def run(input_path: Path, output_path: Path) -> tuple[int, int]:
    expenses = read_expenses(input_path)
    summary = summarize_expenses(expenses)
    write_summary(summary, output_path)
    return len(expenses), sum(summary.values())


def build_parser() -> ArgumentParser:
    parser = ArgumentParser(description="지출 Excel을 항목별로 합산합니다")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        row_count, total = run(args.input, args.output)
    except (FileNotFoundError, PermissionError, ValueError) as error:
        raise SystemExit(f"ERROR: {error}") from error

    print(f"입력 행: {row_count}")
    print(f"총금액: {total:,}")
    print(f"결과 파일: {args.output.resolve()}")
```

#### 예상 결과: 다섯 행과 총금액 및 결과 경로 확인하기

합성 입력을 만든 뒤 아래 명령을 실행합니다. `입력 행: 5`와 `총금액: 138,500`이 보이고
`output/expense_summary.xlsx`가 생겨야 합니다. 결과 시트의 마지막 행에는 `TOTAL`과 `138500`이
들어갑니다.

```powershell
uv run --locked expense-report `
  --input input\expenses.xlsx `
  --output output\expense_summary.xlsx
```

```text
입력 행: 5
총금액: 138,500
결과 파일: ...\expense-automation\output\expense_summary.xlsx
```

Excel을 열지 않고도 pytest의 첫 검사가 `summary` 시트 전체를 다시 읽습니다. 항목별 네 행과 마지막
`TOTAL` 행이 기대값과 다르면 테스트가 실패하므로 터미널 출력과 실제 파일 내용을 따로 확인할 수
있습니다.

화면의 숫자를 한 번 확인하는 것만으로는 다음 수정이 같은 결과를 내는지 보장할 수 없습니다. 입력과
출력을 자동으로 만들고 비교하는 테스트가 있어야 함수 하나를 고쳐도 약속이 유지됩니다.

## pytest는 임시 파일로 검사합니다

### 실제 업무 폴더와 떨어진 새 위치에서 성공과 실패를 모두 재현합니다

![여러 임시 폴더가 정상 입력과 잘못된 입력을 각각 실행해 기대 결과와 오류를 검사하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/16/16a0c2a62daa4fd081275c157104ce696e569afca509f58d84d8638544551b83.png "각 테스트는 자기 Excel 파일만 만들기 때문에 실제 input과 output을 바꾸지 않고 경계값을 반복 확인합니다")

pytest는 이름이 `test_`로 시작하는 함수를 찾아 실행하고 `assert` 뒤 조건이 참인지 검사합니다.
`tmp_path`는 테스트마다 새 임시 폴더를 주는 pytest 기능입니다. 같은 테스트를 여러 번 실행해도 이전
결과 파일과 섞이지 않습니다.

성공 테스트만 있으면 위험합니다. 파일이 없을 때, 시트 이름이 다를 때, 열 순서가 바뀔 때, 항목이
비었을 때와 금액이 소수일 때도 멈추는지 확인합니다. 마지막 테스트는 실행 전후 입력 파일 바이트가
같은지 비교해 원본을 저장하지 않았음을 증명합니다.

#### 예시 코드: 정상 요약과 다섯 실패 조건 및 원본 보호 검사하기

아래 내용을 `tests/test_app.py`에 저장합니다. `write_input()`은 실제 Excel과 같은 작은 입력을 임시
폴더에 만듭니다. 첫 테스트는 결과 시트 전체를 읽어 비교하고, 나머지 테스트는 오류 문장과 입력 파일
보호를 각각 한 가지씩 검사합니다.

```python
from pathlib import Path

import pytest
from openpyxl import Workbook, load_workbook

from expense_automation.app import read_expenses, run, summarize_expenses


def write_input(
    path: Path,
    rows: list[tuple[object, object, object]],
    *,
    sheet_name: str = "expenses",
    headers: tuple[str, str, str] = ("date", "category", "amount"),
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_name
    sheet.append(list(headers))
    for row in rows:
        sheet.append(list(row))
    workbook.save(path)
    workbook.close()


def test_run_creates_expected_summary(tmp_path: Path) -> None:
    input_path = tmp_path / "input" / "expenses.xlsx"
    output_path = tmp_path / "output" / "summary.xlsx"
    write_input(
        input_path,
        [
            ("2026-08-01", "교통", 12_500),
            ("2026-08-02", "식비", 18_000),
            ("2026-08-03", "교통", 15_000),
        ],
    )

    row_count, total = run(input_path, output_path)

    assert row_count == 3
    assert total == 45_500
    workbook = load_workbook(output_path, read_only=True, data_only=True)
    values = list(workbook["summary"].values)
    workbook.close()
    assert values == [
        ("category", "amount"),
        ("교통", 27_500),
        ("식비", 18_000),
        ("TOTAL", 45_500),
    ]


def test_summarize_expenses_groups_categories() -> None:
    summary = summarize_expenses(
        [
            ("2026-08-01", "교통", 10_000),
            ("2026-08-02", "교통", 2_500),
            ("2026-08-03", "식비", 8_000),
        ]
    )
    assert summary == {"교통": 12_500, "식비": 8_000}


def test_missing_input_file_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="입력 파일이 없습니다"):
        read_expenses(tmp_path / "missing.xlsx")


def test_missing_expenses_sheet_is_rejected(tmp_path: Path) -> None:
    input_path = tmp_path / "wrong-sheet.xlsx"
    write_input(input_path, [("2026-08-01", "교통", 10_000)], sheet_name="Sheet1")
    with pytest.raises(ValueError, match="expenses 시트가 없습니다"):
        read_expenses(input_path)


def test_wrong_header_order_is_rejected(tmp_path: Path) -> None:
    input_path = tmp_path / "wrong-headers.xlsx"
    write_input(
        input_path,
        [("교통", "2026-08-01", 10_000)],
        headers=("category", "date", "amount"),
    )
    with pytest.raises(ValueError, match="date, category, amount"):
        read_expenses(input_path)


def test_blank_category_is_rejected(tmp_path: Path) -> None:
    input_path = tmp_path / "blank-category.xlsx"
    write_input(input_path, [("2026-08-01", " ", 10_000)])
    with pytest.raises(ValueError, match="2행 category가 비었습니다"):
        read_expenses(input_path)


def test_decimal_amount_is_rejected(tmp_path: Path) -> None:
    input_path = tmp_path / "decimal-amount.xlsx"
    write_input(input_path, [("2026-08-01", "교통", 10_000.5)])
    with pytest.raises(ValueError, match="2행 amount는 정수여야 합니다"):
        read_expenses(input_path)


def test_source_workbook_is_not_changed(tmp_path: Path) -> None:
    input_path = tmp_path / "input" / "expenses.xlsx"
    output_path = tmp_path / "output" / "summary.xlsx"
    write_input(input_path, [("2026-08-01", "교통", 10_000)])
    before = input_path.read_bytes()

    run(input_path, output_path)

    assert input_path.read_bytes() == before
```

#### 실행 명령: 여덟 검사가 모두 통과하는지 확인하기

프로젝트 루트에서 pytest를 실행하면 점 여덟 개와 `8 passed`가 보여야 합니다. 실패하면 테스트 이름과
실제 값 및 기대값이 함께 나옵니다. 줄 수가 아니라 어떤 약속이 깨졌는지 테스트 이름부터 읽습니다.

```powershell
uv run --locked pytest
```

```text
........
8 passed
```

코드와 테스트가 있어도 새 사람이 실행 순서를 추측해야 한다면 프로젝트는 아직 전달되지 않은 것입니다.
다음으로 사람을 위한 실행 계약을 README에 적습니다.

## README는 실행 계약입니다

### 준비 조건부터 성공 출력과 복구 방법까지 복사 가능한 순서로 적습니다

![README의 준비와 입력과 실행과 검사와 성공 기준과 복구 항목이 순서대로 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/65/65db674dd2ba331d0860858caa1cda8339d43dc2add38ffd6c0423cf579ab24b.png "처음 받은 사람은 설명을 해석하지 않고 위에서 아래로 명령과 기대 결과를 대조할 수 있습니다")

README는 프로젝트 루트에서 가장 먼저 읽는 설명 파일입니다. 긴 배경 이야기보다 실행 위치, 준비 도구,
입력 파일, 명령, 생성 결과와 성공 기준이 먼저 나와야 합니다. 명령은 실제로 복사할 수 있는 형태로
한 번만 적습니다.

입력 계약도 README에 남깁니다. `expenses` 시트와 열 세 개를 적지 않으면 동료는 자기 Excel 열 이름을
프로그램이 알아서 해석할 것이라고 오해할 수 있습니다. 성공 기준 `8 passed`도 적어 명령이 조용히 끝난
것과 결과가 맞는 것을 구분합니다.

#### 입력 예시: 새 폴더에서 그대로 따를 README 작성하기

아래 내용은 최소 실행 설명서입니다. 실제 업무 프로젝트에서는 입력을 받는 담당자, 결과를 전달할 위치,
민감정보 보관 규칙과 오류 연락 방법을 더 적습니다. 비밀번호와 API 키의 실제 값은 README에 넣지
않습니다.

```markdown
# expense-automation

`expenses` 시트의 지출을 항목별로 합산해 새 Excel을 만듭니다.

## 준비 조건

- 프로젝트 루트에서 PowerShell을 엽니다.
- `uv --version`이 버전 번호를 출력해야 합니다.

## 입력 계약

- 파일: `input/expenses.xlsx`
- 시트: `expenses`
- 첫 행: `date`, `category`, `amount`
- 금액: 원 단위 정수

## 환경 준비

`uv sync --locked`

## 합성 입력 만들기

`uv run --locked python scripts/create_sample_input.py`

## 실행

`uv run --locked expense-report --input input/expenses.xlsx --output output/expense_summary.xlsx`

## 검사

`uv run --locked pytest`

## 성공 기준

- 터미널에 `입력 행: 5`와 `총금액: 138,500`이 보입니다.
- `output/expense_summary.xlsx`의 마지막 행은 `TOTAL`, `138500`입니다.
- pytest 결과는 `8 passed`입니다.

## 자주 생기는 오류

- 입력 파일 없음: `input` 경로와 파일 이름을 확인합니다.
- 결과 파일 사용 중: Excel에서 결과 파일을 닫고 다시 실행합니다.
- 잠금 파일 불일치: 받은 사람은 `uv.lock`을 고치지 말고 작성자에게 알립니다.
```

README는 실행을 설명하지만 어떤 파일을 공유해도 되는지는 결정하지 않습니다. 소스와 계약은 Git에
남기고 가상환경, 민감한 입력과 다시 만들 수 있는 출력은 제외해야 합니다.

## Git에는 계약만 남깁니다

### 소스와 잠금 파일은 추적하고 가상환경과 업무 Excel은 제외합니다

![Git에 남는 소스와 설정 및 잠금 파일과 제외되는 가상환경과 입력 및 출력 파일이 분리된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f1/f15864138a8d5e7925127d7db0537d360f2ee691e73ba994e4eb469397573368.png "다시 만들 수 있는 파일과 공개하면 안 되는 업무 데이터는 Git 경계 밖에 남습니다")

Git은 파일 변경 기록을 저장하고 다른 사람과 공유하는 도구입니다. `src`, `tests`, `scripts`, README,
`pyproject.toml`과 `uv.lock`은 같은 실행을 만드는 근거이므로 추적합니다. `.venv`는 `uv sync`로 다시
만들 수 있고 운영체제마다 달라서 추적하지 않습니다.

실제 `input/*.xlsx`에는 이름, 계좌, 매출 같은 민감정보가 들어갈 수 있습니다. 공개 저장소뿐 아니라
사내 저장소에서도 접근 권한을 확인하기 전에는 넣지 않습니다. 이 글의 합성 입력은 생성 스크립트가 다시
만드므로 Excel 바이트를 Git에 넣을 이유가 없습니다.

`output`도 프로그램으로 다시 만들 수 있으므로 기본적으로 제외합니다. 승인된 보고서를 기록 보관해야
한다면 소스 저장소가 아니라 조직의 문서 보관 위치와 권한 정책을 사용합니다. `.gitignore`는 이미 Git에
올린 비밀을 되돌려 주지 않으므로 커밋 전에 확인해야 합니다.

#### 예시 코드: 다시 만들 파일과 업무 Excel 제외하기

아래 내용을 `.gitignore`에 추가합니다. `input/*.xlsx`는 입력 폴더의 Excel을 제외하고 `output/*`는
모든 생성 결과를 제외합니다. `uv.lock`은 목록에 없으므로 Git이 추적합니다.

```gitignore
.venv/
__pycache__/
.pytest_cache/
*.py[cod]
input/*.xlsx
output/*
```

#### 실행 명령: 추적할 파일과 제외된 파일 구분하기

`git status --short`는 아직 커밋하지 않은 추적 대상만 보여 줍니다. 합성 입력과 결과 Excel이 목록에
나오면 `.gitignore` 경로나 이미 추적된 상태를 확인합니다. 실제 비밀을 출력하는 명령은 사용하지
않습니다.

```powershell
git status --short
git check-ignore -v input\expenses.xlsx output\expense_summary.xlsx
```

공유할 파일을 정했으므로 현재 `.venv`와 결과가 있는 폴더에서 다시 실행하는 것으로 끝내면 안 됩니다.
깨끗한 새 폴더에서 README만 보고 결과를 만들어야 숨은 준비를 찾을 수 있습니다.

## 새 폴더에서 처음부터 재생합니다

### 기존 가상환경과 결과 없이 잠금 파일부터 같은 Excel 요약을 다시 만듭니다

![빈 복제 폴더가 잠긴 환경과 합성 입력과 실행과 테스트를 차례로 거쳐 같은 논리 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/06/067a134337d618f096b6b66a5935dcdc2b2b2f53594927e7b5f6d72449c583b6.png "기존 컴퓨터의 숨은 파일을 쓰지 않고 네 단계를 모두 통과해야 전달 가능한 프로젝트가 됩니다")

새 폴더 검사는 다른 컴퓨터를 바로 구하지 못해도 할 수 있습니다. Git에 기록된 파일만 다른 이름의
폴더로 복제하고 `.venv`, `input/*.xlsx`, `output/*`가 없는 상태에서 시작합니다. 이 검사를 클린 리플레이라고
부를 수 있으며, 깨끗한 상태에서 실행 절차를 다시 재생한다는 뜻입니다.

`uv sync --locked`가 성공하면 잠금 파일과 환경이 맞습니다. 합성 입력을 만든 뒤 프로그램과 pytest를
실행합니다. 마지막 `git status --short`가 비어 있으면 생성 파일이 Git 추적 대상으로 새어 나오지
않았다는 뜻입니다.

#### 실행 명령: 복제부터 결과 검사까지 README만 따라가기

`<저장소-URL>`은 실제 Git 주소로 바꿉니다. 받은 사람은 잠금 오류를 없애려고 `uv lock`을 실행하지
않습니다. `uv.lock`이 `pyproject.toml`과 맞지 않으면 소유자가 의존성 변경을 검토하고 두 파일을 함께
갱신해야 합니다.

```powershell
git clone <저장소-URL> expense-automation-check
Set-Location expense-automation-check

uv sync --locked
uv lock --check
uv run --locked python scripts\create_sample_input.py

$sourceHashBefore = (Get-FileHash input\expenses.xlsx -Algorithm SHA256).Hash
uv run --locked expense-report `
  --input input\expenses.xlsx `
  --output output\expense_summary.xlsx
$sourceHashAfter = (Get-FileHash input\expenses.xlsx -Algorithm SHA256).Hash

$sourceHashBefore -eq $sourceHashAfter
uv run --locked pytest
git status --short
```

해시 비교 결과는 `True`, 프로그램 총금액은 `138,500`, pytest는 `8 passed`여야 합니다. 결과 Excel의
바이트 해시는 비교하지 않습니다. 대신 테스트가 `summary` 시트의 모든 셀 값을 읽어 기대한 행과
비교합니다.

클린 리플레이가 실패하면 처음부터 코드를 읽지 않습니다. 환경 준비, 입력 검증, 프로그램 실행과 결과
검사 중 처음 실패한 단계를 기준으로 원인을 좁힙니다.

## 오류는 네 단계로 좁혀 찾습니다

### 첫 실패 명령과 오류 문장을 기준으로 고칠 파일을 결정합니다

![환경 준비와 입력 검사와 프로그램 실행과 결과 검사의 네 단계가 각 오류 증거와 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6d/6d1f7d47d68b1e32a1e28b258b4228160072bbe560a4c27fff90c688c260c76f.png "가장 먼저 실패한 단계만 보면 잠금 파일과 입력 Excel과 코드와 기대값 중 어디를 조사할지 정할 수 있습니다")

오류 메시지는 없애야 할 글자가 아니라 실패한 조건의 증거입니다. `No pyproject.toml found`가 나오면
라이브러리를 다시 설치하기 전에 현재 폴더를 확인합니다. `ModuleNotFoundError`가 나오면 시스템
Python을 실행했는지와 `uv run`을 사용했는지부터 봅니다.

Excel 수식도 주의해야 합니다. openpyxl은 수식을 계산하지 않습니다. `data_only=True`는 Excel이 마지막으로
저장한 계산 결과를 읽으므로 다른 프로그램이 수식을 갱신하지 않았다면 오래된 값이나 `None`이 나올 수
있습니다. 이 프로젝트는 입력 금액을 수식이 아닌 정수로 제한해 그 차이를 피합니다.

매크로가 있는 `.xlsm`, 피벗, 도형과 외부 연결이 중요한 통합 문서는 이 단순 예제의 범위를 벗어납니다.
openpyxl 공식 문서도 기존 파일을 열고 다시 저장할 때 일부 도형이 사라질 수 있다고 경고합니다. 그런
파일은 복사본과 전용 회귀 검사를 먼저 준비해야 합니다.

#### 설명 목록: 오류 문장으로 확인할 파일 찾기

| 처음 실패한 명령이나 오류 | 먼저 확인할 것 | 바로 하지 않을 일 |
|---|---|---|
| `uv: command not found` | `uv --version`, 공식 설치 경로 | 임의 폴더의 실행 파일 복사 |
| `No pyproject.toml found` | 현재 위치와 `pyproject.toml` | 전역 `pip install` |
| lock file needs update | `pyproject.toml`과 커밋된 `uv.lock` | 받은 사람이 `uv lock` 실행 |
| 입력 파일이 없습니다 | `--input` 값과 실제 파일 이름 | 코드에 절대 경로 고정 |
| `expenses` 시트가 없습니다 | Excel 아래쪽 시트 이름 | 첫 번째 시트를 무조건 사용 |
| amount는 정수여야 합니다 | 표시 형식이 아니라 실제 셀 값 | 오류 행을 조용히 건너뜀 |
| `PermissionError` | 결과 Excel이 열려 있는지 | 원본 파일에 저장 |
| 합계 테스트 실패 | 입력 행과 합계 함수의 실제 값 | 기대값을 이유 없이 수정 |

오류를 단계별로 찾을 수 있어도 모든 작업을 패키지 프로젝트로 만들 필요는 없습니다. 마지막으로 이
구조가 이득을 주는 범위와 더 작은 선택지를 구분합니다.

## 필요한 만큼만 구조를 키웁니다

### 반복 횟수와 공유 대상과 실패 비용으로 한 파일과 패키지 사이를 고릅니다

![한 번 확인하는 작은 스크립트와 반복 공유하는 패키지 프로젝트가 각자의 확인 목록에 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/90/90deefb9a345e92d9341b2eb413238fe77a611a21f3424ba4ceed88847dfcf43.png "파일 수가 아니라 반복 실행과 공유 및 실패 복구의 필요가 프로젝트 크기를 결정합니다")

한 번 받은 CSV의 열 이름만 출력한다면 `uv init --app`과 `main.py` 한 파일로 충분합니다. 입력 형식이
바뀌면 버릴 코드에 패키지, 명령 진입점과 테스트 8개를 붙이면 고칠 파일만 늘어납니다.

반대로 매달 같은 Excel을 처리하고 동료가 실행하며 잘못된 합계가 보고서로 나갈 수 있다면 이 글의
구조가 필요합니다. 특히 입력 검증, 원본 보호, 잠금 파일, README와 클린 리플레이는 코드 줄 수보다 실패
비용이 클 때 효과가 있습니다.

uv.lock도 모든 차이를 없애지는 않습니다. 운영체제, CPU, 시스템 라이브러리, 시간대, 외부 API와 원본
파일이 다르면 결과가 달라질 수 있습니다. 이 예제는 단순 셀 값과 정수 합계만 다루므로 플랫폼 차이를
줄였지만, 실제 프로젝트는 달라질 수 있는 외부 조건을 README와 테스트에 더 적어야 합니다.

#### 확인 목록: 이 프로젝트를 전달하기 전에 여덟 항목 점검하기

- 프로젝트 루트에 `pyproject.toml`과 `uv.lock`이 함께 있는가
- `src`가 입력 Excel을 저장하지 않고 `output`에 새 파일을 쓰는가
- 입력 시트와 열 및 값 형식이 코드와 README에 같은 말로 적혀 있는가
- 모든 코드 블록의 명령이 프로젝트 루트에서 실제로 실행되는가
- 시스템 Python이 아니라 `uv run --locked`를 사용하는가
- pytest가 정상 결과뿐 아니라 잘못된 입력과 원본 보호를 검사하는가
- `.venv`, 업무 입력과 생성 결과가 Git에서 제외되는가
- 새 폴더에서 `8 passed`와 총금액 `138,500`을 다시 확인했는가

#### 실행 명령: 빈 폴더에서 첫 프로젝트 만들기

지금 확인할 첫 행동은 PowerShell에서 아래 두 명령을 실행하는 것입니다. 버전 번호와 새 프로젝트 폴더가
보이면 이 글의 합성 입력, 프로그램과 테스트를 차례로 넣을 수 있습니다. 이미 업무 파일이 있다면 먼저
복사본을 만들고 시트와 열 계약부터 현재 값에 맞게 적습니다.

```powershell
uv --version
uv init --package expense-automation
```

더 깊은 원문은 [uv 프로젝트 생성 문서](https://docs.astral.sh/uv/concepts/projects/init/),
[uv 프로젝트 파일 문서](https://docs.astral.sh/uv/concepts/projects/layout/),
[uv 잠금과 동기화 문서](https://docs.astral.sh/uv/concepts/projects/sync/),
[Python pyproject 안내](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/),
[pytest 프로젝트 배치 안내](https://docs.pytest.org/en/stable/explanation/goodpractices.html),
[Python pathlib 문서](https://docs.python.org/3/library/pathlib.html),
[openpyxl 공식 튜토리얼](https://openpyxl.readthedocs.io/en/stable/tutorial.html)에서 확인할 수 있습니다.
