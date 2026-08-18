---
title: Python 실행 순서와 자료형 이해하기: 같은 코드가 달라지는 이유
slug: python-types
author: eddmpython
section: Python 기초와 실행
summary: Python 실행 순서와 자료형을 지출 금액 코드로 이해합니다. 이름이 만들어지는 시점, 함수 호출, 정수와 문자열의 차이, 변환 실패를 남기는 방법까지 직접 확인합니다.
readerQuestion: Python 코드는 어떤 순서로 실행되며 같은 더하기 기호가 자료형에 따라 왜 다른 결과나 오류를 만들까?
readerTakeaway: Python은 현재 줄에 필요한 값을 먼저 계산한 뒤 이름을 연결하며, 연산은 객체의 자료형에 맞춰 실행되므로 외부 입력은 검사하고 변환해야 한다.
readerLevel: beginner
readerStartingPoint: 변수와 함수를 한 번 실행했지만 NameError와 TypeError가 왜 발생하는지, 따옴표가 붙은 금액을 언제 숫자로 바꿔야 하는지는 모른다.
primaryKeyword: Python 실행 순서 자료형
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0e/0e52c23b722c9244fcfbfb4cd5e8544007e603753f82005c54825f1003dadcfe.png
ogImageAlt: 지출 금액과 배송비를 저장하는 코드 줄이 계산과 출력 줄로 차례로 이어지는 Python 실행 순서
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 실행 순서와 자료형을 모르면 철자가 맞는 코드도 예상 밖의 결과를 냅니다. `total`을 만들기 전에 출력하면 이름 오류가 나고, `"120000"`과 `"30000"`을 더하면 `150000`이 아니라 긴 글자가 나옵니다. Python이 현재 줄에서 어떤 값을 찾고 어떤 연산을 선택했는지 알면 두 현상을 같은 원리로 설명할 수 있습니다.

이 글에서는 지출 금액 `120000`원과 배송비 `30000`원을 사용합니다. 각 예시를 위에서 아래로 실행하고 `type` 결과를 확인한 뒤, `"120,000원"`, `"미정"`, 빈칸이 섞인 입력을 정상 금액과 오류 행으로 나눕니다. 마지막 출력이 `정상 3건`, `합계 145,000원`, `오류 2건`이면 전체 원리를 확인한 것입니다.

## Python은 실행 순서대로 상태를 바꿉니다

### 한 줄이 값을 만들면 다음 줄이 그 값을 읽고 마지막 줄이 결과를 출력합니다

![지출 금액과 배송비를 저장하는 코드 줄이 계산과 출력 줄로 차례로 이어지는 Python 실행 순서](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0e/0e52c23b722c9244fcfbfb4cd5e8544007e603753f82005c54825f1003dadcfe.png "각 줄이 끝날 때 만들어진 이름과 값만 다음 줄에서 사용할 수 있다고 읽습니다")

Python 파일을 실행하면 파일의 가장 바깥에 있는 명령문을 위에서 아래로 만납니다. 명령문은 `amount = 120000`처럼 Python에 한 가지 일을 시키는 완성된 줄입니다. 그 줄이 끝나면 만들어진 이름과 값이 남고, 다음 줄은 그 결과를 읽을 수 있습니다.

아래 네 줄에서 첫째 줄은 `amount`, 둘째 줄은 `fee`를 만듭니다. 셋째 줄은 두 이름이 가리키는 값을 더해 `total`을 만들고, 넷째 줄은 그 값을 천 단위 쉼표가 있는 문장으로 출력합니다. 실행 순서는 화면의 줄 번호가 아니라 현재 실행 중인 코드 블록에서 Python이 다음에 만나는 명령문으로 판단합니다.

#### 예시 코드: 네 줄이 값을 만드는 순서

입력은 정수 금액 두 개입니다. 핵심은 계산 줄이 두 할당 줄보다 아래에 있다는 점입니다. 네 줄을 실행했을 때 마지막에 `합계 150,000원`이 보이면 두 이름이 만들어진 뒤 덧셈이 실행된 것입니다.

```python
amount = 120000
fee = 30000
total = amount + fee
print(f"합계 {total:,}원")
```

#### 예상 결과: 마지막 명령문이 출력한 합계

