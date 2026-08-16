---
title: Python 함수 만들기: 복사한 코드를 안전한 규칙으로 바꾸는 방법
slug: python-functions
author: eddmpython
section: Python 기초
summary: Python 함수 만들기를 거래 분류 프로그램으로 깊이 익힙니다. 정의와 호출, 매개변수와 인자, return, 지역 변수, 객체 변경, 기본값 함정, 예외, 함수 조합과 경계값 테스트를 한 편에서 연결합니다.
readerQuestion: Python 함수는 어떻게 실행되며 반복되는 업무 규칙을 안전하게 다시 쓰려면 무엇을 정해야 할까?
readerTakeaway: 함수는 이름을 붙인 코드 조각이 아니라 입력과 반환값 및 실패 조건을 정한 호출 약속이며, 경계값 테스트로 그 약속을 지켜야 한다.
readerLevel: beginner
readerStartingPoint: Python 코드를 몇 줄 실행해 보았지만 def, 매개변수, 인자, return, 지역 변수라는 말을 처음 봅니다.
primaryKeyword: Python 함수 만들기
searchIntent: how-to
depthContract: standalone-deep-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/67/67d2f5bdac8c6a4e4f51b24751e9cb429406413f0841f4e29f18a58dae9168f6.png
ogImageAlt: 거래 기록이 이름과 입력 및 실행 규칙과 반환값으로 이루어진 Python 함수에 들어가는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

같은 조건문을 세 번 복사하면 당장은 빨리 끝난 것처럼 보입니다. 하지만 금액 기준이 바뀌는 날에는
세 복사본을 모두 찾아 고쳐야 합니다. 한 곳을 놓치면 같은 거래가 파일마다 다르게 분류됩니다.

Python 함수 만들기는 이 문제를 줄이는 방법입니다. 먼저 거래 금액 하나를 함수에 넣고 반환값을
확인합니다. 그다음 함수가 실제로 호출되는 원리와 자주 생기는 오류를 이해하고, 마지막에는 거래
목록을 처리하는 프로그램과 테스트를 직접 실행합니다.

## 함수는 입력과 결과의 약속입니다

### 이름과 입력 및 실행할 일과 결과 네 부분을 먼저 구분합니다

![거래 기록이 이름과 입력 및 실행 규칙과 반환값으로 이루어진 Python 함수에 들어가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/67/67d2f5bdac8c6a4e4f51b24751e9cb429406413f0841f4e29f18a58dae9168f6.png "함수는 코드를 감싼 상자가 아니라 어떤 값을 받아 어떤 값을 돌려줄지 정한 약속으로 읽습니다")

함수는 필요할 때 이름으로 호출할 수 있는 코드입니다. `classify_amount`라는 이름을 부르면서 금액을
넣으면 함수가 조건을 확인하고 `정상`, `확인필요`, `취소` 가운데 하나를 돌려줍니다. 넣는 값이
입력이고 돌려받는 값이 결과입니다.

함수를 이해할 때는 네 부분을 나누어 봅니다. 함수 이름은 어떤 일을 하는지 말하고, 괄호 안의 이름은
어떤 입력이 필요한지 말합니다. 들여쓴 본문은 실행할 규칙이며 `return` 뒤의 값은 호출한 곳으로
돌아가는 결과입니다.

#### 예시 코드: 금액 하나를 세 상태 중 하나로 분류하기

입력은 정수 금액 한 개입니다. 정수는 `50000`이나 `-20000`처럼 소수점이 없는 수이며,
`50_000`의 밑줄은 큰 수를 읽기 쉽게 나눈 표시에 불과합니다. 함수는 음수인지, 십만 원 이상인지
차례로 확인하고 문자열 한 개를 반환합니다. 세 번 호출한 결과가 각각 `정상`, `확인필요`, `취소`로
나오면 네 부분이 제대로 연결된 것입니다.

```python
def classify_amount(amount):
    if amount < 0:
        return "취소"
    if amount >= 100_000:
        return "확인필요"
    return "정상"


print(classify_amount(50_000))
print(classify_amount(100_000))
print(classify_amount(-20_000))
```

#### 예상 결과: 세 입력이 서로 다른 반환 경로를 지나는지 확인하기

첫 번째 금액은 두 조건에 걸리지 않아 마지막 `return`에 도착합니다. 두 번째 금액은 기준과 같아서
확인 대상이 되고, 세 번째 금액은 첫 조건에서 바로 취소가 됩니다. 출력 순서가 아래와 같으면 함수의
기본 약속이 보입니다.

```text
정상
확인필요
취소
```

이제 함수의 겉모양은 보입니다. 다음에는 `def` 줄을 실행할 때 본문도 곧바로 실행되는지 확인해야
호출과 정의를 혼동하지 않습니다.

## def는 실행보다 정의를 먼저 합니다

### def 줄은 함수 객체를 만들고 본문은 괄호를 붙여 호출할 때 실행합니다

![def 문이 함수 객체를 만든 뒤 별도의 호출이 함수 본문을 실행하는 두 단계 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e0/e062f6806cdd36faea17ef54f7671283863317c7164f6de1e6a615eef89176e5.png "정의 단계에서는 함수가 만들어지고 호출 단계에서만 입력이 본문으로 들어갑니다")

Python이 `def classify_amount(amount):`를 만나면 들여쓴 본문을 즉시 실행하지 않습니다. 본문을
나중에 실행할 수 있는 함수 객체를 만들고 `classify_amount`라는 이름이 그 객체를 가리키게 합니다.
함수 객체는 메모리에 존재하는 Python 값입니다.

이름 뒤에 괄호를 붙인 `classify_amount(50_000)`이 호출입니다. 호출 순간에만 `50_000`이 함수
안으로 들어가고 본문이 위에서 아래로 실행됩니다. 정의와 호출이 분리되어 있으므로 같은 함수를 필요한
횟수만큼 다시 부를 수 있습니다.

#### 예시 코드: 정의할 때와 호출할 때의 출력 구분하기

이 예제는 함수 본문에 눈에 보이는 출력 한 줄을 둡니다. `def`가 끝난 직후에는 `본문 실행`이 나오지
않고, 함수 이름에 괄호를 붙인 뒤에만 나와야 합니다. `callable()`은 그 객체를 호출할 수 있는지도
확인합니다.

```python
def announce():
    print("본문 실행")


print("정의 완료")
print(callable(announce))
print(announce.__name__)
announce()
```

#### 예상 결과: 함수 객체가 먼저 생기고 본문은 나중에 실행되는지 확인하기

`정의 완료`와 `True`가 먼저 보이는 것이 핵심입니다. `announce`라는 이름은 이미 함수 객체를
가리키지만 본문은 아직 실행되지 않았습니다. 마지막 호출에서만 `본문 실행`이 나타납니다.

```text
정의 완료
True
announce
본문 실행
```

