---
title: uv Python 환경 만드는 방법: 다른 컴퓨터에서도 같은 패키지로 실행하기
slug: uv-python
author: eddmpython
section: Python 프로젝트 환경
summary: uv Python 환경을 Windows에서 만들고 다른 컴퓨터에서도 같은 패키지 목록으로 복원하는 방법을 설명합니다. pyproject.toml, uv.lock, .python-version, .venv의 차이를 이해하고 CSV를 Excel 보고서로 바꾸는 완성 프로젝트를 검증합니다.
readerQuestion: Python 프로젝트를 다른 컴퓨터에서도 같은 패키지 목록으로 실행하려면 uv의 프로젝트 파일과 명령을 어떻게 사용해야 할까?
readerTakeaway: 필요한 패키지는 pyproject.toml에, 해결된 버전은 uv.lock에 남기고 uv sync --locked와 uv run --locked로 프로젝트 전용 환경을 복원하고 검증한다.
readerLevel: beginner
readerStartingPoint: Python 파일을 실행하고 import를 본 적은 있지만 패키지 설치, 가상환경, 잠금 파일이 무엇인지 모른다.
primaryKeyword: uv Python 환경
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ee/ee2838cfef2ca70fb1c161bd28a8ba63e80e4b4f217c4fe38b7e8a05ee9079eb.png
ogImageAlt: 같은 Python 코드 파일이 패키지 목록이 다른 두 컴퓨터에서 성공과 실패로 나뉘는 장면
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

uv Python 환경을 만들지 않고 `main.py`만 다른 컴퓨터로 보내면 같은 코드가 다른 결과를 낼 수 있습니다.
한쪽에는 pandas가 설치되어 있지만 다른 쪽에는 없을 수 있고, 둘 다 설치되어 있어도 버전이 다를 수
있기 때문입니다. 코드는 필요한 패키지의 실제 설치 상태를 품고 있지 않습니다.

이 글에서는 Windows PowerShell에서 `expense_report` 프로젝트를 처음부터 만듭니다. 세 줄짜리 CSV를
pandas로 읽고 openpyxl을 이용해 `output/expense_report.xlsx`를 저장합니다.

마지막에는 새 폴더에 프로젝트 파일만 복사합니다. `uv sync --locked`와 `uv run --locked`로 같은
패키지 7개와 같은 보고서가 복원되는지 자동으로 확인합니다.

## 코드만 복사하면 환경은 따라오지 않습니다

### import가 요구하는 Python과 패키지는 .py 파일 밖에 설치되어 있습니다

![같은 Python 코드 파일이 패키지 목록이 다른 두 컴퓨터에서 성공과 실패로 나뉘는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ee/ee2838cfef2ca70fb1c161bd28a8ba63e80e4b4f217c4fe38b7e8a05ee9079eb.png "코드가 같아도 실행기와 설치된 패키지가 다르면 import 결과부터 달라집니다")

Python 파일에는 `import pandas as pd`라는 요청이 적힙니다. 그러나 `pandas` 프로그램 자체는
`main.py` 안에 들어 있지 않습니다. Python은 실행할 때 자신에게 연결된 패키지 설치 폴더를 찾아보고,
그곳에 pandas가 없으면 `ModuleNotFoundError`를 출력합니다.

여기서 패키지는 다른 사람이 만들어 배포한 Python 코드 묶음입니다. pandas처럼 직접 불러오는 패키지를
직접 의존성이라고 부릅니다. pandas가 계산을 위해 다시 사용하는 numpy와 python-dateutil은 간접
의존성입니다. 내 코드는 pandas만 불러와도 실행에는 이 간접 패키지까지 필요합니다.

Python 실행기도 설치 상태의 일부입니다. `python`이라는 같은 명령을 입력해도 컴퓨터마다 Python
3.12나 3.13이 선택될 수 있습니다. 그 Python에 연결된 패키지 폴더도 서로 다릅니다. 따라서 코드 파일,
Python 버전 요청, 직접 패키지 목록, 간접 패키지의 해결된 버전을 함께 남겨야 다른 컴퓨터에서 실행
조건을 다시 만들 수 있습니다.

#### 개념 확인: 코드 파일 밖에 있는 실행 조건 네 가지

아래 네 줄에서 공유된 것은 첫 줄뿐이라고 가정합니다. `main.py`는 실행할 행동을 담지만 나머지 세 줄의
설치 상태를 만들지 않습니다. 받는 사람이 어떤 Python과 패키지가 필요한지 추측해야 한다면 같은 실행을
재현했다고 말할 수 없습니다.

```text
main.py                 실행할 코드
Python 3.13             코드를 읽을 실행기
pandas, openpyxl        코드가 직접 사용하는 패키지
numpy, et-xmlfile 등    직접 패키지가 다시 필요로 하는 패키지
```

가상환경은 이 설치 상태를 프로젝트마다 분리하는 폴더입니다. 하지만 가상환경 폴더 자체를 복사하는
것만으로는 충분하지 않습니다. 내부 경로가 원래 컴퓨터를 가리킬 수 있고 운영체제에 맞는 실행 파일도
다르기 때문입니다. 필요한 정보를 작은 텍스트 파일로 남기고 각 컴퓨터에서 가상환경을 다시 만드는
편이 안전합니다.

이제 어떤 파일이 요구 사항을 남기고 어떤 폴더가 실제 설치물을 담는지 구분해야 합니다.

## 세 기록 파일과 .venv는 서로 다른 질문에 답합니다

### pyproject와 lock과 Python 요청이 .venv를 다시 만드는 재료가 됩니다

![프로젝트 설정 파일 세 개가 잠금과 설치 단계를 거쳐 가상환경 폴더를 만드는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/394387c08e52fd27fcc7dca3cad2b2acc77a59d42d4c42e2a0d1391345a327e7.png "세 기록 파일은 공유하고 실제 설치 폴더는 각 컴퓨터에서 다시 만듭니다")

