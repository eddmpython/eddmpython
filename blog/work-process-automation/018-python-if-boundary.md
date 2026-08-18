---
title: Python if문 경계값이 중요한 이유: 100000원은 어디로 갈까
slug: python-if-boundary
author: eddmpython
section: Python 기초
summary: Python if문 경계값을 빠뜨리지 않는 조건 작성법을 익힙니다. 참과 거짓, 들여쓰기, 분기 순서, 숫자 구간, 입력 검증을 배우고 100000원 전후를 pytest로 확인합니다.
readerQuestion: Python if문에서 경계값을 빠뜨리거나 두 분류에 겹치게 하지 않으려면 조건과 테스트를 어떻게 써야 할까?
readerTakeaway: 입력 규칙을 먼저 정하고 겹치지 않는 숫자 구간을 넓은 기준부터 배치한 뒤 각 기준의 바로 아래와 같은 값 및 바로 위를 자동 테스트한다.
readerLevel: beginner
readerStartingPoint: if, True, False, 비교 기호, 들여쓰기, 함수, pytest를 모두 처음 본다.
primaryKeyword: Python if문 경계값
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b8/b89cb28dc6f655fef9087c3e650d771ea26d1c148b3cf5384a5d92ce33702668.png
ogImageAlt: 거래 금액 비교식이 참과 거짓 중 하나를 만들고 실행할 코드 묶음 하나를 고르는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python if문으로 `100000`원 이상을 따로 분류한다고 해 보겠습니다. `>`를 쓰면 정확히 `100000`원인 거래는 빠지고, 조건 순서를 잘못 두면 `1000000`원 거래가 더 낮은 등급에 들어갑니다.

이 글에서는 숫자 입력을 정상, 확인필요, 승인필요, 취소로 나누는 프로그램을 만듭니다. 마지막에 `uv run pytest -q`를 실행해 `22 passed`가 보이면 경계값과 잘못된 입력까지 약속대로 처리된 것입니다.

## if문은 참과 거짓으로 실행을 고릅니다

### 비교식이 True인지 False인지 확인하면 실행할 코드가 결정됩니다

![거래 금액 비교식이 참과 거짓 중 하나를 만들고 실행할 코드 묶음 하나를 고르는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b8/b89cb28dc6f655fef9087c3e650d771ea26d1c148b3cf5384a5d92ce33702668.png "비교 결과 하나가 True 또는 False가 되고 그 결과에 맞는 코드만 실행됩니다")

`if`는 조건에 따라 코드를 실행하거나 건너뛰는 Python 문장입니다. 조건은 실행했을 때 참 또는 거짓으로 읽을 수 있는 식입니다. Python은 참을 `True`, 거짓을 `False`라는 두 값으로 표시합니다.

`amount >= 100_000`은 `amount`가 `100000`보다 크거나 같은지 묻습니다. 답이 `True`이면 `if` 아래에 들여쓴 코드가 실행됩니다. 답이 `False`이면 그 코드 묶음을 건너뜁니다.

숫자 안의 밑줄은 사람이 자릿수를 읽기 쉽게 넣는 표시입니다. `100_000`과 `100000`은 같은 정수입니다. 정수는 소수점이 없는 숫자이며 Python에서는 `int`라는 자료형으로 부릅니다.

#### 예시 코드: 비교식이 만드는 True와 False 확인하기

입력은 `99999`, `100000`, `100001` 세 금액입니다. 핵심은 각 금액에 같은 `>= 100_000` 비교를 적용하는 것입니다. 첫 줄만 `False`이고 나머지 두 줄이 `True`이면 기준 금액을 포함하는 비교가 맞게 동작합니다.

```python
print(99_999 >= 100_000)
print(100_000 >= 100_000)
print(100_001 >= 100_000)
```

#### 예상 결과: 기준 금액부터 True가 되는지 확인하기

첫 값은 기준보다 1 작으므로 `False`입니다. 같은 값과 바로 위 값은 기준 이상이므로 `True`입니다. 이 세 줄만으로도 `>=`가 같은 값을 포함한다는 사실을 실행 결과로 확인할 수 있습니다.

```text
False
True
True
```

대입 기호 `=`와 같은지 묻는 `==`도 구분해야 합니다. `amount = 100_000`은 이름에 값을 저장하고, `amount == 100_000`은 두 값이 같은지 물어 `True` 또는 `False`를 만듭니다.

조건의 답을 만들었다면 다음에는 어떤 줄까지 그 답의 영향을 받는지 알아야 합니다.

## 들여쓰기가 실행 범위를 정합니다

### 콜론 다음에 같은 칸만큼 들여쓴 줄들이 한 코드 묶음으로 실행됩니다

![if 머리글 아래 같은 폭으로 들여쓴 세 줄과 바깥으로 돌아온 한 줄이 서로 다른 범위에 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a9/a993e4609546d5edb5d9e95ffb8d79174f769975204a1af6cd7f1bcdce87a18f.png "같은 깊이로 들여쓴 줄만 if가 제어하고 왼쪽으로 돌아온 줄은 항상 실행됩니다")

`if 조건:`에서 콜론 `:`은 제어할 코드가 다음 줄부터 시작된다는 표시입니다. 그 아래에서 같은 칸만큼 안쪽으로 들어간 줄들을 코드 블록이라고 부릅니다. 이 글의 예제는 공백 네 칸을 한 단계로 사용합니다.

들여쓰기는 보기 좋게 정렬하는 장식이 아닙니다. Python은 들여쓰기 깊이로 `if` 안쪽과 바깥쪽을 구분합니다. 안쪽 줄이 끝나고 왼쪽으로 돌아온 줄은 조건과 상관없이 실행됩니다.

#### 예시 코드: if 안쪽과 바깥쪽 출력 구분하기

입력 금액은 `120000`원이고 비교 결과는 `True`입니다. 첫 번째 출력은 공백 네 칸 안쪽에 있으므로 조건이 참일 때만 실행됩니다. 두 번째 출력은 왼쪽으로 돌아왔으므로 조건이 거짓이어도 항상 실행됩니다.

```python
amount = 120_000

if amount >= 100_000:
    print("확인필요")

print("분류 끝")
```

#### 예상 결과: 조건부 출력과 항상 나오는 출력 확인하기

`120000 >= 100000`이 참이므로 두 줄이 모두 보입니다. 금액을 `50000`으로 바꾸면 `확인필요`는 사라지고 `분류 끝`만 남습니다. 이 차이가 들여쓰기 범위를 눈으로 확인하는 가장 작은 실험입니다.

```text
확인필요
분류 끝
```

#### 실패 예시: 들여쓰지 않은 첫 줄의 오류 읽기

콜론 다음 줄을 들여쓰지 않으면 Python은 실행할 코드 묶음을 찾지 못합니다. 아래 오류의 `IndentationError`는 들여쓰기 문제라는 오류 종류이고, `expected an indented block`은 안쪽 줄을 기대했다는 설명입니다.

