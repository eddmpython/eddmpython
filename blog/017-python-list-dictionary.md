---
title: Python 리스트와 딕셔너리 차이: 데이터가 꼬이지 않는 선택법
slug: python-list-dictionary
author: eddmpython
section: Python 기초
summary: 여러 값을 순서로 찾을지 이름으로 찾을지 결정하면 Python 리스트와 딕셔너리를 헷갈리지 않고 실제 거래 데이터를 안전하게 묶을 수 있습니다.
readerQuestion: Python 리스트와 딕셔너리는 무엇이 다르고 실제 데이터에는 언제 무엇을 써야 할까?
readerTakeaway: 순서와 위치가 중요하면 list를 쓰고 이름과 값의 관계가 중요하면 dict를 쓰며, 여러 기록은 list 안에 dict를 넣어 표현한다.
readerLevel: beginner
readerStartingPoint: 대괄호와 중괄호를 처음 보고, 값 여러 개를 어떤 기준으로 묶고 찾아야 하는지 모른다.
primaryKeyword: Python 리스트 딕셔너리
searchIntent: comparison
depthContract: standalone-deep-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/59/59718d62d283372e6b82e2ea89b78dac62b609d09410344bb9d9dcf38a6a8a61.png
ogImageAlt: 순서로 찾는 리스트와 이름으로 찾는 딕셔너리가 같은 거래 자료를 서로 다르게 정리한 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 리스트와 딕셔너리는 둘 다 값을 여러 개 담는 그릇입니다. 차이는 값을 몇 개 담느냐가 아니라
나중에 무엇으로 찾느냐에 있습니다. 첫째와 둘째처럼 **위치로 찾으면 리스트**를 쓰고, 금액과 부서처럼
**이름으로 찾으면 딕셔너리**를 씁니다.

이 글에서는 거래 자료 네 건을 직접 묶고, 값을 추가하고, 빠진 항목을 찾고, 복사본이 원본과 함께
바뀌는 이유까지 확인합니다. 마지막에는 잘못된 거래를 제외한 뒤 부서별 합계를 만드는 프로그램과
네 가지 자동 테스트를 실행합니다.

## 둘의 차이는 값을 찾는 기준입니다

### 같은 값을 담아도 위치로 찾을지 이름으로 찾을지에 따라 자료형이 달라집니다

![순서로 찾는 리스트와 이름으로 찾는 딕셔너리가 같은 거래 자료를 서로 다르게 정리한 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/59/59718d62d283372e6b82e2ea89b78dac62b609d09410344bb9d9dcf38a6a8a61.png "리스트와 딕셔너리를 가르는 기준은 모양이 아니라 값을 다시 찾을 때 쓰는 단서입니다")

여러 값을 한 이름 아래 모아 둔 것을 이 글에서는 **컨테이너**라고 부르겠습니다. 컨테이너 안에 든
값 하나는 **원소**입니다. 리스트와 딕셔너리는 모두 컨테이너지만, 원소를 찾는 표지가 서로 다릅니다.

리스트는 `[50000, 120000, 80000]`처럼 대괄호 안에 값을 순서대로 적습니다. 첫 번째 금액과 마지막
금액처럼 위치가 뜻을 가질 때 알맞습니다. 같은 값이 두 번 들어가도 되고, 뒤에 새 값을 붙일 수도 있습니다.

딕셔너리는 `{"department": "영업팀", "amount": 50000}`처럼 중괄호 안에 `키: 값`을 적습니다.
**키**는 값을 찾는 이름표이고, **값**은 그 이름표에 연결된 실제 자료입니다. 거래 한 건에서 금액을
찾고 싶다면 몇 번째 칸인지 세지 않고 `amount`라는 키를 사용합니다.

| 물어볼 질문 | 알맞은 자료형 | 값을 찾는 예 |
|---|---|---|
| 첫 번째 거래는 무엇인가 | `list` | `transactions[0]` |
| 이 거래의 금액은 얼마인가 | `dict` | `transaction["amount"]` |
| 처리 대기 순서를 지켜야 하는가 | `list` | 앞에서부터 차례로 읽기 |
| 항목 이름으로 값을 꺼내야 하는가 | `dict` | 키로 값 읽기 |

#### 예시 코드: 위치와 키로 같은 거래 자료 읽기

아래 코드는 금액 세 개를 리스트에 담고 거래 한 건을 딕셔너리에 담습니다. 입력은 같은 금액과 부서
정보지만, `amounts[0]`은 위치 `0`으로 찾고 `transaction["department"]`는 키로 찾습니다. 실행하면
첫 금액 `50000`과 부서 `영업팀`이 차례로 나옵니다.

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

#### 예상 결과: 위치와 키로 찾은 값 확인하기

입력 리스트의 첫 위치를 읽은 결과가 첫 줄이고, 딕셔너리에서 `department` 키를 읽은 결과가 둘째
줄입니다. 두 출력이 각각 `50000`과 `영업팀`이면 위치와 키가 서로 다른 방식으로 같은 자료를 찾았습니다.

```text
50000
영업팀
```

이 기준을 실제 코드에서 흔들리지 않게 쓰려면 리스트의 위치가 어떻게 계산되는지부터 알아야 합니다.

## 리스트는 위치와 순서를 기억합니다

### 0부터 세는 인덱스와 잘라 읽는 슬라이스 및 끝에 붙이는 동작을 함께 익힙니다

![거래 금액 네 개가 0부터 시작하는 위치표와 앞뒤 방향표를 따라 한 줄로 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d6/d67afbeb9fd71261b65139c30c4577c957a03b4a5393890f824dd98fe278129c.png "리스트의 인덱스는 값의 이름이 아니라 현재 순서에서 떨어진 거리를 나타냅니다")

리스트는 **시퀀스**입니다. 시퀀스는 값이 앞에서 뒤로 이어진 자료를 뜻합니다. Python은 첫 원소의
위치를 `0`, 둘째를 `1`, 셋째를 `2`로 셉니다. 이 위치 번호를 **인덱스**라고 부릅니다.

왜 첫 위치가 `1`이 아니라 `0`일까요. 인덱스를 시작점에서 얼마나 떨어졌는지 나타내는 거리로 읽으면
이해하기 쉽습니다. 첫 원소는 시작점에서 `0`칸, 둘째 원소는 `1`칸 떨어져 있습니다. 그래서 원소가
세 개인 리스트에서 쓸 수 있는 양수 인덱스는 `0`, `1`, `2`입니다.