uv 프로젝트의 시작점은 `pyproject.toml`입니다. 이 파일은 프로젝트 이름, 사용할 수 있는 Python 범위,
직접 의존성을 적습니다. `pandas>=3.0.5`는 3.0.5 이상 가운데 조건에 맞는 버전을 찾으라는 요구이지
항상 정확히 3.0.5를 설치하라는 뜻은 아닙니다.

`uv.lock`은 그 넓은 요구를 실제 버전 조합으로 푼 결과입니다. 버전을 선택하는 계산을 의존성 해결이라고
부릅니다. 잠금 파일에는 pandas뿐 아니라 numpy처럼 간접으로 필요한 패키지와 내려받을 파일의 해시,
Python 및 운영체제 조건이 기록됩니다. uv가 관리하는 파일이므로 사람이 손으로 고치지 않습니다.

`.python-version`은 이 프로젝트에서 먼저 찾을 Python 버전 요청입니다. 값이 `3.13`이면 uv는 사용
가능한 Python 3.13을 찾고, 기본 설정에서는 없을 때 내려받을 수 있습니다.

반면 `requires-python = ">=3.13"`은 이 프로젝트가 지원한다고 선언한 범위입니다. 전자는 현재
작업자가 고를 기본 실행기이고 후자는 프로젝트가 허용하는 범위이므로 같은 정보가 아닙니다.

`.venv`는 위 기록을 현재 컴퓨터에서 실행 가능한 파일로 펼친 결과입니다. Windows용
`python.exe`, 설치된 패키지, 실행 명령이 이 폴더 안에 들어갑니다. `uv sync`로 다시 만들 수 있으므로
Git에 올리거나 압축 파일에 넣지 않습니다.

#### 예상 결과: 공유 파일과 재생성 폴더가 나뉜 프로젝트 트리

아래 트리에서 공유할 대상은 `pyproject.toml`, `uv.lock`, `.python-version`, `src`, `input`입니다.
`.venv`와 `output`은 명령 실행으로 다시 생깁니다. `.gitignore`에 두 폴더를 적으면 실수로 수천 개의
설치 파일과 생성 보고서를 커밋하는 일을 막을 수 있습니다.

```text
expense_report/
├─ .gitignore            공유
├─ .python-version       공유
├─ input/                공유
│  └─ expenses.csv
├─ src/                  공유
│  ├─ main.py
│  └─ verify_project.py
├─ pyproject.toml        공유
├─ uv.lock               공유
├─ .venv/                다시 생성
└─ output/               다시 생성
```

#### 예시 코드: .venv와 output을 Git 공유에서 제외하기

이 파일의 입력은 프로젝트 안에서 공유하지 않을 두 폴더 이름입니다. Git은 `.gitignore`에 적힌 경로를
새 추적 대상으로 추가하지 않습니다. 이미 Git이 추적하던 파일을 자동으로 지우는 기능은 아니므로 새
프로젝트를 만들 때 먼저 두 줄을 저장하는 편이 분명합니다.

```gitignore
.venv/
output/
```

세 기록 파일과 한 설치 폴더의 차이를 알았으므로 이제 이 기록을 만들 uv 프로그램 자체를 설치하고
실행 경로를 확인할 차례입니다.

## Windows에서 uv 명령부터 확인합니다

### 설치 메시지보다 새 PowerShell에서 버전과 uv.exe 경로가 나오는지가 중요합니다

![WinGet 설치 명령 뒤 새 PowerShell에서 uv 실행 파일과 버전 결과가 나타나는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/3959b8ef6601e72d3eed80819592ae49617897a9e2c2b85f69e6de37fd085f0e.png "설치 완료 문구가 아니라 새 셸이 실제 uv.exe를 찾는지 확인해야 합니다")

uv는 Python 패키지와 Python 실행기를 관리하는 별도 프로그램입니다. 프로젝트마다 설치하는 pandas와
달리 컴퓨터에 한 번 설치해 여러 프로젝트에서 사용합니다. Python이 아직 없어도 uv의 독립 실행 파일을
먼저 설치할 수 있습니다.

Windows에서 `winget --version`이 동작하면 WinGet 패키지를 사용할 수 있습니다. 설치 뒤에는 열려 있던
PowerShell을 닫고 새 창을 엽니다. PATH는 PowerShell이 명령의 실행 파일을 찾을 때 차례로 살펴보는
폴더 목록입니다. 설치 프로그램이 uv 폴더를 PATH에 추가했더라도 이미 열린 셸은 이전 목록을 기억할
수 있기 때문입니다.

#### 실행 명령: WinGet으로 uv 설치하고 실행 경로 확인하기

첫 명령은 게시자와 패키지 ID가 정확히 일치하는 uv를 설치합니다. 둘째 명령은 실제 설치 버전을,
셋째 명령은 PowerShell이 선택한 `uv.exe`의 전체 경로를 출력합니다. 두 확인 명령이 모두 끝나야
프로젝트 작업으로 넘어갈 수 있습니다.

```powershell
winget install --id=astral-sh.uv -e
uv --version
(Get-Command uv).Source
```

`uv --version`이 명령을 찾을 수 없다고 나오면 새 PowerShell인지 먼저 확인합니다. WinGet 사용이
막힌 회사 컴퓨터에서는 임의로 실행 정책이나 보안 설정을 바꾸지 않습니다.

