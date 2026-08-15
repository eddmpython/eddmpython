---
title: PowerShell 파일 경로: 폴더 이동부터 Python 실행까지
slug: powershell-paths
author: eddmpython
section: 터미널과 로컬 실행
summary: PowerShell 파일 경로를 현재 위치부터 확인합니다. 상대 경로와 절대 경로 및 공백을 구분하고 연습 폴더에서 Python 파일을 직접 실행합니다.
readerQuestion: PowerShell에서 폴더와 파일 경로를 어떻게 확인하고 원하는 Python 파일을 정확히 실행할까?
readerTakeaway: 현재 위치를 확인한 뒤 존재하는 파일까지의 상대 경로를 적으면 PowerShell에서 엉뚱한 폴더를 실행하는 실수를 줄일 수 있다.
readerLevel: beginner
readerStartingPoint: PowerShell에서 Get-Location과 python --version은 실행했지만 경로의 점과 역슬래시 및 따옴표가 무엇을 뜻하는지는 모른다.
primaryKeyword: PowerShell 파일 경로
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/57/577989cf08c208bc247d7be7f79de903c7f8311370ab7615f47a938349c3d88a.png
ogImageAlt: PowerShell의 현재 위치 표시가 폴더 트리의 한 지점과 그 안의 파일 목록을 정확히 가리키는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

PowerShell 파일 경로가 맞지 않으면 파일이 컴퓨터에 있어도 `찾을 수 없습니다`라는 오류가 납니다. 탐색기에서
보이는 폴더와 PowerShell이 현재 보고 있는 폴더가 다르기 때문입니다.

이 글에서는 `path_practice` 연습 폴더와 `src\hello.py` 파일을 직접 만듭니다. 현재 위치를 확인하고
상대 경로로 Python 파일을 실행해 터미널에 `경로 연습 성공`이 보이면 완료입니다.

## 현재 위치부터 확인합니다

### Get-Location 결과와 파일을 찾을 출발 폴더가 서로 같은지 확인합니다

![PowerShell의 현재 위치 표시가 폴더 트리의 한 지점과 그 안의 파일 목록을 정확히 가리키는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/57/577989cf08c208bc247d7be7f79de903c7f8311370ab7615f47a938349c3d88a.png "경로를 생략한 명령은 PowerShell에 표시된 현재 폴더에서 파일을 찾기 시작합니다")

PowerShell에는 명령이 파일을 찾기 시작하는 현재 위치가 하나 있습니다. `Get-Location`을 실행하면
`C:\Users\mina`처럼 현재 폴더의 전체 경로가 나옵니다. 이어서 `Get-ChildItem -Name`을 실행하면 그
위치에 실제로 있는 파일과 하위 폴더 이름이 보입니다.

탐색기에서 `hello.py`를 보고 있더라도 PowerShell의 현재 위치가 다른 폴더라면 파일 이름만으로 실행할
수 없습니다. 명령을 입력하기 전에 현재 위치와 파일 목록을 함께 확인하면 경로 오류의 절반을 바로
찾을 수 있습니다.

#### 코드

```powershell
Get-Location
Get-ChildItem -Name
```

#### 참고 자료

- [Microsoft Get-Location 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-location?view=powershell-7.5)
- [Microsoft Get-ChildItem 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem?view=powershell-7.5)

## 상대 경로와 절대 경로를 구분합니다

### 점으로 시작하면 현재 폴더부터 찾고 드라이브로 시작하면 위치 전체를 지정합니다

![현재 폴더에서 시작하는 짧은 상대 경로와 드라이브 루트부터 시작하는 긴 절대 경로가 같은 파일에 도착하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2d/2d3efa0013e3918e16692d224a147cc4056c3788dddb6a330c6b732ede1b452e.png "출발 위치를 생략한 상대 경로와 전체 위치를 적은 절대 경로가 같은 파일을 가리킬 수 있습니다")

상대 경로는 현재 위치를 출발점으로 적습니다. `.\src\hello.py`에서 점 하나는 현재 폴더이고,
`src`는 그 아래 폴더입니다. 역슬래시는 Windows 경로에서 폴더 이름을 구분합니다.

