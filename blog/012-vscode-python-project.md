---
title: VS Code Python 실행 방법: 프로젝트 폴더부터 결과 확인까지
slug: vscode-python
author: eddmpython
section: Python 프로젝트 환경
summary: VS Code Python 실행 방법을 설치 확인부터 프로젝트 폴더, 인터프리터, 터미널, 디버깅 순서로 설명합니다. CSV를 읽는 완성 예제를 실행하고 결과 파일과 실행기까지 검증합니다.
readerQuestion: VS Code에서 올바른 Python과 프로젝트 폴더를 연결하고 같은 스크립트를 반복해서 실행하려면 어떻게 할까?
readerTakeaway: 프로젝트 루트를 VS Code로 열고 프로젝트용 Python을 선택한 뒤 전체 파일을 실행하고 터미널 경로와 결과 파일로 성공을 확인한다.
readerLevel: beginner
readerStartingPoint: VS Code와 Python을 함께 써 본 적이 없고 편집기, 확장, 인터프리터, 작업 폴더, 디버깅의 뜻을 모른다.
primaryKeyword: VS Code Python 실행
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fdc46eac15dde00678bbe97bbc1632bb1ea52bfa990675fc5cd04186ce4b7c7f.png
ogImageAlt: 코드 파일이 Python 확장과 선택된 인터프리터를 거쳐 터미널 결과로 이어지는 장면
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

VS Code Python 실행을 처음 시도하면 오른쪽 위 재생 버튼만 누르기 쉽습니다. 그런데 VS Code와 Python은
서로 다른 프로그램입니다. 프로젝트 폴더와 실행할 Python이 연결되지 않으면 같은 파일도 다른 결과를
내거나 입력 파일을 찾지 못합니다.

이 글에서는 아무 파일도 없는 상태에서 `expense_project`를 만듭니다. CSV 입력 3행을 읽고
`output/report.txt`에 `3건, 합계 250,000원`을 저장합니다. 마지막에는 실행에 사용한 Python 경로와
결과 파일을 별도 검사 코드로 확인합니다.

## VS Code와 Python을 따로 확인합니다

### 편집기와 확장 및 실행기가 서로 다른 프로그램이라는 사실부터 확인합니다

![코드 파일이 Python 확장과 선택된 인터프리터를 거쳐 터미널 결과로 이어지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fdc46eac15dde00678bbe97bbc1632bb1ea52bfa990675fc5cd04186ce4b7c7f.png "VS Code가 파일을 전달하고 실제 계산은 선택된 Python이 수행하는 순서로 읽습니다")

VS Code는 폴더와 파일을 보여 주는 편집기입니다. Microsoft의 Python 확장은 자동 완성, 실행 버튼,
인터프리터 선택, 디버깅 기능을 VS Code에 더합니다. 인터프리터는 `.py` 파일의 명령을 실제로 읽고
실행하는 Python 프로그램입니다.

Python 확장을 설치해도 Python 자체가 함께 설치되지는 않습니다. 반대로 Python만 설치하면
PowerShell에서 코드는 실행할 수 있지만 VS Code의 Python 실행 버튼과 디버거를 제대로 쓰기 어렵습니다.
따라서 세 가지가 모두 있는지 따로 확인해야 합니다.

VS Code 왼쪽의 Extensions 아이콘을 누르고 게시자가 Microsoft인 `Python` 확장을 찾습니다. 설치 뒤
`Ctrl+Shift+X`를 눌러 설치 목록에서 Python과 Python Debugger를 확인합니다. Python Debugger는 현재
Python 확장과 함께 자동 설치됩니다.

Windows에서는 `py`가 설치된 Python을 찾는 실행 도구입니다. `py -3 --version`이 버전을 보여 주면
Python 3가 설치된 것입니다. `code --version`이 동작하지 않아도 VS Code 메뉴로 작업할 수 있지만,
나중에 `code .` 명령으로 폴더를 열려면 설치 과정에서 PATH 연결이 필요합니다.

#### 실행 명령: 편집기와 Python 설치 상태 확인하기

아래 명령에는 입력 파일이 필요하지 않습니다. 첫 명령은 VS Code 명령 도구를, 둘째 명령은 설치된
Python 3를 확인합니다. 마지막 명령은 설치된 확장 목록에서 Microsoft Python 확장의 식별자를 찾으며,
정상이라면 버전 문자열과 `ms-python.python`이 차례로 보입니다.