함수 객체를 만들었다면 다음 질문은 괄호 안의 이름과 실제로 넣는 값이 무엇이냐는 것입니다. 둘을
같은 말로 부르면 오류 메시지를 읽기 어려워집니다.

## 매개변수와 인자는 서로 다릅니다

### 정의에 적은 이름과 호출할 때 건넨 실제 값을 분리해서 읽습니다

![함수 정의의 매개변수 칸과 호출문의 실제 인자가 서로 대응하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17919ef6307662cbe02bb996935cf859896cc5bf4c590da8a6b07c6cfec143c1.png "정의에 적힌 빈 입력 자리와 호출할 때 채우는 실제 값을 서로 다른 것으로 읽습니다")

매개변수는 함수를 정의할 때 괄호 안에 적는 이름입니다. 인자는 함수를 호출할 때 그 자리에 실제로
건네는 값입니다. `def classify_amount(amount):`의 `amount`는 매개변수이고,
`classify_amount(50_000)`의 `50_000`은 인자입니다.

인자는 순서로 전달하거나 이름을 밝혀 전달할 수 있습니다. 이름을 밝힌 값을 키워드 인자라고 합니다.
금액 기준처럼 뜻이 중요한 선택값은 키워드로만 받게 하면 호출문을 읽는 사람이 숫자의 의미를 바로
알 수 있습니다.

#### 예시 코드: 필수 입력과 키워드 전용 선택값 구분하기

첫 번째 매개변수 `amount`는 반드시 필요합니다. `*` 뒤의 `review_limit`은 이름을 밝혀야 하는
키워드 전용 매개변수이며 기본값은 십만 원입니다. 두 번째 호출은 기준을 이십만 원으로 바꾸므로 같은
금액이 다른 결과를 냅니다.

```python
def classify_amount(amount, *, review_limit=100_000):
    if amount < 0:
        return "취소"
    if amount >= review_limit:
        return "확인필요"
    return "정상"


print(classify_amount(150_000))
print(classify_amount(150_000, review_limit=200_000))
```

#### 예상 결과: 호출문에 드러난 기준이 분류를 바꾸는지 확인하기

첫 호출은 기본 기준 십만 원을 쓰므로 확인이 필요합니다. 두 번째 호출은 `review_limit=200_000`을
눈으로 읽을 수 있고 십오만 원이 그보다 작아 정상입니다. 키워드는 값뿐 아니라 그 값의 뜻도 함께
보여 줍니다.

```text
확인필요
정상
```

#### 실패 예시: 필수 인자와 키워드 이름을 잘못 전달하기

호출 규칙을 어기면 함수 본문에 들어가기 전에 `TypeError`가 납니다. 첫 호출은 필수 금액이 없고,
두 번째 호출은 키워드 전용 값을 위치로 전달합니다. 세 번째 호출은 함수가 모르는 이름을 사용하므로
모두 호출 단계에서 멈춥니다.

```python
classify_amount()
classify_amount(150_000, 200_000)
classify_amount(150_000, limit=200_000)
```

입력이 함수 안으로 들어갔다면 결과가 밖으로 어떻게 나오는지도 구분해야 합니다. 화면에 보인다는
이유만으로 `print()`와 `return`을 같은 것으로 생각하면 다음 계산을 이어 갈 수 없습니다.

## return과 print는 목적이 다릅니다

### return은 값을 넘기고 print는 사람이 볼 문자를 화면에 표시합니다

![반환값이 다음 계산으로 이어지는 경로와 출력만 남기고 None이 돌아오는 경로의 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5b/5bd6c0d4727e2cb83955377a082681905e7eb5fec64df6d2075a9214e24eafe7.png "화면 출력과 호출한 코드가 다시 사용할 반환값은 서로 다른 경로입니다")

`return`은 함수가 만든 값을 호출한 곳에 넘깁니다. 호출한 코드는 그 값을 변수에 저장하거나 다른
함수의 입력으로 바로 쓸 수 있습니다. `return`을 실행하면 현재 함수는 그 자리에서 끝납니다.

`print()`는 값을 터미널에 보여 주는 함수입니다. 사람이 확인하기에는 좋지만 출력된 글자가 호출한
코드의 결과값이 되지는 않습니다. 명시적인 `return` 없이 끝난 함수는 `None`이라는 특별한 값을
자동으로 반환합니다.

#### 실패 예시: 출력한 문자열을 반환값으로 착각하기

`classify_with_print()`는 화면에 `정상`을 표시하지만 반환문이 없습니다. 따라서 `status`에는
문자열이 아니라 `None`이 들어갑니다. 뒤에서 `status == "정상"`을 검사하면 거짓이 되어 업무
규칙을 이어 갈 수 없습니다.

```python
def classify_with_print(amount):
    print("정상" if amount < 100_000 else "확인필요")


status = classify_with_print(50_000)
print("저장된 값:", status)
print(status == "정상")
```

#### 예상 결과: 화면에 보인 값과 저장된 값이 다른지 확인하기

첫 줄의 `정상`은 함수 안의 `print()`가 만든 화면 출력입니다. 그 뒤의 `None`이 실제 반환값입니다.
마지막 `False`는 화면에 보이는 문자를 다른 코드가 자동으로 재사용할 수 없다는 증거입니다.

```text
정상
저장된 값: None
False
```

#### 예시 코드: 반환값을 저장하고 다음 함수에 전달하기

이번에는 분류 함수가 문자열을 반환하고 표시 함수가 그 문자열을 입력으로 받습니다. 계산과 화면
표시를 나누면 분류 결과를 파일 저장, 집계, 테스트에도 같은 값으로 사용할 수 있습니다.

```python
def classify_amount(amount):
    if amount >= 100_000:
        return "확인필요"
    return "정상"


def format_message(transaction_id, status):
    return f"{transaction_id}: {status}"


status = classify_amount(120_000)
message = format_message("T001", status)
print(message)
```

반환값은 함수 밖으로 나왔지만 함수 안에서 만든 변수는 어떻게 되는지 아직 남았습니다. 같은 함수를
여러 번 호출해도 이전 호출의 금액이 섞이지 않는 이유가 지역 변수에 있습니다.

## 호출마다 지역 변수가 새로 생깁니다

### 한 번 호출할 때 생긴 이름은 그 호출 안에서만 보이고 종료 뒤에는 사라집니다

![같은 함수가 두 번 호출될 때 서로 분리된 지역 변수 공간이 각각 생기는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/55/55a220cf9be84a9c621ad2d28487d6d5bfeb0fa504f355905e7398fb27427dc7.png "호출마다 별도의 지역 이름 공간이 생기므로 두 거래의 중간값이 섞이지 않습니다")

함수를 호출하면 그 호출만 쓰는 이름 공간이 생깁니다. 매개변수와 함수 안에서 대입한 변수는 이 공간에
들어가며 지역 변수라고 부릅니다. 호출이 끝나면 다음 호출은 같은 이름을 쓰더라도 새 지역 변수로
시작합니다.

