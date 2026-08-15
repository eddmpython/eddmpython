---
title: Excel 자동화 검증 방법: 재실행해도 숫자가 맞는지 확인하기
slug: excel-automation-validation
author: eddmpython
section: Excel 업무자동화
summary: Excel 자동화 검증 방법을 건수와 금액 차이 및 재실행 비교로 설명합니다. 원본 파일 해시를 확인하고 6개 PASS를 결과 시트에 저장합니다.
readerQuestion: Excel 자동화가 파일을 만들었다는 사실을 넘어 숫자와 원본 보호 및 재실행 결과까지 어떻게 검증할까?
readerTakeaway: 입력과 출력의 건수 및 금액 차이를 0으로 확인하고 같은 입력으로 두 번 실행한 표와 원본 파일 해시를 비교해 모든 검사를 PASS로 만든다.
readerLevel: beginner
readerStartingPoint: input의 Excel 세 개를 읽어 output/expense_result.xlsx와 네 시트를 만드는 src/main.py가 있다.
primaryKeyword: Excel 자동화 검증
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f8/f859ddbeca90cdb5542d6a92a044de7585de96f1657f5d830ba80a75fa49dfe9.png
ogImageAlt: Excel 자동화 결과가 파일 수와 시트와 건수와 금액 및 재실행과 원본 보호 검사 여섯 개를 통과하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Excel 자동화 검증 없이 `파일이 생성됐습니다`만 확인하면 행이 두 번 들어가거나 금액이 빠진 결과도
성공으로 착각할 수 있습니다. 눈으로 몇 셀을 보는 것만으로는 아홉 행조차 빠짐없이 비교하기
어렵습니다.

이 글에서는 입력 세 파일과 `output/expense_result.xlsx`를 숫자로 검사합니다. `src/main.py`를 같은
입력으로 두 번 실행한 뒤 건수 차이 `0`, 금액 차이 `0`, 변경된 원본 `0개`, 검사 여섯 개 `PASS`를
`04_검증결과` 시트에 저장합니다.

## 파일 생성보다 여섯 검사가 중요합니다

### 입력 파일 수부터 원본 변경 여부까지 관찰 가능한 숫자와 상태로 확인합니다

![Excel 자동화 결과가 파일 수와 시트와 건수와 금액 및 재실행과 원본 보호 검사 여섯 개를 통과하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f8/f859ddbeca90cdb5542d6a92a044de7585de96f1657f5d830ba80a75fa49dfe9.png "결과 파일 하나가 생긴 사실이 아니라 입력과 출력 사이의 여섯 계약이 모두 맞아야 성공입니다")

검증 항목은 코드가 해야 할 일을 측정 가능한 문장으로 바꾼 것입니다. 입력 파일이 세 개인지, 결과에
약속한 시트 네 개가 있는지, 입력과 통합내역의 행 수가 같은지 확인합니다. 계산 가능한 금액 합계도
입력과 출력에서 각각 구해 차이가 0인지 봅니다.

같은 입력으로 두 번 실행했을 때 통합내역이 같아야 합니다. 실행 전후 입력 Excel 파일의 SHA-256
해시도 같아야 원본이 바뀌지 않았다고 판단할 수 있습니다. 여섯 항목 중 하나라도 실패하면 자동화
명령은 성공 코드로 끝나면 안 됩니다.

#### 확인 목록

- 입력 Excel 파일 수는 3개입니다.
- 결과 시트 이름은 약속한 4개와 정확히 같습니다.
- 입력과 1차 및 2차 실행의 행 수 차이는 0입니다.
- 입력과 1차 및 2차 실행의 금액 차이는 0원입니다.
- 1차와 2차 통합내역은 같습니다.
- 실행 전후 내용이 바뀐 입력 파일은 0개입니다.

## 건수와 금액을 양쪽에서 계산합니다

### 입력 파일과 통합내역에서 같은 숫자를 따로 구해 차이가 0인지 비교합니다

![입력 Excel 세 개의 행 수와 금액이 결과 통합내역의 행 수 및 금액과 각각 대조되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fd86614c50737abb3c0b9e78935f8ae994fc199820e67854a5e7de0a87dfc78d.png "한쪽에서 계산한 숫자를 그대로 믿지 않고 입력과 출력에서 독립적으로 구한 값끼리 맞춥니다")

입력 건수는 세 파일의 DataFrame 길이를 더해 구합니다. 입력 금액은 각 파일의 `금액` 열을
`pd.to_numeric(errors="coerce")`로 변환한 뒤 합칩니다. 결과 건수와 금액은 `01_통합내역` 시트를
새로 읽어 같은 방법으로 계산합니다.