```text
if amount >= 100_000:
print("확인필요")

IndentationError: expected an indented block
```

`elif`와 `else`는 시작한 `if`와 같은 깊이에 둡니다. 한 칸이라도 더 안쪽에 두면 다른 문장에 속하거나 문법 오류가 날 수 있습니다. 이제 같은 깊이에 놓인 여러 갈래 중 하나를 고르는 규칙을 살펴보겠습니다.

## elif는 첫 번째 참에서 멈춥니다

### 조건을 위에서 확인하고 처음 True인 갈래 하나만 실행합니다

![한 거래 카드가 세 조건을 차례로 지나 처음 열린 결과함 하나에만 들어가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/85/8598031eff383d1d24eaab7f4291cbc602b60642377482510d6ab53ca34f7cc2.png "if와 elif는 처음 참인 갈래에서 멈추므로 한 입력은 결과 하나만 얻습니다")

`elif`는 앞 조건이 거짓일 때만 확인하는 다음 질문입니다. Python은 `if`, 첫 번째 `elif`, 두 번째 `elif` 순서로 조건을 계산합니다. 처음 `True`를 만나는 순간 그 코드만 실행하고 나머지는 보지 않습니다.

`else`에는 조건이 없습니다. 앞의 모든 조건이 `False`일 때 실행하는 마지막 갈래입니다. `else`가 없고 모든 조건이 거짓이면 이 조건문에서는 아무 코드도 실행되지 않습니다.

#### 예시 코드: 세 금액 등급 중 하나만 고르기

입력은 `100000`원입니다. 첫 조건 `>= 1000000`은 거짓이고 두 번째 조건 `>= 100000`은 참입니다. 따라서 `확인필요`가 출력되고 `else`의 `정상`은 실행되지 않아야 한 갈래 선택 규칙이 맞습니다.

```python
amount = 100_000

if amount >= 1_000_000:
    print("승인필요")
elif amount >= 100_000:
    print("확인필요")
else:
    print("정상")
```

#### 예상 결과: 두 번째 조건에서 멈추는지 확인하기

출력은 한 줄뿐입니다. 금액을 `1000000`으로 바꾸면 첫 조건이 참이 되어 `승인필요`만 나오고, `99999`로 바꾸면 앞 조건이 모두 거짓이어서 `정상`만 나옵니다.

```text
확인필요
```

한 거래를 등급 하나에 넣는 문제라면 `if`, `elif`, `else`가 맞습니다. 그러나 한 거래에서 문제를 여러 개 찾으려면 첫 번째 참에서 멈추는 규칙이 오히려 부족할 수 있습니다.

## 여러 if는 여러 결과를 만들 수 있습니다

### 서로 독립된 문제를 모두 찾을 때는 if를 따로 실행합니다

![부서 누락과 고액 검사가 각각 실행되어 한 거래에 두 문제 카드가 함께 붙는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9b/9b3c843cc214d9708408493e6ff8efd7dd4752429db95278276c600bcc8ef6d7.png "독립된 if 두 개는 모두 실행될 수 있어 한 거래에서 여러 문제를 함께 찾습니다")

`elif` 사슬은 범주 하나를 고를 때 씁니다. 반면 서로 떨어진 `if` 두 개는 첫 번째가 참이어도 두 번째를 계속 확인합니다. 한 거래가 부서 누락이면서 고액일 수 있다면 독립된 `if`가 두 문제를 모두 남깁니다.

아래의 `reasons`는 발견한 문제 문장을 모으는 빈 리스트입니다. 리스트는 값을 여러 개 순서대로 담는 그릇이고, `append()`는 새 값을 끝에 붙입니다. 두 조건이 모두 참이면 문장 두 개가 남습니다.

#### 예시 코드: 한 거래에서 누락과 고액을 함께 찾기

입력 부서는 빈 문자열이고 금액은 `1200000`원입니다. 첫 `if`는 부서 누락을 추가하고 두 번째 `if`는 승인 기준 초과를 추가합니다. 출력 목록에 두 문장이 모두 있으면 독립 검사가 빠짐없이 실행된 것입니다.

```python
department = ""
amount = 1_200_000
reasons = []

if department == "":
    reasons.append("부서 누락")

if amount >= 1_000_000:
    reasons.append("승인 기준")

print(reasons)
```

#### 예상 결과: 참인 문제 두 개가 모두 남는지 확인하기

출력은 문자열 두 개를 가진 리스트입니다. 두 번째 `if`를 `elif`로 바꾸면 첫 조건이 참인 순간 다음 검사를 건너뛰어 `승인 기준`이 사라집니다. 범주 선택과 문제 수집을 같은 모양으로 쓰면 안 되는 이유입니다.

```text
['부서 누락', '승인 기준']
```

범주 하나를 고를지 문제 여러 개를 모을지 정했다면, 다음에는 숫자 전체가 빠짐없이 어느 범주에 들어가는지 구간을 써야 합니다.

## 비교 연산자로 빠짐없는 구간을 씁니다

### 각 비교 기호의 포함 범위를 적으면 빠진 값과 겹친 값을 찾을 수 있습니다

![0원과 두 기준선이 숫자 축을 정상과 확인필요 및 승인필요 세 구간으로 나누는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/89/8950ee48fdd6e5ba0e433bc74d89800cdc5246a9f20c84f3cba6bccae4d376ee.png "각 기준선의 포함 방향을 정하면 0원 이상의 모든 금액이 정확히 한 구간에 들어갑니다")

`<`, `<=`, `>`, `>=`, `==`, `!=`는 두 값을 비교하는 연산자입니다. 연산자는 값을 받아 다른 값을 만드는 기호이고, 비교 연산자의 결과는 `True` 또는 `False`입니다. 기호마다 같은 값을 포함하는지가 다릅니다.

아래 표에서 `a`는 왼쪽 값이고 `b`는 오른쪽 값입니다. 특히 `<`와 `<=`, `>`와 `>=`는 같은 값을 포함하는지에서 갈립니다. `=`는 저장이고 `==`가 같음을 비교한다는 차이도 함께 기억해야 합니다.

#### 설명 목록: 여섯 비교 연산자의 질문 읽기

| 식 | 쉬운 질문 | 같은 값일 때 |
|---|---|---|
| `a < b` | a가 b보다 작은가 | `False` |
| `a <= b` | a가 b보다 작거나 같은가 | `True` |
| `a > b` | a가 b보다 큰가 | `False` |
| `a >= b` | a가 b보다 크거나 같은가 | `True` |
| `a == b` | 두 값이 같은가 | `True` |
| `a != b` | 두 값이 다른가 | `False` |

이 글의 금액 규칙은 네 부분으로 나뉩니다. 음수는 잘못된 입력이고, `0`원부터 `99999`원까지는 정상입니다. `100000`원부터 `999999`원까지는 확인필요이고, `1000000`원 이상은 승인필요입니다.