Python은 함수 안에서 이름을 찾을 때 현재 함수의 지역 범위를 먼저 봅니다. 없으면 바깥 함수와 모듈,
마지막으로 내장 이름을 찾습니다. 초보 단계에서는 함수가 바깥 변수를 몰래 바꾸게 만들기보다 필요한
값을 매개변수로 받고 결과를 반환하는 편이 안전합니다.

#### 예시 코드: 두 호출의 중간 계산이 서로 섞이지 않는지 확인하기

`tax`와 `total`은 함수 안에서만 쓰는 지역 변수입니다. 첫 호출이 끝난 뒤 두 번째 호출은 새 `tax`와
`total`을 만듭니다. 각 입력에 맞는 결과가 나오고 함수 밖에서 `tax`를 읽을 수 없어야 범위가 분리된
것입니다.

```python
def add_tax(amount, rate):
    tax = int(amount * rate)
    total = amount + tax
    return total


print(add_tax(10_000, 0.1))
print(add_tax(20_000, 0.05))
print("tax" in globals())
```

#### 예상 결과: 같은 지역 변수 이름이 호출마다 다른 값을 갖는지 확인하기

첫 호출의 세금은 천 원이고 두 번째 호출의 세금도 천 원이지만 각 계산은 별도입니다. 마지막 `False`는
지역 변수 `tax`가 모듈의 전역 이름으로 새어 나오지 않았다는 뜻입니다. 첫 호출의 지역 값을 다음
호출에서 읽을 수 없으므로 두 거래의 중간 계산도 서로 덮어쓰지 않습니다.

```text
11000
21000
False
```

#### 실패 예시: 함수 안의 대입 때문에 바깥 이름을 읽지 못하기

함수 안 어디에서든 `limit`에 대입하면 Python은 그 함수의 `limit`을 지역 변수로 봅니다. 대입보다
먼저 읽으려 하면 아직 값이 없어 `UnboundLocalError`가 납니다. 바깥 값을 수정하지 말고 새 기준을
인자로 받아 반환하는 것이 단순한 복구 방법입니다.

```python
limit = 100_000


def raise_limit():
    print(limit)
    limit = 200_000
    return limit


raise_limit()
```

지역 이름은 분리되지만 그 이름이 가리키는 객체까지 자동 복사되는 것은 아닙니다. 딕셔너리나 리스트를
함수에 넣을 때 원본이 바뀌는 문제를 이해하려면 이름과 객체를 한 단계 더 나누어 봐야 합니다.

## 인자는 객체를 가리키는 값으로 들어갑니다

### 지역 이름을 바꾸는 일과 공유 객체의 내용을 바꾸는 일을 구분합니다

![호출자와 함수의 두 이름이 같은 딕셔너리를 가리키다가 복사본에서 분리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/48/48918440bbeb85539ecbfae0c1a04db2d14d891162804a48bd627b79a6d932e8.png "함수 안의 이름은 새로 생기지만 같은 변경 가능한 객체를 가리키면 원본 내용도 바뀝니다")

함수를 호출하면 인자가 가리키던 객체의 참조가 매개변수에 연결됩니다. 참조는 객체가 있는 곳을 가리키는
값입니다. Python 공식 튜토리얼은 이를 객체 참조의 값이 전달된다고 설명합니다.

매개변수 이름을 다른 객체에 다시 연결하는 일은 호출자의 이름을 바꾸지 않습니다. 하지만 두 이름이
같은 리스트나 딕셔너리를 가리킬 때 그 객체의 내용을 수정하면 호출자도 변경된 내용을 봅니다. 이
차이 때문에 입력 원본을 보존해야 하는 함수는 새 객체를 만들어 반환하는 편이 좋습니다.

#### 예시 코드: 이름 재연결과 딕셔너리 변경 비교하기

첫 함수는 지역 이름 `transaction`을 새 딕셔너리에 연결할 뿐 원본을 건드리지 않습니다. 두 번째
함수는 원본과 같은 딕셔너리에 `status` 키를 추가합니다. 마지막 함수는 `{**transaction}`으로
복사본을 만들고 그 복사본만 바꿉니다.

```python
def rebind_transaction(transaction):
    transaction = {"id": "새 거래"}
    return transaction


def mutate_transaction(transaction):
    transaction["status"] = "정상"


def classified_copy(transaction):
    copied = {**transaction}
    copied["status"] = "정상"
    return copied


original = {"id": "T001", "amount": 50_000}
print(rebind_transaction(original))
print(original)

mutate_transaction(original)
print(original)

fresh = classified_copy(original)
print(fresh is original)
```

#### 예상 결과: 어느 동작이 원본 객체를 바꾸는지 확인하기

첫 두 줄은 새 딕셔너리를 반환해도 원본이 그대로라는 사실을 보여 줍니다. `mutate_transaction()` 뒤에는
원본에 `status`가 생깁니다. 마지막 `False`는 복사 함수의 결과가 원본과 다른 객체라는 뜻입니다.

```text
{'id': '새 거래'}
{'id': 'T001', 'amount': 50000}
{'id': 'T001', 'amount': 50000, 'status': '정상'}
False
```

공유 객체가 호출 사이에 남는 또 다른 곳이 기본값입니다. 특히 빈 리스트를 기본값에 바로 적으면 새
호출도 이전 호출의 리스트를 다시 사용합니다.

## 기본값은 정의할 때 한 번 생깁니다

### 변경 가능한 기본값을 여러 호출이 공유하는 Python의 규칙을 확인합니다

![여러 함수 호출이 하나의 기본 리스트를 공유하는 실패와 호출마다 새 리스트를 만드는 수정 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7f/7f7e69dedcb155c332f6b96b23e291f00a4cce6d53c2c9afe0b519c89fcb42fa.png "빈 리스트 기본값은 호출마다 만들어지지 않으므로 None을 기준으로 새 목록을 만듭니다")

기본값은 인자를 생략했을 때 대신 쓰는 값입니다. `review_limit=100_000`처럼 바뀌지 않는 정수는
안전하게 쓸 수 있습니다. 문제는 리스트와 딕셔너리처럼 내용을 바꿀 수 있는 객체를 기본값으로 바로
만들 때 생깁니다.

Python은 함수가 정의될 때 기본값을 한 번 계산해 함수 객체에 보관합니다. 호출할 때마다 새 리스트가
생기는 것이 아닙니다. 첫 호출이 리스트에 값을 추가하면 두 번째 호출도 같은 리스트를 받아 이전 값을
보게 됩니다.

#### 실패 예시: 기본 리스트가 호출 사이의 결과를 기억하기

`results=[]`는 함수 정의 시 한 번 만들어집니다. 첫 호출이 `정상`을 넣은 뒤 두 번째 호출이 같은
리스트에 `취소`를 추가합니다. 두 번째 결과에 이전 값까지 남으면 호출이 독립적이라는 예상이 깨진
것입니다.

