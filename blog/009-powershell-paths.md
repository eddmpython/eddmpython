---
title: PowerShell 파일 경로 읽는 법: 현재 폴더부터 Python 실행까지
slug: powershell-paths
author: eddmpython
section: 터미널과 로컬 실행
summary: PowerShell 파일 경로를 현재 위치, 상대 경로와 절대 경로, 공백, 와일드카드 순서로 설명합니다. 공백이 있는 연습 폴더를 만들고 Python 파일 실행과 경로 오류 복구까지 직접 확인합니다.
readerQuestion: PowerShell에서 파일 경로를 어떻게 읽고 원하는 Python 파일을 정확히 실행할까?
readerTakeaway: 현재 위치를 확인하고 경로를 조합한 뒤 파일 종류와 실제 위치를 검사하면 엉뚱한 파일을 실행하는 실수를 줄일 수 있다.
readerLevel: beginner
readerStartingPoint: PowerShell 창을 열고 명령을 입력할 수 있지만 점과 역슬래시 및 따옴표가 경로에서 무엇을 뜻하는지는 모른다.
primaryKeyword: PowerShell 파일 경로
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e4/e42c7b6d9c253f8cd09ed01338d36d09364b77320d48666286daecf6be20ecc3.png
ogImageAlt: 드라이브 루트에서 여러 폴더를 차례로 지나 Python 파일 하나에 도착하는 PowerShell 파일 경로의 구성
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

PowerShell 파일 경로가 맞지 않으면 파일이 컴퓨터에 있어도 `찾을 수 없습니다`라는 오류가 납니다.
탐색기에서 보고 있는 폴더와 PowerShell의 현재 위치가 다르거나, 공백과 대괄호를 다른 뜻으로 읽었기
때문일 수 있습니다. 이때 Python을 다시 설치해도 파일 주소는 고쳐지지 않습니다.

이 글에서는 경로 한 줄을 드라이브, 폴더, 파일 이름으로 나누어 읽습니다. 이어서 공백이 있는
`path practice` 폴더와 `src\hello.py`를 만들고, 파일 존재 여부와 실제 위치 및 Python 종료 코드까지
확인합니다. 마지막에 `경로 연습 성공`과 숫자 `0`이 차례로 보이면 경로와 실행이 모두 맞습니다.

## 경로는 파일까지 이어지는 주소입니다

### 드라이브와 폴더 및 파일 이름을 순서대로 읽으면 경로가 가리키는 대상을 알 수 있습니다

![드라이브 루트에서 여러 폴더를 차례로 지나 Python 파일 하나에 도착하는 PowerShell 파일 경로의 구성](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e4/e42c7b6d9c253f8cd09ed01338d36d09364b77320d48666286daecf6be20ecc3.png "경로는 폴더 이름을 나열한 장식이 아니라 루트부터 대상 파일까지의 부모와 자식 순서를 기록합니다")

경로는 파일이나 폴더가 놓인 위치를 식별하는 주소입니다. Windows 파일 경로
`C:\work\path practice\src\hello.py`는 `C:` 드라이브에서 시작해 세 폴더를 차례로 지나
`hello.py` 파일에 도착합니다. 순서가 하나라도 달라지면 이름이 같은 다른 파일을 가리키거나 아무것도
찾지 못합니다.

