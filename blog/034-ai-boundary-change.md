---
title: AI Excel 조건 추가 방법: 10만원 경계와 취소 거래를 놓치지 않는 법
slug: ai-boundary-change
author: eddmpython
section: AI 작업 환경
summary: AI로 Excel 조건을 추가할 때 10만원 이상과 취소 거래의 경계를 먼저 표로 정하고 결과 시트와 테스트까지 안전하게 확장하는 방법을 설명합니다.
readerQuestion: 10만원 이상 거래와 취소 거래를 구분하는 조건을 AI에게 어떻게 맡겨야 경계값 오류가 없을까?
readerTakeaway: 조건의 말뜻을 입력과 기대 결과 표로 바꾸고 분류 순서를 정한 뒤 99,999원과 100,000원 및 음수 테스트로 새 시트를 검증한다.
readerLevel: beginner
readerStartingPoint: 표준 열로 정리된 거래 DataFrame과 네 시트 결과 Excel 및 pytest 테스트가 준비된 상태입니다.
primaryKeyword: Excel 조건 추가
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17aa65a8e98e2dd69a9eb054c860d14cc743fdee2aefa549e5e67353b8ca1532.png
ogImageAlt: 99999원과 100000원 및 음수 금액이 서로 다른 결과로 분류되는 경계 규칙표
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`Excel 조건 추가`에서 가장 위험한 말은 `10만원 넘는 거래`입니다. 이 말은 `100000`원을 포함하는지,
취소 거래인 음수 금액은 어디로 보내는지 사람마다 다르게 이해할 수 있습니다.

AI에게 코드를 맡기기 전에 말로 된 조건을 입력과 기대 결과 표로 바꿉니다. 그다음 분류 순서, 결과
시트, 경계 테스트를 정하면 한 글자 차이인 `>`와 `>=` 때문에 결과가 틀어지는 일을 막을 수 있습니다.

## 조건을 경계값 표로 먼저 고정합니다

### 99999원과 100000원 및 음수와 0원의 기대 결과를 코드보다 먼저 적습니다

![99999원과 100000원 및 음수 금액이 서로 다른 결과로 분류되는 경계 규칙표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17aa65a8e98e2dd69a9eb054c860d14cc743fdee2aefa549e5e67353b8ca1532.png "경계 바로 아래와 경계값 및 취소와 0원이 명확한 기대 결과에 연결됩니다")

이번 규칙은 `100000원 이상이면 고액거래`, `0원보다 작으면 취소거래`로 정합니다. 따라서 `99999`원은
일반 거래이고 `100000`원은 고액거래입니다. `-1`원은 취소거래이며 `0`원은 일반 거래입니다.

표가 중요한 이유는 AI와 사람이 같은 답을 보고 시작할 수 있기 때문입니다. 규칙을 바꾸고 싶다면 코드
안의 비교 연산자를 찾는 대신 이 표의 기대 결과부터 바꿉니다.

#### 예시

| 입력 금액 | 기대 분류 | 이유 |
|---:|---|---|
| -1 | 취소거래 | 0원보다 작음 |
| 0 | 일반 | 취소가 아님 |
| 99999 | 일반 | 10만원 미만 |
| 100000 | 고액거래 | 10만원 이상 |
| 100001 | 고액거래 | 10만원 이상 |

## 겹칠 수 있는 조건은 분류 순서를 정합니다

### 취소 여부를 먼저 확인하고 고액 여부를 나중에 확인합니다

![거래 금액이 취소 조건을 먼저 지나고 고액 조건과 일반 조건으로 차례로 나뉘는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b2/b2f4c379d739d83d3529cc68bb3af076183051dbcd0c8b6fbc14d0fe9a63d344.png "조건은 위에서 아래로 한 번만 판정되어 한 거래가 여러 분류에 겹치지 않습니다")

현재 숫자 규칙에서는 음수와 10만원 이상이 겹치지 않습니다. 그래도 분류 순서를 코드에 드러내면 나중에
환불 수수료나 절댓값 기준 같은 규칙이 추가돼도 어떤 조건이 우선인지 알 수 있습니다.

