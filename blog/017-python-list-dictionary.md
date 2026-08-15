---
title: Python 리스트와 딕셔너리 차이: 거래 데이터를 어떻게 묶을까
slug: python-list-dictionary
author: eddmpython
section: Python 기초
summary: Python 리스트 딕셔너리 차이를 거래 데이터로 익힙니다. 여러 금액은 순서대로 담고 거래 한 건은 열 이름으로 찾으며 누락 값도 안전하게 처리합니다.
readerQuestion: Python 리스트와 딕셔너리는 무엇이 다르고 Excel 거래 데이터를 어떻게 담을까?
readerTakeaway: 여러 값은 list에 순서대로 담고 거래 한 건은 dict에 키와 값으로 담은 뒤 append와 get을 사용해 자료를 추가하고 안전하게 읽는다.
readerLevel: beginner
readerStartingPoint: 변수와 문자열 및 숫자를 알고 Python 파일을 한 번 실행해 본 상태입니다.
primaryKeyword: Python 리스트 딕셔너리
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/cb/cb2d765ef317034ae5bb6f7617011574a10488fad76a23f753a4de4d45206462.png
ogImageAlt: 순서가 있는 거래 금액 목록과 열 이름으로 값을 찾는 거래 한 건이 나란히 놓인 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 리스트 딕셔너리 차이를 처음 배우면 둘 다 값을 여러 개 담는데 왜 이름이 다른지 헷갈립니다.
거래 금액 세 개와 거래 한 건을 코드로 만들면 쓰임이 바로 갈립니다.

이 글의 코드를 위에서부터 실행하면 목록에 값을 추가하고, 거래 한 칸을 바꾸고, 세 거래의 합계
`250000`을 계산합니다. 마지막에는 선택 열이 없어도 멈추지 않는 읽기 방법까지 확인합니다.

## Python 리스트와 딕셔너리는 기준이 다릅니다

### 여러 거래는 순서로 묶고 거래 한 건은 열 이름으로 값을 찾습니다

![순서가 있는 거래 금액 목록과 열 이름으로 값을 찾는 거래 한 건이 나란히 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/cb/cb2d765ef317034ae5bb6f7617011574a10488fad76a23f753a4de4d45206462.png "왼쪽 목록은 위치로 값을 찾고 오른쪽 거래 한 건은 열 이름으로 값을 찾습니다")

`list`는 같은 종류의 값 여러 개를 순서대로 담습니다. 금액 목록에서는 첫 번째 값이 `50000`, 두 번째
값이 `120000`입니다. `dict`는 거래일, 부서, 항목, 금액처럼 이름이 다른 값을 한 건으로 묶습니다.

목록에서 대괄호 안 숫자는 위치입니다. Python은 첫 위치를 `0`으로 세므로 `amounts[0]`이 첫
금액입니다. 딕셔너리에서는 대괄호 안에 키를 적습니다. `transaction["department"]`는 부서 값을
찾습니다.

#### 코드

```python
amounts = [50000, 120000, 80000]

transaction = {
    "date": "2026-08-01",
    "department": "영업팀",
    "item": "교통비",
    "amount": 50000,
}

print(amounts[0])
print(transaction["department"])
```

#### 예시

```text
50000
영업팀
```

## 값을 추가하고 바꾸는 코드를 실행합니다

### append는 목록 끝에 더하고 대괄호 키는 거래 한 칸을 바꿉니다

![거래 목록 끝에 새 금액이 추가되고 거래 기록의 금액 칸이 새 값으로 바뀌는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e0/e01047abda28146686397da5c80b7236a194c3035f1780c86c4ab260deda0da1.png "위 목록에는 네 번째 금액이 생기고 아래 거래 기록에서는 금액 칸만 바뀝니다")

목록에 새 거래를 더할 때는 `append()`를 사용합니다. 기존 값 세 개는 그대로 있고 맨 끝에 `95000`이
붙습니다. 실행 뒤 `len(amounts)`를 출력하면 목록 길이가 `4`로 늘어난 사실을 확인할 수 있습니다.

