---
title: pytest 사용법: Excel 자동화 검증을 반복하는 방법
slug: pytest-excel-automation
date: 2026-08-15
modified: 2026-08-15
author: eddmpython
section: Excel 업무자동화
summary: pytest 사용법을 Excel 자동화 검증으로 익힙니다. 행 수와 금액 및 원본 보호와 재실행을 검사하고 경계값과 변형 입력을 한 명령으로 반복합니다.
readerQuestion: Excel 자동화의 행 수와 금액 및 원본 보호 검사를 실행할 때마다 어떻게 자동으로 반복할까?
readerTakeaway: 기대 결과를 assert로 고정하고 tmp_path와 parametrize로 원본 보호 및 여러 입력을 검사한 뒤 의도한 실패와 전체 PASS를 모두 확인한다.
readerLevel: beginner
readerStartingPoint: Excel 자동화를 실행하고 행 수와 금액 차이 및 저장 결과를 코드로 한 번 확인할 수 있는 상태입니다.
primaryKeyword: pytest 사용법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ab/ab7201895eb1b7e57d5b31b8337e6955c647aa7e806abf591934e83b851af316.png
ogImageAlt: Excel 자동화 입력 행 수와 결과 행 수 및 금액 합계를 세 개의 pytest assert로 비교하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`pytest 사용법`을 익히면 Excel 자동화를 고칠 때마다 파일을 열어 행 수와 합계를 눈으로 확인하지 않아도
됩니다. 기대하는 숫자를 테스트에 적어 두고 한 명령으로 같은 검사를 다시 실행할 수 있습니다.

이 글에서는 정상 데이터뿐 아니라 원본 보호, 두 번 실행, 경계값, 변형 금액까지 검사합니다. 테스트가
실제로 오류를 찾는지 확인하려고 기대값 하나를 일부러 틀리게 만든 뒤 다시 고쳐 전체 PASS도 확인합니다.

## pytest로 행 수와 금액을 고정합니다

### 입력 행의 분할과 정상 금액 합계 및 차이 0을 assert로 검사합니다

![Excel 자동화 입력 행 수와 결과 행 수 및 금액 합계를 세 개의 pytest assert로 비교하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ab/ab7201895eb1b7e57d5b31b8337e6955c647aa7e806abf591934e83b851af316.png "입력과 정상 및 확인필요 행 수와 두 금액 합계가 세 검사에서 비교됩니다")

테스트는 코드가 어떻게 계산했는지가 아니라 어떤 결과가 나와야 하는지를 적습니다. 샘플 5행에서 정상
4행과 확인필요 1행이 나오고 정상 금액 합계가 260000원이라면 이 숫자를 `assert`로 고정합니다.

함수 이름은 `test_`로 시작합니다. pytest는 이 함수를 찾아 실행하고, 값이 다르면 어느 비교에서 실제값과
기대값이 달랐는지 보여 줍니다.

#### 코드

```python
# tests/test_report.py
import pandas as pd

from report import build_report, write_report


def sample_table():
    return pd.DataFrame(
        [
            {"거래ID": "T001", "부서": "영업팀", "금액": 50000},
            {"거래ID": "T002", "부서": "개발팀", "금액": 80000},
            {"거래ID": "T003", "부서": "영업팀", "금액": 70000},
            {"거래ID": "T004", "부서": "운영팀", "금액": 60000},
            {"거래ID": "T005", "부서": None, "금액": 30000},
        ]
    )


def test_row_count_and_amount():
    result = build_report(sample_table())

    assert len(result.clean) == 4
    assert len(result.issues) == 1
    assert len(result.clean) + len(result.issues) == 5
    assert result.clean["금액"].sum() == 260000
    assert result.amount_difference == 0
```

#### 예시

```powershell
uv run pytest -q
```

#### 참고 자료