음수 인덱스는 뒤에서 셉니다. `-1`은 마지막 원소이고 `-2`는 끝에서 둘째 원소입니다. `amounts[1:3]`
같은 **슬라이스**는 인덱스 `1`부터 `3` 직전까지 잘라 새 리스트를 만듭니다. 시작은 포함하고 끝은
포함하지 않으므로 결과에는 인덱스 `1`과 `2`만 들어갑니다.

`append(value)`는 값 하나를 리스트 끝에 붙입니다. `extend(values)`는 다른 컨테이너의 원소를 하나씩
풀어 리스트 끝에 붙입니다. `[95000, 30000]`을 `append`하면 안쪽 리스트 하나가 들어가지만,
`extend`하면 숫자 두 개가 각각 들어갑니다.

Python은 한 리스트의 원소가 모두 같은 자료형인지 강제하지 않습니다. `[50000, "오만원"]`도 만들 수
있지만 두 값을 `sum`으로 더하면 정수와 문자열을 더할 수 없다는 `TypeError`가 납니다. 금액 목록처럼
한 동작을 반복할 자료는 같은 의미와 자료형으로 맞추고, 이름과 자료형이 다른 한 기록은 딕셔너리로
나누는 편이 오류를 일찍 찾기 쉽습니다.

`append`, `extend`, `sort`처럼 리스트 자체를 바꾸는 메서드는 바뀐 리스트를 반환하지 않고 `None`을
반환합니다. 따라서 `amounts = amounts.append(95000)`이라고 쓰면 추가는 일어나지만 그 직후
`amounts`라는 이름이 `None`을 가리킵니다. `amounts.append(95000)`을 한 줄로 실행하고 다음 줄에서
원래 리스트를 읽어야 합니다.

#### 예시 코드: 추가와 인덱스와 슬라이스 실행하기

입력은 금액 세 개입니다. `append`로 네 번째 금액을 붙인 뒤 마지막 값과 가운데 두 값을 읽습니다.
핵심은 `-1`이 마지막 위치를 가리키고 `1:3`이 끝 번호 `3`을 제외한다는 점입니다. 실행 결과의 길이는
`4`, 마지막 값은 `95000`, 잘라 낸 목록은 `[120000, 80000]`입니다.

```python
amounts = [50000, 120000, 80000]
amounts.append(95000)

print(len(amounts))
print(amounts[-1])
print(amounts[1:3])
```

#### 예상 결과: 추가된 길이와 잘린 범위 확인하기

`append` 뒤 리스트 길이가 `4`인지 먼저 봅니다. 이어서 `-1`이 새 마지막 금액을 돌려주고,
`1:3`이 인덱스 `1`과 `2`의 값만 담은 새 리스트를 출력하면 세 동작을 올바르게 실행한 것입니다.

```text
4
95000
[120000, 80000]
```

리스트는 순서를 지키지만 각 위치의 뜻을 설명해 주지는 않습니다. 거래 한 건의 셋째 값이 부서인지
금액인지 알아야 한다면 위치 번호보다 이름표가 필요하고, 그때 딕셔너리를 사용합니다.

## 딕셔너리는 키로 값을 찾습니다

### 고유한 키 하나가 값 하나를 가리키며 같은 키에 다시 넣으면 기존 값이 바뀝니다

![거래 한 건의 네 키가 각 값과 한 쌍으로 연결되고 같은 금액 키가 새 값으로 교체되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7b/7bf9168d0b434bac901e0199051a44ee0740605120b4875330513938c80b6142.png "딕셔너리에서는 위치를 세는 대신 고유한 키가 어떤 값과 연결됐는지 읽습니다")

딕셔너리는 **매핑**입니다. 매핑은 한 값을 다른 값에 연결하는 자료를 뜻합니다. 거래 딕셔너리에서는
`department`가 `영업팀`에 연결되고 `amount`가 `50000`에 연결됩니다. 키와 값의 연결 하나를
**키와 값의 쌍** 또는 **항목**이라고 부릅니다.

한 딕셔너리 안의 키는 고유해야 합니다. 같은 `amount` 키에 `55000`을 다시 넣으면 두 금액이 함께
남지 않습니다. 이전 값 `50000`이 새 값 `55000`으로 바뀝니다. 같은 이름의 열을 두 개 보관하려는
용도로 딕셔너리를 쓰면 안 되는 이유입니다.

딕셔너리는 키를 넣은 순서를 기억합니다. `list(transaction)`을 실행하면 키가 입력된 순서대로 나옵니다.
하지만 딕셔너리를 리스트처럼 둘째 칸으로 읽는다는 뜻은 아닙니다. `transaction[1]`은 숫자 `1`이라는
키를 찾을 뿐이고, 그런 키가 없으면 오류가 납니다.

`in`의 뜻도 컨테이너마다 다릅니다. `50000 in amounts`는 리스트의 값 중 `50000`이 있는지 묻습니다.
`"amount" in transaction`은 딕셔너리의 **키** 중 `amount`가 있는지 묻습니다. 값에 `50000`이
있는지 확인하려면 `50000 in transaction.values()`라고 분명히 적어야 합니다.

#### 예시 코드: 키 추가와 수정 및 포함 여부 확인하기

입력 딕셔너리에는 세 키가 있습니다. 대괄호에 새 키 `item`을 넣으면 항목이 추가되고, 이미 있는
`amount`에 새 값을 넣으면 그 값만 교체됩니다. 마지막 세 출력은 키 존재, 값 존재, 입력 순서를 각각
보여 주므로 딕셔너리에서 `in`이 무엇을 검사하는지도 확인할 수 있습니다.

```python
transaction = {
    "date": "2026-08-01",
    "department": "영업팀",
    "amount": 50000,
}

transaction["item"] = "교통비"
transaction["amount"] = 55000

print("amount" in transaction)
print(55000 in transaction.values())
print(list(transaction))
print(transaction["amount"])
```

#### 예상 결과: 고유한 키와 바뀐 값 확인하기

처음 두 `True`는 `amount` 키와 `55000` 값이 각각 존재한다는 뜻입니다. 키 목록에서 새 `item`이
끝에 있고 마지막 출력이 `55000`이면 키 추가는 순서를 늘리고 키 수정은 기존 값을 교체했습니다.

```text
True
True
['date', 'department', 'amount', 'item']
55000
```

키로 빨리 값을 찾으려면 키가 실행 중에 갑자기 다른 값으로 변하지 않아야 합니다. 다음 절에서는
문자열은 키가 되는데 리스트는 키가 될 수 없는 이유를 확인합니다.

## 키는 왜 바뀌지 않아야 할까요

### 딕셔너리는 변하지 않는 해시값으로 키의 자리를 찾으므로 변경 가능한 리스트를 키로 쓰지 못합니다

