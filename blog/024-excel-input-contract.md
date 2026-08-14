---
title: Excel 입력 계약이 필요한 이유: 틀린 파일을 먼저 멈추기
slug: excel-input-contract
date: 2026-08-15
modified: 2026-08-15
author: eddmpython
section: Excel 업무자동화
summary: Excel 입력 계약으로 파일 이름과 시트 및 필수 열과 자료형과 빈값 기준을 검사합니다. 정상 파일은 통과하고 깨진 파일은 계산 전에 멈춥니다.
readerQuestion: Excel 자동화가 잘못된 파일로 조용히 틀리지 않게 입력 조건을 어떻게 정하고 검사할까?
readerTakeaway: 정상 입력의 다섯 조건을 표로 정하고 계산 전에 파일과 시트와 열 및 셀 값을 검사한 뒤 정상과 깨진 예제로 실패 동작까지 확인한다.
readerLevel: beginner
readerStartingPoint: pandas read_excel로 시트 하나를 DataFrame으로 읽고 shape와 columns를 확인할 수 있는 상태입니다.
primaryKeyword: Excel 입력 계약
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a1/a154773eb3746dcdc4d52ed3d84ab9475cec5cd29771c5bff2fca762cbe106bf.png
ogImageAlt: Excel 입력 계약표에 파일 이름과 시트와 필수 열과 자료형 및 빈값 허용 여부 다섯 줄이 정리된 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Excel 입력 계약이 없으면 `금액` 열이 `합계금액`으로 바뀐 파일도 코드가 읽은 것처럼 보일 수 있습니다.
나중에 빈 결과나 틀린 합계를 발견하면 어느 입력부터 잘못됐는지 찾는 데 시간이 걸립니다.

이 글에서는 정상 파일의 조건 다섯 개를 먼저 적습니다. 파일과 시트 및 필수 열을 확인하고 날짜와 금액
변환 및 빈값을 검사합니다. 마지막에는 정상 파일과 필수 열이 빠진 파일을 같은 코드로 실행합니다.

## 입력 계약에는 다섯 항목을 적습니다

### 파일 이름과 시트와 필수 열과 자료형 및 빈값 허용 여부를 표로 고정합니다

![Excel 입력 계약표에 파일 이름과 시트와 필수 열과 자료형 및 빈값 허용 여부 다섯 줄이 정리된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a1/a154773eb3746dcdc4d52ed3d84ab9475cec5cd29771c5bff2fca762cbe106bf.png "샘플 Excel의 파일과 시트와 열과 셀 값이 계약표의 다섯 검사 항목과 각각 연결됩니다")

입력 계약은 자동화가 어떤 Excel 파일을 정상 입력으로 받을지 적은 검사표입니다. 담당자가 알고 있는
암묵적인 조건을 파일 이름, 시트, 필수 열, 자료형, 빈값 허용 여부로 바꾸면 코드도 같은 기준을 검사할
수 있습니다.

예제에서는 `expense_*.xlsx`만 입력으로 받고 `거래내역` 시트를 읽습니다. `거래ID`, `거래일`, `부서`,
`금액` 네 열은 필수입니다. 거래 ID와 날짜 및 금액은 비어 있으면 안 되고 부서만 확인필요 대상으로
보낼 수 있습니다.

#### 예시

| 항목 | 정상 입력 기준 |
| --- | --- |
| 파일 이름 | `expense_*.xlsx` |
| 시트 이름 | `거래내역` |
| 필수 열 | `거래ID`, `거래일`, `부서`, `금액` |
| 자료형 | 거래일은 날짜, 금액은 숫자로 변환 가능 |
| 빈값 | 거래ID와 거래일 및 금액은 빈값 0개 |

#### 코드

```python
CONTRACT = {
    "file_pattern": "expense_*.xlsx",
    "sheet_name": "거래내역",
    "required_columns": {"거래ID", "거래일", "부서", "금액"},
    "not_null_columns": {"거래ID", "거래일", "금액"},
}
```

## 파일과 시트 및 필수 열을 먼저 검사합니다

### 데이터를 합치기 전에 파일 이름과 시트 존재 및 네 열을 순서대로 확인합니다

![Excel 파일이 파일 이름과 시트 탭 및 필수 열 세 검사를 지나고 누락 열 파일은 중단되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/94/9472eda159666363665e858a5f347e5363ece27c3cf01a747291518268f9c9c3.png "정상 파일은 세 검사를 통과하고 금액 열이 빠진 파일은 계산 전에 멈춥니다")

필수 열 검사는 금액 합계나 부서별 집계를 시작하기 전에 실행해야 합니다. 입력 폴더에서 패턴에 맞는
파일을 찾지 못하면 빈 결과를 저장하지 않고 `입력 파일 없음` 오류로 끝냅니다.

파일을 찾으면 `ExcelFile.sheet_names`로 시트가 있는지 확인합니다. 표를 읽은 뒤에는 필수 열 집합에서
실제 열 집합을 빼 누락된 이름을 구합니다. 오류 문장에는 파일 이름과 빠진 열을 함께 넣습니다.

