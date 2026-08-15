---
title: Windows Python 설치 오류 해결: 수업을 멈추지 않는 방법
slug: windows-python-recovery
author: eddmpython
section: Python 실행환경
summary: Windows Python 설치가 막힐 때 명령 위치부터 확인합니다. Python 설치 관리자와 uv를 복구하고 VS Code 확장 없이도 터미널로 실습을 계속합니다.
readerQuestion: Windows에서 Python과 uv 또는 VS Code 설치가 막혀도 수업과 자동화 실습을 어떻게 계속할까?
readerTakeaway: 명령 위치와 현재 폴더를 먼저 확인하고 Python 및 uv를 한 단계씩 복구하며 편집기가 막히면 같은 파일을 터미널에서 실행한다.
readerLevel: beginner
readerStartingPoint: PowerShell을 열고 한 줄 명령을 입력할 수 있지만 Python 또는 uv 명령이 실패하는 상태입니다.
primaryKeyword: Windows Python 설치
searchIntent: troubleshooting
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1b/1b5edab6ea81daadcb376423054b4c77af98e0fe18840c491036896bc7625d86.png
ogImageAlt: PowerShell에서 python과 py 및 uv 명령 위치와 버전을 차례로 확인하는 네 줄 진단 화면
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Windows Python 설치 오류가 나면 다운로드를 반복하기 쉽습니다. 하지만 실제 원인은 설치되지 않음,
오래 열린 PowerShell, 다른 Python 실행 파일, 잘못된 프로젝트 폴더 중 하나일 수 있습니다.

이 글은 수업 중 바로 사용할 복구 순서입니다. 먼저 네 줄로 상태를 확인하고 Python과 uv를 따로
복구합니다. VS Code 확장이 설치되지 않아도 `main.py`와 검증 명령까지 실행할 수 있습니다.

## 설치 문제와 경로 문제를 먼저 나눕니다

### python과 py 및 uv 명령의 위치와 현재 폴더를 네 줄로 확인합니다

![PowerShell에서 python과 py 및 uv 명령 위치와 버전을 차례로 확인하는 네 줄 진단 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1b/1b5edab6ea81daadcb376423054b4c77af98e0fe18840c491036896bc7625d86.png "네 진단 명령이 설치 없음과 다른 실행 파일 및 잘못된 현재 폴더를 따로 보여 줍니다")

명령이 실패했다고 바로 다시 설치하면 원인을 가리기 쉽습니다. `Get-Command`는 PowerShell이 실제로
찾은 실행 파일 위치를 보여 줍니다. 아무 결과가 없으면 명령을 찾지 못한 상태입니다.

`Get-Location` 결과는 `pyproject.toml`과 `src`가 있는 프로젝트 루트여야 합니다. Python은 실행되지만
`main.py`를 찾지 못한다면 설치 문제가 아니라 현재 폴더 문제일 가능성이 큽니다.

#### 코드

```powershell
Get-Command python -All
Get-Command py -All
Get-Command uv -All
Get-Location
```

#### 예시

| 관찰 결과 | 뜻 | 다음 확인 |
| --- | --- | --- |
| `python`과 `py`가 모두 없음 | Python 명령 준비 안 됨 | 설치 관리자 확인 |
| `python`은 있고 `uv`만 없음 | uv 명령 준비 안 됨 | uv 설치와 새 터미널 |
| 명령은 모두 있음 | 설치보다 실행 위치 문제 | `Get-Location`과 파일 목록 |
| 예상 밖 실행 파일 경로 | 다른 설치가 먼저 선택됨 | `Get-Command -All` 결과 정리 |

## Python 명령이 없으면 설치 관리자를 확인합니다

### 공식 설치 관리자에서 런타임을 넣고 python과 py 명령을 다시 확인합니다

![Python 설치 관리자가 런타임을 설치하고 python과 py 명령 두 개를 PowerShell에 연결하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d4/d4528ca7fce1dcac4d81700d01184bbcaa23acd265edd4a903277fc123c840e9.png "설치 관리자가 런타임과 명령 경로를 준비해 두 실행 명령이 같은 Python으로 이어집니다")