![고정된 문자열 키는 같은 보관 칸을 다시 찾고 모양이 바뀌는 리스트 키는 경로가 끊기는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d0/d06f5719d26fdaefc402b08a088ed13d74078004223501de8a800c12b0a832fa.png "딕셔너리 키는 저장할 때와 다시 찾을 때 같은 위치를 계산할 수 있어야 합니다")

Python은 딕셔너리 키에서 **해시값**이라는 정수를 계산해 값을 보관할 자리를 찾습니다. 같은 키는
실행 중에 같은 해시값을 유지해야 다시 같은 자리를 찾을 수 있습니다. 이런 조건을 만족하는 값을
**해시 가능하다**고 말합니다.

문자열과 정수는 실행 중에 자기 내용이 바뀌지 않으므로 보통 딕셔너리 키로 쓸 수 있습니다. 리스트와
딕셔너리는 안의 값을 추가하거나 지울 수 있으므로 키로 쓸 수 없습니다. 키로 넣은 뒤 내용이 바뀌면
저장할 때 계산한 자리와 찾을 때 계산한 자리가 달라질 수 있기 때문입니다.

튜플은 만든 뒤 원소를 교체할 수 없는 자료형이므로 키가 될 수 있습니다. 다만 튜플 안에 리스트처럼
변경 가능한 값이 들어 있으면 그 튜플도 키로 쓸 수 없습니다. 초보자에게 가장 읽기 쉬운 키는 대개
`transaction_id`나 `department`처럼 뜻이 분명한 문자열입니다.

#### 실패 예시: 리스트를 딕셔너리 키로 사용하기

첫 코드는 문자열 키와 튜플 키를 정상적으로 저장합니다. 그다음 변경 가능한 리스트를 키로 넣으려 하면
`TypeError`가 발생합니다. `try`는 오류가 날 수 있는 코드를 실행하고, `except`는 해당 오류가 났을 때
프로그램을 멈추는 대신 종류와 내용을 출력합니다.

```python
lookup = {
    "영업팀": 130000,
    (2026, 8): 250000,
}

try:
    lookup[[2026, 8]] = 250000
except TypeError as error:
    print(type(error).__name__)
    print(error)

print(lookup["영업팀"])
print(lookup[(2026, 8)])
```

#### 예상 결과: 변경 가능한 키의 오류 확인하기

리스트 키를 넣은 줄에서 `TypeError`와 해시 불가 설명이 나와야 합니다. 오류를 처리한 뒤에도 문자열 키와
튜플 키로 읽은 값 `130000`, `250000`이 출력되면 정상 키 두 개는 그대로 보존된 것입니다.

```text
TypeError
unhashable type: 'list'
130000
250000
```

이제 리스트는 여러 행의 순서를, 딕셔너리는 한 행의 이름표를 맡길 수 있습니다. 두 자료형을 겹쳐 쓰면
Excel과 CSV에서 자주 보는 행과 열 모양을 Python 값으로 표현할 수 있습니다.

## 여러 거래는 리스트 안 딕셔너리입니다

### 바깥 리스트는 행 순서를 보관하고 안쪽 딕셔너리는 각 행의 열 이름을 보관합니다

![딕셔너리 거래 카드 세 장이 리스트에 순서대로 들어가고 같은 키들이 표의 같은 열로 정렬된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b0/b01fe0f63c7b375c048cf5c01f13834545398f7a4bfad00aadf7200be57adb8d.png "리스트 안의 딕셔너리 하나는 표의 한 행이고 같은 키는 같은 의미의 열이 됩니다")

거래 한 건은 날짜, 부서, 항목, 금액처럼 서로 다른 이름의 값을 가집니다. 그래서 딕셔너리 하나로
표현하기 좋습니다. 거래가 여러 건이면 그 딕셔너리들을 리스트에 넣습니다. 이를 `dict의 list` 또는
`list[dict]`라고 읽을 수 있습니다.

바깥 리스트는 첫 거래와 둘째 거래라는 행 순서를 기억합니다. 안쪽 딕셔너리는 각 행에서 날짜와 금액을
찾는 키를 기억합니다. `transactions[1]["amount"]`는 먼저 리스트에서 둘째 거래를 꺼내고, 그 거래의
딕셔너리에서 `amount` 값을 찾는 두 단계 표현입니다.

이 모양은 표와 닮았지만 표의 규칙을 자동으로 강제하지는 않습니다. 첫 딕셔너리에 `department`가
있다고 해서 둘째 딕셔너리에도 반드시 생기지는 않습니다. 금액에 정수 대신 문자열 `"오만원"`을 넣어도
딕셔너리는 저장합니다. 같은 키와 같은 자료형이 들어 있는지는 별도의 검사 코드가 확인해야 합니다.

#### 예시 코드: 거래 세 건에서 위치와 키를 차례로 읽기

입력은 같은 네 키를 가진 거래 딕셔너리 세 개입니다. 첫 출력은 둘째 거래의 금액을 두 단계로 찾고,
반복문은 각 거래에서 `amount`를 꺼내 합계에 더합니다. `for`는 리스트의 원소를 앞에서부터 하나씩
`transaction`이라는 이름에 연결하며, 최종 합계는 `250000`입니다.

```python
transactions = [
    {"date": "2026-08-01", "department": "영업팀", "item": "교통비", "amount": 50000},
    {"date": "2026-08-02", "department": "개발팀", "item": "소프트웨어", "amount": 120000},
    {"date": "2026-08-03", "department": "영업팀", "item": "소모품", "amount": 80000},
]

print(transactions[1]["amount"])

total = 0
for transaction in transactions:
    total = total + transaction["amount"]

print(total)
```

#### 예상 결과: 둘째 거래와 전체 합계 확인하기

첫 줄 `120000`은 리스트 인덱스 `1`로 둘째 거래를 고른 뒤 `amount` 키로 읽은 값입니다. 둘째 줄
`250000`은 반복문이 세 딕셔너리의 금액을 한 번씩 더한 결과이므로 위치와 키의 두 단계가 모두 맞습니다.

```text
120000
250000
```

현실의 표에는 행이 아예 없거나 필수 열이 빠진 경우가 있습니다. 리스트의 없는 위치와 딕셔너리의
없는 키는 서로 다른 오류를 내므로, 다음에는 두 실패를 구분하고 복구하는 기준을 세웁니다.

## 없는 위치와 키는 다르게 다룹니다

### IndexError와 KeyError를 숨기지 말고 필수 값과 선택 값을 먼저 구분합니다

