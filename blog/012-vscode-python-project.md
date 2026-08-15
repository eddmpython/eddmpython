---
title: VS Code Python 실행 방법: 프로젝트 폴더부터 결과 확인까지
slug: vscode-python
author: eddmpython
section: Python 프로젝트 환경
summary: VS Code Python 실행 방법을 프로젝트 폴더 만들기부터 설명합니다. 인터프리터를 선택하고 src/main.py를 실행해 output 결과 파일까지 확인합니다.
readerQuestion: VS Code에서 Python 프로젝트 폴더와 인터프리터를 제대로 열고 같은 스크립트를 반복 실행하려면 어떻게 할까?
readerTakeaway: 프로젝트 루트 폴더를 VS Code로 열고 같은 인터프리터를 선택한 뒤 통합 터미널에서 src/main.py를 실행하고 output 파일을 확인한다.
readerLevel: beginner
readerStartingPoint: PowerShell에서 Python 파일은 실행할 수 있지만 VS Code의 Explorer와 인터프리터 및 통합 터미널이 어떻게 연결되는지는 모른다.
primaryKeyword: VS Code Python 실행
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/eb/eb599c04adae4b3bc888782b92614e0deb0d222352df768689841d8bc38b745a.png
ogImageAlt: VS Code 편집기와 Python 확장 및 Python 인터프리터가 각각 파일 관리와 실행 지원 및 코드 실행을 맡는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

VS Code Python 실행 방법을 처음 배우면 재생 버튼부터 누르기 쉽습니다. 하지만 폴더를 잘못 열거나 다른
Python을 선택하면 `main.py`는 보여도 `input` 파일을 찾지 못하고, 설치한 패키지도 없다고 나옵니다.

이 글에서는 `expense_project` 폴더에 `input`, `output`, `src`를 만들고 `src/main.py`를 실행합니다.
VS Code가 맡는 일과 Python이 맡는 일을 구분한 뒤 `output/run_check.txt`에 `3건 확인`이 저장되는지까지
점검합니다.

## VS Code와 Python은 서로 다른 프로그램입니다

### 편집기와 Python 확장 및 인터프리터가 맡는 일을 세 칸으로 구분합니다

![VS Code 편집기와 Python 확장 및 Python 인터프리터가 각각 파일 관리와 실행 지원 및 코드 실행을 맡는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/eb/eb599c04adae4b3bc888782b92614e0deb0d222352df768689841d8bc38b745a.png "VS Code가 코드를 직접 실행하는 것이 아니라 선택한 Python 인터프리터에 파일을 전달합니다")

VS Code는 파일을 열고 폴더를 정리하며 코드를 편집하는 프로그램입니다. Microsoft의 Python 확장은
자동완성, 실행 버튼, 디버깅, 인터프리터 선택 메뉴를 더합니다. 실제로 `main.py`의 명령을 읽고
실행하는 프로그램은 Python 인터프리터입니다.

확장만 설치하고 Python을 설치하지 않으면 코드를 실행할 수 없습니다. 반대로 Python만 있어도
PowerShell에서는 실행할 수 있지만 VS Code의 실행 지원 기능은 줄어듭니다. 화면 아래 상태 표시줄에
선택된 Python 버전이 보이는지 확인하면 세 프로그램의 연결 상태를 빠르게 알 수 있습니다.

#### 설명 목록

```text
VS Code: 폴더와 파일을 보여 주고 코드를 편집
Python 확장: 자동완성, 실행, 디버깅, 인터프리터 선택 지원
Python 인터프리터: main.py 코드를 실제로 실행
```

#### 참고 자료

