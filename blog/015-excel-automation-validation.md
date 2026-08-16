---
title: "Excel 자동화 검증 방법: 합계가 맞아도 틀린 행을 찾는 11가지 검사"
slug: excel-automation-validation
author: eddmpython
section: Excel 업무자동화
summary: Excel 자동화 검증을 파일 생성 여부에서 끝내지 않고 행, 금액, 요약, 업무 규칙, 재실행, 원본 보호까지 확인합니다. 합계가 같은데 두 행이 틀린 반례와 11개 PASS를 만드는 완성 프로젝트를 실행합니다.
readerQuestion: Excel 자동화가 만든 파일의 숫자와 행 및 원본이 정말 맞는지 어떻게 검증할까?
readerTakeaway: 원본에서 기대값을 다시 계산하고 행 단위 대조와 재실행 및 해시 검사를 함께 통과해야 Excel 자동화를 성공으로 판정할 수 있다.
readerLevel: beginner
readerStartingPoint: Python으로 Excel 파일을 검사해 본 적이 없고 스키마와 대사 및 멱등성과 해시의 뜻을 모른다.
primaryKeyword: Excel 자동화 검증
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/20/20f8b564392100e61319cf3cfcce9bced8cda4aac3fbc397e2006ea2bcaa2f9f.png
ogImageAlt: 입력 Excel과 자동화 결과 사이를 구조와 행과 계산 및 원본 보호 검사가 차례로 확인하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Excel 자동화 검증을 `결과 파일이 생겼다`에서 끝내면 틀린 숫자도 성공으로 보입니다. 두 지출의 금액이
각각 1,000원씩 반대 방향으로 틀리면 전체 합계는 그대로이기 때문입니다. 같은 행이 두 번 들어가거나
원본 파일을 덮어쓴 문제도 파일 아이콘만 보고는 알 수 없습니다.

이 글에서는 입력 Excel 3개를 합쳐 결과 통합 문서 1개를 만드는 작은 프로젝트를 직접 실행합니다.
`uv run python src/validate_result.py` 한 줄로 구조, 행, 금액, 요약, 업무 규칙, 재실행, 원본 보호를
검사하고 `04_검증결과` 시트의 11개 `PASS`와 종료 코드 `0`을 확인합니다.

## 파일이 생겼다고 성공은 아닙니다

### Excel 자동화는 입력과 계산과 저장 및 재실행을 따로 확인해야 합니다

![입력 Excel과 자동화 결과 사이를 구조와 행과 계산 및 원본 보호 검사가 차례로 확인하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/20/20f8b564392100e61319cf3cfcce9bced8cda4aac3fbc397e2006ea2bcaa2f9f.png "결과 파일 하나가 아니라 입력에서 출력까지 이어지는 서로 다른 검증 층을 모두 통과해야 성공입니다")

자동화 프로그램의 정상 종료는 코드가 예외 없이 끝났다는 뜻입니다. 파일 생성은 지정한 경로에 바이트가
저장됐다는 뜻입니다. 두 사실만으로는 `지출ID`, 금액, 시트 이름, 원본 보호가 맞다고 증명할 수 없습니다.

검증은 프로그램이 해야 할 일을 관찰 가능한 값으로 바꾸는 작업입니다. 결과 시트가 4개인지, 입력과
통합내역의 `지출ID`가 같은지, 10만원 이상 행만 확인 대상인지처럼 기대값과 실제값을 나란히 놓습니다.
기대값과 실제값이 같으면 `PASS`, 다르면 `FAIL`로 기록합니다.

한 가지 검사로 모든 오류를 잡을 수도 없습니다. 행 수가 9개여도 원래 행 하나가 빠지고 다른 행 하나가
복제될 수 있습니다. 총액이 597,000원이어도 두 행의 금액 오류가 서로 상쇄될 수 있습니다.

따라서 이 글은 검증을 구조, 키, 행, 계산, 파생 결과, 재실행, 원본 보호로 나눕니다. 여기서 키는 각
지출을 다른 지출과 구분하는 `지출ID`입니다. 각 층은 앞선 검사에서 보이지 않는 다른 실패를 찾습니다.

#### 설명 목록: 파일 생성만 확인할 때 놓치는 오류

| 보이는 현상 | 숨어 있을 수 있는 오류 | 필요한 검사 |
|---|---|---|
| 결과 파일이 열림 | 필요한 시트가 빠짐 | 시트 이름과 순서 |
| 통합내역이 9행임 | 한 행 누락과 다른 행 복제가 동시에 발생 | `지출ID` 집합과 중복 수 |
| 총액이 597,000원임 | 두 행의 금액 오류가 서로 상쇄 | 행별 모든 열 대조 |
| 두 번째 실행도 끝남 | 기존 결과에 새 행을 누적 | 1차와 2차 결과 비교 |
| 결과가 맞아 보임 | 입력 Excel을 덮어씀 | 실행 전후 원본 해시 비교 |

검증 종류가 필요한 이유를 알았으므로, 이제 각 검사가 무엇을 보증하는지 먼저 계약으로 고정할 차례입니다.

## 검사 계약부터 숫자로 적습니다

### 11개 PASS가 무엇을 보증하고 무엇을 보증하지 않는지 먼저 정합니다

![입력과 구조와 데이터와 재실행 및 원본 보호 영역에 검증 항목이 나뉘어 배치된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/63/63927a6401a7aff43f16ad4f4b78733907396bb2dc78d1253c6f6de0917ab25f.png "검사 항목마다 기대값과 실패 의미가 있어야 PASS가 무엇을 보증하는지 설명할 수 있습니다")

검사 계약은 `무엇을 기대하고 무엇을 실제로 읽을지` 적은 표입니다. 예를 들어 `통합 행 수`의 기대값은
원본 3개에서 다시 센 행 수이고, 실제값은 `01_통합내역`에서 센 행 수입니다. 둘을 같은 결과 파일에서
읽으면 오류가 양쪽에 복제돼 검사가 무의미해집니다.

이 프로젝트는 11개 검사를 사용합니다. 파일 이름, 시트 이름과 순서, 행 수, `지출ID` 집합, 중복
`지출ID`, 모든 열의 값, 총액, 부서별 요약, 10만원 이상 확인 대상, 재실행 결과, 원본 해시를 확인합니다.

검사 수 자체가 품질 점수는 아닙니다. 같은 총액을 두 번 확인하는 검사 100개보다 행 단위 오류를 잡는
검사 1개가 더 유용합니다. 그래서 각 검사는 서로 다른 실패 사례와 연결돼야 합니다.

#### 확인 목록: 11개 검사의 기대값과 실패 의미

| 구분 | 검사 | 기대값 | 실패하면 먼저 볼 곳 |
|---|---|---|---|
| 입력 | 입력 파일 이름 | `busan.xlsx`, `daejeon.xlsx`, `seoul.xlsx` | `input` 폴더 |
| 구조 | 결과 시트 이름과 순서 | 약속한 4개 | `ExcelWriter` 부분 |
| 건수 | 통합 행 수 | 입력에서 센 9행 | 파일 검색과 `concat` 부분 |
| 키 | `지출ID` 집합 | 입력과 같음 | 누락 필터와 잘못된 조인 |
| 키 | 중복 `지출ID` 수 | 0 | 반복 추가와 중복 입력 |
| 행 | 통합내역 모든 열 | 입력과 같음 | 열 변환과 값 변경 |
| 금액 | 통합 금액 합계 | 입력에서 더한 597,000원 | 금액 정리와 누락 행 |
| 요약 | 부서별 건수와 금액 | 입력에서 다시 계산한 표 | `groupby` 부분 |
| 규칙 | 10만원 이상 확인필요 | 입력에서 다시 고른 2행 | 비교 연산자와 기준값 |
| 재실행 | 1차와 2차 업무 시트 | 같음 | 기존 결과 누적과 실행 시각 |
| 원본 | 실행 전후 입력 해시 | 같음 | 입력 경로에 쓰는 코드 |

