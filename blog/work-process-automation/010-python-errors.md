---
title: Python 오류 메시지 읽는 법: 세 오류 원인과 해결 순서
slug: python-errors
author: eddmpython
section: Python 기초와 실행
summary: Python 오류 메시지 읽는 법을 문법 오류와 예외의 차이부터 설명합니다. 하나의 파일에서 FileNotFoundError, NameError, TypeError를 차례로 재현하고 Traceback과 종료 코드 및 기대값으로 해결을 검증합니다.
readerQuestion: Python 오류 메시지에서 실패한 줄과 원인을 어떻게 찾고, 수정한 결과가 정말 맞는지 어떻게 확인할까?
readerTakeaway: Traceback의 마지막 줄에서 예외 종류를 읽고 가장 아래의 내 코드 위치를 찾은 뒤 이름과 값의 자료형 및 파일 경로를 확인하며 같은 명령과 기대값으로 수정을 검증한다.
readerLevel: beginner
readerStartingPoint: Python 파일을 실행하고 Traceback을 본 적은 있지만 긴 출력에서 어디부터 읽고 무엇을 고쳐야 하는지는 모른다.
primaryKeyword: Python 오류 메시지 읽는 법
searchIntent: troubleshooting
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e1/e1d55f556afa25f776007872caa38940de34d08182fbbc662ae22250653437e7.png
ogImageAlt: Python 소스가 문법 검사와 실행 단계를 지나며 첫 번째 처리되지 않은 오류에서 멈추는 흐름
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 오류 메시지 읽는 법을 모르면 긴 Traceback 전체가 한 덩어리처럼 보입니다. 그러면 오류가 난 한 줄만 고치면 될 일을 파일 전체를 다시 쓰거나 Python을 재설치하는 문제로 키우기 쉽습니다.

오류 메시지는 실패 보고서입니다. Python이 어느 파일의 몇 번째 줄까지 갔는지, 어떤 종류의 실패가 났는지, 당시 어떤 값이나 이름이 문제였는지를 남깁니다. 읽는 순서를 알면 긴 출력도 확인할 자리가 몇 곳으로 줄어듭니다.

이 글에서는 문법 오류와 실행 중 예외의 차이를 먼저 잡습니다. 이어서 하나의 `practice.py`에서 `FileNotFoundError`, `NameError`, `TypeError`를 차례로 만나고, 매번 한 원인만 고칩니다. 마지막에 `합계: 150,000원`과 종료 코드 `0`을 확인하면 입력부터 결과 검증까지 끝납니다.

## 오류는 멈춘 이유를 알려 줍니다

### SyntaxError는 실행 전에, 예외는 실행 중에 멈춘 위치와 이유를 보여 줍니다

![Python 소스가 문법 검사와 실행 단계를 지나며 첫 번째 처리되지 않은 오류에서 멈추는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e1/e1d55f556afa25f776007872caa38940de34d08182fbbc662ae22250653437e7.png "문법이 맞지 않으면 실행 전에 멈추고 실행 중 예외가 처리되지 않으면 그 자리 뒤의 코드는 실행되지 않습니다")

Python 파일을 실행하면 먼저 코드를 Python 문법으로 읽을 수 있는지 확인합니다. 콜론이나 괄호처럼 문장을 구성하는 기호가 잘못되면 `SyntaxError`가 나고 프로그램 본문은 시작하지 못합니다. 문법이 맞아야 첫 줄부터 실제 명령을 실행합니다.

문법은 맞지만 실행 중 이름을 찾지 못하거나, 맞지 않는 자료형을 계산하거나, 없는 파일을 열면 예외가 발생합니다. 예외를 처리하는 코드가 없다면 현재 작업은 그 자리에서 끝납니다. 같은 블록에서 오류 줄 뒤에 있던 출력이나 저장 명령도 실행되지 않습니다.

따라서 오류를 본 첫 질문은 `문법을 읽는 단계에서 멈췄는가, 실행하다 멈췄는가`입니다. 그 다음에야 실패 위치와 오류 종류를 읽습니다. 터미널 색상은 설정마다 다르므로 빨간 글자를 찾는 방법에 의존하지 않고 `SyntaxError`, `NameError` 같은 예외 이름을 기준으로 봅니다.

#### 실패 예시: 콜론이 빠져 실행 전에 멈추는 Python 코드

입력은 정수 `120000`과 조건문입니다. Python은 `if` 문장의 끝에서 콜론을 기대하지만 줄바꿈을 먼저 만납니다. 본문을 실행하기 전 문법 검사에서 멈추므로 아래쪽 `print`는 한 번도 호출되지 않으며, 출력은 정상 금액이 아니라 `SyntaxError`와 발견 위치가 됩니다.

```python
amount = 120000
if amount > 0
    print(amount)
```

#### 예상 결과: 문법을 계속 읽지 못한 위치와 SyntaxError