드라이브 바로 뒤의 `\`는 그 드라이브의 가장 위쪽인 루트를 뜻합니다. 루트 아래에는 다른 항목을 담는
폴더가 있고, 마지막에는 이 예제에서 실행할 파일이 있습니다.

PowerShell 공식 문서는 폴더처럼 다른 항목을 담는 대상을 컨테이너라고 부르고 파일처럼 끝에 놓인
대상을 리프라고 부릅니다. 이 글에서는 먼저 익숙한 말인 폴더와 파일을 쓰고, 검사 명령에서
`Container`와 `Leaf`라는 이름을 다시 연결합니다.

경로 자체는 명령이 아닙니다. `python .\src\hello.py`에서 `python`은 실행할 프로그램이고,
`.\src\hello.py`는 그 프로그램에 전달하는 파일 경로입니다. PowerShell이 먼저 두 부분을 나눈 뒤
Python이 두 번째 부분의 파일을 엽니다. 따라서 `python`을 찾지 못한 오류와 `hello.py`를 찾지 못한
오류는 원인이 다릅니다.

#### 설명 목록: 전체 경로를 다섯 부분으로 나누어 읽기

| 경로 조각 | 쉬운 뜻 | 이번 예제에서 하는 일 |
|---|---|---|
| `C:` | 드라이브 | 어느 저장 공간에서 시작할지 정함 |
| `\` | 드라이브 루트 | 드라이브의 가장 위에서 시작함 |
| `work\path practice` | 부모 폴더들 | 대상까지 내려가는 순서를 정함 |
| `src` | 파일을 담은 폴더 | Python 코드를 따로 모음 |
| `hello.py` | 파일 이름과 확장자 | Python이 실제로 열 대상이 됨 |

이제 경로의 각 부분을 읽을 수 있습니다. 그러나 `C:\`부터 전부 적지 않은 짧은 경로는 별도의
출발점이 필요하므로 다음에는 PowerShell이 현재 보고 있는 폴더를 확인해야 합니다.

#### 참고 자료: PowerShell 전체 경로와 상대 경로 문법

- [Microsoft about_Path_Syntax 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_path_syntax?view=powershell-7.5)

## 현재 위치가 상대 경로의 출발점입니다

### Get-Location과 Get-ChildItem을 함께 실행하면 명령이 어느 폴더에서 파일을 찾는지 알 수 있습니다

![PowerShell의 현재 위치 한 곳이 상대 경로의 출발점이 되어 그 폴더 안의 항목만 결과로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/66/6609338a7947e15c6bccbfc6f99d211ad4a1cce25f42afffd1ec52ca120c2eaa.png "경로를 생략하거나 점으로 시작하면 PowerShell은 현재 위치 표시에서 파일 탐색을 시작합니다")

PowerShell은 명령을 실행할 때 현재 위치를 하나 가지고 있습니다. `Get-Location`은 그 위치를
`Path`라는 값으로 보여 주고, `Get-ChildItem -Name`은 바로 그 폴더 안의 이름을 보여 줍니다. 두 결과를
붙여 보면 PowerShell이 어느 폴더를 보고 있으며 그 안에 어떤 파일이 있는지 함께 확인할 수 있습니다.

탐색기에서 `hello.py`가 보이더라도 PowerShell의 현재 위치가 다른 폴더라면 `hello.py`만 입력해서는
찾을 수 없습니다. 탐색기와 PowerShell은 서로의 현재 폴더를 자동으로 맞추지 않습니다. `Set-Location`은
PowerShell의 현재 위치를 바꾸며, 이동이 끝난 뒤 다시 `Get-Location`을 실행해야 실제 도착한 곳을
확인할 수 있습니다.

`pwd`, `ls`, `cd`는 각각 `Get-Location`, `Get-ChildItem`, `Set-Location`의 짧은 별칭으로 자주
보입니다. 처음에는 전체 이름을 쓰는 편이 명령의 뜻과 검색할 공식 문서를 연결하기 쉽습니다. 별칭을
몰라도 경로를 확인하고 이동하는 데는 문제가 없습니다.

#### 실행 명령: 현재 위치와 바로 아래 항목 확인하기

첫 명령에는 별도 입력 경로가 없으므로 현재 위치 자체를 보여 줍니다. 둘째 명령도 경로를 생략했기
때문에 같은 위치의 항목만 읽습니다. 출력 첫 줄의 폴더가 예상한 곳인지 보고, 이어지는 이름 목록에서
찾으려는 파일이나 폴더가 있는지 확인합니다.

```powershell
Get-Location
Get-ChildItem -Name
```

#### 예상 결과: 컴퓨터마다 다른 현재 폴더와 그 안의 이름 목록

사용자 이름과 시작 폴더는 컴퓨터마다 다릅니다. 중요한 결과는 경로를 외우는 것이 아니라 첫 줄에 나온
폴더 안의 항목만 다음 줄부터 보인다는 점입니다.

```text
Path
----
C:\Users\사용자이름
Documents
Downloads
...
```

현재 위치가 출발점이라는 사실을 알았으므로 이제 짧은 경로의 점과 역슬래시를 읽을 수 있습니다.

#### 참고 자료: 현재 위치를 확인하고 바꾸는 명령

- [Microsoft Get-Location 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-location?view=powershell-7.5)
- [Microsoft Get-ChildItem 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem?view=powershell-7.5)
- [Microsoft Set-Location 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location?view=powershell-7.5)

## 점과 루트 기호를 정확히 읽습니다

### 같은 파일도 현재 폴더와 부모 폴더 및 드라이브 루트 중 어디서 시작하는지에 따라 경로가 달라집니다

![현재 폴더와 부모 폴더 및 드라이브 루트에서 출발한 서로 다른 경로가 폴더 트리의 대상을 가리키는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/88/885f651f79e5df257d758b0d0491adea203f7d49a91949f5283833c0d8dbda3d.png "점과 루트 기호는 꾸밈 문자가 아니라 파일 탐색을 시작할 위치를 바꿉니다")

상대 경로는 현재 위치를 기준으로 대상을 찾습니다. `.`은 현재 위치이고 `..`은 현재 위치의 부모
폴더입니다. `.`을 생략한 `src\hello.py`도 현재 위치에서 시작하지만, `.\src\hello.py`처럼 점을
적으면 상대 경로라는 사실을 눈으로 알아보기 쉽습니다.

드라이브 문자와 루트부터 모두 적은 `C:\work\src\hello.py`는 전체 경로입니다. 현재 위치가 어디든
같은 주소를 가리키지만 다른 컴퓨터에는 `C:\work` 폴더가 없을 수 있습니다. 프로젝트 안에서 함께
움직이는 파일은 상대 경로가 옮기기 쉽고, 오류를 기록하거나 실제 위치를 확인할 때는 전체 경로가
분명합니다.

Windows에서 `C:\work`와 `C:work`는 같은 뜻이 아닙니다. `C:\work`는 C 드라이브 루트에서 시작하지만
`C:work`는 PowerShell이 C 드라이브에 기억한 현재 위치를 기준으로 찾습니다. 한 글자 차이로 출발점이
달라지므로 전체 경로에는 드라이브 문자 뒤의 역슬래시까지 적습니다.

루트만 적은 `\work`는 현재 드라이브의 루트에서 시작합니다. `$HOME`은 현재 사용자 홈 폴더를 담은
PowerShell 변수입니다. Windows의 PowerShell 명령은 보통 `/`도 받아들이지만 외부 프로그램은 운영체제
구분자만 기대할 수 있으므로 이 글의 Windows 예제는 `\`로 통일합니다.

#### 설명 목록: 출발점을 바꾸는 경로 기호

| 입력 | 출발점 | 현재 위치가 `C:\work\path practice`일 때의 뜻 |
|---|---|---|
| `.` | 현재 위치 | `C:\work\path practice` |
| `.\src` | 현재 위치 | `C:\work\path practice\src` |
| `..` | 부모 폴더 | `C:\work` |
| `\temp` | 현재 드라이브 루트 | `C:\temp` |
| `$HOME` | 사용자 홈 폴더 | 사용자마다 다른 홈 경로 |
| `C:\temp` | C 드라이브 루트 | 현재 위치와 무관한 전체 경로 |

#### 실행 명령: 현재 위치와 부모 및 홈 폴더를 전체 경로로 풀기

`Resolve-Path`는 이미 존재하는 대상을 실제 전체 경로로 풀어 줍니다. 아래 입력 세 개는 각각 현재
위치, 부모 폴더, 사용자 홈 폴더입니다. 출력은 컴퓨터마다 다르지만 첫째와 둘째 결과는 부모와 자식
관계이고 셋째 결과는 `$HOME` 값과 같아야 합니다.

```powershell
Resolve-Path -LiteralPath .
Resolve-Path -LiteralPath ..
Resolve-Path -LiteralPath $HOME
```

상대 경로의 출발점을 읽어도 공백이나 대괄호가 들어간 이름은 명령 해석 단계에서 다른 뜻이 될 수
있습니다. 다음에는 경로 전체를 한 값으로 전달하는 법과 파일명을 그대로 읽는 법을 구분합니다.

## 공백과 특수문자는 다르게 다룹니다

### 공백은 따옴표로 한 인수로 묶고 대괄호가 있는 실제 파일명은 LiteralPath로 그대로 읽습니다

![공백 경로가 따옴표 안에서 한 입력으로 유지되고 대괄호 파일명이 LiteralPath 통로에서 그대로 대상에 도착하는 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0d/0d9ee95ced4f58d90aaf85da0eaea81324783a4ca36e0ce3fd227e617a6d20d2.png "따옴표는 입력의 범위를 묶고 LiteralPath는 와일드카드 해석을 끄므로 해결하는 문제가 서로 다릅니다")

PowerShell은 명령 이름 뒤의 공백을 여러 입력값을 나누는 자리로 사용합니다. 폴더 이름이 `내 프로젝트`라면
`'.\내 프로젝트'`처럼 경로 전체를 따옴표 한 쌍 안에 넣어 한 입력값으로 전달합니다. 작은따옴표는 안의
문자를 입력 그대로 유지하고, 큰따옴표는 `$HOME` 같은 변수 값을 실제 경로로 바꿉니다.

따옴표는 공백을 묶지만 와일드카드 해석까지 끄지는 않습니다. `-Path`를 받는 명령에서 `*`는 여러 글자,
`?`는 한 글자, `[]`는 대괄호 안 후보 중 한 글자를 뜻합니다. 실제 파일 이름이
`report[final].csv`라면 작은따옴표로 묶어도 `-Path`는 대괄호를 검색 무늬로 읽을 수 있습니다.

`-LiteralPath`는 경로를 입력한 그대로 읽습니다. 공백, 대괄호, 물음표처럼 특별한 뜻을 가질 수 있는
문자가 실제 이름에 들어 있거나, 자동화 코드가 정확히 파일 하나만 다뤄야 할 때 적합합니다. 반대로
`*.csv`처럼 여러 파일을 찾으려는 목적이라면 `-Path`의 와일드카드가 필요합니다.

#### 실행 명령: 공백이 있는 폴더로 정확히 이동하기

첫 명령은 고정된 글자를 작은따옴표로 묶습니다. 둘째 예제는 `$HOME` 값을 사용해야 하므로
`Join-Path`로 홈 폴더와 자식 이름을 합친 뒤 변수 하나를 전달합니다. 두 경우 모두 이동 뒤
`Get-Location` 결과의 마지막 폴더 이름이 `내 프로젝트`여야 합니다.

```powershell
Set-Location -LiteralPath '.\내 프로젝트'

