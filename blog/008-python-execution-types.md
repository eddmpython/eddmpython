---
title: Python 실행 순서와 자료형: 문자와 숫자가 다른 이유
slug: python-types
date: 2026-08-14
modified: 2026-08-14
author: eddmpython
section: Python 기초와 실행
summary: Python 실행 순서와 자료형을 지출 금액 코드로 설명합니다. 줄 순서와 함수 호출 시점을 확인하고 문자 금액을 계산 가능한 숫자로 바꿉니다.
readerQuestion: Python 코드는 어떤 순서로 실행되고 문자와 숫자는 왜 서로 다른 결과를 만들까?
readerTakeaway: Python은 만난 명령문을 순서대로 실행하며 자료형에 따라 가능한 동작이 달라지므로 계산 전에는 값의 종류를 확인해야 한다.
readerLevel: beginner
readerStartingPoint: 변수와 함수 예제를 실행해 봤지만 줄을 옮겼을 때 생기는 오류와 따옴표가 붙은 금액을 숫자로 바꾸는 이유는 모른다.
primaryKeyword: Python 실행 순서 자료형
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/68/68423d45eecf0ba4b25d6d6c4d362086adcec4439facb464efed4ddc1765d554.png
ogImageAlt: 위에서 아래로 놓인 금액 저장과 계산 및 출력 코드 카드가 차례대로 실행 결과를 만드는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 실행 순서와 자료형을 모르면 코드의 철자가 모두 맞아도 결과가 달라집니다. 계산할 값을 저장하기
전에 사용하면 이름 오류가 나고, 따옴표가 붙은 금액 두 개를 더하면 계산 대신 글자가 이어집니다.

이 글에서는 `120000`원과 배송비 `30000`원을 사용하는 짧은 코드를 실행합니다. 줄 순서와 함수 호출
시점을 확인하고, `"120,000원"`을 계산 가능한 숫자로 바꿔 `150,000원`이 나오는지 확인합니다.

## 줄은 위에서 아래로 실행됩니다

### 값을 먼저 저장하고 계산한 뒤 출력해야 예상한 금액이 나타납니다

![위에서 아래로 놓인 금액 저장과 계산 및 출력 코드 카드가 차례대로 실행 결과를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/68/68423d45eecf0ba4b25d6d6c4d362086adcec4439facb464efed4ddc1765d554.png "값 저장이 끝난 뒤에야 계산 줄이 두 값을 읽어 결과를 만들 수 있습니다")

Python은 현재 코드 블록의 명령문을 위에서 아래로 만날 때마다 실행합니다. 첫 줄에서 `amount`에
`120000`을 저장하고, 둘째 줄에서 `fee`에 `30000`을 저장합니다. 셋째 줄에 도착하면 두 이름이 모두
있으므로 덧셈 결과 `150000`을 만들 수 있습니다.

계산 줄을 값 저장보다 위로 옮기면 `amount`라는 이름을 아직 만들지 않은 상태가 됩니다. 이때
Python은 추측해서 기다리지 않고 `NameError`를 보여 줍니다. 줄 순서를 읽을 때는 각 줄이 사용하려는
이름이 위에서 먼저 만들어졌는지 확인합니다.

https://eddmpython.com/codaro/run/?example=expense-execution-order

#### 설명 목록

```text
1. amount에 120000 저장
2. fee에 30000 저장
3. amount와 fee를 더해 total 생성
4. total을 천 단위 쉼표가 있는 문장으로 출력
```

#### 참고 자료