![빈 목록의 없는 위치와 거래 기록의 없는 키가 서로 다른 오류표로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ad/ad3c158d13a7613053fcd30804b408362ce5f03e01ed6cd1bde49385ca4afe3c.png "없는 위치는 IndexError이고 없는 키는 KeyError이므로 같은 누락으로 처리하면 원인을 놓칩니다")

원소가 세 개인 리스트의 마지막 양수 인덱스는 `2`입니다. `amounts[3]`을 읽으면 범위를 벗어났다는
`IndexError`가 납니다. 길이가 매번 달라지는 리스트에서는 먼저 `len(amounts)`를 확인하거나,
위치가 꼭 필요하지 않다면 `for`로 원소를 직접 꺼내는 편이 안전합니다.

딕셔너리에 없는 키를 대괄호로 읽으면 `KeyError`가 납니다. 반드시 있어야 하는 `amount`가 빠졌다면
이 오류를 숨기지 말고 잘못된 거래로 보고해야 합니다. 없어도 되는 `memo`는 `get("memo", "")`처럼
기본값을 정해 읽을 수 있습니다.

`get`을 모든 키에 쓰면 안전하다고 생각하기 쉽지만 그렇지 않습니다. `transaction.get("amount")`는
키가 없어도 `None`을 반환하므로, 필수 금액이 사라졌다는 사실을 늦게 발견할 수 있습니다. 또한 키가
없을 때와 실제 값이 `None`일 때 결과가 같아집니다. 누락 자체를 구분해야 하면 먼저
`"amount" in transaction`을 검사합니다.

#### 실패 예시: 없는 인덱스와 없는 키를 따로 확인하기

입력은 금액 하나뿐인 리스트와 `memo`가 없는 거래 딕셔너리입니다. 두 `try` 구문은 각각
`IndexError`와 `KeyError`의 이름을 출력합니다. 마지막 줄은 선택 키를 `get`으로 읽어 빈 문자열을
돌려주며, 필수 값과 선택 값의 처리가 달라야 함을 보여 줍니다.

```python
amounts = [50000]
transaction = {"department": "영업팀", "amount": 50000}

try:
    print(amounts[1])
except IndexError as error:
    print(type(error).__name__)

try:
    print(transaction["date"])
except KeyError as error:
    print(type(error).__name__)

memo = transaction.get("memo", "")
print(repr(memo))
```

#### 예상 결과: 두 누락 오류와 선택 기본값 확인하기

첫 줄은 없는 리스트 위치에서 나온 `IndexError`, 둘째 줄은 없는 딕셔너리 키에서 나온 `KeyError`입니다.
마지막 `''`는 선택 키 `memo`에 지정한 빈 문자열이므로 세 누락 처리 결과가 서로 구분되어야 합니다.

```text
IndexError
KeyError
''
```

누락을 안전하게 처리해도 원본과 복사본이 같은 안쪽 딕셔너리를 가리키면 예상하지 않은 변경이 생길 수
있습니다. 리스트와 딕셔너리가 변경 가능한 자료형이라는 말이 실제로 무엇을 뜻하는지 이어서 봅니다.

## 수정과 복사는 같은 문제가 아닙니다

### 이름 대입과 얕은 복사 및 안쪽 딕셔너리 복사를 구분해야 원본을 지킬 수 있습니다

![한 거래 목록을 두 이름이 함께 가리키고 얕은 복사에서도 안쪽 거래가 공유되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9c/9cc5597e6b318dfc0b590d90b5ed3815c766df6513c9dde465bc5d2772c9bf2f.png "바깥 리스트만 새로 만들어도 안쪽 딕셔너리는 원본과 복사본이 함께 가리킬 수 있습니다")

리스트와 딕셔너리는 만든 뒤 원소를 추가하거나 값을 바꿀 수 있습니다. 이를 **변경 가능하다**고 합니다.
`copied = original`이라고 대입해도 새 리스트는 만들어지지 않습니다. 두 이름이 같은 리스트 객체를
가리키므로 `copied`에서 바꾼 내용이 `original`에서도 보입니다.

`original.copy()`는 바깥 리스트를 새로 만듭니다. 하지만 이 리스트 안의 딕셔너리까지 복사하지는
않습니다. 이를 **얕은 복사**라고 합니다. 바깥 목록은 둘이지만 첫 거래 딕셔너리는 여전히 같은 객체이므로
`shallow[0]["amount"]`를 바꾸면 `original[0]["amount"]`도 바뀝니다.

거래 딕셔너리 안에 문자열과 정수만 있다면 `[row.copy() for row in original]`처럼 각 행도 복사할 수
있습니다. 안쪽에 다시 리스트나 딕셔너리가 들어 있는 더 깊은 구조라면 `copy.deepcopy`가 필요할 수
있습니다. 다만 깊은 복사는 모든 것을 복사하므로 공유하려던 값까지 분리할 수 있어 구조를 먼저 확인해야 합니다.

#### 실패 예시: 얕은 복사 뒤 안쪽 값 분리하기

첫 번째 변경은 대입한 이름이 같은 목록을 가리킨다는 사실을 보여 줍니다. 두 번째 변경은 바깥 리스트를
얕게 복사해도 안쪽 딕셔너리가 공유된다는 사실을 보여 줍니다. 마지막에는 각 딕셔너리도 `copy()`로
복사하므로 `separate`의 금액만 바뀌고 원본 금액 `70000`은 유지됩니다.

```python
original = [{"department": "영업팀", "amount": 50000}]

alias = original
alias[0]["amount"] = 60000
print(original[0]["amount"])

shallow = original.copy()
shallow[0]["amount"] = 70000
print(original[0]["amount"])

separate = [transaction.copy() for transaction in original]
separate[0]["amount"] = 80000
print(original[0]["amount"])
print(separate[0]["amount"])
```

#### 예상 결과: 공유된 변경과 분리된 변경 비교하기

첫 두 출력 `60000`과 `70000`은 대입과 얕은 복사에서 안쪽 딕셔너리가 공유됐다는 증거입니다. 마지막
두 값이 `70000`과 `80000`으로 갈리면 각 거래를 따로 복사한 뒤에는 원본과 복사본이 분리된 것입니다.

```text
60000
70000
70000
80000
```

복사 관계를 이해했다면 원본을 순회하면서 원소를 지우는 또 다른 변경 문제도 피할 수 있습니다. 다음
절에서는 검사 중인 목록을 그대로 고치지 않고 새 결과 목록을 만드는 이유를 확인합니다.

## 반복 중에는 원본을 지우지 않습니다

### 검사하는 리스트와 결과를 담는 리스트를 나누면 건너뛴 거래 없이 결과를 확인할 수 있습니다