절대 경로는 `C:\` 같은 드라이브 루트부터 파일까지 전부 적습니다. 현재 위치가 어디든 같은 파일을
가리키지만 컴퓨터와 사용자 이름이 바뀌면 그대로 쓰기 어렵습니다. 프로젝트 안의 파일은 상대 경로를
사용하고, 위치를 확인할 때는 `Resolve-Path`로 절대 경로를 보는 편이 안전합니다.

#### 예시

```text
상대 경로: .\src\hello.py
절대 경로: C:\Users\mina\path_practice\src\hello.py
```

#### 참고 자료

- [Microsoft PowerShell 경로 문법](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_path_syntax?view=powershell-7.5)
- [Microsoft Resolve-Path 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/resolve-path?view=powershell-7.5)

## 공백이 있는 경로는 묶어서 적습니다

### 폴더 이름 사이에 공백이 있으면 전체 경로를 따옴표 한 쌍 안에 넣습니다

![공백 때문에 여러 조각으로 갈라진 폴더 경로가 따옴표 경계 안에서 하나의 경로로 묶이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4f/4f8ce5f5637ca67a6edf859e896cd179f8d05055176a2e4b1a1642433736a2be.png "따옴표는 공백이 포함된 경로 전체를 하나의 명령 인수로 전달합니다")

PowerShell은 보통 공백을 명령과 인수를 나누는 자리로 읽습니다. `내 프로젝트`처럼 폴더 이름에 공백이
있으면 경로 전체를 따옴표로 묶어 한 조각이라는 점을 알려 줍니다. 따옴표가 없으면 `내`와
`프로젝트`를 서로 다른 값으로 읽어 명령이 실패할 수 있습니다.

`Set-Location`은 현재 위치를 다른 폴더로 바꿉니다. 아래 두 명령은 모두 같은 폴더를 가리키지만,
공백이 있는 첫 경로에는 따옴표가 필요합니다. 이동한 뒤에는 `Get-Location`으로 실제 도착 위치를 다시
확인합니다.

#### 코드

```powershell
Set-Location ".\내 프로젝트"
Set-Location .\path_practice
Get-Location
```

#### 참고 자료

- [Microsoft Set-Location 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location?view=powershell-7.5)

## 연습용 프로젝트를 만듭니다

### path_practice 안에 input과 output 및 src 폴더와 hello.py 파일을 만듭니다

![연습 프로젝트 폴더 안에 input과 output 및 src가 나뉘고 src 안에 Python 파일 하나가 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/eb/eb454543b932e7df68961ea1b369e025ccd41c2329acf15ed138cbc460302966.png "입력과 결과와 코드를 다른 폴더에 두면 명령에서 지정할 파일 위치가 분명해집니다")

연습은 현재 폴더 아래의 `path_practice`에서만 진행합니다. 첫 명령은 `input`, `output`, `src` 폴더를
만듭니다. 둘째 명령은 연습 폴더로 이동하고, 셋째 명령은 `src` 안에 한 줄짜리 `hello.py`를
저장합니다.

`-Force`는 같은 연습 폴더가 이미 있을 때 폴더 생성 오류를 피합니다. 마지막 명령은 만든 폴더와
파일을 이름만 보여 줍니다. 결과에서 `input`, `output`, `src`, `src\hello.py`를 찾으면 파일을 실행할
준비가 끝납니다.

#### 코드

```powershell
New-Item -ItemType Directory -Path .\path_practice\input, .\path_practice\output, .\path_practice\src -Force
Set-Location .\path_practice
'print("경로 연습 성공")' | Set-Content .\src\hello.py -Encoding utf8
Get-ChildItem -Recurse -Name
```

#### 예시

```text
input
output
src
src\hello.py
```

## 파일을 확인하고 실행합니다

### Test-Path가 True인지 확인한 뒤 상대 경로로 Python 파일을 실행합니다

![존재 여부 검사와 실제 절대 경로 확인을 통과한 Python 파일이 실행 결과 카드로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0a/0a37d036af4841bee5d77ccb7fcf33304df9286c96c283e43179a39f18964f47.png "파일 존재와 실제 위치를 먼저 확인하면 실행 명령이 어느 파일을 읽는지 알 수 있습니다")

`Test-Path .\src\hello.py`는 해당 경로에 파일이 있으면 `True`를 보여 줍니다. `Resolve-Path`는 같은
파일의 절대 경로를 보여 줍니다. 두 결과가 맞을 때 `python .\src\hello.py`를 실행하면 터미널에
`경로 연습 성공`이 나타납니다.

`False`가 나오면 Python을 다시 설치하지 않고 현재 위치와 파일명을 확인합니다. `Get-Location`,
`Get-ChildItem .\src -Name`, `Test-Path .\src\hello.py` 세 결과를 비교하면 잘못된 폴더와 확장자 오타를
찾을 수 있습니다.

#### 코드

```powershell
Get-Location
Get-ChildItem .\src -Name
Test-Path .\src\hello.py
Resolve-Path .\src\hello.py
python .\src\hello.py
```

#### 예시

```text
True
C:\...\path_practice\src\hello.py
경로 연습 성공
```

#### 참고 자료

- [Microsoft Test-Path 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path?view=powershell-7.5)
