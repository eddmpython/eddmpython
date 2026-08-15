---
title: Excel과 DataFrame 차이: 시트와 행 및 열은 어떻게 보일까
slug: excel-dataframe-map
author: eddmpython
section: Excel 업무자동화
summary: Excel DataFrame 차이를 시트와 5행 4열 표로 설명합니다. shape와 columns 및 dtypes를 확인하고 loc로 거래 ID와 열 이름을 선택합니다.
readerQuestion: Excel의 통합문서와 시트 및 행과 열은 pandas DataFrame에서 무엇으로 보일까?
readerTakeaway: 선택한 시트는 DataFrame 하나가 되고 shape는 데이터 행과 열 수를 보여 주며 columns와 dtypes 및 loc로 표를 확인하고 선택한다.
readerLevel: beginner
readerStartingPoint: pandas와 openpyxl을 설치하고 Excel 파일 경로를 Python 코드에 넣을 수 있는 상태입니다.
primaryKeyword: Excel DataFrame 차이
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/49/497c48cf54ac124b1898d8c3c29a69dc7ae99f9d1e667c505c5afc3951206c13.png
ogImageAlt: Excel 통합문서의 선택한 시트 한 장이 같은 행과 열을 가진 DataFrame 표로 읽히는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Excel DataFrame 차이를 모르고 자동화를 시작하면 화면의 2행과 코드의 인덱스 `0`이 왜 같은 거래인지
헷갈립니다. 시트 이름을 빼먹어 엉뚱한 표를 읽거나 숫자처럼 보이는 문자를 더할 수도 있습니다.

이 글에서는 거래 다섯 행을 읽어 `shape`, `columns`, `index`, `dtypes`를 출력합니다. 마지막에는
거래 ID와 열 이름으로 한 셀과 작은 부분표를 선택해 Excel 표와 코드 결과를 연결합니다.

## Excel 시트 하나를 DataFrame 하나로 읽습니다

### 통합문서에서 선택한 시트의 머리글과 다섯 행을 pandas 표로 가져옵니다

![Excel 통합문서의 선택한 시트 한 장이 같은 행과 열을 가진 DataFrame 표로 읽히는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/49/497c48cf54ac124b1898d8c3c29a69dc7ae99f9d1e667c505c5afc3951206c13.png "선택한 Excel 탭의 머리글과 다섯 데이터 행이 같은 위치의 DataFrame으로 옮겨집니다")

Excel 파일 하나에는 시트가 여러 개 있을 수 있지만 `read_excel()`은 선택한 시트를 DataFrame으로 돌려줍니다.
`sheet_name="거래내역"`을 적으면 다른 시트의 설명이나 요약표를 잘못 읽는 일을 막을 수 있습니다.

기본값 `header=0`은 시트의 첫 줄을 열 이름으로 사용합니다. 따라서 Excel 화면의 첫 줄은 DataFrame의
데이터 행에 포함되지 않습니다. 아래 `table`에는 머리글 아래 거래 다섯 건만 들어갑니다.

#### 코드

```python
from pathlib import Path

import pandas as pd

input_file = Path("input/expense_sample.xlsx")
table = pd.read_excel(input_file, sheet_name="거래내역")

print(table)
```

#### 예시

```text
   거래ID         거래일   부서      금액
0  T001  2026-08-01  영업팀   50000
1  T002  2026-08-02  개발팀  120000
2  T003  2026-08-03  운영팀   80000
3  T004  2026-08-04  영업팀  150000
4  T005  2026-08-05  개발팀   30000
```

#### 참고 자료

- [pandas read_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html)

## 행과 열은 shape와 columns로 확인합니다

### 다섯 행과 네 열을 숫자로 보고 열 이름과 인덱스를 따로 구분합니다

![DataFrame 표에서 다섯 데이터 행과 네 열 및 왼쪽 인덱스가 서로 다른 색으로 표시된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9b/9b618344c542a1e5221a83f51d169d362b038c2b512e8c756fe43428311cbe07.png "머리글과 인덱스를 데이터 셀과 나누고 표의 크기를 5행과 4열로 확인합니다")

