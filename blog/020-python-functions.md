---
title: Python 함수 만들기: 업무 규칙을 한 번만 쓰는 방법
slug: python-functions
date: 2026-08-15
modified: 2026-08-15
author: eddmpython
section: Python 기초
summary: Python 함수 만들기를 거래 분류 규칙으로 익힙니다. 입력과 반환값을 정하고 같은 함수를 재사용하며 작은 함수 네 개로 나누어 결과를 검사합니다.
readerQuestion: Python 함수로 같은 업무 규칙을 여러 거래와 파일에 안전하게 다시 쓰려면 어떻게 할까?
readerTakeaway: 함수의 입력과 반환값을 먼저 정하고 한 함수에는 한 가지 일만 둔 뒤 대표 입력의 기대값과 실제 반환값을 비교한다.
readerLevel: beginner
readerStartingPoint: 딕셔너리 한 건을 if문으로 분류하고 for문으로 거래 목록을 반복할 수 있는 상태입니다.
primaryKeyword: Python 함수 만들기
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0d/0da779c86729a1fdc079e65845337f9364d16374f685e3187ee466e04324de4a.png
ogImageAlt: 거래 기록 한 건이 분류 함수 상자에 들어가 분류 결과 한 개로 나오는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 함수 만들기를 배우면 같은 거래 분류 코드를 여러 파일에 복사하지 않아도 됩니다. 기준이
바뀌었을 때 함수 한 곳만 고치면 그 함수를 부르는 모든 코드에 같은 규칙이 적용됩니다.

이 글에서는 거래 한 건을 받아 분류 결과를 돌려주는 함수를 만듭니다. 거래 세 건에서 같은 함수를
사용하고 읽기, 정리, 분류, 검증을 작은 함수로 나눈 뒤 대표 입력 세 개의 결과를 확인합니다.

## 함수는 입력을 받아 결과를 돌려줍니다

### 거래 한 건을 분류 함수에 넣고 정상 또는 확인필요 결과 하나를 받습니다

![거래 기록 한 건이 분류 함수 상자에 들어가 분류 결과 한 개로 나오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0d/0da779c86729a1fdc079e65845337f9364d16374f685e3187ee466e04324de4a.png "거래 한 행이 함수 입력으로 들어가 조건을 거친 뒤 분류 결과 하나로 나옵니다")

함수는 반복해서 쓸 코드에 이름을 붙이고 입력과 반환값을 정한 묶음입니다. `def` 다음에는 함수 이름을
적고 괄호 안에는 입력을 적습니다. `return`을 만나면 함수 실행을 끝내고 결과를 호출한 곳에 돌려줍니다.

아래 함수의 입력은 거래 딕셔너리 한 개이고 반환값은 `취소`, `확인필요`, `정상` 중 하나입니다.
`classify_transaction(transaction)`을 실행한 결과를 `status` 변수에 받아 출력할 수 있습니다.

#### 코드

```python
def classify_transaction(transaction):
    amount = transaction["amount"]
    department = transaction.get("department", "")

    if amount < 0:
        return "취소"
    if department == "" or amount >= 100000:
        return "확인필요"
    return "정상"


transaction = {"id": "T001", "department": "영업팀", "amount": 50000}
status = classify_transaction(transaction)
print(status)
```

#### 예시

```text
정상
```

## 같은 업무 규칙을 여러 입력에 다시 씁니다

### 분류 코드를 한 번 정의하고 서로 다른 거래 세 건에서 같은 함수를 호출합니다

![같은 분류 함수가 서로 다른 거래 세 건에 호출되어 각 결과를 돌려주는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/66/66dcdfb2a1462891e70b50e27b669fd8a5bda511db957d57558b2917fba6c0d3.png "서로 다른 거래 세 건이 복사되지 않은 함수 하나를 호출해 각자의 결과를 받습니다")

함수가 없으면 같은 조건문을 파일마다 복사하게 됩니다. 한 복사본에서 기준을 `100000`원으로 바꾸고
다른 복사본을 놓치면 같은 거래가 파일마다 다르게 분류됩니다. 함수 하나를 호출하면 기준을 고칠 곳도
하나입니다.

반복문 안에서 함수를 호출하면 거래마다 같은 순서로 조건을 확인합니다. 아래 세 거래는 각각 정상,
확인필요, 취소가 됩니다. 반복문은 거래를 꺼내고 함수는 한 거래의 분류만 맡습니다.