```python
def collect_status(status, results=[]):
    results.append(status)
    return results


print(collect_status("정상"))
print(collect_status("취소"))
```

#### 예상 결과: 두 번째 호출에 첫 번째 값이 남는지 확인하기

아래 결과는 Python 오류가 아니라 작성한 함수의 약속이 잘못된 것입니다. 누적이 의도였다면 가능하지만,
각 호출이 새 결과 목록을 만들어야 한다면 이 구현을 사용하면 안 됩니다. 특히 테스트를 한 번만
호출하면 첫 출력은 정상처럼 보여 이 공유 상태를 발견하지 못합니다.

```text
['정상']
['정상', '취소']
```

#### 예시 코드: None을 기준으로 호출마다 새 목록 만들기

`None`은 변경할 내용이 없는 하나의 특별한 값입니다. 인자가 `None`일 때 함수 안에서 빈 리스트를
새로 만들면 각 호출이 다른 목록을 사용합니다. 호출자가 기존 목록을 건넨 경우에는 그 목록을 이어서
사용한다는 선택도 분명하게 남습니다.

```python
def collect_status(status, results=None):
    if results is None:
        results = []
    results.append(status)
    return results


print(collect_status("정상"))
print(collect_status("취소"))
```

#### 예상 결과: 생략한 기본값이 호출마다 독립적인지 확인하기

두 출력이 각각 한 항목만 가지면 복구가 맞습니다. 기본값 공유 문제는 함수 테스트를 한 번만 실행하면
보이지 않으므로 같은 함수를 두 번 이상 호출하는 검사가 필요합니다.

```text
['정상']
['취소']
```

호출 형식이 맞고 상태도 섞이지 않아도 입력 자체가 잘못될 수 있습니다. 금액이 `오만원`이거나 거래
번호가 없을 때 무엇을 반환할지 정하는 것이 함수의 실패 약속입니다.

## 잘못된 입력은 예외로 멈춥니다

### 정상 결과로 가장하지 말고 오류 종류와 문제 값을 호출자에게 알립니다

![잘못된 금액이 함수의 입력 검사를 통과하지 못하고 명확한 예외 경로로 빠지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/49/496a65225e49f0eeba96e1ec03579c3d416f6c5c7df2048b9e442caeb55ca6d5.png "정상 분류 결과와 잘못된 입력 오류를 서로 다른 출력 경로로 분리합니다")

함수는 정상 입력뿐 아니라 받지 않을 입력도 정해야 합니다. 금액을 정수로 바꿀 수 없는데 `정상`을
반환하면 호출자는 데이터 오류를 모른 채 결과 파일을 만듭니다. 이때는 정상 상태 문자열 대신 예외를
발생시키는 편이 안전합니다.

예외는 정상 흐름을 중단하고 오류 정보를 호출한 코드로 올려보내는 Python 객체입니다. 값의 모양은
맞지만 내용이 허용되지 않으면 `ValueError`가 알맞습니다. 필요한 딕셔너리 키가 없으면 직접 설명을
붙인 `ValueError`로 바꾸거나 원래 `KeyError`를 처리할 수 있습니다.

#### 예시 코드: 쉼표가 있는 금액을 정수로 바꾸고 잘못된 값 거부하기

입력은 정수 또는 문자열입니다. 문자열이면 앞뒤 공백과 쉼표를 없앤 뒤 음수 부호를 제외한 나머지가
숫자인지 확인합니다. 변환할 수 없으면 문제 값을 포함한 `ValueError`를 발생시켜 어느 행을 고쳐야
하는지 알려 줍니다.

```python
def parse_amount(value):
    if isinstance(value, bool):
        raise ValueError(f"금액은 정수여야 합니다: {value!r}")
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        cleaned = value.replace(",", "").strip()
        if cleaned.removeprefix("-").isdigit():
            return int(cleaned)
    raise ValueError(f"금액을 정수로 바꿀 수 없습니다: {value!r}")


print(parse_amount("120,000"))
print(parse_amount(" -30,000 "))
```

#### 예상 결과: 문자열 금액이 계산 가능한 정수로 바뀌는지 확인하기

쉼표와 공백은 입력 표현일 뿐 금액 값에는 남지 않습니다. 두 출력이 정수로 보이면 이후 분류 함수에서
대소 비교를 할 수 있습니다. 음수 부호는 보존되어 취소 거래로 분류할 수 있습니다. 출력에 따옴표가
없다는 점도 문자열이 아니라 정수로 반환됐다는 단서입니다.

```text
120000
-30000
```

#### 실패 예시: 변환할 수 없는 금액에서 오류 메시지 읽기

`오만원`은 숫자 문자열이 아니므로 함수가 결과를 꾸며내지 않습니다. 실행하면 `ValueError`와 함께
문제 값이 보입니다. 호출자는 이 예외를 기록하고 해당 행을 수정하거나 전체 작업을 중단할 수 있습니다.

```python
parse_amount("오만원")
```

입력 하나를 안전하게 바꿀 수 있게 됐습니다. 이제 읽기, 정리, 분류, 집계를 한 함수에 몰아넣지 않고
각 함수의 반환값을 다음 함수의 입력으로 연결해야 오류 위치가 보입니다.

## 작은 함수는 반환값으로 연결합니다

### 정리와 분류 및 집계를 나누고 각 단계의 결과를 다음 입력으로 넘깁니다

![원시 거래가 정리 함수와 분류 함수 및 집계 함수를 차례로 지나가는 파이프라인](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/07/076f4eff4bbc0a2d4269abb0865e57ffb4668ab8d0479fe7841de310cddcbc94.png "각 함수의 반환값이 다음 함수의 입력이 되면 단계별 결과를 따로 확인할 수 있습니다")

한 함수가 파일 읽기, 금액 변환, 분류, 출력 저장을 모두 하면 실패한 줄을 찾기 어렵습니다. 대신 한
문장으로 설명할 수 있는 일마다 함수를 나눕니다. `normalize_transaction()`은 거래 한 건을 정리하고
`classify_transaction()`은 정리된 거래를 분류합니다.

작은 함수는 줄 수가 적다는 뜻이 아닙니다. 입력과 결과가 한 가지 책임으로 이어진다는 뜻입니다. 함수
이름에 `그리고`가 필요하거나 서로 다른 실패 이유를 한꺼번에 처리한다면 나눌 후보입니다.

#### 예시 코드: 정리된 거래를 분류 함수에 이어 붙이기

원시 입력은 금액이 문자열인 딕셔너리입니다. 첫 함수는 원본을 수정하지 않고 새 딕셔너리를 반환합니다.
두 번째 함수는 정리된 금액과 부서를 읽어 상태 문자열을 반환하며, 마지막 함수가 두 결과를 합칩니다.