화살표는 Python이 문법 문제를 발견한 위치를 가리킵니다. 원인이 언제나 화살표 바로 아래에 있다는 뜻은 아닙니다. 닫는 따옴표나 괄호를 앞줄에서 빠뜨리면 Python은 다음 줄에 도착한 뒤에야 문장이 끝나지 않았음을 알아차릴 수 있으므로, 표시된 줄과 바로 위 줄을 함께 확인합니다.

```text
  File "practice.py", line 2
    if amount > 0
                 ^
SyntaxError: expected ':'
```

실행 중 예외는 조금 다릅니다. Python이 파일을 읽는 데는 성공했고 실제 작업을 진행하다 특정 연산에서 멈춘 것입니다. 처리하지 않은 예외는 호출한 함수 쪽으로 전달되며 끝까지 처리되지 않으면 Traceback을 보여 주고 프로세스를 실패 상태로 끝냅니다.

#### 설명 목록: 문법 오류와 실행 중 예외 구분하기

| 구분 | 멈추는 시점 | 먼저 확인할 것 | 오류 뒤 코드 |
|---|---|---|---|
| `SyntaxError` | 파일을 실행하기 전 문법을 읽을 때 | 화살표 줄과 바로 위의 괄호, 따옴표, 콜론 | 시작하지 못함 |
| 실행 중 예외 | 올바른 문법의 코드를 실행할 때 | 마지막 예외 줄과 가장 아래의 내 코드 위치 | 처리되지 않으면 실행되지 않음 |

이 구분은 오류를 없애는 순서도 정합니다. 문법 오류가 있으면 먼저 문법을 고쳐야 그 뒤에 숨어 있던 실행 중 예외를 볼 수 있습니다. 프로그램은 보통 처음 만난 처리되지 않은 오류에서 멈추므로 한 번의 실행이 모든 문제를 한꺼번에 보여 주지는 않습니다.

#### 참고 자료: Python 문법 오류와 예외의 기본 구분