관리자가 허용한 설치 방법을 확인합니다. [uv 공식 Windows 설치 문서](https://docs.astral.sh/uv/getting-started/installation/)에는
독립 설치 파일과 다른 패키지 관리자 선택지가 함께 정리되어 있습니다.

uv 버전 숫자는 시간이 지나면 달라질 수 있습니다. 프로젝트 재현성은 모든 컴퓨터가 영원히 같은 uv
버전을 사용한다는 뜻이 아닙니다. 우선 `uv.lock`을 읽을 수 있는 uv가 설치되어 있고, 팀에서 도구 버전도
고정해야 한다면 별도의 설치 정책이나 CI 설정에 uv 버전을 명시해야 합니다.

uv 명령이 확인됐으므로 빈 프로젝트에 Python 요청과 패키지 요구 사항을 기록할 수 있습니다.

## 비용 보고서 프로젝트를 완성합니다

### 세 줄 CSV를 읽고 팀별 합계를 계산해 Excel 파일로 저장합니다

![세 행의 CSV가 검사와 팀별 합계를 거쳐 두 행의 Excel 보고서로 저장되는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/21/21725592f14ef798e8753a716b742c067f7beb2fcd93c57d2ec082c7ca567a01.png "입력 세 행을 보존한 채 코드가 두 팀의 합계와 비율을 새 Excel 파일에 기록합니다")

먼저 PowerShell에서 `expense_report` 폴더를 만들고 그 안으로 이동합니다. `uv init --bare`는 기존
폴더에 최소 `pyproject.toml`만 만듭니다. `uv python pin 3.13`은 `.python-version`을 만들고,
`uv add pandas openpyxl`은 두 직접 의존성을 설정과 잠금 파일에 기록한 뒤 `.venv`에 설치합니다.

#### 실행 명령: Python 3.13과 두 패키지 기록하기

입력은 빈 `expense_report` 폴더와 Python 3.13이라는 버전 요청입니다. `uv add`가 끝나면
`pyproject.toml`의 `dependencies`와 `uv.lock`이 함께 바뀝니다. 실행 시점에 선택되는 최신 호환
패키지에 따라 아래 하한 버전 숫자는 달라질 수 있습니다.

```powershell
New-Item -ItemType Directory -Path expense_report
Set-Location expense_report
uv init --bare --python 3.13
uv python pin 3.13
uv add pandas openpyxl
New-Item -ItemType Directory -Path input, src
```

검증한 프로젝트에서는 `uv add` 뒤 설정이 아래처럼 만들어졌습니다. `pandas>=3.0.5`는 직접 요구
사항이고, pandas가 필요로 하는 numpy 버전은 `pyproject.toml`이 아니라 `uv.lock`에서 관리됩니다.

#### 예시 코드: pyproject.toml의 직접 의존성 읽기

`requires-python`은 실행 가능한 Python 범위를, `dependencies`는 코드가 직접 사용하는 패키지를
보여 줍니다. 이 파일만 보면 간접 의존성의 정확한 버전은 알 수 없습니다. 그 답은 다음 절에서
`uv tree`와 잠금 파일로 확인합니다.

```toml
[project]
name = "expense-report"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "openpyxl>=3.1.5",
    "pandas>=3.0.5",
]
```

이제 `input/expenses.csv`를 만듭니다. 첫 줄은 열 이름이고 아래 세 줄은 실제 입력입니다. 금액은 쉼표나
원 기호가 없는 0 이상의 정수로 적습니다. 영업팀 두 건과 운영팀 한 건의 합계는
`120000 + 80000 + 50000`, 즉 250,000원입니다.

#### 입력 예시: 합계가 250,000원인 expenses.csv 만들기

이 입력으로 프로그램은 원본 행 3개를 읽고 팀별 결과 행 2개를 만들어야 합니다. 영업팀은 170,000원과
68퍼센트, 운영팀은 80,000원과 32퍼센트가 되어야 맞습니다. 이 숫자는 나중에 Excel 파일을 자동으로
검사할 기준이 됩니다.

```csv
team,amount
영업팀,120000
운영팀,80000
영업팀,50000
```

`src/main.py`는 프로젝트 루트의 입력과 출력을 절대 경로로 계산합니다. CSV 열 이름, 빈 팀 이름,
숫자가 아닌 금액, 음수, 소수 금액을 먼저 검사합니다. 팀별 합계를 만든 뒤 전체 금액이 0원인지도
확인합니다. 정상 데이터만 전체 비율을 계산해 `output/expense_report.xlsx`에 씁니다.

#### 예시 코드: CSV를 검사하고 팀별 Excel 보고서 만들기

입력은 방금 만든 CSV입니다. 핵심 동작은 `pd.to_numeric`으로 금액을 숫자로 확인하고,
`groupby`로 같은 팀의 금액을 더하는 부분입니다. 출력은 `팀별 합계` 시트 하나이며, 두 팀의 금액과
전체 대비 비율이 각각 한 행에 저장됩니다.

```python
from pathlib import Path
import sys

import openpyxl
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INPUT_FILE = PROJECT_ROOT / "input" / "expenses.csv"
OUTPUT_FILE = PROJECT_ROOT / "output" / "expense_report.xlsx"


def load_expenses(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"입력 파일을 찾을 수 없습니다: {path}")

    frame = pd.read_csv(path, encoding="utf-8-sig")
    expected_columns = ["team", "amount"]
    if list(frame.columns) != expected_columns:
        raise ValueError("첫 줄은 team,amount 두 열이어야 합니다")
    if frame.empty:
        raise ValueError("비용 데이터가 한 줄 이상 필요합니다")

    frame["team"] = frame["team"].astype("string").str.strip()
    if frame["team"].isna().any() or frame["team"].eq("").any():
        raise ValueError("team이 비어 있는 줄이 있습니다")

    numeric_amount = pd.to_numeric(frame["amount"], errors="coerce")
    if numeric_amount.isna().any():
        bad_row = int(numeric_amount[numeric_amount.isna()].index[0]) + 2
        raise ValueError(f"{bad_row}번째 줄의 amount는 숫자여야 합니다")
    if (numeric_amount < 0).any():
        bad_row = int(numeric_amount[numeric_amount < 0].index[0]) + 2
        raise ValueError(f"{bad_row}번째 줄의 amount는 0 이상이어야 합니다")
    if (numeric_amount % 1 != 0).any():
        bad_row = int(numeric_amount[numeric_amount % 1 != 0].index[0]) + 2
        raise ValueError(f"{bad_row}번째 줄의 amount는 정수여야 합니다")

    frame["amount"] = numeric_amount.astype("int64")
    return frame


def summarize_expenses(frame: pd.DataFrame) -> pd.DataFrame:
    total = int(frame["amount"].sum())
    if total == 0:
        raise ValueError("전체 금액 합계는 0보다 커야 합니다")

    summary = (
        frame.groupby("team", as_index=False, sort=True)["amount"]
        .sum()
        .sort_values("team", ignore_index=True)
    )
    summary["share"] = summary["amount"] / total
    return summary


def write_report(summary: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(exist_ok=True)
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        summary.to_excel(writer, index=False, sheet_name="팀별 합계")
        sheet = writer.sheets["팀별 합계"]
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
        sheet.column_dimensions["A"].width = 14
        sheet.column_dimensions["B"].width = 16
        sheet.column_dimensions["C"].width = 12
        for cell in sheet["B"][1:]:
            cell.number_format = "#,##0"
        for cell in sheet["C"][1:]:
            cell.number_format = "0.0%"


def main() -> None:
    expenses = load_expenses(INPUT_FILE)
    summary = summarize_expenses(expenses)
    write_report(summary, OUTPUT_FILE)

    print(f"Python: {sys.executable}")
    print(f"pandas: {pd.__version__}")
    print(f"openpyxl: {openpyxl.__version__}")
    print(f"입력: {len(expenses)}건, 합계 {int(expenses['amount'].sum()):,}원")
    print(f"출력: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
```

코드와 입력이 완성됐지만 아직 다른 컴퓨터에서 같은 설치 상태가 생긴다는 증거는 없습니다. 그 증거를
만들려면 `uv.lock`을 읽는 잠금과 `.venv`를 만드는 동기화를 구분해야 합니다.

## 잠금과 동기화는 다른 작업입니다

### lock은 버전을 결정하고 sync는 그 결정대로 .venv에 설치합니다

![넓은 패키지 요구가 잠금 단계에서 정확한 버전 트리로 결정되고 동기화 단계에서 가상환경에 설치되는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/36/36c687f492aac8d1f2909f53cf19d4b701c7326c965e8b51ffa96a7a178386cc.png "버전 계산과 파일 설치를 두 단계로 나누면 무엇이 바뀌었는지 확인할 수 있습니다")

잠금은 `pyproject.toml`의 넓은 조건을 만족하는 버전 조합을 계산해 `uv.lock`에 적는 작업입니다.
동기화는 잠금 파일에서 현재 운영체제와 Python에 해당하는 패키지를 골라 `.venv`에 설치하는 작업입니다.
`uv lock`은 설치 폴더를 만드는 명령이 아니고, `uv sync`는 버전 선택 결과를 실제 파일로 펼치는
명령입니다.

uv는 편의를 위해 두 작업을 자동으로 이어서 수행합니다. 기본 `uv run`은 잠금 파일과 환경이 최신인지
확인한 뒤 명령을 실행합니다. 기본 `uv sync`도 필요하면 잠금 파일을 갱신한 뒤 설치합니다. 혼자
실험할 때는 편리하지만 자동 검사나 다른 컴퓨터 복원에서는 파일이 몰래 바뀌지 않아야 합니다.

`--locked`는 현재 `pyproject.toml`을 해석했을 때 `uv.lock`을 바꿀 필요가 없는지 검사합니다. 잠금
파일이 없거나 오래됐으면 실행하지 않고 오류를 냅니다. `--frozen`은 최신인지 계산하지 않고 있는
잠금 파일을 그대로 사용합니다. 설정과 잠금 파일의 불일치를 놓칠 수 있으므로 새 컴퓨터 검증에는
`--locked`가 더 분명합니다.

#### 개념 확인: 직접 의존성과 간접 의존성 나눠 보기

`uv tree`의 입력은 현재 `pyproject.toml`과 `uv.lock`입니다. 맨 위의 openpyxl과 pandas는 직접
의존성이고 들여쓰기된 et-xmlfile, numpy, python-dateutil, tzdata 등은 간접 의존성입니다. 검증한
환경에서는 프로젝트 자체를 제외하고 설치 패키지 7개가 보였습니다.

```powershell
uv lock --check
uv tree
```

```text
expense-report v0.1.0
├── openpyxl v3.1.5
│   └── et-xmlfile v2.0.0
└── pandas v3.0.5
    ├── numpy v2.5.2
    ├── python-dateutil v2.9.0.post0
    │   └── six v1.17.0
    └── tzdata v2026.3
```

버전 숫자는 새로 잠글 때 달라질 수 있지만 이미 커밋한 `uv.lock`을 `--locked`로 사용하면 임의로
최신 버전을 다시 고르지 않습니다. uv의 프로젝트 잠금 파일은 운영체제와 Python 조건을 함께 담는
교차 플랫폼 파일입니다. 현재 컴퓨터에는 그중 조건에 맞는 항목만 설치됩니다.

#### 실행 명령: 잠금 파일을 바꾸지 않고 .venv 복원하기

첫 명령은 잠금 파일이 설정과 맞는지 확인하면서 `.venv`를 정확 동기화합니다. 기본 정확 동기화는
잠금 파일에 없는 불필요한 패키지를 제거할 수 있습니다. 둘째 명령은 현재 `.venv`의 Python 경로를
출력하므로 결과에 `expense_report\.venv`가 포함되는지 확인할 수 있습니다.

```powershell
uv sync --locked
uv run --locked python -X utf8 -c "import sys; print(sys.executable)"
```

`uv sync`는 프로젝트 환경을 잠금 상태와 정확히 맞추는 명령입니다. 다른 용도로 쓰는 공유 Python을
대상으로 지정하면 불필요하다고 판단한 패키지가 제거될 수 있습니다. 기본 프로젝트 위치의 `.venv`를
사용하고 시스템 Python 경로를 `UV_PROJECT_ENVIRONMENT`로 지정하지 않는 편이 초보자에게 안전합니다.

잠금과 설치가 끝났으므로 이제 활성화 명령에 의존하지 않고 보고서를 실행하고 결과 파일까지 검사할
수 있습니다.

## uv run으로 실행기와 결과를 확인합니다

### 프로젝트의 .venv Python으로 실행하고 Excel 셀 값까지 자동 검사합니다

![uv run이 프로젝트 가상환경의 Python과 잠긴 패키지를 선택해 Excel 결과와 검증 결과를 만드는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e6/e660fe9cc830f4d8af38fbe264aaf304317c394cb9d270fc84aaa22ad7499d0f.png "실행 경로, 패키지 버전, Excel 셀 값을 함께 확인해야 환경과 업무 결과가 모두 증명됩니다")

PowerShell에서 가상환경을 활성화하면 `python` 명령이 `.venv`를 먼저 찾도록 PATH가 잠시 바뀝니다.
`uv run`은 이 활성화 과정 없이 현재 프로젝트의 환경에서 명령을 실행합니다. 여러 터미널을 오갈 때
활성화 상태를 기억하지 않아도 명령 자체에 실행 범위가 남습니다.

한글 출력을 다른 프로그램이 읽을 때 Windows 기본 인코딩과 UTF-8이 충돌할 수 있습니다. 이 글은
`python -X utf8`을 사용해 표준 입출력과 기본 텍스트 처리를 UTF-8 모드로 실행합니다. 실제 검증에서
이 옵션이 없을 때 하위 프로세스의 한글 출력을 UTF-8로 읽지 못하는 오류를 확인했습니다.

#### 실행 명령: 잠긴 환경으로 비용 보고서 만들기

입력은 `input/expenses.csv`이고 실행 대상은 `src/main.py`입니다. `--locked`는 실행 전에 잠금 파일이
바뀌지 않는다는 조건을 검사합니다. 성공하면 Python 경로, pandas와 openpyxl 버전, 입력 건수와 합계,
생성된 Excel 파일 경로가 차례로 나옵니다.

```powershell
uv run --locked python -X utf8 src/main.py
```

#### 예상 결과: 실행기와 패키지와 보고서 경로 확인하기

아래 결과에서 가장 중요한 세 증거는 Python 경로 안의 `.venv`, 입력 합계 250,000원,
`output/expense_report.xlsx`입니다. 패키지 버전은 현재 잠금 파일에 따라 달라질 수 있지만 같은
`uv.lock`을 쓴 두 폴더에서는 같아야 합니다.

```text
Python: C:\작업폴더\expense_report\.venv\Scripts\python.exe
pandas: 3.0.5
openpyxl: 3.1.5
입력: 3건, 합계 250,000원
출력: C:\작업폴더\expense_report\output\expense_report.xlsx
```

터미널 메시지만 맞다고 Excel 내용까지 맞는 것은 아닙니다. `src/verify_project.py`는 같은 Python으로
`main.py`를 다시 실행하고, Excel 시트의 두 행을 직접 읽습니다. 잘못된 금액 `12만원`과 합계 0원을
넣은 임시 CSV도 만들어 두 오류가 실제로 발생하는지 함께 검사합니다.

#### 예시 코드: 실행기와 Excel 셀과 잘못된 입력 자동 검증하기

이 검사의 입력은 완성된 프로젝트와 잠긴 환경입니다. 핵심은 `sys.executable`이 `.venv` 안에 있는지,
Excel 행이 예상한 두 튜플과 같은지, 숫자가 아닌 금액과 합계 0원이 `ValueError`로 막히는지 확인하는
세 묶음입니다. 모두 통과하면 마지막 줄에 `uv Python 환경 검증 통과`가 출력됩니다.

```python
from pathlib import Path
import subprocess
import sys
import tempfile

import openpyxl

from main import load_expenses, summarize_expenses


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_FILE = PROJECT_ROOT / "src" / "main.py"
OUTPUT_FILE = PROJECT_ROOT / "output" / "expense_report.xlsx"


completed = subprocess.run(
    [sys.executable, "-X", "utf8", str(MAIN_FILE)],
    cwd=PROJECT_ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
    check=False,
)
assert completed.returncode == 0, completed.stderr
assert "입력: 3건, 합계 250,000원" in completed.stdout

venv_root = (PROJECT_ROOT / ".venv").resolve()
assert Path(sys.executable).resolve().is_relative_to(venv_root)

workbook = openpyxl.load_workbook(OUTPUT_FILE, data_only=True)
sheet = workbook["팀별 합계"]
rows = list(sheet.iter_rows(min_row=2, values_only=True))
assert [(team, amount, round(share, 2)) for team, amount, share in rows] == [
    ("영업팀", 170000, 0.68),
    ("운영팀", 80000, 0.32),
]

with tempfile.TemporaryDirectory() as temporary_directory:
    temporary_root = Path(temporary_directory)
    bad_input = temporary_root / "bad_expenses.csv"
    bad_input.write_text(
        "team,amount\n영업팀,120000\n운영팀,12만원\n",
        encoding="utf-8",
    )
    try:
        load_expenses(bad_input)
    except ValueError as error:
        assert "3번째 줄의 amount는 숫자여야 합니다" in str(error)
    else:
        raise AssertionError("잘못된 금액이 오류 없이 통과했습니다")

    zero_input = temporary_root / "zero_expenses.csv"
    zero_input.write_text(
        "team,amount\n영업팀,0\n운영팀,0\n",
        encoding="utf-8",
    )
    try:
        summarize_expenses(load_expenses(zero_input))
    except ValueError as error:
        assert "전체 금액 합계는 0보다 커야 합니다" in str(error)
    else:
        raise AssertionError("합계 0원이 오류 없이 통과했습니다")

print(f"검증한 Python: {sys.executable}")
print("uv Python 환경 검증 통과")
```

#### 실행 명령: 잠긴 Python으로 전체 프로젝트 검사하기

입력은 방금 저장한 검증 코드입니다. 이 명령도 `--locked`를 사용하므로 검사를 실행하면서 잠금 파일을
고치지 않습니다. 마지막 문구가 나오고 `output/expense_report.xlsx`가 열리면 환경과 업무 결과를
한 번에 확인한 것입니다.

```powershell
uv run --locked python -X utf8 src/verify_project.py
```

자동 검사가 정상 상태를 증명했다면 일부러 설정과 입력을 틀리게 만들어 오류가 어느 경계를 지키는지도
확인할 수 있습니다.

## 세 가지 실패를 원인별로 복구합니다

### 오래된 lock과 잘못된 입력과 다른 Python은 서로 다른 방법으로 고칩니다

![오래된 잠금 파일과 잘못된 CSV 값과 프로젝트 밖 Python이 각각 잠금 갱신과 값 수정과 uv run으로 복구되는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3c/3cf96f7ac03b07501104c128a070b895117bc20f065fa425214c9fd0d9c9b8c8.png "오류 메시지의 대상이 파일인지 값인지 실행기인지 먼저 구분해야 올바른 복구 명령을 고를 수 있습니다")

첫 번째 실패는 `pyproject.toml`만 손으로 바꾸고 `uv.lock`을 갱신하지 않은 경우입니다. 예를 들어
dependencies에 `rich>=13`을 추가한 뒤 `uv sync --locked`를 실행하면 uv는 잠금 파일을 바꿔야 한다고
판단하고 종료 코드 1로 멈춥니다. 이것은 설치 실패가 아니라 커밋할 두 파일이 서로 맞지 않는다는
검사 성공입니다.

#### 실패 예시: pyproject만 바꾸어 잠금 파일이 오래된 경우

입력은 rich가 추가된 설정과 rich가 없는 이전 잠금 파일입니다. `--locked`의 핵심 동작은 자동으로
고쳐 주는 것이 아니라 불일치를 발견하고 중단하는 것입니다. 오류에는 먼저 `uv lock`을 실행하라는
복구 방향이 함께 표시됩니다.

```powershell
uv sync --locked
```

```text
The lockfile at uv.lock needs to be updated, but --locked was provided.
To update the lockfile, run uv lock.
```

rich가 의도한 의존성이라면 `uv add rich`를 사용해 설정과 잠금 파일을 함께 바꾸는 편이 쉽습니다.
설정을 이미 검토해 직접 수정했다면 `uv lock`으로 새 해결 결과를 만든 뒤 Git diff에서
`pyproject.toml`과 `uv.lock`을 함께 확인합니다. 의도하지 않은 수정이라면 설정 파일을 원래대로
되돌리고 잠금을 갱신하지 않습니다.

#### 복구 코드: 의도한 패키지를 기록하고 잠금 상태 다시 확인하기

첫 명령은 직접 의존성과 잠금 결과를 함께 갱신합니다. 둘째와 셋째 명령은 잠금 파일이 최신인지,
환경이 그 잠금과 같은지 검사합니다. 마지막 트리에서 rich와 그 간접 의존성이 나타나면 변경이
실제 설치까지 이어졌습니다.

```powershell
uv add rich
uv lock --check
uv sync --locked
uv tree
```

두 번째 실패는 입력 값 문제입니다. `amount`에 `12만원`을 쓰면 pandas가 정수로 바꿀 수 없습니다.
코드는 `3번째 줄의 amount는 숫자여야 합니다`라고 입력 파일의 위치를 알려 줍니다. 이때 패키지를
재설치해도 해결되지 않으며 CSV를 `120000`처럼 숫자만 남기도록 고쳐야 합니다.

#### 실패 예시: 금액 칸에 글자를 넣었을 때

아래 입력은 열 이름과 첫 행은 맞지만 셋째 줄의 금액이 숫자가 아닙니다. 프로그램은 틀린 값을 0으로
바꾸거나 행을 버리지 않고 종료합니다. 값을 `120000`으로 고친 뒤 같은 실행 명령을 다시 사용하면
정상 보고서가 만들어집니다.

```csv
team,amount
영업팀,120000
운영팀,12만원
```

```text
ValueError: 3번째 줄의 amount는 숫자여야 합니다
```

세 번째 실패는 프로젝트 밖 Python을 실행한 경우입니다. `python src/main.py`가 전역 Python을
가리키면 pandas가 없거나 다른 버전일 수 있습니다.

먼저 `python -c "import sys; print(sys.executable)"`의 결과와 `uv run` 결과를 비교합니다. 명령을
`uv run --locked python -X utf8 src/main.py`로 바꾸면 프로젝트의 `.venv`가 선택됩니다.

오류 경계를 구분했으므로 이제 패키지를 바꿀 때 기존 잠금을 무조건 최신으로 밀어 올리지 않는 관리
방법과 uv가 맞지 않는 경우를 살펴볼 수 있습니다.

## 패키지 변경은 작게 잠그고 검토합니다

### add와 remove와 단일 업그레이드로 pyproject와 lock의 차이를 함께 봅니다

![한 패키지만 추가 제거 업그레이드할 때 설정 파일과 잠금 트리의 작은 부분만 함께 바뀌는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/91/917208e2fbd8e420072e1cf6634281e4718723857dd6e939ba6904f74a069345.png "패키지 명령 뒤 두 파일의 차이를 같이 보면 직접 요구와 간접 버전 변화를 구분할 수 있습니다")

`uv add`는 직접 의존성을 추가하고, `uv remove`는 직접 의존성에서 뺍니다. 두 명령은 필요한 경우
잠금 파일과 `.venv`도 함께 갱신합니다. `.venv` 안에서 `pip install`만 실행하면 현재 컴퓨터에는
패키지가 생겨도 `pyproject.toml`에 기록되지 않아 다른 컴퓨터가 복원할 수 없습니다.

기존 `uv.lock`이 있으면 uv는 조건을 만족하는 한 이미 잠긴 버전을 선호합니다. 모든 패키지를 한꺼번에
올리려면 `uv lock --upgrade`를 사용하지만 바뀌는 범위가 커집니다. pandas 하나만 검토하려면
`uv lock --upgrade-package pandas`를 사용하고 잠금 파일 차이와 자동 검사를 확인하는 편이 작습니다.

#### 실행 명령: 하나씩 추가 제거하고 선택적으로 업그레이드하기

각 명령의 입력은 현재 설정과 잠금 파일입니다. `add`와 `remove` 뒤에는 두 파일의 Git diff를 보고,
업그레이드 뒤에는 pandas뿐 아니라 호환성을 맞추기 위해 바뀐 간접 패키지도 확인합니다. 마지막 두
명령이 통과해야 변경된 환경에서도 보고서 결과가 그대로라는 증거가 생깁니다.

```powershell
uv add rich
uv remove rich
uv lock --upgrade-package pandas
uv lock --check
uv run --locked python -X utf8 src/verify_project.py
```

테스트나 코드 검사에만 쓰는 패키지는 `uv add --dev pytest`처럼 개발 의존성 그룹에 둘 수 있습니다.
기본 `uv sync`에는 dev 그룹이 포함되지만 운영 설치에서 `uv sync --no-dev`로 제외할 수 있습니다.

처음부터 모든 패키지를 dev로 분류할 필요는 없습니다. 실행 코드가 import하는 pandas와 openpyxl은
일반 dependencies에 두어야 합니다.

둘 다 프로젝트별 가상환경을 만들 수 있습니다. uv의 장점은 `pyproject.toml`과 교차 플랫폼 잠금 파일,
Python 설치와 실행 명령을 한 프로젝트 작업 방식으로 연결하는 데 있습니다. 이미
`requirements.txt`, 사내 설치 서버, 기존 배포 절차가 안정적으로 운영된다면 즉시 모두 바꾸기보다
작은 프로젝트에서 변환 결과를 검증하는 편이 맞습니다.

#### 설명 목록: uv 프로젝트와 venv 및 pip 선택 기준

| 질문 | uv 프로젝트 | python -m venv와 pip |
|---|---|---|
| 직접 의존성 기록 | pyproject.toml | requirements 입력 파일이나 별도 문서 |
| 해결 버전 기록 | uv.lock | pip freeze 결과 또는 pip-tools 산출물 |
| 환경 만들기 | uv sync | venv 생성 뒤 pip install |
| 프로젝트 실행 | uv run | 활성화 뒤 python 실행 |
| 기존 도구 호환 | 필요하면 uv export | requirements.txt를 바로 사용 |

uv가 편리하다는 이유로 모든 설치 문제를 해결한다고 말할 수는 없습니다. 잠금 파일이 무엇을 고정하지
못하는지 알아야 재현성의 범위를 정확히 설명할 수 있습니다.

## 잠금 파일 밖의 차이도 확인합니다

### 같은 lock은 패키지를 고정하지만 운영체제와 입력 데이터까지 같게 만들지는 않습니다

![같은 잠금 파일이 두 컴퓨터의 패키지 트리를 맞추지만 운영체제 파일과 입력 데이터는 별도 영역에 남는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/66/663ad7a764baab250bc9dd3c7ba400c1575d2a6064d1492edf72ddf57627fe8f.png "잠금 파일 안의 Python 패키지와 그 밖의 운영체제 및 입력 조건을 분리해서 읽어야 합니다")

`uv.lock`은 Python 버전과 운영체제 조건에 따라 설치할 패키지 버전과 출처를 기록합니다. 교차 플랫폼
잠금 파일이므로 Windows와 macOS에서 같은 파일을 사용할 수 있지만 플랫폼 조건이 붙은 패키지는 서로
다른 항목이 선택될 수 있습니다. 같은 잠금 파일이 모든 운영체제에서 바이트까지 같은 `.venv`를
만든다는 뜻은 아닙니다.

`.python-version`의 `3.13`은 Python 3.13 계열 요청입니다. 패치 버전까지 고정하려면
`uv python pin 3.13.7`처럼 전체 버전을 적을 수 있지만, 그 배포본이 대상 플랫폼에서 제공되는지도
확인해야 합니다. `requires-python = ">=3.13"`은 더 넓은 범위이므로 지원 범위와 작업 기본값을
혼동하지 않습니다.

잠금 파일은 운영체제에 설치된 Excel, 외부 명령, GPU 드라이버, 회사 인증서, 환경 변수, 입력 CSV
내용을 기록하지 않습니다. 이 프로젝트는 Excel 프로그램 없이 openpyxl로 `.xlsx`를 만들 수 있지만
다른 프로젝트가 외부 프로그램이나 시스템 라이브러리를 부르면 별도 설치 문서와 검사가 필요합니다.

또한 잠금은 보안 업데이트를 자동으로 가져오지 않습니다. 같은 버전을 계속 설치하는 것이 재현성에는
도움이 되지만 오래된 취약 버전을 안전하게 만들지는 않습니다. 정해진 주기에 패키지 업데이트를
검토하고 전체 검증을 통과한 새 `uv.lock`을 커밋해야 합니다.

아래 앞 네 항목은 이 프로젝트 파일과 명령으로 확인할 수 있습니다. 뒤 네 항목은 잠금 파일만으로
증명되지 않으므로 프로젝트가 실제로 사용한다면 별도 검사 대상이 됩니다.

#### 확인 목록: 같은 환경이라고 말할 수 있는 증거 구분하기

- 확인 가능: 직접 및 간접 Python 패키지 버전
- 확인 가능: 선택된 Python 버전 요청과 실제 실행기 경로
- 확인 가능: 잠금 파일이 설정과 일치하는지 여부
- 확인 가능: CSV 입력으로 만든 Excel 셀 값
- 별도 확인: Windows와 macOS의 운영체제 파일 차이
- 별도 확인: 외부 프로그램과 드라이버 버전
- 별도 확인: 비밀값과 환경 변수의 실제 내용
- 별도 확인: 공유 뒤 바뀐 입력 데이터의 내용

재현성의 경계를 알았으므로 마지막에는 새 컴퓨터를 흉내 낸 빈 폴더에서 패키지와 결과가 실제로
복원되는지 확인합니다.

## 새 폴더에서 같은 환경을 증명합니다

### 공유 파일만 복사해 패키지 7개와 Excel 결과를 다시 만듭니다

![공유 파일만 있는 빈 프로젝트 폴더가 동기화와 실행 검증을 거쳐 같은 패키지 트리와 Excel 보고서를 만드는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2f/2f4b25f3e8a90607c5b32886714681a62803c9e6174fbaede024cd6cc71a0471.png "기존 .venv를 복사하지 않은 상태에서 같은 잠금과 결과가 나와야 복원이 증명됩니다")

새 컴퓨터 검증의 핵심은 기존 `.venv`를 사용하지 않는 것입니다. 이 글의 실제 검사에서는
`pyproject.toml`, `uv.lock`, `.python-version`, `.gitignore`, `input`, `src`만 새 `replica` 폴더에
복사했습니다. 그 폴더에는 Python 실행 파일이나 설치된 패키지가 없는 상태에서 시작했습니다.

`uv sync --locked`는 Python 3.13.7을 찾아 새 `.venv`를 만들고 패키지 7개를 설치했습니다. 원래
프로젝트와 복제 폴더의 `uv.lock` SHA-256은 같았고, `uv pip freeze`로 읽은 패키지 이름과 버전 7개도
모두 같았습니다. 복제 폴더의 자동 검사도 같은 두 팀과 250,000원 합계를 확인했습니다.

#### 실행 명령: 새 컴퓨터에서 잠금 파일과 결과 검증하기

프로젝트 파일을 받은 뒤 PowerShell에서 루트 폴더를 엽니다. 첫 명령은 잠금 파일을 바꾸지 않고
`.venv`를 만들고, 둘째 명령은 잠금과 설정의 일치를 다시 확인합니다. 셋째 명령이 성공하면 설치
목록뿐 아니라 실제 업무 결과까지 복원된 것입니다.

```powershell
Set-Location C:\작업폴더\expense_report
uv sync --locked
uv lock --check
uv run --locked python -X utf8 src/verify_project.py
```

#### 실행 명령: 잠금 해시와 설치 목록을 두 폴더에서 비교하기

아래 두 명령을 원래 폴더와 새 폴더에서 각각 실행합니다. `Get-FileHash`의 `Hash`가 같으면 잠금 파일의
내용이 같다는 뜻이고, `uv pip freeze`의 패키지 이름과 버전 줄이 모두 같으면 두 `.venv`의 Python
패키지 목록이 같다는 뜻입니다. 경로만 보고 같다고 판단하지 않고 재생성에 사용한 기록과 실제 설치
목록을 따로 비교합니다.

```powershell
Get-FileHash .\uv.lock -Algorithm SHA256
uv pip freeze
```

#### 예상 결과: 새 .venv와 Excel 보고서가 함께 복원됐는지 읽기

아래 두 줄이 보이면 실행 중인 Python이 새 프로젝트의 `.venv` 안에 있고 전체 검사가 끝났다는
뜻입니다. 확인이 더 필요하면 `uv tree`로 패키지 트리를 보고 Excel의 `팀별 합계` 시트에서 영업팀
170,000원과 운영팀 80,000원을 직접 확인할 수 있습니다.

```text
검증한 Python: C:\작업폴더\expense_report\.venv\Scripts\python.exe
uv Python 환경 검증 통과
```

이 절차에서 공유한 것은 설치 폴더가 아니라 요구 사항과 해결 결과입니다. `pyproject.toml`은 무엇이
필요한지, `uv.lock`은 어떤 버전 조합을 선택했는지 말합니다. `.python-version`은 어떤 Python을
먼저 찾을지 기록합니다.

새 컴퓨터에서는 `uv sync --locked`로 설치 상태를 만듭니다. 이어 `uv run --locked`로 코드와 검사를
같은 환경에서 실행하면 됩니다.

#### 참고 자료: uv 프로젝트 파일과 동기화 원리 더 읽기

- [uv 프로젝트 파일 구조](https://docs.astral.sh/uv/concepts/projects/layout/)
- [uv 잠금과 동기화](https://docs.astral.sh/uv/concepts/projects/sync/)
- [uv Python 버전 선택](https://docs.astral.sh/uv/concepts/python-versions/)
