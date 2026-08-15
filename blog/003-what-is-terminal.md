---
title: 터미널이란 무엇인가? PowerShell과 명령줄을 처음부터 이해하기
slug: what-is-terminal
author: eddmpython
section: Python 학습과 자동화
summary: 터미널이란 무엇인가부터 Windows Terminal과 PowerShell 및 Python의 관계까지 설명합니다. 현재 폴더, 명령의 구조, 실행 결과와 오류를 읽는 법도 안전한 명령으로 직접 확인합니다.
readerQuestion: 터미널과 PowerShell은 무엇이 다르고, 명령 한 줄을 입력하면 컴퓨터 안에서 어떤 일이 일어날까?
readerTakeaway: 터미널은 입력과 결과를 보여 주는 창이고 PowerShell은 명령을 해석하는 셸이며, 현재 폴더와 실행할 프로그램 및 결과를 차례로 확인하면 검은 창을 안전하게 사용할 수 있다.
readerLevel: beginner
readerStartingPoint: 브라우저에서 Python 코드를 한 번 실행했지만 검은 창의 커서와 경로가 무엇을 뜻하는지는 모른다.
primaryKeyword: 터미널이란 무엇인가
searchIntent: explanation
depthContract: standalone-deep-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c4/c48d24f41874f452270a34c0e360353458d9abaf91f5d0063711a674a87a7582.png
ogImageAlt: 키보드에서 입력한 명령이 PowerShell을 거쳐 폴더 경로 결과로 돌아오는 터미널 동작
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

터미널이란 무엇인가 궁금한 상태에서 설치 안내의 `터미널을 여세요`라는 문장을 만나면 바로 막힙니다. 검은 창에는 버튼도
설명도 없고, 현재 무엇을 보고 있는지 알려 주는 표지판도 없어 보입니다. 잘못 입력하면 컴퓨터가
망가질 것 같아서 깜빡이는 커서 앞에서 멈추기도 합니다.

그러나 터미널은 개발자만 아는 비밀스러운 장소가 아닙니다. 컴퓨터에 부탁할 일을 글자로 입력하고,
컴퓨터가 돌려준 결과를 글자로 확인하는 창입니다. 파일 탐색기에서 폴더를 두 번 클릭하는 대신
`Get-ChildItem`이라고 입력하고, Python 아이콘을 찾는 대신 `python --version`이라고 입력하는 차이만
있습니다.

중요한 것은 명령을 많이 외우는 일이 아닙니다. 지금 보는 창이 무엇인지, 누가 입력을 해석하는지,
어느 폴더를 기준으로 일하는지, 어떤 프로그램이 실제로 실행됐는지를 구분하는 일입니다. 이 네 가지를
구분하면 성공 결과뿐 아니라 오류도 읽을 수 있습니다. 이 글에서는 Windows의 Windows Terminal과
PowerShell을 기준으로 그 구조를 처음부터 확인합니다.

## 터미널이란 무엇인가: 명령과 결과를 보여 주는 창입니다

### 커서에 입력한 글자가 셸로 전달되고 처리 결과가 같은 화면에 돌아옵니다

![키보드에서 입력한 명령이 PowerShell을 거쳐 폴더 경로 결과로 돌아오는 터미널 동작](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c4/c48d24f41874f452270a34c0e360353458d9abaf91f5d0063711a674a87a7582.png "명령을 입력하고 결과를 읽는 왕복 구조가 터미널의 기본 동작입니다")

터미널은 키보드 입력을 받아 연결된 명령 프로그램에 전달하고, 그 프로그램이 돌려준 글자를 화면에
그리는 앱입니다. Windows Terminal의 탭, 글꼴, 배경색, 창 크기는 모두 이 입출력을 편하게 보여 주기
위한 기능입니다. 배경이 검은색인 경우가 많지만 흰색으로 바꿔도 터미널의 역할은 달라지지 않습니다.

창을 열면 보통 `PS C:\Users\mina>`처럼 생긴 한 줄과 깜빡이는 커서가 보입니다. 이 줄을
프롬프트라고 합니다. `PS`는 PowerShell을 사용하고 있다는 힌트이고, 가운데 경로는 현재 폴더이며,
마지막 기호는 명령을 받을 준비가 됐다는 표시입니다. 프롬프트 자체는 실행할 명령이 아니므로 사용자는
그 뒤에 필요한 글자만 입력합니다.