`print`는 이미 계산된 `total`을 읽습니다. 이 결과가 보이지 않으면 실행 버튼을 눌렀는지 확인하고, 다른 숫자가 보이면 `amount`와 `fee`를 먼저 확인합니다. 출력 한 줄은 앞의 세 줄이 모두 끝났다는 증거입니다.

```text
합계 150,000원
```

https://eddmpython.com/codaro/run/?example=expense-execution-order

[Python 공식 실행 모델](https://docs.python.org/3/reference/executionmodel.html)은 파일과 함수 본문처럼 한 단위로 실행되는 부분을 코드 블록이라고 설명합니다. 위에서 아래라는 말은 모든 Python 프로그램이 영원히 한 줄씩만 움직인다는 뜻이 아닙니다. 조건문, 반복문, 함수 호출을 만나면 다음에 실행할 블록이 바뀝니다.

따라서 줄 순서를 외우는 것만으로는 부족합니다. 한 줄 안에서도 어느 부분을 먼저 계산하는지 알아야 `total = amount + fee`가 실제로 무엇을 하는지 정확히 읽을 수 있습니다.

## 등호 오른쪽을 먼저 계산합니다

### 표현식이 결과를 만든 뒤 왼쪽 이름이 그 결과 객체를 가리킵니다

![금액과 배송비가 등호 오른쪽 덧셈에서 합계 객체가 된 뒤 왼쪽 total 이름표와 연결되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0b/0b0dd23d6ad366220b1847361740d9ef58de6510070d882b0f931a640395ee27.png "할당문은 왼쪽 상자에 코드를 넣는 동작이 아니라 오른쪽 결과에 이름을 연결하는 동작입니다")

`total = amount + fee`에서 먼저 실행되는 부분은 등호 오른쪽의 `amount + fee`입니다. 값 하나를 만드는 코드 조각을 표현식이라고 합니다. Python은 두 이름을 읽고 덧셈 결과 `150000`을 만든 다음, 그 결과에 `total`이라는 이름을 연결합니다.

이름은 값 자체가 아닙니다. Python의 이름은 메모리에 있는 객체를 가리킵니다. 객체는 값과 자료형을 함께 가진 대상입니다. `amount = 120000`을 실행하면 `amount`가 정수 객체를 가리키고, `amount = 90000`을 다시 실행하면 같은 이름이 새 정수 객체를 가리킵니다.

#### 예시 코드: 기존 합계와 바뀐 금액 비교하기

처음 입력은 `120000`과 `30000`이며 `total`은 그 둘을 더한 결과를 가리킵니다. 그 뒤 `amount`만 `90000`으로 다시 연결해도 이미 만든 `total`은 자동 계산되지 않습니다. 출력은 `150000 90000`이어야 합니다.

```python
amount = 120000
fee = 30000
total = amount + fee

amount = 90000
print(total, amount)
```

이 결과는 할당이 Excel 수식처럼 계속 다시 계산되는 연결이 아님을 보여 줍니다. 금액을 바꾼 뒤 합계도 바꾸려면 `total = amount + fee`를 다시 실행해야 합니다. [Python 표현식 평가 순서](https://docs.python.org/3/reference/expressions.html#evaluation-order)와 [할당문 규칙](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements)도 오른쪽을 계산한 뒤 왼쪽 대상에 결과를 할당한다고 설명합니다.

#### 실패 예시: 이름을 만들기 전에 읽었을 때

아래 코드는 일부러 `total`을 먼저 읽습니다. `try`가 오류 이름을 잡아 주므로 학습 셀 전체가 멈추지는 않습니다. 첫 출력이 `NameError`이고 그 뒤 합계가 보이면, 오류가 철자보다 이름을 만든 시점과 관련 있음을 확인할 수 있습니다.

```python
try:
    print(total_before_assignment)
except NameError as error:
    print(type(error).__name__)

total_before_assignment = 150000
print(total_before_assignment)
```

```text
NameError
150000
```

이름과 값을 연결하는 시점을 알았으니, 다음에는 파일 위쪽에 적힌 함수 본문이 왜 바로 실행되지 않는지 구분할 수 있습니다.

## 함수 본문은 호출할 때 시작합니다

### def는 함수 객체를 만들고 괄호가 있는 호출문이 들여쓴 본문을 실행합니다

![함수 정의 뒤 대기 중인 들여쓰기 코드가 호출 카드와 인수를 받은 뒤 반환 결과를 내보내는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2c/2ca4bcdf771992707295f6ae45f40619c08b1d37ec414f86f026db808d1580df.png "정의 시점에는 함수 이름만 생기고 호출 시점에 인수와 매개변수가 연결되며 본문이 실행됩니다")

`def add_fee(amount):`는 함수 정의문입니다. 이 줄을 실행하면 실행 가능한 코드를 담은 함수 객체가 만들어지고 `add_fee`라는 이름이 연결됩니다. 그러나 들여쓴 본문은 아직 실행되지 않습니다. 괄호가 붙은 `add_fee(120000)`을 만날 때 본문으로 이동합니다.

호출문에서는 괄호 안의 `120000`을 먼저 계산해 함수의 `amount` 매개변수에 연결합니다. 그다음 `return amount + 30000`을 계산합니다. `return`이 돌려준 `150000`은 원래 호출 자리로 돌아와 `total`이라는 이름에 연결됩니다.

#### 예시 코드: 정의와 호출 시점 구분하기

입력은 함수에 전달할 금액 `120000`입니다. `events` 목록은 실제 실행된 위치를 순서대로 기록합니다. 정의문만으로는 함수 안 기록이 추가되지 않고, 호출문을 지난 뒤에만 세 문장이 올바른 순서로 출력되어야 합니다.

```python
events = []

def add_fee(amount):
    events.append("2. 함수 안")
    return amount + 30000

events.append("1. 호출 전")
total = add_fee(120000)
events.append(f"3. 호출 뒤 {total}")

print("\n".join(events))
```

#### 예상 결과: 호출문이 본문을 실행한 위치

`함수 안`이 `호출 전`과 `호출 뒤` 사이에 나타납니다. 함수가 파일 위쪽에 적혀 있다는 사실과 함수 본문이 실행되는 시점은 다릅니다. 긴 파일에서는 `def`만 찾지 말고 같은 함수 이름 뒤에 괄호가 붙은 호출문도 찾습니다.

```text
1. 호출 전
2. 함수 안
3. 호출 뒤 150000
```

[Python 함수 정의 규칙](https://docs.python.org/3/reference/compound_stmts.html#function-definitions)은 정의문이 함수 이름을 연결하지만 본문은 호출할 때 실행된다고 명시합니다. 호출 순서를 알았더라도 `120000 + "30000"`은 계산되지 않습니다. 다음 차이는 줄 위치가 아니라 두 객체의 자료형에서 생깁니다.

## 자료형이 연산자의 뜻을 바꿉니다

### 더하기 기호는 정수에는 합계를 만들고 문자열에는 글자를 이어 붙입니다

![정수 두 개와 문자열 두 개가 같은 더하기 연산을 지나 각각 숫자 합계와 이어진 문자 결과를 만드는 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/81/81a9ecf650b7f9bc1d899b4ac825435f38d46290116d531304b375c26edf986d.png "연산자 모양이 같아도 양쪽 객체의 자료형이 다르면 선택되는 동작과 결과가 달라집니다")

자료형은 객체가 어떤 종류의 값이며 어떤 동작을 지원하는지 나타냅니다. `120000`은 정수 `int`이고, `"120000"`은 문자열 `str`입니다. 정수의 `+`는 수를 더하지만 문자열의 `+`는 앞 문자열 뒤에 다음 문자열을 붙입니다.

Python은 따옴표 안의 글자를 보고 금액이라고 추측하지 않습니다. `"120000"`에는 숫자 모양의 글자가 여섯 개 들어 있을 뿐입니다. 반대로 `120000`은 문장이 아니므로 `"원"`과 바로 더할 수 없습니다. 서로 지원하지 않는 자료형을 섞으면 Python은 임의로 변환하지 않고 `TypeError`를 냅니다.

아래 표는 화면에 보이는 값과 실제 쓰임을 연결합니다. `None`은 값이 아직 없다는 뜻이지 숫자 0이나 빈 문자열과 같지 않습니다. 리스트와 딕셔너리는 여러 값을 담지만, 그 안의 개별 값도 각각 자료형을 가집니다.

#### 설명 목록: 처음 자주 만나는 자료형

| 값 | 자료형 | 주로 하는 일 |
|---|---|---|
| `120000` | `int` | 원 단위 합계와 건수 계산 |
| `0.15` | `float` | 일반적인 소수 계산 |
| `"120,000원"` | `str` | 원문 표시와 글자 처리 |
| `True` | `bool` | 조건의 참과 거짓 표시 |
| `None` | `NoneType` | 값이 없음을 명시 |
| `[120000, 30000]` | `list` | 여러 값을 입력 순서대로 저장 |
| `{"금액": 120000}` | `dict` | 이름으로 값을 찾는 한 건의 기록 |

#### 예시 코드: 같은 더하기의 두 결과 비교하기

윗줄은 정수 두 개, 아랫줄은 문자열 두 개를 입력으로 사용합니다. 같은 `+`를 실행해도 첫 결과는 `150000`, 둘째 결과는 `12000030000`이어야 합니다. 결과 모양이 다른 이유는 따옴표가 자료형을 바꿨기 때문입니다.

```python
number_total = 120000 + 30000
text_total = "120000" + "30000"

print("숫자 덧셈:", number_total)
print("문자 덧셈:", text_total)
```

https://eddmpython.com/codaro/run/?example=expense-number-text

#### 실패 예시: 정수와 문자열을 바로 더했을 때

아래 예시는 정수와 문자열을 섞습니다. `TypeError`를 잡아 오류 종류만 출력하므로 다음 줄까지 실행할 수 있습니다. 이 오류는 더하기 순서를 바꿔도 해결되지 않으며, 계산 전에 두 값을 같은 숫자 자료형으로 맞춰야 합니다.

```python
try:
    print(120000 + "30000")
except TypeError as error:
    print(type(error).__name__)
```

```text
TypeError
```

[Python 내장 자료형](https://docs.python.org/3/library/stdtypes.html)은 숫자, 문자열, 시퀀스, 매핑처럼 객체 종류마다 지원하는 연산을 설명합니다. 자료형은 값의 겉모양만으로 확정하지 않고 실행 중인 객체를 검사해야 합니다.

## type은 현재 객체의 종류를 보여 줍니다

### 겉모양이 비슷한 값도 type 결과를 보면 int와 str로 구분됩니다

![따옴표 유무가 다른 금액 두 개가 같은 type 검사 코드를 지나 int 모양과 str 모양 결과로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b1/b18ce14dfae24829b998b02008c1ce6586de424fae67a7ac1362308281c529c8.png "type은 값을 바꾸지 않고 현재 이름이 가리키는 객체의 종류를 진단합니다")

`type(value)`는 현재 객체의 자료형을 돌려줍니다. `type(120000).__name__`은 `int`, `type("120000").__name__`은 `str`입니다. `type`은 진단 도구이므로 문자열을 숫자로 바꾸지는 않습니다. 출력에서 `str`을 확인한 뒤 별도의 변환 코드를 실행해야 합니다.

Python에서는 한 이름이 실행 중에 다른 자료형의 객체를 다시 가리킬 수 있습니다. 이를 동적 타이핑이라고 부릅니다. `amount = "120000"` 다음에 `amount = int(amount)`를 실행하면 이름은 같지만 처음에는 문자열, 나중에는 새 정수 객체를 가리킵니다.

#### 예시 코드: 변환 전후의 자료형 확인하기

입력은 문자열 `"120000"`입니다. 첫 `type`은 `str`을 출력하고, `int`가 새 정수 객체를 만든 뒤 둘째 `type`은 `int`를 출력해야 합니다. 마지막 덧셈이 `150000`이면 진단과 변환이 모두 끝난 것입니다.

```python
amount = "120000"
print(type(amount).__name__)

amount = int(amount)
print(type(amount).__name__)
print(amount + 30000)
```

```text
str
int
150000
```

`isinstance(value, int)`는 값이 정수 계열인지 확인할 때 사용합니다. 다만 `bool`은 정수의 하위 자료형이라 `isinstance(True, int)`도 참입니다. 금액 입력에서 `True`를 숫자 1로 받아들이면 안 되므로 실제 변환 함수에서는 `bool`을 먼저 제외하는 편이 안전합니다.

자료형을 확인했으면 변환 규칙을 정할 수 있습니다. 쉼표와 `원`이 붙은 문자열은 바로 `int`에 넣을 수 없으므로, 허용할 표시를 정리하고 빈칸과 잘못된 글자를 구분해야 합니다.

## 문자 금액은 검사한 뒤 숫자로 바꿉니다

### 앞뒤 공백과 표시를 정리하고 빈칸을 거부한 뒤 int로 변환합니다

![공백과 쉼표 및 원 표시가 있는 문자열 금액이 정리와 빈칸 검사를 지나 정수 결과가 되는 변환 순서](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/82/826c4a80803fe780da498133246f6eee1f2569eb3dd4f36d401227c465729e1e.png "표시 제거와 유효성 검사를 먼저 끝내야 int가 계산 가능한 정수 객체를 만들 수 있습니다")

`int("120,000원")`은 실패합니다. `int`가 받는 문자열에는 부호와 숫자처럼 정수로 해석할 수 있는 내용만 남아야 하기 때문입니다. 먼저 `strip()`으로 앞뒤 공백을 지우고 쉼표를 제거한 뒤, 마지막의 `원` 표시만 떼어 냅니다.

표시를 지운 결과가 빈 문자열이면 0으로 바꾸지 않습니다. 빈칸은 금액 0이 아니라 값이 빠진 상태일 수 있습니다. `"미정"`도 0으로 바꾸지 않고 `ValueError`를 내야 원문이 잘못됐다는 사실을 나중에 확인할 수 있습니다.

#### 예시 코드: 원 표시가 있는 금액을 안전하게 바꾸기

이 함수는 정수는 그대로 받고 문자열만 정리합니다. `bool`과 다른 객체는 금액으로 받지 않으며, 빈칸과 숫자가 아닌 문자열에는 서로 다른 설명을 붙입니다. `" -5,000원 "`은 환불처럼 음수를 뜻하는 입력으로 허용되어 `-5000`이 됩니다.

```python
def parse_won(raw):
    if isinstance(raw, bool):
        raise TypeError("참거짓은 금액이 아님")

    if isinstance(raw, int):
        return raw

    if not isinstance(raw, str):
        raise TypeError("문자열이나 정수가 아님")

    cleaned = raw.strip().replace(",", "")
    if cleaned.endswith("원"):
        cleaned = cleaned[:-1].strip()

    if cleaned == "":
        raise ValueError("빈 금액")

    try:
        return int(cleaned)
    except ValueError as error:
        raise ValueError("숫자가 아닌 금액") from error


print(parse_won("120,000원"))
print(parse_won(" -5,000원 "))
```

```text
120000
-5000
```

https://eddmpython.com/codaro/run/?example=expense-amount-conversion

대한민국 원처럼 소수 단위를 쓰지 않는 합계는 `int`가 단순합니다. 비율이나 측정값처럼 작은 반올림 차이를 허용하는 일반 계산에는 `float`를 쓸 수 있습니다. 소수 화폐를 정확한 십진수 규칙으로 계산해야 한다면 문자열에서 `Decimal`을 만드는 편이 맞습니다.

#### 설명 목록: int와 float와 Decimal 선택하기

| 입력과 목적 | 선택 | 이유 |
|---|---|---|
| `120000원`의 합계 | `int` | 소수점 없는 원 단위를 정확히 저장 |
| 화면 좌표나 센서 비율 | `float` | 이진 부동소수점의 근삿값으로 빠르게 계산 |
| `12.30달러`의 회계 합계 | `Decimal("12.30")` | 십진수 자릿수와 반올림 규칙을 보존 |

[Python Decimal 공식 문서](https://docs.python.org/3/library/decimal.html)는 `1.1` 같은 값을 이진 부동소수점으로 정확히 나타낼 수 없다고 설명합니다. `Decimal(1.1)` 대신 `Decimal("1.1")`처럼 원문 문자열에서 만드는 이유도 여기에 있습니다.

변환 함수 하나가 정상 값을 만들었다면 마지막 단계는 여러 행을 처리하는 것입니다. 잘못된 한 행을 0으로 숨기거나 전체 실행을 끝내지 않고, 정상 합계와 오류 원문을 함께 남겨야 합니다.

## 정상 금액과 오류 행을 함께 남깁니다

### 다섯 입력을 순서대로 변환하고 성공값은 합계에 오류값은 검토 목록에 넣습니다

![금액 원문 다섯 행이 같은 변환 코드로 들어가 정상값 세 행과 오류값 두 행 및 합계 결과로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b8/b8ad831fc9ef79da76adad407a3d4342a1e103340dec551c8ee1273be1a1b3aa.png "한 행의 변환 실패를 0으로 바꾸지 않고 행 번호와 원문을 별도 결과로 보존합니다")

완성 예제의 입력은 `"120,000원"`, `"30,000원"`, `"미정"`, 빈칸, `-5000` 다섯 개입니다. 반복문은 각 값을 `parse_won`에 넣습니다. 변환에 성공한 값만 `valid_amounts`에 넣고, `TypeError`나 `ValueError`가 난 값은 행 번호와 원문 및 이유를 `errors`에 넣습니다.

`try`가 반복문 안에 있으므로 한 행의 실패가 나머지 행을 막지 않습니다. 이 배치는 Python 실행 순서와 자료형을 함께 사용합니다. 현재 행을 읽고, 함수를 호출하고, 자료형에 맞춰 변환한 뒤, 성공 또는 오류 목록 중 하나를 바꾸고 다음 행으로 이동합니다.

#### 예시 코드: 합계와 오류 원문을 동시에 만들기

아래 코드는 앞 절의 변환 함수를 포함한 완성 예제입니다. 입력 다섯 개 중 세 개만 정수로 변환되므로 합계는 `145000`입니다. `"미정"`과 빈칸은 행 번호가 있는 오류 결과로 남아야 합니다.

```python
def parse_won(raw):
    if isinstance(raw, bool):
        raise TypeError("참거짓은 금액이 아님")
    if isinstance(raw, int):
        return raw
    if not isinstance(raw, str):
        raise TypeError("문자열이나 정수가 아님")

    cleaned = raw.strip().replace(",", "")
    if cleaned.endswith("원"):
        cleaned = cleaned[:-1].strip()
    if cleaned == "":
        raise ValueError("빈 금액")

    try:
        return int(cleaned)
    except ValueError as error:
        raise ValueError("숫자가 아닌 금액") from error


raw_amounts = ["120,000원", "30,000원", "미정", "", -5000]
valid_amounts = []
errors = []

for row_number, raw in enumerate(raw_amounts, start=2):
    try:
        amount = parse_won(raw)
    except (TypeError, ValueError) as error:
        errors.append((row_number, raw, str(error)))
    else:
        valid_amounts.append(amount)

print(f"정상 {len(valid_amounts)}건")
print(f"합계 {sum(valid_amounts):,}원")
print(f"오류 {len(errors)}건")

for row_number, raw, reason in errors:
    print(f"{row_number}행: {reason}, 원문={raw!r}")
```

#### 예상 결과: 정상 합계와 두 오류 행 확인하기

정상 건수, 합계, 오류 건수가 먼저 보입니다. 그 아래 `4행`과 `5행`이 남으면 잘못된 값을 조용히 버리지 않은 것입니다. 첫 금액을 `"100,000원"`으로 바꾸면 정상 건수와 오류 건수는 그대로이고 합계만 `125,000원`으로 바뀌어야 합니다.

```text
정상 3건
합계 145,000원
오류 2건
4행: 숫자가 아닌 금액, 원문='미정'
5행: 빈 금액, 원문=''
```

검증할 때는 정상값 하나만 보지 않습니다. `"0원"`은 정수 0, `"-5,000원"`은 정수 -5000, `"12.5원"`은 오류, `None`은 자료형 오류가 되어야 합니다. 업무에서 음수를 허용하지 않는다면 변환 뒤 `amount < 0`을 별도 규칙으로 거부해야 하며, 그 정책을 문자열 정리 코드에 숨기지 않습니다.

이 예제는 원 단위 금액처럼 허용 형식이 명확한 입력에 맞습니다. 날짜, 백분율, 소수 화폐는 각각 전용 변환 규칙을 써야 합니다. 지금은 마지막 코드의 `raw_amounts`에서 값 하나를 바꾸고 다시 실행해 정상 건수, 합계, 오류 행 중 무엇이 달라지는지 확인하면 됩니다.