- [Python 공식 튜토리얼의 오류와 예외](https://docs.python.org/3/tutorial/errors.html)
- [Python 실행 모델의 예외 처리 설명](https://docs.python.org/3/reference/executionmodel.html#exceptions)

## Traceback은 마지막 줄부터 읽습니다

### 오류 종류와 설명을 먼저 읽고 가장 아래의 내 코드 프레임에서 실패한 줄을 찾습니다

![Traceback의 맨 아래 예외 줄에서 가장 가까운 프로젝트 코드 줄과 위쪽 호출 순서로 읽어 가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a4/a46eb8a66f9e4b812c3965dba68c30d4b87f3f7a5660201420071f503fdbb800.png "마지막 줄은 무엇이 실패했는지 말하고 바로 위의 가장 아래 내 코드 프레임은 어디서 실패했는지 보여 줍니다")

Traceback은 현재 줄에 도착하기까지 거친 함수 호출을 아래 방향으로 쌓은 기록입니다. 맨 위부터 읽으면 아직 원인을 모른 채 파일명과 줄 번호를 많이 만나게 됩니다. 먼저 마지막 줄의 예외 종류와 설명을 읽으면 무엇을 찾아야 하는지 범위가 줄어듭니다.

마지막 줄이 `TypeError: unsupported operand type(s)`라면 파일 설치가 아니라 연산에 들어간 값의 종류를 봐야 합니다. 마지막 줄이 `FileNotFoundError`라면 변수 철자보다 먼저 프로그램이 계산한 파일 경로를 봐야 합니다. 예외 이름은 진단의 분류이고 콜론 뒤 문장은 당시 실패를 설명하는 단서입니다.

그 다음에는 마지막 줄 바로 위에서 시작해 `File`이 적힌 항목을 찾습니다. 여러 항목이 있다면 가장 아래에 있는 내 프로젝트 파일부터 봅니다. 보통 그곳이 실제로 실패한 연산과 가장 가깝습니다. 라이브러리 내부 줄만 고치기보다 내 코드가 어떤 잘못된 값을 라이브러리에 넘겼는지 먼저 확인합니다.

#### 예시 코드: 세 함수 호출 안쪽에서 자료형 오류 만들기

입력은 문자열 금액과 정수 수수료입니다. `main`이 `build_invoice`를 부르고 그 함수가 다시 `add_fee`를 부릅니다. 핵심 연산은 가장 안쪽의 덧셈이며, 문자열과 정수를 더할 수 없어 결과를 반환하지 못합니다. Traceback은 이 호출 경로를 남기고 정상 합계 대신 `TypeError`를 출력합니다.

```python
def add_fee(amount, fee):
    return amount + fee


def build_invoice():
    return add_fee("120000", 30000)


def main():
    print(build_invoice())


main()
```

#### 예상 결과: 마지막 예외 줄과 아래쪽부터 가까워지는 호출 기록

줄 번호는 빈 줄과 Python 버전에 따라 달라질 수 있지만 호출 순서는 같습니다. 먼저 마지막 줄에서 `TypeError`와 두 자료형을 읽습니다. 그 위의 `return amount + fee`가 실패한 연산이고, 더 위의 두 프레임은 그 연산을 누가 호출했는지 설명합니다.

```text
Traceback (most recent call last):
  File "practice.py", line 13, in <module>
    main()
  File "practice.py", line 10, in main
    print(build_invoice())
  File "practice.py", line 6, in build_invoice
    return add_fee("120000", 30000)
  File "practice.py", line 2, in add_fee
    return amount + fee
TypeError: can only concatenate str (not "int") to str
```

Traceback을 읽는 고정 순서는 `예외 종류`, `상세 설명`, `가장 아래 내 코드 프레임`, `필요하면 호출한 프레임`입니다. 프레임은 파일, 줄 번호, 함수 이름, 해당 코드 줄을 묶어 보여 줍니다. 가장 아래 프레임을 고쳤는데 잘못된 값이 위 함수에서 들어왔다면 한 칸씩 위로 올라가 값이 처음 만들어진 곳을 찾습니다.

예외를 처리하다 새 예외가 생기면 Traceback 묶음이 둘 이상 이어질 수도 있습니다. 이때도 화면 맨 아래의 최종 예외부터 읽고, `direct cause`나 `during handling`으로 연결된 앞 묶음은 최종 실패의 원인이 필요할 때 확인합니다.

Python 버전은 이름 오타 후보처럼 친절한 힌트를 추가하거나 오류 문장을 바꿀 수 있습니다. 오류 문장 전체를 복사해 프로그램 판단 조건으로 쓰지 않습니다. 예외 종류와 실패한 코드, 실제 입력값, 프로그램 결과를 기준으로 진단해야 버전이 바뀌어도 흔들리지 않습니다.

#### 확인 목록: 긴 Traceback에서 읽을 네 자리

| 순서 | 보는 자리 | 답해야 할 질문 |
|---|---|---|
| 1 | 맨 아래 예외 이름 | 이름, 자료형, 경로 중 어떤 종류의 실패인가 |
| 2 | 콜론 뒤 설명 | 어떤 이름이나 값 또는 경로가 문제였는가 |
| 3 | 가장 아래 내 파일 프레임 | 실제로 실패한 연산은 어느 줄인가 |
| 4 | 그 위의 호출 프레임 | 잘못된 입력은 어디서 만들어져 전달됐는가 |

#### 참고 자료: Traceback과 내장 예외의 의미

- [Python 공식 튜토리얼의 예외 설명](https://docs.python.org/3/tutorial/errors.html#exceptions)
- [Python 내장 예외 전체 목록](https://docs.python.org/3/library/exceptions.html)

## NameError는 이름의 생성을 봅니다

### 찾지 못한 이름이 실제로 만들어졌는지와 철자 및 실행 순서를 차례로 확인합니다

![변수 이름을 저장한 공간에서 일치하지 않는 사용 이름이 조회에 실패하고 같은 이름으로 고친 뒤 값을 찾는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4e/4e456aa812a19f4368e6b124aedf7d06d8ddcf164186ab2b8f51c4c69b9fce8a.png "NameError는 값의 크기보다 현재 위치에서 그 이름을 찾을 수 있는지를 먼저 확인해야 합니다")

`NameError`는 Python이 현재 위치에서 사용하려는 이름을 찾지 못했다는 뜻입니다. 변수에 들어갈 값이 틀렸다는 뜻은 아닙니다. `amount_text`라는 이름을 만들고 `amunt_text`를 사용하면 두 이름은 서로 다른 대상이며, Python은 비슷한 철자를 같은 이름으로 추측해 실행하지 않습니다.

가장 흔한 원인은 오타지만 생성 순서도 중요합니다. Python은 위에서 아래로 실행하므로 아직 실행하지 않은 대입문이 아래에 있어도 현재 줄에서는 그 이름이 없습니다. `if` 안에서만 이름을 만들었다면 조건이 거짓인 실행에서는 대입문이 지나가지 않아 이름이 생기지 않습니다.

함수와 모듈도 이름입니다. `import pathlib as pl`로 가져왔다면 `pathlib`이 아니라 `pl`을 사용해야 합니다. 함수 안에서 아직 대입하지 않은 지역 이름을 먼저 읽으면 `NameError`의 하위 종류인 `UnboundLocalError`가 날 수 있습니다. 두 경우 모두 먼저 `이 이름이 이 시점과 범위에 실제로 있는가`를 확인합니다.

#### 실패 예시: 만든 이름과 사용한 이름의 철자가 다른 코드

입력 문자열은 숫자로 바꿀 수 있는 정상 값입니다. 핵심 문제는 `amount_text`를 만든 뒤 변환 줄에서 가운데 글자 하나가 빠진 `amunt_text`를 사용했다는 점입니다. 변환은 시작하지 못하고 정상 합계 대신 찾지 못한 이름을 담은 `NameError`가 출력됩니다.

```python
amount_text = "120000"
fee = 30000

total = int(amunt_text) + fee
print(total)
```

#### 예상 결과: 현재 범위에서 찾지 못한 이름 표시

최신 Python은 비슷한 이름을 후보로 제안할 수 있지만 모든 버전과 상황에서 제안하는 것은 아닙니다. 제안 문구가 없어도 마지막 줄의 예외 이름과 실패한 코드 줄을 비교할 수 있습니다. 이 예제의 수정 범위는 파일 전체가 아니라 `amunt_text` 한 곳입니다.

```text
NameError: name 'amunt_text' is not defined
```

#### 복구 코드: 정의한 이름과 같은 철자로 한 곳만 수정하기

입력과 덧셈 방식은 그대로 두고 실패한 이름만 `amount_text`로 맞춥니다. Python은 문자열을 정수로 변환한 뒤 수수료와 더하며, 출력 `150000`이 나오면 이름 생성과 사용 위치가 연결됐음을 확인할 수 있습니다.

```python
amount_text = "120000"
fee = 30000

total = int(amount_text) + fee
print(total)
```

이름 문제를 찾을 때 새 변수부터 만들면 원래 값과 새 값 중 무엇을 사용해야 하는지 더 헷갈립니다. 먼저 실패한 이름을 그대로 검색하고, 정의 줄의 철자와 대소문자, 밑줄을 비교합니다. 그 정의 줄이 오류 줄보다 먼저 실행되는지도 확인합니다.

#### 확인 목록: NameError를 좁히는 네 질문

- 실패한 이름과 정의한 이름의 철자, 대소문자, 밑줄이 완전히 같은가
- 이름을 만드는 대입문이나 `def` 또는 `import`가 오류 줄보다 먼저 실행됐는가
- 이름을 만든 조건문이나 반복문이 이번 입력에서도 실제로 실행됐는가
- 함수 안과 밖 또는 다른 모듈처럼 이름을 찾는 범위가 달라지지 않았는가

## TypeError는 값과 연산을 함께 봅니다

### 연산 양쪽 값의 type과 repr을 출력하면 어떤 자료형이 맞지 않는지 알 수 있습니다

![따옴표로 둘러싸인 문자열 값과 숫자 값이 덧셈에서 맞지 않고 변환 뒤 두 숫자가 합쳐지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/98/984dc477e3461aa36334eed4e18cecba7f667159474d50d6610baf34b1878e22.png "TypeError는 값 하나만 보는 대신 연산에 참여한 값들의 실제 자료형을 나란히 확인해야 합니다")

`TypeError`는 어떤 연산이나 함수에 맞지 않는 자료형을 넣었을 때 발생합니다. 화면에서 `120000`으로 보여도 파일에서 읽은 값은 보통 문자열입니다. `print`는 따옴표를 숨겨 출력하므로 눈으로 본 모양만으로 정수인지 문자열인지 확정할 수 없습니다.

`type(value).__name__`은 값의 자료형 이름을 보여 줍니다. `repr(value)`는 문자열의 따옴표와 숨은 공백 같은 표현을 드러냅니다. 오류 줄의 한쪽 값만 확인하지 말고 연산에 참여한 모든 값을 나란히 출력해야 어떤 조합이 맞지 않는지 알 수 있습니다.

#### 실패 예시: 문자열 금액과 정수 수수료의 자료형 확인하기

입력은 파일에서 읽었다고 가정한 문자열 금액과 정수 수수료입니다. 첫 두 출력은 값의 표현과 자료형을 보여 주므로 금액에 따옴표가 있고 두 종류가 다르다는 사실을 확인할 수 있습니다. 마지막 덧셈은 문자열과 정수를 직접 합치려다 정상 합계 대신 `TypeError`에서 멈춥니다.

```python
amount = "120000"
fee = 30000

print("amount:", repr(amount), type(amount).__name__)
print("fee:", repr(fee), type(fee).__name__)

total = amount + fee
print(total)
```

#### 예상 결과: 두 값의 표현과 자료형 뒤에 이어지는 TypeError

앞의 두 줄은 진단용 출력이고 마지막 줄은 실패 결과입니다. Python 버전에 따라 영어 문구는 조금 달라질 수 있지만 `TypeError`, `str`, `int`라는 핵심 정보는 같은 원인을 가리킵니다. `total`이 만들어지지 않았으므로 그 다음 `print(total)`도 실행되지 않습니다.

```text
amount: '120000' str
fee: 30000 int
TypeError: can only concatenate str (not "int") to str
```

#### 복구 코드: 계산 전에 입력 문자열을 정수로 변환하기

핵심 입력 `amount`는 그대로 두고 계산에 사용할 `amount_number`를 만듭니다. `int`가 숫자로만 된 문자열을 정수로 바꾸면 덧셈 양쪽이 모두 정수가 됩니다. 출력 `150000`은 변환과 계산이 끝까지 완료됐다는 결과입니다.

```python
amount = "120000"
fee = 30000

amount_number = int(amount)
total = amount_number + fee
print(total)
```

`TypeError`와 `ValueError`는 구분해야 합니다. `int`에 리스트처럼 변환 대상 종류 자체가 맞지 않으면 `TypeError`가 날 수 있습니다. 문자열이라는 입력 종류는 허용되지만 내용이 `12만원`처럼 정수 문법에 맞지 않으면 `ValueError`입니다. 자료형을 맞췄다고 내용까지 유효해지는 것은 아닙니다.

#### 설명 목록: 자료형 문제와 값 내용 문제 구분하기

| 코드 상황 | 실패 종류 | 먼저 볼 것 |
|---|---|---|
| `"120000" + 30000` | `TypeError` | 덧셈 양쪽의 자료형 |
| `int("12만원")` | `ValueError` | 문자열 안의 실제 내용 |
| `int(None)` | `TypeError` | 변환 함수가 받지 못하는 입력 종류 |
| `120000 + 30000` | 정상 실행 | 결과가 기대한 `150000`인지 |

#### 참고 자료: TypeError와 ValueError의 공식 정의

- [Python 내장 예외의 TypeError 설명](https://docs.python.org/3/library/exceptions.html#TypeError)
- [Python 내장 예외의 ValueError 설명](https://docs.python.org/3/library/exceptions.html#ValueError)

## FileNotFoundError는 기준 폴더를 봅니다

### 현재 폴더와 스크립트 폴더 및 실제 대상 경로를 나란히 확인하면 누락 위치가 보입니다

![현재 폴더와 Python 스크립트 폴더가 다른 상태에서 입력 파일의 계산 경로와 실제 위치를 비교하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/59/592cf0e492c49e1d5e24247726beecbae6cfcb045df69df1944859690068d2c7.png "상대 경로의 출발점과 실제 파일 위치를 나란히 놓으면 파일명은 맞아도 경로가 어긋난 원인을 볼 수 있습니다")

`FileNotFoundError`는 요청한 파일이나 폴더가 계산된 경로에 없다는 뜻입니다. 파일이 정말 없을 수도 있지만 실행한 현재 폴더가 예상과 달라 상대 경로가 다른 곳을 가리킬 수도 있습니다. 파일 이름만 반복해 확인하지 말고 경로의 출발점부터 봐야 합니다.

`Path.cwd()`는 Python 프로세스의 현재 폴더를 보여 줍니다. 터미널에서 어느 위치에서 `python`을 실행했는지에 따라 달라집니다. `Path(__file__).resolve().parent`는 실행 중인 Python 파일 자체가 놓인 폴더입니다. 프로젝트와 함께 두는 입력은 스크립트 폴더를 기준으로 만들면 호출 위치가 달라도 같은 대상을 찾을 수 있습니다.

#### 예시 코드: 현재 폴더와 스크립트 기준 입력 경로 비교하기

입력은 `practice.py` 옆의 `input` 폴더에 있어야 할 `amount.txt`입니다. 코드는 현재 폴더와 스크립트 폴더를 각각 구하고, 스크립트 기준 대상 경로를 전체 경로로 풀어 존재 여부와 파일 여부를 검사합니다. 출력은 세 경로와 두 불리언 값이며 파일을 열기 전에 어디가 어긋났는지 보여 줍니다.

```python
from pathlib import Path

current_dir = Path.cwd()
script_dir = Path(__file__).resolve().parent
input_path = script_dir / "input" / "amount.txt"

print("현재 폴더:", current_dir)
print("스크립트 폴더:", script_dir)
print("대상 경로:", input_path.resolve())
print("대상 존재:", input_path.exists())
print("일반 파일:", input_path.is_file())
```

#### 예상 결과: 대상 파일을 만들기 전 두 검사가 False인 상태

경로 앞부분은 컴퓨터마다 다릅니다. 중요한 결과는 대상 경로가 `practice.py`가 있는 폴더 아래의 `input\amount.txt`로 끝나는지와 마지막 두 값입니다. 둘 다 `False`면 읽기 코드를 반복 실행하기 전에 `input` 폴더와 파일을 정확한 위치에 만들어야 합니다.

```text
현재 폴더: C:\...\다른-실행-폴더
스크립트 폴더: C:\...\error-practice
대상 경로: C:\...\error-practice\input\amount.txt
대상 존재: False
일반 파일: False
```

대화형 Python 창과 일부 노트북에는 실행 파일을 뜻하는 `__file__`이 없습니다. 그 환경에서는 프로젝트 루트를 직접 정하거나 현재 폴더를 명시적으로 맞춰야 합니다. 이 글의 `__file__` 예제는 저장한 `.py` 파일을 터미널에서 실행하는 경우를 범위로 삼습니다.

경로가 존재하는데 읽기에 실패하면 같은 오류라고 단정하지 않습니다. 폴더를 파일처럼 읽었거나 접근 권한이 없거나 다른 프로그램이 잠근 문제는 다른 예외와 조건을 만들 수 있습니다. `exists()`만으로 모든 파일 문제를 판정하지 말고 `is_file()`과 실제 읽기 동작의 예외를 함께 봅니다.

#### 확인 목록: 파일을 열기 전에 경로에서 확인할 것

- `Path.cwd()`가 예상한 실행 출발점인지 확인합니다.
- `Path(__file__).resolve().parent`가 실제 Python 파일 폴더인지 확인합니다.
- `input_path.resolve()`가 기대한 폴더와 파일명 및 확장자로 끝나는지 확인합니다.
- `exists()`와 `is_file()`이 모두 참인지 확인한 뒤 실제 읽기를 실행합니다.

#### 참고 자료: pathlib 경로 확인 방법

- [Python pathlib의 Path.cwd와 Path.resolve 및 파일 검사](https://docs.python.org/3/library/pathlib.html)
- [Python FileNotFoundError 공식 설명](https://docs.python.org/3/library/exceptions.html#FileNotFoundError)

## 세 오류를 한 파일에서 고칩니다

### 같은 명령을 반복하면 파일 누락과 이름 오타 및 자료형 불일치가 차례로 드러납니다

![하나의 Python 프로그램이 누락 파일과 잘못된 이름 및 자료형 불일치에서 차례로 멈추고 각 수정 뒤 최종 합계에 도착하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/26/26f79e3e25d66e7b58b8eac4d1c1d592fa524726ecf3dee450ffda2069cc92d1.png "프로그램은 첫 번째 처리되지 않은 오류에서 멈추므로 같은 명령을 반복해야 뒤에 있던 다음 문제가 드러납니다")

이제 세 오류를 하나의 작은 프로젝트에서 순서대로 고칩니다. 프로그램은 `input\amount.txt`의 금액을 읽고 수수료 `30000`을 더해 합계를 출력합니다. 시작 코드에는 파일 누락, 변수 이름 오타, 문자열과 정수의 덧셈이라는 문제가 차례로 숨어 있습니다.

한 번 실행할 때마다 가장 먼저 만난 오류 하나만 보입니다. 입력 파일이 없을 때는 그 뒤의 오타까지 도달하지 못합니다. 파일을 만든 뒤에야 `NameError`가 보이고, 이름을 고친 뒤에야 `TypeError`가 보입니다. 이것이 오류 하나를 고친 뒤 같은 명령을 다시 실행해야 하는 이유입니다.

#### 실행 명령: 오류 연습용 폴더와 input 폴더 만들기

입력은 현재 PowerShell 위치이며 `error-practice`와 그 아래 `input` 폴더를 새로 만듭니다. `-Force`는 폴더가 이미 있어도 명령 자체는 계속하지만 기존 파일을 지우지 않습니다. 마지막 명령은 현재 위치를 프로젝트 폴더로 바꾸며, 출력이 없어도 다음 `Get-Location`으로 도착 위치를 확인할 수 있습니다.

```powershell
New-Item -ItemType Directory -Path '.\error-practice\input' -Force | Out-Null
Set-Location -LiteralPath '.\error-practice'
Get-Location
```

기존 `error-practice`에 중요한 파일이 있다면 다른 연습 폴더 이름을 사용합니다. 이제 코드 편집기에서 현재 폴더에 `practice.py`를 만들고 아래 내용을 그대로 저장합니다. 아직 `amount.txt`는 만들지 않습니다.

#### 예시 코드: 세 문제가 순서대로 숨어 있는 시작 파일

입력 경로는 스크립트 폴더 아래의 `input\amount.txt`이고, 파일 내용은 문자열로 읽힙니다. 핵심 처리는 금액을 정수로 바꾸고 수수료와 더하는 일이지만 이름 오타와 자료형 불일치가 남아 있습니다. 첫 실행은 가장 앞선 파일 읽기에서 멈추므로 정상 합계 대신 `FileNotFoundError`가 나와야 합니다.

```python
from pathlib import Path

script_dir = Path(__file__).resolve().parent
input_path = script_dir / "input" / "amount.txt"

amount_text = input_path.read_text(encoding="utf-8").strip()
fee_text = "30000"
total = int(amunt_text) + fee_text
print(f"합계: {total:,}원")
```

#### 실행 명령: 첫 실행에서 없는 입력 파일 확인하기

입력은 방금 저장한 `practice.py`이고 명령은 이 글의 세 번 실행에서 계속 같습니다. Python은 스크립트 기준의 `input\amount.txt`를 읽으려 하지만 파일이 없으므로 첫 번째 실패에서 멈춥니다. `$LASTEXITCODE`는 이 실습 환경에서 `1`이며 프로세스가 정상 완료되지 않았음을 보여 줍니다.

```powershell
python .\practice.py
$LASTEXITCODE
```

```text
FileNotFoundError: [Errno 2] No such file or directory: '...\input\amount.txt'
1
```

파일 경로가 기대한 곳을 가리킨다면 코드는 바꾸지 않고 입력 파일을 만듭니다. PowerShell 5.1의 `Set-Content -Encoding utf8`은 파일 앞에 바이트 순서 표시를 넣을 수 있으므로, 여기서는 설치된 Python으로 UTF-8 텍스트를 정확히 기록합니다.

#### 실행 명령: 숫자 하나가 든 UTF-8 입력 파일 만들기

입력은 문자열 `120000`과 상대 경로 `input/amount.txt`입니다. `Path.write_text`가 숫자 여섯 글자를 UTF-8로 저장하며 출력은 기록한 글자 수 `6`입니다. 그 다음 실행에서 파일 읽기는 통과하고, 더 아래에 있던 `amunt_text` 오타가 드러나 `NameError`와 종료 코드 `1`이 나와야 합니다.

```powershell
python -c "from pathlib import Path; print(Path('input/amount.txt').write_text('120000', encoding='utf-8'))"
python .\practice.py
$LASTEXITCODE
```

```text
6
NameError: name 'amunt_text' is not defined
1
```

이제 `practice.py`의 계산 줄에서 `amunt_text`만 `amount_text`로 고칩니다. 다른 줄을 함께 바꾸지 않아야 다음 실행의 변화가 이름 수정 때문임을 알 수 있습니다. 파일 읽기와 이름 조회는 통과하지만 정수와 문자열을 더하는 자리에서 다음 오류가 나타납니다.

#### 실행 명령: 이름 한 곳을 고친 뒤 같은 명령 다시 실행하기

입력 파일과 실행 명령은 앞 단계와 같습니다. 달라진 것은 계산 줄의 이름 한 곳뿐입니다. Python은 `int(amount_text)`로 정수 금액을 만들지만 `fee_text`는 문자열로 남아 있어, 합계를 출력하지 못하고 `TypeError`와 종료 코드 `1`을 보여 줍니다.

```python
total = int(amount_text) + fee_text
```

```powershell
python .\practice.py
$LASTEXITCODE
```

```text
TypeError: unsupported operand type(s) for +: 'int' and 'str'
1
```

마지막으로 수수료 문자열도 계산 전에 정수로 바꿉니다. 이 수정은 `fee_text`가 숫자 문자만 포함한다는 현재 입력 계약에 맞습니다. 실제 사용자 입력이라면 변환 전에 빈 값과 쉼표 및 통화 기호 처리 규칙을 별도로 정해야 합니다.

#### 복구 코드: 두 입력을 정수로 맞춘 완성 practice.py

입력은 UTF-8 파일의 금액 문자와 코드 안의 수수료 문자입니다. `strip`이 줄바꿈을 제거하고 두 번의 `int` 변환이 계산용 정수를 만듭니다. 핵심 덧셈이 끝나면 천 단위 쉼표를 포함한 합계가 출력되며, 예상 결과는 `합계: 150,000원`입니다.

```python
from pathlib import Path

script_dir = Path(__file__).resolve().parent
input_path = script_dir / "input" / "amount.txt"

amount_text = input_path.read_text(encoding="utf-8").strip()
fee_text = "30000"
total = int(amount_text) + int(fee_text)
print(f"합계: {total:,}원")
```

#### 예상 결과: 정상 합계와 성공 종료 코드

같은 명령을 다시 실행합니다. 첫 줄은 프로그램이 계산한 업무 결과이고 둘째 줄은 Python 프로세스의 종료 코드입니다. 합계가 맞고 종료 코드가 `0`이면 세 오류를 순서대로 고친 결과가 실행 수준에서는 성공한 것입니다.

```powershell
python .\practice.py
$LASTEXITCODE
```

```text
합계: 150,000원
0
```

이 실습의 핵심은 오류 세 개를 외우는 데 있지 않습니다. 같은 입력과 같은 명령을 고정하고 가장 먼저 드러난 원인 하나만 수정했습니다. 그래서 각 재실행의 변화가 무엇 때문인지 설명할 수 있습니다.

## 오류가 사라진 뒤 결과를 검증합니다

### 종료 코드와 기대값을 확인하고 잡을 예외만 좁게 처리해야 실패를 성공으로 숨기지 않습니다

![같은 실행 명령에서 실제 출력과 성공 종료 코드 및 기대값 일치가 함께 확인되고 특정 파일 예외만 좁게 처리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8a/8a0933b116b001f5b1e7e0b9226ef7f6a86cf4ed266820bd7254250ada5f064b.png "Traceback이 보이지 않는 것만으로는 부족하며 결과와 종료 상태 및 예외 처리 범위를 함께 확인해야 합니다")

Traceback이 사라졌다고 프로그램이 올바른 것은 아닙니다. `0` 대신 빈 파일을 읽었거나 수수료를 두 번 더해도 코드가 끝까지 실행될 수 있습니다. 실행 성공과 업무 결과 성공을 나누고 둘을 각각 확인해야 합니다.

종료 코드는 실행 도구가 성공과 실패를 구분하는 값입니다. 일반적으로 Python이 정상 종료하면 `0`, 처리하지 않은 예외로 끝나면 0이 아닌 값을 반환합니다. 앞 실습의 PowerShell에서는 `$LASTEXITCODE`로 바로 확인했습니다. 자동화와 배포 도구도 같은 신호를 사용합니다.

기대값은 현재 입력에서 나와야 할 정답입니다. 이번 입력 `120000`과 수수료 `30000`의 합은 `150000`입니다. 사람이 화면만 보고 넘기지 않도록 코드가 실제 결과와 기대값을 비교하게 만들 수 있습니다.

#### 복구 코드: 기대 합계가 다르면 명시적으로 실패시키기

입력과 계산은 완성 코드와 같고 `expected_total`만 검증 기준으로 추가합니다. 핵심 비교에서 실제 합계가 다르면 `AssertionError`가 발생해 종료 코드도 실패가 됩니다. 두 값이 같을 때만 합계를 출력하므로 정상 출력과 종료 코드 `0`을 함께 결과로 사용할 수 있습니다.

```python
from pathlib import Path

script_dir = Path(__file__).resolve().parent
input_path = script_dir / "input" / "amount.txt"

amount_text = input_path.read_text(encoding="utf-8").strip()
fee_text = "30000"
total = int(amount_text) + int(fee_text)
expected_total = 150000

assert total == expected_total, f"기대 {expected_total}, 실제 {total}"
print(f"합계: {total:,}원")
```

`assert`는 이 작은 학습 실습의 검증에는 알맞지만 Python을 최적화 옵션으로 실행하면 생략될 수 있습니다. 결제나 정산 같은 실제 프로그램의 필수 검증은 조건문으로 검사하고 명시적인 예외를 일으키거나 테스트 코드에 넣어야 합니다. 여기서는 실제값과 기대값을 비교하는 습관을 보여 주는 데 사용합니다.

오류를 읽기 싫어서 모든 예외를 잡아 버리면 실패가 숨습니다. 특히 `except Exception: pass`는 파일 누락뿐 아니라 프로그래밍 실수까지 아무 일 없던 것처럼 만들 수 있습니다. 복구 방법을 알고 있는 예상 예외만 좁게 처리하고, 예상하지 못한 예외는 Traceback과 실패 종료 상태를 남겨야 합니다.

#### 예시 코드: 없는 입력 파일만 설명하고 실패 상태로 끝내기

입력은 앞과 같은 `input_path`입니다. `try` 안에는 실제로 파일이 없을 수 있는 읽기만 두고, `FileNotFoundError`만 잡습니다. 이 경우 사용자가 확인할 경로를 출력한 뒤 종료 코드 `1`로 끝나며, 이름 오타나 자료형 오류 같은 다른 예외는 잡지 않아 원래 Traceback으로 드러납니다.

```python
from pathlib import Path

script_dir = Path(__file__).resolve().parent
input_path = script_dir / "input" / "amount.txt"

try:
    amount_text = input_path.read_text(encoding="utf-8").strip()
except FileNotFoundError:
    print(f"입력 파일을 찾지 못했습니다: {input_path}")
    raise SystemExit(1)

fee_text = "30000"
total = int(amount_text) + int(fee_text)
print(f"합계: {total:,}원")
```

오류를 다른 사람이나 AI에게 전달할 때 마지막 한 줄만 보내면 입력과 실행 위치를 복원하기 어렵습니다. 회사 원본이나 개인정보는 빼고 같은 실패가 나는 작은 합성 입력을 사용합니다. 아래 일곱 항목을 채우면 상대방이 같은 명령으로 재현하고 수정 뒤 같은 기준으로 검증할 수 있습니다.

#### 설명 목록: 다시 실행할 수 있는 오류 기록 일곱 항목

| 기록 항목 | 이번 실습의 예 | 필요한 이유 |
|---|---|---|
| 실행 명령 | `python .\practice.py` | 같은 진입점 사용 |
| Traceback 전체 | 처음부터 마지막 예외 줄까지 | 호출 위치와 최종 원인 보존 |
| 기대 결과 | `합계: 150,000원` | 성공 기준 고정 |
| 실제 결과 | 예외 이름 또는 잘못된 합계 | 기대와 차이 비교 |
| 합성 입력 | `amount.txt`의 `120000` | 민감정보 없이 재현 |
| 직전 변경 | 계산 줄의 이름 한 곳 | 변화 원인 추적 |
| 확인한 사실 | 대상 경로와 두 자료형 | 이미 배제한 원인 공유 |

이 방법은 Python 코드가 시작된 뒤 발생한 예외를 읽는 데 초점을 둡니다. `python` 명령 자체를 찾지 못하는 PATH 문제, 운영체제 권한, 네트워크 장애, 외부 서비스 실패는 각각 다른 진단 정보가 필요합니다. 그래도 `같은 입력과 명령으로 재현하고, 가장 가까운 원인 하나를 고치고, 기대 결과와 종료 상태를 확인한다`는 순서는 그대로 적용됩니다.

지금 완성한 파일을 다시 실행해 `합계: 150,000원`과 `0`을 확인합니다. 그리고 `amount.txt`를 잠시 다른 이름으로 바꿨을 때 `FileNotFoundError` 또는 좁게 작성한 안내와 실패 종료 코드가 나오는지도 확인합니다. 성공과 실패를 둘 다 예상대로 만들 수 있으면 Python 오류 메시지를 읽고 검증하는 한 사이클을 끝낸 것입니다.

#### 참고 자료: 예외를 잡는 범위와 다시 발생시키는 방법

- [Python 공식 튜토리얼의 예외 처리](https://docs.python.org/3/tutorial/errors.html#handling-exceptions)
- [Python 공식 튜토리얼의 예외 발생시키기](https://docs.python.org/3/tutorial/errors.html#raising-exceptions)
