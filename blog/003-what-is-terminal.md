---
title: 터미널이란 무엇인가? 개발자가 검은 창을 쓰는 이유
slug: what-is-terminal
date: 2026-08-09
modified: 2026-08-14
author: eddmpython
section: Python 학습과 자동화
summary: 터미널이란 무엇인가를 명령과 결과로 쉽게 설명합니다. Windows Terminal과 PowerShell의 차이, 현재 폴더를 확인하는 명령, Python 설치 여부를 찾는 방법까지 직접 따라 합니다.
readerQuestion: 터미널은 어떤 프로그램이고 PowerShell과 무엇이 다르며, 개발자는 왜 마우스 대신 명령을 입력할까?
readerTakeaway: 터미널은 명령과 결과를 보여 주는 창이고 PowerShell은 그 명령을 읽는 프로그램이며, 현재 폴더를 확인한 뒤 안전한 명령부터 실행하면 된다.
readerLevel: beginner
readerStartingPoint: 브라우저에서 Python 코드를 한 번 실행했지만 검은 창에 무엇을 입력하는지, 터미널과 PowerShell이 어떻게 다른지는 모른다.
primaryKeyword: 터미널이란 무엇인가
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/00/00ef3a45fcdf406ec713bb489fda02cfe38b5ac7bea2c4355ab4b19562da19b9.png
ogImageAlt: 키보드에서 입력한 명령이 PowerShell을 거쳐 폴더 경로 결과로 돌아오는 터미널 동작
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

터미널이란 무엇인가를 모르는데 설치 안내가 `터미널을 여세요`부터 시작하면 당황스럽습니다. 검은
화면과 깜빡이는 커서만 보면 무엇을 눌러야 할지 알 수 없습니다.

이 글에서는 Windows에서 터미널을 열고 `Get-Location`을 입력합니다. 현재 폴더 경로가 보이면 첫
사용은 성공입니다. 이어서 터미널과 PowerShell의 차이, 개발자가 명령을 쓰는 이유까지 확인합니다.

## 터미널이란 무엇인가: 명령을 적는 창입니다

### 키보드로 명령을 입력하면 실행 결과가 같은 창의 다음 줄에 나타납니다

![키보드에서 입력한 명령이 PowerShell을 거쳐 폴더 경로 결과로 돌아오는 터미널 동작](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/00/00ef3a45fcdf406ec713bb489fda02cfe38b5ac7bea2c4355ab4b19562da19b9.png "입력한 한 줄이 처리된 뒤 바로 아래 결과로 돌아오는 장면이 터미널의 기본 동작입니다")

터미널은 글자로 명령을 입력하고 결과를 보는 프로그램입니다. 커서가 깜빡이는 줄에 명령을 적고
Enter를 누르면, 연결된 프로그램이 명령을 처리해 다음 줄에 결과나 오류를 보여 줍니다.

마우스로 폴더를 여는 대신 폴더 이름을 글자로 볼 수 있고, 버튼을 누르는 대신 프로그램 이름을 적어
실행할 수 있습니다. 검은 배경은 자주 쓰는 화면 설정일 뿐입니다. 흰색이나 다른 색으로 바꿔도 하는
일은 같습니다.

#### 코드

```powershell
Write-Output "붕어빵 3개"
```

PowerShell에서 이 명령을 실행하면 다음 줄에 `붕어빵 3개`가 보입니다. 위쪽 한 줄은 입력이고 아래쪽
한 줄은 결과입니다. 이 단순한 왕복이 터미널 사용의 시작입니다.

#### 참고 자료

