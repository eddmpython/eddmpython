---
title: Python import와 라이브러리 차이: Excel 도구 고르는 법
slug: python-import
author: eddmpython
section: Python 프로젝트 환경
summary: Python import와 라이브러리 차이를 Excel 자동화 예제로 설명합니다. pathlib, pandas, openpyxl이 맡는 일을 구분하고 설치 여부까지 확인합니다.
readerQuestion: Python import는 무엇을 가져오며 pathlib와 pandas 및 openpyxl은 Excel 자동화에서 각각 무슨 일을 할까?
readerTakeaway: import는 이미 있는 모듈의 이름을 현재 파일에서 쓰게 하며 pathlib는 경로, pandas는 표 계산, openpyxl은 Excel 문서 기능을 맡는다.
readerLevel: beginner
readerStartingPoint: Python 변수와 함수는 알지만 import 줄을 읽는 법과 라이브러리마다 맡길 일을 구분하지 못한다.
primaryKeyword: Python import 라이브러리
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/19/1980a71ffa02bb3e090a09aef86b0158ebf94560ef82b3892de6ff15a91a11e8.png
ogImageAlt: Python 파일이 표준 라이브러리 모듈과 설치한 패키지에서 필요한 기능을 import해 사용하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python import와 라이브러리 차이를 모르면 짧은 코드도 낯선 이름의 모음처럼 보입니다. `Path`, `pd`,
`Font`가 어디에서 왔는지 찾지 못하고, Excel 파일을 읽는 일과 셀 모양을 바꾸는 일도 한 도구에 모두
맡기게 됩니다.

이 글에서는 부서별 지출 Excel 파일을 다룬다는 한 가지 작업만 사용합니다. `pathlib`, `pandas`,
`openpyxl`이 맡는 일을 나누고, import가 실패했을 때 설치 문제와 철자 문제를 구분하는 데까지
확인합니다.

## 라이브러리와 모듈은 이미 만든 기능을 담습니다

### Python 파일은 표준 모듈과 설치한 패키지에서 필요한 기능만 불러와 사용합니다

![Python 파일이 표준 라이브러리 모듈과 설치한 패키지에서 필요한 기능을 import해 사용하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/19/1980a71ffa02bb3e090a09aef86b0158ebf94560ef82b3892de6ff15a91a11e8.png "직접 다시 만들지 않고 검증된 파일 경로와 표 및 Excel 기능을 가져와 사용합니다")

모듈은 함수와 클래스가 들어 있는 Python 파일입니다. `pathlib`처럼 Python을 설치하면 함께 들어오는
모듈도 있고, `pandas`처럼 프로젝트에 따로 설치하는 패키지도 있습니다. 라이브러리는 이런 모듈과
패키지를 기능 묶음으로 부르는 넓은 표현입니다.

`Path`가 폴더 경로를 다루는 방법을 직접 만들 필요는 없습니다. `DataFrame`의 행을 모으고 합계를 내는
코드도 바닥부터 작성하지 않습니다. 이미 만들어진 기능을 불러오면 내 코드는 지출 파일의 열 이름과
검사 금액처럼 이 업무에만 있는 규칙에 집중할 수 있습니다.

#### 설명 목록

```text
모듈: Python 코드를 담은 파일 또는 불러올 수 있는 한 단위
패키지: 여러 모듈을 묶어 설치하고 배포하는 단위
표준 라이브러리: Python과 함께 설치되는 pathlib 같은 기능
외부 패키지: 프로젝트가 따로 설치하는 pandas와 openpyxl 같은 기능
```

#### 참고 자료

