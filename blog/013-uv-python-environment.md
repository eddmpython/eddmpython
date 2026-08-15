---
title: uv Python 환경 만들기: sync와 run으로 똑같이 실행하는 법
slug: uv-python
author: eddmpython
section: Python 프로젝트 환경
summary: uv Python 환경 만들기를 Windows PowerShell에서 실습합니다. pyproject.toml과 uv.lock 및 .venv를 만들고 sync와 run으로 같은 패키지를 실행합니다.
readerQuestion: Python 프로젝트를 다른 컴퓨터에서도 같은 버전과 패키지로 실행하려면 uv를 어떻게 사용할까?
readerTakeaway: pyproject.toml에 필요한 패키지를 적고 uv.lock에 해결된 버전을 기록한 뒤 uv sync와 uv run으로 프로젝트 전용 .venv를 사용한다.
readerLevel: beginner
readerStartingPoint: Python 파일과 import는 이해하지만 컴퓨터마다 패키지 설치 상태가 달라지는 문제를 해결하지 못한다.
primaryKeyword: uv Python 환경
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8b/8b83833610b052016284fc464f90cd9fdb61fd626fd9250aca33c3934ac34672.png
ogImageAlt: 같은 Python 코드가 서로 다른 패키지 목록을 가진 두 컴퓨터에서 성공과 실패로 갈리는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

uv Python 환경 만들기를 해 두지 않으면 같은 `main.py`가 내 컴퓨터에서는 실행되고 다른 컴퓨터에서는
`ModuleNotFoundError`로 멈출 수 있습니다. 두 컴퓨터에 설치된 Python과 pandas 버전이 다르기
때문입니다.

이 글에서는 Windows PowerShell에서 `expense_project`에 `pyproject.toml`, `uv.lock`, `.venv`를
만듭니다. 프로젝트 폴더만 받은 컴퓨터에서도 `uv sync` 뒤 `uv run python src/main.py`를 실행할 수
있는 상태가 완성 기준입니다.

## 같은 코드도 설치 목록이 다르면 결과가 달라집니다

### Python 버전과 패키지 버전을 파일로 남겨야 다른 컴퓨터가 같은 조건을 복원합니다

![같은 Python 코드가 서로 다른 패키지 목록을 가진 두 컴퓨터에서 성공과 실패로 갈리는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8b/8b83833610b052016284fc464f90cd9fdb61fd626fd9250aca33c3934ac34672.png "코드 파일만 복사하면 실행에 필요한 Python과 패키지 버전 정보가 빠집니다")

`main.py`에는 `import pandas as pd` 한 줄만 있어도 pandas와 pandas가 의존하는 여러 패키지가
필요합니다. 내 컴퓨터에 우연히 설치된 패키지는 코드 파일 안에 들어 있지 않습니다. 파일을 메일로
보내거나 저장소를 복제해도 설치 목록은 자동으로 따라가지 않습니다.

uv 프로젝트는 필요한 패키지 이름을 `pyproject.toml`에 적고, 실제로 선택된 버전을 `uv.lock`에
기록합니다. `.venv`는 그 기록을 현재 컴퓨터에서 실행할 수 있게 설치한 프로젝트 전용 폴더입니다.
공유해야 할 것은 작은 설정 파일 두 개이며, 용량이 큰 `.venv`는 각 컴퓨터에서 다시 만듭니다.

#### 설명 목록

```text
main.py: 실행할 업무 코드
pyproject.toml: 필요한 Python 범위와 직접 사용하는 패키지
uv.lock: 설치할 패키지와 의존 패키지의 해결된 버전
.venv: 현재 컴퓨터에 실제로 설치된 프로젝트 전용 Python과 패키지
```

#### 참고 자료

