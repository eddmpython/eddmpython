---
title: Python Excel 파일 합치기: 3개를 4개 시트로 만드는 방법
slug: python-excel-merge
date: 2026-08-14
modified: 2026-08-14
author: eddmpython
section: Excel 업무자동화
summary: Python Excel 파일 합치기를 부서별 지출내역 3개로 실습합니다. pandas로 행을 모으고 요약과 확인필요를 계산해 4개 시트로 저장합니다.
readerQuestion: Python으로 폴더 속 Excel 파일 세 개를 합치고 통합내역과 부서별요약 및 확인필요와 검증결과를 어떻게 만들까?
readerTakeaway: pathlib로 입력 파일을 찾고 pandas로 읽은 표를 concat한 뒤 검토 행과 부서별 합계를 계산해 ExcelWriter로 네 시트에 저장한다.
readerLevel: beginner
readerStartingPoint: pathlib와 pandas 및 uv 환경을 준비했고 한 개의 Excel 파일을 읽는 코드는 실행할 수 있다.
primaryKeyword: Python Excel 파일 합치기
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3f/3f7cdbee8b354ebf5ea304538f85bd5748a66163adf00f53aa3ce7dcd906cc7c.png
ogImageAlt: 부서별 Excel 파일 세 개가 통합내역과 부서별요약 및 확인필요와 검증결과 시트가 있는 결과 파일로 합쳐지는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python Excel 파일 합치기는 파일을 한곳에 복사하는 작업이 아닙니다. 부서별 지출내역의 행을 빠짐없이
모으고, 금액을 계산 가능한 숫자로 바꾸며, 사람이 확인할 행과 맞아야 할 숫자까지 결과에 남겨야
합니다.

이 글에서는 합성 지출내역 Excel 파일 세 개와 아홉 행을 만듭니다. `uv run python src/main.py` 한
줄로 `output/expense_result.xlsx`를 만들고 네 시트와 총금액 `597,000원`을 확인합니다.

## 완성할 Excel 결과부터 확인합니다

### 입력 파일 세 개가 역할이 다른 결과 시트 네 개로 저장되어야 작업이 끝납니다

![부서별 Excel 파일 세 개가 통합내역과 부서별요약 및 확인필요와 검증결과 시트가 있는 결과 파일로 합쳐지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3f/3f7cdbee8b354ebf5ea304538f85bd5748a66163adf00f53aa3ce7dcd906cc7c.png "통합만 하는 것이 아니라 계산 결과와 검토 대상 및 맞아야 할 숫자를 한 파일에 함께 저장합니다")

`input` 폴더에는 영업팀, 관리팀, 개발팀 파일이 하나씩 있습니다. 모든 파일은 `일자`, `부서`, `항목`,
`금액`, `비고` 열을 사용합니다. 자동화는 이 세 파일을 읽고 `output/expense_result.xlsx` 하나를 새로
만듭니다.

결과의 `01_통합내역`은 원본 아홉 행과 원본파일 이름을 보존합니다. `02_부서별요약`은 부서별 거래
건수와 합계를 보여 줍니다. `03_확인필요`에는 10만원 이상, 부서 누락, 숫자가 아닌 금액을 모읍니다.
`04_검증결과`에는 파일 수와 행 수 및 계산 가능한 총금액을 적습니다.

#### 설명 목록

```text
입력: input/*.xlsx 세 개, 모두 아홉 행
출력: output/expense_result.xlsx 한 개
시트 1: 01_통합내역
시트 2: 02_부서별요약
시트 3: 03_확인필요
시트 4: 04_검증결과
완성 숫자: 계산 가능한 금액 합계 597,000원
```

## 합성 Excel 입력 세 개를 만듭니다

### 실제 회사 자료 대신 아홉 행의 연습 파일로 전체 코드를 안전하게 실행합니다

![영업팀과 관리팀 및 개발팀의 합성 지출 행이 각각 Excel 입력 파일 세 개로 저장되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6d/6d0137c63e4362b0ac8bdb08cea4188dc6e2af083f3523bef50639fa2af29948.png "빈 부서와 문자 금액 및 10만원 이상 거래를 일부러 넣어 확인필요 규칙까지 시험합니다")