$project = Join-Path $HOME '내 프로젝트'
Set-Location -LiteralPath $project
Get-Location
```

위 폴더가 실제로 없으면 `Set-Location`은 실패합니다. 경로를 따옴표로 묶는 일은 존재하지 않는 폴더를
만들지 않으므로, 오류가 나면 먼저 `Test-Path -LiteralPath $project -PathType Container`로 폴더 존재를
확인합니다.

#### 실패 예시: 대괄호 파일명을 Path와 LiteralPath로 검사하기

아래 예제는 현재 폴더에 `report[final].csv`가 실제로 있다고 가정합니다. 첫 명령은 대괄호를 와일드카드로
해석해 `False`가 될 수 있고, 둘째 명령은 이름 그대로 검사해 `True`를 돌려줍니다. 작은따옴표만으로는
와일드카드 해석을 막지 못한다는 차이를 확인하는 예입니다.

```powershell
Test-Path -Path '.\report[final].csv'
Test-Path -LiteralPath '.\report[final].csv'
```

```text
False
True
```

공백과 특수문자를 안전하게 전달할 수 있게 되었지만, 경로 조각을 손으로 이어 붙이면 역슬래시를
빠뜨리거나 두 번 넣을 수 있습니다. 다음에는 PowerShell이 경로를 조합하게 하고 결과를 단계별로
검사합니다.

#### 참고 자료: 따옴표와 와일드카드 해석

- [Microsoft about_Quoting_Rules 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-7.5)
- [Microsoft about_Wildcards 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_wildcards?view=powershell-7.5)

## 경로는 붙이고 세 단계로 확인합니다

### Join-Path로 조합하고 Test-Path로 종류를 검사한 뒤 Resolve-Path로 실제 전체 경로를 봅니다

![부모 경로와 자식 이름이 하나의 경로로 합쳐지고 폴더와 파일 종류 검사 및 전체 경로 확인으로 이어지는 순서](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/41/41bd712f25bb7d76d19a96baedd661c9bb93b0b1b63555d8639e36e1ea09d5fd.png "경로 문자열 만들기와 대상 존재 확인 및 실제 위치 확인은 서로 다른 세 단계입니다")

`Join-Path`는 부모 경로와 자식 이름을 운영체제에 맞는 구분자로 합칩니다. 경로 문자열을 만드는
명령이므로 대상이 아직 없어도 결과를 만들 수 있습니다. 사용자가 직접 `\`를 더하는 것보다 구분자를
빠뜨리거나 중복하는 실수를 줄일 수 있습니다.

`Test-Path`는 대상이 실제로 있는지 `True` 또는 `False`로 답합니다. `-PathType Container`를 붙이면
폴더인지 확인하고, `-PathType Leaf`를 붙이면 파일인지 확인합니다. 이름이 존재한다는 사실만으로는
Python에 파일 대신 폴더를 전달하는 실수를 막을 수 없으므로 대상 종류까지 검사합니다.

`Resolve-Path`는 존재하는 상대 경로를 실제 전체 경로로 보여 줍니다. 아직 만들지 않은 출력 파일은
풀 수 없으므로 먼저 `Join-Path`로 예정 경로를 만들고, 파일을 저장한 뒤 `Test-Path`와
`Resolve-Path`를 실행합니다. 세 명령을 순서 없이 같은 용도로 쓰면 존재하지 않는 경로에서 불필요한
오류가 납니다.

#### 예시 코드: 공백이 있는 프로젝트와 Python 파일 경로 조합하기

입력은 현재 위치와 `path practice`, `src`, `hello.py` 세 이름입니다. 첫 두 줄은 부모와 자식을 한 단계씩
합치고, 셋째 줄은 최종 파일 경로를 만듭니다. 아직 파일을 만들지 않았으므로 이 코드는 주소 문자열만
준비하며 실제 존재 여부는 다음 절에서 확인합니다.

```powershell
$projectRoot = Join-Path (Get-Location).Path 'path practice'
$srcRoot = Join-Path $projectRoot 'src'
$pythonFile = Join-Path $srcRoot 'hello.py'