```python
def normalize_transaction(raw):
    transaction_id = str(raw.get("id", "")).strip()
    if transaction_id == "":
        raise ValueError("거래 번호가 없습니다")
    return {
        "id": transaction_id,
        "department": str(raw.get("department", "")).strip(),
        "amount": parse_amount(raw.get("amount")),
    }


def classify_transaction(transaction, *, review_limit=100_000):
    if transaction["amount"] < 0:
        return "취소"
    if transaction["department"] == "":
        return "확인필요"
    if transaction["amount"] >= review_limit:
        return "확인필요"
    return "정상"


def process_transaction(raw, *, review_limit=100_000):
    transaction = normalize_transaction(raw)
    status = classify_transaction(
        transaction,
        review_limit=review_limit,
    )
    return {**transaction, "status": status}


raw = {"id": " T001 ", "department": " 영업팀 ", "amount": "120,000"}
print(process_transaction(raw))
print(raw)
```

#### 예상 결과: 단계 결과와 원본 보존을 함께 확인하기

처리 결과에는 정리된 문자열과 정수 금액 및 분류 상태가 들어갑니다. 두 번째 출력은 원시 딕셔너리가
그대로라는 사실을 보여 줍니다. 중간 오류가 나면 정리 함수와 분류 함수를 따로 호출해 어느 단계가
실패했는지 확인할 수 있습니다.

```text
{'id': 'T001', 'department': '영업팀', 'amount': 120000, 'status': '확인필요'}
{'id': ' T001 ', 'department': ' 영업팀 ', 'amount': '120,000'}
```

함수들을 연결하는 방법은 이름을 직접 부르는 것만이 아닙니다. Python에서는 함수 객체도 리스트나
문자열처럼 다른 함수의 인자로 전달할 수 있습니다.

## 함수도 다른 함수에 전달할 수 있습니다

### 분류 규칙을 값으로 받아 같은 처리 절차에 서로 다른 정책을 끼웁니다

![공통 처리 함수가 두 개의 서로 다른 분류 함수 중 하나를 입력으로 받아 실행하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef81136ea9888a1a0adbc3bbe58d50bcde31a6c912972bcedca944499d489431.png "함수 객체를 인자로 전달하면 데이터 처리 순서를 유지한 채 정책만 바꿀 수 있습니다")

함수 이름 뒤에 괄호를 붙이지 않으면 실행 결과가 아니라 함수 객체 자체를 가리킵니다. 이 객체를
변수에 저장하고 리스트에 넣고 다른 함수의 인자로 보낼 수 있습니다. Python에서 함수가 일급 객체라고
할 때 말하는 성질입니다.

이 기능은 데이터 처리 순서는 같고 판단 규칙만 바뀔 때 유용합니다. 예를 들어 국내 거래와 해외 거래가
서로 다른 검토 기준을 써도 `process_with_rule()`은 정리와 결과 결합을 그대로 담당할 수 있습니다.

#### 예시 코드: 처리 함수에 서로 다른 분류 규칙 전달하기

`rule` 매개변수에는 금액이 아니라 호출 가능한 함수 객체가 들어갑니다. 본문에서 `rule(transaction)`처럼
괄호를 붙일 때 실제 규칙이 실행됩니다. 같은 원시 거래가 전달한 규칙에 따라 서로 다른 상태를 받는지
확인합니다.

```python
def domestic_rule(transaction):
    return "확인필요" if transaction["amount"] >= 100_000 else "정상"


def overseas_rule(transaction):
    return "확인필요" if transaction["amount"] >= 50_000 else "정상"


def process_with_rule(raw, rule):
    transaction = normalize_transaction(raw)
    return {**transaction, "status": rule(transaction)}


raw = {"id": "T002", "department": "영업팀", "amount": "70,000"}
print(process_with_rule(raw, domestic_rule)["status"])
print(process_with_rule(raw, overseas_rule)["status"])
```

#### 예상 결과: 같은 데이터와 다른 함수가 결과를 바꾸는지 확인하기

국내 규칙의 기준은 십만 원이므로 칠만 원이 정상입니다. 해외 규칙의 기준은 오만 원이므로 같은 거래가
확인 대상입니다. 처리 함수의 코드를 복사하지 않고 규칙 함수만 바꿨다는 점이 핵심입니다.

```text
정상
확인필요
```

내장 함수 `sorted()`의 `key=`도 같은 원리를 씁니다. 정렬할 값을 꺼내는 함수를 전달하면
`sorted()`가 각 항목마다 그 함수를 호출합니다. 짧은 한 번짜리 계산은 `lambda`로 쓸 수 있지만,
규칙이 두 줄 이상이거나 테스트가 필요하면 이름 있는 `def`가 읽기 쉽습니다.

함수를 값으로 전달할 수 있어도 무엇을 받는 함수인지 이름만으로 전부 알기는 어렵습니다. 타입 힌트와
문서 문자열은 입력과 반환 및 오류 약속을 코드 가까이에 남깁니다.

## 타입 힌트와 문서 문자열은 안내입니다

### 실행을 강제하지 않는 표식으로 입력과 반환 및 실패 조건을 사람에게 보여 줍니다

![함수 정의 옆에 입력 자료형과 반환 자료형 및 오류 조건이 설명 카드로 붙은 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2e/2e597ca5c7533ea021e07194048ff11e03cadf1af2e321f7b5683bbc2ce9b9ba.png "타입 힌트와 문서 문자열은 실행 전후에 사람이 확인할 함수 계약을 드러냅니다")

타입 힌트는 매개변수와 반환값에 기대하는 자료형을 적는 표식입니다. `amount: int`는 정수를 기대한다는
뜻이고 `-> str`은 문자열을 반환한다는 뜻입니다. 편집기와 타입 검사 도구가 실수를 찾는 데 쓰지만
Python 실행기가 자동으로 자료형을 막아 주지는 않습니다.

문서 문자열은 함수 본문의 첫 문자열입니다. 함수의 목적, 입력, 반환값, 발생할 수 있는 예외를 사람이
읽도록 적습니다. `help(함수이름)`과 문서 도구가 이 문자열을 보여 줄 수 있습니다.

#### 예시 코드: 분류 함수의 입력과 반환 및 오류 약속 적기

`Literal`은 반환 문자열이 세 값 가운데 하나라는 의도를 표현합니다. 하지만 `amount`에 문자열을
넣으면 타입 힌트가 실행을 멈추지 않으므로 실제 입력 검사는 여전히 필요합니다. 문서 문자열에는 기준값과
발생 가능한 오류를 구체적으로 남깁니다.

