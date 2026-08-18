---
title: Python으로 Excel 파일 합치기: 누락 없이 4개 시트로 검증하는 방법
slug: python-excel-merge
author: eddmpython
section: Excel 업무자동화
summary: Python Excel 파일 합치기를 부서별 지출 파일 3개로 완성합니다. pandas로 행을 모으고 오류를 분리한 뒤 통합, 요약, 확인필요, 검증결과 4개 시트를 만들고 합계까지 확인합니다.
readerQuestion: Python으로 형식이 같은 Excel 파일 여러 개를 합칠 때 행 누락과 중복 및 잘못된 금액을 어떻게 찾고 결과가 맞다는 것을 증명할까?
readerTakeaway: 입력 열과 고유 ID를 먼저 검사하고 원문을 보존한 채 값을 바꾸며 임시 통합문서를 다시 검증한 뒤 최종 파일로 교체한다.
readerLevel: beginner
readerStartingPoint: Python 파일을 한 번 실행해 봤지만 pandas의 DataFrame과 ExcelWriter 및 합계 검증 방법은 모른다.
primaryKeyword: Python Excel 파일 합치기
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/da/dad85b811e9dee86276cfef5fd83ec9179ca889f82ca77a348559f2cce045473.png
ogImageAlt: 부서별 Excel 파일 세 개가 검사 단계를 지나 역할이 다른 네 시트 통합문서가 되는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

월말마다 부서별 Excel 파일을 열고 행을 복사하면 마지막 숫자가 맞는지 불안합니다. 한 행을 두 번 붙이거나 `금액미정`을 합계에서 놓쳐도 완성된 통합문서는 멀쩡해 보이기 때문입니다. Python Excel 파일 합치기는 복사 속도보다 누락과 중복을 찾고 결과를 설명할 수 있게 만드는 작업입니다.

이 글에서는 실제 정보가 없는 지출 파일 3개와 9행을 직접 만듭니다. `uv run python src/main.py`를 실행하면 `output/expense_result.xlsx`가 생깁니다. 마지막에는 시트 4개, 확인이 필요한 4행, 계산 가능한 금액 597,000원, 대사 차이 0원을 코드가 다시 읽어 확인합니다.

## Excel 파일 합치기의 뜻부터 고정합니다

### 같은 열의 행을 모은 뒤 계산과 검토 결과까지 한 통합문서에 남깁니다

![부서별 Excel 파일 세 개가 검사 단계를 지나 역할이 다른 네 시트 통합문서가 되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/da/dad85b811e9dee86276cfef5fd83ec9179ca889f82ca77a348559f2cce045473.png "세 파일을 한 표로 붙이는 데서 끝내지 않고 요약과 검토 및 검증을 서로 다른 시트에 남깁니다")

`Excel 파일 합치기`라는 말은 세 가지 다른 작업을 가리킬 수 있습니다. 같은 열을 가진 표의 행을 아래로 이어 붙일 수도 있고, 원본 시트를 한 통합문서에 그대로 모을 수도 있습니다. 고객번호처럼 같은 값을 기준으로 서로 다른 열을 옆으로 붙이는 작업도 합치기라고 부릅니다.

이 글에서 할 일은 첫 번째 작업입니다. 영업팀, 관리팀, 개발팀 파일이 모두 `지출ID`, `일자`, `부서`, `항목`, `금액`, `비고` 열을 가집니다. Python은 세 표의 행을 하나의 DataFrame에 세로로 모읍니다. DataFrame은 행과 열이 있는 표를 pandas가 다루는 이름입니다.

행을 모은 표만 저장하면 잘못된 값이 숨어 버립니다. 그래서 결과 파일을 네 시트로 나눕니다. `01_통합내역`은 원본 행과 출처를, `02_부서별요약`은 부서별 건수와 합계를 담습니다. `03_확인필요`는 사람이 볼 행을 모으고 `04_검증결과`는 맞아야 할 숫자를 남깁니다.

#### 예상 결과: 입력 세 파일과 출력 네 시트 구분하기

아래에서 입력은 `input` 폴더의 `.xlsx` 파일 세 개입니다. 핵심 동작은 아홉 행을 모은 뒤 같은 행으로 요약표와 검토표를 만드는 것입니다. 출력에서 네 시트 이름과 597,000원이 보이면 첫 번째 성공 조건을 확인한 것입니다.

```text
입력
├─ input/sales.xlsx    3행
├─ input/admin.xlsx    3행
└─ input/dev.xlsx      3행

출력
└─ output/expense_result.xlsx
   ├─ 01_통합내역      9행
   ├─ 02_부서별요약    3행
   ├─ 03_확인필요      4행
   └─ 04_검증결과      대사 차이 0원
```

이제 무엇을 만들지는 분명합니다. 하지만 파일마다 열 이름과 값의 뜻이 다르면 같은 코드로 안전하게 모을 수 없으므로 입력이 지켜야 할 약속부터 정해야 합니다.

## 입력 계약을 먼저 정해야 누락을 막습니다

### 파일 위치와 열 이름 및 고유 ID를 코드보다 먼저 정하면 잘못된 입력에서 멈출 수 있습니다

![입력 폴더와 여섯 열 표 및 고유 ID가 하나의 검사표에 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/62/62ca4107a36005d49f98cb37d575de65a44981bb5a645903f223b45a23b407e7.png "파일 위치와 열 이름 및 고유 ID를 먼저 고정해야 서로 다른 세 파일을 같은 행으로 해석할 수 있습니다")

입력 계약은 자동화가 받을 파일의 구체적인 규칙입니다. 이 예제는 `input` 바로 아래에 있는 `.xlsx` 파일만 읽고 각 파일의 첫 번째 시트만 사용합니다. 머리글은 첫 행에 있어야 하고 필수 열 여섯 개의 이름도 같아야 합니다.

`지출ID`는 한 지출을 다른 지출과 구분하는 값입니다. 파일을 다시 받거나 같은 행이 두 파일에 들어가면 금액이 두 번 더해질 수 있습니다. 코드는 빈 ID나 중복 ID를 발견하면 결과를 만들기 전에 멈춥니다. 중복을 조용히 지우지 않는 이유는 어느 행이 진짜인지 코드가 결정할 근거가 없기 때문입니다.

