---
title: Python import란? 모듈과 라이브러리 차이부터 오류 해결까지
slug: python-import
author: eddmpython
section: Python 프로젝트 환경
summary: Python import가 무엇을 찾고 어떤 이름을 만드는지 설명합니다. 모듈과 패키지 및 라이브러리의 차이, 두 파일 프로젝트, ModuleNotFoundError 해결, 실제 모듈 위치와 결과 검증까지 한 번에 익힙니다.
readerQuestion: Python import는 실제로 무엇을 하며 모듈과 패키지 및 라이브러리는 어떻게 다르고, import 오류는 어떤 순서로 해결할까?
readerTakeaway: import는 모듈을 찾아 처음 한 번 실행한 뒤 현재 파일에 이름을 연결하며, 오류가 나면 철자와 검색 위치와 실행 중인 Python과 이름 충돌을 차례로 확인한다.
readerLevel: beginner
readerStartingPoint: Python 변수와 함수를 한 파일에서 사용해 봤지만 import 줄의 의미와 다른 파일의 함수를 가져오는 방법은 모른다.
primaryKeyword: Python import
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/71/71bbdb306cf9566504675ea31944a23d957427a36dcb75ef4e6cb4b494a79868.png
ogImageAlt: 현재 Python 파일이 다른 Python 파일과 표준 라이브러리에서 함수와 값을 가져와 이름으로 사용하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 코드를 읽다 보면 파일 첫머리에 `import math`, `from pathlib import Path` 같은 줄이 나옵니다.
어떤 이름은 바로 불러와지지만 `import pandas`는 설치하지 않았다는 오류가 날 수도 있습니다. 모양은
비슷한데 결과가 다른 이유를 모르면 오류가 날 때마다 패키지를 무작정 설치하게 됩니다.

`import`는 다른 파일의 코드를 복사해 붙이는 명령이 아닙니다. Python이 모듈을 찾고, 필요한 경우 그
모듈을 실행해 객체를 만든 뒤, 현재 파일에서 부를 이름을 연결하는 명령입니다. 이 한 문장을 실제
파일과 출력으로 확인하면 모듈, 패키지, 라이브러리라는 말도 서로 구분할 수 있습니다.

이 글에서는 먼저 세 용어와 세 가지 import 문법을 정리합니다. 이어서 `main.py`와
`order_rules.py`로 주문 계산기를 완성합니다. 마지막에는 `ModuleNotFoundError`를 원인별로 고치고,
가져온 파일의 실제 위치와 계산 결과까지 검증합니다.

## import는 다른 파일의 이름을 씁니다

### 다른 파일에 이미 만든 함수와 값을 찾아 현재 파일의 이름으로 연결합니다

![현재 Python 파일이 다른 Python 파일과 표준 라이브러리에서 함수와 값을 가져와 이름으로 사용하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/71/71bbdb306cf9566504675ea31944a23d957427a36dcb75ef4e6cb4b494a79868.png "원본 기능은 원래 파일에 남아 있고 현재 파일에는 그 기능을 가리키는 이름이 생깁니다")

`import`는 다른 파일의 글자를 현재 파일에 복사하지 않습니다. Python은 요청한 모듈을 찾아 모듈
객체를 준비합니다. 모듈 객체는 그 파일에서 만든 함수, 클래스, 변수 같은 이름을 한곳에 담고 있는
실행 결과입니다.

`import math`를 실행하면 현재 파일에 `math`라는 이름이 생깁니다. `math.pi`의 점은 `math` 모듈
안에 있는 `pi` 값을 선택한다는 뜻입니다. 함수 `math.sqrt()`도 같은 방식으로 출처가 눈에 보입니다.

이름을 연결해 두면 같은 기능을 여러 파일에서 다시 작성하지 않아도 됩니다. 원의 넓이를 구하는 업무
규칙은 내 파일에 두고, 원주율처럼 이미 검증된 값은 Python 표준 라이브러리에서 가져올 수 있습니다.
표준 라이브러리는 Python을 설치할 때 함께 제공되는 모듈 모음입니다.

#### 예시 코드: math 모듈의 원주율로 원 넓이 구하기

입력은 반지름 `5`입니다. 핵심 줄은 `math.pi`를 읽어 반지름의 제곱과 곱합니다. 실행 뒤에는 현재
파일에서 직접 정하지 않은 원주율을 사용한 넓이 `78.54`가 출력됩니다. `math.`가 붙어 있으므로
`pi`가 어느 모듈에서 왔는지도 바로 확인할 수 있습니다.