![원본 거래 목록은 그대로 두고 유효한 거래만 새 목록으로 이동하는 두 경로의 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/12/1284d8100995cea5b5f155b30b9360b655adc485fd93e79c93a8bfd0300a0c18.png "반복 중인 원본을 수정하지 않으면 모든 거래를 한 번씩 검사했다는 사실을 확인하기 쉽습니다")

리스트를 앞에서부터 읽는 도중 원소를 지우면 뒤 원소의 인덱스가 앞으로 당겨집니다. 반복문은 다음
인덱스로 이동하므로 당겨진 원소 하나를 건너뛸 수 있습니다. 오류가 나지 않고 일부 값만 남는 경우도
있어 눈으로 찾기 더 어렵습니다.

안전한 기본 방법은 원본을 읽기만 하고 조건에 맞는 값을 새 리스트에 `append`하는 것입니다. 이렇게 하면
입력과 결과를 나란히 비교할 수 있고, 누락한 거래가 있는지도 `len`으로 확인할 수 있습니다. 원본 파일을
보존해야 하는 자동화에서도 같은 원칙을 적용할 수 있습니다.

딕셔너리도 반복하는 도중 키를 추가하거나 지우지 않는 편이 좋습니다. 딕셔너리의 키를 보고 있는 동안
크기가 바뀌면 `RuntimeError`가 나거나 의도한 항목을 모두 보지 못할 수 있습니다. 바꿀 키를 별도
리스트에 모은 뒤 반복이 끝난 다음 수정하면 읽기와 쓰기의 시점이 분리됩니다.

#### 예시 코드: 원본을 보존하며 정상 금액만 고르기

입력 리스트에는 양수, 음수, 0이 함께 있습니다. 반복문은 원본을 지우지 않고 `amount > 0`인 값만
`valid_amounts`에 추가합니다. 실행 결과에서 원본 네 개가 그대로 남고 결과 두 개만 분리되므로 어떤
값이 제외되었는지 다시 확인할 수 있습니다.

```python
amounts = [50000, -20000, 0, 80000]
valid_amounts = []

for amount in amounts:
    if amount > 0:
        valid_amounts.append(amount)

print(amounts)
print(valid_amounts)
```

#### 예상 결과: 원본과 필터 결과를 나란히 확인하기

첫 줄에는 입력 금액 네 개가 순서와 값 모두 그대로 남아야 합니다. 둘째 줄에 양수인 `50000`과
`80000`만 보이면 반복 중 원본을 지우지 않고 조건을 통과한 값만 새 리스트에 모은 것입니다.

```text
[50000, -20000, 0, 80000]
[50000, 80000]
```

리스트와 딕셔너리가 강력해도 모든 자료를 이 둘로만 표현할 필요는 없습니다. 값의 중복을 없애거나
형태를 강제해야 한다면 다른 자료형이 의도를 더 정확히 드러냅니다.

## 다른 자료형이 더 맞는 때도 있습니다

### 변경 여부와 중복 허용 및 필드 규칙을 기준으로 튜플과 집합 및 데이터 클래스를 고릅니다

![같은 자료가 순서 목록과 고정 묶음과 중복 없는 모음 및 필드가 정해진 기록으로 갈라지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e5/e50adefacc3de302df9f060e62c555f4e26c9206b30160081d56a381f473390a.png "자료형 선택은 익숙한 문법보다 자료가 지켜야 할 규칙에서 시작합니다")

리스트는 순서가 있고 변경할 수 있습니다. 딕셔너리는 이름으로 값을 찾고 변경할 수 있습니다. 이 성질이
문제의 요구와 맞지 않으면 아래 자료형을 검토합니다. 문법이 짧아 보인다는 이유보다 무엇을 금지하고
무엇을 허용해야 하는지로 선택하는 편이 안전합니다.

| 필요한 규칙 | 먼저 볼 자료형 | 이유 |
|---|---|---|
| 순서는 필요하지만 만든 뒤 바꾸면 안 됨 | `tuple` | 원소 위치를 유지하고 항목 대입을 허용하지 않음 |
| 중복을 없애고 포함 여부를 확인함 | `set` | 같은 값을 한 번만 보관함 |
| 고정된 필드 이름과 자료형을 코드에 드러냄 | `dataclass` | 거래라는 구조와 기본값을 한곳에 정의함 |
| 행과 열 계산 및 파일 변환이 중심임 | pandas `DataFrame` | 열 단위 계산과 표 파일 처리를 제공함 |

튜플은 리스트처럼 인덱스로 읽지만 원소를 바꿀 수 없습니다. 집합은 중복을 없애는 데 알맞지만 목록의
순서 자체가 결과여야 할 때는 맞지 않습니다. 데이터 클래스는 거래 필드가 오래 유지되는 프로그램에서
오타와 누락을 줄이지만, 외부 JSON처럼 키가 매번 달라지는 자료를 처음 받아 보는 단계에서는 딕셔너리가
더 유연할 수 있습니다.

pandas 데이터프레임은 Excel이나 CSV의 많은 행을 계산할 때 편리합니다. 그렇다고 리스트와
딕셔너리를 건너뛰어도 된다는 뜻은 아닙니다. 데이터프레임을 한 행씩 딕셔너리로 바꾸거나 JSON 응답을
읽을 때 다시 이 구조를 만나므로 위치와 키의 차이는 계속 필요합니다.

이제 선택 기준을 실제 프로그램에 적용할 차례입니다. 거래 여러 건은 리스트로, 거래 한 건은
딕셔너리로 받고, 필수 키와 금액 자료형을 검사한 뒤 정상 거래만 합계에 넣겠습니다.

## 거래 요약 프로그램을 완성합니다

### 입력 검증과 부서별 합계 및 오류 보고를 세 함수 역할로 나누어 한 번에 실행합니다

![거래 딕셔너리 목록이 필수 키 검사와 정상 거래 분리 및 부서별 합계를 거쳐 보고서로 나오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/12/127597911d9e0160b02cd32afc9c9ccb7656fd4fd243226baa830babf4f8d165.png "완성 프로그램은 자료를 담는 데서 끝나지 않고 잘못된 행을 제외한 근거까지 함께 출력합니다")

완성 예제의 입력은 거래 딕셔너리 네 개를 담은 리스트입니다. 앞의 세 거래는 날짜, 부서, 항목, 금액을
모두 가지고 있습니다. 넷째 거래는 `department` 키가 없으므로 합계에서 제외하고 오류 목록에 남깁니다.