한 거래를 한 분류에만 넣을 것인지, 여러 결과 시트에 복사할 것인지도 정해야 합니다. 여기서는 취소,
고액, 일반 가운데 하나에만 들어가는 배타 분류를 사용합니다.

#### 코드

```python
def classify_transaction(amount: int) -> str:
    if amount < 0:
        return "취소거래"
    if amount >= 100_000:
        return "고액거래"
    return "일반"
```

## 새 결과 시트는 기존 결과 뒤에 추가합니다

### 기존 네 시트를 유지하고 고액거래와 취소거래 시트를 각각 더합니다

![기존 네 시트 Excel 뒤에 고액거래와 취소거래 두 시트가 추가되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9e/9eb532a720a7c19ac8140fb2a716196054fd862b9dc7555cb681edcb5cdd3bc8.png "기존 시트의 이름과 순서는 유지되고 새 분류 시트 두 개만 뒤에 붙습니다")

새 조건 때문에 기존 `정상`, `확인필요`, `부서요약`, `검증` 시트를 없애거나 이름을 바꾸지 않습니다.
대신 정상 거래에서 고액거래와 취소거래를 골라 새 시트 두 개를 뒤에 추가합니다.

시트에는 금액만 넣지 말고 원본 행을 찾을 수 있는 거래ID, 거래일, 부서, 적요, 금액을 함께 남깁니다.
담당자는 고액 또는 취소라는 결과뿐 아니라 왜 그 결과가 나왔는지 한 행에서 확인할 수 있습니다.

#### 예시

| 순서 | 시트 | 역할 |
|---:|---|---|
| 1 | 정상 | 표준화된 정상 행 전체 |
| 2 | 확인필요 | 자동 판단하지 못한 행과 이유 |
| 3 | 부서요약 | 부서별 건수와 합계 |
| 4 | 검증 | 입력과 출력의 숫자 비교 |
| 5 | 고액거래 | 금액이 100000원 이상인 행 |
| 6 | 취소거래 | 금액이 0원보다 작은 행 |

## 경계 테스트와 기존 테스트를 한꺼번에 통과시킵니다

### 비교 연산자 네 개와 결과 시트 여섯 개를 자동으로 확인합니다

![네 경계값 테스트와 기존 회귀 테스트가 여섯 시트 결과를 함께 검증하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/11/116a94fe09afb4fd46b4b540ab74ed4dbc17e8795b50042afa4f55fd4df78d7a.png "경계 조건과 기존 기능 검증이 모두 녹색이어야 새 조건이 승인됩니다")

경계 테스트는 대표값 하나만 넣지 않습니다. 경계 바로 아래, 경계값, 취소 바로 아래, 취소가 아닌 가장
작은 값을 넣습니다. `pytest.mark.parametrize`를 사용하면 같은 분류 함수를 짧게 반복할 수 있습니다.

마지막에는 기존 자동화 전체 테스트도 실행합니다. 새 테스트만 통과하고 기존 합계나 시트가 깨진 경우를
막기 위한 단계입니다.

#### 코드

```python
import pytest


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (-1, "취소거래"),
        (0, "일반"),
        (99_999, "일반"),
        (100_000, "고액거래"),
    ],
)
def test_transaction_boundaries(amount, expected):
    assert classify_transaction(amount) == expected


def test_output_has_six_sheets(tmp_path):
    output = tmp_path / "result.xlsx"
    write_report(sample_report(), output)
    assert read_sheet_names(output) == [
        "정상", "확인필요", "부서요약", "검증", "고액거래", "취소거래"
    ]
```

#### 확인 목록

- 경계값 네 개의 기대값과 실제값
- 기존 테스트와 새 테스트의 PASS 개수
- 기존 네 시트가 유지됐다는 검사 결과
- 고액거래와 취소거래의 행 수 및 금액 합계
- 실제로 변경한 파일 목록

#### 참고 자료

- [pytest parametrize 공식 문서](https://docs.pytest.org/en/stable/how-to/parametrize.html)
- [pandas ExcelWriter 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.ExcelWriter.html)