이 표는 성공 조건뿐 아니라 조사 시작점도 제공합니다. 계약을 먼저 정했으므로 같은 입력과 출력을 누구나
다시 만들 수 있는 프로젝트를 준비해야 합니다.

## 실행할 프로젝트를 준비합니다

### 입력 3개와 결과 4개 시트를 같은 폴더 구성으로 재현합니다

![입력 Excel 세 개와 Python 파일 세 개가 결과 통합 문서 한 개로 연결된 프로젝트 폴더 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/04/047b3cf8d935a6c5e5c3b9289c4a06891b230ef25f51345a37257eb3117b7b36.png "입력 생성과 자동화 실행 및 검증을 서로 다른 파일로 나누면 각 단계의 책임과 실패 위치가 보입니다")

예제는 실제 회사 파일 대신 코드로 만든 작은 입력을 사용합니다. 세 파일에는 `지출ID`, `사용일`,
`부서`, `항목`, `금액`, `승인상태`가 있고 모두 합치면 9행과 597,000원입니다. 10만원 이상인 2행은
`03_확인필요` 시트로도 복사됩니다.

`uv`는 프로젝트마다 Python과 패키지 버전을 따로 관리하는 도구입니다. 아직 없다면
[uv 공식 설치 안내](https://docs.astral.sh/uv/getting-started/installation/)에서 운영체제에 맞는 명령을
먼저 확인할 수 있습니다. 아래 명령은 현재 폴더에 필요한 패키지를 설치합니다.

#### 실행 명령: 프로젝트 폴더와 패키지 만들기

빈 폴더에서 다음 명령을 실행합니다. 첫 줄은 프로젝트로 사용할 폴더를 만들고, 두 번째 줄은 그 폴더로
이동합니다. `uv init`은 기본 프로젝트 파일을 만들고 나머지 두 명령은 Excel 처리와 테스트 패키지를
추가합니다.

```powershell
mkdir excel-automation-validation
cd excel-automation-validation
uv init --python 3.12
uv add pandas openpyxl
uv add --dev pytest
mkdir input, output, src, tests
```

명령이 끝나면 `pyproject.toml`과 `uv.lock`이 생깁니다. `uv.lock`은 실제로 설치할 패키지 버전을
기록하므로 다른 컴퓨터에서도 같은 조합을 재현하는 데 사용됩니다.

#### 예상 결과: 프로젝트 폴더와 파일 구성

```text
excel-automation-validation/
├─ input/
├─ output/
├─ src/
│  ├─ make_sample.py
│  ├─ main.py
│  └─ validate_result.py
├─ tests/
│  └─ test_validation.py
├─ pyproject.toml
└─ uv.lock
```

`make_sample.py`는 연습용 원본 3개를 만듭니다. `main.py`는 자동화 대상이며 결과 통합 문서를 만듭니다.
`validate_result.py`는 그 결과를 믿지 않고 다시 검사합니다. `test_validation.py`는 일부러 고장을 넣어
검사가 실제로 실패하는지 확인합니다.

#### 예시 코드: 입력 Excel 세 개 만들기

다음 코드를 `src/make_sample.py`에 저장합니다. 입력은 코드 안의 아홉 지출이고 출력은 `input` 폴더의
Excel 세 파일입니다. 파일을 다시 만들면 같은 이름의 연습 파일을 덮어쓰므로 실제 업무 폴더에서는
실행하지 않습니다.

```python
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = PROJECT_ROOT / "input"


SAMPLE_FILES = {
    "seoul.xlsx": [
        ["EXP-001", "2026-08-01", "영업", "교통비", "12,000원", "승인"],
        ["EXP-002", "2026-08-02", "영업", "식비", "35,000", "승인"],
        ["EXP-003", "2026-08-03", "개발", "소프트웨어", "120,000", "승인"],
    ],
    "busan.xlsx": [
        ["EXP-004", "2026-08-04", "개발", "교통비", "45,000", "승인"],
        ["EXP-005", "2026-08-05", "인사", "교육비", "80,000", "승인"],
        ["EXP-006", "2026-08-06", "영업", "접대비", "150,000", "승인"],
    ],
    "daejeon.xlsx": [
        ["EXP-007", "2026-08-07", "인사", "소모품", "25,000", "승인"],
        ["EXP-008", "2026-08-08", "개발", "장비", "90,000", "승인"],
        ["EXP-009", "2026-08-09", "영업", "통신비", "40,000", "승인"],
    ],
}


def main() -> None:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    columns = ["지출ID", "사용일", "부서", "항목", "금액", "승인상태"]

    for file_name, rows in SAMPLE_FILES.items():
        pd.DataFrame(rows, columns=columns).to_excel(
            INPUT_DIR / file_name,
            index=False,
        )

    print("샘플 입력 3개를 만들었습니다")


if __name__ == "__main__":
    main()
```

실행 뒤 `input` 폴더에 세 파일이 보이면 첫 입력이 준비된 것입니다. 파일 이름과 행 수가 검사 계약의
일부이므로 이름을 바꾸려면 검증 코드의 `EXPECTED_INPUT_FILES`도 함께 바꿔야 합니다.

#### 예시 코드: 검증 대상 Excel 자동화 만들기

다음 코드를 `src/main.py`에 저장합니다. 입력은 방금 만든 세 파일이고 출력은 통합내역, 부서별요약,
확인필요, 검증결과 자리표시자 시트가 든 `expense_result.xlsx`입니다. 임시 파일을 다 쓴 뒤 결과 이름으로
교체하므로 저장 도중 실패했을 때 기존 결과를 바로 덮어쓸 가능성을 줄입니다.

```python
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = PROJECT_ROOT / "input"
OUTPUT_DIR = PROJECT_ROOT / "output"
RESULT_FILE = OUTPUT_DIR / "expense_result.xlsx"
REQUIRED_COLUMNS = ["지출ID", "사용일", "부서", "항목", "금액", "승인상태"]


def normalize_amount(series: pd.Series) -> pd.Series:
    cleaned = series.astype("string").str.replace(r"[^0-9.-]", "", regex=True)
    return pd.to_numeric(cleaned, errors="raise").astype("int64")


def load_inputs(input_files: list[Path]) -> pd.DataFrame:
    tables: list[pd.DataFrame] = []

    for path in input_files:
        table = pd.read_excel(path)
        missing = [column for column in REQUIRED_COLUMNS if column not in table.columns]
        if missing:
            raise ValueError(f"{path.name}: 필수 열 누락 {missing}")

        table = table[REQUIRED_COLUMNS].copy()
        table["사용일"] = pd.to_datetime(table["사용일"], errors="raise").dt.strftime(
            "%Y-%m-%d"
        )
        table["금액"] = normalize_amount(table["금액"])
        table["원본파일"] = path.name
        tables.append(table)

    merged = pd.concat(tables, ignore_index=True)
    return merged.sort_values("지출ID", kind="stable").reset_index(drop=True)


def main() -> None:
    input_files = sorted(INPUT_DIR.glob("*.xlsx"))
    if not input_files:
        raise FileNotFoundError("input 폴더에 .xlsx 파일이 없습니다")

    merged = load_inputs(input_files)
    summary = (
        merged.groupby("부서", as_index=False)
        .agg(건수=("지출ID", "size"), 금액합계=("금액", "sum"))
        .sort_values("부서", kind="stable")
        .reset_index(drop=True)
    )
    review = merged.loc[merged["금액"] >= 100_000].reset_index(drop=True)
    validation_placeholder = pd.DataFrame(
        [{"항목": "검증 전", "기대값": "11개 검사", "실제값": "미실행", "결과": "PENDING"}]
    )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    temporary_file = OUTPUT_DIR / ".expense_result.tmp.xlsx"
    try:
        with pd.ExcelWriter(temporary_file, engine="openpyxl", mode="w") as writer:
            merged.to_excel(writer, sheet_name="01_통합내역", index=False)
            summary.to_excel(writer, sheet_name="02_부서별요약", index=False)
            review.to_excel(writer, sheet_name="03_확인필요", index=False)
            validation_placeholder.to_excel(
                writer,
                sheet_name="04_검증결과",
                index=False,
            )
        temporary_file.replace(RESULT_FILE)
    finally:
        temporary_file.unlink(missing_ok=True)

    print(f"{RESULT_FILE.name}: {len(merged)}행, {int(merged['금액'].sum())}원")


if __name__ == "__main__":
    main()
```

이 자동화는 결과를 만들 뿐 결과가 맞다고 스스로 선언하지 않습니다. 검증 코드가 원본을 별도로 읽고
같은 기대값을 다시 계산해야 하므로, 다음 절에서는 자동화 코드와 검사 코드를 분리합니다.

## 입력과 결과를 따로 읽습니다

### 검증 코드는 자동화 결과를 믿지 않고 원본에서 기대값을 다시 계산합니다

![원본 Excel에서 계산한 기대 표와 결과 통합 문서에서 읽은 실제 표가 독립된 경로로 비교되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ba/ba0aeffadb54a1b22869da8034595ac2226761723ccad07b59fadc16f1cfe8f7.png "기대값과 실제값을 서로 다른 파일에서 계산해야 같은 오류를 두 번 믿는 일을 피할 수 있습니다")

대사는 두 숫자나 두 표가 맞는지 서로 맞춰 보는 일입니다. 회계에서 장부와 통장 내역을 맞추는 것처럼,
이 프로젝트는 원본 Excel에서 만든 기대 표와 결과 통합 문서에서 읽은 실제 표를 대조합니다. 둘을
독립적으로 읽어야 자동화가 잘못 만든 값을 정답으로 다시 사용하는 일을 피할 수 있습니다.

`pd.ExcelFile`은 통합 문서의 시트 이름을 먼저 읽는 데 사용합니다. `pd.read_excel`은 각 시트를
DataFrame으로 가져옵니다. DataFrame은 행과 열로 된 표를 Python에서 다루는 자료형입니다.

기대 표는 입력 파일마다 필요한 열을 확인한 뒤 날짜를 `YYYY-MM-DD`, 금액을 정수로 바꿉니다. 검증 쪽은
자동화와 다른 금액 정리식을 사용해 같은 변환 버그를 함께 믿을 위험을 줄입니다. 마지막에 `원본파일`을
붙이고 고유한 `지출ID`로 정렬하므로 파일을 읽은 순서가 달라도 같은 지출끼리 만납니다.

#### 예시 코드: 기대 행과 결과 통합 문서 읽기

아래 부분은 전체 검증 코드의 핵심 입력 단계입니다. `read_expected_rows`의 출력은 원본에서 다시 만든
기대 DataFrame이고, `read_workbook`의 출력은 결과 파일의 시트 이름과 실제 DataFrame 모음입니다.
금액 변환 중 글자가 남거나 날짜를 해석할 수 없으면 조용히 넘기지 않고 오류로 멈춥니다.

```python
def read_expected_rows(input_files: list[Path]) -> pd.DataFrame:
    tables: list[pd.DataFrame] = []

    for path in input_files:
        table = pd.read_excel(path)
        required = ["지출ID", "사용일", "부서", "항목", "금액", "승인상태"]
        missing = [column for column in required if column not in table.columns]
        if missing:
            raise ValueError(f"{path.name}: 검증에 필요한 열 누락 {missing}")

        table = table[required].copy()
        table["사용일"] = pd.to_datetime(
            table["사용일"],
            format="%Y-%m-%d",
            errors="raise",
        ).dt.strftime("%Y-%m-%d")
        table["금액"] = normalize_amount(table["금액"])
        table["원본파일"] = path.name
        tables.append(table)

    return (
        pd.concat(tables, ignore_index=True)[MERGED_COLUMNS]
        .sort_values("지출ID", kind="stable")
        .reset_index(drop=True)
    )


def read_workbook(path: Path) -> tuple[list[str], dict[str, pd.DataFrame]]:
    with pd.ExcelFile(path, engine="openpyxl") as workbook:
        sheet_names = workbook.sheet_names
        sheets = {
            name: pd.read_excel(workbook, sheet_name=name)
            for name in sheet_names
        }
    return sheet_names, sheets
```

`sheet_name=None`으로 모든 시트를 한 번에 읽을 수도 있습니다. 여기서는 시트 이름의 순서를 그대로
보존하고 어느 단계에서 읽는지 드러내기 위해 `ExcelFile.sheet_names`와 반복 읽기를 사용합니다.

#### 참고 자료: Excel 읽기와 시트 이름 확인

- [pandas read_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html)
- [pandas ExcelFile.sheet_names 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.ExcelFile.sheet_names.html)

이제 기대 표와 실제 표를 따로 얻었습니다. 다음 문제는 두 표의 합계만 맞추면 충분한지 여부입니다.

## 합계가 맞아도 행은 틀릴 수 있습니다

### 금액을 더하고 뺀 상쇄 오류는 지출ID별 모든 열 비교로 찾습니다

![두 지출 행의 금액이 서로 반대 방향으로 어긋나 합계 저울은 같지만 행별 대조선은 끊어진 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/23/23da085a737f2a035037f335c7524bd3fa263af6e18d2bda39207e110c20f267.png "전체 합계가 같은 상태에서도 행별 금액이 다를 수 있으므로 키를 맞춘 뒤 모든 열을 비교해야 합니다")

상쇄 오류는 여러 오류의 합이 0이 돼 전체 차이에서 사라지는 문제입니다. `EXP-001`이 1,000원 많고
`EXP-002`가 1,000원 적으면 총액은 여전히 597,000원입니다. 행 수와 총액 검사는 모두 통과하지만 두
사람의 정산 금액은 틀립니다.

그래서 먼저 `지출ID` 집합을 비교합니다. 집합은 중복을 제외한 값의 모음이므로 입력과 출력에 같은
지출이 있는지 보여 줍니다. 중복 개수는 별도로 세어 같은 `지출ID`가 두 번 나온 문제를 잡습니다.

마지막에는 `assert_frame_equal`로 정렬된 DataFrame의 모든 열을 비교합니다. `check_dtype=False`는 Excel을
읽는 과정에서 정수형 세부 표현이 달라져도 실제 값이 같으면 허용합니다. 날짜, 부서, 항목, 승인상태,
원본파일과 금액은 그대로 비교하므로 합계에 숨은 행 오류가 드러납니다.

#### 예시 코드: 키와 중복 및 모든 열 대조하기

입력은 원본에서 만든 `expected_rows`와 결과의 `01_통합내역`입니다. `canonical_merged`는 비교할 열과
날짜 및 금액 표현을 맞춥니다. 실제 행이 없거나 필요한 열이 빠지면 `None`을 반환하고 모든 열 검사는
`FAIL`이 됩니다.

```python
def frames_equal(left: pd.DataFrame | None, right: pd.DataFrame | None) -> bool:
    if left is None or right is None:
        return False
    try:
        assert_frame_equal(left, right, check_dtype=False)
    except AssertionError:
        return False
    return True


def canonical_merged(frame: pd.DataFrame | None) -> pd.DataFrame | None:
    if frame is None or any(column not in frame.columns for column in MERGED_COLUMNS):
        return None
    result = frame[MERGED_COLUMNS].copy()
    result["사용일"] = pd.to_datetime(result["사용일"], errors="coerce").dt.strftime(
        "%Y-%m-%d"
    )
    result["금액"] = pd.to_numeric(result["금액"], errors="coerce")
    return result.sort_values("지출ID", kind="stable").reset_index(drop=True)


actual_ids = set(merged["지출ID"].dropna())
expected_ids = set(expected_rows["지출ID"])
same_ids = actual_ids == expected_ids
duplicate_count = int(merged["지출ID"].duplicated().sum())
same_rows = frames_equal(expected_rows, merged)
```

`same_ids`, `duplicate_count`, `same_rows`는 비슷해 보이지만 답하는 질문이 다릅니다. 같은 키가 모두
있는지, 키가 반복됐는지, 같은 키의 다른 열까지 맞는지를 각각 확인합니다.

#### 실패 예시: 총액이 같은 두 행 오류 찾기

아래 두 줄을 `main.py`의 `summary = (` 바로 위에 잠시 넣으면 첫 금액은 늘고 둘째 금액은 줄어듭니다.
검증을 실행하면 `통합 금액 합계`는 `PASS`이지만 `통합내역 모든 열`은 `FAIL`이어야 합니다. 실습 뒤에는
두 줄을 지워 정상 코드로 되돌립니다.

```python
merged.loc[merged["지출ID"] == "EXP-001", "금액"] += 1_000
merged.loc[merged["지출ID"] == "EXP-002", "금액"] -= 1_000
```

```text
금액  통합 금액 합계    597000  597000  PASS
행    통합내역 모든 열  입력과 같음  다름  FAIL
```

#### 참고 자료: DataFrame 전체 값 비교

- [pandas assert_frame_equal 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.testing.assert_frame_equal.html)

통합내역이 맞더라도 그 표에서 만든 요약과 확인 대상이 틀릴 수 있습니다. 이제 파생 시트를 원본에서
다시 계산해야 합니다.

## 요약과 업무 규칙도 다시 계산합니다

### 부서별 합계와 10만원 이상 행을 원본에서 새로 만들어 결과 시트와 맞춥니다

![원본 지출 표가 부서별 요약 표와 고액 확인 표로 각각 다시 계산되어 결과 시트와 대조되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/db/dba53d7f96828b0e034a171d2686662785f9f8a255b6c809245bbe5c557571af.png "파생 시트는 결과 통합내역을 그대로 믿지 않고 원본 기대 행에서 다시 만들어 비교합니다")

파생 결과는 다른 표에서 계산해 만든 표입니다. `02_부서별요약`은 부서별 건수와 금액 합계이고,
`03_확인필요`는 금액이 10만원 이상인 행입니다. 통합내역이 맞아도 `groupby` 열이나 비교 연산자가
틀리면 이 두 시트는 잘못될 수 있습니다.

검증 코드는 원본에서 만든 `expected_rows`로 기대 요약을 다시 계산합니다. 실제 요약은 결과 통합 문서의
`02_부서별요약`에서 읽습니다. 두 표를 부서 순으로 맞춘 뒤 건수와 금액을 모두 비교합니다.

확인필요 규칙도 같은 원리입니다. 기대 표에서 `금액 >= 100_000`을 다시 실행하고 실제
`03_확인필요`와 행 전체를 비교합니다. `>`를 썼다면 정확히 100,000원인 행이 빠지므로 경계값 데이터도
추가해야 합니다.

#### 예시 코드: 부서별 요약과 확인 대상 재계산하기

입력은 원본 기대 행과 두 결과 시트입니다. 정상 샘플에서는 개발 3건 255,000원, 영업 4건 237,000원,
인사 2건 105,000원이 나옵니다. 확인필요에는 120,000원과 150,000원 지출 두 건이 있어야 합니다.

```python
expected_summary = (
    expected_rows.groupby("부서", as_index=False)
    .agg(건수=("지출ID", "size"), 금액합계=("금액", "sum"))
    .sort_values("부서", kind="stable")
    .reset_index(drop=True)
)
actual_summary = second_sheets.get("02_부서별요약")
if actual_summary is not None and "부서" in actual_summary.columns:
    actual_summary = actual_summary.sort_values("부서", kind="stable").reset_index(drop=True)

expected_review = expected_rows.loc[expected_rows["금액"] >= 100_000].reset_index(drop=True)
actual_review = canonical_merged(second_sheets.get("03_확인필요"))

summary_equal = frames_equal(expected_summary, actual_summary)
review_equal = frames_equal(expected_review, actual_review)
```

#### 실패 예시: 경계값 하나로 비교 연산자 확인하기

실제 업무 규칙이 `10만원 이상`이라면 정확히 100,000원인 행을 샘플에 하나 추가합니다. 정상 코드는 그
행을 포함하지만 `금액 > 100_000`으로 잘못 쓴 코드는 제외합니다. 현재 샘플에는 정확한 경계값이 없으므로
이 반례까지 보증하려면 테스트 데이터를 한 행 늘려야 합니다.

```python
["EXP-010", "2026-08-10", "인사", "교육비", "100,000", "승인"]
```

파생 시트까지 맞았다면 한 번 실행한 결과의 내용은 확인한 셈입니다. 그러나 매일 다시 실행할 자동화는
두 번째 실행에서도 같은 결과가 나오는지 별도로 확인해야 합니다.

## 두 번 실행해 누적을 찾습니다

### 같은 입력의 1차와 2차 업무 시트가 같아야 안전하게 다시 실행할 수 있습니다

![고정된 입력 세 파일이 두 번의 실행을 지나 같은 세 업무 시트를 만드는 비교 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f1/f198c80e6f05597de0ddadeddc3c927bf794075bd23a1c4737432f9f62d23a77.png "두 번째 실행이 기존 행을 더하지 않고 같은 업무 시트를 다시 만드는지 표의 의미를 비교합니다")

멱등성은 같은 입력으로 같은 작업을 다시 해도 결과가 더 변하지 않는 성질입니다. Excel 자동화에서는
둘째 실행이 첫 결과에 행을 덧붙이지 않고 같은 통합내역과 요약을 다시 만드는지 확인하는 말로 이해할 수
있습니다.

검증 코드는 현재 가상환경의 Python 경로인 `sys.executable`로 `main.py`를 두 번 실행합니다. 각 실행
직후 세 업무 시트를 메모리에 보관하고 이름, 행 순서, 열 순서, 값을 비교합니다. 하나라도 다르면
재실행 검사는 `FAIL`입니다.

결과 Excel 파일의 SHA-256을 두 번 비교하지 않는 이유도 중요합니다. XLSX는 여러 XML 파일을 압축한
컨테이너라 저장 시각이나 내부 순서가 달라지면 업무 데이터가 같아도 바이트 해시가 달라질 수 있습니다.
결과는 DataFrame의 의미를 비교하고, 바뀌면 안 되는 원본만 바이트 해시로 비교합니다.

#### 예시 코드: 같은 자동화를 두 번 실행하고 업무 시트 비교하기

`subprocess.run`은 Python 안에서 다른 프로그램을 실행합니다. `check=True`는 `main.py`가 종료 코드
0이 아닌 값으로 끝나면 즉시 `CalledProcessError`를 만듭니다. 첫 실행 실패와 결과 검증 실패를 서로
다른 문제로 구분할 수 있습니다.

```python
def run_main() -> None:
    try:
        subprocess.run(
            [sys.executable, str(MAIN_FILE)],
            cwd=PROJECT_ROOT,
            check=True,
        )
    except subprocess.CalledProcessError as error:
        print(f"자동화 실행 실패: 종료 코드 {error.returncode}", file=sys.stderr)
        raise SystemExit(2) from None


run_main()
first_names, first_sheets = read_workbook(RESULT_FILE)
run_main()
second_names, second_sheets = read_workbook(RESULT_FILE)

business_names = ["01_통합내역", "02_부서별요약", "03_확인필요"]
rerun_equal = first_names == second_names and all(
    frames_equal(first_sheets.get(name), second_sheets.get(name))
    for name in business_names
)
```

#### 참고 자료: 하위 Python 실행 실패 처리

- [Python subprocess.run 공식 문서](https://docs.python.org/3/library/subprocess.html#subprocess.run)

두 번 실행한 결과가 같아도 자동화가 입력 파일을 같은 값으로 다시 저장했을 수 있습니다. 저장 결과가
우연히 같아 보이는 경우까지 구분하려면 실행 전후 원본 바이트를 확인해야 합니다.

## 원본 파일이 그대로인지 확인합니다

### 실행 전후 SHA-256이 같아야 자동화가 입력 바이트를 덮어쓰지 않은 것입니다

![입력 Excel 세 개의 실행 전후 바이트 지문이 각각 짝을 이루며 같은 상태로 보호되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e8/e8879098091e7a0458756f85551f9a6ef0ca337af62a55b791a9cfa824e9f6df.png "결과 데이터 비교와 별도로 원본 파일의 바이트 지문을 맞춰 입력 덮어쓰기를 찾습니다")

해시는 파일 바이트를 일정한 길이의 값으로 바꾸는 함수입니다. 같은 바이트는 같은 SHA-256 값을
만듭니다. 실행 전후 값이 다르면 파일 내용이 바뀌었다는 뜻이므로 원본 보호 검사는 `FAIL`입니다.

파일 크기와 수정 시각만 비교하는 것보다 해시가 강한 이유는 같은 크기의 다른 내용도 구분하기 때문입니다.
반대로 해시는 무엇이 바뀌었는지 설명하지 않습니다. 실패하면 원본 사본과 현재 파일을 셀 단위로 비교해
변경 위치를 찾아야 합니다.

1 MB씩 나눠 읽으면 큰 파일 전체를 메모리에 한꺼번에 올리지 않아도 됩니다. `iter`는 빈 바이트가 나올
때까지 같은 읽기 함수를 반복합니다. 각 조각을 `digest.update`에 넣고 마지막에 16진수 문자열을 얻습니다.

#### 예시 코드: 실행 전후 입력 파일 해시 비교하기

입력은 `Path` 객체 세 개이고 출력은 파일 이름과 해시의 사전입니다. 자동화 실행 전에 `before_hashes`,
두 번 실행한 뒤 `after_hashes`를 만듭니다. 두 사전이 완전히 같아야 파일 이름과 각 파일의 바이트가
모두 그대로입니다.

```python
from hashlib import sha256


def file_hash(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


before_hashes = {path.name: file_hash(path) for path in input_files}
# main.py를 두 번 실행합니다
after_input_files = sorted(INPUT_DIR.glob("*.xlsx"))
after_hashes = {path.name: file_hash(path) for path in after_input_files}
unchanged_sources = before_hashes == after_hashes
```

#### 참고 자료: SHA-256으로 파일 바이트 읽기

- [Python hashlib 공식 문서](https://docs.python.org/3/library/hashlib.html)

이제 11개 검사를 계산할 재료가 모두 준비됐습니다. 사람이 Excel에서 읽고 자동 실행 도구도 상태를
판단할 수 있도록 같은 결과를 시트와 종료 코드 두 곳에 남깁니다.

## PASS와 FAIL을 결과 파일에 남깁니다

### 검증표를 임시 통합 문서에 쓴 뒤 다시 열어 확인하고 종료 코드로 상태를 전달합니다

![기대값과 실제값 및 상태 열이 있는 검증표가 결과 통합 문서와 터미널 종료 상태로 함께 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/aa/aa8679fdd578ffba04ba9f24b4b35f8bb9c25d1adf6c54e6575b2ed0d28b9e78.png "사람은 검증 시트를 읽고 자동 실행 도구는 종료 코드를 읽어 같은 실패를 공유합니다")

검증표에는 `구분`, `항목`, `기대값`, `실제값`, `결과`를 씁니다. 기대값과 실제값을 함께 남겨야
`FAIL`이라는 글자만 보는 것보다 조사 범위를 빨리 좁힐 수 있습니다. 시트 수 실패라면 실제 시트 이름도
보여야 빠진 시트를 바로 찾을 수 있습니다.

검증 결과를 기존 파일에 바로 덧쓰면 저장 중 오류가 날 때 통합 문서가 손상될 수 있습니다. 이 예제는
두 번째 실행의 업무 시트를 새 임시 파일에 쓰고 `04_검증결과`를 마지막에 추가합니다. 임시 파일을 다시
열어 검증 행 수를 확인한 뒤 원래 결과 이름으로 교체합니다.

종료 코드는 프로그램이 끝날 때 운영체제에 돌려주는 정수입니다. `0`은 모든 검사 통과, `1`은 결과 검사
실패, `2`는 `main.py` 실행 실패, `3`은 입력 파일이 없어 검증을 시작하지 못한 상태입니다. PowerShell과
CI는 이 값을 읽어 다음 배포나 전송을 멈출 수 있습니다.

#### 예시 코드: 검증 결과 한 행의 자료형 만들기

`dataclass`는 관련 값을 이름 붙여 한 묶음으로 보관합니다. `frozen=True`는 만든 뒤 검사 결과 필드를
실수로 바꾸지 못하게 합니다. 각 검사에서 기대값과 실제값 및 통과 여부를 이 자료형으로 반환합니다.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class CheckResult:
    category: str
    name: str
    expected: object
    actual: object
    passed: bool
```

#### 예시 코드: 임시 통합 문서에 검증표 저장하기

입력은 두 번째 실행에서 읽은 시트와 `CheckResult` 11개입니다. 기존 `04_검증결과`는 제외하고 업무
시트를 먼저 쓰며 새 검증표를 마지막에 씁니다. 저장한 파일을 다시 읽었을 때 마지막 시트와 행 수가
맞아야 최종 파일로 교체합니다.

```python
def write_report(
    sheets: dict[str, pd.DataFrame],
    checks: list[CheckResult],
) -> pd.DataFrame:
    report = pd.DataFrame(
        [
            {
                "구분": check.category,
                "항목": check.name,
                "기대값": str(check.expected),
                "실제값": str(check.actual),
                "결과": "PASS" if check.passed else "FAIL",
            }
            for check in checks
        ]
    )
    temporary_file = RESULT_FILE.with_name(".expense_result.validation.tmp.xlsx")

    try:
        with pd.ExcelWriter(temporary_file, engine="openpyxl", mode="w") as writer:
            for name, frame in sheets.items():
                if name != "04_검증결과":
                    frame.to_excel(writer, sheet_name=name, index=False)
            report.to_excel(writer, sheet_name="04_검증결과", index=False)

        names, saved_sheets = read_workbook(temporary_file)
        if names[-1] != "04_검증결과" or len(saved_sheets["04_검증결과"]) != len(checks):
            raise RuntimeError("저장한 검증 시트를 다시 읽지 못했습니다")
        temporary_file.replace(RESULT_FILE)
    finally:
        temporary_file.unlink(missing_ok=True)

    return report
```

`Path.replace`는 임시 파일과 결과 파일이 같은 파일 시스템에 있을 때 사용해야 합니다. 결과 Excel을
열어 둔 Windows에서는 교체가 `PermissionError`로 실패할 수 있습니다. 그때는 Excel에서 파일을 닫고
명령을 다시 실행합니다.

#### 참고 자료: ExcelWriter와 파일 교체

- [pandas ExcelWriter 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.ExcelWriter.html)
- [Python pathlib Path.replace 공식 문서](https://docs.python.org/3/library/pathlib.html#pathlib.Path.replace)

시트와 종료 코드가 준비됐으므로 전체 검증 코드를 한 파일로 연결할 수 있습니다.

## 전체 검증 코드를 실행합니다

### 원본 기대값과 두 번의 실행 결과를 모아 11개 판정을 한 번에 만듭니다

![원본 읽기와 자동화 두 번 실행 및 11개 판정이 하나의 검증 결과 시트로 모이는 전체 실행 순서](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8c/8cda21db4cb3f78f8960b4524e4cb402129b594f6d265fe259fc8c61ed8a2ce1.png "각 보조 함수가 입력 스냅샷과 두 실행 결과를 받아 하나의 검증표와 종료 코드를 만듭니다")

다음 `validate_result.py`는 앞에서 설명한 조각을 실행 순서대로 연결한 전체 파일입니다. 실행 전에 원본
행과 해시를 보관하고, `main.py`를 두 번 실행하며, 두 결과를 읽은 뒤 11개 `CheckResult`를 만듭니다.
마지막에는 검증표를 저장하고 하나라도 `FAIL`이면 종료 코드 `1`로 끝납니다.

`build_checks`가 길어 보여도 각 줄은 계약표의 한 행과 대응합니다. 실제 파일 이름이나 시트 이름을
바꾸면 상수의 기대값을 함께 바꿔야 합니다. 업무 규칙이 10만원 이상이 아니라 승인상태 기준이라면
`expected_review` 계산과 검사 이름을 같이 바꿉니다.

#### 예시 코드: 11개 검사를 실행하는 전체 파일

아래 전체 코드를 `src/validate_result.py`에 저장합니다. 입력은 `input`의 세 Excel이고, 중간 행동은
`main.py` 두 번 실행입니다. 출력은 `04_검증결과` 11행, 터미널 표, 종료 코드입니다.

```python
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import subprocess
import sys

import pandas as pd
from pandas.testing import assert_frame_equal


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = PROJECT_ROOT / "input"
MAIN_FILE = PROJECT_ROOT / "src" / "main.py"
RESULT_FILE = PROJECT_ROOT / "output" / "expense_result.xlsx"
EXPECTED_INPUT_FILES = ["busan.xlsx", "daejeon.xlsx", "seoul.xlsx"]
EXPECTED_SHEETS = ["01_통합내역", "02_부서별요약", "03_확인필요", "04_검증결과"]
MERGED_COLUMNS = ["지출ID", "사용일", "부서", "항목", "금액", "승인상태", "원본파일"]


@dataclass(frozen=True)
class CheckResult:
    category: str
    name: str
    expected: object
    actual: object
    passed: bool


def file_hash(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_amount(series: pd.Series) -> pd.Series:
    cleaned = (
        series.astype("string")
        .str.replace(",", "", regex=False)
        .str.replace("원", "", regex=False)
        .str.strip()
    )
    return pd.to_numeric(cleaned, errors="raise").astype("int64")


def read_expected_rows(input_files: list[Path]) -> pd.DataFrame:
    tables: list[pd.DataFrame] = []

    for path in input_files:
        table = pd.read_excel(path)
        required = ["지출ID", "사용일", "부서", "항목", "금액", "승인상태"]
        missing = [column for column in required if column not in table.columns]
        if missing:
            raise ValueError(f"{path.name}: 검증에 필요한 열 누락 {missing}")

        table = table[required].copy()
        table["사용일"] = pd.to_datetime(
            table["사용일"],
            format="%Y-%m-%d",
            errors="raise",
        ).dt.strftime("%Y-%m-%d")
        table["금액"] = normalize_amount(table["금액"])
        table["원본파일"] = path.name
        tables.append(table)

    return (
        pd.concat(tables, ignore_index=True)[MERGED_COLUMNS]
        .sort_values("지출ID", kind="stable")
        .reset_index(drop=True)
    )


def read_workbook(path: Path) -> tuple[list[str], dict[str, pd.DataFrame]]:
    with pd.ExcelFile(path, engine="openpyxl") as workbook:
        sheet_names = workbook.sheet_names
        sheets = {
            name: pd.read_excel(workbook, sheet_name=name)
            for name in sheet_names
        }
    return sheet_names, sheets


def frames_equal(left: pd.DataFrame | None, right: pd.DataFrame | None) -> bool:
    if left is None or right is None:
        return False
    try:
        assert_frame_equal(left, right, check_dtype=False)
    except AssertionError:
        return False
    return True


def canonical_merged(frame: pd.DataFrame | None) -> pd.DataFrame | None:
    if frame is None or any(column not in frame.columns for column in MERGED_COLUMNS):
        return None
    result = frame[MERGED_COLUMNS].copy()
    result["사용일"] = pd.to_datetime(result["사용일"], errors="coerce").dt.strftime(
        "%Y-%m-%d"
    )
    result["금액"] = pd.to_numeric(result["금액"], errors="coerce")
    return result.sort_values("지출ID", kind="stable").reset_index(drop=True)


def build_checks(
    input_files: list[Path],
    expected_rows: pd.DataFrame,
    before_hashes: dict[str, str],
    first_names: list[str],
    first_sheets: dict[str, pd.DataFrame],
    second_names: list[str],
    second_sheets: dict[str, pd.DataFrame],
    after_hashes: dict[str, str],
) -> list[CheckResult]:
    actual_file_names = [path.name for path in input_files]
    merged = canonical_merged(second_sheets.get("01_통합내역"))
    actual_ids = set() if merged is None else set(merged["지출ID"].dropna())
    expected_ids = set(expected_rows["지출ID"])
    duplicate_count = -1 if merged is None else int(merged["지출ID"].duplicated().sum())
    output_count = -1 if merged is None else len(merged)
    output_total = None if merged is None else pd.to_numeric(merged["금액"], errors="coerce").sum()
    expected_total = int(expected_rows["금액"].sum())

    expected_summary = (
        expected_rows.groupby("부서", as_index=False)
        .agg(건수=("지출ID", "size"), 금액합계=("금액", "sum"))
        .sort_values("부서", kind="stable")
        .reset_index(drop=True)
    )
    actual_summary = second_sheets.get("02_부서별요약")
    if actual_summary is not None and "부서" in actual_summary.columns:
        actual_summary = actual_summary.sort_values("부서", kind="stable").reset_index(drop=True)

    expected_review = expected_rows.loc[expected_rows["금액"] >= 100_000].reset_index(drop=True)
    actual_review = canonical_merged(second_sheets.get("03_확인필요"))

    business_names = ["01_통합내역", "02_부서별요약", "03_확인필요"]
    rerun_equal = first_names == second_names and all(
        frames_equal(first_sheets.get(name), second_sheets.get(name))
        for name in business_names
    )
    unchanged_sources = before_hashes == after_hashes

    return [
        CheckResult("입력", "입력 파일 이름", EXPECTED_INPUT_FILES, actual_file_names, actual_file_names == EXPECTED_INPUT_FILES),
        CheckResult("구조", "결과 시트 이름과 순서", EXPECTED_SHEETS, second_names, second_names == EXPECTED_SHEETS),
        CheckResult("건수", "통합 행 수", len(expected_rows), output_count, output_count == len(expected_rows)),
        CheckResult("키", "지출ID 집합", "입력과 같음", "같음" if actual_ids == expected_ids else "다름", actual_ids == expected_ids),
        CheckResult("키", "중복 지출ID 수", 0, duplicate_count, duplicate_count == 0),
        CheckResult("행", "통합내역 모든 열", "입력과 같음", "같음" if frames_equal(expected_rows, merged) else "다름", frames_equal(expected_rows, merged)),
        CheckResult("금액", "통합 금액 합계", expected_total, output_total, output_total == expected_total),
        CheckResult("요약", "부서별 건수와 금액", "입력에서 다시 계산한 값", "같음" if frames_equal(expected_summary, actual_summary) else "다름", frames_equal(expected_summary, actual_summary)),
        CheckResult("규칙", "10만원 이상 확인필요", "입력에서 다시 고른 행", "같음" if frames_equal(expected_review, actual_review) else "다름", frames_equal(expected_review, actual_review)),
        CheckResult("재실행", "1차와 2차 업무 시트", "같음", "같음" if rerun_equal else "다름", rerun_equal),
        CheckResult("원본", "실행 전후 입력 해시", "같음", "같음" if unchanged_sources else "다름", unchanged_sources),
    ]


def write_report(
    sheets: dict[str, pd.DataFrame],
    checks: list[CheckResult],
) -> pd.DataFrame:
    report = pd.DataFrame(
        [
            {
                "구분": check.category,
                "항목": check.name,
                "기대값": str(check.expected),
                "실제값": str(check.actual),
                "결과": "PASS" if check.passed else "FAIL",
            }
            for check in checks
        ]
    )
    temporary_file = RESULT_FILE.with_name(".expense_result.validation.tmp.xlsx")

    try:
        with pd.ExcelWriter(temporary_file, engine="openpyxl", mode="w") as writer:
            for name, frame in sheets.items():
                if name != "04_검증결과":
                    frame.to_excel(writer, sheet_name=name, index=False)
            report.to_excel(writer, sheet_name="04_검증결과", index=False)

        names, saved_sheets = read_workbook(temporary_file)
        if names[-1] != "04_검증결과" or len(saved_sheets["04_검증결과"]) != len(checks):
            raise RuntimeError("저장한 검증 시트를 다시 읽지 못했습니다")
        temporary_file.replace(RESULT_FILE)
    finally:
        temporary_file.unlink(missing_ok=True)

    return report


def run_main() -> None:
    try:
        subprocess.run(
            [sys.executable, str(MAIN_FILE)],
            cwd=PROJECT_ROOT,
            check=True,
        )
    except subprocess.CalledProcessError as error:
        print(f"자동화 실행 실패: 종료 코드 {error.returncode}", file=sys.stderr)
        raise SystemExit(2) from None


def main() -> None:
    input_files = sorted(INPUT_DIR.glob("*.xlsx"))
    if not input_files:
        print("검증 시작 실패: input 폴더에 .xlsx 파일이 없습니다", file=sys.stderr)
        raise SystemExit(3)

    expected_rows = read_expected_rows(input_files)
    before_hashes = {path.name: file_hash(path) for path in input_files}

    run_main()
    first_names, first_sheets = read_workbook(RESULT_FILE)
    run_main()
    second_names, second_sheets = read_workbook(RESULT_FILE)

    after_input_files = sorted(INPUT_DIR.glob("*.xlsx"))
    after_hashes = {path.name: file_hash(path) for path in after_input_files}
    checks = build_checks(
        input_files,
        expected_rows,
        before_hashes,
        first_names,
        first_sheets,
        second_names,
        second_sheets,
        after_hashes,
    )
    report = write_report(second_sheets, checks)
    print(report.to_string(index=False))

    if not report["결과"].eq("PASS").all():
        raise SystemExit(1)


if __name__ == "__main__":
    main()
```

#### 실행 명령: 샘플 생성과 11개 검사 확인하기

프로젝트 루트에서 두 명령을 차례로 실행합니다. 첫 명령은 연습 입력 세 개를 만들고, 둘째 명령은
자동화를 두 번 실행한 뒤 검증표를 저장합니다. 마지막 표의 11행이 모두 `PASS`이고 PowerShell 프롬프트가
오류 없이 돌아오면 정상입니다.

```powershell
uv run python src/make_sample.py
uv run python src/validate_result.py
```

#### 예상 결과: 정상 입력의 11개 PASS

실제 터미널에서는 기대값과 실제값 열이 더 길게 보입니다. 중요한 값은 통합 행 수 `9`, 통합 금액
`597000`, 중복 수 `0`, 나머지 비교 결과 `같음`입니다. 결과 파일을 열면 같은 11행이
`04_검증결과`에 있어야 합니다.

```text
입력    입력 파일 이름           PASS
구조    결과 시트 이름과 순서    PASS
건수    통합 행 수          9  9 PASS
키      지출ID 집합               PASS
키      중복 지출ID 수      0  0 PASS
행      통합내역 모든 열          PASS
금액    통합 금액 합계 597000 597000 PASS
요약    부서별 건수와 금액        PASS
규칙    10만원 이상 확인필요      PASS
재실행  1차와 2차 업무 시트       PASS
원본    실행 전후 입력 해시       PASS
```

정상 예제만 통과하면 검사가 고장을 실제로 찾는지는 아직 모릅니다. 이제 코드에 의도한 오류를 넣고 각
검사가 예상한 위치에서 `FAIL`이 되는지 시험해야 합니다.

## 고장을 넣어 검사를 시험합니다

### 상쇄 오류와 중복 행 및 누락 시트와 원본 변조가 예상한 FAIL을 만드는지 확인합니다

![정상 자동화 옆에 상쇄 금액과 중복 행과 누락 시트 및 원본 변조 고장이 주입되어 서로 다른 검사가 끊기는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/04/04ff1c72912b07a1af7c85c3e560b40d9914d8f71fec2c4e318601b7640e5156.png "검증 코드 자체를 믿기 전에 알려진 고장을 넣고 해당 검사만 정확히 실패하는지 확인합니다")

고장 주입은 일부러 잘못된 코드를 넣어 검사가 그 오류를 찾는지 보는 방법입니다. 화재경보기를 설치한 뒤
시험 버튼을 누르는 것과 같습니다. 정상 자료의 `PASS`만 확인하면 조건식이 항상 참인 가짜 검사도 통과할
수 있습니다.

이 프로젝트는 일곱 테스트를 실행합니다. 정상 실행, 합계를 유지한 두 행 오류, 중복 행, 누락 시트,
원본 변조, `main.py` 실행 실패, 빈 입력입니다. 각 테스트는 새 임시 폴더를 쓰므로 다른 테스트의
결과 파일과 원본 변경이 섞이지 않습니다.

`tmp_path`는 pytest가 테스트마다 제공하는 임시 폴더입니다. 테스트가 끝난 뒤 pytest가 관리하므로 실제
업무 입력을 건드리지 않습니다. `subprocess.run`의 `returncode`를 확인하면 검증 실패 `1`과 자동화 실행
실패 `2`도 구분할 수 있습니다.

#### 예시 코드: 정상과 여섯 실패를 검증하는 테스트

다음 전체 코드를 `tests/test_validation.py`에 저장합니다. 각 실패 테스트는 결과 시트에서 예상한 항목의
`FAIL`과 함께 다른 정상 항목의 `PASS`도 확인합니다. 자동화 실행 실패와 빈 입력은 결과 검사 전에
멈추므로 각각 종료 코드 `2`와 `3` 및 오류 문장을 확인합니다.

```python
from pathlib import Path
import shutil
import subprocess
import sys

import pandas as pd


TEMPLATE_ROOT = Path(__file__).resolve().parents[1]


def copy_project(tmp_path: Path) -> Path:
    project = tmp_path / "project"
    shutil.copytree(TEMPLATE_ROOT / "src", project / "src")
    subprocess.run(
        [sys.executable, str(project / "src" / "make_sample.py")],
        cwd=project,
        check=True,
        capture_output=True,
        text=True,
    )
    return project


def run_validation(project: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(project / "src" / "validate_result.py")],
        cwd=project,
        capture_output=True,
        text=True,
    )


def replace_once(path: Path, old: str, new: str) -> None:
    source = path.read_text(encoding="utf-8")
    assert old in source
    path.write_text(source.replace(old, new, 1), encoding="utf-8")


def read_report(project: Path) -> pd.DataFrame:
    return pd.read_excel(
        project / "output" / "expense_result.xlsx",
        sheet_name="04_검증결과",
    )


def result_for(report: pd.DataFrame, item: str) -> str:
    return report.loc[report["항목"] == item, "결과"].item()


def test_normal_run_passes_all_eleven_checks(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    completed = run_validation(project)

    assert completed.returncode == 0, completed.stderr
    with pd.ExcelFile(project / "output" / "expense_result.xlsx") as workbook:
        assert workbook.sheet_names == [
            "01_통합내역",
            "02_부서별요약",
            "03_확인필요",
            "04_검증결과",
        ]
    report = read_report(project)
    assert len(report) == 11
    assert report["결과"].eq("PASS").all()


def test_offsetting_amount_errors_fail_row_check_even_when_total_passes(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    main_file = project / "src" / "main.py"
    replace_once(
        main_file,
        "    summary = (\n",
        "    merged.loc[merged['지출ID'] == 'EXP-001', '금액'] += 1_000\n"
        "    merged.loc[merged['지출ID'] == 'EXP-002', '금액'] -= 1_000\n"
        "    summary = (\n",
    )

    completed = run_validation(project)
    report = read_report(project)

    assert completed.returncode == 1
    assert result_for(report, "통합 금액 합계") == "PASS"
    assert result_for(report, "통합내역 모든 열") == "FAIL"


def test_duplicate_row_fails_count_and_key_checks(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    main_file = project / "src" / "main.py"
    replace_once(
        main_file,
        "    summary = (\n",
        "    merged = pd.concat([merged, merged.iloc[[0]]], ignore_index=True)\n"
        "    summary = (\n",
    )

    completed = run_validation(project)
    report = read_report(project)

    assert completed.returncode == 1
    assert result_for(report, "통합 행 수") == "FAIL"
    assert result_for(report, "중복 지출ID 수") == "FAIL"


def test_missing_sheet_is_reported_without_hiding_other_checks(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    main_file = project / "src" / "main.py"
    replace_once(
        main_file,
        "            review.to_excel(writer, sheet_name=\"03_확인필요\", index=False)\n",
        "",
    )

    completed = run_validation(project)
    report = read_report(project)

    assert completed.returncode == 1
    assert result_for(report, "결과 시트 이름과 순서") == "FAIL"
    assert result_for(report, "10만원 이상 확인필요") == "FAIL"
    assert result_for(report, "통합 금액 합계") == "PASS"


def test_source_file_mutation_fails_hash_and_rerun_checks(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    main_file = project / "src" / "main.py"
    replace_once(
        main_file,
        "        temporary_file.replace(RESULT_FILE)\n",
        "        temporary_file.replace(RESULT_FILE)\n"
        "        source_file = input_files[0]\n"
        "        source_table = pd.read_excel(source_file)\n"
        "        source_table.loc[0, '항목'] = str(source_table.loc[0, '항목']) + ' 변경'\n"
        "        source_table.to_excel(source_file, index=False)\n",
    )

    completed = run_validation(project)
    report = read_report(project)

    assert completed.returncode == 1
    assert result_for(report, "실행 전후 입력 해시") == "FAIL"
    assert result_for(report, "1차와 2차 업무 시트") == "FAIL"


def test_main_failure_returns_separate_exit_code(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    main_file = project / "src" / "main.py"
    replace_once(
        main_file,
        "def main() -> None:\n",
        "def main() -> None:\n    raise RuntimeError('의도한 자동화 실패')\n",
    )

    completed = run_validation(project)

    assert completed.returncode == 2
    assert "자동화 실행 실패: 종료 코드 1" in completed.stderr
    assert not (project / "output" / "expense_result.xlsx").exists()


def test_empty_input_returns_preparation_exit_code(tmp_path: Path) -> None:
    project = copy_project(tmp_path)
    for path in (project / "input").glob("*.xlsx"):
        path.unlink()

    completed = run_validation(project)

    assert completed.returncode == 3
    assert "검증 시작 실패: input 폴더에 .xlsx 파일이 없습니다" in completed.stderr
    assert not (project / "output" / "expense_result.xlsx").exists()
```

#### 실행 명령: 고장 주입 테스트 일곱 개 확인하기

정상 코드로 되돌린 상태에서 프로젝트 루트에서 아래 명령을 실행합니다. 점 일곱 개와 `7 passed`가
보이면 정상 경로뿐 아니라 준비한 여섯 실패 경로도 예상대로 동작한 것입니다. 테스트는 약 수십 초가
걸릴 수 있습니다.

```powershell
uv run pytest -q
```

```text
.......
7 passed
```

#### 참고 자료: 테스트마다 별도 임시 폴더 사용하기

- [pytest tmp_path 공식 문서](https://docs.pytest.org/en/stable/how-to/tmp_path.html)

고장을 찾는 테스트까지 통과하면 이 예제의 11개 계약은 실제 오류와 연결됩니다. 마지막으로 이 검사가
Excel의 모든 기능을 보증하지는 않는다는 한계를 구분해야 합니다.

## 표 데이터 검증의 범위를 구분합니다

### 수식과 매크로와 서식 및 대용량 파일은 같은 코드만으로 검증할 수 없습니다

![표 값 검증 영역 바깥에 수식 계산과 매크로와 서식 및 대용량 파일이 별도 확인 대상으로 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2e/2e221463fa5dc1a4053751654fa5a91ba2e2a4c4ef275b86ef53ce441b1e44c7.png "이 예제는 표의 값과 구조를 검증하며 Excel 계산 엔진과 매크로 및 시각 서식은 별도 도구가 필요합니다")

이 예제는 셀 값을 DataFrame으로 읽어 비교하는 자동화에 맞습니다. 색, 병합 셀, 차트, 피벗 테이블,
인쇄 설정처럼 화면 모양이 결과의 일부라면 `openpyxl`로 속성을 확인하거나 Excel을 실제로 열어 눈으로
검수하는 단계가 더 필요합니다.

수식 셀도 주의해야 합니다. `openpyxl`과 pandas는 Excel 계산 엔진이 아니므로 새 수식을 직접 계산하지
않습니다. 저장된 마지막 계산값을 읽거나 수식 문자열을 확인할 수는 있지만, 값이 최신인지 보증하려면
Excel 또는 호환 계산 엔진에서 다시 계산한 파일이 필요합니다.

매크로가 있는 `.xlsm`을 pandas로 새로 쓰면 VBA와 Excel 고유 기능이 보존되지 않을 수 있습니다.
그런 파일은 원본 복사본을 만들고 `openpyxl.load_workbook(..., keep_vba=True)`의 보존 범위를 확인해야
합니다. 결과 통합 문서를 DataFrame으로 통째로 다시 쓰는 이 예제를 그대로 적용하면 안 됩니다.

수백만 행처럼 메모리보다 큰 입력은 모든 DataFrame을 동시에 보관하는 현재 코드와 맞지 않습니다.
파일별 집계, 데이터베이스 적재, 청크 처리, 행 해시 저장을 검토해야 합니다. 샘플 9행의 통과 시간을
대용량 업무 파일의 처리 시간으로 예상해서도 안 됩니다.

#### 확인 목록: 실제 업무에 옮기기 전 바꿀 값

- `EXPECTED_INPUT_FILES`를 실제 허용 파일 이름이나 이름 규칙으로 변경
- `MERGED_COLUMNS`를 실제 필수 열과 열 순서에 맞게 변경
- `지출ID` 대신 실제로 행을 고유하게 구분하는 키 지정
- 10만원 이상 규칙을 실제 승인 규칙으로 변경하고 정확한 경계값 추가
- 개인정보가 있는 검증표에서 원문 값 대신 건수와 비식별 키 사용
- 결과 파일을 Excel에서 닫은 상태로 교체 실행
- 수식, 매크로, 차트, 서식이 계약이면 별도 검증 추가
- 대용량 입력으로 처리 시간과 메모리 사용량 측정

#### 참고 자료: 수식값과 VBA 보존 옵션 확인하기

- [openpyxl load_workbook 공식 문서](https://openpyxl.readthedocs.io/en/stable/api/openpyxl.reader.excel.html#openpyxl.reader.excel.load_workbook)

지금 프로젝트 루트에서 `uv run python src/validate_result.py`를 다시 실행하면 됩니다. 터미널 종료 코드가
`0`이고 `output/expense_result.xlsx`의 `04_검증결과` 11행이 모두 `PASS`일 때만 결과 파일을 다음
사람에게 전달합니다.
