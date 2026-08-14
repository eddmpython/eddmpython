---
title: Python for문 사용법: 거래 여러 건을 빠짐없이 처리하는 방법
slug: python-for-loop
date: 2026-08-15
modified: 2026-08-15
author: eddmpython
section: Python 기초
summary: Python for문 사용법을 거래 다섯 건과 Excel 파일 세 개로 익힙니다. 합계를 누적하고 순번을 남기며 입력과 출력 건수 및 식별자를 확인합니다.
readerQuestion: Python for문으로 거래가 여러 건이어도 같은 코드를 빠짐없이 실행하려면 어떻게 할까?
readerTakeaway: 목록에서 값을 하나씩 꺼내 처리하고 합계는 반복문 밖에서 시작하며 마지막에 입력과 출력의 건수와 식별자를 비교한다.
readerLevel: beginner
readerStartingPoint: 리스트와 딕셔너리에 거래를 담고 if문으로 한 거래를 분류할 수 있는 상태입니다.
primaryKeyword: Python for문 사용법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/76/76e4b5d693ded21319dd1fab3881528039f25a63c6d11472a4ee62a08dce5493.png
ogImageAlt: 한 거래에 적용한 분류 코드가 다섯 거래 행에 같은 순서로 반복 적용되는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python for문 사용법을 익히면 거래가 다섯 건이든 백 건이든 같은 코드를 한 번씩 적용할 수 있습니다.
복사한 코드를 여러 번 붙이지 않으므로 분류 조건을 고칠 곳도 한 군데로 줄어듭니다.

이 글에서는 거래 목록을 순서대로 읽고 금액 합계를 계산합니다. Excel 파일 세 개에 처리 순번을 붙인
뒤, 입력과 출력의 건수 및 거래 ID를 비교해 누락과 중복이 없는지도 확인합니다.

## for문은 같은 코드를 여러 값에 적용합니다

### 한 거래에서 확인한 분류 동작을 거래 목록의 각 행에 차례로 실행합니다

![한 거래에 적용한 분류 코드가 다섯 거래 행에 같은 순서로 반복 적용되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/76/76e4b5d693ded21319dd1fab3881528039f25a63c6d11472a4ee62a08dce5493.png "코드 한 벌이 거래 목록의 첫 행부터 마지막 행까지 한 번씩 처리합니다")

`for`문은 목록에서 값을 하나씩 꺼내 같은 들여쓰기 코드를 실행합니다. 아래 목록에는 거래 다섯 건이
있습니다. 첫 실행의 `transaction`은 첫 딕셔너리이고 마지막 실행에서는 다섯 번째 딕셔너리입니다.

반복문 안에서는 한 거래만 보고 분류합니다. 금액이 `100000`원 이상이면 고액, 아니면 정상으로
정합니다. 만든 결과 딕셔너리를 `results` 목록 끝에 추가하므로 출력도 다섯 건이 됩니다.

#### 코드

```python
transactions = [
    {"id": "T001", "amount": 50000},
    {"id": "T002", "amount": 120000},
    {"id": "T003", "amount": 80000},
    {"id": "T004", "amount": 150000},
    {"id": "T005", "amount": 30000},
]

results = []
for transaction in transactions:
    status = "고액" if transaction["amount"] >= 100000 else "정상"
    results.append({"id": transaction["id"], "status": status})

print(results)
```

#### 예시

```text
[{'id': 'T001', 'status': '정상'}, {'id': 'T002', 'status': '고액'},
 {'id': 'T003', 'status': '정상'}, {'id': 'T004', 'status': '고액'},
 {'id': 'T005', 'status': '정상'}]
```

## 합계 변수는 반복할 때마다 바뀝니다

### 0에서 시작한 total에 거래 금액을 하나씩 더해 마지막 합계를 만듭니다

![거래 금액 네 개가 반복문을 지나며 누적 합계 막대가 단계마다 길어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/03/03af181d4fe959d36d3a44829e37b9d4b6c080d58613b944682c68388b9affe5.png "현재까지의 합계에 다음 금액을 더할 때마다 합계 막대가 한 단계씩 늘어납니다")

누적 합계는 반복문 밖에서 `0`으로 만들고 반복문 안에서 현재 금액을 더합니다. `total`을 반복문 안에서
매번 `0`으로 만들면 앞에서 더한 금액이 사라지고 마지막 거래 금액만 남습니다.