$projectRoot
$pythonFile
```

#### 예상 결과: 현재 위치 아래에서 조합된 폴더와 파일 주소

앞부분은 실행한 컴퓨터의 현재 위치에 따라 달라집니다. 두 출력의 공통점은 공백이 포함된
`path practice`가 한 폴더 이름으로 유지되고, 둘째 경로가 첫째 경로 아래의 `src\hello.py`로 끝난다는
점입니다.

```text
C:\현재\위치\path practice
C:\현재\위치\path practice\src\hello.py
```

경로 문자열을 만들었으므로 이제 같은 변수를 사용해 폴더와 파일을 만들 수 있습니다. 다음 절에서는
생성, 종류 검사, 전체 경로 확인, Python 실행을 한 번에 끝까지 이어 갑니다.

#### 참고 자료: 경로 조합과 존재 및 실제 위치 확인

- [Microsoft Join-Path 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/join-path?view=powershell-7.5)
- [Microsoft Test-Path 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path?view=powershell-7.5)
- [Microsoft Resolve-Path 공식 문서](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/resolve-path?view=powershell-7.5)

## 연습 프로젝트를 만들고 실행합니다

### 공백이 있는 연습 폴더와 Python 파일을 만든 뒤 존재, 위치, 실행 결과와 종료 코드를 확인합니다

![공백이 있는 연습 프로젝트 안의 src와 hello.py가 존재 검사 및 전체 경로 확인을 거쳐 Python 성공 출력으로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fd080ff8f8074593dcd5177f5ac50dbfee6f45b7777be64aa0a2d14eb097cae1.png "같은 경로 변수를 생성과 검사와 실행에 반복 사용하면 서로 다른 파일을 가리키는 실수를 줄일 수 있습니다")

이 절은 입력부터 출력까지 이어지는 완성 예제입니다. 현재 위치 아래에 `path practice\src` 폴더를 만들고,
그 안에 `hello.py`를 저장합니다. 이어서 폴더와 파일의 종류, 실제 전체 경로, Python 출력,
`$LASTEXITCODE`를 차례로 확인합니다.

아래 예제는 Windows에 기본 포함된 Windows PowerShell 5.1과 별도로 설치하는 PowerShell 7에서 공통으로
쓸 수 있는 명령을 중심으로 구성했습니다. `Set-Content`는 같은 이름의 파일이 이미 있으면 내용을
덮어씁니다. 기존 `path practice\src\hello.py`가 있다면 다른 연습 폴더 이름을 사용해야 합니다.

#### 실행 명령: 연습 폴더와 한 줄짜리 Python 파일 만들기

입력은 현재 위치와 세 경로 이름 및 출력할 문장입니다. `New-Item`은 `src`까지 필요한 폴더를 만들고,
`Set-Content -LiteralPath`는 정확한 `hello.py`에 한 줄을 저장합니다. 명령이 끝난 뒤 화면에 별도 출력이
없어도 정상이며 다음 검사에서 만들어진 항목을 확인합니다.

```powershell
$projectRoot = Join-Path (Get-Location).Path 'path practice'
$srcRoot = Join-Path $projectRoot 'src'
$pythonFile = Join-Path $srcRoot 'hello.py'

