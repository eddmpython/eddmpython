---
title: Python 프로젝트 폴더 구조: 동료도 다시 실행하는 방법
slug: python-project-runbook
author: eddmpython
section: Python 실행환경
summary: Python 프로젝트 폴더를 input과 src 및 output으로 나누고 pyproject와 uv.lock 및 README를 남겨 새 폴더에서도 같은 결과를 만드는 방법을 설명합니다.
readerQuestion: Python 프로젝트 폴더와 실행 설명서를 어떻게 구성해야 처음 받은 동료도 결과를 다시 만들 수 있을까?
readerTakeaway: 입력과 코드와 출력을 나누고 의존성 파일 두 개와 준비 및 실행과 검사 명령 세 개를 README에 적어 새 폴더에서 재현한다.
readerLevel: beginner
readerStartingPoint: uv를 설치하고 uv run으로 Python 파일을 실행할 수 있는 상태입니다.
primaryKeyword: Python 프로젝트 폴더
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/51/511d308bd81b6431348885ca2d494966ef961f52798c5ab50101fa286f7ad85f.png
ogImageAlt: 프로젝트 루트에서 input과 src와 output 및 tests 폴더가 서로 다른 역할로 나뉜 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 프로젝트 폴더에 Excel 원본과 코드와 결과 파일을 모두 섞어 두면 어느 파일을 실행하고 무엇을
지워도 되는지 알기 어렵습니다. 만든 사람은 기억하지만 처음 받은 동료는 파일 이름만 보고 판단해야 합니다.

이 글에서는 업무 자동화에 필요한 폴더와 설정 파일을 실제 이름으로 정합니다. 마지막에는 기존
`.venv` 없이 새 폴더에서 환경 준비, 실행, 검사를 거쳐 같은 Excel 결과를 만드는지 확인합니다.

## input과 src 및 output을 나눕니다

### 원본 Excel과 실행 코드와 생성 결과를 서로 다른 폴더에 둡니다

![프로젝트 루트에서 input과 src와 output 및 tests 폴더가 서로 다른 역할로 나뉜 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/51/511d308bd81b6431348885ca2d494966ef961f52798c5ab50101fa286f7ad85f.png "입력 원본이 src의 코드를 지나 output 결과가 되고 tests가 그 결과를 검사합니다")

프로젝트 루트는 자동화에 필요한 파일을 한곳에서 찾는 시작 폴더입니다. 그 안에서 `input`은 원본,
`src`는 실행 코드, `output`은 다시 만들 수 있는 결과, `tests`는 기대값 검사만 맡습니다.

`src/main.py`는 항상 `input`에서 읽고 `output`에 씁니다. 원본을 같은 이름으로 저장하지 않으면 실수로
덮어쓸 가능성이 줄어듭니다. 결과 파일은 삭제한 뒤 명령으로 다시 만들 수 있어야 합니다.

#### 예시

```text
expense-automation/
├─ input/
│  ├─ 01_sales.xlsx
│  └─ 02_operations.xlsx
├─ output/
│  └─ expense_result.xlsx
├─ src/
│  ├─ main.py
│  └─ validate_result.py
├─ tests/
│  └─ test_result.py
├─ pyproject.toml
├─ uv.lock
└─ README.md
```

#### 확인 목록

- `input`의 Excel은 코드가 읽기만 합니다.
- `output`의 파일은 실행할 때 다시 만듭니다.
- 실행 코드는 `src`에서 찾습니다.
- 결과 검사는 `tests` 또는 검증 스크립트에서 찾습니다.

## pyproject와 uv.lock을 함께 보관합니다

### 필요한 라이브러리와 정확한 설치 버전을 두 파일로 다시 만들 수 있게 합니다

![pyproject 설정 파일과 잠금 파일이 하나의 가상환경과 같은 실행 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6a/6a2d36f4bfc21d6e06d629c893769de653aa9d621a430642915577c5e246f8da.png "두 설정 파일이 같은 가상환경을 만들고 서로 다른 컴퓨터가 같은 코드를 실행합니다")

`pyproject.toml`에는 프로젝트 이름과 Python 범위 및 필요한 라이브러리가 들어갑니다. 예를 들어
`pandas`와 `openpyxl`이 필요하다는 사실을 사람이 읽고 uv도 설치에 사용합니다.