실제 지출내역에는 이름, 거래처, 계좌처럼 공개하면 안 되는 값이 들어갈 수 있습니다. 코드를 처음
시험할 때는 실제 파일을 복사하지 말고 열 이름과 값의 종류만 닮은 합성 자료를 만듭니다. 아래
`src/make_sample.py`는 세 파일과 아홉 행을 생성합니다.

관리팀 파일에는 부서가 빈 행을, 개발팀 파일에는 `금액미정`이라는 문자 금액을 넣었습니다. 영업팀의
`120000`원과 관리팀의 `150000`원은 10만원 이상입니다. 정상 행만 있는 자료보다 오류와 경계값이 있는
자료가 검사 코드를 확인하기 좋습니다.

#### 코드

```python
from pathlib import Path

import pandas as pd

project_root = Path(__file__).resolve().parents[1]
input_dir = project_root / "input"
input_dir.mkdir(exist_ok=True)

samples = {
    "sales.xlsx": [
        ["2026-08-01", "영업팀", "교통비", 45000, "출장"],
        ["2026-08-02", "영업팀", "광고비", 120000, "사전승인"],
        ["2026-08-03", "영업팀", "소모품", 32000, ""],
    ],
    "admin.xlsx": [
        ["2026-08-01", "관리팀", "사무용품", 80000, ""],
        ["2026-08-04", "관리팀", "교육비", 150000, "검토"],
        ["2026-08-04", "", "택배비", 50000, "부서 누락"],
    ],
    "dev.xlsx": [
        ["2026-08-05", "개발팀", "클라우드", 90000, ""],
        ["2026-08-06", "개발팀", "장비", "금액미정", "금액 확인"],
        ["2026-08-07", "개발팀", "도서", 30000, ""],
    ],
}

columns = ["일자", "부서", "항목", "금액", "비고"]
for file_name, rows in samples.items():
    pd.DataFrame(rows, columns=columns).to_excel(
        input_dir / file_name,
        index=False,
        engine="openpyxl",
    )

print(f"합성 입력 {len(samples)}개 생성")
```

#### 코드

```powershell
uv run python src/make_sample.py
Get-ChildItem input -Filter *.xlsx
```

## 파일을 찾고 열 이름을 검사합니다

### glob으로 xlsx만 모은 뒤 필수 열이 빠진 파일은 이름과 함께 즉시 멈춥니다

![input 폴더에서 xlsx 파일 세 개만 선택하고 각 파일의 필수 열 다섯 개를 검사하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e8/e8534d208108394c640c39165b57676b68ac5ffdd3c158e69bfa4e6ebc4aad91.png "파일을 합치기 전에 열 이름을 검사하면 한 파일의 잘못된 형식이 결과 전체에 섞이지 않습니다")

`Path.glob("*.xlsx")`는 input 폴더 바로 아래의 Excel 파일만 찾습니다. `sorted`로 파일 순서를 고정하면
실행할 때마다 통합 행 순서도 같아집니다. 파일이 하나도 없으면 빈 결과를 만들지 않고
`FileNotFoundError`로 멈춥니다.

각 파일을 읽은 직후 필수 열 다섯 개를 검사합니다. 예를 들어 `금액`이 `사용금액`으로 바뀐 파일은
조용히 빈 열을 만들지 않고 파일 이름과 빠진 열을 오류에 적습니다. 검사를 통과한 표에는 `원본파일`
열을 추가해 각 행의 출처를 남깁니다.

#### 코드

```python
required_columns = ["일자", "부서", "항목", "금액", "비고"]
input_files = sorted(input_dir.glob("*.xlsx"))

if not input_files:
    raise FileNotFoundError(f"입력 Excel 파일이 없습니다: {input_dir}")

tables = []
for input_file in input_files:
    table = pd.read_excel(input_file)
    missing = [name for name in required_columns if name not in table.columns]
    if missing:
        raise ValueError(f"{input_file.name} 필수 열 누락: {missing}")

    table = table[required_columns].copy()
    table["원본파일"] = input_file.name
    tables.append(table)

merged = pd.concat(tables, ignore_index=True)
```

#### 참고 자료