- [pytest assert 공식 문서](https://docs.pytest.org/en/stable/how-to/assert.html)

## tmp_path로 원본과 재실행을 검사합니다

### 테스트 전용 폴더에서 두 번 실행하고 입력 파일 바이트와 결과 행 수를 비교합니다

![테스트 전용 임시 폴더의 원본 Excel은 그대로 남고 같은 결과 파일을 두 번 만들어도 행 수가 늘지 않는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/85/8581132c2780527c8a89a5aa8f297e1e7e334cf43290e46aef8bde08e6d27bb5.png "임시 폴더의 원본 파일은 잠긴 채 유지되고 두 실행 결과의 행 수가 같습니다")

실제 업무 폴더에서 테스트하면 원본 파일이나 어제 만든 결과를 덮어쓸 수 있습니다. pytest의 `tmp_path`는
테스트마다 별도 임시 폴더를 주므로 그 안에서 입력과 출력을 안전하게 만들 수 있습니다.

실행 전 원본 파일의 바이트를 보관하고 두 번 실행한 뒤 다시 비교합니다. 두 번째 실행에서 이전 결과를
입력으로 읽는 버그가 있으면 결과 행 수가 늘어나므로 함께 잡을 수 있습니다.

#### 코드

```python
def test_original_is_preserved_and_rerun_is_stable(tmp_path):
    input_path = tmp_path / "input.xlsx"
    output_path = tmp_path / "result.xlsx"
    sample_table().to_excel(input_path, index=False)
    original_bytes = input_path.read_bytes()

    write_report(input_path, output_path)
    first = pd.read_excel(output_path, sheet_name="통합내역")

    write_report(input_path, output_path)
    second = pd.read_excel(output_path, sheet_name="통합내역")

    assert input_path.read_bytes() == original_bytes
    assert len(first) == 4
    assert len(second) == len(first)
    assert second["금액"].sum() == first["금액"].sum()
```

#### 참고 자료

- [pytest tmp_path 공식 안내](https://docs.pytest.org/en/stable/how-to/tmp_path.html)

## parametrize로 경계값과 변형을 반복합니다

### 0원과 큰 금액 및 쉼표가 있는 금액을 같은 테스트 함수에 차례로 넣습니다

![0원과 큰 금액 및 쉼표 통화 문자열 세 입력이 같은 pytest 함수로 들어가 각각 기대 숫자와 비교되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b6/b6a2974bca5dff1168d07089c8d55159adeeff5369a97ff918ff94b90f0e7314.png "세 변형 금액이 같은 변환 함수를 지나 대응하는 기대값 검사로 연결됩니다")

정상 예시 하나만 통과하면 `0`, 큰 금액, `50,000원` 같은 입력에서 문제가 생길 수 있습니다.
`parametrize`는 입력과 기대값 여러 쌍을 같은 테스트 함수에 차례로 넣습니다.

한 쌍만 실패해도 어떤 입력에서 틀렸는지 테스트 이름에 표시됩니다. 새 Excel 변형을 발견하면 테스트
함수를 복사하지 않고 목록에 한 줄을 추가합니다.

#### 코드

```python
import pytest

from report import normalize_amount


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (0, 0),
        (1000000000, 1000000000),
        ("50,000원", 50000),
        (" 70000 ", 70000),
    ],
)
def test_amount_variants(raw, expected):
    assert normalize_amount(raw) == expected
```

#### 참고 자료

- [pytest parametrize 공식 문서](https://docs.pytest.org/en/stable/how-to/parametrize.html)

## 일부러 실패시킨 뒤 전체 PASS를 확인합니다

### 기대 합계를 1원 다르게 적어 실패를 보고 원래 값으로 고친 뒤 다시 실행합니다

![기대 금액을 1원 바꾼 테스트가 빨간 실패를 내고 올바른 값으로 되돌린 뒤 전체 녹색 PASS가 되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e3/e3202d8eadde1e2f67e918d19d95ecf241f2b7992bd2fe4103a4958cc2135e91.png "같은 테스트 명령이 틀린 기대값에서는 실패하고 올바른 기대값에서는 모두 통과합니다")

테스트가 항상 초록색이라고 좋은 테스트인 것은 아닙니다. 검사식을 잘못 적어 실제 오류를 놓칠 수도
있습니다. 기대 합계 `260000`을 잠시 `260001`로 바꾸고 테스트가 실패하는지 확인합니다.

실패 메시지에서 실제값 `260000`과 기대값 `260001`을 확인한 뒤 원래 기대값으로 되돌립니다. 마지막으로
전체 테스트를 다시 실행해 모든 항목이 PASS인지 확인합니다.

#### 예시

```text
1 failed
assert 260000 == 260001
```

```text
5 passed
```

#### 확인 목록

- 정상 입력의 행 수와 금액을 검사합니다.
- 경계값과 변형 입력을 검사합니다.
- 원본 파일의 바이트가 바뀌지 않았는지 검사합니다.
- 같은 입력으로 두 번 실행해도 결과 행 수가 늘지 않는지 검사합니다.
- 의도한 오류에서 실패하고 수정 뒤 전체 테스트가 통과하는지 확인합니다.