`원본파일`과 `원본행`은 입력에 없어도 코드가 추가합니다. Excel의 1행은 머리글이므로 첫 데이터의 `원본행`은 2가 됩니다. 검토 담당자는 결과의 문제 행을 보고 원본 파일과 셀 위치로 돌아갈 수 있습니다.

#### 설명 목록: 자동화가 받는 값과 거부할 값 정하기

| 항목 | 이 예제가 받는 값 | 맞지 않을 때 하는 일 |
|---|---|---|
| 파일 | `input/*.xlsx`의 첫 시트 | 파일이 없으면 중단 |
| 머리글 | 첫 행의 필수 열 여섯 개 | 빠지거나 겹치면 중단 |
| `지출ID` | 비어 있지 않은 고유 문자열 | 누락이나 중복이면 중단 |
| `일자` | 날짜로 바꿀 수 있는 값 | 원문을 남기고 확인필요로 보냄 |
| `부서` | 빈칸이 아닌 이름 | 원문 행을 남기고 확인필요로 보냄 |
| `금액` | 숫자로 바꿀 수 있는 값 | 원문을 남기고 확인필요로 보냄 |

중단과 확인필요는 다릅니다. 중복 ID는 전체 합계를 틀리게 만들 수 있어 중단합니다. 반면 부서가 빈 한 행은 다른 정상 행까지 버릴 이유가 없으므로 결과에 남기고 사람이 고치게 합니다. 이 구분을 실제로 시험하려면 안전한 합성 입력부터 만드는 편이 좋습니다.

## 실제 정보 없는 파일로 처음 실행합니다

### 합성 지출 아홉 행에 정상값과 검토값을 함께 넣어 전체 동작을 안전하게 시험합니다

![정상 셀과 빈 부서 및 문자 금액이 섞인 아홉 행이 Excel 파일 세 개로 나뉜 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c5/c513256699081fae62c2b04639f8b7b8d01a6978773eb90d20ebd80463859d16.png "실제 거래처나 계좌 없이도 정상 행과 오류 행을 함께 넣으면 병합과 검토 규칙을 모두 확인할 수 있습니다")

처음부터 회사 원본으로 시험하면 잘못 만든 파일을 공유하거나 개인정보를 로그에 남길 수 있습니다. 합성 자료는 열의 수와 값의 종류만 실제와 닮게 만든 가짜 자료입니다. 아래 파일에는 사람 이름과 계좌가 없지만 빈 부서, 문자 금액, 10만원 이상 지출이 들어 있습니다.

프로젝트 폴더 이름은 `expense_excel_merge`로 정합니다. `input`에는 읽을 파일만 두고 `output`에는 코드가 만든 파일만 둡니다. 이 분리 덕분에 두 번째 실행에서 지난 결과를 다시 입력으로 읽는 실수를 막을 수 있습니다.