이처럼 가능한 값을 겹치지 않게 나눈 부분을 구간이라고 부릅니다. 모든 유효한 금액이 한 구간에 들어가면 빠짐이 없고, 한 금액이 두 구간에 동시에 들어가지 않으면 겹침이 없습니다.

#### 예시 코드: 한 줄 비교로 정상 금액 구간 확인하기

Python은 `0 <= amount < 100_000`처럼 비교 두 개를 이어 쓸 수 있습니다. 입력 `50000`은 두 비교를 모두 통과하고, `100000`은 오른쪽 비교에서 실패합니다. 출력이 `True`, `False`이면 정상 구간의 양끝이 맞습니다.

```python
amount = 50_000
print(0 <= amount < 100_000)

amount = 100_000
print(0 <= amount < 100_000)
```

#### 예상 결과: 오른쪽 끝을 포함하지 않는지 확인하기

첫 결과는 `0 <= 50000`과 `50000 < 100000`이 모두 참이므로 `True`입니다. 두 번째 결과는 `100000 < 100000`이 거짓이므로 `False`입니다. 이 결과 때문에 정확한 기준값은 다음 구간으로 갑니다.

```text
True
False
```

종이에 구간을 적어도 기호 하나를 잘못 입력할 수 있습니다. 그래서 각 기준선 주변의 가장 가까운 값을 실제로 넣어 보는 경계값 검사가 필요합니다.

## 경계값은 세 숫자로 확인합니다

### 기준 바로 아래와 같은 값 및 바로 위를 실행하면 포함 실수가 드러납니다

![세 기준선마다 바로 아래와 같은 값 및 바로 위 값이 각 기대 결과함과 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fdbc6af43996fd79ca800b7d9b29bf25f6f63813a24a4ceccfe38f45d9769001.png "각 기준마다 세 이웃 값을 넣으면 비교 기호가 같은 값을 포함하는지 바로 드러납니다")

분류가 바뀌는 숫자를 경계값이라고 부릅니다. 이 예제에는 `0`, `100000`, `1000000` 세 경계가 있습니다. 각 경계에서 바로 아래, 같은 값, 바로 위를 넣으면 구간의 시작과 끝을 모두 확인할 수 있습니다.

`50000`과 `700000`처럼 기준에서 멀리 떨어진 값만 시험하면 `>`와 `>=`의 차이를 발견하지 못합니다. 두 기호는 멀리 떨어진 값에서 같은 답을 내고, 정확히 기준과 같은 값에서만 다른 답을 냅니다.

코드를 실행하기 전에 기대 결과를 먼저 적습니다. 실행한 뒤 결과에 맞춰 기대값을 바꾸면 테스트가 잘못된 코드를 승인하게 됩니다. 아래 아홉 줄은 코드와 독립된 업무 규칙입니다.

#### 설명 목록: 세 기준선 주변의 기대 결과 적기

| 경계 | 입력 | 기대 결과 | 확인하는 것 |
|---|---:|---|---|
| `0` | `-1` | 입력오류 | 음수 거부 |
| `0` | `0` | 정상 | 최솟값 포함 |
| `0` | `1` | 정상 | 정상 구간 시작 |
| `100000` | `99999` | 정상 | 바로 아래 |
| `100000` | `100000` | 확인필요 | 같은 값 포함 |
| `100000` | `100001` | 확인필요 | 바로 위 |
| `1000000` | `999999` | 확인필요 | 바로 아래 |
| `1000000` | `1000000` | 승인필요 | 같은 값 포함 |
| `1000000` | `1000001` | 승인필요 | 바로 위 |

#### 예시 코드: 두 금액 기준의 세 이웃값 실행하기

아래 함수는 음수 검사를 뺀 유효 금액 분류만 보여 줍니다. 여섯 입력을 차례로 넣고 기준과 같은 값이 새 구간에 들어가는지 확인합니다. 반복하는 `for`는 괄호 안의 금액을 하나씩 `amount`에 넣어 같은 코드를 실행합니다.

```python
def route_valid_amount(amount):
    if amount >= 1_000_000:
        return "승인필요"
    if amount >= 100_000:
        return "확인필요"
    return "정상"


for amount in (99_999, 100_000, 100_001, 999_999, 1_000_000, 1_000_001):
    print(amount, route_valid_amount(amount))
```

#### 예상 결과: 두 경계에서 분류가 정확히 바뀌는지 확인하기

`100000`부터 확인필요가 되고 `1000000`부터 승인필요가 됩니다. 괄호 안의 숫자 순서를 바꾸지 않았다면 출력 여섯 줄도 입력과 같은 순서로 나옵니다. 이 표가 다르면 비교 기호나 조건 순서를 확인해야 합니다.

```text
99999 정상
100000 확인필요
100001 확인필요
999999 확인필요
1000000 승인필요
1000001 승인필요
```

경계값을 모두 골라도 조건을 놓는 순서가 잘못되면 높은 금액이 앞 조건에 먼저 잡힐 수 있습니다.

## 넓은 조건은 뒤 조건을 가립니다

### 더 많은 값을 받아들이는 조건을 앞에 두면 좁은 조건까지 도달하지 못합니다

![넓은 금액 조건이 높은 기준으로 가는 길을 먼저 막는 실패와 좁은 조건부터 여는 성공을 비교한 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d2/d225def4b9a0c0d307ed559f4910e8e038027ebc5d23e2e5d88256d146d5f439.png "조건 범위가 겹치면 더 높은 기준을 먼저 검사해야 뒤 갈래가 가려지지 않습니다")

`amount >= 100_000`은 `1000000`원도 참으로 받아들입니다. 이 넓은 조건을 먼저 두면 Python은 `확인필요`를 반환하고 함수를 끝냅니다. 뒤의 `amount >= 1_000_000`은 실행 기회를 얻지 못합니다.

뒤 조건이 논리상 존재하지만 앞 조건 때문에 절대 실행되지 않는 상태를 가려졌다고 말할 수 있습니다. 코드가 문법 오류를 내지 않기 때문에 더 위험합니다. 평범한 금액은 맞아 보여도 높은 금액만 잘못 분류됩니다.

#### 실패 예시: 낮은 기준을 먼저 검사해 높은 금액 놓치기

입력은 `1200000`원입니다. 첫 조건도 참이고 둘째 조건도 참이지만 `if`와 `elif`는 첫 참에서 멈춥니다. 따라서 잘못된 함수는 `승인필요`가 아니라 `확인필요`를 반환합니다.

```python
def wrong_route(amount):
    if amount >= 100_000:
        return "확인필요"
    elif amount >= 1_000_000:
        return "승인필요"
    else:
        return "정상"


print(wrong_route(1_200_000))
```

#### 예상 결과: 가려진 높은 기준의 잘못된 분류 확인하기

아래 출력은 프로그램이 실행됐다는 뜻이지 업무 규칙이 맞다는 뜻은 아닙니다. 기대 결과는 `승인필요`인데 실제 결과가 `확인필요`이므로 실패입니다. 실행 성공과 결과 정확성을 구분해야 합니다.