아래 코드는 다섯 금액을 차례로 더합니다. `print()`를 반복문 안에 두면 `50000`, `170000`,
`250000`, `400000`, `430000`으로 값이 늘어나는 순서를 볼 수 있습니다.

#### 코드

```python
total = 0

for transaction in transactions:
    total = total + transaction["amount"]
    print(transaction["id"], total)
```

#### 예시

```text
T001 50000
T002 170000
T003 250000
T004 400000
T005 430000
```

## enumerate로 파일 순번과 값을 함께 얻습니다

### 세 Excel 파일의 처리 번호와 파일 경로를 한 번에 받아 로그로 남깁니다

![Excel 파일 세 개가 첫 번째부터 세 번째까지 순번과 파일 경로를 함께 받아 처리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ea/eafeb5fbf221b72283e39f4e786cb8969cb0b7e006f357b34b6aeea7fcacd74a.png "점 하나부터 세 개까지의 순번 표시가 각 파일과 같은 순서의 로그 행을 연결합니다")

파일을 여러 개 처리할 때 순번이 있으면 어느 파일에서 멈췄는지 찾기 쉽습니다. `enumerate()`는 목록의
값과 순번을 함께 돌려줍니다. `start=1`을 넣으면 사람이 읽기 쉬운 1번부터 시작합니다.

`Path.glob("*.xlsx")` 결과는 `sorted()`로 정렬합니다. 파일 순서가 매번 같아야 2번 파일에서 오류가
났다는 로그를 다시 확인할 수 있습니다. 파일을 읽기 전과 읽은 뒤에 같은 순번과 경로를 남기면 됩니다.

#### 코드

```python
from pathlib import Path

input_files = sorted(Path("input").glob("*.xlsx"))

for number, file_path in enumerate(input_files, start=1):
    print(number, file_path, "처리 시작")
    # table = pandas.read_excel(file_path)
    print(number, file_path, "처리 완료")
```

#### 예시

```text
1 input/01_sales.xlsx 처리 시작
1 input/01_sales.xlsx 처리 완료
2 input/02_development.xlsx 처리 시작
2 input/02_development.xlsx 처리 완료
3 input/03_operations.xlsx 처리 시작
3 input/03_operations.xlsx 처리 완료
```

## 반복 결과는 건수와 식별자로 확인합니다

### 입력 다섯 건과 출력 다섯 건을 비교해 누락과 중복이 없는지 검사합니다

![입력 거래 다섯 행과 처리 결과 다섯 행이 연결되고 누락과 중복 검사가 모두 통과한 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/89/8919a63fbe36e6325b58021b902636d6fcdcbdde83ab764476afd9d9ad57ccee.png "입력과 출력의 거래 ID가 일대일로 이어지고 건수와 중복 검사가 모두 통과합니다")

오류 없이 다섯 번 실행됐어도 같은 거래를 두 번 넣거나 한 거래를 빠뜨릴 수 있습니다. 그래서 반복이
끝나면 입력 건수와 출력 건수를 비교합니다. 거래마다 고유한 `id`가 있다면 ID 목록도 함께 확인합니다.

아래 검사는 입력과 출력 모두 다섯 건인지, 출력 ID에 중복이 없는지, 입력 ID 집합과 출력 ID 집합이
같은지 확인합니다. 세 `assert`가 모두 통과해야 `반복 결과 검사 통과`가 출력됩니다.

#### 코드

```python
input_ids = [transaction["id"] for transaction in transactions]
output_ids = [result["id"] for result in results]

assert len(results) == len(transactions)
assert len(output_ids) == len(set(output_ids))
assert set(output_ids) == set(input_ids)

print("입력 건수", len(input_ids))
print("출력 건수", len(output_ids))
print(f"중복 ID {len(output_ids) - len(set(output_ids))}개")
print(f"누락 ID {len(set(input_ids) - set(output_ids))}개")
print("반복 결과 검사 통과")
```

#### 예시

```text
입력 건수 5
출력 건수 5
중복 ID 0개
누락 ID 0개
반복 결과 검사 통과
```

#### 참고 자료

- [Python for문 공식 문서](https://docs.python.org/3/tutorial/controlflow.html#for-statements)
- [Python enumerate 공식 문서](https://docs.python.org/3/library/functions.html#enumerate)