`uv.lock`에는 실제로 선택된 패키지 버전과 하위 의존성이 기록됩니다. 두 파일은 Git에 함께 넣고
`.venv`는 넣지 않습니다. 새 컴퓨터에서는 `uv sync --locked`로 잠금 파일을 바꾸지 않고 환경을 만듭니다.

#### 예시

```toml
[project]
name = "expense-automation"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "openpyxl>=3.1,<4",
  "pandas>=3.0,<4",
]
```

#### 코드

```powershell
uv sync --locked
uv run python -c "import pandas; print(pandas.__version__)"
```

#### 참고 자료

- [uv 프로젝트 파일 공식 문서](https://docs.astral.sh/uv/concepts/projects/layout/)
- [uv 잠금과 동기화 공식 문서](https://docs.astral.sh/uv/concepts/projects/sync/)

## README에는 세 명령을 순서대로 씁니다

### 환경 준비와 실행 및 검사를 복사할 수 있는 명령으로 바로 제시합니다

![README 문서의 설치와 실행 및 검사 명령 세 줄이 각각 성공 결과로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/be/be5d2974f686ef65e4dbc3efb458e9649c12a0a994789f12e7edee3cb7b376fa.png "README의 세 명령이 환경 준비와 Excel 생성 및 결과 검사로 차례로 이어집니다")

README의 첫 독자는 이 프로젝트를 만든 사람이 아니라 처음 받은 동료입니다. 긴 소개보다 먼저 준비
조건, 입력 파일 위치, 복사할 명령, 성공했을 때 생기는 파일을 보여 줘야 합니다.

명령은 실행 순서대로 세 줄이면 충분합니다. 첫 줄은 잠긴 환경을 준비하고, 둘째 줄은 결과 파일을 만들고,
셋째 줄은 건수와 금액 및 원본 보호 검사를 실행합니다. 기대 출력도 명령 바로 아래에 적습니다.

#### 예시

```markdown
## 실행

입력: input/*.xlsx
결과: output/expense_result.xlsx

uv sync --locked
uv run python src/main.py
uv run python src/validate_result.py

성공 기준: 검사 6개 PASS, 종료 코드 0
```

#### 확인 목록

- 프로젝트 루트에서 실행할 명령인지 적습니다.
- 필요한 입력 파일의 위치와 형식을 적습니다.
- 생성되는 결과 파일의 정확한 경로를 적습니다.
- PASS 개수나 건수처럼 관찰 가능한 성공 기준을 적습니다.

## 새 폴더에서 README만 따라 확인합니다

### 기존 가상환경 없이 파일을 다시 받아 같은 결과가 생기는지 검사합니다

![새 폴더에 프로젝트 파일만 복사한 뒤 환경 설치와 실행 및 검사가 모두 통과한 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3f/3fc08ea17c9a5e77630362011f5049442ff3078c166f8e7ade8cc32c7728a23d.png "기존 가상환경을 제외한 프로젝트 파일이 새 폴더에서 다시 실행돼 같은 Excel 결과를 만듭니다")

내 컴퓨터에서 한 번 실행된 결과만으로는 다른 사람도 실행할 수 있는지 알 수 없습니다. `.venv`와
기존 `output`을 제외하고 새 폴더에 프로젝트를 받은 뒤 README의 세 명령만 실행해야 숨은 설정을 찾을
수 있습니다.

성공 기준은 명령이 끝났다는 사실보다 구체적이어야 합니다. `output/expense_result.xlsx`가 생기고,
약속한 시트와 행 수 및 금액 합계가 맞고, 검증 명령의 종료 코드가 `0`이어야 완료입니다.

#### 코드

```powershell
git clone <저장소-URL> expense-automation-check
Set-Location expense-automation-check
uv sync --locked
uv run python src/main.py
uv run python src/validate_result.py
```

#### 확인 목록

- 새 폴더에 기존 `.venv`가 없는지 확인합니다.
- `input`에 합성 Excel 파일이 있는지 확인합니다.
- 결과 파일의 시트 이름과 행 수 및 금액을 확인합니다.
- 검증 명령이 종료 코드 `0`으로 끝나는지 확인합니다.

#### 참고 자료

- [uv 프로젝트 명령 실행 공식 문서](https://docs.astral.sh/uv/concepts/projects/run/)