```text
확인필요
```

#### 예시 코드: 높은 기준부터 검사해 가림 없애기

수정한 함수는 더 좁은 `>= 1000000` 조건을 먼저 둡니다. 입력 `1200000`은 첫 줄에서 승인필요가 되고, `500000`은 첫 줄을 지나 둘째 줄에서 확인필요가 됩니다. 두 출력이 다르면 순서 수정이 효과를 낸 것입니다.

```python
def correct_route(amount):
    if amount >= 1_000_000:
        return "승인필요"
    elif amount >= 100_000:
        return "확인필요"
    else:
        return "정상"


print(correct_route(1_200_000))
print(correct_route(500_000))
```

#### 예상 결과: 높은 금액과 중간 금액이 다른 갈래로 가는지 확인하기

첫 줄은 승인필요이고 둘째 줄은 확인필요입니다. 높은 기준부터 낮은 기준으로 내려오면 앞에서 걸러진 값을 제외한 나머지만 다음 조건이 받습니다. 이 관계가 최종 프로그램의 분기 순서를 결정합니다.

```text
승인필요
확인필요
```

한 조건에 비교를 여러 개 넣을 때도 실행 순서가 있습니다. `and`와 `or`가 어느 쪽부터 확인하는지 모르면 빈 문자열을 숫자로 바꾸다가 조건문에 도착하기 전에 실패할 수 있습니다.

## and와 or는 왼쪽부터 검사합니다

### 앞 조건만으로 답이 정해지면 뒤 조건을 실행하지 않아 오류를 피할 수 있습니다

![두 조건 칸이 왼쪽부터 검사되고 첫 칸의 결과에 따라 둘째 칸을 건너뛰거나 여는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9f/9f7982d7127d775c3b31c2dfe87379e1c2e4a284b7b261474da2c656358e2dd5.png "and와 or는 왼쪽 결과로 답이 정해지면 오른쪽 식을 계산하지 않습니다")

`and`는 양쪽 조건이 모두 참일 때 참입니다. `or`는 한쪽이라도 참이면 참이고, `not`은 참과 거짓을 뒤집습니다. 여러 조건을 섞을 때는 괄호로 묶어 사람이 읽는 순서를 분명히 적는 편이 안전합니다.

Python은 왼쪽 조건부터 확인합니다. `and`의 왼쪽이 거짓이면 전체가 이미 거짓이므로 오른쪽을 계산하지 않습니다. `or`의 왼쪽이 참이면 전체가 이미 참이므로 오른쪽을 계산하지 않습니다.

이 동작을 단락 평가라고 부릅니다. 긴 이름보다 오른쪽 식을 건너뛸 수 있다는 결과가 중요합니다. 빈 문자열인지 먼저 확인하면 `int("")`처럼 실패할 숫자 변환을 실행하지 않을 수 있습니다.

#### 예시 코드: 빈 입력에서 숫자 변환을 건너뛰기

첫 입력은 빈 문자열이고 둘째 입력은 숫자 문자열입니다. `raw_amount != ""`가 거짓이면 뒤의 `int()`를 실행하지 않아 오류가 나지 않습니다. 둘째 입력에서만 두 조건이 모두 참이 되어 확인필요가 출력됩니다.

```python
raw_amount = ""
if raw_amount != "" and int(raw_amount) >= 100_000:
    print("확인필요")
else:
    print("빈 입력")

raw_amount = "120000"
if raw_amount != "" and int(raw_amount) >= 100_000:
    print("확인필요")
```

#### 예상 결과: 빈 입력 오류 없이 두 상태 구분하기

첫 조건문은 `int("")`를 실행하지 않고 `빈 입력`을 출력합니다. 둘째 조건문은 문자열을 정수로 바꾼 뒤 기준과 비교해 `확인필요`를 출력합니다. 단락 평가는 가능하지만 입력 변환을 분리하는 최종 구조가 더 읽기 쉽습니다.

```text
빈 입력
확인필요
```

여기서 `raw_amount != ""`는 빈 문자열만 막습니다. `raw_amount`가 `"오만원"`이면 왼쪽 조건은 참이므로 오른쪽의 `int("오만원")`을 실행하고 `ValueError`가 발생합니다. 단락 평가는 오른쪽 식을 실행할지 정하는 규칙이지, 문자열이 올바른 숫자인지 검사하는 규칙이 아닙니다. 그래서 완성 프로그램에서는 빈 값과 글자 입력을 함께 처리하는 변환 함수를 따로 만듭니다.

`and`와 `or`는 항상 `True`나 `False`를 돌려주는 것이 아니라 답을 정한 원래 값을 돌려줍니다. 예를 들어 `department or "미지정"`은 부서 문자열이 비었을 때 `미지정`을 돌려줍니다. 조건식 밖에서 이 성질을 쓰면 편리하지만 처음에는 명시적인 `if`가 더 읽기 쉽습니다.

단락 평가가 빈 값을 피하게 해도 빈 값, 숫자 0, `None`이 같은 뜻은 아닙니다. 다음 절에서는 Python이 조건 안에서 값을 자동으로 참과 거짓으로 읽는 규칙을 분리합니다.

## 값의 존재와 유효성은 다릅니다

### 0과 빈 문자열 및 None을 한꺼번에 거짓으로 보면 정상값과 누락을 구분하지 못합니다

![0과 빈 문자열 및 None이 모두 거짓 칸으로 모이지만 서로 다른 입력 상태표를 가진 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4b/4be7d4dc0a54f646705020e2110700c496e1409ae56d292598005411e7af6701.png "Python은 여러 값을 거짓으로 읽지만 업무에서는 0원과 빈 입력 및 누락을 따로 처리해야 합니다")

Python은 조건에 비교식 대신 값을 직접 넣을 수 있습니다. 숫자 `0`, 빈 문자열 `""`, 빈 리스트 `[]`, `None`, `False`는 조건 안에서 거짓으로 읽힙니다. 그 밖의 많은 값은 참으로 읽힙니다.

값을 조건에서 참이나 거짓으로 읽는 성질을 진릿값이라고 부릅니다. 진릿값은 값이 업무 규칙에 맞는지 자동으로 검증하지 않습니다. `0`원은 유효한 금액인데 `if amount:`에서는 거짓입니다.

`None`은 값이 없다는 사실을 나타내는 특별한 객체입니다. `amount is None`은 `amount`가 바로 그 특별한 객체인지 확인합니다. 숫자 0과 빈 문자열을 누락과 구분하려면 비교 대상을 명시해야 합니다.

#### 실패 예시: if amount로 0원과 누락을 같은 처리하기

입력은 유효한 `0`원입니다. 하지만 `if amount:`는 숫자 0을 거짓으로 읽어 `금액 없음`을 출력합니다. 이 결과는 Python 진릿값 규칙에는 맞지만 0원을 허용하는 업무 규칙에는 맞지 않습니다.

