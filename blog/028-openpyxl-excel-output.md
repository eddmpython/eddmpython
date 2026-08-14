---
title: openpyxl Excel 서식 자동화 방법: 네 시트 결과 파일 완성하기
slug: openpyxl-excel-output
date: 2026-08-15
modified: 2026-08-15
author: eddmpython
section: Excel 업무자동화
summary: openpyxl Excel 서식 자동화로 통합내역과 부서요약 및 확인필요와 실행정보 시트를 만듭니다. 틀 고정과 필터 및 표시 형식을 적용하고 다시 열어 검증합니다.
readerQuestion: pandas로 만든 결과를 사람이 바로 읽을 수 있는 여러 시트 Excel 파일로 어떻게 저장할까?
readerTakeaway: pandas로 네 시트를 쓴 뒤 openpyxl로 머리글과 틀 고정 및 숫자 형식을 적용하고 저장된 파일을 다시 열어 값과 서식을 검사한다.
readerLevel: beginner
readerStartingPoint: 정상 거래와 확인필요 행 및 부서별 요약 DataFrame을 만들 수 있는 상태입니다.
primaryKeyword: openpyxl Excel 서식 자동화
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b5/b50cb1263d1ff5bae910df1aa235fe59a47f9fe0119390c1c6f57811cf4ac6e3.png
ogImageAlt: 통합내역과 부서요약 및 확인필요와 실행정보를 나타내는 네 시트가 한 Excel 파일에 들어가는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

자동화 결과가 정확해도 한 시트에 모든 내용을 몰아넣으면 사용자는 필요한 표를 다시 찾아야 합니다.
열이 너무 좁고 머리글이 스크롤 밖으로 사라지면 결국 사람이 파일을 다시 꾸미게 됩니다.

이 글에서는 pandas로 데이터를 저장하고 openpyxl로 읽기 좋은 서식을 적용합니다. 마지막에는 메모리에
있는 DataFrame이 아니라 디스크에 저장된 Excel 파일을 다시 열어 결과를 검사합니다.

## openpyxl로 네 시트를 저장합니다

### 통합내역과 부서요약 및 확인필요와 실행정보를 각각 별도 시트로 씁니다

![통합내역과 부서요약 및 확인필요와 실행정보를 나타내는 네 시트가 한 Excel 파일에 들어가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b5/b50cb1263d1ff5bae910df1aa235fe59a47f9fe0119390c1c6f57811cf4ac6e3.png "역할이 다른 네 데이터가 한 Excel 통합문서의 대응하는 네 시트로 들어갑니다")

결과를 한 시트에 모두 섞으면 담당자가 요약과 오류 행 및 실행 기록을 찾기 어렵습니다. `통합내역`에는
정상 거래를, `부서요약`에는 집계 결과를, `확인필요`에는 처리하지 못한 행을 저장합니다.

`실행정보`에는 실행 시각과 입력 파일 수 및 행 수와 금액 차이를 기록합니다. 나중에 파일만 전달받은
사람도 언제 어떤 입력으로 만든 결과인지 확인할 수 있습니다.

#### 코드

```python
from datetime import datetime
from pathlib import Path

import pandas as pd

output_path = Path("output") / "expense_report.xlsx"
output_path.parent.mkdir(parents=True, exist_ok=True)

run_info = pd.DataFrame(
    {
        "항목": ["실행시각", "입력파일수", "정상행수", "확인필요행수", "금액차이"],
        "값": [
            datetime.now().isoformat(timespec="seconds"),
            input_file_count,
            len(clean),
            len(issues),
            difference,
        ],
    }
)

with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
    clean.to_excel(writer, sheet_name="통합내역", index=False)
    summary.to_excel(writer, sheet_name="부서요약", index=False)
    issues.to_excel(writer, sheet_name="확인필요", index=False)
    run_info.to_excel(writer, sheet_name="실행정보", index=False)
```

#### 예시

```text
expense_report.xlsx
  통합내역
  부서요약
  확인필요
  실행정보
```

## 머리글을 고정하고 필터를 켭니다

### 첫 행은 화면에 남기고 전체 데이터 범위에 자동 필터를 적용합니다

![Excel 결과표의 머리글이 고정되고 필터 단추가 있으며 아래 행만 스크롤되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/02/020528bc20cee60f70fda075614478b8b0a538fecc60a685e2ecf70a0ddf1ab7.png "본문 행만 스크롤되고 고정된 머리글과 네 열 필터는 같은 위치에 남습니다")

행이 수천 개면 아래로 스크롤하는 순간 열 이름이 화면에서 사라집니다. `freeze_panes = "A2"`를 지정하면
첫 행 아래부터 화면이 움직이므로 머리글은 계속 보입니다.

자동 필터는 부서나 날짜 조건으로 필요한 행을 바로 찾게 해 줍니다. 확인필요 시트에서도 오류 이유별로
행을 볼 수 있으므로 네 시트 모두에 같은 기본 서식을 적용합니다.