- [Python 공식 튜토리얼의 모듈 설명](https://docs.python.org/3/tutorial/modules.html)

## import 줄은 왼쪽부터 읽습니다

### import와 from 및 as가 현재 파일에서 사용할 이름을 어떻게 만드는지 비교합니다

![세 가지 import 코드 줄이 각각 모듈 이름과 특정 클래스 및 짧은 별칭을 현재 Python 파일에 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d2/d2af522c70117a776f8c3f58996d8dcdf40aa09af23b1e5b6178cce1e9ccd739.png "불러오는 대상과 코드에서 부를 이름을 분리해서 보면 import 줄이 짧은 문장처럼 읽힙니다")

`import pandas as pd`는 `pandas` 패키지를 불러와 이 파일에서는 `pd`라는 짧은 이름으로 부르겠다는
뜻입니다. `from pathlib import Path`는 `pathlib` 모듈 안에서 `Path`만 꺼내 현재 파일에 그 이름을
만듭니다. `from openpyxl.styles import Font`도 `styles` 모듈 안의 `Font`만 가져옵니다.

별칭은 마음대로 만들 수 있지만 널리 쓰는 이름을 따르면 문서를 찾기 쉽습니다. pandas 공식 문서도
`import pandas as pd`를 사용합니다. 반대로 `from pandas import *`는 어떤 이름이 들어왔는지 코드에서
확인하기 어려워 업무 스크립트에는 쓰지 않는 편이 안전합니다.

#### 코드

```python
from pathlib import Path

import pandas as pd
from openpyxl.styles import Font

input_dir = Path("input")
table = pd.DataFrame({"부서": ["영업팀"], "금액": [120000]})
header_font = Font(bold=True)
```

#### 참고 자료

- [pandas 공식 문서의 import 관례](https://pandas.pydata.org/docs/getting_started/intro_tutorials/01_table_oriented.html)

## 세 라이브러리는 맡는 일이 다릅니다

### 같은 Excel 작업도 파일 찾기와 표 계산 및 문서 꾸미기를 세 도구로 나눕니다

![입력 폴더의 Excel 파일 목록이 표 계산 화면을 거쳐 서식이 적용된 결과 문서로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4e/4ebb8a1b53ec56e2867fd8485823344cb10952d36fe97626f69f77d1a96b09fe.png "경로 탐색과 데이터 계산 및 Excel 문서 표현을 분리하면 각 코드 줄의 목적이 선명해집니다")

`pathlib`의 `Path`는 `input` 폴더를 가리키고 `glob("*.xlsx")`로 Excel 파일을 찾습니다. `pandas`는
찾은 파일을 행과 열이 있는 `DataFrame`으로 읽고, 여러 표를 합치거나 부서별 금액을 계산합니다.
`openpyxl`은 저장된 통합문서에서 제목 셀을 굵게 만들거나 열 너비를 조정할 때 사용합니다.

세 도구는 경쟁 관계가 아닙니다. 지출내역 자동화에서는 `pathlib`로 입력 파일 세 개를 찾고,
`pandas`로 통합내역과 부서별요약을 만든 뒤, 꼭 필요한 경우에만 `openpyxl`로 결과 문서의 표시를
다듬습니다. 계산 규칙을 openpyxl 셀 반복문에 모두 넣으면 표 전체를 확인하기 어려워집니다.

#### 예시

- 파일 찾기: pathlib의 `Path("input").glob("*.xlsx")`
- 행 합치기와 합계: pandas의 `pd.concat(...)`, `groupby(...)`
- 머리글 꾸미기: openpyxl의 `cell.font = Font(bold=True)`

#### 참고 자료

- [Python pathlib 공식 문서](https://docs.python.org/3/library/pathlib.html)
- [pandas 표 읽기와 쓰기 공식 튜토리얼](https://pandas.pydata.org/docs/getting_started/intro_tutorials/02_read_write.html)
- [openpyxl 공식 튜토리얼](https://openpyxl.readthedocs.io/en/stable/tutorial.html)

## 설치와 import는 서로 다른 단계입니다

### ModuleNotFoundError가 나오면 패키지 이름과 현재 Python에 설치됐는지 확인합니다

![패키지 목록에는 없는 pandas가 import 오류를 만들고 설치 후 같은 명령이 성공 표시로 바뀌는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d6/d6c4e1814b17b45a77cd0ce1988316e052cb5c5ad66c68f0c88c027da9c948c4.png "외부 패키지는 프로젝트에 설치되어 있어야 import 줄에서 이름을 찾을 수 있습니다")

`pathlib`는 표준 라이브러리라 Python이 있으면 바로 불러올 수 있습니다. `pandas`와 `openpyxl`은 외부
패키지이므로 프로젝트에 설치하지 않은 상태에서 import하면 `ModuleNotFoundError`가 납니다. 이 오류는
코드가 반드시 틀렸다는 뜻이 아니라 현재 실행한 Python이 해당 패키지를 찾지 못했다는 뜻입니다.

먼저 오류 마지막 줄에서 패키지 이름을 확인합니다. 철자가 `pands`처럼 틀렸다면 import 줄을 고칩니다.
철자가 맞다면 프로젝트 루트에서 `uv add pandas openpyxl`로 두 패키지를 기록하고 설치합니다. 설치에
사용한 Python과 실행에 사용한 Python이 다르면 같은 오류가 반복되므로 실행도 `uv run`으로 맞춥니다.

#### 코드

```powershell
uv add pandas openpyxl
uv run python -c "import pandas; import openpyxl; print('import 확인 완료')"
```

#### 확인 목록

- 오류 이름이 `ModuleNotFoundError`인지 확인합니다.
- 오류에 적힌 모듈 이름과 import 철자를 비교합니다.
- `pyproject.toml`의 dependencies에 패키지가 있는지 확인합니다.
- `uv run python`으로 같은 프로젝트의 Python을 사용합니다.

## 역할 확인 스크립트로 세 도구를 점검합니다

### 입력 파일 경로와 표의 행 수 및 Excel 엔진 버전이 나오면 준비가 끝납니다

![Python 확인 스크립트의 세 검사 줄이 파일 경로와 표 행 수 및 패키지 버전 결과로 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/22/2217790024fd692136f55d2be3eedcf166f9ffad8c64b2587524a051ca61d314.png "실제 자동화를 작성하기 전에 세 도구가 각자 한 가지 결과를 내는지 작은 코드로 확인합니다")

큰 자동화 코드를 붙여 넣기 전에 `check_libraries.py`라는 작은 파일로 세 도구를 한 번씩 사용합니다.
`Path`는 입력 파일의 위치를 만들고, pandas는 두 행짜리 표를 만들며, openpyxl의 버전은 패키지가
정상적으로 import됐는지 알려 줍니다.

아래 코드를 저장하고 `uv run python check_libraries.py`를 실행합니다. 경로와 `2행`, openpyxl 버전이
모두 나오면 라이브러리 준비는 끝났습니다. 하나가 실패하면 긴 업무 코드로 넘어가지 않고 실패한 import
한 줄만 고칩니다.

#### 코드

```python
from pathlib import Path

import openpyxl
import pandas as pd

input_file = Path("input") / "sales.xlsx"
sample = pd.DataFrame(
    {
        "부서": ["영업팀", "관리팀"],
        "금액": [120000, 80000],
    }
)

print("입력 경로:", input_file)
print("표 행 수:", len(sample))
print("openpyxl 버전:", openpyxl.__version__)
```

#### 예시

```text
입력 경로: input\sales.xlsx
표 행 수: 2
openpyxl 버전: 설치된 버전 번호
```