`uv`는 Python 버전과 패키지 및 실행 명령을 프로젝트 단위로 관리하는 도구입니다. 이 글에서 처음 보더라도 아래 명령을 그대로 사용할 수 있습니다. PowerShell에서 `uv`를 찾지 못하면 [uv 공식 설치 문서](https://docs.astral.sh/uv/getting-started/installation/)의 Windows 명령으로 설치한 뒤 새 PowerShell 창을 엽니다.

#### 실행 명령: pandas와 openpyxl 설치하기

아래 명령의 입력은 비어 있는 프로젝트 폴더입니다. `uv add`가 `pyproject.toml`에 pandas와 openpyxl을 기록하고 실행할 패키지를 설치합니다. pandas는 표를 계산하고 openpyxl은 `.xlsx` 파일을 읽고 쓰는 엔진으로 사용됩니다.

```powershell
mkdir expense_excel_merge
cd expense_excel_merge
uv init
uv add pandas openpyxl
mkdir src
```

`uv init` 뒤에 생긴 기본 `main.py`는 사용하지 않습니다. 앞으로 실행할 파일은 `src` 안에 둡니다. 명령이 끝났다면 프로젝트 루트에 `pyproject.toml`과 `uv.lock`이 보여야 합니다.

#### 예상 결과: 입력과 출력을 섞지 않은 프로젝트 트리

아래 트리는 합성 파일 생성 후의 모양입니다. 입력 세 파일은 `make_sample.py`가 만들고 결과 통합문서는 `main.py`가 만듭니다. `output` 파일을 `input`으로 옮기지 않아야 재실행 때 행이 늘어나지 않습니다.

```text
expense_excel_merge/
├─ input/
│  ├─ admin.xlsx
│  ├─ dev.xlsx
│  └─ sales.xlsx
├─ output/
│  └─ expense_result.xlsx
├─ src/
│  ├─ main.py
│  └─ make_sample.py
├─ pyproject.toml
└─ uv.lock
```

#### 예시 코드: 실제 정보 없는 Excel 세 개 만들기

아래 코드는 `SAMPLES`의 목록을 입력으로 받아 세 DataFrame을 만듭니다. `to_excel`이 각 표를 서로 다른 파일로 저장하고 `index=False`가 pandas의 행 번호를 Excel 첫 열에 쓰지 않게 합니다. 실행 뒤에는 파일 세 개와 전체 아홉 행이 생겨야 합니다.

```python
from pathlib import Path

import pandas as pd


COLUMNS = ["지출ID", "일자", "부서", "항목", "금액", "비고"]
SAMPLES = {
    "sales.xlsx": [
        ["E001", "2026-08-01", "영업팀", "교통비", 45000, "출장"],
        ["E002", "2026-08-02", "영업팀", "광고비", 120000, "사전승인"],
        ["E003", "2026-08-03", "영업팀", "소모품", 32000, ""],
    ],
    "admin.xlsx": [
        ["E004", "2026-08-01", "관리팀", "사무용품", 80000, ""],
        ["E005", "2026-08-04", "관리팀", "교육비", 150000, "검토"],
        ["E006", "2026-08-04", "", "택배비", 50000, "부서 누락"],
    ],
    "dev.xlsx": [
        ["E007", "2026-08-05", "개발팀", "클라우드", 90000, ""],
        ["E008", "2026-08-06", "개발팀", "장비", "금액미정", "금액 확인"],
        ["E009", "2026-08-07", "개발팀", "도서", 30000, ""],
    ],
}


def create_samples(input_dir: Path) -> None:
    input_dir.mkdir(parents=True, exist_ok=True)
    for file_name, rows in SAMPLES.items():
        pd.DataFrame(rows, columns=COLUMNS).to_excel(
            input_dir / file_name,
            index=False,
            engine="openpyxl",
        )


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    create_samples(project_root / "input")
    print(f"합성 입력 {len(SAMPLES)}개, 전체 {sum(map(len, SAMPLES.values()))}행 생성")
```

`src/make_sample.py`로 저장하고 아래 명령을 실행합니다. 입력은 코드 안의 세 목록이며 출력은 `input` 폴더의 파일 세 개입니다. 마지막 줄이 정확히 보이면 이제 읽기와 열 검사를 시험할 수 있습니다.

#### 예상 결과: 합성 Excel 파일 세 개 확인하기

```powershell
uv run python src/make_sample.py
Get-ChildItem input -Filter *.xlsx
```

```text
합성 입력 3개, 전체 9행 생성
admin.xlsx
dev.xlsx
sales.xlsx
```

목록에는 세 파일만 보여야 하고 생성 메시지의 전체 행 수는 9여야 합니다. 파일이 빠졌다면 `make_sample.py`가 오류 없이 끝났는지 먼저 확인하고, 세 파일이 모두 생긴 뒤에만 병합 코드를 실행합니다.

합성 파일이 준비됐다고 바로 `concat`을 호출하면 안 됩니다. 한 파일의 `금액` 열이 `사용금액`으로 바뀌었을 수 있으므로 각 파일을 읽은 직후 모양을 검사해야 합니다.

## 파일과 열을 합치기 전에 검사합니다

### xlsx 파일만 정렬해 읽고 필수 열과 원본 위치를 확인한 표만 다음 단계로 보냅니다

![입력 폴더에서 선택된 Excel 파일 세 개가 열 검사표를 통과하고 원본 위치 꼬리표를 받는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/94/94eca10d4df8e2dfc9c453f91f1a4dbf6fa3cd1acc4256473b67d3b80601f14b.png "파일별 열 검사를 먼저 끝내야 잘못된 표가 통합 결과 안으로 조용히 들어가지 않습니다")

`Path.glob("*.xlsx")`는 `input` 바로 아래에서 확장자가 `.xlsx`인 경로를 찾습니다. `sorted`로 이름순을 고정하면 실행마다 파일을 읽는 순서가 같습니다. 파일이 하나도 없을 때는 빈 통합문서를 만들지 않고 `FileNotFoundError`로 멈춥니다.

`pd.read_excel`은 Excel 표를 DataFrame으로 읽습니다. `sheet_name`을 생략하면 첫 번째 시트를 읽으므로 이 예제의 입력 계약도 첫 시트로 고정했습니다. 여러 시트를 모두 읽고 싶다면 `sheet_name=None`을 사용할 수 있지만 반환값과 검사 코드가 달라집니다.

같은 열 이름이 두 번 있으면 pandas가 두 번째 이름을 `금액.1`처럼 바꿀 수 있습니다. 그러면 중복이 원래부터 있었는지 나중에는 알기 어렵습니다. 코드가 openpyxl로 첫 행의 원래 셀 값을 먼저 읽고 공백을 지운 뒤 중복을 검사하는 이유입니다.

중복 검사를 통과한 파일만 pandas로 읽습니다. 필수 열이 빠진 경우에는 `admin.xlsx 필수 열 누락: 금액`처럼 파일 이름과 열 이름을 함께 보여 줍니다. `금액`과 ` 금액`처럼 공백만 다른 두 머리글도 같은 이름으로 보아 중단합니다.

검사를 통과한 표에만 `원본파일`과 `원본행`을 붙입니다. 마지막에 `pd.concat(..., ignore_index=True)`가 각 표의 오래된 행 번호를 버리고 0부터 이어지는 새 행 번호를 만듭니다. 원본 위치는 별도 두 열에 이미 남았으므로 새 번호와 섞이지 않습니다.

#### 예시 코드: 파일 이름과 열 이름을 먼저 검사하기

아래 함수의 입력은 `input` 폴더 경로입니다. 핵심은 파일별로 열을 확인한 표만 `tables`에 넣는 부분입니다. 출력은 정렬된 파일 경로 목록과 출처 열이 추가된 하나의 DataFrame이며, 잘못된 파일이 있으면 `concat` 전에 예외가 발생합니다.

```python
from openpyxl import load_workbook


def read_inputs(input_dir: Path) -> tuple[list[Path], pd.DataFrame]:
    input_files = sorted(input_dir.glob("*.xlsx"))
    if not input_files:
        raise FileNotFoundError(f"입력 Excel 파일이 없습니다: {input_dir}")

    tables = []
    for input_file in input_files:
        workbook = load_workbook(input_file, read_only=True, data_only=False)
        try:
            header = [
                str(cell.value).strip() if cell.value is not None else ""
                for cell in next(workbook.active.iter_rows(min_row=1, max_row=1))
            ]
        finally:
            workbook.close()

        duplicate_columns = sorted(
            {name for name in header if name and header.count(name) > 1}
        )
        if duplicate_columns:
            raise ValueError(
                f"{input_file.name} 중복 열 이름: {', '.join(duplicate_columns)}"
            )

        table = pd.read_excel(input_file, engine="openpyxl")
        table.columns = table.columns.astype(str).str.strip()

        missing = [name for name in REQUIRED_COLUMNS if name not in table.columns]
        if missing:
            raise ValueError(f"{input_file.name} 필수 열 누락: {', '.join(missing)}")

        table = table[REQUIRED_COLUMNS].copy()
        table["원본파일"] = input_file.name
        table["원본행"] = range(2, len(table) + 2)
        tables.append(table)

    return input_files, pd.concat(tables, ignore_index=True)
```

#### 참고 자료: Excel 읽기와 행 연결 기준 확인하기

- [pandas read_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html)
- [pandas concat 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.concat.html)
- [Python pathlib glob 공식 문서](https://docs.python.org/3/library/pathlib.html#pathlib.Path.glob)

열이 같다는 사실만으로 금액을 더할 수 있는 것은 아닙니다. Excel 한 열에는 숫자와 문자가 함께 들어갈 수 있으므로 원문을 잃지 않고 계산 가능한 값으로 바꾸는 단계가 필요합니다.

## 날짜와 금액은 원문을 남기고 바꿉니다

### 변환에 실패한 셀을 지우지 않고 원문과 이유를 함께 남겨 사람이 다시 확인하게 합니다

![원문 날짜와 금액 열이 변환된 열과 확인필요 이유 열로 나란히 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1e/1e6ecc31cb797f12bb8bae520e7bf1c74329c6aa4e1818de7c3717bc1e0ba0ff.png "계산용 값으로 바꾸기 전에 원문을 복사하면 실패한 셀도 어디서 왔는지 다시 확인할 수 있습니다")

정규화는 같은 뜻의 값을 같은 모양으로 바꾸는 일입니다. `2026-08-07`과 Excel 날짜 셀을 모두 날짜로 바꾸면 정렬과 월별 계산이 쉬워집니다. `90000`과 문자처럼 저장된 `90000`도 숫자로 바꾸면 같은 합계에 사용할 수 있습니다.

값을 바로 덮어쓰면 `금액미정`이 왜 빈칸이 됐는지 알 수 없습니다. 먼저 `일자_원문`과 `금액_원문`에 셀 값을 복사합니다. 그다음 `pd.to_datetime`과 `pd.to_numeric`에 `errors="coerce"`를 주면 바꿀 수 없는 값이 결측값으로 표시됩니다.

결측값은 값이 없거나 해석하지 못했다는 pandas의 표시입니다. 코드에서는 `pd.isna`로 찾습니다. 문제 행을 삭제하지 않고 `확인필요_이유`에 `일자 확인`, `부서 누락`, `금액 확인`을 적습니다. 한 행이 두 조건에 걸리면 이유도 두 개가 함께 남습니다.

10만원 이상은 잘못된 값이 아닙니다. 이 예제에서는 승인 여부를 사람이 보도록 검토 규칙에 넣었습니다. 회사의 실제 기준이 30만원이라면 `REVIEW_LIMIT = 300_000`으로 한 줄만 바꾸면 됩니다. 기준 이상 행도 통합내역과 합계에는 그대로 포함됩니다.

#### 예시 코드: 날짜와 금액을 계산 가능한 값으로 바꾸기

입력은 출처 열이 붙은 통합 DataFrame입니다. 핵심 줄은 원문을 먼저 복사하고 변환 실패를 결측값으로 바꾸는 두 줄입니다. 출력은 계산용 `일자`와 `금액`, 그리고 사람이 볼 이유가 붙은 `review` DataFrame입니다.

```python
merged["일자_원문"] = merged["일자"].astype("string").fillna("")
merged["금액_원문"] = merged["금액"].astype("string").fillna("")
merged["일자"] = pd.to_datetime(merged["일자"], errors="coerce").dt.date
merged["금액"] = pd.to_numeric(merged["금액"], errors="coerce")
merged["부서"] = merged["부서"].astype("string").str.strip()

def review_reason(row: pd.Series) -> str:
    reasons = []
    if pd.isna(row["일자"]):
        reasons.append("일자 확인")
    if pd.isna(row["부서"]) or row["부서"] == "":
        reasons.append("부서 누락")
    if pd.isna(row["금액"]):
        reasons.append("금액 확인")
    elif row["금액"] >= REVIEW_LIMIT:
        reasons.append("10만원 이상")
    return ", ".join(reasons)

merged["확인필요_이유"] = merged.apply(review_reason, axis=1)
review = merged.loc[merged["확인필요_이유"].ne("")].copy()
```

변환 실패를 0원으로 바꾸지 않았다는 점이 중요합니다. `금액미정`을 0원으로 넣으면 합계는 계산되지만 아직 정하지 않은 금액을 실제 0원으로 오해하게 됩니다. 결측값으로 남겨야 합계에서 빠진 행을 따로 셀 수 있습니다.

이제 계산 가능한 행이 생겼습니다. 다음 단계에서는 합계를 한 번 구하는 데서 끝내지 않고 서로 다른 두 경로로 나눠 더한 값이 원래 합계와 맞는지 확인합니다.

## 중복을 막고 합계가 맞는지 대사합니다

### 고유 ID는 이중 계산을 막고 부서별 합계와 미지정 금액은 전체 합계를 다시 증명합니다

![고유 ID 검사를 통과한 금액이 부서별 합계와 미지정 금액으로 나뉘었다가 같은 전체 합계로 모이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/78/78dad0b22ceefef352d97eee3d7ad6c10e1d1c7c32f32c16a6c97408c84e096b.png "중복 행을 먼저 막고 전체 금액을 서로 겹치지 않는 두 묶음으로 다시 더하면 누락 여부를 찾을 수 있습니다")

세 파일에 `E001`이 두 번 있으면 두 행의 값이 같아도 자동으로 하나를 버리지 않습니다. 한 행은 중복일 수 있지만 서로 다른 두 건에 같은 ID를 잘못 부여했을 수도 있습니다. 코드는 중복 ID 목록을 오류에 보여 주고 사람이 원본을 고친 뒤 다시 실행하게 합니다.

중복을 통과한 뒤에는 부서와 금액이 모두 있는 행만 `groupby("부서")`로 묶습니다. `size`는 부서별 행 수를 세고 `sum`은 금액을 더합니다. 부서가 빈 E006의 50,000원은 부서별 합계에서 빠지지만 전체 계산 가능 금액에는 들어 있습니다.

대사는 한 숫자를 다른 계산 경로로 다시 맞춰 보는 일입니다. 이 예제의 전체 계산 가능 금액은 597,000원입니다. 부서별 합계 547,000원과 부서 미지정 금액 50,000원을 더하면 다시 597,000원이므로 대사 차이는 0원입니다.

대사 차이가 0이라고 모든 원본이 옳다는 뜻은 아닙니다. 계산 과정에서 금액을 잃거나 두 번 더하지 않았다는 뜻입니다. `금액미정`처럼 숫자로 바꾸지 못한 행은 확인필요 4행 안에서 별도로 해결해야 합니다.

#### 예시 코드: 597000원을 두 묶음으로 다시 맞추기

아래 입력은 숫자로 바뀐 금액과 정리된 부서 열입니다. 핵심은 부서가 있는 금액과 없는 금액을 겹치지 않게 나누는 것입니다. 출력의 `difference`가 0이면 두 묶음의 합이 전체 계산 가능 금액과 같습니다.

```python
department_ok = merged["부서"].notna() & merged["부서"].ne("")
amount_ok = merged["금액"].notna()
summary_source = merged.loc[department_ok & amount_ok]

summary = (
    summary_source.groupby("부서", as_index=False)
    .agg(거래건수=("금액", "size"), 합계금액=("금액", "sum"))
    .sort_values("부서")
)

calculable_total = int(merged["금액"].sum())
department_total = int(summary["합계금액"].sum())
unassigned_total = int(merged.loc[~department_ok & amount_ok, "금액"].sum())
difference = calculable_total - department_total - unassigned_total
```

```text
계산 가능 금액 합계  597000
부서별 합계          547000
부서 미지정 금액      50000
대사 차이                  0
```

계산이 맞아도 저장 도중 프로그램이 멈추면 결과 파일이 반만 바뀔 수 있습니다. 다음 코드는 임시 파일을 완전히 만들고 다시 읽어 검증한 뒤에만 최종 파일 이름으로 교체합니다.

## 검증한 파일만 최종 결과로 교체합니다

### 임시 통합문서를 끝까지 쓰고 다시 읽은 뒤 통과한 파일만 최종 이름으로 바꿉니다

![네 표가 임시 통합문서에 저장되고 재검사를 통과한 한 파일만 최종 결과 자리로 이동하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/09/09b6de3b88e14a06d0ab20f13466c7baeb70011f660952b055853a1417dc568a.png "쓰기와 검증이 끝나기 전에는 기존 최종 파일을 건드리지 않아 실패한 재실행에서도 지난 결과를 보존합니다")

`pd.ExcelWriter`를 `with` 블록에서 사용하면 블록을 나갈 때 통합문서를 저장하고 닫습니다. 서로 다른 DataFrame에 고유한 `sheet_name`을 주면 한 `.xlsx` 파일 안에 네 시트가 생깁니다. `index=False`는 pandas의 행 번호가 Excel 열로 추가되는 것을 막습니다.

코드는 최종 경로가 아니라 `.expense_result.tmp.xlsx`에 먼저 씁니다. 임시 파일의 시트 이름, 행 수, 확인필요 행 수, 합계, 대사 차이를 다시 읽습니다. 모든 검사가 통과한 뒤 `Path.replace`가 임시 파일을 `expense_result.xlsx`로 교체합니다.

이 순서는 재실행에 특히 중요합니다. 새 입력의 열이 빠졌거나 임시 결과 검증이 실패하면 교체 줄까지 도달하지 않습니다. 따라서 지난번에 성공한 `expense_result.xlsx`는 그대로 남습니다.

#### 예시 코드: 네 시트를 임시 파일에 쓴 뒤 교체하기

아래 `src/main.py`의 입력은 `input` 폴더의 Excel 파일입니다. 핵심 동작은 읽기, 정규화, 중복 검사, 요약, 네 시트 쓰기, 재검사, 최종 교체 순서입니다. 출력은 검증을 통과한 `output/expense_result.xlsx` 한 파일입니다.

```python
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter


REQUIRED_COLUMNS = ["지출ID", "일자", "부서", "항목", "금액", "비고"]
SHEET_NAMES = ["01_통합내역", "02_부서별요약", "03_확인필요", "04_검증결과"]
REVIEW_LIMIT = 100_000


def read_inputs(input_dir: Path) -> tuple[list[Path], pd.DataFrame]:
    input_files = sorted(input_dir.glob("*.xlsx"))
    if not input_files:
        raise FileNotFoundError(f"입력 Excel 파일이 없습니다: {input_dir}")

    tables = []
    for input_file in input_files:
        workbook = load_workbook(input_file, read_only=True, data_only=False)
        try:
            header = [
                str(cell.value).strip() if cell.value is not None else ""
                for cell in next(workbook.active.iter_rows(min_row=1, max_row=1))
            ]
        finally:
            workbook.close()

        duplicate_columns = sorted(
            {name for name in header if name and header.count(name) > 1}
        )
        if duplicate_columns:
            raise ValueError(
                f"{input_file.name} 중복 열 이름: {', '.join(duplicate_columns)}"
            )

        table = pd.read_excel(input_file, engine="openpyxl")
        table.columns = table.columns.astype(str).str.strip()

        missing = [name for name in REQUIRED_COLUMNS if name not in table.columns]
        if missing:
            raise ValueError(f"{input_file.name} 필수 열 누락: {', '.join(missing)}")

        table = table[REQUIRED_COLUMNS].copy()
        table["원본파일"] = input_file.name
        table["원본행"] = range(2, len(table) + 2)
        tables.append(table)

    return input_files, pd.concat(tables, ignore_index=True)


def normalize_and_validate(merged: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    merged = merged.copy()
    merged["지출ID"] = merged["지출ID"].astype("string").str.strip()
    missing_id = merged["지출ID"].isna() | merged["지출ID"].eq("")
    if missing_id.any():
        locations = merged.loc[missing_id, ["원본파일", "원본행"]].to_dict("records")
        raise ValueError(f"지출ID 누락: {locations}")

    duplicate_ids = sorted(
        merged.loc[merged["지출ID"].duplicated(keep=False), "지출ID"].unique()
    )
    if duplicate_ids:
        raise ValueError(f"중복 지출ID: {', '.join(duplicate_ids)}")

    merged["일자_원문"] = merged["일자"].astype("string").fillna("")
    merged["금액_원문"] = merged["금액"].astype("string").fillna("")
    merged["일자"] = pd.to_datetime(merged["일자"], errors="coerce").dt.date
    merged["금액"] = pd.to_numeric(merged["금액"], errors="coerce")
    merged["부서"] = merged["부서"].astype("string").str.strip()

    def review_reason(row: pd.Series) -> str:
        reasons = []
        if pd.isna(row["일자"]):
            reasons.append("일자 확인")
        if pd.isna(row["부서"]) or row["부서"] == "":
            reasons.append("부서 누락")
        if pd.isna(row["금액"]):
            reasons.append("금액 확인")
        elif row["금액"] >= REVIEW_LIMIT:
            reasons.append("10만원 이상")
        return ", ".join(reasons)

    merged["확인필요_이유"] = merged.apply(review_reason, axis=1)
    review = merged.loc[merged["확인필요_이유"].ne("")].copy()
    return merged, review


def build_summary(
    merged: pd.DataFrame, input_count: int, review_count: int
) -> tuple[pd.DataFrame, pd.DataFrame]:
    department_ok = merged["부서"].notna() & merged["부서"].ne("")
    amount_ok = merged["금액"].notna()
    summary_source = merged.loc[department_ok & amount_ok]

    summary = (
        summary_source.groupby("부서", as_index=False)
        .agg(거래건수=("금액", "size"), 합계금액=("금액", "sum"))
        .sort_values("부서")
    )

    calculable_total = int(merged["금액"].sum())
    department_total = int(summary["합계금액"].sum())
    unassigned_total = int(merged.loc[~department_ok & amount_ok, "금액"].sum())
    difference = calculable_total - department_total - unassigned_total

    validation = pd.DataFrame(
        {
            "항목": [
                "입력 파일 수",
                "통합 행 수",
                "확인필요 행 수",
                "계산 가능 금액 합계",
                "부서별 합계",
                "부서 미지정 금액",
                "대사 차이",
            ],
            "확인값": [
                input_count,
                len(merged),
                review_count,
                calculable_total,
                department_total,
                unassigned_total,
                difference,
            ],
        }
    )
    return summary, validation


def write_workbook(
    target: Path,
    merged: pd.DataFrame,
    summary: pd.DataFrame,
    review: pd.DataFrame,
    validation: pd.DataFrame,
) -> None:
    with pd.ExcelWriter(target, engine="openpyxl", mode="w") as writer:
        for sheet_name, table in zip(
            SHEET_NAMES, [merged, summary, review, validation], strict=True
        ):
            table.to_excel(writer, sheet_name=sheet_name, index=False)
            worksheet = writer.sheets[sheet_name]
            worksheet.freeze_panes = "A2"
            worksheet.auto_filter.ref = worksheet.dimensions

            for column_cells in worksheet.columns:
                width = max(len(str(cell.value or "")) for cell in column_cells) + 2
                letter = get_column_letter(column_cells[0].column)
                worksheet.column_dimensions[letter].width = min(width, 28)


def verify_workbook(
    target: Path, expected_rows: int, expected_total: int, expected_review: int
) -> None:
    with pd.ExcelFile(target, engine="openpyxl") as workbook:
        if workbook.sheet_names != SHEET_NAMES:
            raise ValueError(f"결과 시트 불일치: {workbook.sheet_names}")

        merged_check = pd.read_excel(workbook, sheet_name="01_통합내역")
        review_check = pd.read_excel(workbook, sheet_name="03_확인필요")
        validation_check = pd.read_excel(workbook, sheet_name="04_검증결과")

    checks = dict(zip(validation_check["항목"], validation_check["확인값"], strict=True))
    if len(merged_check) != expected_rows:
        raise ValueError(f"결과 행 수 불일치: {len(merged_check)} != {expected_rows}")
    if len(review_check) != expected_review:
        raise ValueError(
            f"확인필요 행 수 불일치: {len(review_check)} != {expected_review}"
        )
    if int(checks["계산 가능 금액 합계"]) != expected_total:
        raise ValueError("계산 가능 금액 합계가 입력 계산과 다릅니다")
    if int(checks["대사 차이"]) != 0:
        raise ValueError(f"부서별 합계 대사 실패: {checks['대사 차이']}")


def run(project_root: Path) -> Path:
    input_dir = project_root / "input"
    output_dir = project_root / "output"
    result_file = output_dir / "expense_result.xlsx"
    temp_file = output_dir / ".expense_result.tmp.xlsx"

    input_files, raw = read_inputs(input_dir)
    merged, review = normalize_and_validate(raw)
    summary, validation = build_summary(merged, len(input_files), len(review))
    calculable_total = int(merged["금액"].sum())

    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        write_workbook(temp_file, merged, summary, review, validation)
        verify_workbook(temp_file, len(merged), calculable_total, len(review))
        temp_file.replace(result_file)
    except PermissionError as error:
        raise PermissionError(
            f"결과 파일을 Excel에서 닫고 다시 실행하세요: {result_file}"
        ) from error
    finally:
        temp_file.unlink(missing_ok=True)

    print(f"입력 {len(input_files)}개, 통합 {len(merged)}행")
    print(f"확인필요 {len(review)}행, 계산 가능 합계 {calculable_total:,}원")
    print("검증 통과: 시트 4개, 대사 차이 0원")
    print(result_file)
    return result_file


if __name__ == "__main__":
    run(Path(__file__).resolve().parents[1])
```

코드가 길어 보여도 각 함수의 입출력은 한 가지입니다. `read_inputs`는 읽고, `normalize_and_validate`는 값과 ID를 검사하고, `build_summary`는 합계를 만들며, `write_workbook`과 `verify_workbook`은 저장과 재검사를 나눠 맡습니다. 이제 실제 출력에서 이 약속이 지켜졌는지 확인할 차례입니다.

## 저장한 Excel을 다시 열어 증명합니다

### 화면에 파일이 생긴 것보다 네 시트의 행 수와 금액 대사가 맞는지를 성공 기준으로 봅니다

![저장된 통합문서의 네 시트가 행 수와 확인필요 수 및 합계 검사표에 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9f/9fc351b59583679c33a52035367fa90aebb43713b99f268dfa5122cae5abd176.png "파일 존재 여부만 보지 않고 저장된 값을 다시 읽어 입력에서 계산한 값과 비교해야 완료입니다")

`main.py`는 메모리에 있던 값만 출력하지 않습니다. 임시 Excel을 `pd.ExcelFile`로 다시 열고 실제 저장된 시트 이름을 확인합니다. `01_통합내역`과 `03_확인필요`의 행 수를 다시 세고 `04_검증결과`의 금액과 대사 차이도 읽습니다.

이 검사는 파일이 깨지지 않고 저장됐다는 사실과 핵심 숫자가 유지됐다는 사실을 함께 확인합니다. Excel에서 눈으로 네 시트를 넘겨 보는 일은 여전히 유용하지만 매달 아홉 행이 수천 행으로 늘어났을 때 사람의 확인만으로 같은 증거를 만들기는 어렵습니다.

#### 실행 명령: 결과 통합문서 만들기

아래 명령의 입력은 앞에서 만든 세 Excel 파일입니다. `main.py`가 네 시트를 임시 파일에 쓰고 다시 검사한 뒤 최종 파일로 바꿉니다. 출력에 `검증 통과`와 `대사 차이 0원`이 보이지 않으면 결과를 전달하지 않아야 합니다.

```powershell
uv run python src/main.py
```

#### 예상 결과: 행 수와 합계 및 시트 수 확인하기

```text
입력 3개, 통합 9행
확인필요 4행, 계산 가능 합계 597,000원
검증 통과: 시트 4개, 대사 차이 0원
C:\작업폴더\expense_excel_merge\output\expense_result.xlsx
```

`03_확인필요`에는 E002와 E005의 `10만원 이상`, E006의 `부서 누락`, E008의 `금액 확인`이 보여야 합니다. E008의 금액은 합계에서 빠지고 E006의 50,000원은 계산 가능 합계에 남습니다. 이 차이를 이해해야 597,000원과 부서별 합계 547,000원이 서로 다르다고 잘못 판단하지 않습니다.

#### 설명 목록: 네 시트에서 직접 찾아야 하는 값

| 시트 | 확인할 값 | 맞는 이유 |
|---|---:|---|
| `01_통합내역` | 9행 | 세 파일의 3행씩을 모두 보존 |
| `02_부서별요약` | 3개 부서, 547,000원 | 부서와 금액이 있는 행만 계산 |
| `03_확인필요` | 4행 | 기준 이상 2행, 부서 누락 1행, 금액 오류 1행 |
| `04_검증결과` | 전체 597,000원, 차이 0원 | 부서별 금액과 미지정 금액을 다시 대사 |

#### 참고 자료: 여러 시트 쓰기와 저장 파일 다시 읽기

- [pandas ExcelWriter 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.ExcelWriter.html)
- [pandas to_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_excel.html)
- [pandas ExcelFile 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.ExcelFile.html)
- [Python Path.replace 공식 문서](https://docs.python.org/3/library/pathlib.html#pathlib.Path.replace)

정상 결과를 한 번 본 것만으로 자동화가 안전해지지는 않습니다. 어떤 문제에서는 즉시 멈추고 어떤 문제에서는 검토 행을 남길지 알아야 실제 월말 파일이 달라졌을 때 복구할 수 있습니다.

## 실패는 멈춤과 검토로 나누어 복구합니다

### 전체 합계를 믿을 수 없는 오류는 중단하고 일부 행만 고치면 되는 값은 결과에 남깁니다

![열 누락과 중복 ID는 중단 경로로 가고 빈 부서와 잘못된 금액은 검토 시트로 가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/65/650759fb310a10fb1befee4028a16ca736e2dab559e813667646676534bce9ba.png "오류의 종류에 따라 결과 전체를 막을지 문제 행을 보존할지 구분하면 복구할 위치가 분명해집니다")

파일 없음, 필수 열 누락, 중복 열, 빈 ID, 중복 ID는 실행을 중단합니다. 이 상태에서 일부 파일만 합치면 완성된 것처럼 보이는 불완전한 결과가 생깁니다. 오류 메시지에 적힌 파일과 열 또는 ID를 원본에서 고친 뒤 전체 명령을 다시 실행합니다.

잘못된 날짜, 빈 부서, 숫자가 아닌 금액, 검토 기준 이상 금액은 `03_확인필요`로 보냅니다. 문제 셀의 원문과 `원본파일`, `원본행`이 함께 있으므로 어느 파일을 열어야 할지 찾을 수 있습니다. 원본을 고친 뒤 다시 실행하면 같은 ID의 행이 정상 계산으로 돌아옵니다.

결과 파일을 Excel에서 열어 둔 상태에서는 Windows가 파일 교체를 막을 수 있습니다. 코드는 `결과 파일을 Excel에서 닫고 다시 실행하세요`라는 `PermissionError`를 보여 줍니다. Excel 창을 닫고 같은 명령을 다시 실행하면 되며, 실패 중에 만든 임시 파일은 `finally`에서 지웁니다.

#### 실패 예시: 열 누락과 중복 ID 복구하기

아래는 실제로 나와야 하는 오류 모양입니다. 입력은 각각 `금액` 머리글을 지운 파일과 E001을 두 번 쓴 파일입니다. 핵심은 오류가 파일이나 ID를 가리킨다는 점이며, 출력 파일을 억지로 열기보다 원본을 고친 뒤 전체 실행을 다시 시작해야 합니다.

```text
ValueError: admin.xlsx 필수 열 누락: 금액
복구: admin.xlsx 첫 행의 머리글을 금액으로 고친 뒤 다시 실행

ValueError: 중복 지출ID: E001
복구: sales.xlsx와 admin.xlsx에서 E001 두 행을 찾아 올바른 ID를 확인한 뒤 다시 실행

PermissionError: 결과 파일을 Excel에서 닫고 다시 실행하세요
복구: expense_result.xlsx를 연 Excel 창을 닫은 뒤 다시 실행
```

#### 예상 결과: 정상 실행과 실패한 재실행에서 기존 결과 지키기

이 글의 코드는 합성 파일로 다섯 가지 경우를 실행했습니다. 정상 실행은 시트 4개와 597,000원을 확인했고 열 누락과 중복 열 및 중복 ID는 출력 전에 멈췄습니다. 한 번 성공한 뒤 열을 지우고 재실행한 경우에는 이전 `expense_result.xlsx`의 바이트가 그대로 남는 것도 확인했습니다.

```text
정상 입력                 통과, 4개 시트와 대사 차이 0원
admin.xlsx 금액 열 누락   중단, 최종 결과 미생성
admin.xlsx 금액 열 중복   중단, pandas의 이름 변경 전 발견
E001 중복                 중단, 이중 계산 방지
성공 후 부서 열 누락      중단, 이전 최종 결과 그대로 보존

5 passed
```

이 실패 정책도 모든 Excel 파일에 그대로 적용할 수 있는 것은 아닙니다. 수식, 매크로, 병합 머리글, 여러 표가 한 시트에 섞인 파일은 이 예제의 입력 계약 밖에 있으므로 마지막으로 범위를 구분해야 합니다.

## 자동화가 맞지 않는 파일도 구분합니다

### 반복되는 값 중심 표에는 잘 맞지만 서식과 수식 자체가 핵심인 통합문서는 별도 설계가 필요합니다

![반복되는 단순 표는 자동 병합으로 가고 수식과 매크로 및 복잡한 서식 문서는 별도 검토로 갈라지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1a/1a54ba9d0ae6ed31f118f4a1d34d4c859b39679e74cdd08a1f34367923ac82c3.png "값 중심 표와 문서형 Excel을 같은 입력으로 취급하지 않아야 수식과 매크로 및 그림을 잃지 않습니다")

이 자동화는 매달 같은 여섯 열로 오는 값 중심 `.xlsx` 파일에 잘 맞습니다. 파일 수가 늘어도 같은 검사와 합계를 반복할 수 있고, 결과를 새 통합문서로 만들기 때문에 원본을 덮어쓰지 않습니다. 지출, 주문, 재고, 설문처럼 한 행이 한 건을 뜻하는 표에 적용하기 좋습니다.

반대로 제목이 여러 줄이고 셀이 병합됐거나 한 시트에 표가 두 개 있으면 먼저 읽기 규칙을 새로 정해야 합니다. `.xls`, `.xlsb`, `.ods`는 확장자에 맞는 읽기 엔진이 필요합니다. 이름만 `.xlsx`로 바꾸는 것은 파일 형식을 변환하는 일이 아닙니다.

수식이 있는 셀도 주의해야 합니다. openpyxl은 Excel처럼 수식을 계산하지 않습니다. `data_only=True`로 열 때 보이는 값은 Excel이 마지막으로 저장한 계산 결과일 수 있습니다. 최신 계산값이 꼭 필요하면 Excel에서 다시 계산해 저장하는 절차와 캐시 검사를 별도로 설계해야 합니다.

매크로가 있는 `.xlsm`, 피벗 테이블, 차트, 도형, 외부 연결, 복잡한 서식은 새 값 중심 결과 파일로 단순화할 수 있는지 먼저 판단합니다. 기존 통합문서를 열고 같은 이름으로 다시 저장하면 일부 기능을 보존하지 못할 수 있으므로 원본에 이 코드를 바로 적용하지 않습니다.

행이 매우 많아 Excel에서 열고 검토하기 어려워지면 CSV, Parquet, 데이터베이스가 중간 저장소로 더 알맞을 수 있습니다. 그 경우에도 입력 열 검사, 고유 ID, 원문 보존, 대사라는 원칙은 그대로 사용할 수 있지만 최종 출력과 검증 방법은 바뀝니다.

#### 확인 목록: 지금 가진 Excel이 이 예제와 맞는지 구분하기

- 각 시트의 첫 행에 머리글이 있고 한 행이 한 건인가
- 모든 파일에서 필수 열의 뜻과 단위가 같은가
- 파일을 가로질러 한 건을 구분할 고유 ID가 있는가
- 수식 결과가 아니라 저장된 셀 값을 합치면 되는가
- 새 결과 파일을 만들어도 매크로와 복잡한 서식을 보존할 필요가 없는가
- 전체 합계를 서로 겹치지 않는 두 묶음으로 다시 대사할 수 있는가

#### 참고 자료: 수식과 큰 통합문서의 제한 확인하기

- [openpyxl 통합문서 읽기 공식 문서](https://openpyxl.readthedocs.io/en/stable/api/openpyxl.reader.excel.html)
- [openpyxl 읽기 전용 모드 공식 문서](https://openpyxl.readthedocs.io/en/stable/optimized.html)
- [openpyxl 파일 불러오기 주의사항](https://openpyxl.readthedocs.io/en/stable/tutorial.html#loading-from-a-file)

#### 실행 명령: 내 입력으로 바꾸고 같은 검증 다시 보기

먼저 합성 파일을 다른 폴더로 옮기고 실제 입력의 복사본만 `input`에 넣습니다. 열 이름과 `지출ID`를 확인한 뒤 아래 명령을 실행합니다. 성공 출력에서 시트 4개와 대사 차이 0원을 확인하고, `03_확인필요`의 모든 행을 원본 위치와 대조한 뒤에만 결과를 전달합니다.

```powershell
uv run python src/main.py
```

Python Excel 파일 합치기의 완료 기준은 `expense_result.xlsx`가 생겼다는 한 줄이 아닙니다. 입력이 검사됐고, 문제 행의 원문이 남았으며, 저장한 파일을 다시 읽었고, 전체 금액이 두 계산 경로에서 같아야 합니다. 이 네 가지가 모두 보일 때 월말 복사를 반복 가능한 자동화로 바꾼 것입니다.