New-Item -ItemType Directory -Path $srcRoot -Force | Out-Null
'print("경로 연습 성공")' |
    Set-Content -LiteralPath $pythonFile -Encoding utf8
```

#### 실행 명령: 폴더 트리와 대상 종류 및 실제 위치 확인하기

첫 명령은 프로젝트 안의 이름을 보여 줍니다. 다음 두 명령은 프로젝트가 폴더이고 `hello.py`가 파일인지
각각 검사합니다. 마지막 명령은 Python에 전달할 파일을 전체 경로로 풀어 주며, 예상 결과는 `src`,
`src\hello.py`, `True`, `True`, `hello.py`로 끝나는 전체 경로입니다.

```powershell
Get-ChildItem -LiteralPath $projectRoot -Recurse -Name
Test-Path -LiteralPath $projectRoot -PathType Container
Test-Path -LiteralPath $pythonFile -PathType Leaf
Resolve-Path -LiteralPath $pythonFile
```

#### 예상 결과: 폴더 하나와 파일 하나가 정확한 종류로 존재하기

전체 경로 앞부분은 컴퓨터마다 다릅니다. `False`가 하나라도 나오면 실행으로 넘어가지 않고
`$projectRoot`, `$srcRoot`, `$pythonFile` 값을 출력해 어느 단계의 주소가 틀렸는지 확인합니다.

```text
src
src\hello.py
True
True
C:\...\path practice\src\hello.py
```

#### 실행 명령: 전체 경로 변수로 Python 파일 실행하기

`python`은 PATH에서 Python 프로그램을 찾고 `$pythonFile`은 실행할 파일 하나를 전달합니다. 다음 줄의
`$LASTEXITCODE`는 마지막 외부 프로그램의 종료 코드를 보여 줍니다. `경로 연습 성공` 뒤에 `0`이
나오면 Python이 파일을 열어 끝까지 정상 실행한 것입니다.

```powershell
python $pythonFile
$LASTEXITCODE
```

#### 예상 결과: Python 출력과 성공 종료 코드 확인하기

첫 줄은 `hello.py` 안의 `print`가 만든 프로그램 출력이고, 둘째 줄은 Python 프로세스가 PowerShell에
돌려준 종료 코드입니다. 문장만 보이고 `0`이 없으면 실행 성공을 아직 증명하지 못한 것이며, `0`만
보이고 문장이 없으면 의도한 파일 내용과 실제 실행 파일이 같은지 다시 확인해야 합니다.

```text
경로 연습 성공
0
```

#### 실행 명령: 프로젝트로 이동해 상대 경로로 다시 실행하기

이번에는 현재 위치를 프로젝트 루트로 바꾼 뒤 같은 파일을 상대 경로로 실행합니다. 전체 경로 변수와
상대 경로가 같은 파일을 가리키므로 출력도 같아야 합니다. 이 비교가 맞으면 현재 위치와 상대 경로의
관계를 실제 실행으로 확인한 것입니다.

```powershell
Set-Location -LiteralPath $projectRoot
python .\src\hello.py
$LASTEXITCODE
```

```text
경로 연습 성공
0
```

완성 예제가 성공했더라도 실제 작업에서는 현재 위치가 바뀌거나 Python 명령 자체를 찾지 못할 수
있습니다. 마지막 절에서는 오류 문장에 따라 무엇부터 확인해야 하는지 순서를 고정합니다.

## 경로 오류는 네 단계로 복구합니다

### 명령, 현재 위치, 대상 종류, 실제 전체 경로를 차례로 확인하면 재설치 없이 원인을 좁힐 수 있습니다

![Python 명령 확인에서 시작해 현재 위치와 파일 종류 및 실제 전체 경로를 차례로 검사하고 성공 실행에 도착하는 복구 순서](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/33/3354d0a19e03b14749d7b71c672590c7db87b62f142dbc4a6f7d50f61d4994f7.png "앞 단계가 실패하면 그 자리에서 원인을 고치고 통과한 뒤에만 다음 검사로 이동합니다")

경로 오류는 보이는 문장부터 나누어야 합니다. `python`을 명령으로 찾지 못했다면 Python 프로그램을
찾는 PATH 문제입니다. Python은 실행됐지만 `can't open file`이 나왔다면 그 뒤에 전달한 파일 경로가
틀렸습니다. 두 오류를 모두 설치 문제로 처리하면 이미 정상인 Python을 다시 설치하고도 같은 경로
오류가 남습니다.

