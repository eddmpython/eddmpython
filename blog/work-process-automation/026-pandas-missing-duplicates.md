---
title: pandas 빈값 중복 처리: 데이터를 버리지 않는 정리 순서
slug: pandas-missing-duplicates
author: eddmpython
section: Excel 업무자동화
summary: pandas 빈값 중복 처리 순서를 실제 거래 데이터로 익힙니다. 누락과 중복 및 변환 실패를 확인필요 표로 나누고 행 수와 금액을 검증합니다.
readerQuestion: Excel에서 읽은 데이터의 빈값과 중복 및 잘못된 자료형을 안전하게 어떻게 처리할까?
readerTakeaway: 필수값 누락과 중복 거래 ID 및 자료형 실패를 삭제하지 않고 이유와 함께 분리한 뒤 모든 입력 행과 금액이 보존됐는지 검사한다.
readerLevel: beginner
readerStartingPoint: Excel 열 이름과 금액 및 날짜를 표준 형식으로 바꿀 수 있는 상태입니다.
primaryKeyword: pandas 빈값 중복 처리
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b5/b5740fb68476680d0125a846e5e055033f96aee2cb98e75c0098dfd3fe289880.png
ogImageAlt: Excel 표의 필수 열 빈칸은 확인필요로 가고 선택 열 빈칸은 안전한 기본값으로 채워지는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`pandas 빈값 중복 처리`에서 빈값을 전부 0으로 채우고 중복 행을 바로 삭제하면 코드는 짧아집니다. 하지만 비어 있는 부서를 `0`이라는 부서로 만들거나 수정 거래를 지우는 순간 업무 결과는 틀릴 수 있습니다.

이 글에서는 입력 행을 지우지 않습니다. 정상적으로 계산할 수 있는 행은 `정상` 표로 보내고, 사람이 확인해야 할 행은 원본 값과 오류 이유를 붙여 `확인필요` 표로 보냅니다.

## 빈값은 열의 역할에 따라 다르게 처리합니다

### 필수값 누락은 확인필요로 보내고 선택값만 안전한 기본값으로 채웁니다

![Excel 표의 필수 열 빈칸은 확인필요로 가고 선택 열 빈칸은 안전한 기본값으로 채워지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b5/b5740fb68476680d0125a846e5e055033f96aee2cb98e75c0098dfd3fe289880.png "필수 열의 빈칸은 확인필요 표로 갈라지고 선택 열의 빈칸만 기본값을 받습니다")

빈 셀을 발견했다고 모든 열에 같은 값을 채우면 안 됩니다. `거래ID`, `부서`, `금액`은 계산과 추적에 필요한 필수 열입니다. 이 값이 비어 있으면 무엇을 뜻하는지 코드가 추측하지 않고 확인필요로 보냅니다.

`메모`처럼 없어도 계산할 수 있는 선택 열은 빈 문자열로 채울 수 있습니다. 이렇게 열마다 빈값 정책을 정하면 `fillna(0)` 한 줄로 데이터 의미가 바뀌는 일을 막을 수 있습니다.

#### 코드

```python
import pandas as pd

REQUIRED_COLUMNS = ["거래ID", "부서", "금액"]

work = table.copy()
work["메모"] = work["메모"].fillna("")
required_missing = work[REQUIRED_COLUMNS].isna().any(axis=1)

print("필수값 누락 행", int(required_missing.sum()))
```

#### 예시

```text
거래ID  부서    금액    메모     처리
T001    영업팀  50000            정상
T002           30000   출장     확인필요
T003    개발팀          서버비   확인필요
```

#### 참고 자료

- [pandas DataFrame fillna 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.fillna.html)

## 중복은 거래 ID 기준으로 먼저 찾습니다

### 같은 ID의 모든 행을 함께 보고 완전 중복인지 수정 거래인지 확인합니다

![같은 거래 ID를 가진 두 행이 함께 강조되어 삭제 전 비교 대상으로 분리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e6/e6e1ed9f0b182af40d4c6b78e2b8231a40cfc61f70987caecf885d65d6370a35.png "같은 ID를 가진 두 행을 비교표로 보내고 확인 전 삭제는 막습니다")

중복 행을 찾자마자 지우면 수정 거래나 취소 거래까지 잃을 수 있습니다. 전체 행이 우연히 같은지보다 업무에서 한 거래를 구분하는 `거래ID`가 같은지를 먼저 확인합니다.

`duplicated(..., keep=False)`는 나중에 나온 행뿐 아니라 같은 ID를 가진 첫 행도 함께 찾습니다. 두 행의 날짜와 부서와 금액을 나란히 본 다음 완전한 복사인지 수정 기록인지 담당자가 결정할 수 있습니다.

#### 코드