입력과 출력이 모두 `9행`, `597000원`이면 차이는 0입니다. 숫자가 다르면 어느 쪽이 맞는지 추측하지
않고 원본파일별 건수와 합계를 추가로 출력합니다. 전체 차이를 확인한 뒤 파일 단위로 범위를 좁히는
순서가 빠릅니다.

#### 코드

```python
input_tables = [pd.read_excel(path) for path in input_files]
input_count = sum(len(table) for table in input_tables)
input_total = sum(
    pd.to_numeric(table["금액"], errors="coerce").sum()
    for table in input_tables
)

merged = result_sheets["01_통합내역"]
output_count = len(merged)
output_total = pd.to_numeric(merged["금액"], errors="coerce").sum()

count_difference = abs(input_count - output_count)
amount_difference = abs(input_total - output_total)
```

#### 예시

```text
입력 건수 9, 출력 건수 9, 차이 0
입력 금액 597000, 출력 금액 597000, 차이 0
```

## 같은 입력으로 두 번 실행합니다

### 1차와 2차 통합내역이 같아야 행이 누적되지 않는 재실행입니다

![고정된 입력 파일이 같은 실행 명령을 두 번 지나 동일한 아홉 행 결과 표 두 개를 만드는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b8/b81113f251d58e921d6bc191b74fe292d6cafa6a65d877578be8f94f672c3d4f.png "두 번째 실행에서 기존 결과에 행을 덧붙이지 않고 같은 입력으로 같은 표를 다시 만듭니다")

안전한 재실행은 같은 입력과 같은 코드에서 같은 결과를 만드는 성질입니다. `src/main.py`가 기존
결과에 새 행을 계속 추가한다면 첫 실행은 9행, 둘째 실행은 18행이 됩니다. 결과 파일을 `mode="w"`로
새로 쓰면 같은 입력에서 계속 9행이 나옵니다.

검증 스크립트는 현재 가상환경의 Python인 `sys.executable`로 `main.py`를 두 번 실행합니다. 각 실행
직후 `01_통합내역`을 읽어 메모리에 보관하고 `assert_frame_equal`로 값과 열 및 행 순서를 비교합니다.
차이가 있으면 재실행 검사를 FAIL로 기록합니다.

#### 코드

```python
from pandas.testing import assert_frame_equal

subprocess.run([sys.executable, str(main_file)], cwd=project_root, check=True)
first = pd.read_excel(result_file, sheet_name=None)

subprocess.run([sys.executable, str(main_file)], cwd=project_root, check=True)
second = pd.read_excel(result_file, sheet_name=None)

try:
    assert_frame_equal(
        first["01_통합내역"],
        second["01_통합내역"],
        check_dtype=False,
    )
    rerun_equal = True
except AssertionError:
    rerun_equal = False
```

#### 참고 자료

- [pandas assert_frame_equal 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.testing.assert_frame_equal.html)

## 원본 파일 해시가 같은지 봅니다

### 실행 전후 SHA-256 값을 비교하면 입력 파일 내용이 바뀌었는지 찾을 수 있습니다

![입력 Excel 파일 세 개가 실행 전후 SHA-256 지문 비교에서 모두 같은 표시를 받는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ca/cad99250b355a671e6bcc653ee23871c0354b376761a0368990b6648bf80eda3.png "파일 이름과 수정 시각만 보지 않고 실제 바이트에서 계산한 지문으로 원본 변경 여부를 확인합니다")

입력 파일을 열어 읽기만 해야 하는 자동화가 원본을 덮어쓰면 복구가 어렵습니다. 실행 전에 각 Excel
파일의 바이트로 SHA-256 값을 계산하고, 두 번 실행한 뒤 같은 파일에서 다시 계산합니다. 값이 하나라도
달라지면 변경된 파일 수를 FAIL로 기록합니다.

해시는 파일 내용이 같으면 같은 긴 값을 만드는 함수입니다. 이 검사는 누가 왜 바꿨는지는 알려 주지
않지만 실행 사이에 파일 바이트가 달라졌다는 사실은 찾을 수 있습니다. 입력 파일을 Excel에서 열어
저장해도 해시가 달라질 수 있으므로 검증 중에는 입력 파일을 닫아 둡니다.

#### 코드

```python
from hashlib import sha256

def file_hash(path):
    return sha256(path.read_bytes()).hexdigest()

before_hashes = {path.name: file_hash(path) for path in input_files}
# main.py를 두 번 실행
after_hashes = {path.name: file_hash(path) for path in input_files}

changed_inputs = [
    name for name in before_hashes
    if before_hashes[name] != after_hashes[name]
]
```

#### 참고 자료

