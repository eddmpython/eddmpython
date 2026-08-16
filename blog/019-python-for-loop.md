---
title: Python for문 사용법: 거래 100건을 빠짐없이 처리하려면
slug: python-for-loop
author: eddmpython
section: Python 기초
summary: Python for문 사용법을 거래 목록으로 깊이 익힙니다. 반복자 원리부터 range, enumerate, zip, break와 continue, for else, 원본 변경 위험, 27개 pytest 검증까지 한 글에서 실행합니다.
readerQuestion: Python for문으로 거래가 100건이어도 같은 규칙을 빠짐없이 적용하고 누락과 중복을 어떻게 확인할까?
readerTakeaway: for문은 반복 가능한 값에서 항목을 하나씩 꺼내 같은 블록을 실행하며, 각 입력을 처리 또는 오류 한 건으로 남긴 뒤 건수와 식별자 및 합계를 검사해야 안전하다.
readerLevel: beginner
readerStartingPoint: Python 코드 한 줄은 실행했지만 for문, 반복 가능한 값, 반복자, range, enumerate가 무엇인지 모른다.
primaryKeyword: Python for문 사용법
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8d/8d8c2bf03f4a2e938cd0538f2d6d17818d4c4de1b7fa177cab12f4a8a0e36f95.png
ogImageAlt: 거래 행 다섯 개에서 한 행씩 꺼내 같은 들여쓰기 블록을 실행하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

거래 한 건을 분류하는 코드는 맞는데 100건을 처리하려고 같은 코드를 100번 복사한다면 누락이 생기기
쉽습니다. Python for문 사용법의 핵심은 코드를 많이 실행하는 데 있지 않고 입력을 한 건씩 꺼내 같은
규칙을 정확히 한 번 적용하는 데 있습니다.

이 글에서는 금액 목록을 직접 반복한 뒤 여섯 거래를 처리하는 프로그램까지 만듭니다. 마지막에
`uv run pytest -q`를 실행해 `27 passed`가 나오면 정상 거래, 잘못된 금액, 중복 ID, 빈 입력까지
반복문의 약속대로 처리된 것입니다.

## for문은 값을 하나씩 꺼냅니다

### 목록에 값이 다섯 개라면 들여쓴 코드를 정확히 다섯 번 실행합니다

![거래 행 다섯 개에서 한 행씩 꺼내 같은 들여쓰기 블록을 실행하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8d/8d8c2bf03f4a2e938cd0538f2d6d17818d4c4de1b7fa177cab12f4a8a0e36f95.png "한 행을 꺼내고 같은 블록을 실행하는 동작이 입력 행 수만큼 이어집니다")

리스트는 여러 값을 순서대로 담는 Python 자료형입니다. `for transaction in transactions:`는
`transactions` 리스트에서 거래를 하나 꺼내 `transaction`이라는 이름으로 가리킨 뒤, 아래에
들여쓴 줄을 실행합니다. 리스트에 다섯 건이 있으면 블록도 다섯 번 실행됩니다.

`for`는 반복을 시작한다는 낱말이고 `in` 오른쪽은 꺼낼 값이 들어 있는 대상입니다. `in` 왼쪽은 이번
차례에 꺼낸 값을 가리키는 반복 변수입니다. 줄 끝의 콜론과 다음 줄의 네 칸 들여쓰기가 한 번마다
실행할 블록을 정합니다.

#### 예시 코드: 거래 다섯 건을 같은 기준으로 분류하기

입력은 ID와 금액을 가진 딕셔너리 다섯 개입니다. 반복문은 현재 거래의 금액을 `100000`과 비교하고
한 줄씩 출력합니다. 실행 결과가 입력 순서와 같은 다섯 줄이면 각 거래가 한 번씩 처리된 것입니다.

```python
transactions = [
    {"id": "T001", "amount": 50_000},
    {"id": "T002", "amount": 120_000},
    {"id": "T003", "amount": 80_000},
    {"id": "T004", "amount": 150_000},
    {"id": "T005", "amount": 30_000},
]

for transaction in transactions:
    if transaction["amount"] >= 100_000:
        status = "확인필요"
    else:
        status = "정상"
    print(transaction["id"], status)

print("반복 완료")
```

#### 예상 결과: 입력 순서와 같은 다섯 결과 확인하기

`T001`부터 `T005`까지 한 번씩 나온 뒤 완료 문장이 나옵니다. `print("반복 완료")`는 들여쓰지
않았으므로 각 거래마다 실행되지 않고 반복이 모두 끝난 뒤 한 번만 실행됩니다.

```text
T001 정상
T002 확인필요
T003 정상
T004 확인필요
T005 정상
반복 완료
```

빈 리스트를 넣으면 오류가 나는 것이 아니라 블록이 0번 실행됩니다. 이제 리스트가 어떻게 다음 값을
하나씩 내주는지 알면 문자열과 파일도 같은 `for`문에 넣을 수 있는 이유가 보입니다.

## for문 안에서는 반복자가 움직입니다

### 반복 가능한 값이 반복자를 만들고 반복자는 다음 항목을 하나씩 내줍니다

![반복 가능한 금액 목록이 반복자를 만들고 다음 값을 한 개씩 내주는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/42/42b26a30ea4ca7d1f25b6ed7e7f063379746df47561c4f00e37e9d390a2cabc3.png "for문은 반복자를 통해 다음 값을 받고 값이 끝나면 반복을 멈춥니다")

항목을 하나씩 내줄 수 있는 대상을 반복 가능한 값이라고 합니다. 영어 문서에서는 `iterable`이라고
부릅니다. 리스트, 문자열, 딕셔너리, 파일은 모양이 다르지만 모두 반복 가능한 값이므로 `for` 오른쪽에
둘 수 있습니다.

`for`문은 시작할 때 반복 가능한 값에 `iter()`를 적용해 반복자를 만듭니다. 반복자는 `next()`를
호출할 때마다 다음 항목을 한 개 내주는 객체입니다. 더 줄 항목이 없으면 끝을 알리고, `for`문은 그
신호를 받아 조용히 멈춥니다.