복구 순서는 명령, 현재 위치, 대상 종류, 실제 위치 네 단계입니다. `Get-Command python`이 Python 명령을
찾고, `Get-Location`과 `Get-ChildItem`이 출발 폴더를 보여 줍니다. `Test-Path -PathType Leaf`가 대상이
파일임을 확인하고, 마지막에 `Resolve-Path`가 Python에 전달할 전체 주소를 보여 줍니다.

#### 실행 명령: Python 명령과 현재 위치 및 대상 파일을 순서대로 확인하기

아래에서 첫 명령이 실패하면 파일 경로 검사를 계속하지 않고 Python 명령 설정을 먼저 고칩니다. 첫
명령이 통과했는데 `Test-Path`가 `False`라면 현재 위치와 `src` 목록을 비교합니다. 모든 검사가
통과한 뒤에만 마지막 `python` 명령을 실행합니다.

```powershell
Get-Command python
Get-Location
Get-ChildItem -LiteralPath .\src -Name
Test-Path -LiteralPath .\src\hello.py -PathType Leaf
Resolve-Path -LiteralPath .\src\hello.py
python .\src\hello.py
$LASTEXITCODE
```

#### 설명 목록: 보이는 오류와 먼저 확인할 자리

| 보이는 결과 | 먼저 확인할 것 | 다음 행동 |
|---|---|---|
| `python`을 찾을 수 없음 | `Get-Command python` | Python 명령이 PATH에 있는지 확인 |
| `can't open file` | `Get-Location` | 현재 위치와 전달한 상대 경로 비교 |
| `Test-Path`가 `False` | `Get-ChildItem` | 폴더 이름, 파일 이름, 확장자 확인 |
| 폴더 검사는 `True`, 파일 검사는 `False` | `-PathType` | Python에 폴더가 아닌 실제 파일 전달 |
| 대괄호 이름만 못 찾음 | `-LiteralPath` | 와일드카드 해석을 끄고 정확한 이름 검사 |
| 출력은 보이지만 종료 코드가 0이 아님 | `$LASTEXITCODE` | Python 오류의 마지막 줄부터 확인 |