#### 코드

```python
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill

workbook = load_workbook(output_path)
header_fill = PatternFill("solid", fgColor="1F4E78")
header_font = Font(color="FFFFFF", bold=True)

for sheet in workbook.worksheets:
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    sheet.sheet_view.showGridLines = False

    for cell in sheet[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

workbook.save(output_path)
```

#### 참고 자료

- [openpyxl 셀 스타일 공식 문서](https://openpyxl.readthedocs.io/en/stable/styles.html)

## 금액과 날짜 형식 및 열 너비를 맞춥니다

### 값은 그대로 두고 금액 표시와 날짜 표시 및 열 너비만 읽기 좋게 바꿉니다

![금액 열에는 천 단위 형식이 적용되고 날짜 열과 글자 열의 너비가 내용에 맞게 조정되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4d/4d88390cf3ee25c0b970defce72500a0feeac70826ff0044f9514d51c2c87790.png "같은 값이 유지된 채 열 너비와 금액 및 날짜 표시만 읽기 좋게 바뀝니다")

서식은 계산 결과를 바꾸는 작업이 아니라 같은 값을 더 읽기 쉽게 보여 주는 작업입니다. 열 너비는 가장
긴 셀에 여백 2칸을 더하되 너무 넓어지지 않게 10에서 30 사이로 제한합니다.

열 이름으로 위치를 찾으면 DataFrame 열 순서가 바뀌어도 금액과 날짜 서식을 올바른 열에 적용할 수
있습니다. 셀 값은 그대로 두고 `number_format`만 바꿉니다.

#### 코드

```python
from openpyxl.utils import get_column_letter


def header_columns(sheet):
    return {cell.value: cell.column for cell in sheet[1]}


def fit_columns(sheet):
    for column_cells in sheet.columns:
        longest = max(len(str(cell.value or "")) for cell in column_cells)
        letter = get_column_letter(column_cells[0].column)
        sheet.column_dimensions[letter].width = min(max(longest + 2, 10), 30)


for sheet in workbook.worksheets:
    columns = header_columns(sheet)

    for name in ("금액", "금액합계", "평균금액"):
        if name in columns:
            for row in range(2, sheet.max_row + 1):
                sheet.cell(row, columns[name]).number_format = "#,##0"

    if "거래일" in columns:
        for row in range(2, sheet.max_row + 1):
            sheet.cell(row, columns["거래일"]).number_format = "yyyy-mm-dd"

    fit_columns(sheet)

workbook.save(output_path)
```

#### 참고 자료

- [openpyxl 워크시트 표 공식 문서](https://openpyxl.readthedocs.io/en/stable/worksheet_tables.html)

## 저장한 파일을 다시 열어 검증합니다

### 디스크의 결과 파일에서 시트와 행 수와 합계 및 틀 고정 상태를 다시 확인합니다

![저장된 Excel 파일을 다시 열어 네 시트와 행 수 및 합계와 틀 고정 상태를 검사하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6c/6c05a69a72685e296e610b3da785f5bd972c07e3f5ea5b75cdbbcb1840fabb44.png "저장한 네 시트 Excel 파일을 다시 열어 값과 서식 네 항목을 확인합니다")

저장 코드가 오류 없이 끝나도 실제 파일의 시트나 값 및 서식이 기대와 다를 수 있습니다. `read_excel`로
시트와 데이터 값을 확인하고 `load_workbook`으로 틀 고정과 표시 형식을 확인합니다.

기대 시트 집합, 통합내역 행 수, 요약 합계, 머리글 고정이 모두 맞아야 결과 파일을 전달합니다. 아래
검사는 저장된 파일을 대상으로 하므로 쓰기 단계에서 생긴 문제도 찾을 수 있습니다.

#### 코드

```python
saved = pd.read_excel(output_path, sheet_name=None)
expected_sheets = {"통합내역", "부서요약", "확인필요", "실행정보"}

assert set(saved) == expected_sheets
assert len(saved["통합내역"]) == len(clean)
assert abs(saved["부서요약"]["금액합계"].sum() - clean["금액"].sum()) < 0.001

saved_workbook = load_workbook(output_path, data_only=False)
detail_sheet = saved_workbook["통합내역"]
detail_columns = header_columns(detail_sheet)
amount_letter = get_column_letter(detail_columns["금액"])

assert detail_sheet.freeze_panes == "A2"
assert detail_sheet[f"{amount_letter}2"].number_format == "#,##0"

print("저장 파일 검증 PASS", output_path)
```

#### 확인 목록

- 시트 이름 네 개가 정확히 존재합니다.
- 저장 전후 통합내역 행 수가 같습니다.
- 부서요약 합계와 통합내역 합계의 차이가 0입니다.
- 통합내역 첫 행이 고정되고 금액 표시 형식이 유지됩니다.

이제 결과 Excel은 계산 결과뿐 아니라 확인필요 행과 실행 근거까지 함께 전달하는 업무 산출물입니다.