현재 Windows용 Python 공식 문서는 Python Install Manager를 안내합니다. 설치 관리자는 Python
런타임과 `python`, `py` 명령을 관리합니다. Microsoft Store 또는 python.org 다운로드 페이지에서
설치할 수 있습니다.

설치 뒤 새 PowerShell을 열고 아래 명령을 실행합니다. `py list`에 설치된 런타임이 보이고
`python --version`이 버전을 출력하면 다음 단계로 갑니다. 한 명령만 된다면 되는 명령으로 수업을
계속하고 명령 위치는 수업 뒤 정리할 수 있습니다.

#### 코드

```powershell
python --version
py list
py -c "print('Python 실행 확인')"
```

#### 예시

```text
Python 3.14.x
Python 실행 확인
```

#### 참고 자료

- [Windows에서 Python 사용 공식 문서](https://docs.python.org/3/using/windows.html)
- [Python 공식 다운로드](https://www.python.org/downloads/)

## uv 명령은 새 PowerShell에서 다시 찾습니다

### 설치 뒤 터미널을 새로 열고 버전과 프로젝트 실행을 차례로 확인합니다

![Windows 패키지 설치가 uv 실행 파일을 준비하고 새 PowerShell에서 버전과 프로젝트 실행을 통과하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/19/19c1506dd227553f6d2b400569a4d2eee5c41e3635722b87af5c053be76fbaa0.png "이전 터미널은 명령을 놓치지만 새 터미널은 uv를 찾아 버전과 Python 실행을 통과합니다")

`uv`를 설치한 뒤에도 이미 열려 있던 PowerShell은 바뀐 PATH를 모를 수 있습니다. `winget`으로
설치했다면 PowerShell 창을 모두 닫고 새 창을 엽니다. 그다음 `Get-Command uv`로 실제 파일 위치를
확인합니다.

버전 출력만 보고 끝내지 않습니다. 프로젝트 루트로 이동해 `uv run python`으로 짧은 코드를 실행해야
Python 런타임과 프로젝트 환경이 함께 준비됐는지 확인할 수 있습니다.

#### 코드

```powershell
winget install --id=astral-sh.uv -e
```

새 PowerShell에서 아래 순서로 확인합니다.

#### 예시

```powershell
Get-Command uv
uv --version
Set-Location C:\work\expense-automation
uv run python -c "print('uv 실행 확인')"
```

#### 참고 자료

- [uv Windows 설치 공식 문서](https://docs.astral.sh/uv/getting-started/installation/)

## VS Code가 막혀도 터미널로 실행합니다

### 확장 기능 없이도 uv run 명령으로 main 파일과 결과 검사를 계속합니다

![VS Code 확장 기능이 막힌 화면 옆에서 PowerShell 명령이 main 파일을 실행해 결과 파일을 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/67/679308d1d895d5b759fb29da77e9f025c345b00789f614ffbe4adc2c0496f468.png "편집기 확장이 막혀도 같은 Python 파일이 PowerShell과 uv 환경을 지나 결과를 만듭니다")

VS Code는 코드를 편하게 쓰는 도구이지 Python을 실행하는 유일한 길이 아닙니다. 회사 정책이나
네트워크 때문에 Python 확장을 설치하지 못해도 파일은 메모장이나 기본 편집기로 고치고 PowerShell에서
실행할 수 있습니다.

프로젝트 루트에서 아래 두 명령을 실행합니다. 첫 명령이 `output/expense_result.xlsx`를 만들고 둘째
명령이 검사 결과와 종료 코드를 냅니다. 결과와 PASS가 나오면 편집기 복구를 기다리지 않고 실습을
계속할 수 있습니다.

#### 코드

```powershell
uv run python src/main.py
uv run python src/validate_result.py
```

#### 확인 목록

- `Get-Location`이 프로젝트 루트인지 확인합니다.
- `Test-Path .\src\main.py`가 `True`인지 확인합니다.
- `Test-Path .\output\expense_result.xlsx`가 `True`인지 확인합니다.
- 검증 명령이 종료 코드 `0`으로 끝나는지 확인합니다.

#### 예시

```powershell
Test-Path .\src\main.py
uv run python src/main.py
Test-Path .\output\expense_result.xlsx
$LASTEXITCODE
```