#### 실행 명령: 입력 한 줄과 출력 한 줄 구분하기

아래 명령에서 `Write-Output`은 뒤에 받은 값을 성공 결과로 내보냅니다. 따옴표 안의 문장은 하나의
문자열입니다. 전체 줄을 입력하고 Enter를 누르면 바로 아래에 `붕어빵 3개`가 한 번 나타나야 합니다.
위쪽은 사용자가 보낸 입력이고 아래쪽은 PowerShell이 돌려준 출력입니다.

```powershell
Write-Output "붕어빵 3개"
```

이 짧은 왕복에는 터미널 사용의 핵심이 모두 들어 있습니다. 입력을 적고, Enter로 실행을 요청하고,
새로 나타난 결과를 읽은 다음, 다시 프롬프트가 나타나면 다음 명령을 받을 준비가 된 것입니다. 결과가
없거나 빨간 오류가 보이더라도 창이 고장 난 것은 아닙니다. 그것도 명령 처리 결과의 한 종류입니다.

#### 참고 자료: 터미널과 명령 셸의 공식 정의

- [Microsoft의 명령 셸과 터미널 설명](https://learn.microsoft.com/en-us/powershell/scripting/what-is-a-command-shell)
- [Windows Terminal 공식 개요](https://learn.microsoft.com/en-us/windows/terminal/)

## 터미널이라는 이름에는 물리 장치의 역사가 남아 있습니다

### 종이에 결과를 찍던 단말기의 입력과 출력 기능이 오늘날 화면 속 앱으로 옮겨 왔습니다

![종이에 출력하는 초기 전신 단말기와 CRT 화면 단말기 및 현대 터미널 앱이 차례로 이어진 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8d/8dd2baa2a3e801c613b423219b8242cd463dc2902b5b84c55f5b1abf86a14e12.png "별도 기계였던 터미널이 화면 속 프로그램으로 바뀌어도 입력과 출력이라는 역할은 남았습니다")

터미널은 처음부터 검은색 앱을 뜻한 말이 아니었습니다. 초기의 사용자는 전신 타자기와 닮은 별도
장치로 중앙 컴퓨터에 글자를 보내고 종이에 결과를 받았습니다. 뒤에는 종이 대신 CRT 화면이 달린
단말기가 같은 역할을 맡았습니다. 계산을 수행하는 큰 컴퓨터와 사용자가 만나는 끝 지점이었기 때문에
터미널이라는 이름이 붙었습니다.

개인용 컴퓨터가 널리 쓰이면서 키보드, 화면, 계산 장치가 한 기계 안으로 들어왔습니다. 물리 단말기를
따로 놓을 필요는 없어졌지만, 옛 장치의 동작을 소프트웨어로 재현하는 터미널 앱은 남았습니다.

오늘의 Windows Terminal도 글자를 받아 셸에 보내고 셸이 돌려준 글자를 화면에 표시합니다. 그래서
터미널 에뮬레이터라는 표현도 사용합니다. 사라진 물리 장치를 소프트웨어가 흉내 낸다는 뜻입니다.

`콘솔`, `명령줄`, `터미널`이라는 말은 일상에서 섞여 쓰입니다. 처음부터 모든 역사적 차이를 외울
필요는 없습니다. 대신 누군가 `터미널에서 실행하세요`라고 말하면 두 질문을 떠올리면 됩니다. 첫째,
입력과 결과를 보여 주는 창은 무엇인가. 둘째, 그 창 안에서 명령을 읽는 셸은 무엇인가. Windows에서는
각각 Windows Terminal과 PowerShell인 경우가 많습니다.

#### 설명 목록: 비슷해 보이는 세 표현을 구분하는 기준

- **터미널 앱:** 키보드 입력과 셸의 출력을 화면에 보여 줍니다.
- **명령줄 인터페이스:** 버튼 대신 글자로 프로그램과 상호작용하는 방식 전체를 가리킵니다.
- **콘솔:** 문맥에 따라 터미널 창이나 운영체제의 문자 입출력 환경을 가리키므로 어떤 프로그램인지 함께 확인합니다.

#### 참고 자료: Windows 명령줄의 터미널 역사

- [Windows 명령줄과 터미널 구조의 역사](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)

## 터미널과 PowerShell은 서로 다릅니다

### 창과 명령 해석기와 실제 작업 프로그램을 분리하면 각자의 역할이 선명해집니다

![Windows Terminal 창 안의 여러 셸이 각각 Python과 Git 같은 프로그램을 실행하는 층별 구조](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/42/42ee2ee6e00b6d6376f50f87edf950b771f3e79384e935010a2938cd06eec774.png "터미널은 셸을 담고 셸은 외부 프로그램을 찾아 실행한 뒤 그 결과를 터미널로 돌려보냅니다")

Windows Terminal은 여러 명령줄 프로그램을 탭으로 담을 수 있는 창입니다. 그 안에는 PowerShell,
명령 프롬프트, WSL의 bash 같은 서로 다른 셸을 열 수 있습니다. 탭을 바꾸면 같은 터미널 앱 안에서도
명령 문법과 기본 도구가 달라질 수 있습니다. 인터넷에서 본 bash 명령을 PowerShell에 그대로 넣었을
때 실패하는 이유가 여기에 있습니다.

PowerShell은 입력한 글자를 명령으로 해석하는 셸이자 스크립트 언어입니다. `Get-Location`처럼
PowerShell이 제공하는 명령을 직접 실행할 수 있고, `python`이나 `git`처럼 따로 설치된 프로그램을
운영체제에 실행해 달라고 요청할 수도 있습니다.

Python은 PowerShell의 일부가 아닙니다. PowerShell이 Python 실행 파일을 찾아 새 프로세스로 시작하고
인수를 전달합니다.

프로세스는 실행 중인 프로그램 한 개를 가리키는 말입니다. 디스크에 저장된 `python.exe`는 파일이고,
`python --version`을 실행해 메모리에서 동작하기 시작한 Python은 프로세스입니다. 명령이 끝나면 그
프로세스가 결과와 종료 상태를 남기고 사라집니다. 다시 프롬프트가 보이는 것은 PowerShell이 다음
입력을 받을 차례로 돌아왔다는 뜻입니다.

#### 실행 명령: 같은 창에서 셸 명령과 외부 프로그램 찾기

`Get-Command`는 입력한 이름이 실제로 무엇을 가리키는지 보여 줍니다. 첫 줄은 PowerShell 자체의
`Get-Location` 명령을 찾고, 두 번째 줄은 설치된 Python 명령을 찾습니다. 결과의 `CommandType`과
`Source` 또는 경로를 보면 PowerShell 명령인지 외부 실행 파일인지 구분할 수 있습니다.

Python이 없다면 두 번째 줄만 오류가 나며 터미널과 PowerShell은 계속 정상입니다. 이때 Python 설치와
검색 경로를 확인하면 되고 터미널을 다시 설치할 필요는 없습니다.

```powershell
Get-Command Get-Location
Get-Command python
```

이 구분은 오류의 책임 범위를 줄여 줍니다. Windows Terminal의 글자가 깨지면 표시 문제를 살피고,
명령 문법을 알아듣지 못하면 PowerShell 문법을 살피고, Python 파일이 실행 중 실패하면 Python 코드와
입력을 살핍니다. 모두 같은 창에 보이더라도 같은 프로그램에서 생긴 문제는 아닙니다.

#### 참고 자료: 터미널과 PowerShell의 역할

- [Windows Terminal이 지원하는 셸과 명령줄 앱](https://learn.microsoft.com/en-us/windows/terminal/faq)
- [PowerShell 공식 개요](https://learn.microsoft.com/en-us/powershell/scripting/overview)
- [Get-Command 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-command)

## 개발자가 터미널을 쓰는 이유는 빠름보다 재현성에 있습니다

### 저장된 명령은 같은 조건을 다시 적용하고 실행한 근거를 글자로 남길 수 있습니다

![하나의 저장된 명령이 세 번 실행되어 같은 형식의 파일 목록 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6f/6fe5b5b9f03f148886344bda578711467f68b701008bc86ee39da681da956463.png "같은 명령을 다시 실행하면 클릭 위치를 기억하지 않아도 같은 조건으로 파일을 확인할 수 있습니다")

터미널이 언제나 마우스보다 빠른 것은 아닙니다. 사진 열 장을 눈으로 비교하거나 낯선 폴더를 둘러볼
때는 파일 탐색기가 더 편합니다. 터미널의 진짜 장점은 작업 조건을 한 줄에 정확히 적을 수 있다는
점입니다. `현재 폴더에서 파일만 세어라`라는 조건이 명령에 남으므로 내일 다시 실행하거나 동료에게
전달해도 같은 기준을 적용할 수 있습니다.

명령은 기록하기 쉽습니다. 성공한 줄을 문서에 붙이면 실행 절차가 되고, 여러 줄을 `.ps1` 파일에
저장하면 PowerShell 스크립트가 됩니다. 자동화 서버도 사람이 클릭할 버튼을 찾는 대신 저장된 명령을
정해진 순서로 실행합니다. 개발 환경 설치, 테스트, 빌드, 배포가 터미널 명령으로 제공되는 이유도
사람과 컴퓨터가 같은 절차를 재실행할 수 있기 때문입니다.

또 하나의 장점은 관찰 가능성입니다. 명령, 출력, 오류를 글자로 복사할 수 있어 `안 됩니다`가 아니라
`이 폴더에서 이 명령을 실행했더니 이 오류가 나왔습니다`라고 전달할 수 있습니다. AI에게 도움을 받을
때도 화면이 이상하다는 설명보다 실행한 명령과 첫 오류를 함께 주는 편이 훨씬 정확합니다.

다만 비밀번호, 토큰, 회사 파일 경로처럼 민감한 내용은 로그를 공유하기 전에 반드시 지워야 합니다.

#### 예시 코드: 현재 폴더의 파일 수를 같은 조건으로 세기

첫 줄은 현재 폴더의 파일만 가져오고, 파이프 기호는 그 파일 객체들을 다음 명령으로 보냅니다.
`Measure-Object`는 받은 항목 수를 셉니다. 같은 폴더에서 다시 실행하면 같은 필터가 적용됩니다. 파일이
추가되거나 삭제되지 않았다면 `Count` 값도 같아야 하며, 값이 달라졌다면 폴더의 실제 상태가 바뀐
것입니다.

```powershell
Get-ChildItem -File | Measure-Object
```

PowerShell의 파이프는 화면의 글자를 무조건 이어 붙이는 통로가 아닙니다. PowerShell 명령끼리는 이름,
크기, 수정 시각 같은 속성을 가진 객체를 전달할 수 있습니다. 그래서 다음 명령이 필요한 속성을 골라
처리하기 쉽습니다. 이 기능이 긴 작업을 작은 명령으로 나누어 조합하게 합니다.

#### 설명 목록: 터미널과 그래픽 화면을 고르는 기준

- **터미널이 유리한 일:** 같은 조건의 반복 실행, 여러 파일 처리, 실행 기록 공유, 자동 테스트와 배포입니다.
- **그래픽 화면이 유리한 일:** 이미지 비교, 자유로운 배치, 처음 보는 구조 탐색, 한 번뿐인 시각 작업입니다.
- **둘을 함께 쓰는 일:** 파일 탐색기로 대상을 확인하고 터미널에서 정확한 명령을 실행한 뒤 결과 파일을 다시 화면으로 검토합니다.

## 현재 폴더는 모든 상대 경로의 출발점입니다

### 파일 이름만 적었을 때 어느 위치를 찾는지 알면 가장 흔한 경로 오류를 막을 수 있습니다

![폴더 트리의 현재 위치 표시와 터미널에 나타난 같은 폴더의 파일 목록이 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/50/50533a474c413ff801d16a7f721f795afff17c5a42c996d44a7e8912b253f915.png "현재 위치로 선택된 폴더가 경로를 생략한 명령의 기본 검색 범위가 됩니다")

터미널 세션에는 현재 위치가 하나 있습니다. 이를 현재 폴더 또는 작업 폴더라고 부릅니다. 명령에 전체
경로를 적지 않으면 PowerShell은 이 위치를 기준으로 파일과 하위 폴더를 찾습니다. 바탕화면에 분명히
`hello.py`가 있는데 `파일을 찾을 수 없습니다`라는 오류가 나는 가장 흔한 이유는 다른 폴더에서 명령을
실행했기 때문입니다.

경로에는 절대 경로와 상대 경로가 있습니다. `C:\Users\mina\project\hello.py`처럼 드라이브부터
전부 적은 것은 절대 경로입니다. 현재 위치가 어디든 같은 파일을 가리킵니다. `hello.py`나
`.\hello.py`처럼 현재 위치를 기준으로 적은 것은 상대 경로입니다. 짧고 프로젝트를 다른 컴퓨터로
옮기기 쉽지만, 현재 위치가 바뀌면 가리키는 대상도 바뀝니다.

점 하나인 `.`은 현재 위치를, 점 두 개인 `..`은 부모 폴더를 뜻합니다. PowerShell은 보안을 위해 현재
폴더의 실행 파일이나 스크립트를 이름만으로 자동 실행하지 않습니다. 현재 폴더의 `setup.ps1`을 실행할
때 `setup.ps1`이 아니라 `.\setup.ps1`이라고 적는 이유입니다.

반대로 `python`처럼 경로 없이 실행되는 이름은 운영체제가 등록된 검색 경로에서 찾습니다. 눈앞에 파일이
보이는 것과 이름만으로 실행할 수 있는 것은 서로 다른 조건입니다.

#### 실행 명령: 현재 위치와 그 안의 파일을 먼저 확인하기

`Get-Location`은 현재 위치를 보여 주고 `Get-ChildItem -Name`은 그 위치 바로 아래의 이름을 보여
줍니다. 먼저 경로를 읽은 뒤 목록에서 실행할 파일이 실제로 보이는지 확인합니다. 두 줄은 파일을 만들거나
지우지 않는 조회 명령입니다. 결과가 예상 폴더와 다르면 실행 명령보다 위치부터 바로잡아야 합니다.

```powershell
Get-Location
Get-ChildItem -Name
```

폴더를 바꿀 때는 `Set-Location`을 사용합니다. 경로에 공백이 있다면 전체를 따옴표로 묶어 하나의 값으로
전달해야 합니다. 예를 들어 `C:\Users\mina\My Project`를 따옴표 없이 적으면 `My`와 `Project`가
서로 다른 입력으로 해석될 수 있습니다.

이동한 직후 `Get-Location`을 다시 실행하면 기억이 아니라 실제 결과로 현재 위치를 확인할 수 있습니다.

#### 예시 코드: 공백이 있는 프로젝트 폴더로 이동하기

아래의 경로는 설명용 예시이므로 자신의 컴퓨터에 실제로 존재하는 프로젝트 경로로 바꿔야 합니다.
첫 줄은 PowerShell 세션의 현재 위치만 바꾸며 폴더 내용은 변경하지 않습니다. 두 번째 줄의 결과가 방금
입력한 프로젝트 경로와 같아야 이동이 성공한 것입니다.

```powershell
Set-Location "C:\Users\mina\My Project"
Get-Location
```

#### 참고 자료: PowerShell의 현재 위치와 명령 검색

- [PowerShell 위치 개념 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_locations)
- [현재 폴더의 실행 파일에 점과 역슬래시가 필요한 이유](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence)

## 명령은 프로그램과 매개변수 및 값으로 읽습니다

### 띄어쓰기와 따옴표가 입력을 여러 조각으로 나누므로 각 조각의 주인을 확인해야 합니다

![프로그램 이름 조각과 옵션 조각이 실행기를 거쳐 버전 결과 카드로 바뀌는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/88/88998b6bd1ab98652af7d7c8c3be210e200ea7ab017df6df49bc7b3ec6cf08d6.png "프로그램 이름과 옵션을 분리해 읽으면 누가 어떤 동작을 처리하는지 알 수 있습니다")

명령 한 줄은 통째로 외우기보다 조각으로 읽어야 합니다. `Get-ChildItem -Path . -File`에서
`Get-ChildItem`은 실행할 PowerShell 명령입니다. `-Path`는 어느 위치를 볼지 지정하는 매개변수이고,
뒤의 `.`은 그 매개변수에 전달하는 값입니다. `-File`은 별도 값 없이 파일만 고르라는 선택을 켜는
스위치 매개변수입니다.

PowerShell은 입력을 토큰이라는 조각으로 나눈 뒤 각 조각의 역할을 판단합니다. 보통 공백이 경계가
되므로 공백이 들어간 하나의 값을 전달하려면 따옴표가 필요합니다. 작은따옴표는 안의 내용을 거의 그대로
전달하고, 큰따옴표는 `$name` 같은 변숫값을 펼칠 수 있습니다. 처음에는 경로와 사람이 읽는 문장을
따옴표로 묶는 습관만 가져도 많은 오류를 피할 수 있습니다.

`python --version`은 겉모양이 비슷하지만 주인이 다릅니다. `python`은 PowerShell이 찾을 외부 프로그램
이름이고 `--version`은 Python 프로그램에 전달하는 옵션입니다.

PowerShell은 입력을 나누고 Python을 실행하지만, 이 옵션의 뜻은 Python이 결정합니다. 그래서 한
프로그램의 옵션을 다른 프로그램에 붙이면 모양이 비슷해도 동작하지 않습니다.

#### 예시 코드: PowerShell 매개변수와 Python 옵션 비교하기

첫 줄은 PowerShell 명령과 `-Path`, `-File` 매개변수로 구성됩니다. 두 번째 줄은 외부 프로그램과
`--version` 옵션으로 구성됩니다. 첫 결과에는 현재 폴더의 파일 정보가 나오고 두 번째 결과에는 설치된
Python 버전이 나와야 합니다. 두 줄의 하이픈 개수보다 중요한 것은 그 옵션을 어느 프로그램이 해석하는지
구분하는 일입니다.

```powershell
Get-ChildItem -Path . -File
python --version
```

명령의 사용법을 추측할 필요도 없습니다. PowerShell 명령은 `Get-Help`로 설명과 예제를 볼 수 있고,
외부 프로그램은 보통 `--help`나 `-h` 옵션을 제공합니다. 다만 모든 프로그램이 같은 옵션을 지원한다고
가정하면 안 됩니다. 실행하기 전에 해당 프로그램의 공식 문서와 도움말을 확인하는 것이 가장 정확합니다.

#### 실행 명령: 파일 조회 명령의 공식 사용 예 확인하기

아래 명령은 `Get-ChildItem`을 실행해 파일을 바꾸는 대신 PowerShell에 등록된 도움말의 예제 부분을
읽습니다. 도움말이 컴퓨터에 내려받아져 있지 않으면 축약된 정보가 나오거나 온라인 도움말 안내가 보일
수 있습니다. 이때도 명령 이름과 매개변수 구조를 확인할 수 있습니다.

```powershell
Get-Help Get-ChildItem -Examples
```

#### 참고 자료: PowerShell이 입력을 해석하는 방식

- [PowerShell 명령 구문 분석 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing)
- [PowerShell 매개변수 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parameters)
- [Python 명령줄의 version 옵션](https://docs.python.org/3/using/cmdline.html#cmdoption-version)

## 명령을 실행한 뒤에는 결과와 오류를 함께 읽습니다

### 성공 여부는 창의 색보다 실행한 명령과 출력 내용 및 종료 상태로 판단합니다

![일반 권한 터미널의 네 입력 줄이 현재 경로와 파일 목록 및 Python 확인 결과로 이어진 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/79/79ce3cb15d9d9eb54f3b42f63b1ef241bc3b48dcf0691e48c6f29391a8910b0e.png "파일을 바꾸지 않는 네 명령으로 현재 위치와 파일 및 Python 설치 상태를 차례로 확인합니다")

Windows 시작 메뉴에서 `터미널`을 검색해 Windows Terminal을 열면 보통 PowerShell 프로필이
시작됩니다. Windows Terminal이 없다면 `PowerShell`을 검색해 일반 창을 열어도 이 글의 명령을 실행할
수 있습니다. 첫 연습에는 관리자 권한이 필요하지 않습니다. 오히려 일반 권한으로 시작해야 실수했을 때
변경 범위가 작습니다.

명령을 실행하면 정상 결과뿐 아니라 오류, 경고, 진행 정보가 서로 다른 출력 흐름으로 나올 수 있습니다.
PowerShell의 성공 스트림은 정상 결과를 다음 명령으로 전달하는 통로이고 오류 스트림은 실패 정보를
전달합니다. 외부 프로그램도 일반적으로 정상 출력과 오류 출력을 나눕니다.

화면 색은 설정에 따라 달라질 수 있으므로 빨간색만 찾기보다 오류 문장의 첫 줄과 대상 경로를 읽어야
합니다.

외부 프로그램은 끝날 때 종료 코드를 남기기도 합니다. 관례상 `0`은 요청한 작업을 성공적으로 마쳤다는
뜻이고 0이 아닌 값은 어떤 실패가 있었다는 뜻입니다. PowerShell에서는 외부 프로그램을 실행한 직후
`$LASTEXITCODE`로 그 값을 확인할 수 있습니다. 단, 숫자 하나만으로 원인은 알 수 없으므로 화면의 오류
메시지와 프로그램 문서를 함께 봐야 합니다.

#### 실행 명령: 파일을 바꾸지 않고 터미널의 현재 상태 확인하기

아래 네 줄은 위치, 파일 이름, Python 명령의 실제 대상, Python 버전을 차례로 조회합니다. 한 줄씩
실행하고 매번 결과를 읽어야 어느 단계에서 기대와 달라졌는지 알 수 있습니다. Python이 설치되지 않았거나
검색 경로에 없다면 세 번째 또는 네 번째 줄이 실패할 수 있습니다. 그 실패 자체가 현재 설치 상태를
알려 주는 유효한 진단 결과입니다.

```powershell
Get-Location
Get-ChildItem -Name
Get-Command python
python --version
```

첫 줄에서 예상한 프로젝트 폴더가 보이고, 두 번째 줄에서 작업할 파일이 보이며, 세 번째 줄에서 실제
`python.exe` 경로가 보이고, 네 번째 줄에서 버전이 보이면 터미널에서 Python을 실행할 기본 연결이
완성된 것입니다.

여러 Python이 설치된 컴퓨터라면 `Get-Command python -All`로 같은 이름의 후보를 확인할 수 있습니다.
최신 Python의 Windows 설치 관리자를 사용한다면 `py --list`로 등록된 런타임을 확인하는 방법도
있습니다.

#### 실패 예시: 세 가지 오류를 책임 범위로 나누기

- **명령을 찾을 수 없음:** 이름의 철자를 확인하고 `Get-Command 이름`으로 설치와 검색 경로를 확인합니다.
- **경로를 찾을 수 없음:** `Get-Location`과 `Get-ChildItem -Name`으로 현재 폴더와 실제 파일 이름을 확인합니다.
- **액세스가 거부됨:** 권한을 무작정 높이지 않고 어떤 파일과 동작이 막혔는지 먼저 확인합니다.

오류를 해결할 때는 명령을 마구 바꾸지 않습니다. 실행한 정확한 명령, 현재 폴더, 첫 오류 문장, 기대한
결과를 한 묶음으로 기록합니다. 그다음 철자, 경로, 프로그램 설치, 권한 순서로 범위를 좁힙니다. 한 번에
하나만 바꾸고 같은 명령을 다시 실행해야 무엇이 원인이었는지 알 수 있습니다.

인터넷이나 AI가 준 명령도 같은 기준으로 읽어야 합니다. 실행할 프로그램, 대상 경로, 데이터를 바꾸는
동작, 관리자 권한 요구를 확인하기 전에는 붙여 넣지 않습니다. `Get`, `Test`, `Measure`로 시작하는
조회 명령은 대상을 관찰하는 경우가 많지만 이름만으로 안전을 단정해서도 안 됩니다.

변경 명령이 `-WhatIf`를 지원한다면 실제 변경 없이 예정된 동작을 미리 볼 수 있습니다. 하지만 모든
프로그램에 적용되는 만능 안전장치는 아니므로 실제 대상과 공식 도움말을 함께 확인해야 합니다.

#### 확인 목록: 처음 보는 명령을 실행하기 전 묻는 다섯 질문

- 어떤 프로그램이 이 명령의 첫 단어를 해석하는지 확인합니다.
- 현재 폴더와 명령이 가리키는 실제 경로를 확인합니다.
- 읽기만 하는지 파일, 설정, 계정을 바꾸는지 확인합니다.
- 비밀번호와 토큰 및 회사 데이터가 출력되거나 전송되는지 확인합니다.
- 성공했을 때 보여야 할 결과와 실패했을 때 멈출 지점을 확인합니다.

#### 참고 자료: 출력과 Python 실행 상태 확인

- [PowerShell 출력 스트림 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_output_streams)
- [PowerShell 자동 변수와 LASTEXITCODE](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables)
- [Python의 Windows 설치와 py 명령](https://docs.python.org/3/using/windows.html)

터미널을 이해했다는 것은 명령을 많이 외웠다는 뜻이 아닙니다. 터미널 창, PowerShell 셸, 실행할
프로그램, 현재 폴더를 서로 다른 대상으로 볼 수 있다는 뜻입니다. 이제 검은 창을 보면 먼저 프롬프트의
경로를 읽고, `Get-Command`로 실행 대상을 확인하고, 명령 뒤에 나온 결과나 첫 오류를 읽을 수 있습니다.

이 세 가지 습관이 생기면 터미널은 두려운 화면이 아닙니다. 자동화 과정을 정확히 관찰하고 같은 조건으로
다시 실행하는 도구가 됩니다.