```python
from typing import Literal


Status = Literal["정상", "확인필요", "취소"]


def classify_amount(
    amount: int,
    *,
    review_limit: int = 100_000,
) -> Status:
    """금액을 세 상태 중 하나로 분류합니다.

    amount가 음수면 취소, review_limit 이상이면 확인필요를 반환합니다.
    review_limit가 0 이하이면 ValueError를 발생시킵니다.
    """
    if review_limit <= 0:
        raise ValueError("검토 기준은 0보다 커야 합니다")
    if amount < 0:
        return "취소"
    if amount >= review_limit:
        return "확인필요"
    return "정상"


print(classify_amount.__annotations__)
print(classify_amount.__doc__.splitlines()[0])
```

#### 예상 결과: 함수 객체에 설명 정보가 저장됐는지 확인하기

첫 출력에는 매개변수와 반환값의 힌트가 들어 있습니다. 두 번째 출력은 문서 문자열의 첫 줄입니다.
정확한 사전 출력 모양은 Python 버전에 따라 조금 다를 수 있지만 `amount`, `review_limit`, `return`
세 이름과 설명 문장이 보이면 됩니다.

```text
{'amount': <class 'int'>, 'review_limit': <class 'int'>, 'return': typing.Literal['정상', '확인필요', '취소']}
금액을 세 상태 중 하나로 분류합니다.
```

앞서 확인한 핵심 개념을 이제 한 파일에서 실제 입력 여러 건에 적용합니다. 완성 예제는 함수 사이의
입력과 반환값이 끝까지 이어지는지 보여 줍니다. 함수를 다른 함수에 전달하는 기법은 정책을 실행 중에
바꿔야 할 때만 필요하므로, 한 가지 분류 기준을 쓰는 완성 예제에서는 직접 함수 이름을 호출합니다.

## 거래 분류 프로그램을 완성합니다

### 원시 거래 다섯 건을 정리하고 분류한 뒤 상태별 건수와 금액을 출력합니다

![원시 거래 다섯 건이 정리와 분류 및 요약 함수를 지나 최종 보고서로 나오는 전체 처리 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/30/3075e2d92ae65329b3adab45bb7faf9dac67a3fb7f3ef453bb73e3e8d6ff4104.png "완성 프로그램은 각 단계의 함수가 다음 단계에 어떤 값을 넘기는지 끝까지 보여 줍니다")

이 프로그램의 입력은 딕셔너리 다섯 개가 든 리스트입니다. 딕셔너리는 이름표가 붙은 값을 보관하는
자료형이고 리스트는 여러 항목을 순서대로 담습니다. 각 거래에는 번호, 부서, 금액이 있습니다.

코드의 `list[dict[str, object]]`는 문자열 키를 가진 딕셔너리 여러 개가 리스트에 들어 있다는
타입 힌트입니다. 여기서 `object`는 아직 문자열인지 정수인지 확정하지 않은 입력값을 뜻합니다.
실행 중 실제 자료형은 `parse_amount()`와 `classify_transaction()`이 검사하므로 타입 힌트만 믿고
잘못된 값을 통과시키지 않습니다.

프로그램은 금액을 정수로 바꾸고, 거래 상태를 붙이고, 상태별 건수와 금액 합계를 계산합니다. 원본
리스트는 수정하지 않습니다. 마지막 출력에서 거래 다섯 건과 요약 세 상태의 숫자를 확인할 수 있습니다.

#### 예시 코드: 정리와 분류 및 요약을 한 파일로 실행하기

아래 내용을 `transaction_functions.py`에 저장합니다. `main()`은 예제 데이터를 만들고 다른 함수들을
순서대로 호출하는 시작점입니다. 마지막 두 줄은 이 파일을 직접 실행할 때만 `main()`을 호출하므로
테스트 파일에서 가져올 때는 예제 출력이 자동으로 섞이지 않습니다.

```python
from typing import Literal


Status = Literal["정상", "확인필요", "취소"]


def parse_amount(value: object) -> int:
    """정수 또는 숫자 문자열을 정수 금액으로 바꿉니다."""
    if isinstance(value, bool):
        raise ValueError(f"금액은 정수여야 합니다: {value!r}")
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        cleaned = value.replace(",", "").strip()
        if cleaned.removeprefix("-").isdigit():
            return int(cleaned)
    raise ValueError(f"금액을 정수로 바꿀 수 없습니다: {value!r}")


def normalize_transaction(raw: dict[str, object]) -> dict[str, object]:
    """원시 거래를 새 딕셔너리로 정리하며 원본은 바꾸지 않습니다."""
    transaction_id = str(raw.get("id", "")).strip()
    if transaction_id == "":
        raise ValueError("거래 번호가 없습니다")

    return {
        "id": transaction_id,
        "department": str(raw.get("department", "")).strip(),
        "amount": parse_amount(raw.get("amount")),
    }


def classify_transaction(
    transaction: dict[str, object],
    *,
    review_limit: int = 100_000,
) -> Status:
    """정리된 거래 한 건을 정상, 확인필요, 취소로 분류합니다."""
    if review_limit <= 0:
        raise ValueError("검토 기준은 0보다 커야 합니다")

    amount = transaction["amount"]
    department = transaction["department"]
    if not isinstance(amount, int) or isinstance(amount, bool):
        raise TypeError("정리된 금액은 정수여야 합니다")
    if not isinstance(department, str):
        raise TypeError("정리된 부서는 문자열이어야 합니다")

    if amount < 0:
        return "취소"
    if department == "" or amount >= review_limit:
        return "확인필요"
    return "정상"


def process_transaction(
    raw: dict[str, object],
    *,
    review_limit: int = 100_000,
) -> dict[str, object]:
    """원시 거래를 정리하고 상태를 붙인 새 딕셔너리를 반환합니다."""
    transaction = normalize_transaction(raw)
    status = classify_transaction(
        transaction,
        review_limit=review_limit,
    )
    return {**transaction, "status": status}


def process_transactions(
    rows: list[dict[str, object]],
    *,
    review_limit: int = 100_000,
) -> list[dict[str, object]]:
    """원시 거래 목록을 같은 기준으로 처리합니다."""
    return [
        process_transaction(row, review_limit=review_limit)
        for row in rows
    ]


def summarize_transactions(
    rows: list[dict[str, object]],
) -> dict[str, dict[str, int]]:
    """상태별 건수와 금액 합계를 계산합니다."""
    summary = {
        "정상": {"count": 0, "amount": 0},
        "확인필요": {"count": 0, "amount": 0},
        "취소": {"count": 0, "amount": 0},
    }

    for row in rows:
        status = row["status"]
        amount = row["amount"]
        if status not in summary:
            raise ValueError(f"알 수 없는 상태입니다: {status!r}")
        if not isinstance(amount, int) or isinstance(amount, bool):
            raise TypeError("요약할 금액은 정수여야 합니다")
        summary[status]["count"] += 1
        summary[status]["amount"] += amount

    return summary


def main() -> None:
    raw_transactions = [
        {"id": "T001", "department": "영업팀", "amount": "50,000"},
        {"id": "T002", "department": "개발팀", "amount": "120,000"},
        {"id": "T003", "department": "영업팀", "amount": "-30,000"},
        {"id": "T004", "department": "", "amount": "40,000"},
        {"id": "T005", "department": "총무팀", "amount": 90_000},
    ]

    processed = process_transactions(raw_transactions)
    summary = summarize_transactions(processed)

    for transaction in processed:
        print(
            transaction["id"],
            transaction["amount"],
            transaction["status"],
        )

    for status, values in summary.items():
        print(status, values["count"], values["amount"])


if __name__ == "__main__":
    main()
```

