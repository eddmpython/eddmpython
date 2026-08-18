---
title: Excel 데이터 정리 방법: 다른 열 이름과 금액 형식 합치기
slug: excel-data-normalization
author: eddmpython
section: Excel 업무자동화
summary: Excel 데이터 정리 방법을 열 이름 변환과 금액 문자열 및 부서와 날짜 통일로 익힙니다. 원본 열을 남기고 변경과 실패 건수를 확인합니다.
readerQuestion: 열 이름과 금액 및 부서와 날짜 형식이 다른 Excel 파일을 어떻게 한 표로 합칠까?
readerTakeaway: 열 이름 변환표를 먼저 적용하고 문자 금액과 부서 및 날짜를 표준 값으로 바꾼 뒤 원본 대비 변경 건수와 변환 실패 건수를 검사한다.
readerLevel: beginner
readerStartingPoint: 여러 Excel 파일을 DataFrame으로 읽고 파일과 시트 및 필수 열 계약을 검사할 수 있는 상태입니다.
primaryKeyword: Excel 데이터 정리
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/08/08804fa085a5c06307cbf4778def08cd2391ef856ded871e000bef68365231ab.png
ogImageAlt: 서로 다른 세 Excel 파일의 금액 관련 열 이름이 표준 금액 열 하나로 모이는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Excel 데이터 정리 없이 파일을 바로 합치면 `금액`, `합계금액`, `Amount`가 서로 다른 열로 남습니다. `50,000원`은 문자이고 `50000`은 숫자라 같은 금액처럼 보여도 합계에서 다른 결과를 낼 수 있습니다.

이 글에서는 열 이름과 금액 및 부서와 날짜를 한 기준으로 맞춥니다. 정리 전 값을 별도 열에 보관하고 몇 행이 바뀌었는지와 숫자로 바꾸지 못한 행이 몇 개인지 출력해 결과를 확인합니다.

## 열 이름 변환표로 표준 열을 만듭니다

### 금액과 합계금액 및 Amount를 같은 금액 열 이름으로 바꿉니다

![서로 다른 세 Excel 파일의 금액 관련 열 이름이 표준 금액 열 하나로 모이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/08/08804fa085a5c06307cbf4778def08cd2391ef856ded871e000bef68365231ab.png "세 파일의 서로 다른 머리글이 변환표를 지나 같은 위치의 표준 금액 열로 모입니다")

파일마다 같은 뜻의 열 이름이 다르면 합치기 전에 하나로 바꿔야 합니다. 변환표의 왼쪽에는 실제로 들어올 수 있는 이름을 적고 오른쪽에는 자동화 내부에서 사용할 표준 이름을 적습니다.

먼저 모든 열 이름의 앞뒤 공백을 지웁니다. 그다음 `rename(columns=COLUMN_MAP)`을 적용합니다. 변환 뒤 같은 이름의 열이 두 개 생기면 어느 값을 쓸지 알 수 없으므로 중복 열 이름 검사에서 멈춥니다.

#### 코드

```python
COLUMN_MAP = {
    "합계금액": "금액",
    "Amount": "금액",
    "Dept": "부서",
    "Date": "거래일",
}


def normalize_columns(table):
    normalized = table.copy()
    normalized.columns = normalized.columns.astype(str).str.strip()
    normalized = normalized.rename(columns=COLUMN_MAP)

    duplicated = normalized.columns[normalized.columns.duplicated()].tolist()
    if duplicated:
        raise ValueError(f"표준화 뒤 중복 열: {duplicated}")
    return normalized
```

#### 예시

```text
변환 전 ['Date', 'Dept', 'Amount']
변환 후 ['거래일', '부서', '금액']
```

#### 참고 자료

- [pandas DataFrame rename 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.rename.html)

## 금액 문자열에서 쉼표와 원을 지웁니다

### 공백과 쉼표와 원 표시를 제거한 뒤 숫자로 바꾸고 실패 행을 찾습니다

![쉼표와 통화 기호 및 공백이 섞인 금액 문자열 세 개가 정수 값 세 개로 바뀌는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/bf/bf5c8b44d4666afc4da74ec6de1f76821285a270c2a35cfd1661aef38fe7475e.png "세 금액 문자열은 공백과 장식 제거 및 숫자 변환을 통과하고 잘못된 값은 오류표로 갑니다")

금액 열에 `50,000원`이 들어 있으면 pandas는 숫자가 아니라 문자열로 읽을 수 있습니다. 먼저 원본을 `금액_원본`에 복사하고 문자 앞뒤 공백과 쉼표 및 `원` 표시를 지웁니다.