- [Python hashlib 공식 문서](https://docs.python.org/3/library/hashlib.html)

## 검증 결과를 시트와 종료 코드로 남깁니다

### 여섯 줄을 04_검증결과에 쓰고 FAIL이 하나라도 있으면 오류 코드로 끝냅니다

![여섯 검사 결과 행이 PASS와 FAIL 열로 정리되고 전체 통과 여부가 터미널 종료 상태로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/68/682cd98f605ecf8a64d979cc1184868b2405d0681f74be23ec4d755867529993.png "사람이 Excel에서 읽는 검증표와 자동 실행이 읽는 종료 코드를 동시에 남깁니다")

아래 `src/validate_result.py`는 여섯 검사를 모두 실행하는 전체 코드입니다. 각 항목에 기대값과 실제값
및 PASS 또는 FAIL을 넣고 기존 `04_검증결과` 시트를 교체합니다. 통합내역과 요약 및 확인필요 시트는
그대로 둡니다.

마지막의 `SystemExit(1)`은 실패가 있다는 사실을 PowerShell이나 자동 실행 도구에 전달합니다. 사람이
표를 열지 않아도 종료 코드가 0이 아니면 배포나 공유를 멈출 수 있습니다. 정상 자료에서는 여섯 줄이
모두 PASS이고 명령은 종료 코드 0으로 끝납니다.

#### 코드

```python
from hashlib import sha256
from pathlib import Path
import subprocess
import sys

import pandas as pd
from pandas.testing import assert_frame_equal

project_root = Path(__file__).resolve().parents[1]
input_dir = project_root / "input"
main_file = project_root / "src" / "main.py"
result_file = project_root / "output" / "expense_result.xlsx"
expected_sheets = ["01_통합내역", "02_부서별요약", "03_확인필요", "04_검증결과"]

def file_hash(path):
    return sha256(path.read_bytes()).hexdigest()

def run_main():
    subprocess.run(
        [sys.executable, str(main_file)],
        cwd=project_root,
        check=True,
    )

input_files = sorted(input_dir.glob("*.xlsx"))
input_tables = [pd.read_excel(path) for path in input_files]
input_count = sum(len(table) for table in input_tables)
input_total = sum(
    pd.to_numeric(table["금액"], errors="coerce").sum()
    for table in input_tables
)
before_hashes = {path.name: file_hash(path) for path in input_files}

run_main()
first = pd.read_excel(result_file, sheet_name=None)
run_main()
second = pd.read_excel(result_file, sheet_name=None)

first_merged = first["01_통합내역"]
second_merged = second["01_통합내역"]
first_total = pd.to_numeric(first_merged["금액"], errors="coerce").sum()
second_total = pd.to_numeric(second_merged["금액"], errors="coerce").sum()

try:
    assert_frame_equal(first_merged, second_merged, check_dtype=False)
    rerun_equal = True
except AssertionError:
    rerun_equal = False

after_hashes = {path.name: file_hash(path) for path in input_files}
changed_inputs = [
    name for name in before_hashes
    if before_hashes[name] != after_hashes[name]
]

count_difference = max(
    abs(input_count - len(first_merged)),
    abs(input_count - len(second_merged)),
)
amount_difference = max(
    abs(input_total - first_total),
    abs(input_total - second_total),
)
sheet_names_match = list(second.keys()) == expected_sheets

checks = [
    ["입력 파일 수", 3, len(input_files), len(input_files) == 3],
    ["결과 시트 수와 순서", 4, len(second), sheet_names_match],
    ["입출력 건수 차이", 0, count_difference, count_difference == 0],
    ["입출력 금액 차이", 0, amount_difference, amount_difference == 0],
    ["1차와 2차 통합내역", "같음", "같음" if rerun_equal else "다름", rerun_equal],
    ["변경된 입력 파일 수", 0, len(changed_inputs), not changed_inputs],
]

validation = pd.DataFrame(
    [
        {"항목": name, "기대값": expected, "실제값": actual, "결과": "PASS" if passed else "FAIL"}
        for name, expected, actual, passed in checks
    ]
)

with pd.ExcelWriter(
    result_file,
    engine="openpyxl",
    mode="a",
    if_sheet_exists="replace",
) as writer:
    validation.to_excel(writer, sheet_name="04_검증결과", index=False)

print(validation.to_string(index=False))
if not validation["결과"].eq("PASS").all():
    raise SystemExit(1)
```

#### 코드

```powershell
uv run python src/validate_result.py
```

#### 예시

```text
입력 파일 수             3       3 PASS
결과 시트 수와 순서       4       4 PASS
입출력 건수 차이          0       0 PASS
입출력 금액 차이          0       0 PASS
1차와 2차 통합내역        같음    같음 PASS
변경된 입력 파일 수       0       0 PASS
```