#### 코드

```python
from pathlib import Path

import pandas as pd


def read_contract_table(path):
    workbook = pd.ExcelFile(path)
    sheet_name = CONTRACT["sheet_name"]
    if sheet_name not in workbook.sheet_names:
        raise ValueError(f"{path.name}: 시트 누락: {sheet_name}")

    table = pd.read_excel(path, sheet_name=sheet_name)
    missing = CONTRACT["required_columns"] - set(table.columns)
    if missing:
        names = ", ".join(sorted(missing))
        raise ValueError(f"{path.name}: 필수 열 누락: {names}")
    return table


input_files = sorted(Path("input").glob(CONTRACT["file_pattern"]))
if not input_files:
    raise FileNotFoundError("입력 파일 없음: input/expense_*.xlsx")
```

#### 예시

```text
expense_broken.xlsx: 필수 열 누락: 금액
```

## 자료형과 빈값 허용 여부를 검사합니다

### 날짜와 금액을 변환하고 필수 열의 빈 셀 개수를 세어 오류 행을 찾습니다

![거래일과 부서 및 금액 열의 자료형과 빈값 수가 허용 기준표와 비교되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/09/0979bf850559ea1d9f585f2cfc6b526e29dd2aa15f02814dedf49ef3f9d99705.png "날짜와 금액 변환 실패 및 허용되지 않은 빈 셀이 두 행짜리 오류표로 모입니다")

열이 있다는 사실만으로 그 안의 값까지 올바른 것은 아닙니다. `거래일`에 `미정`, `금액`에 `오만원`이
들어가거나 `거래ID`가 비어 있으면 행은 존재해도 자동 계산에 사용할 수 없습니다.

날짜와 금액을 변환한 뒤 원래 값은 있는데 변환 결과가 빈 행을 찾습니다. 필수 값의 빈 셀도 열별로
셉니다. 오류 행을 버리지 않고 파일 이름과 원래 행 번호를 붙여 확인필요 표로 남기면 수정하기 쉽습니다.

#### 코드

```python
def validate_values(table):
    checked = table.copy()
    checked["거래일"] = pd.to_datetime(checked["거래일"], errors="coerce")
    checked["금액"] = pd.to_numeric(checked["금액"], errors="coerce")

    null_counts = checked[list(CONTRACT["not_null_columns"])].isna().sum()
    invalid = checked[
        checked[list(CONTRACT["not_null_columns"])].isna().any(axis=1)
    ]

    if not invalid.empty:
        details = null_counts[null_counts > 0].to_dict()
        raise ValueError(f"필수 값 오류: {details}; 행: {invalid.index.tolist()}")
    return checked
```

#### 예시

```text
필수 값 오류: {'거래일': 1, '금액': 1}; 행: [2, 4]
```

## 정상 파일과 깨진 파일을 함께 실행합니다

### 완전한 입력은 통과하고 필수 열 누락 입력은 정확한 오류를 내는지 확인합니다

![정상 Excel은 모든 입력 검사를 통과하고 필수 열이 빠진 Excel은 이름이 있는 오류로 끝나는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1f/1f240a70942f0a8d9b8467bd1242c5ba03fada5cb84e8285a29f94b9388d86dc.png "완전한 표와 금액 열이 빠진 표가 하나의 검사기를 지나 각각 통과와 오류 결과를 냅니다")

검사 코드는 정상 파일만 넣어 보면 실패할 때의 동작을 알 수 없습니다. 같은 다섯 행에서 정상 파일과
`금액` 열을 제거한 깨진 파일을 만들면 통과 경로와 필수 열 오류 경로를 모두 확인할 수 있습니다.

아래 예제는 두 파일을 차례로 검사합니다. 정상 파일은 `PASS 5행`을 출력하고 깨진 파일은 파일 이름과
누락 열을 출력합니다. 깨진 파일이 조용히 빈 표로 처리되면 계약 검사가 실패한 것입니다.

#### 코드

```python
sample = pd.DataFrame(
    {
        "거래ID": ["T001", "T002", "T003", "T004", "T005"],
        "거래일": pd.date_range("2026-08-01", periods=5),
        "부서": ["영업팀", "개발팀", "운영팀", "영업팀", "개발팀"],
        "금액": [50000, 120000, 80000, 150000, 30000],
    }
)

fixtures = Path("input_fixtures")
fixtures.mkdir(exist_ok=True)
sample.to_excel(fixtures / "expense_valid.xlsx", sheet_name="거래내역", index=False)
sample.drop(columns=["금액"]).to_excel(
    fixtures / "expense_broken.xlsx",
    sheet_name="거래내역",
    index=False,
)

for path in sorted(fixtures.glob("expense_*.xlsx")):
    try:
        table = validate_values(read_contract_table(path))
        print(path.name, "PASS", len(table), "행")
    except ValueError as error:
        print("FAIL", error)
```

#### 예시

```text
FAIL expense_broken.xlsx: 필수 열 누락: 금액
expense_valid.xlsx PASS 5행
```

#### 참고 자료

- [pandas read_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html)