거래 한 건의 금액을 고칠 때는 딕셔너리의 키를 골라 새 값을 넣습니다. 아래 코드는 `amount`만
`55000`으로 바꿉니다. 거래일, 부서, 항목 값은 바뀌지 않습니다.

#### 코드

```python
amounts.append(95000)
transaction["amount"] = 55000

print(amounts)
print(len(amounts))
print(transaction)
```

#### 예시

```text
[50000, 120000, 80000, 95000]
4
{'date': '2026-08-01', 'department': '영업팀', 'item': '교통비', 'amount': 55000}
```

## dict 여러 개를 list에 담아 표를 만듭니다

### 같은 키를 가진 거래 세 건은 Excel의 세 행과 네 열처럼 읽힙니다

![세 개의 거래 기록이 같은 네 열을 가진 작은 표로 정렬되고 금액 합계가 계산되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/78/78e07d937374750640d157a7bcaa5fa3c73a9c293e3bd22dbf9e218134cc8b6f.png "딕셔너리 한 개가 표의 한 행이 되고 같은 키는 같은 열에 놓입니다")

실무 데이터는 `dict` 하나보다 `dict` 여러 개를 담은 `list`로 자주 만납니다. 아래 `transactions`에는
거래 세 건이 있습니다. 각 딕셔너리는 Excel의 한 행이고 `date`, `department`, `item`, `amount`는
열 이름과 같습니다.

반복문으로 한 행씩 읽어 `amount`를 더하면 합계는 `250000`입니다. 아직 반복문이 낯설어도
`for transaction in transactions`가 거래 세 건을 차례로 꺼낸다는 점만 확인하면 됩니다.

#### 코드

```python
transactions = [
    {"date": "2026-08-01", "department": "영업팀", "item": "교통비", "amount": 50000},
    {"date": "2026-08-02", "department": "개발팀", "item": "소프트웨어", "amount": 120000},
    {"date": "2026-08-03", "department": "운영팀", "item": "소모품", "amount": 80000},
]

total = 0
for transaction in transactions:
    total = total + transaction["amount"]

print(len(transactions))
print(total)
```

#### 예시

```text
3
250000
```

## 없는 키는 get으로 안전하게 읽습니다

### 선택 열이 빠질 수 있다면 오류 대신 기본값을 정해 결과를 계속 만듭니다

![없는 부서 키를 직접 찾는 경로는 오류로 멈추고 get 경로는 기본값 카드로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/78/785457fba403802969a8f1f8c8be09636142816bf3c2319a15afeea362d88482.png "같은 누락 값도 대괄호 접근은 멈추고 get 접근은 정한 기본값을 돌려줍니다")

반드시 있어야 하는 키는 대괄호로 읽고, 없어도 되는 키는 `get()`으로 읽습니다. `amount`가 없다면
계산할 수 없으므로 `transaction["amount"]`로 읽어 오류를 바로 찾는 편이 좋습니다. 메모는 없어도
되므로 기본값을 정할 수 있습니다.

`transaction.get("memo", "")`는 `memo` 키가 있으면 그 값을 돌려줍니다. 키가 없으면 빈 문자열을
돌려주므로 프로그램이 멈추지 않습니다. 어떤 열이 필수이고 어떤 열이 선택인지 먼저 정해야 두 방법을
알맞게 나눌 수 있습니다.

#### 코드

```python
transaction = {
    "date": "2026-08-01",
    "department": "영업팀",
    "amount": 50000,
}

amount = transaction["amount"]
memo = transaction.get("memo", "")

print(amount)
print(repr(memo))
```

#### 예시

```text
50000
''
```

#### 확인 목록

- 여러 같은 값은 `list`에 넣었는지 확인합니다.
- 거래 한 건은 열 이름을 키로 가진 `dict`에 넣었는지 확인합니다.
- 꼭 필요한 키는 대괄호로 읽어 누락 오류를 찾습니다.
- 선택 키는 `get()`에 기본값을 넣어 읽습니다.

#### 참고 자료

- [Python 자료 구조 공식 문서](https://docs.python.org/3/tutorial/datastructures.html)