터미널에서 한 번 실행할 때는 현재 위치를 확인한 뒤 상대 경로를 쓰면 충분합니다. 하지만 `.ps1`
스크립트를 다른 폴더에서 실행하면 호출한 사람의 현재 위치가 달라질 수 있습니다. 이때는 실행 중인
PowerShell 스크립트가 놓인 폴더를 담는 `$PSScriptRoot`를 기준으로 경로를 만들면 호출 위치와 무관하게
같은 Python 파일을 찾습니다.

#### 예시 코드: ps1 파일 위치를 기준으로 Python 파일 찾기

아래 내용은 터미널에 한 줄씩 붙여 넣는 코드가 아니라 `run.ps1` 파일 안에 저장할 예입니다. 입력은
`run.ps1`과 같은 프로젝트에 있는 `src\hello.py`이고, `Join-Path`가 스크립트 폴더를 기준으로 전체
경로를 만듭니다. Python 종료 코드를 그대로 돌려주므로 자동화 도구도 성공과 실패를 구분할 수 있습니다.

```powershell
$pythonFile = Join-Path $PSScriptRoot 'src\hello.py'
python $pythonFile
exit $LASTEXITCODE
```

`$PSScriptRoot`는 `.ps1` 파일이 실행될 때 의미가 있습니다. 대화형 PowerShell 창에서 같은 줄을 바로
실행하는 용도가 아닙니다. 아직 존재하지 않는 출력 파일은 `Resolve-Path`로 확인할 수 없으므로
`Join-Path`로 주소를 만든 뒤 저장하고, 저장 뒤 `Test-Path`로 검증합니다.

PowerShell 경로는 파일 시스템뿐 아니라 레지스트리와 인증서 저장소도 다룰 수 있습니다. 그러나 이 글의
`Container`, `Leaf`, Python 실행 예제는 Windows 파일과 폴더만 범위로 삼습니다.

지금 PowerShell에서 `Get-Location`을 실행하고, 연습 프로젝트의 두 성공 문장과 종료 코드 `0`을
확인하면 파일 경로의 읽기, 조합, 검사, 실행, 복구를 한 번에 끝낸 것입니다.

#### 참고 자료: 스크립트 위치를 제공하는 자동 변수

- [Microsoft about_Automatic_Variables의 PSScriptRoot 설명](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.5)