`validate_transaction` 함수는 거래 한 건을 받아 빠진 키와 잘못된 값을 찾습니다. 함수는 이름을 붙인
코드 묶음이며, 같은 검사를 거래마다 다시 사용할 수 있게 합니다. `build_report`는 정상 거래를 새
리스트에 모으고, 부서 이름을 키로 쓰는 딕셔너리에 금액을 누적합니다.

`department_totals.get(department, 0)`은 해당 부서의 이전 합계를 읽습니다. 첫 거래라 키가 없으면
`0`부터 시작합니다. 그 뒤 현재 금액을 더해 같은 키에 다시 저장하므로 부서별 합계가 만들어집니다.
이때 없는 부서 합계는 정상적인 초기 상태이므로 `get`의 기본값이 알맞습니다.

프로젝트는 `pyproject.toml`, `src/transaction_report.py`, `tests/test_transaction_report.py` 세 파일로
구성합니다. `src`에는 실제 프로그램을, `tests`에는 결과를 자동 확인하는 코드를 둡니다. 아래 명령은
새 폴더를 만들고 세 파일을 둘 자리를 준비합니다.

이 예제는 `uv`로 Python 버전과 테스트 도구를 준비합니다. `uv`는 프로젝트마다 필요한 Python과
패키지를 기록대로 설치하고 명령을 실행하는 도구입니다.

PowerShell에서 아래 명령을 먼저 실행해 `uv`로 시작하는 버전 한 줄이 보이는지 확인합니다. 명령을
찾을 수 없다는 오류가 나오면 글 끝의 공식 설치 문서에 따라 `uv`를 설치한 뒤 PowerShell을 새로 열어
같은 명령을 다시 실행합니다.

#### 실행 명령: uv 설치 상태와 버전 확인하기

입력은 `uv --version` 한 줄입니다. `--version`은 파일을 만들지 않고 현재 설치된 도구의 버전만
보여 줍니다. 출력에 `uv`와 버전 번호가 함께 나오면 다음 폴더 생성 명령으로 이동할 수 있고, 명령을
찾을 수 없다는 오류가 나오면 아직 프로젝트 파일을 만들기 전에 설치부터 해결해야 합니다.

```powershell
uv --version
```

#### 실행 명령: 거래 요약 프로젝트 파일 자리 만들기

PowerShell에서 빈 작업 폴더로 이동한 뒤 실행합니다. 입력은 만들 폴더와 파일 이름이고, 명령이 끝나면
`src`와 `tests` 폴더 및 빈 파일 세 개가 보입니다. 이미 같은 이름의 파일이 있는 폴더에서는 덮어쓸 수
있으므로 반드시 새 폴더에서 시작합니다.

```powershell
mkdir transaction-report
cd transaction-report
mkdir src, tests
New-Item pyproject.toml, src/transaction_report.py, tests/test_transaction_report.py
```

#### 예시 코드: Python 버전과 pytest 의존성 고정하기

`pyproject.toml`은 프로젝트의 Python 최소 버전과 테스트 도구를 기록합니다. 입력은 Python 3.12 이상과
`pytest==8.4.2`이고, `pythonpath`는 테스트가 `src` 안의 프로그램을 찾게 합니다. 저장 뒤
`uv run`을 실행하면 이 계약에 맞는 독립 실행 환경이 준비됩니다.

```toml
[project]
name = "transaction-report"
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

#### 예시 코드: 거래 검증과 부서별 합계 보고서 만들기

이 파일은 네 거래를 입력으로 받고 필수 키와 금액을 검사합니다. 핵심 줄은 정상 거래만
`valid_transactions`에 넣고, 부서 키마다 이전 합계에 현재 금액을 더하는 부분입니다. 실행하면 입력
4건 중 정상 3건의 합계 `250,000원`과 제외 이유 한 줄이 나옵니다.

```python
REQUIRED_KEYS = ("date", "department", "item", "amount")


def validate_transaction(row_number, transaction):
    errors = []

    for key in REQUIRED_KEYS:
        if key not in transaction:
            errors.append(f"{row_number}번째 거래: {key} 키가 없습니다")

    if "department" in transaction:
        department = transaction["department"]
        if not isinstance(department, str) or department.strip() == "":
            errors.append(f"{row_number}번째 거래: department가 빈 문자열입니다")

    if "amount" in transaction:
        amount = transaction["amount"]
        is_integer = isinstance(amount, int) and not isinstance(amount, bool)
        if not is_integer or amount <= 0:
            errors.append(f"{row_number}번째 거래: amount는 0보다 큰 정수여야 합니다")

    return errors


def build_report(transactions):
    valid_transactions = []
    errors = []

    for row_number, transaction in enumerate(transactions, start=1):
        row_errors = validate_transaction(row_number, transaction)
        if row_errors:
            errors.extend(row_errors)
            continue
        normalized_transaction = transaction.copy()
        normalized_transaction["department"] = normalized_transaction["department"].strip()
        valid_transactions.append(normalized_transaction)

    department_totals = {}
    for transaction in valid_transactions:
        department = transaction["department"]
        amount = transaction["amount"]
        previous_total = department_totals.get(department, 0)
        department_totals[department] = previous_total + amount

    return {
        "input_count": len(transactions),
        "valid_count": len(valid_transactions),
        "invalid_count": len(transactions) - len(valid_transactions),
        "grand_total": sum(department_totals.values()),
        "department_totals": department_totals,
        "errors": errors,
    }


def main():
    transactions = [
        {
            "date": "2026-08-01",
            "department": "영업팀",
            "item": "교통비",
            "amount": 50000,
        },
        {
            "date": "2026-08-02",
            "department": "개발팀",
            "item": "소프트웨어",
            "amount": 120000,
        },
        {
            "date": "2026-08-03",
            "department": "영업팀",
            "item": "소모품",
            "amount": 80000,
        },
        {
            "date": "2026-08-04",
            "item": "회의비",
            "amount": 30000,
        },
    ]

    report = build_report(transactions)

    print(f"입력: {report['input_count']}건")
    print(f"정상: {report['valid_count']}건")
    print(f"제외: {report['invalid_count']}건")
    print(f"정상 거래 합계: {report['grand_total']:,}원")

    for department, total in report["department_totals"].items():
        print(f"{department}: {total:,}원")

    for error in report["errors"]:
        print(error)


if __name__ == "__main__":
    main()