- [uv 공식 문서의 프로젝트 파일 구조](https://docs.astral.sh/uv/concepts/projects/layout/)

## Windows에 uv를 설치하고 명령을 확인합니다

### winget 설치 후 uv 버전과 실행 파일 경로가 나오면 PowerShell 준비가 끝납니다

![Windows 패키지 설치 명령이 uv 실행 파일과 버전 확인 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b7/b79d5025a079ac3cb8f33c8a583aa308ee89a50a2258b89a66f2a290ab27d335.png "설치가 끝났다는 메시지보다 새 PowerShell에서 uv 명령이 실제로 찾아지는지 확인합니다")

Windows 11의 PowerShell에서는 `winget`으로 uv를 설치할 수 있습니다. 명령을 실행한 뒤 PowerShell을
닫고 새 창을 엽니다. 설치 프로그램이 추가한 실행 경로를 새 터미널이 읽어야 하기 때문입니다.

새 창에서 `uv --version`과 `Get-Command uv`를 실행합니다. 첫 명령은 설치된 버전을, 둘째 명령은
실제로 실행될 `uv.exe`의 위치를 보여 줍니다. 회사 컴퓨터에서 winget 사용이 막혀 있다면 uv 공식
설치 문서의 Windows 방법을 관리자에게 전달해 승인된 설치 경로를 사용합니다.

#### 코드

```powershell
winget install --id=astral-sh.uv -e
uv --version
Get-Command uv
```

#### 확인 목록

- 설치 명령이 오류 없이 끝납니다.
- 새 PowerShell 창에서 `uv --version`이 버전을 출력합니다.
- `Get-Command uv`가 `uv.exe` 경로를 보여 줍니다.
- 프로젝트마다 uv를 다시 설치하지 않습니다.

#### 참고 자료

- [uv 공식 Windows 설치 방법](https://docs.astral.sh/uv/getting-started/installation/)

## 프로젝트 파일 세 개를 만듭니다

### init과 python pin 및 add가 pyproject.toml과 .python-version 및 uv.lock을 기록합니다

![세 개의 uv 명령이 프로젝트 폴더 안 설정 파일과 잠금 파일 및 전용 가상환경을 차례로 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1c/1c47da7431bac5ef453cce4a198fdbece6262c83e4d519253f55375224e16857.png "명령마다 만들어지는 파일을 확인하면 uv가 어떤 정보를 기록하는지 알 수 있습니다")

PowerShell에서 `expense_project` 루트로 이동한 뒤 `uv init --bare --python 3.13`을 실행합니다.
`--bare`는 기존의 `src`, `input`, `output`을 건드리지 않고 `pyproject.toml`만 만듭니다.

초기화할 때 Python 3.13을 지정하면 `requires-python`도 그 기준으로 기록됩니다. `uv python pin
3.13`은 사용할 버전을 `.python-version`에 적습니다.

`uv add pandas openpyxl`은 직접 사용하는 두 패키지를 `pyproject.toml`에 추가합니다. 동시에 호환되는
세부 버전을 계산해 `uv.lock`에 기록하고 `.venv`를 준비합니다. 패키지를 설치하려고 `.venv` 안의
파일을 직접 바꾸지 않습니다.

#### 코드

```powershell
Set-Location C:\작업폴더\expense_project
uv init --bare --python 3.13
uv python pin 3.13
uv add pandas openpyxl
```

#### 예시

```text
expense_project/
├─ .python-version
├─ .venv/
├─ input/
├─ output/
├─ src/
├─ pyproject.toml
└─ uv.lock
```

#### 참고 자료

- [uv 공식 문서의 최소 프로젝트 만들기](https://docs.astral.sh/uv/concepts/projects/init/)
- [uv 공식 문서의 의존성 추가](https://docs.astral.sh/uv/concepts/projects/dependencies/)

## uv sync로 기록된 설치 상태를 복원합니다

### 새 컴퓨터에서는 설정 파일을 받은 뒤 sync 한 줄로 .venv를 다시 만듭니다

![공유받은 pyproject와 lock 파일이 uv sync를 거쳐 새 컴퓨터의 전용 가상환경으로 복원되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/19/19776f47c3f2c9094162a8eae9ca5a1a33a6194388d11be94e426034c9d2f3ce.png "용량이 큰 가상환경 폴더를 복사하지 않고 작은 설정 파일에서 필요한 패키지를 다시 설치합니다")

프로젝트를 공유할 때 `.venv`는 보내지 않고 `pyproject.toml`, `uv.lock`, `.python-version`, 코드 파일을
보냅니다. 받은 사람은 프로젝트 루트에서 `uv sync`를 실행합니다. `.venv`가 없으면 새로 만들고,
`uv.lock`에 기록된 패키지가 빠졌거나 달라졌으면 맞는 상태로 동기화합니다.

`uv sync --locked`는 잠금 파일을 새로 계산하지 않고 현재 `pyproject.toml`과 맞는지 검사합니다. 팀이나
자동 배포에서는 의도하지 않은 버전 변경을 막기 위해 이 명령을 사용할 수 있습니다. 패키지를 바꿀
필요가 있을 때는 `uv add` 또는 `uv remove`로 설정과 잠금 파일을 함께 수정합니다.

#### 코드

```powershell
uv sync
uv sync --locked
```

#### 확인 목록

- 프로젝트 루트에 `pyproject.toml`과 `uv.lock`이 있습니다.
- `uv sync` 뒤 `.venv` 폴더가 생깁니다.
- `.venv`는 Git이나 압축 공유 파일에서 제외합니다.
- 패키지 변경은 `uv add`와 `uv remove`로 기록합니다.

#### 참고 자료

- [uv 공식 문서의 잠금과 동기화](https://docs.astral.sh/uv/concepts/projects/sync/)

## uv run으로 프로젝트의 Python을 실행합니다

### 실행 파일 경로와 패키지 버전을 확인한 뒤 같은 명령으로 업무 스크립트를 실행합니다

![uv run 명령이 프로젝트의 .venv Python과 잠긴 패키지를 선택해 스크립트 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/96/96b7e5d091658f7b1c5c4b81e134e5d9dd13a81c4bf5c02bd5ff0b35e4026631.png "PowerShell에 어떤 Python이 먼저 잡혀 있어도 uv run은 현재 프로젝트의 실행 대상을 사용합니다")

`uv run`은 명령을 실행하기 전에 잠금 파일과 `.venv`가 맞는지 확인합니다. 그래서 가상환경 활성화
명령을 외우지 않아도 현재 프로젝트에 설치된 Python으로 스크립트를 실행할 수 있습니다. 먼저 짧은
확인 명령으로 Python 실행 파일과 pandas 및 openpyxl 버전을 출력합니다.

Python 경로에 `expense_project\.venv`가 포함되고 두 패키지 버전이 나오면 `uv run python
src/main.py`를 실행합니다. VS Code에서도 `.venv\Scripts\python.exe`를 인터프리터로 선택하면 편집기와
터미널이 같은 패키지 목록을 보게 됩니다.

#### 코드

```powershell
uv run python -c "import sys, pandas, openpyxl; print(sys.executable); print(pandas.__version__); print(openpyxl.__version__)"
uv run python src/main.py
```

#### 예시

```text
C:\작업폴더\expense_project\.venv\Scripts\python.exe
pandas 버전 번호
openpyxl 버전 번호
3건 확인
```

#### 참고 자료

- [uv 공식 문서의 프로젝트 명령 실행](https://docs.astral.sh/uv/concepts/projects/run/)