- [Python pathlib의 glob 공식 문서](https://docs.python.org/3/library/pathlib.html#pathlib.Path.glob)
- [pandas concat 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.concat.html)

## 금액을 바꾸고 확인필요를 표시합니다

### 숫자로 바꿀 수 없는 금액과 빈 부서 및 10만원 이상 행에 이유를 남깁니다

![통합 표의 금액과 부서 값이 세 가지 검사 조건을 지나 확인필요 이유가 붙는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f641a021d6e903b48b5092c01e27d73e1faafe192cb462b75db0118b754e7646.png "원본 행을 버리지 않고 어느 조건에 걸렸는지 별도 열에 적어 사람이 다시 확인할 수 있게 합니다")

Excel 한 열에는 숫자 `90000`과 문자 `금액미정`이 함께 들어갈 수 있습니다. `pd.to_numeric`에
`errors="coerce"`를 사용하면 숫자로 바꿀 수 없는 값이 결측값으로 바뀝니다. 원문을 잃지 않도록 변환
전에 `금액_원문` 열에 복사합니다.

행마다 빈 부서, 숫자가 아닌 금액, 10만원 이상을 검사해 `확인필요_이유`에 모두 적습니다. 10만원
이상이라고 자동으로 삭제하거나 승인하지 않습니다. 사람이 확인할 목록으로 보내고 통합내역에는 원본
행을 그대로 남깁니다.

#### 코드

```python
merged["금액_원문"] = merged["금액"]
merged["금액"] = pd.to_numeric(merged["금액"], errors="coerce")

def review_reason(row):
    reasons = []
    if pd.isna(row["부서"]) or not str(row["부서"]).strip():
        reasons.append("부서 누락")
    if pd.isna(row["금액"]):
        reasons.append("금액 확인")
    elif row["금액"] >= 100000:
        reasons.append("10만원 이상")
    return ", ".join(reasons)

merged["확인필요_이유"] = merged.apply(review_reason, axis=1)
review = merged[merged["확인필요_이유"].ne("")].copy()
```

#### 참고 자료

- [pandas to_numeric 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html)
- [pandas 결측값 검사 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.isna.html)

## 부서별 건수와 금액을 계산합니다

### 부서와 금액이 있는 행만 묶어 거래건수와 합계금액 두 열을 만듭니다

![계산 가능한 통합 행이 부서별 세 묶음으로 나뉘고 각 묶음의 건수와 합계 카드가 만들어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/57/578fe6c397e55ba2f0090f5444ef1c42897e01fbf87736e73281592156a92d37.png "검토 행을 숨기지 않으면서 숫자 계산이 가능한 행만 부서별요약에 사용합니다")

부서가 비어 있거나 금액을 숫자로 바꾸지 못한 행은 정확한 부서별 합계에 넣을 수 없습니다. 이 행은
`03_확인필요`에 보존하고, `02_부서별요약` 계산에서는 제외합니다. 10만원 이상 행은 숫자와 부서가
정상이므로 합계에 포함합니다.

`groupby("부서")`는 같은 부서의 행을 묶습니다. `agg`에서 `size`로 거래건수를, `sum`으로 합계금액을
계산합니다. `as_index=False`를 사용하면 부서 이름이 일반 Excel 열로 저장됩니다.

#### 코드

```python
department_ok = merged["부서"].notna() & merged["부서"].astype("string").str.strip().ne("")
amount_ok = merged["금액"].notna()
summary_source = merged[department_ok & amount_ok]

summary = (
    summary_source.groupby("부서", as_index=False)
    .agg(
        거래건수=("금액", "size"),
        합계금액=("금액", "sum"),
    )
    .sort_values("부서")
)
```

#### 참고 자료

- [pandas groupby 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.groupby.html)

## 네 시트를 한 결과 파일에 저장합니다

### ExcelWriter 안에서 네 표를 쓰고 머리글 고정과 필터까지 적용합니다

![통합내역과 부서별요약 및 확인필요와 검증결과 표가 ExcelWriter를 통해 한 통합문서의 네 시트가 되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f1/f19c9c343bb1ae94e260a80dc3778a55417f5c5ad729657ab8d28baac057d181.png "같은 ExcelWriter 안에서 서로 다른 시트 이름을 지정하면 한 결과 파일에 네 표가 저장됩니다")

`pd.ExcelWriter`를 `with` 블록에서 열면 블록이 끝날 때 결과 파일을 저장하고 닫습니다. 각 DataFrame은
서로 다른 `sheet_name`으로 보냅니다. `index=False`는 pandas의 행 번호가 Excel 첫 열에 추가되는 것을
막습니다.

아래 `src/main.py`는 파일 찾기부터 네 시트 저장까지 실행 가능한 전체 코드입니다. 실행할 때마다
`expense_result.xlsx`를 새로 쓰므로 같은 입력을 다시 실행해도 행이 누적되지 않습니다. 결과 파일을
Excel에서 열어 둔 상태라면 Windows가 덮어쓰기를 막을 수 있으므로 파일을 닫고 실행합니다.

#### 코드

```python
from pathlib import Path

import pandas as pd

project_root = Path(__file__).resolve().parents[1]
input_dir = project_root / "input"
output_dir = project_root / "output"
result_file = output_dir / "expense_result.xlsx"
required_columns = ["일자", "부서", "항목", "금액", "비고"]

input_files = sorted(input_dir.glob("*.xlsx"))
if not input_files:
    raise FileNotFoundError(f"입력 Excel 파일이 없습니다: {input_dir}")

tables = []
for input_file in input_files:
    table = pd.read_excel(input_file)
    missing = [name for name in required_columns if name not in table.columns]
    if missing:
        raise ValueError(f"{input_file.name} 필수 열 누락: {missing}")
    table = table[required_columns].copy()
    table["원본파일"] = input_file.name
    tables.append(table)

merged = pd.concat(tables, ignore_index=True)
merged["금액_원문"] = merged["금액"]
merged["금액"] = pd.to_numeric(merged["금액"], errors="coerce")

def review_reason(row):
    reasons = []
    if pd.isna(row["부서"]) or not str(row["부서"]).strip():
        reasons.append("부서 누락")
    if pd.isna(row["금액"]):
        reasons.append("금액 확인")
    elif row["금액"] >= 100000:
        reasons.append("10만원 이상")
    return ", ".join(reasons)

merged["확인필요_이유"] = merged.apply(review_reason, axis=1)
review = merged[merged["확인필요_이유"].ne("")].copy()

department_ok = merged["부서"].notna() & merged["부서"].astype("string").str.strip().ne("")
amount_ok = merged["금액"].notna()
summary_source = merged[department_ok & amount_ok]
summary = (
    summary_source.groupby("부서", as_index=False)
    .agg(거래건수=("금액", "size"), 합계금액=("금액", "sum"))
    .sort_values("부서")
)

validation = pd.DataFrame(
    {
        "항목": ["입력 파일 수", "통합 행 수", "확인필요 행 수", "계산 가능 금액 합계"],
        "확인값": [len(input_files), len(merged), len(review), merged["금액"].sum()],
    }
)

output_dir.mkdir(exist_ok=True)
with pd.ExcelWriter(result_file, engine="openpyxl", mode="w") as writer:
    merged.to_excel(writer, sheet_name="01_통합내역", index=False)
    summary.to_excel(writer, sheet_name="02_부서별요약", index=False)
    review.to_excel(writer, sheet_name="03_확인필요", index=False)
    validation.to_excel(writer, sheet_name="04_검증결과", index=False)

    for worksheet in writer.sheets.values():
        worksheet.freeze_panes = "A2"
        worksheet.auto_filter.ref = worksheet.dimensions

print(f"입력 {len(input_files)}개, 통합 {len(merged)}행")
print(f"확인필요 {len(review)}행, 합계 {merged['금액'].sum():,.0f}원")
print(result_file)
```

#### 코드

```powershell
uv run python src/main.py
```

#### 예시

```text
입력 3개, 통합 9행
확인필요 4행, 합계 597,000원
C:\작업폴더\expense_project\output\expense_result.xlsx
```

#### 참고 자료

- [pandas ExcelWriter 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.ExcelWriter.html)
- [pandas to_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_excel.html)
