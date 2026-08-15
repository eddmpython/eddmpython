---
title: pandas groupby 사용법: 부서별 건수와 금액 집계 방법
slug: pandas-groupby-summary
author: eddmpython
section: Excel 업무자동화
summary: pandas groupby 사용법을 부서별 거래건수와 금액합계 및 평균금액 계산으로 익힙니다. 정렬과 비율을 더하고 원본 합계와 차이 0을 검증합니다.
readerQuestion: 여러 거래 행을 부서별로 묶어 건수와 금액 합계 및 평균을 어떻게 계산할까?
readerTakeaway: 정상 데이터를 부서로 묶고 이름 있는 집계로 요약 열을 만든 뒤 전체 합계와 부서별 합계의 차이가 0인지 검사한다.
readerLevel: beginner
readerStartingPoint: Excel 데이터를 정상과 확인필요 행으로 나누고 금액 열을 숫자형으로 만들 수 있는 상태입니다.
primaryKeyword: pandas groupby 사용법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/79/79349c81900d130243394b66f6de28284c447aa5a24965261d57a69c9f72aa2e.png
ogImageAlt: 거래 표의 행이 부서 색상별 세 묶음으로 갈라지는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`pandas groupby 사용법`을 모르면 거래 1만 행에서 어느 부서가 몇 번 결제했고 얼마를 썼는지 알기 어렵습니다. 이럴 때
`groupby`로 같은 부서의 행을 묶고 각 묶음의 건수와 합계 및 평균을 계산합니다.

이 글에서는 이전 단계에서 만든 `clean` DataFrame을 사용합니다. 빈 부서와 잘못된 금액은 이미
`확인필요`로 분리됐으므로 요약표에는 계산 가능한 정상 행만 들어갑니다.

## groupby는 같은 부서의 행을 먼저 묶습니다

### 정상 데이터의 부서 열을 기준으로 행을 세 묶음으로 나눕니다

![거래 표의 행이 부서 색상별 세 묶음으로 갈라지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/79/79349c81900d130243394b66f6de28284c447aa5a24965261d57a69c9f72aa2e.png "아홉 거래 행이 부서 배지에 따라 세 개의 작은 표로 정확히 나뉩니다")

`groupby`는 같은 값을 가진 행을 한 묶음으로 만든 뒤 각 묶음에 계산을 적용합니다. `clean.groupby("부서")`는
영업팀 행끼리, 개발팀 행끼리, 운영팀 행끼리 모읍니다.

이 단계에서는 원본 행이 없어지지 않습니다. 단지 어떤 행에 같은 계산을 적용할지 부서 값을 기준으로
나눈 것입니다. 빈 부서가 남아 있으면 기본 설정에서 요약에서 빠질 수 있으므로 집계 전에 확인합니다.

#### 코드

```python
if clean["부서"].isna().any():
    raise ValueError("정상 데이터에 빈 부서가 있습니다")

for department, group in clean.groupby("부서"):
    print(department, "행 수", len(group))
```

#### 예시

```text
개발팀 행 수 3
영업팀 행 수 4
운영팀 행 수 2
```

#### 참고 자료