```python
amount = 0

if amount:
    print("금액 있음")
else:
    print("금액 없음")
```

#### 예상 결과: 유효한 0원이 누락처럼 보이는 실패 확인하기

아래 출력은 `if amount`가 입력 검증을 대신할 수 없다는 증거입니다. 0원을 허용하려면 문자열을 숫자로 바꾼 뒤 `amount < 0`처럼 허용 범위를 직접 비교해야 합니다. 입력이 0이라는 사실과 출력이 금액 없음이라는 사실을 나란히 보면 Python의 거짓 판정과 업무 규칙이 서로 다르다는 문제를 정확히 확인할 수 있습니다.

```text
금액 없음
```

#### 예시 코드: None과 0원을 명시적으로 구분하기

첫 값은 `None`이고 둘째 값은 정수 0입니다. `is None`을 사용하면 누락만 첫 갈래로 보내고 0원은 정상 입력으로 남길 수 있습니다. 출력이 서로 다르면 두 상태를 분리한 것입니다.

```python
missing_amount = None
zero_amount = 0

print(missing_amount is None)
print(zero_amount is None)
```

#### 예상 결과: 누락만 True가 되는지 확인하기

`None is None`에 해당하는 첫 결과만 `True`입니다. 숫자 0은 `None`과 다른 객체이므로 둘째 결과는 `False`입니다. 같은 거짓 진릿값을 가졌어도 값의 의미는 다르다는 사실이 드러납니다.

```text
True
False
```

`bool`은 `True`와 `False`를 담는 자료형이며 Python에서는 `int`의 하위 자료형입니다. 그래서 `isinstance(True, int)`가 `True`입니다. 금액에 불리언을 허용하지 않으려면 정수 검사보다 먼저 `isinstance(amount, bool)`을 확인해야 합니다.

#### 예시 코드: True가 bool이면서 int로도 판정되는지 확인하기

`isinstance(값, 자료형)`은 값이 지정한 자료형에 속하는지 묻습니다. 첫 줄은 `True`가 `bool`인지 묻고, 둘째 줄은 `int`인지 묻습니다. 셋째 줄은 `True`가 숫자 `1`과 같은 값으로 비교되는지도 확인합니다.

```python
print(isinstance(True, bool))
print(isinstance(True, int))
print(True == 1)
```

#### 예상 결과: 불리언을 정수 검사보다 먼저 거부해야 하는 이유 확인하기

세 결과가 모두 `True`입니다. 따라서 `not isinstance(amount, int)`만 사용하면 `True`가 금액 `1`처럼 검사를 통과합니다. 완성 함수가 `isinstance(amount, bool) or not isinstance(amount, int)` 순서로 검사하는 이유가 여기에 있습니다.

```text
True
True
True
```

진릿값만으로는 입력이 올바른 금액인지 알 수 없습니다. 이제 화면이나 CSV에서 들어온 문자열을 정수로 바꾸는 일과, 정수 금액을 업무 등급으로 나누는 일을 다른 함수로 분리하겠습니다.

## 입력 검사와 업무 분류를 나눕니다

### 문자열을 정수로 바꾸는 단계와 금액 등급을 고르는 단계를 따로 실패시킵니다

![원문 문자열이 입력 검사함을 지나 정수 금액이 되고 별도 분류함에서 결과 등급으로 나가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/38/38776876839b545dd887f8f8244d7d24ff1ffda3786dc68c04c8a809c7ca4fec.png "입력 변환이 성공한 정수만 업무 분류로 보내면 오류 원인과 조건 결과가 섞이지 않습니다")

터미널의 `input()`과 CSV 파일에서 읽은 값은 보통 문자열입니다. 문자열 `"100000"`은 숫자처럼 보이지만 정수 `100000`과 자료형이 다릅니다. 먼저 `int()`로 변환해야 숫자 기준과 비교할 수 있습니다.

빈 문자열과 `"오만원"`은 `int()`로 바꿀 수 없습니다. 이때 Python은 `ValueError`라는 예외를 발생시킵니다. 예외는 실행 중 요청한 동작을 끝낼 수 없다는 신호이며, 오류 종류와 설명을 함께 가집니다.

이 글의 규칙에서 음수는 취소가 아니라 잘못된 금액입니다. 취소 여부는 `cancelled=True`라는 별도 값으로 받습니다. 금액의 부호와 거래 상태를 섞지 않으면 환불액이나 정정액 같은 다른 규칙도 나중에 명확히 추가할 수 있습니다.

첫 함수는 문자열이 정수 금액인지에만 답합니다. 둘째 함수는 이미 검사를 통과한 정수와 취소 여부를 받아 결과를 고릅니다. 어느 함수에서 실패했는지 보면 원인을 바로 찾을 수 있습니다.

#### 설명 목록: 입력 검사와 업무 분류의 책임 나누기

| 단계 | 입력 | 성공 결과 | 실패 결과 |
|---|---|---|---|
| `parse_won_amount` | `" 100000 "` | 정수 `100000` | 빈 값, 글자, 음수 오류 |
| `decide_route` | 정수와 취소 여부 | 정상, 확인필요, 승인필요, 취소 | 잘못된 자료형 오류 |

#### 예시 코드: 문자열 금액을 검사해 정수로 바꾸기

입력은 문자열 하나입니다. `strip()`은 앞뒤 공백을 지우고, `int()`는 남은 숫자 글자를 정수로 바꿉니다. 변환할 수 없는 값은 알아보기 쉬운 새 `ValueError`로 바꾸고 음수도 같은 함수에서 거부합니다.

```python
def parse_won_amount(raw_amount):
    if not isinstance(raw_amount, str):
        raise TypeError("raw_amount는 문자열이어야 합니다")

    text = raw_amount.strip()
    if text == "":
        raise ValueError("금액이 비어 있습니다")

    try:
        amount = int(text)
    except ValueError as error:
        raise ValueError("금액은 정수로 입력해야 합니다") from error

    if amount < 0:
        raise ValueError("금액은 0원 이상이어야 합니다")

    return amount
```

`try` 안에는 실패할 수 있는 `int(text)`만 둡니다. `except ValueError`는 그 변환에서 발생한 예상 오류만 잡습니다. 모든 예외를 한꺼번에 잡지 않으므로 코드의 다른 실수는 숨겨지지 않습니다. `from error`는 사용자에게 보여 줄 새 설명 뒤에 원래 변환 오류도 연결해, 개발자가 원인을 추적할 수 있게 합니다.

#### 예시 코드: 검사된 정수만 업무 등급으로 나누기

입력은 이미 정수인 금액과 참 또는 거짓인 취소 여부입니다. 자료형과 음수를 먼저 거부한 뒤 취소와 높은 금액부터 검사합니다. 각 `return`은 결과를 돌려주고 함수를 즉시 끝내므로 한 결과만 나옵니다.