```python
duplicate_id = work.duplicated(subset=["거래ID"], keep=False)

duplicate_review = (
    work.loc[duplicate_id, ["거래ID", "거래일", "부서", "금액"]]
    .sort_values(["거래ID", "거래일"])
)

print(duplicate_review)
```

#### 예시

```text
거래ID  거래일       부서    금액
T004    2026-08-03  영업팀  70000
T004    2026-08-04  영업팀  65000
```

두 행은 ID가 같지만 날짜와 금액이 다릅니다. 따라서 자동 삭제 대상이 아니라 확인 대상입니다.

#### 참고 자료

- [pandas DataFrame duplicated 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.duplicated.html)

## 자료형 변환 실패 행을 따로 보관합니다

### 날짜와 금액을 변환하고 실패한 원본 값과 오류 이유를 남깁니다

![날짜와 금액 변환을 통과한 행은 정상 표로 가고 실패한 행은 이유와 함께 확인필요 표로 가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/38/38d3f156aba3dc626ae473db7c57bc5c1d6f0564a13c7bcec42c491db7e0f529.png "각 행이 날짜와 숫자 검사를 거쳐 정상 표 또는 원본 값이 남은 확인필요 표로 갑니다")

날짜와 금액을 변환할 때 `errors="coerce"`만 쓰고 끝내면 실패 값이 조용히 `NaT`나 `NaN`으로 바뀝니다. 변환 전 값이 있었는데 변환 뒤 비어 있는 행을 찾아야 어떤 입력이 잘못됐는지 알 수 있습니다.

아래 코드는 누락, 중복 ID, 자료형 실패 순서로 주된 오류 이유 하나를 붙입니다. 한 행이 여러 조건에 걸려도 `확인필요`에는 한 번만 들어가므로 전체 입력을 빠짐없이 둘로 나눌 수 있습니다.

#### 코드

```python
work["거래일_원본"] = work["거래일"]
work["금액_원본"] = work["금액"]
work["거래일"] = pd.to_datetime(work["거래일"], errors="coerce")
work["금액"] = pd.to_numeric(work["금액"], errors="coerce")

date_error = work["거래일_원본"].notna() & work["거래일"].isna()
amount_error = work["금액_원본"].notna() & work["금액"].isna()
type_error = date_error | amount_error

reason = pd.Series(pd.NA, index=work.index, dtype="string")
reason = reason.mask(required_missing, "필수값 누락")
reason = reason.mask(reason.isna() & duplicate_id, "중복 거래ID")
reason = reason.mask(reason.isna() & type_error, "자료형 변환 실패")
work["오류이유"] = reason

clean = work.loc[reason.isna()].copy()
issues = work.loc[reason.notna()].copy()
```

#### 설명 목록

- `clean`은 다음 집계에 사용하는 정상 표입니다.
- `issues`에는 원본 값과 `오류이유`가 남습니다.
- 담당자는 `issues`를 Excel에서 고친 뒤 자동화를 다시 실행할 수 있습니다.

## 정리 전후 행 수와 금액을 맞춥니다

### 입력이 정상과 확인필요로 빠짐없이 나뉘고 변환 가능한 금액 합계가 같은지 검사합니다

![입력 행이 정상과 확인필요 두 표로 나뉜 뒤 행 수와 금액 합계가 다시 맞춰지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/68/6829c52f80f6a9485f1677894d47090e2229bf896df38502e10d016931c10488.png "여덟 입력 행이 정상 다섯 행과 확인필요 세 행으로 보존되고 두 숫자 검사가 일치합니다")

데이터 정리가 끝났다는 말은 표가 깨끗해 보인다는 뜻이 아닙니다. 입력 8행이 정상 5행과 확인필요 3행으로 나뉘었다면 `8 = 5 + 3`을 코드로 검사해야 합니다.

금액도 같은 방식으로 확인합니다. 숫자로 변환할 수 있던 원본 금액의 합계와 정상 및 확인필요 표의 변환된 금액 합계가 같아야 정리 과정에서 값이 사라지지 않았다고 말할 수 있습니다.

#### 코드

```python
assert len(work) == len(clean) + len(issues)

input_amount = work["금액"].dropna().sum()
partition_amount = clean["금액"].dropna().sum() + issues["금액"].dropna().sum()
amount_difference = input_amount - partition_amount

assert abs(amount_difference) < 0.001

print("입력 행", len(work))
print("정상 행", len(clean))
print("확인필요 행", len(issues))
print("금액 차이", amount_difference)
```

#### 예시

```text
입력 행 8
정상 행 5
확인필요 행 3
금액 차이 0
```

이 네 숫자를 실행 기록에 남기면 데이터가 왜 제외됐고 어디에 보관됐는지 설명할 수 있습니다.