[Python 언어 참조의 for문 설명](https://docs.python.org/3/reference/compound_stmts.html#the-for-statement)에
따르면 `in` 오른쪽 표현식은 한 번 평가되고, 여기서 만든 반복자가 내주는 항목마다 반복 변수가 새 값을
가리킵니다. 다음 코드는 `for`문이 내부에서 하는 일을 `iter()`와 `next()`로 직접 확인합니다.

#### 예시 코드: 반복자에서 다음 금액을 직접 꺼내기

입력 리스트에는 금액 세 개가 있습니다. `iter(amounts)`가 반복자를 만들고 네 번의 `next()` 호출이
세 금액과 끝 표시를 차례로 돌려줍니다. 네 번째 호출의 기본값 `끝`이 보이면 항목을 모두 소비한
상태입니다.

```python
amounts = [50_000, 120_000, 80_000]
amount_iterator = iter(amounts)

print(next(amount_iterator, "끝"))
print(next(amount_iterator, "끝"))
print(next(amount_iterator, "끝"))
print(next(amount_iterator, "끝"))
```

#### 예상 결과: 세 금액 뒤에 반복 종료 확인하기

반복자는 현재 어디까지 읽었는지 기억합니다. 첫 번째 호출이 다시 첫 값을 주지 않고 두 번째 값을
주는 이유가 이 상태 때문입니다. 네 번째 줄의 `끝`은 거래 금액이 아니라 기본값입니다.

```text
50000
120000
80000
끝
```

리스트는 새 `for`문을 시작할 때마다 새 반복자를 만들 수 있지만, 이미 만든 반복자는 한 번 소비하면
비어 있습니다. 파일 줄이나 생성기처럼 한 번만 읽는 입력을 두 번 반복하면 두 번째 결과가 0건이 될
수 있으므로 한 번의 반복 안에서 필요한 결과를 함께 모으는 편이 안전합니다.

#### 실패 예시: 같은 반복자를 두 번 합산하기

첫 `sum()`은 반복자에서 세 금액을 모두 꺼내 `250000`을 만듭니다. 두 번째 `sum()`이 읽을 값은
남아 있지 않으므로 `0`이 나옵니다. 같은 리스트를 두 번 합산한 것과 결과가 다르다는 점이 핵심입니다.

```python
amounts = [50_000, 120_000, 80_000]
amount_iterator = iter(amounts)

print(sum(amount_iterator))
print(sum(amount_iterator))
```

#### 예상 결과: 소비된 반복자가 비어 있음을 확인하기

첫 결과만 전체 합계입니다. 두 번째 결과가 `0`이라고 해서 원래 리스트가 비었다는 뜻은 아니며,
`amount_iterator`가 끝까지 이동했다는 뜻입니다.

```text
250000
0
```

반복자가 한 항목씩 내준다면 다음 질문은 그 한 항목이 반복 변수에 어떤 모양으로 들어오는가입니다.

## 반복 변수는 현재 값만 가리킵니다

### 한 항목에 값이 두 개 있으면 반복 변수 두 개로 나누어 받을 수 있습니다

![거래 ID와 금액으로 묶인 세 쌍이 두 반복 변수로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b2/b2767037cd1de4ac1cf10555c55fdc23b40905c3ef2c2edc939e7096af328a2c.png "각 거래 쌍의 첫 값은 ID 변수로 가고 두 번째 값은 금액 변수로 갑니다")

`for transaction in transactions:`의 `transaction`은 새 보관함이 아니라 이번 항목을 가리키는
이름입니다. 다음 차례가 시작되면 같은 이름이 다음 항목을 가리킵니다. 반복 변수 이름을 `item`으로
쓰든 `transaction`으로 쓰든 동작은 같지만, 값의 뜻이 보이는 이름이 코드를 읽기 쉽습니다.

한 항목이 `(ID, 금액)`처럼 두 값으로 묶여 있으면 왼쪽에도 이름 두 개를 쓸 수 있습니다. Python은
항목을 같은 개수의 변수로 나누어 대입합니다. 이를 언패킹이라고 하며, 쉬운 말로는 묶인 값을
자리별로 풀어 받는 동작입니다.

#### 예시 코드: 거래 쌍을 ID와 금액으로 풀어 받기

입력은 두 값으로 이루어진 튜플 세 개입니다. 반복문 헤더의 `transaction_id, amount`가 각 튜플을
두 변수로 나누고, 본문은 금액에 따라 상태를 출력합니다. 세 줄의 ID와 금액이 원래 순서대로 나오면
언패킹이 맞습니다.

```python
transactions = [
    ("T001", 50_000),
    ("T002", 120_000),
    ("T003", 80_000),
]

for transaction_id, amount in transactions:
    status = "확인필요" if amount >= 100_000 else "정상"
    print(transaction_id, amount, status)
```

#### 예상 결과: 거래 쌍 세 개가 두 값씩 나뉘었는지 확인하기

각 줄에는 ID, 금액, 상태가 한 번씩 나옵니다. 항목이 두 값인데 반복 변수를 세 개 쓰면 Python은
나눌 개수가 맞지 않는다는 `ValueError`를 냅니다.

```text
T001 50000 정상
T002 120000 확인필요
T003 80000 정상
```

현재 항목의 실제 값이 필요할 때는 바로 반복하면 됩니다. 값이 아니라 정해진 숫자들을 만들고 싶을
때만 `range()`가 필요합니다.

## range는 끝값을 포함하지 않습니다

### 시작값부터 끝값 바로 전까지 필요한 정수만 차례로 만듭니다

![정수 칸들이 시작값부터 끝값 직전까지 이어지고 끝값 칸은 열린 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1d/1d9c316ace49d7e1c273969d914f97c99ebf3e0509e7ebee084c8a8f8f6847b9.png "range의 stop 값은 경계만 정하며 반복 결과에는 포함되지 않습니다")

`range()`는 일정한 간격의 정수를 나타내는 반복 가능한 값입니다. `range(5)`는 다섯 번이라는 명령이
아니라 `0, 1, 2, 3, 4`를 내주는 값입니다. 끝으로 적은 `5`는 포함되지 않으므로 결과 개수만 우연히
다섯 개입니다.

인자를 세 개 쓰면 `range(시작, 끝, 간격)`입니다. 간격이 양수일 때는 현재 값이 끝보다 작을 동안
진행하고, 음수일 때는 끝보다 클 동안 진행합니다. 간격을 `0`으로 쓰면 다음 값으로 움직일 수 없어서
`ValueError`가 발생합니다.

[Python range 공식 문서](https://docs.python.org/3/library/stdtypes.html#ranges)는 `range`가 모든
정수를 미리 리스트에 저장하지 않고 시작, 끝, 간격만 저장한다고 설명합니다. 큰 범위를 써도 숫자
목록 전체를 먼저 만드는 것은 아닙니다.

#### 예시 코드: 시작과 끝 및 간격의 네 경계 확인하기

첫 입력은 1부터 5까지, 둘째 입력은 0부터 3씩 증가한 값, 셋째 입력은 3부터 1까지 역순으로 만듭니다.
마지막 `range(3, 3)`은 시작이 이미 끝에 닿아 있으므로 빈 목록이 됩니다.

```python
print(list(range(1, 6)))
print(list(range(0, 10, 3)))
print(list(range(3, 0, -1)))
print(list(range(3, 3)))
```

#### 예상 결과: stop 값이 빠진 네 범위 확인하기

첫 줄의 끝은 `6`이 아니라 `5`이고, 둘째 줄에도 `10`은 없습니다. 역순에서도 끝으로 적은 `0`은
포함되지 않습니다. 빈 네 번째 결과는 반복문 본문이 0번 실행될 입력입니다.

```text
[1, 2, 3, 4, 5]
[0, 3, 6, 9]
[3, 2, 1]
[]
```

목록의 실제 값이 필요하다면 `for value in values:`가 기본입니다. 순번까지 함께 필요할 때
`range(len(values))`로 위치를 되짚기보다 `enumerate()`가 뜻을 더 직접 보여 줍니다.

## enumerate는 순번과 값을 함께 줍니다

### 사람이 읽을 처리 번호와 실제 거래를 한 반복문에서 함께 받습니다

![거래 세 행마다 순번 표식과 실제 행이 한 쌍으로 붙는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/98/98fbed30c3dc42216592e3d2c85f41ee881cc0157a4df34bb132b52bdf28cdfe.png "enumerate는 원본 값을 바꾸지 않고 순번을 옆에 붙여 내줍니다")

`enumerate()`는 반복 가능한 값에서 항목을 꺼내면서 현재 순번도 함께 내줍니다. 기본 순번은 0부터
시작하지만 `start=1`을 주면 사람이 보는 첫 행을 1로 표시할 수 있습니다. 결과의 한 항목은
`(순번, 원래 값)` 두 값으로 묶여 있습니다.

`range(len(transactions))`도 위치 숫자를 만들 수 있지만, 본문에서 다시
`transactions[index]`를 찾아야 합니다. `enumerate(transactions, start=1)`는 순번과 거래를
한 번에 주므로 무엇을 반복하는지 헤더에서 바로 읽힙니다.

#### 예시 코드: 오류 로그에 행 번호와 거래 ID 남기기

입력 세 건 가운데 둘째 거래의 ID가 빈 문자열입니다. `enumerate()`가 1부터 행 번호를 붙이고,
반복문은 빈 ID를 발견하면 오류 문장을 출력합니다. 결과의 `2행`이 실제 두 번째 입력과 맞아야 합니다.

```python
transactions = [
    {"id": "T001", "amount": 50_000},
    {"id": "", "amount": 120_000},
    {"id": "T003", "amount": 80_000},
]

for row_number, transaction in enumerate(transactions, start=1):
    if transaction["id"] == "":
        print(row_number, "행: ID 누락")
    else:
        print(row_number, "행:", transaction["id"], "처리")
```

#### 예상 결과: 순번이 실제 입력 행과 맞는지 확인하기

순번은 출력용 정보이고 거래 딕셔너리 안에 새 키로 저장되지 않습니다. 첫 행과 셋째 행은 처리되고
둘째 행만 ID 누락으로 표시됩니다.

```text
1 행: T001 처리
2 행: ID 누락
3 행: T003 처리
```

리스트에서는 한 항목을 그대로 받았습니다. 딕셔너리를 직접 반복할 때는 키, 값, 두 값 모두 가운데
무엇을 받을지 메서드로 분명히 골라야 합니다.

## 딕셔너리는 키와 값을 골라 꺼냅니다

### 기본 반복은 키를 주고 items는 키와 값을 한 쌍으로 줍니다

![부서별 금액 딕셔너리에서 키만, 값만, 키와 값 쌍이 각각 나오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2b/2b8eeca609020fbeefa8d8ae7011457896829ad084140e4f1c3da19749b2ca71.png "같은 딕셔너리도 keys, values, items 중 무엇을 고르느냐에 따라 반복 변수가 달라집니다")

딕셔너리는 키로 값을 찾는 Python 자료형입니다. 딕셔너리를 그대로 반복하면 키가 나옵니다.
`values()`는 값만 내주고 `items()`는 키와 값을 한 쌍으로 내줍니다. 합계만 필요할 때와 부서 이름도
출력할 때 필요한 반복 대상이 다릅니다.

키를 반복하면서 `amounts[department]`로 다시 값을 찾아도 동작합니다. 하지만 키와 값이 모두 필요한
코드라면 `for department, amount in amounts.items():`가 두 값을 사용한다는 사실을 헤더에 바로
보여 줍니다.

#### 예시 코드: 부서 이름과 금액을 items로 함께 받기

입력 딕셔너리에는 세 부서와 금액이 들어 있습니다. 첫 반복은 키 세 개만 출력하고, 둘째 반복은
`items()`가 내준 부서와 금액을 함께 출력합니다. 마지막 합계는 `values()`에서 나온 숫자만 더합니다.

```python
amounts_by_department = {
    "영업팀": 50_000,
    "개발팀": 120_000,
    "운영팀": 80_000,
}

for department in amounts_by_department:
    print("키", department)

for department, amount in amounts_by_department.items():
    print("항목", department, amount)

print("합계", sum(amounts_by_department.values()))
```

#### 예상 결과: 필요한 값의 모양이 서로 다른지 확인하기

첫 세 줄에는 부서 이름만 있고 다음 세 줄에는 이름과 금액이 함께 있습니다. 마지막 `250000`은
딕셔너리의 값 세 개만 합산한 결과입니다.

```text
키 영업팀
키 개발팀
키 운영팀
항목 영업팀 50000
항목 개발팀 120000
항목 운영팀 80000
합계 250000
```

한 딕셔너리 안의 키와 값은 `items()`로 연결돼 있습니다. 서로 따로 만들어진 두 목록을 같은 위치끼리
연결할 때는 길이가 다른 경우까지 검사하는 `zip()`이 필요합니다.

## zip은 같은 위치의 값을 묶습니다

### 두 목록의 길이가 달라지면 strict 옵션으로 조용한 누락을 오류로 바꿉니다

![ID 목록과 금액 목록의 같은 위치가 쌍으로 연결되고 남는 항목이 오류로 표시된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d4/d450fd61f6139d9cc76d13b0de4cf4610bfc1ee6919dd6f092813325770318ac.png "strict를 켜면 짧은 목록 뒤에 남은 항목이 버려지지 않고 길이 불일치로 드러납니다")

`zip()`은 여러 반복 가능한 값에서 첫 항목끼리, 둘째 항목끼리 묶어 튜플을 만듭니다. ID 목록과 금액
목록이 따로 있을 때 같은 위치의 두 값을 한 거래처럼 받을 수 있습니다. 두 목록이 같은 길이라는
약속이 맞을 때 유용합니다.

기본 `zip()`은 가장 짧은 입력이 끝나면 멈춥니다. ID가 세 개인데 금액이 두 개라면 마지막 ID가
오류 없이 사라질 수 있습니다. Python 3.10 이상에서는 `strict=True`를 주어 길이가 다를 때
`ValueError`를 내게 할 수 있습니다.

#### 예시 코드: 같은 길이는 묶고 다른 길이는 실패시키기

첫 ID와 금액 목록은 각각 두 항목이라 두 거래가 만들어집니다. 두 번째 묶음은 ID가 하나 더 많습니다.
`list()`가 끝까지 읽는 동안 길이 차이를 발견하고, 예외 처리 블록이 오류 이름을 출력합니다.

```python
transaction_ids = ["T001", "T002"]
amounts = [50_000, 120_000]

for transaction_id, amount in zip(transaction_ids, amounts, strict=True):
    print(transaction_id, amount)

try:
    list(zip(["T001", "T002", "T003"], [50_000, 120_000], strict=True))
except ValueError as error:
    print(type(error).__name__, "목록 길이 불일치")
```

#### 예상 결과: 정상 두 쌍과 길이 오류 확인하기

정상 목록에서는 두 쌍이 출력됩니다. 길이가 다른 입력은 `T003`을 조용히 버리지 않고
`ValueError`로 멈춥니다. 업무 데이터처럼 누락이 손실로 이어지는 경우에는 기본 `zip()`보다
`strict=True`가 안전합니다.

```text
T001 50000
T002 120000
ValueError 목록 길이 불일치
```

항목을 잘 꺼냈다면 다음에는 각 차례의 결과를 반복이 끝난 뒤에도 남겨야 합니다. 합계와 결과 목록은
첫 항목을 꺼내기 전에 준비합니다.

## 누적값은 반복문 밖에서 시작합니다

### total과 results를 한 번만 만든 뒤 각 거래의 결과를 차례로 더합니다

![빈 합계와 빈 결과 목록이 세 거래를 지나며 단계별로 채워지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a8/a8c4dee262d0d7ab4614a437f5b530ea9fe6df9b59145278f559faa6e8d85b5e.png "반복 밖에서 만든 두 누적값이 각 거래를 처리할 때마다 이전 결과를 보존하며 커집니다")

누적값은 앞 차례의 결과를 기억하면서 다음 값을 더해 가는 변수입니다. 합계는 `0`, 결과 목록은 `[]`
처럼 아무것도 처리하지 않은 상태에서 시작합니다. 이 두 줄은 반복문 밖에 있어야 한 번만 실행되고
앞에서 모은 값이 다음 차례까지 남습니다.

`total += amount`는 현재 합계에 이번 금액을 더해 같은 이름에 다시 저장합니다. `results.append()`는
현재 거래의 결과를 목록 끝에 한 건 추가합니다. 두 동작은 각각 합계와 행별 결과라는 서로 다른
출력을 만듭니다.

#### 예시 코드: 합계와 행별 결과를 같은 반복에서 만들기

입력은 금액 세 개입니다. `total`은 매 차례 금액을 더하고 `results`는 ID와 상태를 하나씩 받습니다.
반복이 끝난 뒤 합계가 `250000`이고 결과가 세 건이면 모든 입력이 누적값에 반영된 것입니다.

```python
transactions = [
    {"id": "T001", "amount": 50_000},
    {"id": "T002", "amount": 120_000},
    {"id": "T003", "amount": 80_000},
]

total = 0
results = []

for transaction in transactions:
    amount = transaction["amount"]
    total += amount
    status = "확인필요" if amount >= 100_000 else "정상"
    results.append({"id": transaction["id"], "status": status})

print("합계", total)
print("결과 건수", len(results))
print(results)
```

#### 예상 결과: 합계와 결과 건수가 함께 보존됐는지 확인하기

합계는 세 금액의 합이고 결과 건수는 입력 건수와 같습니다. `total = 0`이나 `results = []`를
반복문 안으로 옮기면 매 차례 이전 값이 지워져 마지막 거래의 결과만 남습니다.

```text
합계 250000
결과 건수 3
[{'id': 'T001', 'status': '정상'}, {'id': 'T002', 'status': '확인필요'}, {'id': 'T003', 'status': '정상'}]
```

지금까지는 모든 입력이 정상이라고 가정했습니다. 실제 파일에는 빈 ID나 잘못된 금액이 있으므로 한
행만 건너뛸지 반복 전체를 멈출지 구분해야 합니다.

## continue와 break는 목적이 다릅니다

### continue는 현재 행만 건너뛰고 break는 반복 전체를 즉시 끝냅니다

![한 오류 행은 옆으로 빠지고 다음 행이 계속되며 중지 조건에서는 전체 줄이 끝나는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f612566f6fd7450d78a1f0d15f268ddfc2c14b5adf16ea0b2e097cb3bec23caa.png "continue의 경로는 다음 항목으로 이어지고 break의 경로는 반복문 밖으로 바로 나갑니다")

`continue`를 만나면 현재 차례의 남은 줄을 실행하지 않고 다음 항목으로 넘어갑니다. 한 거래의 금액이
잘못됐지만 나머지 거래는 계속 처리해야 할 때 맞습니다. 오류 행을 별도 목록에 기록한 뒤
`continue`하면 정상 결과와 오류 결과가 모두 남습니다.

`break`는 현재 차례뿐 아니라 가장 가까운 반복문 전체를 끝냅니다. 원하는 거래 하나를 찾았거나 더
진행하면 위험한 중지 신호를 만났을 때 사용합니다. 일반적인 입력 오류에 `break`를 쓰면 뒤의 정상
거래까지 처리되지 않으므로 목적을 분명히 해야 합니다.

#### 예시 코드: 잘못된 금액은 건너뛰고 중지 신호에서 멈추기

입력 다섯 건 중 `T002`는 숫자로 바꿀 수 없는 금액이라 오류 목록으로 갑니다. `STOP`은 반복 전체를
끝내므로 그 뒤의 `T004`는 실행되지 않습니다. 처리 한 건, 오류 한 건만 출력되면 두 제어문의 차이가
드러납니다.

```python
transactions = [
    {"id": "T001", "amount": "50000"},
    {"id": "T002", "amount": "오만원"},
    {"id": "T003", "amount": "STOP"},
    {"id": "T004", "amount": "80000"},
]

processed = []
errors = []

for transaction in transactions:
    raw_amount = transaction["amount"]

    if raw_amount == "STOP":
        print("중지", transaction["id"])
        break

    try:
        amount = int(raw_amount)
    except ValueError:
        errors.append(transaction["id"])
        continue

    processed.append((transaction["id"], amount))

print("처리", processed)
print("오류", errors)
```

#### 예상 결과: 건너뛴 행과 중지 뒤의 미처리 행 구분하기

`T002` 뒤에는 `T003`까지 진행했으므로 `continue`는 반복 전체를 멈추지 않았습니다. `T003`에서
`break`가 실행된 뒤에는 `T004`가 어느 목록에도 들어가지 않습니다.

```text
중지 T003
처리 [('T001', 50000)]
오류 ['T002']
```

`break`가 실행됐는지 별도 변수로 기억할 수도 있습니다. Python은 반복이 끝까지 완료됐는지를 바로
표현하는 `for...else` 문법도 제공합니다.

## for else는 break가 없을 때 실행됩니다

### 찾는 값 없이 반복이 끝났을 때만 else 블록이 실행됩니다

![거래 검색이 끝까지 진행된 경로와 중간에 찾고 멈춘 경로가 서로 다르게 끝나는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fe/fe9a1e28e8808bdd0519b087da7059185a89eb3fbcc2bbda0f0b465e0dac812c.png "else는 마지막 항목 뒤에 붙는 것이 아니라 break 없이 반복이 끝난 경우에 붙습니다")

`for` 뒤의 `else`는 `if`의 거짓 경우를 뜻하지 않습니다. 반복자가 끝까지 값을 내주어 정상 종료됐을
때 실행되고, `break`로 중간 종료되면 실행되지 않습니다. 찾는 값이 없을 때만 메시지를 내는 검색
코드에 쓸 수 있습니다.

빈 목록은 첫 항목조차 없지만 역시 `break` 없이 끝난 경우입니다. 따라서 `else` 블록이 실행됩니다.
`for...else`를 읽을 때는 `else`를 `찾아서 break하지 못했다면`이라고 풀어 읽으면 동작이 분명합니다.

#### 예시 코드: 거래 ID를 끝까지 찾고 없음 결과 남기기

입력에는 `T001`부터 `T003`까지만 있고 찾을 ID는 `T009`입니다. 어느 차례에서도 `break`가 실행되지
않으므로 반복이 끝난 뒤 `else`가 없음 결과를 출력합니다.

```python
transactions = [
    {"id": "T001", "amount": 50_000},
    {"id": "T002", "amount": 120_000},
    {"id": "T003", "amount": 80_000},
]
target_id = "T009"

for transaction in transactions:
    if transaction["id"] == target_id:
        print("찾음", transaction)
        break
else:
    print("찾지 못함", target_id)
```

#### 예상 결과: break 없이 끝난 검색 확인하기

`T009`가 없어서 반복은 세 항목을 모두 확인합니다. 찾는 ID를 `T002`로 바꾸면 둘째 차례에서
`찾음`을 출력하고 멈추므로 `찾지 못함`은 나오지 않습니다.

```text
찾지 못함 T009
```

반복의 시작과 종료를 제어해도 원본 목록 자체를 도는 중에 지우면 다음 항목의 위치가 바뀔 수
있습니다. 누락을 막으려면 읽는 목록과 새로 만드는 목록을 분리합니다.

## 반복 중 원본을 바꾸지 않습니다

### 읽고 있는 목록에서 항목을 지우면 뒤 항목이 당겨져 검사를 건너뛸 수 있습니다

![원본 목록에서 행을 지워 다음 행이 건너뛰어진 경우와 새 목록에 남긴 경우](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/de/de95e92424b2df84c2d82b97103192c80447604e60c29dcc9f98512900781d1e.png "원본을 지운 반복은 음수 한 건을 놓치지만 새 목록을 만든 반복은 모든 항목을 검사합니다")

리스트는 항목을 추가하거나 지울 수 있는 변경 가능한 자료형입니다. 반복자가 둘째 위치를 읽는 동안
그 항목을 지우면 뒤 항목들이 앞으로 당겨집니다. 반복자는 이미 다음 위치로 이동하므로 당겨진 항목
하나를 건너뛸 수 있습니다.

[Python 자료 구조 공식 문서](https://docs.python.org/3/tutorial/datastructures.html#looping-techniques)도
반복 중 같은 목록을 바꾸기보다 복사본을 반복하거나 새 목록을 만들 것을 권합니다. 원본 보존이
필요한 업무에서는 새 `valid_amounts` 목록에 통과한 값만 추가하면 입력과 결과를 비교할 수도 있습니다.

#### 실패 예시: 원본 삭제와 새 목록 만들기 비교하기

첫 반복은 음수를 만날 때 원본에서 직접 삭제합니다. `-10`이 지워지며 `-20`이 앞으로 당겨져 검사를
피합니다. 둘째 반복은 원본 네 값을 모두 읽고 양수와 0만 새 목록에 넣으므로 결과가 정확합니다.

```python
amounts = [100, -10, -20, 30]

for amount in amounts:
    if amount < 0:
        amounts.remove(amount)

print("원본 삭제 결과", amounts)

source_amounts = [100, -10, -20, 30]
valid_amounts = []

for amount in source_amounts:
    if amount >= 0:
        valid_amounts.append(amount)

print("새 목록 결과", valid_amounts)
print("보존된 원본", source_amounts)
```

#### 예상 결과: 건너뛴 음수와 올바른 새 목록 확인하기

첫 결과에 `-20`이 남아 있으므로 원본 삭제 방식은 실패입니다. 새 목록에는 `100`과 `30`만 있고
원본 네 값도 그대로 남아 있어 어떤 입력에서 결과가 나왔는지 다시 검사할 수 있습니다.

```text
원본 삭제 결과 [100, -20, 30]
새 목록 결과 [100, 30]
보존된 원본 [100, -10, -20, 30]
```

새 목록을 만드는 일이 한 줄짜리 변환이나 필터라면 Python의 전용 도구가 더 짧고 분명할 수
있습니다. 반복문이 언제 필요한지 다른 선택지와 비교해 보겠습니다.

## 짧은 계산은 전용 도구가 더 분명합니다

### 합계와 단순 필터는 sum과 컴프리헨션으로 의도를 바로 드러냅니다

![같은 금액 목록이 합계, 필터, 존재 검사 세 전용 도구로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3f/3f5e473c50ab2b3042eda49cc9e3b0c8649f2adb7345bc9f77f3c0a5eb774a80.png "한 줄짜리 계산은 목적에 맞는 도구로 보내고 여러 단계 처리는 for문에 남깁니다")

모든 반복을 직접 `for`문으로 써야 하는 것은 아닙니다. 숫자 합계는 `sum()`, 조건을 만족하는 값이
하나라도 있는지는 `any()`, 모두 만족하는지는 `all()`이 뜻을 바로 보여 줍니다. 통과한 값으로 새
목록 하나를 만들 때는 리스트 컴프리헨션을 쓸 수 있습니다.

리스트 컴프리헨션은 `[결과 for 항목 in 입력 if 조건]` 모양으로 새 목록을 만듭니다. 한 항목에서 한
결과를 만드는 짧은 규칙에 알맞습니다. 오류 기록, 여러 누적값, `continue`, 상세 로그가 함께 필요하면
일반 `for`문이 읽고 고치기 쉽습니다.

#### 예시 코드: 합계와 필터 및 존재 검사를 전용 도구로 표현하기

입력은 양수, 음수, 경계값을 포함한 금액 네 개입니다. `sum()`은 전체 합계를 만들고 컴프리헨션은
음수가 아닌 값만 새 목록으로 만듭니다. `any()`는 `100000` 이상이 한 건이라도 있는지 확인합니다.

```python
amounts = [50_000, -10_000, 120_000, 80_000]

total = sum(amounts)
valid_amounts = [amount for amount in amounts if amount >= 0]
has_review_item = any(amount >= 100_000 for amount in amounts)
all_are_integers = all(isinstance(amount, int) for amount in amounts)

print("합계", total)
print("유효 금액", valid_amounts)
print("확인필요 있음", has_review_item)
print("모두 정수", all_are_integers)
```

#### 예상 결과: 각 도구가 결과 하나에 집중하는지 확인하기

전체 합계에는 취소 금액도 포함돼 `240000`이 나옵니다. 유효 금액 목록은 음수를 제외하고,
`any()`와 `all()`은 각각 하나라도 참인지와 전부 참인지 `True` 또는 `False`로 답합니다.

```text
합계 240000
유효 금액 [50000, 120000, 80000]
확인필요 있음 True
모두 정수 True
```

이제 반복 원리와 도구 선택을 실제 프로그램 하나에 연결합니다. 각 입력 행은 반드시 처리 결과 또는
오류 결과 가운데 하나로 남고, 마지막에 두 결과를 합쳐 원래 입력 건수와 비교합니다.

## 거래 처리 프로그램을 완성합니다

### 여섯 입력을 처리 세 건과 오류 세 건으로 나누고 유효 금액만 합산합니다

![여섯 거래가 반복문을 지나 처리 목록과 오류 목록 및 합계로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4d/4d0846ebf46112ed3578ee859484bf0f31e21bf74736232d8e63777bb6f65454.png "모든 입력 행은 처리 또는 오류 한쪽에 남고 처리된 금액만 최종 합계에 더해집니다")

완성 예제는 거래 여섯 건을 한 번만 반복합니다. 각 차례에는 행 번호와 ID를 확인하고, 중복 ID를
검사한 뒤 금액을 정수로 바꿉니다. 실패한 행은 `errors`에 넣고 `continue`하며, 통과한 행만
`processed`와 `total`에 반영합니다.

코드를 함수에 넣은 이유는 반복 규칙을 테스트에서 여러 입력으로 다시 실행하기 위해서입니다. 함수는
입력을 받아 코드를 실행하고 결과를 돌려주는 이름 붙은 묶음입니다. 이 글에서는 함수 문법보다 함수
안의 `for`문이 한 입력을 한 결과로 보존하는지에 집중합니다.

프로젝트는 설정 파일 하나, 실행 코드 하나, 테스트 파일 하나로 구성합니다. 실행에는 Python 3.12
이상과 프로젝트 환경 도구인 uv가 필요합니다. 터미널에서 `uv --version`을 입력했을 때 버전 번호가
나오면 준비된 상태입니다. 명령을 찾을 수 없다고 나오면
[uv 공식 설치 안내](https://docs.astral.sh/uv/getting-started/installation/)에서 운영체제에 맞는 방법으로
설치한 뒤 터미널을 다시 엽니다.

#### 예시 코드: 세 파일이 놓일 정확한 프로젝트 구조 확인하기

폴더 이름은 달라도 되지만 파일의 상대 위치는 다음과 같아야 합니다. `pyproject.toml`은 가장 바깥
프로젝트 루트에 있고, 실행 코드는 `src` 폴더, 테스트는 `tests` 폴더에 있습니다. 이 구조가 아래
설정의 `pythonpath = ["src"]`와 `testpaths = ["tests"]`에 연결됩니다.

```text
transaction-loop-lab/
├─ pyproject.toml
├─ src/
│  └─ transaction_loop.py
└─ tests/
   └─ test_transaction_loop.py
```

이후 나오는 `uv lock`, 프로그램 실행, 테스트 명령은 모두 `transaction-loop-lab` 프로젝트 루트에서
실행합니다. 세 파일을 루트 한곳에 몰아넣으면 테스트가 `src/transaction_loop.py`를 찾지 못하므로,
코드를 복사하기 전에 `src`와 `tests` 폴더부터 구분해 만듭니다.

#### 예시 코드: Python과 pytest 버전 범위 고정하기

`pyproject.toml`은 프로젝트 이름, 지원하는 Python 버전, 개발용 테스트 도구를 기록합니다.
`pytest==8.4.1`을 고정하면 같은 예제에서 테스트 도구 버전이 달라지는 문제를 줄일 수 있습니다.

```toml
[project]
name = "transaction-loop-lab"
version = "0.1.0"
requires-python = ">=3.12"

[dependency-groups]
dev = [
  "pytest==8.4.1",
]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
```

#### 예시 코드: 모든 행을 처리 또는 오류로 보존하기

`src/transaction_loop.py`의 입력은 ID와 금액을 가진 거래 목록입니다. 핵심 반복은
`enumerate(..., start=1)`로 행 번호를 받고 실패할 때마다 오류를 기록합니다. 마지막 보고서의
`input_count`, `processed`, `errors`, `total`이 반복 결과입니다.

```python
NORMAL_LIMIT = 100_000
APPROVAL_LIMIT = 1_000_000


def parse_amount(raw_amount):
    if isinstance(raw_amount, bool):
        raise ValueError("금액은 참과 거짓이 아니라 정수여야 합니다")

    if isinstance(raw_amount, int):
        return raw_amount

    if isinstance(raw_amount, str):
        normalized = raw_amount.replace(",", "").strip()
        if normalized == "":
            raise ValueError("금액이 비어 있습니다")
        try:
            return int(normalized)
        except ValueError as error:
            raise ValueError(f"정수로 바꿀 수 없는 금액: {raw_amount!r}") from error

    raise ValueError(f"지원하지 않는 금액 자료형: {type(raw_amount).__name__}")


def classify_amount(amount):
    if amount < 0:
        return "취소"
    if amount >= APPROVAL_LIMIT:
        return "승인필요"
    if amount >= NORMAL_LIMIT:
        return "확인필요"
    return "정상"


def process_transactions(transactions):
    processed = []
    errors = []
    seen_ids = set()
    total = 0
    input_count = 0

    for row_number, transaction in enumerate(transactions, start=1):
        input_count = row_number
        transaction_id = str(transaction.get("id", "")).strip()

        if transaction_id == "":
            errors.append({"row": row_number, "id": "", "reason": "id 누락"})
            continue

        if transaction_id in seen_ids:
            errors.append(
                {"row": row_number, "id": transaction_id, "reason": "id 중복"}
            )
            continue

        seen_ids.add(transaction_id)

        try:
            amount = parse_amount(transaction.get("amount"))
        except ValueError as error:
            errors.append(
                {"row": row_number, "id": transaction_id, "reason": str(error)}
            )
            continue

        processed.append(
            {
                "row": row_number,
                "id": transaction_id,
                "amount": amount,
                "status": classify_amount(amount),
            }
        )
        total += amount

    return {
        "input_count": input_count,
        "processed": processed,
        "errors": errors,
        "total": total,
    }


def main():
    transactions = [
        {"id": "T001", "amount": "50,000"},
        {"id": "T002", "amount": 100_000},
        {"id": "T003", "amount": "오만원"},
        {"id": "T002", "amount": 30_000},
        {"id": " ", "amount": 80_000},
        {"id": "T006", "amount": "1,000,000"},
    ]
    report = process_transactions(transactions)

    for row in report["processed"]:
        print(f"처리 {row['id']} {row['amount']:,}원 {row['status']}")

    for error in report["errors"]:
        error_id = error["id"] or "ID 없음"
        print(f"오류 {error['row']}행 {error_id} {error['reason']}")

    print(
        f"입력 {report['input_count']}건 = "
        f"처리 {len(report['processed'])}건 + 오류 {len(report['errors'])}건"
    )
    print(f"합계 {report['total']:,}원")


if __name__ == "__main__":
    main()
```

`seen_ids`는 이미 나온 ID를 기억하는 집합입니다. 집합은 같은 값을 한 번만 보관하므로
`transaction_id in seen_ids`로 중복을 빠르게 확인할 수 있습니다. 금액이 잘못된 첫 거래도 ID는
이미 사용된 것으로 기록해 뒤에서 같은 ID가 정상 거래처럼 들어오지 못하게 합니다.

`parse_amount()`는 쉼표가 있는 문자열을 정수로 바꾸고, `classify_amount()`는 금액 경계에 따라 상태를
돌려줍니다. `process_transactions()`의 반복문은 변환과 분류를 연결하지만 입력 딕셔너리 자체는
수정하지 않습니다.

`try` 블록은 금액 변환을 시도하고, `parse_amount()`가 `ValueError`를 내면 바로 아래 `except` 블록이
그 오류를 받아 `errors`에 기록합니다. 이어지는 `continue` 때문에 실패한 거래만 끝나고 다음 거래는
계속 처리됩니다. 예외는 프로그램 전체를 무조건 끝내는 신호가 아니라, 여기서는 한 행을 오류 결과로
바꾸는 입력이 됩니다.

이 예제에는 업무 규칙도 들어 있습니다. 음수 금액은 `취소`로 분류하고 `total`에 더해 기존 합계에서
차감합니다. 잘못된 금액의 ID도 `seen_ids`에 먼저 넣어 같은 ID의 재등장을 중복으로 봅니다. 회사의
규칙이 다르면 반복문을 바꾸기보다 `seen_ids.add()`의 위치나 합계에 더할 조건을 바꿔야 합니다.

`print(f"합계 {report['total']:,}원")`처럼 문자열 앞에 붙은 `f`는 중괄호 안의 실제 값을 문장에
넣습니다. `:,`는 정수에 천 단위 쉼표를 붙입니다. 마지막의
`if __name__ == "__main__":`은 이 파일을 직접 실행할 때만 `main()`을 호출하고, 테스트가 함수를
가져올 때는 표본 거래를 자동 실행하지 않게 막습니다.

이 프로그램이 받는 입력의 범위는 `id`와 `amount` 키를 가진 딕셔너리의 리스트 또는 생성기입니다.
CSV 파일을 여는 과정, 딕셔너리가 아닌 행의 복구, 처리 결과의 데이터베이스 저장은 이 예제의 범위에
포함하지 않습니다. 그 경계를 분명히 해야 `for`문의 누락 방지 약속과 파일 형식 오류를 섞지 않고
각각 테스트할 수 있습니다.

#### 실행 명령: 여섯 거래의 보고서 출력하기

프로젝트 루트에서 먼저 의존성을 준비하고 프로그램을 실행합니다. `uv lock`은 실제 선택된 버전을
`uv.lock`에 기록하고, 다음 명령은 그 환경에서 `src/transaction_loop.py`를 실행합니다.

```powershell
uv lock
uv sync --all-groups --locked
uv run python src/transaction_loop.py
```

#### 예상 결과: 처리와 오류의 건수 보존 확인하기

정상, 확인필요, 승인필요 거래가 각각 한 줄 나오고 오류도 세 줄 나옵니다. 마지막 두 줄에서
`입력 6건 = 처리 3건 + 오류 3건`과 `합계 1,150,000원`이 보이면 누락 없이 분기된 것입니다.

```text
처리 T001 50,000원 정상
처리 T002 100,000원 확인필요
처리 T006 1,000,000원 승인필요
오류 3행 T003 정수로 바꿀 수 없는 금액: '오만원'
오류 4행 T002 id 중복
오류 5행 ID 없음 id 누락
입력 6건 = 처리 3건 + 오류 3건
합계 1,150,000원
```

눈으로 한 번 맞는 결과만으로는 빈 입력이나 `99999`, `100000` 같은 경계가 안전하다고 말할 수
없습니다. 반복문의 약속을 여러 입력으로 고정하는 테스트가 마지막 증거입니다.

## pytest로 반복의 약속을 검사합니다

### 정상과 오류 및 경계값을 바꾸어도 입력 한 건이 결과 한 건으로 남는지 확인합니다

![정상과 오류 및 경계 입력이 반복 테스트 표의 각 행을 통과하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/aa/aa7b6764a98d802167f2e1ac9502af45d886cfadc235e9ee5f07dc901559af2d.png "테스트는 값 하나가 아니라 빈 입력, 경계, 중복, 생성기까지 서로 다른 반복 상태를 확인합니다")

테스트는 입력과 기대 결과를 코드로 짝지어 자동 비교하는 파일입니다. 이 예제는 금액 변환 10개,
분류 경계 6개, 빈 입력과 순서 및 오류 보존 같은 처리 규칙 11개를 검사합니다. 모두 합쳐 27개가
통과해야 합니다.

특히 `입력 건수 = 처리 건수 + 오류 건수` 검사는 각 반복 차례가 어느 한쪽에 반드시 남았는지
확인합니다. 생성기 입력 테스트는 한 번만 읽을 수 있는 반복자가 모두 소비돼도 보고서의 입력 건수가
보존되는지 검사합니다.

#### 예시 코드: 변환과 경계 및 누락 방지 약속 고정하기

`tests/test_transaction_loop.py`는 완성 코드의 함수를 가져와 입력을 바꿔 실행합니다. 각 `assert`의
왼쪽은 실제 결과이고 오른쪽은 기대 결과입니다. 둘이 다르면 pytest가 실패한 테스트 이름과 값을
보여 줍니다.

```python
import copy

import pytest

from transaction_loop import classify_amount, parse_amount, process_transactions


@pytest.mark.parametrize(
    ("raw_amount", "expected"),
    [
        (50_000, 50_000),
        ("50,000", 50_000),
        (" 100000 ", 100_000),
        ("-30000", -30_000),
    ],
)
def test_parse_amount_accepts_supported_values(raw_amount, expected):
    assert parse_amount(raw_amount) == expected


@pytest.mark.parametrize("raw_amount", ["", "   ", "오만원", True, 1.5, None])
def test_parse_amount_rejects_invalid_values(raw_amount):
    with pytest.raises(ValueError):
        parse_amount(raw_amount)


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (-1, "취소"),
        (0, "정상"),
        (99_999, "정상"),
        (100_000, "확인필요"),
        (999_999, "확인필요"),
        (1_000_000, "승인필요"),
    ],
)
def test_classify_amount_covers_boundaries(amount, expected):
    assert classify_amount(amount) == expected


def test_empty_input_returns_empty_report():
    assert process_transactions([]) == {
        "input_count": 0,
        "processed": [],
        "errors": [],
        "total": 0,
    }


def test_valid_rows_keep_order_and_total():
    rows = [
        {"id": "T001", "amount": "50,000"},
        {"id": "T002", "amount": 100_000},
        {"id": "T003", "amount": "1,000,000"},
    ]

    report = process_transactions(rows)

    assert [row["id"] for row in report["processed"]] == ["T001", "T002", "T003"]
    assert [row["status"] for row in report["processed"]] == [
        "정상",
        "확인필요",
        "승인필요",
    ]
    assert report["total"] == 1_150_000


def test_invalid_amount_becomes_error_and_next_row_continues():
    rows = [
        {"id": "T001", "amount": "오만원"},
        {"id": "T002", "amount": 30_000},
    ]

    report = process_transactions(rows)

    assert report["errors"][0]["row"] == 1
    assert report["processed"][0]["id"] == "T002"


def test_missing_id_becomes_error():
    report = process_transactions([{"amount": 50_000}])
    assert report["errors"] == [{"row": 1, "id": "", "reason": "id 누락"}]


def test_duplicate_id_becomes_error():
    rows = [
        {"id": "T001", "amount": 50_000},
        {"id": "T001", "amount": 70_000},
    ]

    report = process_transactions(rows)

    assert len(report["processed"]) == 1
    assert report["errors"] == [{"row": 2, "id": "T001", "reason": "id 중복"}]


def test_invalid_first_duplicate_id_is_still_reserved():
    rows = [
        {"id": "T001", "amount": "오만원"},
        {"id": "T001", "amount": 70_000},
    ]

    report = process_transactions(rows)

    assert [error["reason"] for error in report["errors"]] == [
        "정수로 바꿀 수 없는 금액: '오만원'",
        "id 중복",
    ]


def test_every_input_row_becomes_processed_or_error():
    rows = [
        {"id": "T001", "amount": 50_000},
        {"id": "T002", "amount": "오만원"},
        {"id": "", "amount": 30_000},
    ]

    report = process_transactions(rows)

    assert report["input_count"] == len(report["processed"]) + len(report["errors"])


def test_processing_does_not_change_input_rows():
    rows = [{"id": "T001", "amount": "50,000"}]
    original = copy.deepcopy(rows)

    process_transactions(rows)

    assert rows == original


def test_generator_input_is_consumed_once():
    source_rows = [
        {"id": "T001", "amount": 50_000},
        {"id": "T002", "amount": 70_000},
    ]
    row_stream = (row for row in source_rows)

    report = process_transactions(row_stream)

    assert report["input_count"] == 2
    assert list(row_stream) == []


def test_total_contains_only_processed_amounts():
    rows = [
        {"id": "T001", "amount": 50_000},
        {"id": "T002", "amount": "오만원"},
        {"id": "T003", "amount": -10_000},
    ]

    report = process_transactions(rows)

    assert report["total"] == 40_000


def test_sample_report_has_three_processed_and_three_errors():
    rows = [
        {"id": "T001", "amount": "50,000"},
        {"id": "T002", "amount": 100_000},
        {"id": "T003", "amount": "오만원"},
        {"id": "T002", "amount": 30_000},
        {"id": " ", "amount": 80_000},
        {"id": "T006", "amount": "1,000,000"},
    ]

    report = process_transactions(rows)

    assert len(report["processed"]) == 3
    assert len(report["errors"]) == 3
    assert report["input_count"] == 6
    assert report["total"] == 1_150_000
```

#### 실행 명령: 전체 반복 테스트 확인하기

프로젝트 루트에서 다음 명령을 실행합니다. 점 27개 뒤에 `27 passed`가 나오면 빈 입력부터 생성기까지
모든 반복 규칙이 현재 코드와 맞습니다. 실패하면 표시된 테스트 이름부터 읽으면 고칠 조건을 찾을 수
있습니다.

```powershell
uv run pytest -q
```

#### 예상 결과: 27개 테스트 통과 확인하기

실행 시간은 컴퓨터마다 달라질 수 있지만 테스트 개수와 통과 상태는 같아야 합니다. 실패 수가 하나라도
있으면 프로그램을 발행하거나 실제 거래 파일에 적용하기 전에 해당 입력과 기대 결과를 다시 확인합니다.

```text
...........................                                              [100%]
27 passed in 0.03s
```

`process_transactions()` 안의 잘못된 금액 처리에서 `continue`를 `break`로 바꾸면 뒤의 정상 거래가
사라지고 테스트가 실패합니다. 테스트는 문법이 실행된다는 사실보다 반복을 멈출 위치가 업무 약속과
맞는지를 지키는 장치입니다.

## for와 while은 멈춤 기준이 다릅니다

### 처리할 항목이 보이면 for를 쓰고 조건이 바뀔 때까지라면 while을 씁니다

![항목 목록이 끝나면 멈추는 for와 조건이 거짓이 되면 멈추는 while의 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/98/982ee01159566dd046a1580de27c4a69fbf9d69b9eb3e800db821b0380bd0257.png "for는 반복자의 끝을 따르고 while은 매 차례 다시 계산한 조건을 따릅니다")

`for`문은 목록, 파일 줄, 생성기처럼 처리할 항목을 하나씩 받을 수 있을 때 알맞습니다. 항목 개수를
미리 몰라도 반복자가 끝을 알려 주므로 사용할 수 있습니다. 거래 100건, 폴더 안 파일들, CSV의 각
행은 모두 `for`문으로 읽기 좋은 입력입니다.

`while`문은 항목의 끝보다 조건의 참과 거짓이 멈춤 기준일 때 씁니다. 사용자가 올바른 값을 입력할
때까지 다시 묻거나 작업 상태가 완료될 때까지 확인하는 경우입니다. 조건을 갱신하지 않으면 영원히
멈추지 않을 수 있으므로 반복 횟수 제한이나 중지 조건을 함께 둡니다.

| 하려는 일 | 맞는 도구 | 이유 |
|---|---|---|
| 거래 목록의 모든 행 처리 | `for` | 목록이 다음 행과 끝을 제공함 |
| 파일의 모든 줄 읽기 | `for` | 파일이 줄을 하나씩 제공함 |
| 세 번 재시도 | `for attempt in range(1, 4)` | 정해진 시도 번호가 있음 |
| 성공할 때까지 재시도 | 제한을 둔 `while` | 매번 성공 조건을 다시 확인함 |
| 숫자 목록 합계 | `sum()` | 결과가 합계 하나뿐임 |
| 단순한 새 목록 만들기 | 리스트 컴프리헨션 | 한 입력이 한 결과로 바로 바뀜 |

이 글의 첫 예제를 다시 실행한 뒤 거래 하나를 추가하면 출력도 한 줄 늘어납니다. 완성 프로젝트에서는
`uv run pytest -q`를 다시 실행해 `27 passed`와
`입력 건수 = 처리 건수 + 오류 건수`를 함께 확인하면 됩니다.

아래 링크는 이 글에서 실행한 동작의 공식 정의입니다. 글을 먼저 실행한 뒤 `for`, 반복 가능한 값,
`range`, `enumerate`, `zip`, 반복 제어 가운데 더 확인할 항목을 골라 읽을 수 있습니다.

#### 참고 자료: Python 공식 문서에서 반복 규칙 더 읽기

- [Python for문 언어 참조](https://docs.python.org/3/reference/compound_stmts.html#the-for-statement)
- [Python 반복 가능한 값과 반복자 용어](https://docs.python.org/3/glossary.html#term-iterable)
- [Python range 자료형](https://docs.python.org/3/library/stdtypes.html#ranges)
- [Python enumerate 함수](https://docs.python.org/3/library/functions.html#enumerate)
- [Python zip 함수와 strict 옵션](https://docs.python.org/3/library/functions.html#zip)
- [Python break, continue, 반복문 else](https://docs.python.org/3/tutorial/controlflow.html#break-and-continue-statements-and-else-clauses-on-loops)