```python
def decide_route(amount, *, cancelled=False):
    if isinstance(amount, bool) or not isinstance(amount, int):
        raise TypeError("amount는 정수여야 합니다")
    if not isinstance(cancelled, bool):
        raise TypeError("cancelled는 bool이어야 합니다")
    if amount < 0:
        raise ValueError("amount는 0 이상이어야 합니다")

    if cancelled:
        return "취소"
    if amount >= 1_000_000:
        return "승인필요"
    if amount >= 100_000:
        return "확인필요"
    return "정상"
```

별표 `*` 뒤의 `cancelled`는 이름을 적어 전달해야 합니다. `decide_route(50000, cancelled=True)`처럼 호출하면 두 번째 값의 뜻이 화면에 드러납니다. `decide_route(50000, True)`는 허용되지 않아 순서 실수를 막습니다.

두 책임을 나눴으므로 이제 파일 세 개로 실행 가능한 프로그램을 만들고 입력부터 출력까지 연결할 수 있습니다.

## 거래 분류 프로그램을 완성합니다

### 금액 변환과 분기 및 오류 문장을 한 프로젝트에서 실행합니다

![다섯 원문 입력이 변환과 분기 및 오류 처리 단계를 지나 다섯 결과 줄로 나오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/02/02eb61c80f1e13e6974813e247d3d16c6b269f11d2017939ce08904ba8987bdd.png "유효한 네 입력은 금액 등급으로 가고 글자 입력 하나는 구체적인 오류 문장으로 분리됩니다")

완성 프로젝트는 `pyproject.toml`, `src/transaction_router.py`, `tests/test_transaction_router.py` 세 파일로 구성됩니다. 이 절에서는 앞의 두 파일을 만들고 프로그램을 실행합니다. 테스트 파일은 다음 절에서 채웁니다.