#### 실행 명령: 완성 프로그램의 입력부터 요약까지 확인하기

터미널에서 파일이 있는 폴더를 연 뒤 아래 명령을 실행합니다. 첫 다섯 줄은 거래별 결과이고 마지막
세 줄은 상태별 건수와 금액 합계입니다. 오류 없이 여덟 줄이 나오면 정의한 함수들이 반환값으로
연결된 것입니다.

```powershell
python transaction_functions.py
```

#### 예상 결과: 거래별 상태와 상태별 합계 대조하기

정상은 T001과 T005 두 건이며 금액 합계는 십사만 원입니다. 확인필요는 T002와 T004 두 건으로
십육만 원이고 취소는 음수 한 건입니다. 전체 건수 `2 + 2 + 1`이 입력 다섯 건과 같아야 합니다.

```text
T001 50000 정상
T002 120000 확인필요
T003 -30000 취소
T004 40000 확인필요
T005 90000 정상
정상 2 140000
확인필요 2 160000
취소 1 -30000
```

한 번 맞는 출력은 시작일 뿐입니다. 십만 원 바로 아래와 같은 금액, 잘못된 문자열, 연속 호출을
자동으로 다시 확인해야 규칙을 고친 뒤에도 함수 약속이 유지됩니다.

## 경계값 테스트가 함수 약속을 지킵니다

### 정상과 경계 및 실패 입력을 고정해 코드가 바뀐 뒤에도 같은 결과를 확인합니다

![함수에 정상값과 경계값 및 실패값을 넣고 기대 결과와 실제 결과를 비교하는 테스트 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/67/676a279344492625cf752619379fede637caf8aceff9d5baf766df2ef9b3d8fb.png "테스트는 대표 입력과 기대 반환값을 짝지어 함수의 약속이 바뀌지 않았는지 확인합니다")

테스트는 입력을 넣고 실제 반환값을 미리 정한 기대값과 비교하는 코드입니다. 함수는 입력과 반환값이
분명하므로 작은 단위로 검사하기 좋습니다. 기준값 바로 아래, 기준값과 같은 값, 음수처럼 결과가 바뀌는
경계를 반드시 넣습니다.

실패도 약속의 일부입니다. 잘못된 금액이 `ValueError`를 내는지, 함수가 원본 딕셔너리를 바꾸지
않는지, 여러 거래를 처리한 건수가 같은지 확인합니다. 정상 사례만 있으면 가장 위험한 분기와 객체
변경 버그가 남습니다.

#### 예시 코드: 반환값과 예외 및 원본 보존을 함께 검사하기

아래 내용을 `test_transaction_functions.py`에 저장합니다. 각 `test_` 함수는 한 가지 약속을 검사합니다.
`pytest.raises()`는 지정한 예외가 나와야 통과하고, 원본 비교는 함수 호출 전후 딕셔너리가 같은지
확인합니다.

```python
import pytest

from transaction_functions import (
    classify_transaction,
    normalize_transaction,
    parse_amount,
    process_transaction,
    process_transactions,
    summarize_transactions,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("120,000", 120_000),
        (" -30,000 ", -30_000),
        (50_000, 50_000),
    ],
)
def test_parse_amount_accepts_supported_values(raw, expected):
    assert parse_amount(raw) == expected


@pytest.mark.parametrize("raw", ["오만원", "", None, True])
def test_parse_amount_rejects_invalid_values(raw):
    with pytest.raises(ValueError):
        parse_amount(raw)


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (-1, "취소"),
        (0, "정상"),
        (99_999, "정상"),
        (100_000, "확인필요"),
    ],
)
def test_classify_transaction_checks_boundaries(amount, expected):
    transaction = {"department": "영업팀", "amount": amount}
    assert classify_transaction(transaction) == expected


def test_missing_department_requires_review():
    transaction = {"department": "", "amount": 50_000}
    assert classify_transaction(transaction) == "확인필요"


def test_custom_review_limit_is_used():
    transaction = {"department": "영업팀", "amount": 150_000}
    assert (
        classify_transaction(transaction, review_limit=200_000)
        == "정상"
    )


def test_invalid_review_limit_is_rejected():
    transaction = {"department": "영업팀", "amount": 50_000}
    with pytest.raises(ValueError, match="0보다 커야"):
        classify_transaction(transaction, review_limit=0)


def test_normalize_transaction_keeps_original_unchanged():
    raw = {"id": " T001 ", "department": " 영업팀 ", "amount": "50,000"}
    before = raw.copy()
    normalized = normalize_transaction(raw)

    assert raw == before
    assert normalized == {
        "id": "T001",
        "department": "영업팀",
        "amount": 50_000,
    }


def test_missing_transaction_id_is_rejected():
    with pytest.raises(ValueError, match="거래 번호"):
        normalize_transaction({"department": "영업팀", "amount": 50_000})


def test_process_transaction_adds_status_to_new_object():
    raw = {"id": "T001", "department": "영업팀", "amount": "50,000"}
    processed = process_transaction(raw)

    assert processed["status"] == "정상"
    assert "status" not in raw


def test_process_transactions_preserves_row_count():
    rows = [
        {"id": "T001", "department": "영업팀", "amount": "50,000"},
        {"id": "T002", "department": "개발팀", "amount": "120,000"},
    ]
    processed = process_transactions(rows)

    assert len(processed) == len(rows)
    assert [row["status"] for row in processed] == ["정상", "확인필요"]


def test_summary_count_matches_processed_rows():
    rows = [
        {"id": "T001", "department": "영업팀", "amount": 50_000, "status": "정상"},
        {"id": "T002", "department": "개발팀", "amount": 120_000, "status": "확인필요"},
        {"id": "T003", "department": "영업팀", "amount": -30_000, "status": "취소"},
    ]
    summary = summarize_transactions(rows)

    total_count = sum(values["count"] for values in summary.values())
    assert total_count == len(rows)
    assert summary["정상"]["amount"] == 50_000
    assert summary["취소"]["amount"] == -30_000
```

#### 실행 명령: pytest로 모든 함수 약속 검사하기

두 파일이 같은 폴더에 있는 상태에서 먼저 pytest가 설치됐는지 확인합니다. 버전이 나오지 않고
`No module named pytest`가 보일 때만 설치 명령을 한 번 실행합니다. 그다음 테스트 명령을 실행합니다.
`-q`는 통과한 테스트 이름을 길게 나열하지 않고 결과를 간단히 보여 줍니다. 실패하면 pytest가 입력과
기대값 및 실제값이 달라진 줄을 표시합니다.