- [Microsoft의 VS Code Python 시작 안내](https://code.visualstudio.com/docs/python/python-tutorial)

## 파일 하나가 아니라 프로젝트 폴더를 엽니다

### Explorer의 맨 위에 expense_project가 보이면 상대 경로의 출발점이 분명해집니다

![VS Code Explorer 맨 위의 프로젝트 폴더 아래에 input과 output 및 src가 같은 단계로 정리된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a8/a8218d5064e979b600e6bcf8aef6398fc08630b159a3ff23424358bce15fa24b.png "프로젝트 루트를 열면 코드와 입력 및 출력 파일의 위치를 한 화면에서 비교할 수 있습니다")

VS Code 메뉴에서 `File`, `Open Folder`를 누르고 `expense_project`를 선택합니다. Explorer 맨 위에
`expense_project`가 보이고 그 아래에 `input`, `output`, `src`가 나란히 있어야 합니다. `src`만 열면
코드는 보이지만 프로젝트 루트의 `input`과 `output`을 찾기 어렵습니다.

아직 폴더가 없다면 PowerShell에서 아래 명령으로 만듭니다. `code .`은 현재 폴더 전체를 VS Code로
엽니다. `.`은 현재 위치라는 뜻이므로 `Get-Location` 결과가 `expense_project`인지 확인한 뒤
실행합니다.

#### 코드

```powershell
New-Item -ItemType Directory -Path expense_project
Set-Location expense_project
New-Item -ItemType Directory -Path input, output, src
code .
```

#### 확인 목록

- Explorer 맨 위에 `expense_project`가 보입니다.
- `input`, `output`, `src`가 같은 깊이에 있습니다.
- 열려 있는 파일 탭보다 Explorer의 폴더 이름을 먼저 확인합니다.

## src/main.py와 입력 파일을 만듭니다

### 세 줄짜리 입력을 읽어 output에 건수 확인 파일을 쓰는 작은 스크립트를 저장합니다

![input의 세 줄짜리 파일이 src의 Python 코드로 들어가 output의 건수 결과 파일로 나오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/13/131c53d768a576dc6c53e5821ffd130bf629b207fedfb639668d049575ef4827.png "입력과 코드와 출력을 서로 다른 폴더에 두면 자동화가 무엇을 읽고 무엇을 만드는지 바로 보입니다")

Explorer에서 `input` 폴더에 `expense.txt`를 만들고 아래 세 줄을 저장합니다. 그 뒤 `src` 폴더에
`main.py`를 만듭니다. 코드는 자신의 파일 위치에서 프로젝트 루트를 계산하므로 터미널의 현재 위치가
조금 달라도 같은 `input/expense.txt`를 가리킵니다.

`output.mkdir(exist_ok=True)`는 output 폴더가 이미 있어도 오류를 내지 않습니다. 입력 줄을 읽고 빈 줄을
제외한 건수를 센 뒤 `run_check.txt`에 결과를 씁니다. 원본 입력 파일은 수정하지 않습니다.

#### 예시

```text
영업팀,120000
관리팀,80000
영업팀,50000
```

#### 코드

```python
from pathlib import Path

project_root = Path(__file__).resolve().parents[1]
input_file = project_root / "input" / "expense.txt"
output_dir = project_root / "output"
output_file = output_dir / "run_check.txt"

lines = [
    line
    for line in input_file.read_text(encoding="utf-8-sig").splitlines()
    if line.strip()
]

output_dir.mkdir(exist_ok=True)
message = f"{len(lines)}건 확인"
output_file.write_text(message, encoding="utf-8")
print(message)
print(output_file)
```

## 실행할 Python 인터프리터를 선택합니다

### 상태 표시줄에서 프로젝트의 Python을 골라 편집기와 터미널의 실행 대상을 맞춥니다

![VS Code의 인터프리터 선택 메뉴에서 프로젝트 폴더 안 Python이 선택되고 상태 표시줄에 연결되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fe/fe1aa5f4e1fbd5489c864ed738059e0d22dfe3bec5f3d89cba1f54fa5b02bf15.png "같은 프로젝트의 Python을 선택해야 설치한 패키지와 실행 결과가 편집기에서도 일치합니다")

`Ctrl+Shift+P`를 누르고 `Python: Select Interpreter`를 입력합니다. 목록에서 프로젝트의 `.venv` 안에
있는 Python을 선택합니다. `.venv`가 아직 없다면 설치된 Python 버전을 선택해 이 글의 표준 라이브러리
예제를 먼저 실행할 수 있습니다.

선택이 끝나면 VS Code 아래쪽 상태 표시줄에 Python 버전이나 `.venv`가 표시됩니다. 여러 Python이
설치된 컴퓨터에서는 이 선택이 특히 중요합니다. 터미널에서 패키지를 설치했는데 편집기에 계속 빨간
밑줄이 보인다면 터미널과 상태 표시줄이 같은 Python을 가리키는지 확인합니다.

#### 확인 목록

- 명령 팔레트에서 `Python: Select Interpreter`를 실행합니다.
- 프로젝트의 `.venv`가 있으면 그 안의 Python을 선택합니다.
- 상태 표시줄에 선택한 Python이 표시되는지 봅니다.
- 새 터미널을 열어 선택 결과를 반영합니다.

#### 참고 자료

- [Microsoft의 VS Code Python 인터프리터 안내](https://code.visualstudio.com/docs/languages/python)

## 통합 터미널에서 실행하고 결과 파일을 엽니다

### python src/main.py 명령과 output/run_check.txt의 3건 확인을 함께 봅니다

![VS Code 통합 터미널의 Python 실행 결과와 Explorer에서 열린 output 결과 파일이 같은 건수를 보여 주는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/50/503272478e0ca292ad1939ccb6d9f7fd01a50f94a794bd9a7fb03c2af95f2e34.png "터미널 메시지만 보지 않고 실제 출력 파일을 열어야 저장 위치와 내용까지 확인할 수 있습니다")

VS Code 메뉴에서 `Terminal`, `New Terminal`을 눌러 통합 터미널을 엽니다. 프롬프트의 현재 위치가
`expense_project`인지 확인하고 `python src/main.py`를 실행합니다. 터미널에 `3건 확인`과 결과 파일의
전체 경로가 나타나야 합니다.

Explorer에서 `output/run_check.txt`를 열어 같은 문구가 저장됐는지 확인합니다. 실행 버튼의 성공 표시만
보는 것보다 터미널 명령과 출력 파일을 함께 확인하면 어느 Python이 어느 파일을 실행했고 무엇을
만들었는지 기록으로 남습니다.

#### 코드

```powershell
Get-Location
python src/main.py
Get-Content output/run_check.txt
```

#### 예시

```text
3건 확인
C:\작업폴더\expense_project\output\run_check.txt
3건 확인
```

#### 확인 목록

- 터미널의 현재 위치가 프로젝트 루트입니다.
- `python src/main.py`가 오류 없이 끝납니다.
- `output/run_check.txt`가 새로 생깁니다.
- 터미널과 결과 파일에 모두 `3건 확인`이 보입니다.
