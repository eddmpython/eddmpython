---
title: AI Excel 자동화 확장 방법: 변형 열과 금액 형식까지 안전하게
slug: ai-variant-excel
author: eddmpython
section: AI 작업 환경
summary: AI로 Excel 자동화를 확장할 때 기존 결과를 지키면서 다른 열 이름과 금액 형식을 표준화하는 방법을 설명합니다. 작업지시, 구현 코드, 회귀 테스트까지 연결합니다.
readerQuestion: 기존 자동화를 망가뜨리지 않고 열 이름과 금액 모양이 다른 Excel 파일도 처리하려면 어떻게 해야 할까?
readerTakeaway: 기존 파일의 결과를 기준선으로 고정하고 열 이름 대응표와 값 변환 함수를 따로 만든 뒤 기본 테스트와 변형 테스트를 함께 통과시킨다.
readerLevel: beginner
readerStartingPoint: 기본 Excel 세 개를 처리하는 자동화와 pytest 검증 및 AI 작업지시서가 준비된 상태입니다.
primaryKeyword: AI Excel 자동화 확장
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6f/6fe2311fc379b5f89e0e48e23e05e06c7d8ce7cef1efa720e8d8bdfb36d61efa.png
ogImageAlt: 기존 Excel 세 개와 변형 Excel 한 개가 같은 네 시트 결과로 이어지는 기준선
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`AI Excel 자동화 확장`은 AI에게 파일 하나를 더 읽게 하는 일이 아닙니다. 기존에 잘 되던 세 파일의 행 수와 합계를 지키면서, 열 이름과 값 모양이 다른 네 번째 파일도 같은 표준으로 바꾸는 작업입니다.

안전한 순서는 간단합니다. 기존 결과를 숫자로 잠그고, 열 이름과 값 변환을 작은 함수로 나누고, 기본 테스트와 변형 테스트를 모두 실행합니다. 이 순서를 작업지시서에 넣으면 AI가 추측할 부분도 줄어듭니다.

## AI Excel 자동화 확장은 기존 결과부터 고정합니다

### 기본 파일 세 개의 행 수와 합계 및 결과 시트가 바뀌지 않게 적습니다

![기존 Excel 세 개와 변형 Excel 한 개가 같은 네 시트 결과로 이어지는 기준선](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6f/6fe2311fc379b5f89e0e48e23e05e06c7d8ce7cef1efa720e8d8bdfb36d61efa.png "기존 세 파일의 결과는 그대로 유지되고 새 변형 파일만 같은 표준 흐름에 추가됩니다")

변형 파일만 통과했다고 확장이 끝난 것은 아닙니다. 새 코드를 넣은 뒤 기존 파일의 결과가 달라졌다면 그것은 확장이 아니라 회귀 오류입니다. 먼저 현재 정상 결과를 표로 기록합니다.

예를 들어 기존 입력 세 개를 합쳤을 때 정상 행이 12개이고 확인필요 행이 3개이며, 정상 금액 합계가 `450000`원이라고 가정합니다. 결과 Excel의 시트도 `정상`, `확인필요`, `부서요약`, `검증` 네 개로 고정합니다. 실제 프로젝트에서는 이 숫자를 현재 테스트 결과로 바꿉니다.

#### 예시

| 검증 항목 | 확장 전 기대값 | 확장 뒤 기대값 |
|---|---:|---:|
| 기존 정상 행 | 12 | 12 |
| 기존 확인필요 행 | 3 | 3 |
| 기존 정상 금액 합계 | 450000 | 450000 |
| 기존 결과 시트 | 4개 | 4개 |

## 다른 열 이름을 표준 열로 모읍니다

### 열 대응표 한 곳에서 사용일과 조직 및 사용금액을 거래일과 부서 및 금액으로 바꿉니다

![서로 다른 Excel 열 이름이 하나의 대응표를 지나 거래일과 부서 및 금액 표준 열로 모이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9e/9e89e27b6d89c72f2844b90755c8d48312e32564e6d3a546f79a597568dfee5d.png "열 이름 차이는 읽기 직후 한 번만 정리되고 이후 코드는 표준 열만 사용합니다")

보고서 계산 코드 곳곳에 `사용일도 확인`, `조직도 확인` 같은 조건을 넣으면 파일 종류가 늘 때마다 코드가 복잡해집니다. Excel을 읽은 직후 열 이름을 한 번만 바꾸고, 그 뒤 코드는 표준 열만 보게 합니다.