`table.shape`는 데이터 행 수와 열 수를 두 숫자로 돌려줍니다. 예제에서는 `(5, 4)`입니다. Excel의
머리글 한 줄은 데이터 행 수에 들어가지 않고 DataFrame이 화면 왼쪽에 보이는 인덱스도 열 수에 들어가지
않습니다.

`table.columns`는 네 열 이름을 순서대로 보여 줍니다. `table.index`는 기본으로 `0`부터 `4`까지입니다.
Excel 화면에서는 머리글이 1행이므로 첫 거래가 2행이지만 DataFrame의 첫 거래 인덱스는 `0`입니다.

#### 코드

```python
print("표 크기", table.shape)
print("열 이름", table.columns.tolist())
print("인덱스", table.index.tolist())
```

#### 예시

```text
표 크기 (5, 4)
열 이름 ['거래ID', '거래일', '부서', '금액']
인덱스 [0, 1, 2, 3, 4]
```

## 셀 모양과 자료형은 서로 다릅니다

### 날짜와 문자열 및 숫자 열을 dtypes로 확인해 계산 가능한 금액을 구분합니다

![날짜와 부서 및 금액 열이 각각 날짜형과 문자열형 및 정수형 자료형 카드와 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/dc/dc7fc4cb85aea713ff43c2dbc40188ec3495aaf78bd0be5bf0df7c4c43b9cf05.png "각 열이 pandas 자료형과 연결되고 문자가 섞인 금액 셀은 숫자 검사에서 경고를 냅니다")

Excel 화면에서 금액처럼 보여도 pandas가 문자열로 읽으면 숫자 합계를 바로 구할 수 없습니다. 쉼표가
들어간 `"50,000원"`이나 문자 `"오만원"`이 한 셀에 있으면 금액 열 전체가 문자열 자료형이 될 수
있습니다.

`dtypes`로 먼저 확인하고 날짜는 `to_datetime`, 금액은 `to_numeric`으로 바꿉니다. 바꾸지 못한 값은
`errors="coerce"`를 썼을 때 `NaT` 또는 `NaN`이 되므로 개수를 세어 확인필요 목록으로 보낼 수 있습니다.

#### 코드

```python
print(table.dtypes)

table["거래일"] = pd.to_datetime(table["거래일"], errors="coerce")
table["금액"] = pd.to_numeric(table["금액"], errors="coerce")

invalid_dates = table["거래일"].isna().sum()
invalid_amounts = table["금액"].isna().sum()

print("날짜 오류", invalid_dates)
print("금액 오류", invalid_amounts)
```

#### 예시

```text
날짜 오류 0
금액 오류 0
```

## loc로 행과 열을 이름으로 고릅니다

### 거래 ID와 열 이름을 함께 써서 한 값이나 필요한 부분표를 선택합니다

![DataFrame 전체 표에서 특정 거래 ID 행과 금액 열이 교차하는 한 셀이 선택되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/395a2dbb2dc845b92619ed0791b5e6c50aaf31b6485c37f093d36c06fb313ea4.png "선택한 거래 ID 행과 금액 열이 만나는 셀을 찾고 두 거래의 작은 부분표도 꺼냅니다")

`loc`는 행 이름과 열 이름으로 값을 고릅니다. 먼저 `set_index("거래ID")`로 거래 ID를 행 이름으로
바꾸면 `T003` 거래와 `금액` 열이 만나는 값 `80000`을 바로 찾을 수 있습니다.

행 이름과 열 이름을 목록으로 주면 작은 부분표도 얻습니다. 아래 두 번째 선택은 `T002`, `T003` 두
거래에서 `부서`, `금액` 두 열만 꺼냅니다. 원본 DataFrame은 바뀌지 않습니다.

#### 코드

```python
by_id = table.set_index("거래ID")

amount = by_id.loc["T003", "금액"]
subset = by_id.loc[["T002", "T003"], ["부서", "금액"]]

print(amount)
print(subset)
```

#### 예시

```text
80000
         부서      금액
거래ID
T002    개발팀  120000
T003    운영팀   80000
```

#### 참고 자료

- [pandas DataFrame 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html)
- [pandas 표 데이터 입문 공식 문서](https://pandas.pydata.org/docs/getting_started/intro_tutorials/01_table_oriented.html)