```powershell
code --version
py -3 --version
code --list-extensions | Select-String "ms-python.python"
```

명령을 찾을 수 없다는 오류가 나오면 코드를 작성하기 전에 설치를 고칩니다. VS Code, Python 3,
Python 확장이 모두 확인되면 비로소 편집기 안에서 실행 대상을 연결할 수 있습니다. 공식 설치 순서는
[VS Code의 Python 시작 안내](https://code.visualstudio.com/docs/python/python-tutorial)에서도 확인할 수 있습니다.

## 프로젝트 루트 폴더를 엽니다

### Explorer 맨 위에 입력과 코드와 결과를 모두 품은 한 폴더가 보여야 합니다

![단일 파일만 연 창과 input, output, src를 모두 품은 프로젝트 루트 창을 비교한 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f6418b88632b856ad681ea6b5d09aaff1d52647547adf5b80a2b33a88fa948de.png "오른쪽 창처럼 세 하위 폴더가 같은 루트 아래에 있어야 파일 위치를 함께 추적할 수 있습니다")

VS Code에서 폴더를 열면 그 폴더가 작업 공간의 루트가 됩니다. 작업 공간은 현재 창이 기억하는 프로젝트
범위입니다. Explorer의 파일 트리, 폴더별 설정, 디버깅 설정, 새 터미널의 시작 위치가 이 루트를 기준으로
연결됩니다.

`main.py` 파일 하나만 열어도 글자는 수정할 수 있습니다. 그러나 어느 폴더가 프로젝트의 시작인지
VS Code가 알지 못하므로 폴더 전용 설정과 디버깅 구성이 줄어듭니다. `src`만 열면 `input`과 `output`이
Explorer 바깥에 놓여 파일을 찾기 어렵습니다.

이 글의 루트 이름은 `expense_project`입니다. 그 아래 `input`, `output`, `src` 세 폴더를 나란히 둡니다.
`input`은 사람이 준비한 원본, `src`는 실행할 코드, `output`은 코드가 새로 만든 결과를 담습니다.
세 폴더가 같은 깊이에 있어야 전체 작업을 한 화면에서 비교할 수 있습니다.

#### 실행 명령: 빈 프로젝트 폴더 만들고 VS Code로 열기

첫 명령은 현재 PowerShell 위치 아래에 프로젝트 폴더를 만들고, 둘째 명령은 그 안으로 이동합니다.
세 번째 명령은 세 하위 폴더를 만들며, 마지막 `code .`의 점은 지금 있는 `expense_project` 전체를
열라는 뜻입니다. 실행 뒤 Explorer 맨 위에 루트 이름이 보여야 합니다.

```powershell
New-Item -ItemType Directory -Path expense_project
Set-Location expense_project
New-Item -ItemType Directory -Path input, output, src
code .
```

`expense_project`가 이미 있다면 첫 명령은 생략하고 그 폴더로 이동합니다. 메뉴를 쓰려면 VS Code에서
`File`, `Open Folder`를 차례로 누른 뒤 `expense_project`를 선택합니다. 공식 문서도 폴더 하나를 열면
그 폴더가 단일 폴더 작업 공간이 된다고 설명합니다.

#### 예상 결과: Explorer에서 확인할 프로젝트 트리

아래 트리는 Explorer에 보여야 할 입력입니다. 지금은 세 폴더만 있고 파일은 아직 없습니다. 핵심은
`src`가 맨 위가 아니라 `expense_project` 아래에 있다는 점이며, 다음 절에서 `.venv`가 같은 루트에
추가됩니다.

```text
expense_project/
├─ input/
├─ output/
└─ src/
```

프로젝트 루트를 열었으므로 VS Code는 어떤 폴더의 Python을 선택해야 하는지 판단할 기준을 얻었습니다.
이제 컴퓨터 전체의 Python과 이 프로젝트만 쓰는 Python을 구분할 차례입니다.

## 프로젝트용 Python을 선택합니다

### 상태 표시줄과 새 터미널이 같은 .venv 실행기를 가리키게 만듭니다

![프로젝트 안의 실행기 하나가 선택되어 상태 표시줄과 새 터미널 양쪽으로 연결된 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/28/2849cbe71d3bfab2d809130f5269575ae5d441c1d26b1b98c791bdd99c96dfe3.png "여러 실행기 중 프로젝트 폴더 안의 하나를 골라 편집기와 터미널의 실행 대상을 맞춥니다")

한 컴퓨터에는 Python이 여러 개 있을 수 있습니다. 각 Python은 버전뿐 아니라 설치된 패키지 목록도
따로 가질 수 있습니다. VS Code의 인터프리터 선택은 실행 버튼, 자동 완성, 디버거가 어느 Python을
사용할지 정합니다.

프로젝트 안에만 쓰는 Python 공간을 가상환경이라고 합니다. 이 글에서는 루트의 `.venv` 폴더에 만듭니다.
다른 프로젝트가 나중에 다른 패키지 버전을 설치해도 `.venv`끼리는 섞이지 않습니다. 표준 라이브러리만
쓰는 이번 예제도 실행 대상을 눈으로 확인하기 위해 가상환경을 사용합니다.

`Ctrl+Shift+P`로 명령 팔레트를 열고 `Python: Create Environment`를 선택할 수 있습니다. 이어 `Venv`와
설치된 Python을 고르면 `.venv`가 생깁니다. 터미널 명령을 선호하면 아래와 같이 같은 폴더를 만들 수
있습니다.

#### 실행 명령: 프로젝트 루트에 .venv 만들기

입력은 설치된 Python 3이고 출력은 프로젝트 루트의 `.venv` 폴더입니다. `-m venv`는 Python에 포함된
가상환경 도구를 실행합니다. 명령이 조용히 끝나고 Explorer에 `.venv`가 나타나면 생성에 성공한 것이며,
아직 선택까지 끝난 것은 아닙니다.

```powershell
py -3 -m venv .venv
```

다시 `Ctrl+Shift+P`를 누르고 `Python: Select Interpreter`를 실행합니다. 목록에서 경로에
`expense_project\.venv`가 들어 있는 항목을 고릅니다. 현재 공식 환경 문서에 따르면 선택된 환경은
코드 실행, 디버깅, 자동 완성에 함께 사용됩니다.

선택 뒤에는 기존 터미널을 휴지통 아이콘으로 닫고 `Terminal`, `New Terminal`을 누릅니다. Python 확장은
새 터미널에 선택된 환경을 자동으로 활성화합니다. 상태 표시줄의 선택만 바꾼 뒤 오래 열어 둔 터미널을
계속 쓰면 두 실행기가 다를 수 있으므로 새 터미널에서 경로를 확인하는 편이 안전합니다.

#### 실행 명령: 선택된 Python의 실제 파일 경로 확인하기

이 명령은 현재 터미널에서 `python`이라는 이름으로 실행되는 프로그램을 입력으로 삼습니다.
`sys.executable`은 그 프로그램의 실제 파일 경로를 출력합니다. 결과에 프로젝트의 `.venv`가 들어 있으면
상태 표시줄과 터미널이 같은 프로젝트용 Python을 가리킨다는 뜻입니다.

```powershell
python -c "import sys; print(sys.executable)"
```

경로가 `.venv\Scripts\python.exe`로 끝나지 않으면 상태 표시줄에서 인터프리터를 다시 선택하고 새
터미널을 엽니다. 이제 실행할 Python이 고정됐으므로 그 Python에 건넬 입력 파일과 코드를 만들 수
있습니다.

## 입력과 결과가 있는 코드를 만듭니다

### CSV 세 행을 읽어 건수와 합계를 report.txt에 저장하는 프로젝트를 완성합니다

![CSV 입력 파일의 세 행이 Python 코드에서 검사되고 합계 결과 파일로 저장되는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6c/6cc78d178605421a17d6e744aed05c7f6825d72ded36f50bcd07bbf6915590d3.png "원본 CSV는 그대로 두고 검사된 건수와 합계만 output의 새 파일로 이동합니다")

연습 코드도 입력과 출력이 있어야 실행 성공을 판단할 수 있습니다. 이 프로젝트의 입력은
`input/expenses.csv`, 행동은 `src/main.py` 실행, 출력은 `output/report.txt`입니다. 단순한 `print` 한
줄보다 파일의 위치와 저장 결과까지 확인할 수 있습니다.

CSV는 쉼표로 칸을 나눈 텍스트 파일입니다. 첫 줄의 `team`과 `amount`는 각 칸의 이름이고, 아래 세 줄은
실제 비용입니다. 한글이 있는 파일은 Excel에서 저장될 때 BOM이라는 표시가 붙을 수 있어 코드는
`utf-8-sig`로 읽습니다.

#### 입력 예시: 팀 이름과 금액이 있는 expenses.csv 만들기

Explorer의 `input` 폴더에서 새 파일을 만들고 이름을 `expenses.csv`로 정합니다. 아래 네 줄이 이
프로그램의 입력이며, 금액에는 원 표시나 쉼표를 넣지 않습니다. 세 데이터 행의 금액을 더하면
`120000 + 80000 + 50000`, 즉 `250000`이 되어야 합니다.

```csv
team,amount
영업팀,120000
운영팀,80000
영업팀,50000
```

`src` 폴더에는 `main.py`를 만듭니다. 코드는 먼저 자기 파일의 위치에서 프로젝트 루트를 계산합니다.
그 뒤 CSV의 열 이름과 각 금액을 검사하고, 건수와 합계를 구해 결과 파일을 씁니다. 잘못된 입력은
틀린 합계로 숨기지 않고 어느 줄이 문제인지 오류로 알립니다.

#### 예시 코드: CSV를 검사하고 합계 보고서 저장하기

입력은 방금 만든 CSV이고 핵심 동작은 `read_expenses`가 문자열 금액을 정수로 바꾸는 부분과 `sum`이
세 금액을 더하는 부분입니다. 정상 실행이면 터미널에 Python 경로, 현재 폴더, 입력과 출력 경로,
`3건, 합계 250,000원`이 나타나고 같은 합계가 `report.txt`에 저장됩니다.

```python
import csv
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INPUT_FILE = PROJECT_ROOT / "input" / "expenses.csv"
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_FILE = OUTPUT_DIR / "report.txt"


def read_expenses(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        raise FileNotFoundError(f"입력 파일이 없습니다: {path}")

    with path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != ["team", "amount"]:
            raise ValueError("첫 줄은 team,amount여야 합니다")

        expenses: list[dict[str, object]] = []
        for line_number, row in enumerate(reader, start=2):
            if None in row or row["team"] is None or row["amount"] is None:
                raise ValueError(f"{line_number}번째 줄의 칸 수가 두 개가 아닙니다")

            team = row["team"].strip()
            amount_text = row["amount"].replace(",", "").strip()

            if not team:
                raise ValueError(f"{line_number}번째 줄의 팀 이름이 비었습니다")
            try:
                amount = int(amount_text)
            except ValueError as error:
                raise ValueError(
                    f"{line_number}번째 줄의 금액이 숫자가 아닙니다: {amount_text}"
                ) from error

            expenses.append({"team": team, "amount": amount})

    return expenses


def main() -> None:
    expenses = read_expenses(INPUT_FILE)
    total = sum(int(item["amount"]) for item in expenses)
    report = f"{len(expenses)}건, 합계 {total:,}원"

    OUTPUT_DIR.mkdir(exist_ok=True)
    OUTPUT_FILE.write_text(report, encoding="utf-8")

    print(f"Python 실행기: {sys.executable}")
    print(f"현재 폴더: {Path.cwd()}")
    print(f"입력 파일: {INPUT_FILE}")
    print(report)
    print(f"결과 파일: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
```

`PROJECT_ROOT`는 터미널의 현재 위치가 아니라 `main.py`가 저장된 위치를 기준으로 계산됩니다.
`parents[1]`은 `src`의 한 단계 위인 `expense_project`를 뜻합니다. 그래서 코드에서
`input/expenses.csv`와 `output/report.txt`의 전체 경로를 안정적으로 만들 수 있습니다.

`if __name__ == "__main__"`은 이 파일을 직접 실행했을 때만 `main()`을 부릅니다. 나중에 다른 검사
코드가 함수를 불러올 때 자동 실행되는 일을 막습니다. 이 한 줄이 실행 버튼의 동작을 바꾸지는 않지만,
파일을 다시 사용할 수 있게 경계를 분명히 합니다.

#### 예상 결과: report.txt에 저장될 한 줄 확인하기

코드가 읽은 데이터 행은 셋이고 합계는 250000입니다. 출력 파일에는 아래 한 줄만 저장됩니다. 터미널의
실행기와 경로 정보는 문제를 찾기 위한 기록이므로 파일에 넣지 않았으며, 실제 파일 내용과 이 값이
정확히 같아야 정상입니다.

```text
3건, 합계 250,000원
```

입력과 코드와 예상 출력이 모두 준비됐습니다. 이제 실행 전에 터미널이 가리키는 폴더와 Python이 각각
무엇인지 구분해야 경로 오류와 패키지 오류를 빠르게 찾을 수 있습니다.

## 터미널의 두 위치를 확인합니다

### 현재 폴더와 Python 실행기 경로가 서로 다른 정보라는 사실을 확인합니다

![프로젝트 루트 폴더와 .venv의 Python 파일이 서로 다른 경로로 표시되고 한 실행 명령에 합쳐지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7e/7e6f46d9932191e2ec5474f83a32c9ad7264035be7ab84d33b920d41618477aa.png "명령을 찾는 Python 경로와 파일을 찾는 현재 폴더를 각각 확인한 뒤 실행합니다")

VS Code 통합 터미널은 편집기 아래에서 PowerShell 같은 셸을 실행하는 칸입니다. 기본적으로 Explorer에
연 프로젝트 루트에서 시작합니다. `Get-Location`은 명령이 파일을 찾기 시작하는 현재 폴더를 보여 주고,
`sys.executable`은 `python` 명령이 실제로 연 프로그램 파일을 보여 줍니다.

두 경로는 서로 다른 질문에 답합니다. 현재 폴더가 틀리면 `src/main.py` 같은 상대 경로를 찾지 못합니다.
Python 실행기가 틀리면 파일은 찾아도 그 Python에 설치되지 않은 패키지를 불러오지 못합니다. 따라서
`경로가 틀렸다`는 말 하나로 뭉뚱그리지 않고 두 값을 따로 봅니다.

새 통합 터미널을 연 직후 아래 세 명령을 실행합니다. 첫 결과는 `expense_project`, 둘째 결과는
`.venv\Scripts\python.exe`로 끝나야 합니다. 셋째 결과는 Python도 현재 폴더를 같은 프로젝트 루트로
인식하는지 확인합니다.

#### 실행 명령: 현재 폴더와 선택된 실행기 나란히 확인하기

이 명령의 입력은 새 터미널의 시작 상태입니다. `Get-Location`은 PowerShell이 기억한 폴더를 출력하고,
두 Python 명령은 선택된 실행기와 Python이 보는 현재 폴더를 출력합니다. 세 결과가 프로젝트 루트와
`.venv`를 가리키면 파일 위치와 실행 대상이 모두 맞습니다.

```powershell
Get-Location
python -c "import sys; print(sys.executable)"
python -c "from pathlib import Path; print(Path.cwd())"
```

현재 폴더가 다르면 `Set-Location`으로 `expense_project`에 이동하거나 Explorer의 루트에서 새 터미널을
엽니다. 실행기가 다르면 인터프리터를 다시 선택한 뒤 기존 터미널을 닫고 새 터미널을 엽니다. 이 확인을
마쳤다면 같은 파일을 버튼과 명령 중 어느 쪽으로 실행해도 대상이 달라지지 않습니다.

## 실행 버튼과 명령을 구분합니다

### 전체 파일 실행과 선택한 줄 실행이 서로 다른 결과를 만든다는 점을 확인합니다

![편집기의 전체 파일 실행 버튼과 통합 터미널의 명시적 명령이 같은 파일과 실행기로 모이는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d9/d90745837d66c16e2b9b6dea8b845cdf4d0514234f8654a388effb58175c6964.png "두 실행 방법이 같은 전체 파일을 선택했을 때만 같은 report.txt가 만들어집니다")

편집기 오른쪽 위의 `Run Python File` 버튼은 현재 열린 `.py` 파일 전체를 선택된 Python으로 실행합니다.
공식 안내에 따르면 이 버튼은 터미널을 열고 선택한 인터프리터를 활성화한 뒤 Windows에서
`python 파일이름.py`에 해당하는 명령을 실행합니다. 즉 재생 아이콘 자체가 Python은 아닙니다.

터미널에 `python src/main.py`를 직접 입력하면 실행할 Python과 파일을 명령 기록으로 남길 수 있습니다.
오류를 질문하거나 다시 실행할 때는 이 기록이 유용합니다. 이 글의 첫 정상 실행은 터미널 명령으로 하며,
그 뒤 버튼으로 같은 결과가 나오는지 비교합니다.

`Run Selection/Line in Python Terminal`은 선택한 줄만 보냅니다. `total` 계산 줄만 보내면 그 전에 만든
`expenses`가 없어 오류가 날 수 있고, 저장 줄을 보내지 않으면 `report.txt`도 생기지 않습니다. 부분
실행은 한 표현을 시험할 때 유용하지만 전체 프로젝트 성공을 확인하는 방법은 아닙니다.

| 실행 방법 | 실제로 실행하는 범위 | 이 글에서 쓰는 때 | 확인할 결과 |
|---|---|---|---|
| Run Python File | 현재 열린 파일 전체 | 버튼 동작을 빠르게 확인할 때 | 터미널 출력과 `report.txt` |
| `python src/main.py` | 명령에 적은 파일 전체 | 재현 가능한 첫 실행과 오류 공유 | 명령 기록과 `report.txt` |
| Run Selection/Line | 선택한 줄이나 가까운 코드 블록 | 계산식 하나를 잠깐 확인할 때 | 선택한 줄의 임시 결과 |

#### 실행 명령: main.py 전체 실행하고 결과 파일 열기

입력은 `input/expenses.csv`이고 이 명령은 선택된 Python에 `src/main.py` 전체를 전달합니다. 첫 명령의
출력에 `3건, 합계 250,000원`과 두 파일 경로가 보여야 합니다. 둘째 명령은 프로그램이 실제로 저장한
파일을 다시 읽으며, 같은 합계가 나오면 화면 출력과 저장 결과가 일치합니다.

```powershell
python src/main.py
Get-Content output/report.txt
```

#### 예상 결과: 터미널과 파일에서 같은 합계 확인하기

실제 절대 경로는 컴퓨터마다 다르므로 아래에서는 앞부분을 줄였습니다. 중요한 출력은 실행기 경로에
`.venv`가 있는지, 현재 폴더가 `expense_project`인지, 합계가 두 번 같은지입니다. 이 네 증거가 모두
맞으면 버튼의 성공 표시보다 더 강하게 실행을 확인할 수 있습니다.

```text
Python 실행기: ...\expense_project\.venv\Scripts\python.exe
현재 폴더: ...\expense_project
입력 파일: ...\expense_project\input\expenses.csv
3건, 합계 250,000원
결과 파일: ...\expense_project\output\report.txt
3건, 합계 250,000원
```

전체 실행은 성공했지만 값이 계산되는 순간은 아직 보지 못했습니다. 다음에는 `print`를 더 넣지 않고
중단점에서 `expenses`와 `total`을 직접 읽습니다.

## 중단점에서 변수 값을 읽습니다

### 합계 계산 뒤 실행을 멈추고 데이터 행과 total을 화면에서 확인합니다

![합계 계산 다음 줄에 중단점이 놓이고 변수 창에 세 항목과 합계가 펼쳐진 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/14/1459a78e3a15e44cbc474b23f0262c249123963779b46d0ca5408387c2039285.png "코드를 바꾸지 않고 실행을 멈춘 뒤 계산 직후의 값이 맞는지 읽습니다")

디버깅은 오류 메시지가 나온 뒤에만 하는 일이 아닙니다. 코드를 한 줄에서 잠시 멈추고 그 시점의 값을
보는 작업도 디버깅입니다. 멈출 위치를 중단점이라고 하며, 줄 번호 왼쪽 여백을 클릭하거나 커서를 둔
상태에서 `F9`를 누르면 표시됩니다.

`main.py`에서 `report = f"{len(expenses)}건, 합계 {total:,}원"` 줄에 중단점을 둡니다. 이 줄에 도착하기
직전에는 `expenses`와 `total` 계산이 끝난 상태입니다. `F5`를 누르고 처음 나오는 구성 목록에서
`Python Debugger`, `Python File`을 선택합니다.

실행이 멈추면 Run and Debug 패널의 Variables 아래에서 `expenses`를 펼칩니다. 항목이 세 개이고 각
`amount`가 120000, 80000, 50000인지 확인합니다. `total`이 250000이면 CSV 읽기와 정수 변환 및 합계
계산까지는 정상입니다.

#### 개념 확인: Debug Console에서 건수와 합계 읽기

아래 세 표현은 새 프로그램이 아니라 멈춘 `main.py`의 현재 값을 읽는 입력입니다. Debug Console에 한
줄씩 넣습니다. 각각 `3`, `250000`, 결과 파일의 전체 경로가 나오면 코드가 파일을 쓰기 직전까지 올바른
데이터를 가지고 있다는 뜻입니다.

```python
len(expenses)
total
OUTPUT_FILE
```

`F10`은 현재 줄을 실행하고 다음 줄에서 다시 멈춥니다. `F5`는 다음 중단점까지 계속 실행하며, 다른
중단점이 없으면 프로그램을 끝냅니다. 끝난 뒤 `output/report.txt`가 생성됐는지 확인해야 디버거에서 본
값이 실제 저장까지 이어졌음을 알 수 있습니다.

중단점이 회색으로 남거나 `F5`가 Python 선택지를 보여 주지 않으면 Extensions에서
`@installed python debugger`를 검색합니다. Python Debugger가 사용 중지되지 않았는지 확인하고,
상태 표시줄의 Python도 다시 선택합니다. 이제 정상 값뿐 아니라 실패가 어느 단계에서 생기는지도
구분할 수 있습니다.

## 오류를 고치고 실행을 검증합니다

### 파일과 입력값 및 실행기 오류를 구분한 뒤 자동 검사로 끝냅니다

![입력 파일과 숫자 행 및 Python 실행기에서 생긴 세 오류가 각각 올바른 파일과 값과 경로로 복구되는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17eb5fc0ad90e7b332d25a4e5c3329a26a65f118eaa014fbd03346a017131a20.png "오류 문장의 마지막 줄에서 대상 파일과 값과 실행기를 찾아 각각 다른 복구를 적용합니다")

긴 오류가 나오면 맨 마지막 줄부터 읽습니다. `FileNotFoundError`는 파일을 열지 못했다는 뜻이고,
`ValueError`는 읽은 글자를 필요한 값으로 바꾸지 못했다는 뜻입니다. `ModuleNotFoundError`는 지금 실행한
Python의 패키지 목록에 불러올 이름이 없다는 뜻입니다.

이 글의 코드는 입력 파일의 전체 경로를 오류에 함께 표시합니다. `FileNotFoundError`가 나오면 그 경로와
Explorer의 실제 파일을 글자 단위로 비교합니다. `expense.csv`와 `expenses.csv`는 다른 이름이고,
`input` 바깥에 저장한 파일은 자동으로 안쪽으로 이동하지 않습니다.

CSV 금액을 `12만원`으로 쓰면 `int`가 정수로 바꾸지 못합니다. 코드가 알려 준 줄 번호로 이동해
`120000`처럼 숫자만 남깁니다. `120,000`은 쉼표 때문에 칸이 셋으로 늘어나며, 코드는 `칸 수가 두 개가
아닙니다`라고 멈춥니다. 이 예제의 금액에는 쉼표를 쓰지 않습니다.

#### 실패 예시: 숫자가 아닌 금액의 오류 읽기

아래 입력은 셋째 데이터 줄의 금액을 일부러 잘못 쓴 경우입니다. `main.py`는 4번째 줄의 `12만원`을
숫자로 바꿀 수 없다고 알리고 결과 파일을 새로 쓰지 않습니다. 값을 `50000`으로 복구한 뒤 전체 파일을
다시 실행해야 이전 결과와 새 결과를 혼동하지 않습니다.

```text
ValueError: 4번째 줄의 금액이 숫자가 아닙니다: 12만원
```

나중에 `pandas` 같은 외부 패키지를 추가했을 때 `ModuleNotFoundError`가 나오면 설치 버튼부터 누르지
않습니다. 먼저 오류가 난 터미널의 Python 경로를 확인합니다. 상태 표시줄과 다른 Python이면 올바른
인터프리터를 선택하고 새 터미널을 연 뒤, 같은 `python -m pip`로 패키지 존재 여부를 봅니다.

#### 복구 코드: 패키지를 찾는 Python과 pip의 위치 맞추기

첫 명령은 오류를 낸 Python 파일을, 둘째 명령은 바로 그 Python에 연결된 pip의 위치를 출력합니다.
셋째 명령은 예시 패키지가 그 환경에 설치됐는지 확인합니다. 두 경로가 모두 프로젝트 `.venv` 안에
있는데 패키지만 없을 때에만 같은 `python -m pip install`로 설치하는 것이 맞습니다.

```powershell
python -c "import sys; print(sys.executable)"
python -m pip --version
python -m pip show pandas
```

마지막으로 눈으로 읽은 결과를 자동 검사로 한 번 더 확인합니다. `src/verify_project.py`를 만들면 현재
선택한 Python으로 `main.py`를 새로 실행하고, 종료 코드와 출력 파일 내용을 검사할 수 있습니다. 이
파일은 VS Code 자체를 시험하지는 않지만 VS Code 터미널이 선택한 실행기와 프로젝트 결과를 증거로
남깁니다.

#### 예시 코드: 선택한 Python으로 프로젝트 결과 자동 검증하기

입력은 현재 터미널의 `sys.executable`, `src/main.py`, CSV 세 행입니다. `subprocess.run`은 같은 Python으로
전체 파일을 다시 실행하고, `encoding="utf-8"`은 한글 출력을 같은 규칙으로 읽습니다. `assert`가 종료
성공과 화면 출력 및 보고서를 모두 확인하면 실행기 경로와 검증 통과 문구가 나타납니다.

```python
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_FILE = PROJECT_ROOT / "src" / "main.py"
REPORT_FILE = PROJECT_ROOT / "output" / "report.txt"

completed = subprocess.run(
    [sys.executable, "-X", "utf8", str(MAIN_FILE)],
    cwd=PROJECT_ROOT,
    capture_output=True,
    check=False,
    encoding="utf-8",
)

assert completed.returncode == 0, completed.stderr
assert "3건, 합계 250,000원" in completed.stdout
assert REPORT_FILE.read_text(encoding="utf-8") == "3건, 합계 250,000원"

print(f"검증한 Python: {sys.executable}")
print("VS Code Python 실행 검증 통과")
```

#### 실행 명령: 완성 프로젝트의 실행기와 결과 검사하기

아래 명령은 프로젝트 루트의 새 터미널에서 실행합니다. 첫 줄은 자동 검사를 시작하고 둘째 줄은 생성된
파일을 사람이 다시 읽습니다. 출력에 `.venv` 실행기, 검증 통과 문구, `3건, 합계 250,000원`이 차례로
보이면 폴더 선택부터 인터프리터, 전체 실행, 파일 저장까지 한 번에 확인한 것입니다.

```powershell
python src/verify_project.py
Get-Content output/report.txt
```

입력 금액 하나를 바꿔 연습할 때는 예상 합계도 먼저 계산합니다. 예를 들어 마지막 `50000`을 `60000`으로
바꾸면 합계는 `260,000원`이어야 하며, 검사 코드의 기대값도 두 곳 모두 함께 바꿉니다. 입력과 기대값을
함께 바꿔 통과시키면 우연히 남아 있던 이전 파일이 아니라 현재 코드의 결과임을 확인할 수 있습니다.

VS Code Python 실행은 재생 아이콘 하나로 끝나지 않습니다. Explorer의 루트, 상태 표시줄의 Python,
새 터미널의 `sys.executable`, 전체 파일 실행 명령, `report.txt`가 같은 프로젝트를 가리킬 때 반복 가능한
실행이 됩니다. 더 자세한 메뉴 동작은 [공식 Python 실행 안내](https://code.visualstudio.com/docs/python/python-tutorial),
[환경 선택 안내](https://code.visualstudio.com/docs/python/environments),
[Python 디버깅 안내](https://code.visualstudio.com/docs/python/debugging)에서 확인할 수 있습니다.