#### 코드

```python
transactions = [
    {"id": "T001", "department": "영업팀", "amount": 50000},
    {"id": "T002", "department": "개발팀", "amount": 120000},
    {"id": "T003", "department": "영업팀", "amount": -50000},
]

for transaction in transactions:
    status = classify_transaction(transaction)
    print(transaction["id"], status)
```

#### 예시

```text
T001 정상
T002 확인필요
T003 취소
```

## 함수 하나에는 한 가지 일만 둡니다

### 파일 읽기와 값 정리 및 분류와 검증을 네 함수로 나누어 오류 위치를 찾습니다

![파일 읽기와 거래 정리 및 분류와 검증 네 함수가 순서대로 연결된 작은 자동화 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9c/9ca88b95015b6c2284c1c80dca967dfe0d9997999ed508974f41571647242bee.png "Excel 파일이 읽기와 값 정리 및 분류와 검증 함수를 차례로 지나 결과를 만듭니다")

함수 이름에 `그리고`가 들어가면 두 가지 일을 묶었는지 확인합니다. `read_and_clean_and_classify()`보다
`read_transactions()`, `clean_transactions()`, `classify_transactions()`처럼 실제 작업별로 나누면
오류가 난 함수를 바로 찾을 수 있습니다.

아래 네 함수는 Excel 읽기, 금액 정리, 거래 분류, 결과 검사를 각각 맡습니다. 금액 변환 오류는
`clean_transactions()`에서 나고 건수 차이는 `validate_results()`에서 납니다. 함수 이름만 읽어도
어느 값을 넣고 어느 결과를 받아야 하는지 알 수 있습니다.

#### 코드

```python
import pandas as pd


def read_transactions(file_path):
    return pd.read_excel(file_path).to_dict(orient="records")


def clean_transactions(rows):
    cleaned = []
    for row in rows:
        row["amount"] = int(row["amount"])
        cleaned.append(row)
    return cleaned


def classify_transactions(rows):
    return [
        {**row, "status": classify_transaction(row)}
        for row in rows
    ]


def validate_results(input_rows, output_rows):
    assert len(input_rows) == len(output_rows)
    assert all("status" in row for row in output_rows)
```

#### 확인 목록

- `read_transactions()`는 Excel 내용을 목록으로 돌려줍니다.
- `clean_transactions()`는 금액을 정수로 바꿉니다.
- `classify_transactions()`는 거래마다 분류 결과를 붙입니다.
- `validate_results()`는 입력과 출력 건수 및 결과 열을 확인합니다.

## 함수는 입력과 반환값으로 확인합니다

### 정상과 경계값 및 취소 거래를 넣어 기대 결과와 실제 반환값을 비교합니다

![분류 함수에 정상과 경계 및 취소 거래를 넣어 기대 반환값과 실제 반환값을 비교하는 표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/18/18c736933d9d390de5fa78dc75054b559cbfd3c522c6335a4b5550e616f8c7d1.png "대표 거래 세 건의 기대 결과와 함수가 돌려준 실제 결과가 같은지 행마다 검사합니다")

함수 검사는 입력과 기대 반환값을 한 줄씩 짝지으면 됩니다. 정상 금액, 기준과 같은 금액, 음수 금액을
대표 입력으로 고르면 세 반환 경로를 모두 실행할 수 있습니다. 부서 누락도 한 줄 더 추가할 수 있습니다.

`assert actual == expected`가 실패하면 입력과 기대값 및 실제값을 함께 보여 줍니다. 세 입력이 모두
맞으면 마지막 문장이 출력됩니다. 분류 기준을 고친 뒤에도 같은 검사를 다시 실행합니다.

#### 코드

```python
test_cases = [
    ({"department": "영업팀", "amount": 50000}, "정상"),
    ({"department": "영업팀", "amount": 100000}, "확인필요"),
    ({"department": "영업팀", "amount": -50000}, "취소"),
]

for transaction, expected in test_cases:
    actual = classify_transaction(transaction)
    assert actual == expected, (transaction, expected, actual)

print("함수 검사 통과")
```

#### 예시

```text
함수 검사 통과
```

#### 참고 자료

- [Python 함수 정의 공식 문서](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)