```powershell
python -m pytest --version
```

```powershell
python -m pip install pytest
```

```powershell
python -m pytest -q
```

#### 예상 결과: 모든 대표 입력이 통과했는지 확인하기

매개변수로 묶은 사례도 각각 하나의 검사로 세므로 통과 수는 함수 개수보다 많습니다. Python과 pytest
버전에 따라 시간 표시는 달라질 수 있지만 실패 수가 0이고 모든 점이 통과해야 합니다.

```text
...................                                                      [100%]
19 passed
```

테스트가 많다고 함수 분리가 항상 옳은 것은 아닙니다. 마지막으로 함수를 만들 때와 만들지 않을 때,
그리고 클래스로 넘어갈 때의 기준을 구분해야 불필요한 이름만 늘어나지 않습니다.

## 함수가 항상 가장 좋은 답은 아닙니다

### 반복 여부보다 입력과 결과 및 실패 조건이 하나의 이름으로 설명되는지 봅니다

![한 줄 코드와 이름 있는 함수 및 상태를 가진 객체를 상황에 따라 선택하는 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c4/c4a65361c1460e32333bd076397cc9fb671dc1f54c4405afbd817d8bfd1aa740.png "코드 길이가 아니라 독립된 입력과 결과 및 공유 상태의 유무로 함수와 다른 선택지를 고릅니다")

한 번만 쓰는 코드도 이름을 붙였을 때 업무 뜻이 선명해지면 함수가 될 수 있습니다. 반대로 두 번
반복되더라도 `len(rows)`처럼 이미 분명한 한 줄을 `get_length()`로 감싸면 새 이름만 늘어납니다.
반복 횟수보다 입력과 결과를 독립된 약속으로 말할 수 있는지가 중요합니다.

`sum()`, `sorted()`, `max()` 같은 내장 함수가 문제에 정확히 맞으면 새 함수를 만들 필요가 없습니다.
짧은 계산을 다른 함수에 한 번 전달할 때는 `lambda`가 가능하지만 조건과 오류 처리가 생기면 이름 있는
함수가 낫습니다.

여러 함수가 같은 설정과 누적 상태를 계속 공유한다면 클래스가 더 읽기 쉬울 수 있습니다. 예를 들어
검토 기준과 처리 건수를 하나의 객체가 보관해야 할 때입니다. 하지만 상태가 없는 입력과 결과 변환은
함수로 시작하는 편이 단순합니다.

아래 표는 문법의 우열이 아니라 문제 모양에 따른 선택입니다. 지금 작성할 코드의 입력, 반환값, 공유할
상태를 한 줄씩 적어 보면 어느 선택이 맞는지 드러납니다.

#### 설명 목록: 함수와 한 줄 코드 및 클래스를 구분하기

| 상황 | 먼저 고를 것 | 이유 |
|---|---|---|
| 이미 이름이 분명한 한 줄 계산 | 그대로 두거나 내장 함수 | 새 이름이 설명을 늘리지 않습니다 |
| 입력을 받아 결과를 만드는 독립 규칙 | 이름 있는 함수 | 호출 약속과 테스트 경계가 생깁니다 |
| 다른 함수에 전달할 한 번짜리 짧은 식 | 짧은 lambda | 별도 이름 없이 식 하나를 전달합니다 |
| 여러 동작이 같은 설정과 상태를 계속 공유 | 클래스 검토 | 데이터와 그 데이터를 바꾸는 동작을 함께 둡니다 |
| 파일 전체를 읽고 정리하고 저장하는 거대한 함수 | 작은 함수들의 조합 | 단계별 입력과 실패 위치를 따로 확인합니다 |

함수를 쓸 범위를 정했다면 마지막 행동은 복사된 코드 한 덩어리를 골라 약속을 적고 테스트하는 것입니다.
막연히 코드를 잘게 자르는 일부터 시작하지 않습니다.

## 함수 이름부터 지금 확인합니다

### 복사된 업무 규칙 하나를 골라 입력과 반환 및 실패 조건을 먼저 적습니다

![복사된 조건문 두 곳이 하나의 이름 있는 함수와 테스트 사례로 정리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0f/0fdb589a7b9f944becc6296d8939d3721d98b1d59497c2bdf6ad7995d8f20436.png "첫 리팩터링은 복사된 규칙의 입력과 반환값 및 실패 조건을 적는 데서 시작합니다")

지금 가진 코드에서 같은 조건문이 복사된 곳 하나를 찾습니다. 코드를 옮기기 전에 `무엇을 넣는가`,
`무엇을 돌려받는가`, `어떤 입력은 거부하는가`를 세 줄로 적습니다. 세 줄을 한 문장으로 묶을 수
있을 때 그 문장의 동사를 함수 이름으로 사용합니다.

첫 함수는 화면 출력보다 반환값을 만들게 합니다. 원본 리스트나 딕셔너리를 바꿔야 한다면 함수 이름과
문서 문자열에 그 사실을 드러냅니다. 보존해야 한다면 복사본을 반환하고 테스트에서 원본이 같은지
확인합니다.

완성 예제를 실행하려면 `transaction_functions.py`와 `test_transaction_functions.py`를 같은 폴더에
저장하고 `python -m pytest -q`를 실행합니다. `19 passed`가 보인 뒤 십만 원 기준을 바꾸고 다시
실행하면 함수 한 곳의 변경이 모든 호출과 테스트에 어떻게 반영되는지 직접 확인할 수 있습니다.

#### 확인 목록: 첫 함수를 호출 약속으로 완성하기

- 함수 이름만 읽어도 반환할 결과가 보이는가
- 매개변수와 실제 인자를 구분해 설명할 수 있는가
- `print()`가 아니라 `return`으로 다음 코드에 값을 넘기는가
- 함수가 원본 객체를 바꾸는지 복사본을 만드는지 정했는가
- 변경 가능한 리스트나 딕셔너리를 기본값에 직접 두지 않았는가
- 잘못된 입력에서 정상 결과 대신 구체적인 예외를 발생시키는가
- 기준 바로 아래와 같은 값 및 실패 입력을 테스트했는가
- 함수가 처리한 전체 건수와 입력 건수가 같은가

#### 참고 자료: 함수 동작을 확인할 Python 공식 문서

- [Python 공식 튜토리얼의 함수 정의와 호출](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)
- [Python 공식 튜토리얼의 기본값과 키워드 인자](https://docs.python.org/3/tutorial/controlflow.html#more-on-defining-functions)
- [Python 실행 모델의 이름과 지역 범위](https://docs.python.org/3/reference/executionmodel.html#naming-and-binding)
- [Python 타입 힌트 공식 문서](https://docs.python.org/3/library/typing.html)