```

긴 코드를 한 번에 외울 필요는 없습니다. 아래 표에서 입력 한 건이 어떤 줄을 거쳐 정상 목록이나 오류
목록으로 가는지만 따라가면 됩니다. 오른쪽 결과를 실제 실행 출력과 대조하면 각 이름이 무엇을 담는지도
확인할 수 있습니다.

| 코드 조각 | 하는 일 | 이 예제에서 보이는 결과 |
|---|---|---|
| `enumerate(transactions, start=1)` | 거래를 하나씩 꺼내면서 사람이 읽는 행 번호를 1부터 붙임 | 누락 오류가 `4번째 거래`로 표시됨 |
| `if row_errors:` | 오류 목록에 하나라도 들어 있는지 확인함 | 넷째 거래가 정상 목록에 들어가지 않음 |
| `errors.extend(row_errors)` | 그 행에서 찾은 오류 문장을 전체 오류 목록 끝에 하나씩 붙임 | `department 키가 없습니다`가 보고서에 남음 |
| `continue` | 현재 거래 처리를 여기서 끝내고 다음 거래로 이동함 | 누락 거래의 금액 `30000`은 합계에 들어가지 않음 |
| `transaction.copy()` | 정상 거래 딕셔너리의 바깥 항목을 새 딕셔너리에 복사함 | 부서 공백을 정리해도 입력 행은 바뀌지 않음 |
| `normalized_transaction["department"].strip()` | 복사한 부서 문자열의 앞뒤 공백을 제거함 | `" 영업팀 "`과 `"영업팀"`이 같은 합계 키로 모임 |
| `get(department, 0)` | 부서 합계가 아직 없으면 시작값 `0`을 사용함 | 첫 영업팀 거래가 `0 + 50000`에서 시작함 |
| `department_totals.items()` | 부서 키와 합계 값을 한 쌍씩 꺼냄 | 영업팀과 개발팀 합계가 각각 한 줄로 출력됨 |
| `sum(department_totals.values())` | 부서별 합계 값만 모두 더함 | 전체 합계가 `250000`이 됨 |
| `f"...{값}..."` | 문자열 안의 중괄호 자리에 실제 값을 넣음 | 숫자가 `정상: 3건` 같은 문장으로 출력됨 |
| `if __name__ == "__main__":` | 이 파일을 직접 실행했을 때만 `main()`을 호출함 | 테스트가 함수를 가져올 때 예제 출력이 섞이지 않음 |

#### 실행 명령: 정상 거래 합계와 제외 이유 출력하기

프로젝트 루트에서 아래 명령을 실행합니다. `uv`가 `pyproject.toml`을 읽어 Python 환경을 만든 뒤
프로그램을 실행합니다. 결과에는 정상 거래만 더한 `250,000원`과 넷째 거래에서 빠진 키 이름이 함께
나와야 합니다.

```powershell
uv run python src/transaction_report.py
```

#### 예상 결과: 입력 건수와 부서별 합계 확인하기

입력 네 건 중 필수 키가 있는 세 건만 정상으로 집계되어야 합니다. 전체 합계와 두 부서 합계가 맞고
마지막 줄에 넷째 거래의 `department` 누락 이유가 나오면 검증과 합계 및 오류 보고가 모두 작동했습니다.

```text
입력: 4건
정상: 3건
제외: 1건
정상 거래 합계: 250,000원
영업팀: 130,000원
개발팀: 120,000원
4번째 거래: department 키가 없습니다
```

이 프로그램의 입력 경계는 `딕셔너리로 이미 바뀐 거래 목록`입니다. Excel이나 CSV 파일을 직접 여는
코드는 포함하지 않으며, 리스트 안에 문자열이나 숫자만 들어오면 현재 검사 함수도 정상적으로 처리하지
못합니다. 파일 읽기까지 필요하다면 먼저 각 행을 딕셔너리로 바꾸고, 그 결과가 이 글의 필수 키 계약을
만족하는지 검사해야 합니다.

눈에 보이는 한 번의 성공만으로 모든 경계가 맞다고 단정할 수는 없습니다. 필수 키가 네 개 모두
빠지거나 Python에서 정수처럼 동작하는 `True`가 금액에 들어오는 경우도 자동 테스트로 고정해야 합니다.

## pytest로 정상과 실패를 확인합니다

### 합계와 누락 키와 잘못된 금액 및 원본 보존을 네 테스트로 다시 실행합니다

![정상 합계와 네 키 누락과 잘못된 금액 및 원본 보존 네 검사가 모두 통과한 결과판](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2d/2dac884ce5bf6a1d53ab44509dd17c5a255f3c8f64589d01d3741c9503e119d8.png "테스트는 정상 출력뿐 아니라 빠진 키와 예상 밖의 자료형 및 원본 변경까지 따로 확인합니다")

`pytest`는 이름이 `test_`로 시작하는 함수를 찾아 실행합니다. `assert 실제값 == 기대값`은 두 값이
같으면 지나가고 다르면 그 테스트를 실패로 표시합니다. 화면을 눈으로 비교하는 대신 프로그램이 스스로
결과를 판정하게 만드는 장치입니다.

첫 테스트는 정상 거래 세 건만 합계에 들어갔는지 확인합니다. 둘째는 빈 딕셔너리에서 필수 키 네 개를
모두 보고하는지 봅니다. 셋째는 `bool`이 Python 내부에서 `int`의 하위 자료형이라는 특이한 경우와
0원 경계를 확인합니다. 넷째는 부서의 앞뒤 공백이 합계 키에서는 사라지면서 입력 리스트에는 그대로
남는지 비교합니다.

#### 예시 코드: 정상 경로와 세 실패 경계 고정하기

이 파일의 입력은 작은 거래 목록과 빈 딕셔너리 및 경계 금액입니다. 각 테스트가 합계, 오류 문장,
금액 조건, 공백 정리와 원본 보존을 판정합니다. `deepcopy`는 비교용 `before`를 안쪽 딕셔너리까지
별도로 복사하며, 네 테스트가 맞으면 마지막 실행 결과에 `4 passed`가 표시됩니다.

```python
from copy import deepcopy

from transaction_report import build_report, validate_transaction


def test_build_report_sums_only_valid_transactions():
    transactions = [
        {"date": "2026-08-01", "department": "영업팀", "item": "교통비", "amount": 50000},
        {"date": "2026-08-02", "department": "개발팀", "item": "도구", "amount": 120000},
        {"date": "2026-08-03", "department": "영업팀", "item": "소모품", "amount": 80000},
        {"date": "2026-08-04", "item": "회의비", "amount": 30000},
    ]

    report = build_report(transactions)

    assert report["input_count"] == 4
    assert report["valid_count"] == 3
    assert report["invalid_count"] == 1
    assert report["grand_total"] == 250000
    assert report["department_totals"] == {"영업팀": 130000, "개발팀": 120000}
    assert report["errors"] == ["4번째 거래: department 키가 없습니다"]