```python
import math

radius = 5
area = math.pi * radius**2

print(f"원의 넓이: {area:.2f}")
```

#### 예상 결과: 반지름 5로 계산한 원의 넓이

입력값 `5`를 제곱하면 `25`가 되고 여기에 `math.pi`를 곱합니다. 출력 형식의 `.2f`가 소수점 아래
두 자리까지만 보여 주므로 실제 계산값은 화면에서 `78.54`로 보입니다.

```text
원의 넓이: 78.54
```

`math`처럼 바로 사용할 수 있는 모듈도 있고 먼저 설치해야 하는 패키지도 있습니다. 이 차이를 알려면
일상적으로 섞어 쓰는 모듈, 패키지, 라이브러리라는 말부터 크기별로 나눠야 합니다.

#### 참고 자료: Python 공식 모듈 튜토리얼

- [Python 공식 튜토리얼의 모듈 설명](https://docs.python.org/3.14/tutorial/modules.html)

## 모듈과 패키지는 크기가 다릅니다

### 파일 하나와 모듈 폴더 및 설치 묶음을 구분하면 문서와 오류를 정확히 읽을 수 있습니다

![Python 모듈 파일이 여러 모듈을 담은 import 패키지와 설치 파일 묶음 안에 단계별로 포함된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/173328edd0643b6f3dfb11f34660f4626c290ab711ebdf087c2dbbfbfa24347d.png "파일 하나와 불러오는 폴더 및 설치하는 묶음은 서로 다른 단위입니다")

Python에서 모듈은 불러올 수 있는 코드 단위입니다. 가장 쉽게 볼 수 있는 모듈은 `order_rules.py`처럼
함수와 변수가 들어 있는 파일 하나입니다. `math`처럼 Python 내부에 포함되어 실제 `.py` 파일이
보이지 않는 모듈도 있으므로 모듈을 언제나 파일이라고 단정하지는 않습니다.

import 패키지는 여러 모듈과 하위 패키지를 담을 수 있는 묶음입니다. 보통 폴더처럼 보이고
`pandas.io`처럼 점을 이어 안쪽 모듈을 선택할 수 있습니다. 패키지도 Python이 불러오는 관점에서는
특별한 모듈이며, 하위 모듈을 찾을 위치를 추가로 가진다는 점이 다릅니다.

설치할 때 말하는 배포 패키지는 또 다른 단위입니다. `python -m pip install Pillow`의 `Pillow`는
다운로드하고 설치하는 배포 이름입니다. 설치 뒤 코드에서는 `from PIL import Image`처럼 다른 import
이름을 사용합니다. 설치 이름과 import 이름은 대개 같지만 반드시 같지는 않습니다.

라이브러리는 엄격한 파일 형식을 가리키기보다 재사용할 기능 묶음을 넓게 부르는 말입니다. 표준
라이브러리는 `pathlib`, `json`, `math`처럼 Python과 함께 옵니다. pandas 라이브러리를 설치하면
`pandas`라는 import 패키지와 그 안의 여러 모듈을 사용할 수 있습니다.

이 표에서 가장 중요한 열은 `보이는 자리`입니다. 오류 메시지에서 이름을 봤을 때 그것이 코드에 적는
import 이름인지 설치 도구에 적는 배포 이름인지 먼저 구분해야 합니다. 둘이 다를 수 있으므로 오류에
나온 이름을 그대로 설치 명령에 붙이지 않습니다.

#### 설명 목록: 모듈과 두 종류의 패키지 구분하기

| 용어 | 뜻 | 보이는 예 | 보이는 자리 |
|---|---|---|---|
| 모듈 | Python이 불러오는 코드 단위 | `math`, `order_rules.py` | `import math` |
| import 패키지 | 하위 모듈을 담을 수 있는 모듈 | `pandas`, `PIL` | `import pandas` |
| 배포 패키지 | 내려받아 설치하는 파일 묶음 | `pandas`, `Pillow` | `python -m pip install ...` |
| 라이브러리 | 관련 기능을 넓게 부르는 말 | 표준 라이브러리, pandas | 문서와 대화 |

배포 패키지 하나가 여러 import 패키지를 제공할 수도 있고, 여러 배포 패키지가 같은 import 이름을
제공할 수도 있습니다. 따라서 모르는 `import foo`를 보고 곧바로 `pip install foo`를 실행하면 의도하지
않은 패키지를 설치할 위험도 있습니다. 프로젝트 문서나 공식 패키지 문서에서 설치 이름을 먼저
확인해야 합니다.

크기를 구분했으면 다음 질문은 현재 파일에 어떤 이름을 만들 것인가입니다. 같은 모듈도 `import`,
`from`, `as` 중 무엇을 쓰느냐에 따라 아래 코드에서 부르는 이름이 달라집니다.

#### 참고 자료: 설치 이름과 import 이름의 차이

- [Python Packaging User Guide의 배포 패키지와 import 패키지 구분](https://packaging.python.org/en/latest/discussions/distribution-package-vs-import-package/)

## import 문법은 이름 범위를 정합니다

### 모듈 전체와 특정 이름 및 별칭 중 코드의 출처가 가장 잘 보이는 형태를 고릅니다

![세 가지 import 코드 줄이 각각 모듈 이름과 특정 클래스 및 짧은 별칭을 현재 Python 파일에 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/27/27b8eeae51a39fec8cd1e5984979a1bad88fa3cd2e4fa035fd37167dec527ae1.png "가져오는 대상이 같아도 현재 파일에서 부르는 이름과 출처 표시가 달라집니다")

`import math`는 현재 파일에 `math`라는 이름을 만듭니다. 사용할 때는 `math.ceil()`처럼 모듈 이름을
앞에 붙입니다. 코드가 조금 길어지지만 `ceil`이 `math`에서 왔다는 사실이 호출 위치에 남습니다.

`from pathlib import Path`는 `pathlib` 모듈에서 `Path`만 선택해 현재 파일에 바로 `Path`라는 이름을
만듭니다. 자주 쓰는 이름 하나를 가져올 때 읽기 편합니다. 다만 다른 모듈에도 같은 이름이 있으면
나중에 가져온 이름이 앞의 이름을 가릴 수 있습니다.

`import pandas as pd`는 `pandas` 모듈 객체에 `pd`라는 별칭을 붙입니다. 별칭은 임의로 정할 수 있지만
공식 문서와 널리 쓰이는 관례를 따르면 검색과 협업이 쉬워집니다. 짧다는 이유만으로 처음 보는 별칭을
만들면 오히려 출처를 찾기 어려워집니다.

#### 예시 코드: 세 import 형태가 만드는 이름 비교하기

입력은 소수 `3.2`, 파일 이름 문자열, 두 행짜리 표 데이터입니다. `math.ceil`은 모듈 이름을 거쳐
정수 `4`를 만들고, `Path`는 현재 이름으로 바로 경로를 만듭니다. `pd`는 pandas의 짧은 별칭이므로
`pd.DataFrame`이 두 행짜리 표를 만듭니다.

```python
import math
from pathlib import Path

import pandas as pd

rounded = math.ceil(3.2)
output_file = Path("output") / "orders.csv"
table = pd.DataFrame({"주문": ["A-01", "A-02"]})

print(rounded)
print(output_file)
print(len(table))
```

이 예제의 pandas는 외부 배포 패키지를 먼저 설치한 환경에서만 실행됩니다. 반면 `math`와 `pathlib`는
표준 라이브러리라 Python 설치만으로 사용할 수 있습니다. 문법은 비슷하지만 기능이 어디에서
제공되는지에 따라 설치 단계가 달라집니다.

`from module import *`는 밑줄로 시작하지 않는 여러 이름을 한꺼번에 현재 파일에 넣습니다. 짧아
보이지만 어떤 이름이 어디서 왔는지 알기 어렵고 기존 이름을 가릴 수 있습니다. 대화형으로 잠깐
확인하는 경우가 아니라면 필요한 이름을 명시하는 편이 코드를 읽고 고치기 쉽습니다.

문법을 읽을 수 있어도 `import`가 즉시 파일을 여는 단순 동작이라고 생각하면 예상하지 못한 출력에
놀랄 수 있습니다. Python은 먼저 이전에 불러온 기록을 확인하고, 없다면 모듈을 찾아 실행합니다.

#### 참고 자료: import 문법과 별칭의 동작

- [Python 공식 튜토리얼의 import 형태 설명](https://docs.python.org/3.14/tutorial/modules.html)

## Python은 찾고 실행한 뒤 기억합니다

### 모듈 캐시와 검색 위치를 차례로 확인하고 처음 찾은 파일을 실행해 이름을 만듭니다

![import 요청이 모듈 캐시를 먼저 확인하고 검색 위치에서 파일을 찾아 모듈 객체와 현재 이름을 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/64/64fbfacfed7c396201f972c62f393a6d95cdc6ad5c5d9d7974653297a0ca42b7.png "같은 실행 안에서는 이미 만든 모듈 객체를 먼저 재사용하고 없을 때만 검색을 시작합니다")

Python은 import 요청을 받으면 먼저 이미 불러온 모듈인지 확인합니다. 이 기록은 `sys.modules`라는
모듈 캐시에 들어 있습니다. 같은 Python 프로세스에서 같은 모듈을 다시 import하면 보통 기존 모듈
객체를 재사용하므로 파일 맨 위 코드를 매번 다시 실행하지 않습니다.

캐시에 없으면 Python의 찾기 도구가 모듈 이름을 검색합니다. 내장 모듈과 Python에 포함된 모듈을
확인하고, 파일에서 찾는 모듈은 `sys.path`에 들어 있는 위치를 차례로 살핍니다. `python main.py`로
실행하면 `main.py`가 있는 폴더가 검색 시작 위치에 포함됩니다.

검색에서 `order_rules.py`를 찾으면 Python은 모듈 객체를 만들고 그 파일의 맨 위 코드를 실행합니다.
함수 정의도 이때 실행되어 함수 객체가 모듈 안에 생깁니다. 마지막으로 `import order_rules`가 현재
파일에 `order_rules`라는 이름을 연결합니다.

#### 예시 코드: import할 때 한 번만 실행되는 notice_module.py

이 파일은 입력을 받지 않고 맨 위에서 준비 메시지를 한 번 출력한 뒤 `status` 값을 만듭니다. 다른
파일이 처음 import하면 메시지가 나오고 모듈 객체에 `status`가 저장됩니다. 같은 실행에서 두 번째
import가 일어나면 캐시를 사용하므로 이 출력은 반복되지 않습니다.

```python
print("notice_module 준비")

status = "사용 가능"
```

#### 예시 코드: 같은 모듈을 두 번 import하는 main.py

첫 줄의 import가 `notice_module.py`를 찾아 실행합니다. 두 번째 import는 같은 이름을 캐시에서 찾아
기존 객체를 재사용합니다. 마지막 줄은 그 객체 안의 `status`를 읽으므로 준비 메시지 한 번과 상태
메시지 한 번이 차례로 출력됩니다.

```python
import notice_module
import notice_module

print(notice_module.status)
```

#### 예상 결과: 준비 코드는 한 번만 실행됩니다

두 import 줄이 있어도 준비 문구는 한 번만 보입니다. 다만 프로그램을 종료하고 다시 실행하면 새로운
Python 프로세스와 새 캐시가 만들어지므로 준비 문구가 다시 나옵니다. 파일을 고친 뒤 실행 중인
대화형 Python에서 결과가 그대로라면 프로세스를 다시 시작해야 하는 이유도 여기에 있습니다.

```text
notice_module 준비
사용 가능
```

모듈 맨 위의 파일 삭제, 네트워크 요청, 긴 계산도 import 시점에 실행될 수 있습니다. 그래서 재사용할
파일에는 함수와 클래스 정의를 주로 두고, 실제 업무를 시작하는 코드는 별도 실행 파일에 두는 편이
안전합니다. 이제 이 원칙으로 두 파일짜리 주문 계산기를 만듭니다.

#### 참고 자료: 모듈 검색과 캐시의 공식 동작

- [Python 언어 참조의 import 시스템](https://docs.python.org/3.14/reference/import.html)
- [Python 공식 문서의 모듈 검색 경로 초기화](https://docs.python.org/3.14/library/sys_path_init.html)

## 두 파일로 주문 계산기를 만듭니다

### 입력과 출력은 main 파일에 두고 계산 규칙은 별도 모듈의 함수로 나눕니다

![주문 입력을 가진 main 파일이 계산 함수가 있는 별도 모듈을 불러와 할인 금액과 최종 금액을 출력하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/69/694b3d85f92ba37a57c3c6c1df00fc1fb9873b419d6de14c6c638f102256c494.png "가격 목록은 실행 파일에 있고 합계와 할인 규칙은 가져올 수 있는 별도 파일에 있습니다")

이제 `main.py`와 `order_rules.py`를 같은 폴더에 만듭니다. `main.py`는 주문 가격을 입력하고 결과를
출력합니다. `order_rules.py`는 가격을 합치고 할인액을 정하는 업무 규칙만 맡습니다.

두 파일로 나누는 이유는 코드 줄 수를 줄이기 위해서가 아닙니다. 할인 기준이 바뀌면 규칙 파일만
고치고, 웹 주문이나 Excel 주문처럼 다른 입력 파일에서도 같은 함수를 가져다 쓸 수 있기 때문입니다.
함수의 입력과 반환값이 파일 사이의 약속이 됩니다.

#### 입력 예시: 두 Python 파일을 같은 폴더에 놓기

`order-calculator` 폴더 안에 아래 두 파일이 있어야 합니다. `main.py` 옆에 `order_rules.py`가 있으므로
`python main.py`로 실행할 때 Python의 검색 위치에서 로컬 모듈을 찾을 수 있습니다. 파일 이름의
하이픈은 Python 이름에 쓸 수 없으므로 모듈 이름에는 밑줄을 사용합니다.

```text
order-calculator/
├── main.py
└── order_rules.py
```

#### 예시 코드: 합계와 할인액을 계산하는 order_rules.py

첫 함수의 입력은 정수 가격 목록이고 출력은 그 합계입니다. 두 번째 함수의 입력은 소계입니다. 소계가
`200000`원 이상이면 정수 나눗셈으로 10퍼센트를 계산하고, 기준보다 작으면 `0`을 반환합니다. 함수
안에서는 출력하지 않으므로 호출한 파일이 결과 사용법을 결정할 수 있습니다.

```python
def calculate_subtotal(prices):
    return sum(prices)


def calculate_discount(subtotal):
    if subtotal >= 200000:
        return subtotal // 10
    return 0
```

#### 예시 코드: 규칙 함수를 가져와 계산하는 main.py

입력은 `120000`, `80000`, `40000` 세 가격입니다. `calculate_subtotal`이 `240000`을 만들고,
`calculate_discount`가 그 값의 10퍼센트인 `24000`을 만듭니다. 마지막 뺄셈은 최종 금액
`216000`을 만들며 세 결과를 천 단위 쉼표와 함께 출력합니다.

```python
from order_rules import calculate_discount, calculate_subtotal

prices = [120000, 80000, 40000]
subtotal = calculate_subtotal(prices)
discount = calculate_discount(subtotal)
final_amount = subtotal - discount

print(f"소계: {subtotal:,}원")
print(f"할인: {discount:,}원")
print(f"최종 금액: {final_amount:,}원")
```

#### 실행 명령: main.py에서 주문 계산 시작하기

터미널의 현재 폴더가 `order-calculator`인지 확인한 뒤 아래 명령을 실행합니다. 입력값은 코드의
`prices` 목록에 이미 들어 있습니다. Python은 같은 폴더에서 `order_rules.py`를 찾고 두 함수를 현재
파일에 연결한 뒤 계산 결과를 출력합니다.

```powershell
python main.py
```

#### 예상 결과: 소계에서 할인액을 뺀 최종 금액

세 가격의 합계는 `240,000원`입니다. 할인 기준 `200,000원` 이상이므로 `24,000원`이 빠집니다.
`216,000원`이 나오면 import뿐 아니라 입력 전달, 두 함수의 계산, 최종 뺄셈까지 모두 실행된 것입니다.

```text
소계: 240,000원
할인: 24,000원
최종 금액: 216,000원
```

가격을 `[50000, 40000]`으로 바꾸면 소계가 기준보다 작아 할인은 `0원`이 됩니다. 입력을 바꿨을 때
어느 함수의 반환값이 달라지는지 설명할 수 있어야 코드를 이해한 것입니다. 이제 규칙 파일을 직접
실행할 때와 다른 파일이 import할 때의 동작도 분리해 보겠습니다.

## 직접 실행과 import를 분리합니다

### 함수는 언제나 제공하되 확인용 출력은 그 파일을 직접 실행했을 때만 나오게 합니다

![같은 Python 모듈을 직접 실행할 때만 확인 코드가 열리고 다른 파일이 import할 때는 함수만 제공되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/37/374bf3ad94df5b23d502470f64c985a9d64d359cafa729dc5abdbdf481eef46f.png "조건문 아래의 확인 코드는 직접 실행할 때만 열리고 import할 때는 함수 정의만 사용됩니다")

모듈의 맨 위에서 실행한 코드는 import할 때도 실행됩니다. `order_rules.py` 맨 아래에 조건 없이
`print("검사 완료")`를 쓰면 `main.py`를 실행할 때 주문 결과보다 먼저 그 문구가 나옵니다. 파일을
가져오기만 했는데 화면 출력이나 파일 저장이 시작되는 것은 재사용하기 어려운 동작입니다.

Python은 시작점으로 실행한 모듈의 `__name__` 값을 `"__main__"`으로 정합니다. 다른 파일이
`import order_rules`로 가져오면 같은 값은 `"order_rules"`가 됩니다. 이 차이를 조건문으로 확인하면
직접 실행할 때만 검사 코드를 실행할 수 있습니다.

#### 복구 코드: 직접 실행할 때만 자체 검사를 하는 order_rules.py

두 함수의 입력과 반환값은 앞 절과 같습니다. 새로 추가한 `_self_check`는 작은 입력으로 두 결과를
검사합니다. 맨 아래 조건은 파일을 직접 실행할 때만 검사를 호출하고 문구를 출력합니다. `main.py`가
import할 때는 함수 정의만 준비되고 자체 검사와 출력은 실행되지 않습니다.

```python
def calculate_subtotal(prices):
    return sum(prices)


def calculate_discount(subtotal):
    if subtotal >= 200000:
        return subtotal // 10
    return 0


def _self_check():
    assert calculate_subtotal([1000, 2000]) == 3000
    assert calculate_discount(3000) == 0


if __name__ == "__main__":
    _self_check()
    print("order_rules 자체 검사 통과")
```

#### 실행 명령: 규칙 파일과 main 파일의 출력 비교하기

첫 명령은 `order_rules.py`를 시작점으로 실행하므로 `__name__` 조건이 참입니다. 두 번째 명령에서는
`main.py`가 시작점이고 규칙 파일은 import되므로 조건이 거짓입니다. 따라서 자체 검사 문구는 첫
명령에서만 보이고 두 번째 명령은 주문 금액 세 줄만 보여 줍니다.

```powershell
python order_rules.py
python main.py
```

#### 예상 결과: 시작점에 따라 달라지는 출력

첫 실행의 assert 두 개가 모두 통과하면 자체 검사 문구가 나옵니다. 두 번째 실행에서는 그 문구가
반복되지 않습니다. 주문 계산 결과가 그대로 나온다면 실행 코드와 재사용 함수의 경계가 올바르게
분리된 것입니다.

```text
order_rules 자체 검사 통과

소계: 240,000원
할인: 24,000원
최종 금액: 216,000원
```

`__main__` 조건은 import 자체를 빠르게 만드는 장치가 아닙니다. import할 때 실행하면 안 되는 시작
동작을 가두는 장치입니다. 함수 정의에 필요한 큰 데이터 읽기나 네트워크 요청을 조건문 밖에 두면
여전히 import 시점에 실행됩니다.

파일을 제대로 나눴어도 이름 철자나 실행 위치가 달라지면 모듈을 찾지 못합니다. 다음 절에서는 설치
명령부터 입력하지 않고 오류가 실제로 말하는 범위를 먼저 좁힙니다.

#### 참고 자료: __main__과 직접 실행 구분

- [Python 공식 문서의 __main__ 설명](https://docs.python.org/3.14/library/__main__.html)

## import 오류는 원인을 나눠 찾습니다

### 철자와 파일 위치와 실행 중인 Python 및 이름 충돌을 순서대로 확인합니다

![import 실패 요청이 철자와 검색 폴더와 실행 중인 Python 환경 및 같은 이름의 로컬 파일 검사로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ac/acb8fb4a30a161b898dfe6493f8f002aaeaa829b95f99108947acb01e58af946.png "하나의 import 실패도 철자와 위치와 실행 환경과 이름 충돌 중 어느 지점이 다른지 나눠 봐야 합니다")

`ModuleNotFoundError`는 요청한 모듈을 검색 위치에서 찾지 못했다는 뜻입니다. 이 문장만으로는 패키지가
설치되지 않았다고 단정할 수 없습니다. 철자가 틀렸거나, 로컬 파일이 다른 폴더에 있거나, 설치에 쓴
Python과 실행에 쓴 Python이 다를 때도 같은 예외가 나옵니다.

첫째, 오류 마지막 줄의 이름과 import 줄의 철자를 비교합니다. 파일은 `order_rules.py`인데
`from order_rule import ...`처럼 끝의 `s`를 빠뜨리면 Python은 다른 모듈을 찾습니다. 이 경우에는
무언가를 설치할 일이 없고 import 이름을 파일 이름과 맞추면 됩니다.

둘째, 로컬 모듈이면 실행 파일과 모듈의 위치를 확인합니다. `main.py`만 다른 폴더로 옮겨 실행하면
옆에 있던 `order_rules.py`가 검색 시작 위치에서 사라질 수 있습니다. 처음에는 두 파일을 같은 폴더에
두고 그 폴더에서 `python main.py`를 실행하는 방법이 가장 단순합니다.

셋째, 외부 패키지라면 현재 실행 중인 Python에 설치됐는지 확인합니다. 컴퓨터에 Python이 두 개 있으면
한 Python에 pandas를 설치하고 다른 Python으로 `main.py`를 실행할 수 있습니다. 설치와 실행 명령의
앞부분을 같은 `python`으로 맞추면 어느 환경을 확인하는지 분명해집니다.

#### 실행 명령: 실행 중인 Python과 pandas 설치 위치 확인하기

첫 명령은 코드를 실행할 Python 파일의 실제 위치를 출력합니다. 두 번째 명령은 바로 그 Python에
pandas 배포 패키지가 설치됐는지 확인합니다. 세 번째 명령이 성공하면 실제로 import된 pandas 파일의
위치를 보여 줍니다. 세 경로가 같은 환경을 가리키는지 비교합니다.

```powershell
python -c "import sys; print(sys.executable)"
python -m pip show pandas
python -c "import pandas; print(pandas.__file__)"
```

`pip show`에 패키지가 없다고 나와도 오류 이름을 곧바로 설치 이름으로 사용하지 않습니다. 공식 문서에서
배포 이름을 확인합니다. 예를 들어 설치 이름은 `Pillow`지만 import 이름은 `PIL`입니다. 두 이름이
다를 수 있다는 사실은 엉뚱한 배포 패키지를 설치하지 않기 위해 중요합니다.

넷째, import는 성공했는데 예상한 함수가 없다면 같은 이름의 로컬 파일을 의심합니다. 프로젝트에
`pandas.py`를 만들면 `import pandas`가 설치된 패키지보다 그 로컬 파일을 먼저 찾을 수 있습니다.
이때는 `ModuleNotFoundError` 대신 `AttributeError`나 일부만 준비된 모듈 오류가 날 수도 있습니다.

#### 실패 예시: 로컬 pandas.py가 설치된 패키지를 가리는 경우

입력은 현재 폴더의 빈 `pandas.py`와 아래 `main.py`입니다. import 자체는 로컬 파일을 찾아 성공하지만
그 파일에는 `DataFrame`이 없습니다. 핵심 증거는 오류 문구만이 아니라 `pd.__file__`이 현재 프로젝트의
`pandas.py`를 가리킨다는 점입니다.

```python
import pandas as pd

print(pd.__file__)
table = pd.DataFrame({"금액": [1000, 2000]})
```

로컬 `pandas.py`의 이름을 `table_report.py`처럼 바꾸고, 같은 폴더에 생긴 `__pycache__`가 문제를
재현하는지 새 Python 실행으로 다시 확인합니다. 그 뒤 `pd.__file__`이 환경의 `site-packages` 아래를
가리키면 이름 충돌이 풀린 것입니다.

오류 이름이 다르면 찾을 자리도 달라집니다. 아래 표는 설치 명령을 실행하기 전에 첫 확인 지점을 고르는
용도입니다. 한 번에 여러 설정을 바꾸지 말고 철자, 위치, 실행 환경, 이름 충돌 순서로 한 항목씩
확인해야 어떤 수정이 효과가 있었는지 알 수 있습니다.

#### 확인 목록: 오류 종류와 첫 확인 지점 연결하기

| 보이는 현상 | 가능한 원인 | 첫 확인 |
|---|---|---|
| `No module named 'order_rule'` | 파일 이름과 철자가 다름 | `order_rules.py`와 import 줄 비교 |
| 로컬 모듈만 찾지 못함 | 실행 파일과 모듈 폴더가 다름 | 두 파일 위치와 실행 명령 위치 확인 |
| 외부 패키지만 찾지 못함 | 다른 Python에 설치됨 | `sys.executable`과 `python -m pip show` 비교 |
| import 뒤 속성이 없음 | 로컬 파일이 패키지를 가림 | `module.__file__` 출력 |
| `cannot import name ...` | 모듈은 찾았지만 그 이름이 없음 | 공식 API 철자와 순환 import 확인 |

오류가 사라졌다면 마지막으로 올바른 파일과 올바른 계산을 사용했는지 증거를 남겨야 합니다. import 한
줄이 통과했다는 사실만 확인하면 이름이 같은 엉뚱한 파일을 가져온 문제를 놓칠 수 있습니다.

#### 참고 자료: 모듈 검색 경로와 설치 이름 확인

- [Python 공식 문서의 sys.path 초기화](https://docs.python.org/3.14/library/sys_path_init.html)
- [Python Packaging User Guide의 설치 패키지 안내](https://packaging.python.org/en/latest/tutorials/installing-packages/)

## 가져온 위치와 결과를 검증합니다

### 실행 중인 Python과 실제 모듈 파일 및 기대한 계산값을 한 번에 확인합니다

![확인 스크립트가 Python 실행 파일과 가져온 모듈의 실제 위치 및 계산 결과를 각각 검사하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d2/d23ee36fee82ef17e6c8f32e3fbda5b65e1f11c56e3b29770be4e8e02df8f819.png "실행기와 모듈 위치와 업무 결과는 서로 다른 증거이므로 세 가지를 함께 확인합니다")

오류가 사라졌다는 사실만으로 올바른 모듈을 가져왔다고 단정할 수는 없습니다. 프로젝트 밖에 이름이
같은 모듈이 있거나, 편집기와 터미널이 서로 다른 Python을 사용할 수도 있습니다. 마지막 검증은
실행기 위치, 모듈 위치, 계산 결과라는 세 증거를 함께 확인합니다.

`sys.executable`은 현재 코드를 실행하는 Python 파일의 위치입니다. `order_rules.__file__`은 import된
모듈의 실제 파일 위치입니다. 두 값은 import가 어느 실행 환경과 어느 소스 파일을 사용했는지 화면에
보여 줍니다.

`assert`는 결과가 기대값과 다르면 즉시 `AssertionError`를 냅니다. 단순히 함수가 호출됐다는 사실이
아니라 `240000`, `24000`, `216000`이라는 업무 결과가 맞는지 검사합니다. 모두 맞으면 마지막 통과
문구가 나옵니다.

#### 예시 코드: 실행기와 모듈 위치 및 주문 결과 확인하기

이 파일의 입력은 앞서 사용한 가격 세 개입니다. 첫 assert는 실제로 가져온 파일이 현재 폴더의
`order_rules.py`인지 비교합니다. 나머지 assert는 소계와 할인액과 최종 금액을 검증합니다. 어느 값이
달라져도 통과 문구 전에 멈추므로 실패 지점을 숨기지 않습니다.

```python
from pathlib import Path
import sys

import order_rules

expected_module = Path(__file__).with_name("order_rules.py").resolve()
actual_module = Path(order_rules.__file__).resolve()

prices = [120000, 80000, 40000]
subtotal = order_rules.calculate_subtotal(prices)
discount = order_rules.calculate_discount(subtotal)
final_amount = subtotal - discount

print("Python 실행기:", sys.executable)
print("가져온 모듈:", actual_module)

assert actual_module == expected_module
assert subtotal == 240000
assert discount == 24000
assert final_amount == 216000

print("import와 계산 검증 통과")
```

#### 실행 명령: 독립 검증 파일 실행하기

위 코드를 `verify_import.py`로 저장하고 `main.py`, `order_rules.py`와 같은 폴더에서 실행합니다. 이
명령 하나가 현재 Python, 실제 모듈 파일, 네 기대 조건을 차례로 확인합니다. 마지막 문구가 보이기
전에는 준비가 끝났다고 판단하지 않습니다.

```powershell
python verify_import.py
```

#### 예상 결과: 실제 경로 두 개와 검증 통과 문구

앞의 두 경로는 컴퓨터와 폴더에 따라 달라집니다. 중요한 조건은 `가져온 모듈` 경로의 마지막 파일이
현재 프로젝트의 `order_rules.py`라는 점입니다. 마지막 줄이 나오면 세 가격이 `216000`원으로
계산됐다는 assert도 모두 통과했습니다.

```text
Python 실행기: 현재 사용 중인 Python 파일의 전체 경로
가져온 모듈: 현재 프로젝트의 order_rules.py 전체 경로
import와 계산 검증 통과
```

이제 import 줄을 보면 네 가지를 차례로 읽을 수 있습니다. 어떤 모듈을 찾는지, 현재 파일에 어떤
이름을 만드는지, 처음 불러올 때 어떤 코드가 실행되는지, 실제로 어느 파일을 가져왔는지입니다. 오류가
나도 패키지부터 설치하지 않고 철자와 위치와 실행 중인 Python과 이름 충돌을 증거로 좁힐 수 있습니다.

#### 참고 자료: sys 모듈과 import된 파일 정보

- [Python 공식 문서의 sys 모듈](https://docs.python.org/3.14/library/sys.html)
- [Python 언어 참조의 import 시스템](https://docs.python.org/3.14/reference/import.html)