- [pandas GroupBy 사용자 안내](https://pandas.pydata.org/docs/user_guide/groupby.html)

## 이름 있는 집계로 건수와 합계 및 평균을 만듭니다

### 결과 열 이름과 계산할 원본 열 및 함수를 한 줄씩 연결합니다

![부서별 거래 묶음에서 건수와 합계 및 평균이 계산되어 한 요약 행으로 합쳐지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/60/60ae3e534f05c0c553dc43a2491ea7319262065266fef9f503008e942a5ac5e4.png "각 부서 묶음의 건수와 합계 및 평균이 계산되어 요약표 한 행에 배치됩니다")

요약표에는 `거래건수`, `금액합계`, `평균금액`처럼 사람이 바로 이해할 수 있는 열 이름이 필요합니다.
이름 있는 집계는 `결과 열 이름=(원본 열, 계산 함수)` 형태라 무엇을 계산하는지 코드에서 바로 보입니다.

`as_index=False`를 사용하면 부서가 인덱스가 아니라 일반 열로 남습니다. 이 형태는 다음 단계에서
Excel 시트로 저장하거나 다른 표와 합치기 쉽습니다.

#### 코드

```python
summary = (
    clean.groupby("부서", as_index=False)
    .agg(
        거래건수=("거래ID", "count"),
        금액합계=("금액", "sum"),
        평균금액=("금액", "mean"),
    )
)

summary["평균금액"] = summary["평균금액"].round(0).astype("Int64")
print(summary)
```

#### 예시

```text
부서    거래건수  금액합계  평균금액
개발팀  3         240000    80000
영업팀  4         320000    80000
운영팀  2         100000    50000
```

#### 참고 자료

- [pandas DataFrame groupby 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.groupby.html)
- [pandas DataFrame agg 공식 문서](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.agg.html)

## 합계가 큰 부서부터 정렬하고 비율을 더합니다

### 금액 합계 내림차순과 전체 대비 비율로 먼저 볼 부서를 찾습니다

![부서 요약 행이 금액 합계 순으로 재배치되고 전체에서 차지하는 비율 막대가 붙는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a6/a69f3f4ceebfc52d0091ac9d84770264f26e274142380ac87f072d75508f659d.png "부서 요약 행이 큰 금액부터 정렬되고 세 비율 막대가 전체 한 덩어리를 이룹니다")

부서 이름 순서보다 금액 합계가 큰 순서가 검토할 대상을 찾기 쉽습니다. `sort_values`로 금액합계를
내림차순 정렬하면 가장 큰 부서가 첫 행에 옵니다.

금액비율은 각 부서 합계를 전체 합계로 나눈 값입니다. 합계가 0인 데이터에서는 0으로 나눌 수 없으므로
비율 계산을 생략하거나 전부 0으로 둡니다.

#### 코드

```python
summary = summary.sort_values("금액합계", ascending=False).reset_index(drop=True)

total_amount = summary["금액합계"].sum()
if total_amount == 0:
    summary["금액비율"] = 0.0
else:
    summary["금액비율"] = (summary["금액합계"] / total_amount * 100).round(1)

print(summary[["부서", "금액합계", "금액비율"]])
```

#### 설명 목록

- 금액비율이 `48.5`라면 그 부서가 정상 거래 전체 금액의 48.5퍼센트를 차지합니다.
- 비율은 순위를 이해하기 위한 보조 값입니다.
- 실제 검증은 반올림하지 않은 `금액합계`로 수행합니다.

## 요약 합계와 정상 데이터 합계를 비교합니다

### 부서별 금액 합계를 다시 더해 통합내역 합계와 차이가 0인지 확인합니다

![정상 거래 금액 합계와 부서 요약 금액 합계가 같은 저울 위에서 일치하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/20/20b25773c80c400ec6dcffcfcecad37e1cec77ba9bef7d78c7797a4aff504908.png "정상 거래 합계와 세 부서 요약 합계가 저울에서 일치하고 차이 0 검사를 통과합니다")

집계 코드는 실행됐다는 사실보다 숫자가 보존됐다는 사실이 중요합니다. 정상 거래의 금액을 직접 더한
값과 부서별 금액합계를 다시 더한 값이 같아야 합니다.

차이가 0이 아니면 빈 부서가 집계에서 빠졌거나 숫자가 아닌 금액이 섞였는지 확인합니다. 이 검사를
Excel 파일을 저장하기 전에 실행하면 잘못된 요약표가 배포되는 것을 막을 수 있습니다.

#### 코드

```python
detail_total = clean["금액"].sum()
summary_total = summary["금액합계"].sum()
difference = detail_total - summary_total

assert abs(difference) < 0.001

print("정상 데이터 합계", detail_total)
print("부서 요약 합계", summary_total)
print("차이", difference)
```

#### 예시

```text
정상 데이터 합계 660000
부서 요약 합계 660000
차이 0
```

이제 `clean`, `issues`, `summary` 세 표가 준비됐습니다. 다음 단계에서는 이 표들과 실행 정보를 한
Excel 파일의 네 시트로 저장합니다.