def test_validate_transaction_reports_every_missing_key():
    errors = validate_transaction(2, {})

    assert errors == [
        "2번째 거래: date 키가 없습니다",
        "2번째 거래: department 키가 없습니다",
        "2번째 거래: item 키가 없습니다",
        "2번째 거래: amount 키가 없습니다",
    ]


def test_validate_transaction_rejects_bool_and_zero_amounts():
    base = {"date": "2026-08-01", "department": "영업팀", "item": "교통비"}

    assert validate_transaction(1, {**base, "amount": True}) == [
        "1번째 거래: amount는 0보다 큰 정수여야 합니다"
    ]
    assert validate_transaction(1, {**base, "amount": 0}) == [
        "1번째 거래: amount는 0보다 큰 정수여야 합니다"
    ]


def test_build_report_does_not_change_the_input():
    transactions = [
        {"date": "2026-08-01", "department": " 영업팀 ", "item": "교통비", "amount": 50000}
    ]
    before = deepcopy(transactions)

    report = build_report(transactions)

    assert transactions == before
    assert report["department_totals"] == {"영업팀": 50000}
```

#### 실행 명령: 네 가지 자료 구조 동작 검사하기

프로젝트 루트에서 아래 명령을 실행합니다. `-q`는 통과한 테스트의 긴 세부 내용을 줄여 보여 줍니다.
점 네 개는 테스트 네 개가 각각 통과했다는 뜻이고, 마지막 줄의 `4 passed`가 최종 성공 기준입니다.

```powershell
uv run pytest -q
```

#### 예상 결과: 자동 테스트 네 개 통과하기

점 네 개는 네 테스트가 각각 끝났다는 표시입니다. 마지막 줄이 `4 passed`이면 정상 합계, 필수 키 누락,
잘못된 금액, 부서 공백 정리와 입력 원본 보존의 실제 결과가 코드에 적은 기대값과 모두 같았다는 뜻입니다.

```text
....                                                                     [100%]
4 passed
```

테스트가 통과하면 현재 예제의 선택은 증거를 갖습니다. 마지막에는 새로운 자료를 보았을 때 같은 판단을
반복할 수 있도록 리스트와 딕셔너리 선택 질문을 짧은 절차로 정리합니다.

## 선택 기준을 실제 자료에 적용합니다

### 찾는 방법과 변경 범위 및 실패 조건을 적은 뒤 가장 작은 실행 예제로 확인합니다

![새 자료를 위치와 이름 및 중복과 변경 질문에 통과시켜 알맞은 자료형을 고르는 확인표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1a/1af5971f72c627a61442d4f3c485c184d2a1a2992c7b9719efafca5127148bd8.png "자료형은 괄호 모양을 보고 고르는 것이 아니라 실제로 찾고 바꾸고 검증할 행동으로 결정합니다")

새 자료를 만나면 먼저 값의 모양을 보지 말고 나중에 던질 질문을 적습니다. `첫째와 마지막을 찾는가`가
중요하면 리스트가 가깝습니다. `주문번호로 주문을 찾는가` 또는 `금액이라는 이름으로 값을 찾는가`가
중요하면 딕셔너리가 가깝습니다.

그다음 변경 범위를 정합니다. 순서를 바꾸거나 값을 추가해야 하면 리스트가 맞을 수 있습니다. 키마다
값을 고쳐야 하면 딕셔너리가 맞을 수 있습니다. 만든 뒤 절대 바꾸면 안 되는 순서 묶음은 튜플을,
중복을 없애야 하는 값 모음은 집합을 함께 검토합니다.

마지막으로 실패 조건을 정합니다. 리스트에는 빈 목록과 마지막 인덱스 바로 다음 위치를 넣어 봅니다.
딕셔너리에는 필수 키 누락, 선택 키 누락, 중복 키, 잘못된 자료형을 넣어 봅니다. 정상 입력 하나만
실행하면 자료형의 장점은 보이지만 잘못 선택했을 때의 비용은 보이지 않습니다.

#### 확인 목록: 새 자료에 리스트와 딕셔너리 결정하기

- 값의 **순서와 위치**로 다시 찾으면 `list`를 선택합니다
- 값의 **고유한 이름이나 식별자**로 다시 찾으면 `dict`를 선택합니다
- 여러 기록은 `list`에 넣고 기록 한 건의 필드는 `dict` 키로 표현합니다
- 딕셔너리 키가 모든 행에 있다고 믿지 말고 필수 키를 검사합니다
- `get`은 누락이 정상인 선택 값에만 기본값과 함께 사용합니다
- 원본을 보존해야 하면 바깥 목록과 안쪽 객체의 복사 범위를 함께 확인합니다
- 반복 중인 원본에서 항목을 지우지 말고 새 결과 컨테이너를 만듭니다
- 정상 결과와 누락 및 경계값을 `assert`나 `pytest`로 다시 실행합니다

지금 할 첫 행동은 빈 폴더에 이 글의 세 파일을 그대로 저장하고 `uv run pytest -q`를 실행하는
것입니다. 그다음 `src/transaction_report.py`의 첫 거래 금액을 `0`으로 바꾸고 프로그램을 실행합니다.

정상 건수가 `2`, 제외 건수가 `2`, 정상 합계가 `200,000원`으로 바뀌고 첫 거래 오류가 추가되면
검증 코드가 실제 실행 입력을 걸러 낸 것입니다. 확인 뒤 프로그램 파일의 금액을 `50000`으로 되돌립니다.

테스트 자체의 증거를 보려면 `tests/test_transaction_report.py` 첫 테스트의 첫 거래 금액만 `0`으로
바꾸고 기대값은 그대로 둔 채 `uv run pytest -q`를 실행합니다. 첫 테스트가 실패하면 입력과 기대
결과의 불일치를 테스트가 실제로 잡은 것입니다.

테스트 금액도 `50000`으로 복구한 뒤 네 테스트가 다시 통과하면 위치, 키, 검증의 관계를 직접 설명할
수 있습니다.

#### 참고 자료: Python 공식 문서에서 동작 확인하기

- [Python 자료 구조 튜토리얼](https://docs.python.org/3/tutorial/datastructures.html)
- [Python 리스트와 시퀀스 공식 문서](https://docs.python.org/3/library/stdtypes.html#sequence-types-list-tuple-range)
- [Python 딕셔너리 공식 문서](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict)
- [Python 얕은 복사와 깊은 복사 공식 문서](https://docs.python.org/3/library/copy.html)
- [Python 해시 가능 객체 용어 설명](https://docs.python.org/3/glossary.html#term-hashable)
- [uv 공식 설치 문서](https://docs.astral.sh/uv/getting-started/installation/)