- [Microsoft의 명령 셸과 터미널 설명](https://learn.microsoft.com/en-us/powershell/scripting/what-is-a-command-shell)

## 터미널은 원래 책상 위 장치였습니다

### 키보드와 출력 장치였던 기계가 오늘날 화면 속 프로그램으로 바뀌었습니다

![종이에 출력하는 초기 전신 단말기와 CRT 화면 단말기 및 현대 터미널 앱이 차례로 이어진 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9f/9fd3cf3cb747f658132260b1a3eb8c4f68d6382f680b5c8e26a414f8e1207abf.png "물리 장치의 입력과 출력 기능이 화면 속 터미널 프로그램으로 옮겨 왔습니다")

초기 컴퓨터 사용자는 전신 타자기처럼 생긴 장치로 글자를 보내고 종이에 결과를 받았습니다. 이후에는
키보드와 CRT 화면을 갖춘 전용 단말기가 같은 일을 맡았습니다. 이 장치를 영어로 터미널이라고
불렀습니다.

개인용 컴퓨터가 널리 쓰이면서 별도 장치가 하던 일을 소프트웨어가 대신하기 시작했습니다. 오늘의
Windows Terminal도 키보드 입력을 받아 명령 프로그램에 보내고, 돌아온 글자를 화면에 그립니다.
그래서 장치는 사라졌어도 터미널이라는 이름은 남았습니다.

#### 설명 목록

- **초기 전신 단말기:** 키보드로 입력하고 종이에 결과를 출력했습니다.
- **화면 단말기:** 키보드로 입력하고 CRT 화면에서 결과를 읽었습니다.
- **터미널 앱:** 노트북 화면 안에서 PowerShell 같은 명령 프로그램을 실행합니다.

#### 참고 자료

- [Microsoft Windows 명령줄의 터미널 역사](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)

## PowerShell은 터미널 안에서 일합니다

### 터미널은 글자를 보여 주고 PowerShell은 입력한 명령의 뜻을 읽습니다

![Windows Terminal 창 안의 여러 셸이 각각 Python과 Git 같은 프로그램을 실행하는 층별 구조](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/43/43b320e07e066d1209829091bafd66e20fa3fecef2b65093c44e68043c469546.png "창과 명령 해석기와 실행 프로그램을 나누면 비슷해 보이는 이름의 차이가 보입니다")

Windows Terminal은 여러 명령 프로그램을 담아 보여 주는 창입니다. 그 안에서 PowerShell,
명령 프롬프트, WSL의 bash 같은 셸을 탭으로 열 수 있습니다. 셸은 입력한 글자를 명령으로 읽고 직접
처리하거나 Python과 Git 같은 다른 프로그램에 전달합니다.

따라서 터미널과 PowerShell은 경쟁 제품이 아닙니다. Windows Terminal이라는 창 안에서 PowerShell을
사용할 수 있습니다. 시작 메뉴에서 PowerShell을 바로 열어도 Windows가 결과를 보여 줄 터미널 창을
함께 붙입니다.

#### 설명 목록

- **Windows Terminal:** 입력과 결과를 화면에 보여 주는 앱입니다.
- **PowerShell:** 명령을 읽고 실행하는 셸이자 스크립트 언어입니다.
- **명령 프롬프트:** Windows에 오래전부터 포함된 다른 셸입니다.
- **Python과 Git:** 셸에서 이름을 입력해 실행하는 별도 프로그램입니다.

PowerShell 명령은 보통 `동사-명사` 모양입니다. `Get-Location`은 위치를 가져오고,
`Get-ChildItem`은 그 위치 안의 항목을 가져옵니다. 긴 이름은 처음에는 낯설지만 무엇을 하는지 이름에
드러난다는 장점이 있습니다.

#### 참고 자료

- [Windows Terminal 공식 개요](https://learn.microsoft.com/en-us/windows/terminal/)
- [PowerShell 공식 개요](https://learn.microsoft.com/en-us/powershell/scripting/overview)
- [PowerShell 명령 이름 설명](https://learn.microsoft.com/en-us/powershell/scripting/powershell-commands)

## 명령은 같은 일을 다시 실행하게 합니다

### 한 번 적은 명령을 다시 실행하면 같은 조건으로 결과를 확인할 수 있습니다

![하나의 저장된 명령이 세 번 실행되어 같은 형식의 파일 목록 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a4/a431c0d7044c79b5686b10ca429a2d3e888a3617af5f343b524b8b87fcefe305.png "명령을 기록해 두면 클릭 위치를 기억하지 않아도 같은 작업을 되풀이할 수 있습니다")

마우스는 사진을 고르거나 화면 배치를 살필 때 편합니다. 터미널은 같은 작업을 여러 번 실행하거나,
누가 실행해도 같은 입력을 남겨야 할 때 편합니다. 어느 쪽이 항상 더 좋은 것이 아니라 하려는 일에
따라 선택합니다.

예를 들어 폴더에서 파일만 보고 싶다면 다음 한 줄을 쓸 수 있습니다. 같은 줄을 다시 실행하면 현재
폴더를 같은 조건으로 검사합니다. 동료에게 명령을 보내거나 작업 기록에 붙여 넣기도 쉽습니다.

#### 예시

```powershell
Get-ChildItem -File
```

`Get-ChildItem`은 현재 위치의 항목을 가져옵니다. `-File`을 붙이면 폴더를 빼고 파일만 보여 줍니다.
결과에는 이름, 마지막 수정 시각, 크기 같은 실제 파일 정보가 나타납니다.

명령은 자동화의 재료이기도 합니다. 직접 한 줄씩 실행해 확인한 명령을 `.ps1` 파일에 같은 순서로
저장하면 PowerShell이 위에서 아래로 실행할 수 있습니다. 하지만 한 번만 할 화면 작업까지 억지로
명령으로 바꿀 필요는 없습니다.

## 현재 폴더가 명령의 출발점입니다

### 경로를 먼저 확인하면 엉뚱한 폴더에서 파일을 찾는 실수를 줄일 수 있습니다

![폴더 트리의 현재 위치 표시와 터미널에 나타난 같은 폴더의 파일 목록이 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0e/0e353d9d40bc8f2750d67ba8b3ab7cf430ef82a18df7ab9fbf1ad7023db408e8.png "터미널의 현재 위치와 명령이 읽는 파일 위치는 서로 같아야 합니다")

터미널에는 현재 폴더가 하나 정해져 있습니다. 파일 이름만 적은 명령은 이 폴더부터 파일을 찾습니다.
바탕화면에 있는 `hello.py`를 다른 폴더에서 실행하면 파일이 없다는 오류가 나오는 이유입니다.

PowerShell에서는 `Get-Location`으로 현재 폴더를 확인합니다. 이어서 `Get-ChildItem -Name`을 실행하면
그 폴더 안의 파일과 하위 폴더 이름만 볼 수 있습니다. 두 결과를 먼저 확인하면 명령을 실행할 장소가
맞는지 판단할 수 있습니다.

#### 코드

```powershell
Get-Location
Get-ChildItem -Name
```

결과는 컴퓨터마다 다릅니다. 첫 명령 아래에 `C:\Users\mina\project` 같은 경로가 보이고, 두 번째
명령 아래에 `hello.py`가 보인다면 그 파일을 현재 폴더에서 사용할 수 있습니다.

#### 참고 자료

- [Get-Location 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-location)
- [Get-ChildItem 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem)

## 명령은 이름과 옵션으로 읽습니다

### 프로그램 이름 뒤의 옵션이 실행하지 않고 버전만 보여 달라는 조건을 붙입니다

![프로그램 이름 조각과 옵션 조각이 실행기를 거쳐 버전 결과 카드로 바뀌는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7e/7e15048ea5fcee3dbea1969c68007f4eac4a9e8d4e86fe9525fab631bc89cb04.png "명령의 첫 조각은 실행할 프로그램이고 뒤 조각은 원하는 동작을 지정합니다")

`python --version`에는 두 부분이 있습니다. `python`은 실행할 프로그램 이름이고 `--version`은 버전을
보여 주고 끝내라는 옵션입니다. Enter를 누르면 PowerShell이 Python 프로그램을 찾아 이 옵션과 함께
실행합니다.

설치되어 있고 명령 경로도 연결되어 있다면 `Python 3.13.7`처럼 버전이 나타납니다. 명령을 찾을 수
없다는 오류가 나오면 터미널이 고장 난 것이 아닙니다. Python이 설치되지 않았거나 PowerShell이 찾는
폴더 목록에 등록되지 않은 상태입니다.

#### 코드

```powershell
Get-Command python
python --version
```

`Get-Command python`은 `python`이라고 입력했을 때 실제로 실행할 파일을 찾습니다. 성공하면
`python.exe`의 위치가 보입니다. 실패하면 Python 설치 여부와 명령 경로 등록 상태를 확인합니다.

#### 참고 자료

- [Get-Command 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-command)
- [Python 명령줄의 version 옵션](https://docs.python.org/3/using/cmdline.html#cmdoption-version)

## 네 줄만 실행하면 첫 사용이 끝납니다

### 관리자 권한 없이 위치와 파일 및 Python 명령을 차례로 확인합니다

![일반 권한 터미널의 네 입력 줄이 현재 경로와 파일 목록 및 Python 확인 결과로 이어진 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/99/9975d4e61f78dbd4a10a366ddefdda40ae6ca408b68229ad5a02c06ba5e8fe7b.png "처음에는 컴퓨터를 바꾸지 않는 확인 명령만 실행해도 터미널의 입력과 결과를 익힐 수 있습니다")

Windows 시작 메뉴에서 `터미널`을 검색해 Windows Terminal을 엽니다. 검색 결과에 없다면
`PowerShell`을 검색해 일반 PowerShell 창을 엽니다. 첫 연습에는 관리자 권한이 필요하지 않습니다.

아래 네 줄은 파일을 삭제하거나 설정을 바꾸지 않습니다. 한 줄씩 입력하고 Enter를 누른 뒤 결과를
읽습니다. `python`을 찾지 못했다는 오류도 현재 설치 상태를 알려 주는 정상적인 확인 결과입니다.

#### 코드

```powershell
Get-Location
Get-ChildItem -Name
Get-Command python
python --version
```

#### 확인 목록

- 첫 줄 아래에서 현재 폴더 경로를 확인합니다.
- 두 번째 줄 아래에서 그 폴더의 파일과 하위 폴더 이름을 확인합니다.
- 세 번째 줄에서 `python.exe` 위치 또는 명령을 찾지 못했다는 오류를 확인합니다.
- 네 번째 줄에서 Python 버전 또는 명령을 찾지 못했다는 오류를 확인합니다.

인터넷에서 복사한 명령은 뜻을 확인한 뒤 실행해야 합니다. 특히 `Remove-Item`, 관리자 권한, 설치
명령이 함께 보이면 대상 파일과 변경 범위를 먼저 읽습니다. 지금 실행한 네 줄은 확인만 하므로 첫
연습으로 안전합니다.

터미널 창, PowerShell 셸, Python 프로그램을 구분하고 현재 폴더까지 확인했다면 준비가 끝났습니다.
이제 `Get-Location`과 `Get-Command python`을 다시 실행해 현재 위치와 실행할 프로그램을 직접 확인합니다.