- [Python 공식 문서의 실행 모델](https://docs.python.org/3/reference/executionmodel.html)

## 함수 안은 호출할 때 실행됩니다

### def 줄은 함수를 만들고 들여쓴 계산은 함수 이름을 부를 때 시작합니다

![함수 정의 카드의 들여쓴 계산이 대기하다가 호출 카드가 들어온 뒤 결과 금액을 내보내는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ac/acede28d7ee9b76b79229c36cfa0191f4ec0b560668f043dc8e46ff19721e9c5.png "함수의 들여쓴 줄은 정의할 때가 아니라 호출할 때 실제로 실행됩니다")

`def add_fee(amount):`를 실행하면 `add_fee`라는 함수가 만들어집니다. 하지만 그 아래에 들여쓴
`print`와 `return`은 아직 실행되지 않습니다. 코드가 `add_fee(120000)`을 만났을 때 함수 안으로
들어가 배송비를 더하고 결과를 돌려줍니다.

아래 코드를 실행하면 `호출 전`, `함수 안`, `호출 뒤` 순서로 나타납니다. 함수가 파일 위쪽에 적혀
있다는 사실과 함수 안의 계산이 실제로 시작되는 시점은 다릅니다. 긴 코드에서는 함수 이름을 찾은 뒤
그 이름이 괄호와 함께 호출되는 줄을 함께 찾습니다.

#### 코드

```python
def add_fee(amount):
    print("2. 함수 안")
    return amount + 30000

print("1. 호출 전")
total = add_fee(120000)
print("3. 호출 뒤", total)
```

#### 예시

```text
1. 호출 전
2. 함수 안
3. 호출 뒤 150000
```

## 자료형이 가능한 동작을 정합니다

### 같은 숫자 모양도 따옴표가 있으면 계산값이 아니라 문자로 다뤄집니다

![숫자 금액 두 개는 합계 카드로 가고 따옴표가 있는 문자 금액 두 개는 긴 문자 카드로 이어지는 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/71/71589865f9e41b053480f413f149535a6cb0b4f7a4488860ab4203b8c875663c.png "더하기 기호가 같아도 값의 자료형에 따라 계산하거나 글자를 이어 붙입니다")

`120000`과 `"120000"`은 화면에서 비슷해 보이지만 Python에는 다른 값입니다. 따옴표가 없는
`120000`은 정수이고, 더하면 숫자 합계를 만듭니다. 따옴표가 있는 `"120000"`은 문자열이며 더하기
기호를 사용하면 두 글자를 앞뒤로 이어 붙입니다.

자료형은 값의 종류를 나타내는 이름입니다. 정수 `int`는 덧셈과 비교 같은 계산을 할 수 있고, 문자열
`str`은 문장을 저장하고 일부 글자를 바꾸는 일을 할 수 있습니다. Excel에서 읽은 금액이 문자라면
계산 전에 숫자로 바꿔야 합니다.

https://eddmpython.com/codaro/run/?example=expense-number-text

#### 예시

```text
숫자 덧셈: 150000
문자 덧셈: 12000030000
```

#### 참고 자료

- [Python 공식 문서의 기본 자료형](https://docs.python.org/3/library/stdtypes.html)

## type으로 값의 종류를 봅니다

### 계산 전에 type을 실행하면 int와 str을 눈으로 구분할 수 있습니다

![따옴표 없는 금액과 따옴표가 있는 금액이 각각 int와 str 검사 결과 카드로 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/52/52be213d398cc25888464efd2728c5d37715737ba1a3181928afd7b03678bfad.png "값을 보기만 하지 않고 type 결과를 확인하면 계산 전에 문자 금액을 찾을 수 있습니다")

`type(value)`는 값의 자료형을 알려 줍니다. `type(120000)`의 결과에는 `int`가 보이고,
`type("120000")`의 결과에는 `str`이 보입니다. 화면에 표시된 값의 모양만 보고 종류를 짐작하지 않아도
됩니다.

목록이나 Excel 열에 여러 값이 섞여 있다면 대표 값 하나만 확인해서는 부족합니다. 금액 열의 첫 값과
오류가 난 행의 값을 각각 `type`으로 확인합니다. 숫자와 문자가 섞여 있으면 변환 규칙을 먼저 정한 뒤
합계를 계산합니다.

#### 코드

```python
number_amount = 120000
text_amount = "120000"

print(type(number_amount).__name__)
print(type(text_amount).__name__)
```

#### 예시

```text
int
str
```

## 문자 금액을 숫자로 바꿉니다

### 쉼표와 원 글자를 지운 뒤 int로 변환하면 합계를 계산할 수 있습니다

![쉼표와 원 표시가 있는 문자 금액에서 장식 문자가 빠지고 정수 금액과 합계 결과가 만들어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fdb055cd7dcf6f500c44191e34dcebd2666181752020e23801b7fda798aab2ae.png "문자 금액은 불필요한 표시를 지운 뒤 정수로 바꿔야 다른 금액과 더할 수 있습니다")

`"120,000원"`은 쉼표와 `원`이 들어 있는 문자열입니다. 먼저 `replace`로 쉼표와 원 글자를 지우면
`"120000"`이 남습니다. 이 문자열을 `int`에 넣으면 계산 가능한 정수 `120000`이 됩니다.

빈칸이나 `미정`처럼 숫자로 바꿀 수 없는 값이 들어오면 `int`에서 `ValueError`가 납니다. 실제
자동화에서는 이런 값을 조용히 버리지 않고 확인필요 목록에 원문과 오류 이유를 남깁니다. 아래 셀에서
원문 금액을 바꾸고 숫자 합계가 나오는지 확인합니다.

https://eddmpython.com/codaro/run/?example=expense-amount-conversion

#### 설명 목록

```text
원문: "120,000원"
표시 제거: "120000"
정수 변환: 120000
배송비 덧셈: 150000
```

#### 참고 자료

- [Python 공식 문서의 int 자료형](https://docs.python.org/3/library/functions.html#int)