AI 작업지시서에는 허용할 별칭을 정확히 적습니다. 목록에 없는 열 이름은 비슷해 보여도 추측해서 바꾸지 않고 `필수 열 누락` 오류로 멈추게 합니다.

#### 코드

```python
COLUMN_ALIASES = {
    "사용일": "거래일",
    "조직": "부서",
    "사용금액": "금액",
    "내용": "적요",
}

REQUIRED_COLUMNS = {"거래일", "부서", "금액", "적요"}


def normalize_columns(frame):
    normalized = frame.rename(columns=COLUMN_ALIASES)
    missing = REQUIRED_COLUMNS - set(normalized.columns)
    if missing:
        raise ValueError(f"필수 열 누락: {sorted(missing)}")
    return normalized
```

## 값 모양은 별도 함수에서 정리합니다

### 쉼표와 원 표시 및 공백을 지우되 바꿀 수 없는 값은 확인필요로 보냅니다

![여러 금액 셀 모양이 정리 함수를 지나 숫자와 확인필요 두 갈래로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a9/a9d472cab4c68a460d8a056740d27d700240296b35912e3fb3910d2471ed9c1f.png "확실한 금액만 숫자가 되고 해석할 수 없는 값은 원문을 보존한 채 확인필요로 이동합니다")

열 이름이 같아져도 `50,000원`, ` 50000 `, 숫자 `50000`은 Excel에서 서로 다른 값처럼 읽힐 수 있습니다. 금액 변환도 한 함수에 모으면 어떤 문자를 지우는지와 실패했을 때 어떻게 하는지가 보입니다.

빈값이나 `오만원`처럼 규칙으로 확정할 수 없는 값은 0원으로 만들지 않습니다. `None`을 돌려주고 원본 행과 오류 이유를 확인필요 결과에 남깁니다.

#### 코드

```python
import pandas as pd


def normalize_amount(value):
    if pd.isna(value):
        return None

    cleaned = str(value).strip().replace(",", "").removesuffix("원")
    try:
        return int(cleaned)
    except ValueError:
        return None
```

## 기본 테스트와 변형 테스트를 함께 실행합니다

### 기존 결과 차이 0과 새 파일의 기대 숫자를 한 번의 pytest 실행으로 증명합니다

![기존 파일 회귀 테스트와 변형 파일 테스트가 나란히 통과하고 결과 차이가 0으로 끝나는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/08/08a529cfe6aab749a0b1708fcfaf4128af32208bcc4fd0e28b8bd07331d1afd9.png "두 종류의 테스트가 모두 통과해야 AI 확장 작업이 완료됩니다")

AI에게는 새 기능 테스트만 쓰게 하지 않습니다. 기존 세 파일의 기준선 테스트와 변형 파일 테스트를 같은 실행에 넣습니다. 변형 파일은 일부러 `사용일`, `조직`, `사용금액` 열과 `50,000원` 값을 포함한 합성 파일로 만듭니다.

완료 보고에는 `잘 됩니다` 대신 실행 명령, 통과한 테스트 수, 기존 숫자 차이, 변경 파일을 적게 합니다. 이 네 가지가 있어야 다음 사람이 같은 결과를 다시 확인할 수 있습니다.

#### 코드

```python
def test_existing_files_keep_the_baseline():
    report = build_report("samples/basic")
    assert len(report.normal) == 12
    assert len(report.review) == 3
    assert report.normal["금액"].sum() == 450_000


def test_variant_file_uses_the_same_standard():
    report = build_report("samples/variant.xlsx")
    assert report.normal.iloc[0]["금액"] == 50_000
    assert {"거래일", "부서", "금액", "적요"} <= set(report.normal.columns)
```

```powershell
python -m pytest -q
git diff --stat
git diff
```

#### 확인 목록

- 기존 파일 테스트와 변형 파일 테스트가 모두 PASS입니다.
- 기존 행 수와 합계의 차이는 0입니다.
- 새 별칭과 변환 규칙은 각각 한 곳에만 있습니다.
- 원본 Excel은 수정하거나 덮어쓰지 않았습니다.
- AI 완료 보고에 변경 파일과 테스트 결과가 있습니다.

#### 참고 자료

- [pandas read_excel 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html)
- [pytest assert 공식 문서](https://docs.pytest.org/en/stable/how-to/assert.html)
- [OpenAI Codex 사용 사례](https://developers.openai.com/codex/use-cases)