`uv`는 프로젝트에 필요한 Python과 패키지를 준비하고 명령을 실행하는 도구입니다. PowerShell에서 `uv --version`을 입력해 버전 한 줄이 보이면 사용할 수 있습니다. 명령을 찾지 못하면 [uv 공식 설치 문서](https://docs.astral.sh/uv/getting-started/installation/)를 먼저 엽니다.

#### 실행 명령: 프로젝트 폴더와 빈 파일 세 개 만들기

입력은 새 작업 폴더 이름과 파일 경로입니다. 아래 명령은 `transaction-router` 폴더로 이동한 뒤 `src`와 `tests`를 만들고 빈 파일 세 개를 준비합니다. 같은 이름의 파일이 없는 새 폴더에서 실행해야 기존 파일을 덮지 않습니다.

```powershell
mkdir transaction-router
cd transaction-router
mkdir src, tests
New-Item pyproject.toml, src/transaction_router.py, tests/test_transaction_router.py
```

#### 예시 코드: Python 버전과 pytest 의존성 기록하기

`pyproject.toml`은 프로젝트 이름, 필요한 Python 버전, 개발용 테스트 도구를 기록합니다. 아래 내용을 첫 파일에 저장합니다. `pythonpath`는 테스트가 `src` 안의 모듈을 찾게 하고 `testpaths`는 검사할 폴더를 정합니다.

```toml
[project]
name = "transaction-router"
version = "0.1.0"
requires-python = ">=3.12"

[dependency-groups]
dev = [
    "pytest==8.4.2",
]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
```

`>=3.12`는 Python 3.12 이상을 허용한다는 뜻입니다. `pytest==8.4.2`는 예제를 검증한 테스트 도구 버전을 고정합니다. `uv run`을 처음 실행하면 이 기록을 읽어 별도 실행 공간과 필요한 패키지를 준비합니다.

#### 예시 코드: 입력부터 출력까지 연결한 거래 분류기 만들기

아래 전체 코드를 `src/transaction_router.py`에 저장합니다. 입력 문자열은 먼저 `parse_won_amount`를 지나고, 성공한 정수만 `decide_route`로 갑니다. 예상한 입력 오류는 `format_result`가 한 줄 설명으로 바꿉니다.

```python
NORMAL_LIMIT = 100_000
APPROVAL_LIMIT = 1_000_000


def parse_won_amount(raw_amount: str) -> int:
    if not isinstance(raw_amount, str):
        raise TypeError("raw_amount는 문자열이어야 합니다")

    text = raw_amount.strip()
    if text == "":
        raise ValueError("금액이 비어 있습니다")

    try:
        amount = int(text)
    except ValueError as error:
        raise ValueError("금액은 정수로 입력해야 합니다") from error

    if amount < 0:
        raise ValueError("금액은 0원 이상이어야 합니다")

    return amount


def decide_route(amount: int, *, cancelled: bool = False) -> str:
    if isinstance(amount, bool) or not isinstance(amount, int):
        raise TypeError("amount는 정수여야 합니다")
    if not isinstance(cancelled, bool):
        raise TypeError("cancelled는 bool이어야 합니다")
    if amount < 0:
        raise ValueError("amount는 0 이상이어야 합니다")

    if cancelled:
        return "취소"
    if amount >= APPROVAL_LIMIT:
        return "승인필요"
    if amount >= NORMAL_LIMIT:
        return "확인필요"
    return "정상"


def classify_transaction(raw_amount: str, *, cancelled: bool = False) -> dict[str, int | str]:
    amount = parse_won_amount(raw_amount)
    route = decide_route(amount, cancelled=cancelled)
    return {"amount": amount, "route": route}


def format_result(raw_amount: str, *, cancelled: bool = False) -> str:
    try:
        result = classify_transaction(raw_amount, cancelled=cancelled)
    except (TypeError, ValueError) as error:
        return f"{raw_amount!r}: 입력오류 ({error})"

    return f"{raw_amount!r}: {result['amount']:,}원 -> {result['route']}"


def main() -> None:
    print(format_result("99999"))
    print(format_result("100000"))
    print(format_result("1000000"))
    print(format_result("50000", cancelled=True))
    print(format_result("오만원"))


if __name__ == "__main__":
    main()
```

`NORMAL_LIMIT`와 `APPROVAL_LIMIT`는 여러 줄에서 다시 쓸 기준값에 이름을 붙인 것입니다. 대문자 이름은 실행 중 바꾸지 않을 설정이라는 뜻을 사람에게 알립니다. Python이 변경을 금지하는 것은 아니므로 실제 수정은 테스트로 감시합니다.

`classify_transaction`이 돌려주는 딕셔너리는 `amount`와 `route`라는 이름으로 두 결과를 담습니다. `format_result`의 `:,`는 정수에 천 단위 쉼표를 넣고, `!r`은 입력 문자열의 따옴표까지 보여 줍니다.

함수 이름 옆의 `raw_amount: str`은 이 자리에 문자열을 기대한다는 타입 힌트이고, `-> int`는 정수를 돌려준다는 타입 힌트입니다. `dict[str, int | str]`은 키가 문자열이고 값은 정수 또는 문자열인 딕셔너리라는 뜻입니다.

타입 힌트는 설명과 검사 도구를 돕지만 실행 중 잘못된 값을 자동으로 막지는 않습니다. 그래서 함수 안의 `isinstance()` 검사도 그대로 필요합니다.

`if __name__ == "__main__":`는 이 파일을 직접 실행했을 때만 `main()`을 호출합니다. 테스트가 함수를 가져올 때는 예제 출력이 자동으로 나오지 않습니다. 직접 실행과 다른 파일에서 가져오기를 나누는 조건입니다.

#### 실행 명령: 완성한 거래 분류 프로그램 실행하기

프로젝트 루트에서 아래 명령을 실행합니다. `uv run`은 `pyproject.toml`에 맞는 Python 실행 공간을 준비한 뒤 `src/transaction_router.py`를 실행합니다. 다섯 줄이 순서대로 나오면 입력 변환과 네 분기가 연결된 것입니다.

```powershell
uv run python src/transaction_router.py
```

#### 예상 결과: 네 등급과 입력 오류 한 줄 확인하기

`99999`는 정상이고 정확히 `100000`은 확인필요입니다. `1000000`은 더 높은 승인필요로 가며, 정상 금액도 취소 표시가 있으면 취소가 됩니다. 글자 금액은 프로그램을 멈추지 않고 구체적인 입력오류 문장으로 바뀝니다.

```text
'99999': 99,999원 -> 정상
'100000': 100,000원 -> 확인필요
'1000000': 1,000,000원 -> 승인필요
'50000': 50,000원 -> 취소
'오만원': 입력오류 (금액은 정수로 입력해야 합니다)
```

눈으로 다섯 줄을 확인하는 것은 시작일 뿐입니다. 기준값을 바꿀 때마다 모든 경계와 자료형을 사람이 다시 입력하지 않도록 같은 검사를 자동으로 반복하는 테스트가 필요합니다.

## pytest로 모든 경계를 고정합니다

### 정상 결과뿐 아니라 누락과 자료형 및 기준 바로 옆 값까지 22번 확인합니다

![금액 경계와 입력 오류 및 자료형 사례들이 기대 결과와 실제 결과 쌍으로 정렬된 검사판](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/14/14536d16d767ca84e1e897cd39087037472d9ffa3a09b1ce6effcf3a624f49f8.png "경계와 오류 사례를 입력과 기대 결과의 쌍으로 저장하면 코드 변경 뒤에도 같은 약속을 반복해서 확인합니다")

테스트는 입력과 기대 결과를 코드로 저장한 검사입니다. `pytest`는 이름이 `test_`로 시작하는 함수를 찾아 실행합니다. `assert` 오른쪽과 왼쪽이 다르면 어느 입력에서 기대가 깨졌는지 보여 줍니다.

`@pytest.mark.parametrize`는 한 테스트 함수에 여러 입력 묶음을 넣습니다. 어려운 이름이지만 하는 일은 표의 각 행을 같은 검사에 한 번씩 전달하는 것입니다. 경계값을 빠뜨리지 않고 한곳에서 읽을 수 있습니다.

#### 예시 코드: 경계와 입력 오류를 고정한 테스트 파일 만들기

아래 전체 코드를 `tests/test_transaction_router.py`에 저장합니다. 첫 표는 금액과 취소 여부 및 기대 등급을 묶습니다. 이어지는 테스트는 음수, 불리언, 실수, 잘못된 취소 값, 문자열 변환과 오류 문장을 따로 확인합니다.

```python
import pytest

from transaction_router import (
    classify_transaction,
    decide_route,
    format_result,
    parse_won_amount,
)


@pytest.mark.parametrize(
    ("amount", "cancelled", "expected"),
    [
        (0, False, "정상"),
        (1, False, "정상"),
        (99_999, False, "정상"),
        (100_000, False, "확인필요"),
        (100_001, False, "확인필요"),
        (999_999, False, "확인필요"),
        (1_000_000, False, "승인필요"),
        (1_000_001, False, "승인필요"),
        (50_000, True, "취소"),
    ],
)
def test_decide_route_boundaries(amount, cancelled, expected):
    assert decide_route(amount, cancelled=cancelled) == expected


def test_decide_route_rejects_negative_amount():
    with pytest.raises(ValueError, match="amount는 0 이상"):
        decide_route(-1)


@pytest.mark.parametrize("amount", [True, 100_000.0])
def test_decide_route_rejects_non_integer_amount(amount):
    with pytest.raises(TypeError, match="amount는 정수"):
        decide_route(amount)


def test_decide_route_rejects_non_boolean_cancelled():
    with pytest.raises(TypeError, match="cancelled는 bool"):
        decide_route(50_000, cancelled="아니요")


@pytest.mark.parametrize(
    ("raw_amount", "expected"),
    [
        ("0", 0),
        (" 100000 ", 100_000),
        ("+100000", 100_000),
    ],
)
def test_parse_won_amount_accepts_integer_text(raw_amount, expected):
    assert parse_won_amount(raw_amount) == expected


@pytest.mark.parametrize(
    ("raw_amount", "message"),
    [
        ("", "금액이 비어"),
        ("오만원", "금액은 정수"),
        ("-1", "금액은 0원 이상"),
    ],
)
def test_parse_won_amount_rejects_invalid_text(raw_amount, message):
    with pytest.raises(ValueError, match=message):
        parse_won_amount(raw_amount)


def test_parse_won_amount_rejects_non_string_input():
    with pytest.raises(TypeError, match="raw_amount는 문자열"):
        parse_won_amount(100_000)


def test_classify_transaction_returns_amount_and_route():
    assert classify_transaction(" 100000 ") == {
        "amount": 100_000,
        "route": "확인필요",
    }


def test_format_result_turns_expected_input_error_into_text():
    assert format_result("오만원") == "'오만원': 입력오류 (금액은 정수로 입력해야 합니다)"
```

`pytest.raises`는 괄호 안 코드가 지정한 오류를 내야 통과합니다. 정상 결과만 시험하면 잘못된 입력을 조용히 받아들이는 버그를 놓칩니다. 이 파일은 성공 경로와 실패 경로를 같은 중요도로 고정합니다.

#### 실행 명령: 테스트 22개를 한 번에 실행하기

프로젝트 루트에서 아래 명령을 실행합니다. `-q`는 통과한 테스트의 긴 이름을 줄이고 점과 최종 개수만 보여 줍니다. 마지막 줄에 `22 passed`가 나오면 현재 코드와 기대 결과가 모두 일치합니다.

```powershell
uv run pytest -q
```

#### 예상 결과: 스물두 입력과 오류 조건 통과 확인하기

점 하나가 테스트 한 번의 통과를 뜻합니다. 실행 시간은 컴퓨터마다 달라질 수 있으므로 정확한 초보다 `22 passed`를 확인합니다. 실패가 있으면 `FAILED` 아래에 나온 입력과 기대값 및 실제값부터 읽습니다.

```text
......................                                                   [100%]
22 passed in 0.04s
```

`decide_route`의 `amount >= NORMAL_LIMIT`를 `amount > NORMAL_LIMIT`로 바꾸고 다시 실행하면 정확히 `100000`인 사례가 실패해야 합니다. 이 실패는 테스트가 경계 기호 변경을 실제로 감시한다는 증거입니다.

테스트가 있어도 모든 선택을 `if`로 쓰는 것이 좋은 것은 아닙니다. 마지막으로 값의 모양과 원하는 결과에 따라 더 단순한 표현을 고르고, 기준을 직접 바꿔 테스트가 잡는 범위를 확인하겠습니다.

## 새 조건을 넣기 전에 표현을 고릅니다

### 숫자 구간은 if로 두고 정확한 값 대응과 짧은 두 선택은 더 단순한 표현을 씁니다

![숫자 구간과 정확한 값 대응 및 두 선택이 각각 if와 대응표 및 짧은 선택식으로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3d/3d1c8090039ea843d0329f7de96ec4ce0a8cc2c077797f02f6dfdcc33e771e4b.png "질문의 모양에 맞는 표현을 고르면 조건을 추가할 때 겹침과 가림을 줄일 수 있습니다")

숫자 범위처럼 크고 작음을 비교하면 `if`가 읽기 쉽습니다. 정확한 상태 문자열을 결과 하나에 대응시키면 딕셔너리 조회가 더 단순할 수 있습니다. 짧은 두 값 중 하나만 고르면 조건 표현식을 쓸 수 있습니다.

`match`는 같은 값을 여러 패턴과 비교하거나 값의 내부 모양을 나눌 때 유용합니다. 숫자 연속 구간도 가드를 붙여 표현할 수 있지만, 이 글의 두 기준은 `if`가 범위를 더 직접 보여 줍니다.

아래 표는 문법의 우열이 아니라 질문의 모양을 비교합니다. 범주가 늘어날 때 조건을 계속 붙이기 전에 정확한 값 대응인지, 연속된 숫자 구간인지, 여러 문제를 동시에 모으는지 먼저 확인합니다.

#### 설명 목록: 질문 모양에 맞는 Python 선택지 구분하기

| 하려는 일 | 알맞은 시작 | 이유 |
|---|---|---|
| 금액 구간 나누기 | `if`, `elif`, `else` | 크기 비교와 우선순위가 보임 |
| 상태 코드와 문장 대응 | 딕셔너리 조회 | 정확한 값과 결과가 한 줄씩 대응됨 |
| 두 짧은 값 중 하나 선택 | 조건 표현식 | 실행할 문장이 한 줄일 때 간단함 |
| 여러 문제 모두 수집 | 독립된 여러 `if` | 참인 문제를 모두 남길 수 있음 |
| 값의 모양과 내부 항목 분해 | `match` | 패턴과 추출할 값을 함께 적을 수 있음 |

#### 예시 코드: 정확한 상태값은 대응표에서 찾기

입력은 `"cancelled"`라는 정확한 상태 문자열입니다. 딕셔너리는 키와 결과 문장을 한 쌍으로 저장하고 `get()`은 키가 없을 때 `알 수 없음`을 돌려줍니다. 숫자 범위가 아니라 정확한 값 대응이므로 분기 순서가 필요 없습니다.

```python
status_labels = {
    "normal": "정상",
    "review": "확인필요",
    "cancelled": "취소",
}

print(status_labels.get("cancelled", "알 수 없음"))
print(status_labels.get("missing", "알 수 없음"))
```

#### 예상 결과: 있는 키와 없는 키를 다른 문장으로 확인하기

첫 입력은 대응표에 있어 `취소`가 나옵니다. 둘째 입력은 키가 없으므로 기본값 `알 수 없음`이 나옵니다. 연속 숫자에는 이 표를 쓰지 않고 정확한 상태 코드처럼 개수가 정해진 값에만 사용합니다.

```text
취소
알 수 없음
```

먼저 원본 세 파일을 저장하고 `uv run pytest -q`에서 `22 passed`를 확인합니다. 그다음 `NORMAL_LIMIT = 200_000`으로 바꾸고 테스트를 다시 실행합니다. 기존 기대값과 새 규칙이 달라져 실패해야 정상입니다.

#### 확인 목록: 기준을 바꾸고 실패와 복구를 직접 확인하기

- `100000`과 `100001`의 기대 결과를 `정상`으로 바꿉니다
- `tests/test_transaction_router.py`의 `test_decide_route_boundaries` 입력 목록에 `199999`, `200000`, `200001`을 추가합니다
- 세 기대 결과를 각각 `정상`, `확인필요`, `확인필요`로 적습니다
- `test_classify_transaction_returns_amount_and_route`의 `route` 기대값도 `정상`으로 바꿉니다
- `uv run pytest -q`를 다시 실행해 `25 passed`를 확인합니다
- 실험이 끝나면 기준과 테스트를 원래 값으로 함께 되돌립니다

#### 입력 예시: 새 경계값 세 행을 테스트 표에 넣기

추가할 세 행은 아래와 같습니다. `False`는 취소하지 않은 거래라는 뜻이고, 마지막 문자열이 사람이 먼저 정한 기대 결과입니다. 이 세 행을 기존 경계 사례와 같은 대괄호 안에 넣으면 하나의 테스트 함수가 각 행을 차례로 실행합니다. 앞의 두 기존 기대값과 통합 검사 기대값까지 바꾼 뒤 전체 개수를 확인합니다.

```python
(199_999, False, "정상"),
(200_000, False, "확인필요"),
(200_001, False, "확인필요"),
```

기준 상수만 바꾸고 테스트 기대값을 자동으로 맞추면 테스트가 업무 규칙을 독립적으로 증명하지 못합니다. 먼저 사람이 새 구간을 정하고 기대 결과를 적은 뒤 코드를 맞춰야 합니다.

#### 참고 자료: Python 공식 문서에서 조건 동작 확인하기

- [Python if문 튜토리얼](https://docs.python.org/3.14/tutorial/controlflow.html#if-statements)
- [Python if문 실행 규칙](https://docs.python.org/3.14/reference/compound_stmts.html#the-if-statement)
- [Python 진릿값과 불리언 연산](https://docs.python.org/3.14/library/stdtypes.html#truth-value-testing)
- [Python 비교 연산](https://docs.python.org/3.14/library/stdtypes.html#comparisons)
- [Python int 함수](https://docs.python.org/3.14/library/functions.html#int)
- [Python 예외 처리](https://docs.python.org/3.14/tutorial/errors.html#handling-exceptions)
- [pytest 매개변수화 공식 문서](https://docs.pytest.org/en/stable/how-to/parametrize.html)

이제 `if`를 외워야 할 기호가 아니라 입력을 겹치지 않는 결과로 나누는 규칙으로 읽을 수 있습니다. 새 조건을 추가할 때는 입력 규칙, 구간, 순서, 경계 세 값, 실패 테스트를 함께 바꾸면 됩니다.