`to_numeric(errors="coerce")`는 바꿀 수 없는 값을 `NaN`으로 만듭니다. 원본은 비어 있지 않은데 변환 결과가 `NaN`인 행만 고르면 `오만원`처럼 코드가 해석할 수 없는 값을 찾을 수 있습니다.

#### 코드

```python
def normalize_amount(table):
    normalized = table.copy()
    normalized["금액_원본"] = normalized["금액"]

    amount_text = (
        normalized["금액"]
        .astype("string")
        .str.strip()
        .str.replace(",", "", regex=False)
        .str.replace("원", "", regex=False)
    )
    normalized["금액"] = pd.to_numeric(amount_text, errors="coerce")

    invalid = normalized["금액_원본"].notna() & normalized["금액"].isna()
    return normalized, invalid
```

#### 예시

```text
원본       정리 결과
50,000원   50000
 120000    120000
80,000     80000
오만원      NaN
```

#### 참고 자료

- [pandas to_numeric 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html)

## 부서와 날짜 표기를 통일합니다

### 문자 앞뒤 공백과 부서 약어 및 여러 날짜 형식을 같은 값으로 정리합니다

![띄어쓰기와 약어가 다른 부서 값과 서로 다른 날짜 표기가 표준 부서와 날짜로 정리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/dd/dd5a96a25eeccc5992763908b57ee0eb84bf0222df9917af95d4971407e38195.png "부서 변형은 표준 부서 두 개로 모이고 서로 다른 달력 표기는 같은 날짜 열로 바뀝니다")

`영업팀`, ` 영업팀 `, `영업`은 사람이 보면 비슷하지만 집계에서는 다른 그룹이 됩니다. `str.strip()`으로 앞뒤 공백을 지운 뒤 `DEPARTMENT_MAP`에서 약어를 정식 이름으로 바꿉니다.

날짜도 `2026-08-01`, `2026/08/01`, Excel 날짜 셀처럼 여러 모양으로 들어옵니다. `to_datetime`으로 날짜형을 만들고 바꾸지 못한 행은 `NaT`로 모읍니다. 원본 날짜 열은 비교를 위해 남깁니다.

#### 코드

```python
DEPARTMENT_MAP = {
    "영업": "영업팀",
    "Sales": "영업팀",
    "개발": "개발팀",
    "Dev": "개발팀",
}


def normalize_department_and_date(table):
    normalized = table.copy()
    normalized["부서_원본"] = normalized["부서"]
    normalized["거래일_원본"] = normalized["거래일"]

    department = normalized["부서"].astype("string").str.strip()
    normalized["부서"] = department.replace(DEPARTMENT_MAP)
    normalized["거래일"] = pd.to_datetime(normalized["거래일"], errors="coerce")
    return normalized
```

#### 참고 자료

- [pandas Series str.strip 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.Series.str.strip.html)

## 원본 값과 정리 결과를 함께 검증합니다

### 원본 열을 남기고 변경 건수와 변환 실패 건수를 숫자로 확인합니다

![원본 값과 정리된 값이 나란히 있는 표에서 변환 건수와 실패 건수가 검사되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/03/036f1bd2499fbb9101001fa7f27fba7998626f754a356a4a46131be6270a6b1f.png "다섯 원본과 정리 값이 행마다 연결되고 바뀐 3행과 실패 0건이 별도 카드에 집계됩니다")

값을 정리한 뒤 결과 열만 남기면 어떤 원본이 바뀌었는지 확인하기 어렵습니다. `금액_원본`, `부서_원본`, `거래일_원본`을 결과의 확인필요 시트에 남기면 담당자가 원본 셀과 바뀐 값을 나란히 볼 수 있습니다.

변경 건수와 실패 건수도 출력합니다. 샘플 다섯 행에서 변경된 값이 3개이고 변환 실패가 0개라면 그 숫자를 기대값으로 검사합니다. 실패가 있으면 합계를 내기 전에 해당 행을 확인필요로 보냅니다.

#### 코드

```python
amount_changed = (
    normalized["금액_원본"].astype("string").str.strip()
    != normalized["금액"].astype("Int64").astype("string")
)
department_changed = normalized["부서_원본"].astype("string").str.strip() != normalized["부서"]

changed_count = int((amount_changed | department_changed).sum())
failed_count = int(normalized[["거래일", "금액"]].isna().any(axis=1).sum())

print("변경 행", changed_count)
print("실패 행", failed_count)
```

#### 예시

```text
변경 행 3
실패 행 0
```

#### 확인 목록

- 정리 전 열을 결과에 남겼는지 확인합니다.
- 변경 행 수가 예상과 같은지 확인합니다.
- 날짜와 금액 변환 실패 행 수를 확인합니다.
- 실패 행을 합계에서 제외했는지 확인합니다.
