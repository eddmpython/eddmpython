---
title: 파이썬 데이터프레임 라이브러리 12가지, 내 표에는 무엇을 쓸까
slug: dataframe-libraries
author: eddmpython
section: 파이썬 데이터
summary: 같은 판매 데이터를 12개 DataFrame으로 만들고 같은 질문을 풉니다. 일반 표부터 공간 데이터, 멀티모달, GPU, 클러스터, 클라우드까지 실행 경계를 비교합니다.
readerQuestion: 파이썬 데이터프레임 라이브러리가 여러 가지인데 각각 무엇이 다르고 내 작업에는 어느 것을 골라야 하나?
readerTakeaway: 익숙한 문법보다 데이터가 놓인 자리와 열의 종류를 먼저 보면 로컬, 공간, 분산, GPU, 클라우드 DataFrame 가운데 맞는 것을 고를 수 있다.
readerLevel: working
readerStartingPoint: 엑셀은 쓸 줄 알고 pandas로 DataFrame과 groupby를 써 봤지만 다른 데이터프레임은 이름만 들어 봤다.
primaryKeyword: 파이썬 데이터프레임 라이브러리
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b7/b7a066f6547cb75ba0b59029c911e428c7cf3191b916c32ce196c16f3105a7ef.png
ogImageAlt: region과 qty 두 열에 담긴 판매 기록 네 줄의 설명 이미지
ogImageWidth: 1672
ogImageHeight: 941
ogImageType: image/png
---

pandas로 표를 다뤄 봤는데 Polars, Dask, cuDF까지 만나면 무엇을 바꿔야 할지 막힙니다. 같은 `DataFrame`이라는 이름을 써도 데이터가 놓이는 곳과 계산을 맡는 장비가 다릅니다.

어느 라이브러리가 내 표에 맞을까요? 판매 기록 네 줄에서 서울 수량을 더하는 같은 예제로 열두 라이브러리를 비교합니다. 읽고 나면 데이터의 위치와 열의 종류로 후보를 좁힐 수 있습니다.

## 데이터가 놓이는 곳부터 비교
### 같은 합계라도 계산을 맡는 장비는 다르다

![region과 qty 두 열에 담긴 판매 기록 네 줄의 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b7/b7a066f6547cb75ba0b59029c911e428c7cf3191b916c32ce196c16f3105a7ef.png "region과 qty 두 열에 담긴 판매 기록 네 줄의 설명 이미지 · 설명 이미지")

| 라이브러리 | 이 글의 버전 | 계산이 머무는 자리 | 이 환경에서 확인 |
|---|---:|---|---|
| pandas | 3.0.5 | 한 Python 프로세스의 메모리 | 직접 실행 |
| Polars | 1.44.1 | 한 컴퓨터의 여러 CPU 코어 | 직접 실행 |
| Vaex | 4.19.0 | 메모리에 올리지 않은 로컬 파일 | 별도 환경에서 직접 실행 |
| DataFusion | 54.0.0 | 한 프로세스의 Arrow 질의 엔진 | 직접 실행 |
| GeoPandas | 1.1.4 | 좌표와 도형이 든 pandas 표 | 직접 실행 |
| Narwhals | 2.25.0 | 선택한 DataFrame 백엔드 | pandas 백엔드로 직접 실행 |
| Dask | 2026.8.0 | 여러 pandas 조각과 작업자 | 직접 실행 |
| Modin | 0.37.1 | Ray가 나눈 pandas 호환 조각 | 별도 환경에서 직접 실행 |
| Daft | 0.7.24 | 로컬 실행기 또는 분산 작업자 | 직접 실행 |
| cuDF | 26.08 | NVIDIA GPU 메모리 | 공식 환경 조건과 API 확인 |
| PySpark | 4.2.0 | Spark 실행기와 클러스터 | 공식 환경 조건과 API 확인 |
| BigFrames | 2.48.0 | Google BigQuery | 패키지와 공식 API 확인 |

표의 버전과 실행 조건은 2026년 9월 1일 확인 기록입니다. 직접 실행한 예제와 환경 조건만 대조한 예제를 마지막 열에서 구분했습니다. 속도 순위가 아니므로 후보를 고를 때는 계산이 머무는 자리를 먼저 봅니다.

 일반 로컬 표는 pandas와 Polars, 메모리보다 큰 로컬 파일은 Vaex, SQL식 지연 계획은 DataFusion이 맡습니다. 좌표는 GeoPandas, 여러 DataFrame을 받는 라이브러리는 Narwhals, pandas 호환 병렬화는 Modin, 여러 작업자는 Dask가 후보입니다. 이미지와 오디오가 섞이면 Daft, NVIDIA GPU는 cuDF, Spark 클러스터는 PySpark, BigQuery에 이미 있는 표는 BigFrames로 좁힙니다.

## 선택한 예제의 실행 환경 준비
### 열두 패키지를 한 환경에 모두 설치하지 않기

[![선택한 예제의 실행 환경 준비 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1a/1ad8d9b01d26ed118a50c7cdc593a54a5263e10a73c0abdcf2f5445a9f65b75e.png "선택한 예제의 실행 환경 준비 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.python.org/3/tutorial/venv.html)

출처: [Python Software Foundation](https://docs.python.org/3/tutorial/venv.html) · [사용 조건](https://docs.python.org/3/license.html). 원문 화면 일부를 캡처했습니다.

| 실행할 예제 | 준비할 명령이나 환경 |
|---|---|
| pandas | `python -m pip install pandas` |
| Polars | `python -m pip install polars` |
| Vaex | 별도 환경에서 `python -m pip install vaex` |
| DataFusion | `python -m pip install datafusion` |
| GeoPandas | `python -m pip install geopandas shapely` |
| Narwhals | `python -m pip install narwhals pandas` |
| Dask | `python -m pip install "dask[dataframe]"` |
| Modin | 별도 환경에서 `python -m pip install "modin[ray]==0.37.1"` |
| Daft | `python -m pip install daft` |
| cuDF | NVIDIA GPU와 Linux 필요. [RAPIDS 설치 선택기](https://docs.rapids.ai/install/)에서 장비에 맞는 명령 확인 |
| PySpark | Python 3.10 이상과 Java 17 이상을 준비하고 `python -m pip install pyspark` |
| BigFrames | `python -m pip install bigframes`. BigQuery 프로젝트·결제·인증·IAM 역할도 필요 |

비교만 읽는다면 설치하지 않아도 됩니다. 직접 실행할 라이브러리를 하나 골랐다면 그 행의 준비를 마친 뒤 같은 이름의 절에서 Python 코드를 통째로 복사합니다. 코드가 import하는 패키지 이름은 각 예제 첫 줄에 있습니다.

Vaex와 Modin은 기존 분석 환경과 분리합니다. 특히 여기서 확인한 Modin 0.37.1은 pandas 3.0과 함께 설치할 수 없습니다. 프로젝트별 환경을 아직 나누지 않았다면 [Python 가상환경 안내](https://docs.python.org/3/tutorial/venv.html)대로 별도 환경을 만들고 그 환경의 터미널에서 설치 명령을 실행합니다.

cuDF·PySpark·BigFrames는 패키지 외의 준비가 필요합니다. 장비나 서비스가 없으면 그 예제는 코드와 흐름도만 비교하고, 실행하지 않은 결과를 성공으로 세지 않습니다.

## pandas DataFrame, 가장 넓은 출발점
### 행 라벨과 열 이름으로 값을 고르는 표

[![pandas DataFrame, 가장 넓은 출발점 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ce/ce7918d89c28d8508dc7ab713b0a61da52a3d4cb6ffb80009e6a993a1511e3e8.png "pandas DataFrame, 가장 넓은 출발점 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://pandas.pydata.org/docs/getting_started/intro_tutorials/01_table_oriented.html)

출처: [pandas contributors](https://pandas.pydata.org/docs/getting_started/intro_tutorials/01_table_oriented.html) · [사용 조건](https://pandas.pydata.org/docs/getting_started/overview.html#license). 원문 화면 일부를 캡처했습니다.

```flow
행과 열에 이름 붙이기 | region과 qty, 행 인덱스를 가진 DataFrame
서울 행 고르기 | loc에서 region 조건과 qty 열을 지정
수량 합계 | 선택한 3과 2를 더해 5
```

pandas의 `DataFrame` 은 행과 열에 이름이 붙은 2차원 표입니다. 숫자, 문자열, 날짜처럼 자료형이 다른 열을 한 표에 둘 수 있고 행에도 인덱스라는 라벨이 있습니다. 두 표를 계산할 때 행 라벨과 열 이름을 맞춰 주는 동작이 pandas의 중요한 특징입니다.

같은 판매 표를 pandas DataFrame으로 만듭니다.

```python
import pandas as pd

salesDf = pd.DataFrame(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

seoulQty = salesDf.loc[salesDf["region"] == "서울", "qty"].sum()

print(type(salesDf).__name__)
print(seoulQty)
```

```text
DataFrame
5
```

`loc` 안의 앞 조건은 서울 행을 고르고 뒤의 `"qty"` 는 수량 열을 고릅니다. 그 Series에 `sum()` 을 적용했으므로 답은 5입니다. 엑셀, CSV, Parquet, SQL을 읽고 결측값 처리와 조인, 시계열, 그래프까지 한 API에서 이어 가기 좋습니다.

pandas DataFrame은 한 Python 프로세스 안에 놓입니다. 파일이 메모리에 충분히 들어가고 결과가 기다릴 만한 시간 안에 나온다면 이 단순함이 장점입니다. 데이터가 커졌다는 이유만으로 먼저 바꾸지 말고 `usecols`, 알맞은 자료형, Parquet처럼 읽는 양을 줄이는 방법부터 확인할 수 있습니다.

아래 실습 칸에서는 행 수를 바꾸며 pandas DataFrame이 쓰는 메모리와 서울 수량을 함께 확인합니다.

https://eddmpython.com/codaro/run/?example=df-pandas-memory

## Polars DataFrame, 열 중심 표현식
### 열을 고르는 식에 필터와 합계를 연결

[![Polars DataFrame, 열 중심 표현식 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/cb/cb96102314b5a71d224e15776b3ceed63ebb39cbb6b29889802a6d70a682db19.png "Polars DataFrame, 열 중심 표현식 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.pola.rs/user-guide/concepts/expressions-and-contexts/)

출처: [Ritchie Vink and Polars contributors](https://docs.pola.rs/user-guide/concepts/expressions-and-contexts/) · [사용 조건](https://github.com/pola-rs/polars/blob/main/LICENSE). 원문 화면 일부를 캡처했습니다.

```flow
열 표현식 | pl.col로 region과 qty를 지정
필터와 집계 | filter로 서울을 고르고 select로 합계 계산
숫자 꺼내기 | item으로 한 칸의 값 5를 받음
```

Polars DataFrame도 행과 열로 된 2차원 표지만 pandas 문법을 복제하지 않습니다. 행마다 함수를 부르기보다 `pl.col("qty")` 같은 열 표현식을 조합하고, Rust로 만든 실행기가 여러 CPU 코어를 활용합니다.

```python
import polars as pl

salesDf = pl.DataFrame(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

seoulQty = (
    salesDf
    .filter(pl.col("region") == "서울")
    .select(pl.col("qty").sum())
    .item()
)

print(type(salesDf).__name__)
print(seoulQty)
```

```text
DataFrame
5
```

Polars DataFrame에는 pandas처럼 행 라벨을 맞추는 인덱스가 없습니다. 대신 `filter`, `select`, `group_by` 에 열 표현식을 넘기는 방식이 일관됩니다. `.item()` 은 한 칸짜리 결과 DataFrame에서 숫자 5를 꺼냅니다.

위 코드는 만들자마자 계산하는 즉시 실행 DataFrame입니다. 큰 파일에서 필요한 열과 행만 읽도록 전체 계획을 먼저 최적화하려면 Polars의 별도 자료 구조인 `LazyFrame` 을 씁니다. DataFrame과 LazyFrame을 같은 것으로 부르면 실행 시점을 놓치므로 둘은 구분해야 합니다.

한 컴퓨터 안에서 pandas보다 빠른 읽기와 집계가 필요하고 문법을 바꿀 수 있다면 Polars가 후보입니다. pandas 인덱스에 기대는 코드가 많다면 변환 비용까지 함께 봐야 합니다.

아래 실습 칸은 같은 Polars DataFrame에서 서울 수량과 지역별 합계를 구합니다.

https://eddmpython.com/codaro/run/?example=df-polars-group

## Vaex DataFrame, 메모리보다 큰 로컬 파일
### 파일 전체를 복사하지 않고 필요한 열 계산

[![Vaex DataFrame, 메모리보다 큰 로컬 파일 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e1/e1d84bbe8b6edefda47d5cf752e9110f326e60ef23e313e4cef40ae9b1448e9c.png "Vaex DataFrame, 메모리보다 큰 로컬 파일 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://vaex.io/docs/tutorial.html)

출처: [Maarten A. Breddels and Vaex contributors](https://vaex.io/docs/tutorial.html) · [사용 조건](https://github.com/vaexio/vaex/blob/master/LICENSE.txt). 원문 화면 일부를 캡처했습니다.

```flow
로컬 파일 | HDF5나 Arrow 파일을 open으로 엶
선택과 표현식 | 필요한 행과 열을 지정
집계 | 필요한 데이터를 읽으며 합계를 계산
```

Vaex DataFrame은 HDF5와 Arrow 파일을 메모리에 전부 복사하지 않고 필요한 열을 늦게 계산하는 로컬 표입니다. 공식 문서는 이를 [lazy Out-of-Core DataFrame](https://vaex.io/docs/index.html)이라고 부릅니다. 파일은 노트북 디스크에 있고 계산은 한 컴퓨터에서 한다는 점이 Dask 같은 분산 표와 다릅니다.

```python
import vaex

salesDf = vaex.from_dict(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

seoulQty = salesDf[salesDf.region == "서울"].sum("qty")

print(type(salesDf).__name__)
print(int(seoulQty))
```

```text
DataFrameLocal
5
```

`from_dict` 로 만든 작은 표의 실제 클래스 이름은 `DataFrameLocal` 입니다. 서울 조건은 선택으로 남고 `sum` 이 수량 열을 읽어 5를 계산합니다. 이 예제는 API를 확인하기 위한 메모리 표입니다. Vaex의 장점은 큰 HDF5나 Arrow 파일을 `open`으로 열 때 드러납니다.

작은 CSV 몇 개를 다룬다면 pandas나 Polars가 단순합니다. 파일을 HDF5나 Arrow로 준비할 수 있고 탐색 집계를 반복하지만 전체를 메모리에 올리기 어려울 때 Vaex를 검토합니다.

## DataFusion DataFrame, 프로그램 안의 질의 엔진
### 계획을 쌓고 결과를 요구할 때 실행

[![DataFusion 공식 문서에 나온 DataFrame 질의 계획](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/64/645de01ed3cbcc01cef8bc65e4f91e7657c13e37cd345f0292a7763246eb12fe.png "DataFusion 공식 문서에 나온 DataFrame 질의 계획 · 실제 캡처")](https://datafusion.apache.org/python/user-guide/dataframe/index.html)

출처: [The Apache Software Foundation](https://datafusion.apache.org/python/user-guide/dataframe/index.html) · [사용 조건](https://github.com/apache/datafusion-python/blob/main/LICENSE.txt). 원문 화면 일부를 캡처했습니다.

```flow
입력 | SessionContext에 판매 표 등록
질의 계획 | filter와 aggregate로 계산할 내용 지정
실행 | to_pydict를 호출하면 합계 5를 돌려줌
```

DataFusion DataFrame은 계산할 내용을 먼저 계획으로 쌓아 두고, 결과를 요청할 때 실제 계산을 시작합니다. 서버나 데이터베이스 파일을 먼저 띄우지 않고 Python 프로세스 안에서 CSV, Parquet, JSON, Arrow 자료를 읽으며 SQL과 DataFrame API를 함께 씁니다.

```python
from datafusion import SessionContext, col, literal
from datafusion import functions as dfFunc

queryContext = SessionContext()
salesDf = queryContext.from_pydict(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

resultDf = (
    salesDf
    .filter(col("region") == literal("서울"))
    .aggregate([], [dfFunc.sum(col("qty")).alias("seoulQty")])
)
seoulQty = resultDf.to_pydict()["seoulQty"][0]

print(type(salesDf).__name__)
print(int(seoulQty))
```

```text
DataFrame
5
```

`filter` 와 `aggregate` 는 논리 계획을 만들고 `to_pydict` 가 실행을 요구합니다. [DataFusion Python 문서](https://datafusion.apache.org/python/user-guide/dataframe/index.html)는 `collect`, `show`, `to_pandas` 같은 마지막 동작 전에는 지연 실행된다고 설명합니다.

DataFusion DataFrame은 셀을 직접 고치는 분석 노트보다 질의 기능을 프로그램 안에 넣을 때 맞습니다. SQL과 DataFrame 표현식을 같은 Arrow 실행기로 처리할 수 있기 때문입니다.

## GeoPandas GeoDataFrame, 좌표와 도형이 있는 열
### 수량 표에 점과 좌표계를 함께 기록

[![GeoPandas GeoDataFrame, 좌표와 도형이 있는 열 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/cb/cbfbda5020f66b1bf035e5d606b17dd5a2558a7d8cc8fe8d5558d5a10f384488.png "GeoPandas GeoDataFrame, 좌표와 도형이 있는 열 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://geopandas.org/en/latest/docs/reference/geodataframe.html)

출처: [GeoPandas developers](https://geopandas.org/en/latest/docs/reference/geodataframe.html) · [사용 조건](https://github.com/geopandas/geopandas/blob/main/LICENSE.txt). 원문 화면 일부를 캡처했습니다.

```flow
일반 열 | region과 qty에 지역 이름과 수량 기록
geometry 열 | 경도와 위도를 Point로 저장
좌표계 | EPSG:4326으로 점을 해석할 기준 지정
```

GeoPandas의 `GeoDataFrame` 은 pandas DataFrame에 점, 선, 면을 담는 geometry 열을 더하고, 그 도형이 쓰는 좌표계를 함께 기록할 수 있습니다. 아래 네 행에는 서울, 부산, 대구의 경도와 위도를 점으로 넣습니다.

```python
import geopandas as gpd
from shapely.geometry import Point

salesDf = gpd.GeoDataFrame(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    },
    geometry=[
        Point(126.9780, 37.5665),
        Point(129.0756, 35.1796),
        Point(126.9780, 37.5665),
        Point(128.6014, 35.8714),
    ],
    crs="EPSG:4326",
)

seoulQty = salesDf.loc[salesDf["region"] == "서울", "qty"].sum()

print(type(salesDf).__name__)
print(int(seoulQty))
```

```text
GeoDataFrame
5
```

서울 두 행의 수량을 더하는 문법은 pandas와 같고 답도 5입니다. `geometry` 열과 `EPSG:4326` 좌표계가 붙었으므로 이 표는 [GeoPandas GeoDataFrame](https://geopandas.org/en/latest/docs/reference/geodataframe.html)입니다.

단순히 지역 이름으로 합계를 낼 때는 GeoPandas가 필요 없습니다. 어느 점이 행정구역 안에 있는지 찾거나 거리, 교차, 공간 조인, 지도 표시가 질문에 들어올 때 GeoDataFrame을 고릅니다.

## Narwhals DataFrame, 여러 표를 받는 한 가지 API
### 호출 문법은 같게 두고 계산은 백엔드에 맡김

[![Narwhals DataFrame, 여러 표를 받는 한 가지 API 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/64/64b0bfa9983e015f0a5194d6d07dc0e22bbc897913db3a8eb8edfcec14af2b44.png "Narwhals DataFrame, 여러 표를 받는 한 가지 API 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://narwhals-dev.github.io/narwhals/api-reference/dataframe/)

출처: [Marco Gorelli and Narwhals contributors](https://narwhals-dev.github.io/narwhals/api-reference/dataframe/) · [사용 조건](https://github.com/narwhals-dev/narwhals/blob/main/LICENSE.md). 원문 화면 일부를 캡처했습니다.

```flow
호출부 | Narwhals의 filter와 select 사용
호환 계층 | 백엔드가 이해하는 연산으로 연결
계산 | 이 예제는 pandas가 합계 5를 구함
```

Narwhals DataFrame은 계산을 직접 수행하는 새 엔진이 아니라 pandas, Polars, Modin, cuDF, PyArrow를 같은 표현식으로 다루는 호환 계층입니다. 아래에서는 pandas를 백엔드로 골라 Narwhals DataFrame 하나를 만듭니다.

```python
import narwhals as nw

salesDf = nw.DataFrame.from_dict(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    },
    backend="pandas",
)

seoulQty = (
    salesDf
    .filter(nw.col("region") == "서울")
    .select(nw.col("qty").sum())
    .item()
)

print(type(salesDf).__name__)
print(int(seoulQty))
```

```text
DataFrame
5
```

`backend="pandas"` 이므로 실제 계산은 pandas가 맡지만 호출부에는 Narwhals 표현식만 남습니다. [Narwhals DataFrame 문서](https://narwhals-dev.github.io/narwhals/api-reference/dataframe/)의 `from_dict` 는 pandas, PyArrow, Polars, Modin, cuDF 백엔드를 고를 수 있습니다.

분석가가 백엔드 하나를 정해서 쓰는 프로젝트라면 Narwhals가 한 층 더 생길 뿐입니다. 반대로 그래프나 머신러닝 라이브러리를 만들어 여러 종류의 DataFrame을 입력으로 받아야 한다면 백엔드마다 분기하는 코드를 줄일 수 있습니다.

## Dask DataFrame, pandas 표를 여러 조각으로
### 파티션별 계산 결과를 모아 합계 하나로

[![Dask DataFrame, pandas 표를 여러 조각으로 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/91/91720f707dcf04f7a99b1ed871865cf4adffebd283d474d64199eb50a65c6394.png "Dask DataFrame, pandas 표를 여러 조각으로 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.dask.org/en/latest/dataframe-design.html)

출처: [Anaconda, Inc. and Dask contributors](https://docs.dask.org/en/latest/dataframe-design.html) · [사용 조건](https://github.com/dask/dask/blob/main/LICENSE.txt). 원문 화면 일부를 캡처했습니다.

```flow
파티션 둘 | 네 행을 pandas 표 두 조각으로 나눔
계산 계획 | 서울 행을 고르고 qty를 더하도록 지정
compute | 각 조각을 계산하고 합계 5를 모음
```

Dask DataFrame은 여러 pandas DataFrame을 행 방향 파티션으로 나눈 뒤 하나의 큰 표처럼 보이게 합니다. 계산 순서는 작업 그래프로 쌓습니다.

```python
import dask.dataframe as dd

salesDf = dd.from_dict(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    },
    npartitions=2,
)

seoulQty = salesDf[salesDf["region"] == "서울"]["qty"].sum().compute()

print(type(salesDf).__name__)
print(salesDf.npartitions)
print(seoulQty)
```

```text
DataFrame
2
5
```

`npartitions=2` 때문에 네 행이 두 조각으로 나뉩니다. 필터와 합계를 적는 동안에는 작업 계획만 생기고, 마지막 `compute()` 가 두 조각의 계산을 시작해 답을 모읍니다.

Dask의 강점은 DataFrame 하나가 여러 파일과 여러 작업자에 걸쳐 있을 수 있다는 점입니다. 그렇다고 모든 pandas 코드를 그대로 빠르게 만드는 것은 아닙니다. 정렬과 조인처럼 파티션 사이에서 행을 옮기는 셔플은 시간과 메모리를 많이 쓰고, 한 번에 처리하는 파티션 수가 많으면 메모리 사용량도 늘어납니다.

한 대의 메모리에 안정적으로 들어가는 표라면 pandas나 Polars가 더 단순합니다. [Dask DataFrame 설계 문서](https://docs.dask.org/en/latest/dataframe-design.html)는 각 파티션이 pandas DataFrame이라고 명시합니다. 이미 pandas 코드가 있고 자료가 메모리보다 크거나 여러 파일로 나뉘었을 때 Dask를 검토할 이유가 생깁니다.

## Modin DataFrame, pandas 문법을 병렬 엔진으로
### 익숙한 호출을 유지하고 실행 엔진 변경

[![Modin DataFrame, pandas 문법을 병렬 엔진으로 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/99/995dc47056fcc2b68c25797605e32c6232543a8b5a8f5ffd640d2d1b7f70fe01.png "Modin DataFrame, pandas 문법을 병렬 엔진으로 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://modin.readthedocs.io/en/stable/getting_started/troubleshooting.html)

출처: [Modin contributors](https://modin.readthedocs.io/en/stable/getting_started/troubleshooting.html) · [사용 조건](https://github.com/modin-project/modin/blob/main/LICENSE). 원문 화면 일부를 캡처했습니다.

```flow
호출부 | modin.pandas로 DataFrame 생성
Ray 엔진 | 파티션으로 나눠 지원하는 연산 실행
미지원 연산 | 필요하면 pandas 구현으로 돌아감
```

Modin은 pandas와 같은 이름의 함수를 제공하면서 DataFrame을 Ray나 Dask 엔진 위의 파티션으로 나눕니다. 기존 코드에서 `import pandas as pd` 를 `import modin.pandas as pd` 로 바꾸는 것이 출발점입니다.

```python
import os

os.environ["MODIN_ENGINE"] = "ray"

import modin.pandas as pd

salesDf = pd.DataFrame(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

seoulQty = salesDf.loc[salesDf["region"] == "서울", "qty"].sum()

print(type(salesDf).__name__)
print(seoulQty)
```

```text
DataFrame
5
```

격리 환경에서 이 코드를 실행하자 답보다 먼저 로컬 Ray 인스턴스가 시작됐습니다. 네 행을 더하는 일에는 그 준비 비용이 전부 손해입니다. 반대로 이미 큰 pandas 코드가 있고 읽기와 집계 가운데 Modin이 병렬화한 연산이 병목이라면 코드를 적게 바꾸고 여러 코어를 시험할 수 있습니다.

Modin이 pandas API 전체를 독자적으로 병렬 구현한 것은 아닙니다. 지원하지 않는 연산은 pandas 구현으로 돌아갈 수 있으며, 그때는 Modin DataFrame을 pandas로 바꾸는 비용이 붙습니다. [Modin 문제 해결 문서](https://modin.readthedocs.io/en/stable/getting_started/troubleshooting.html)의 `defaulting to pandas` 경고가 바로 그 경계입니다.

## Daft DataFrame, 이미지와 오디오까지 한 행에
### 다양한 열의 처리 순서를 계획으로 쌓기

[![Daft DataFrame, 이미지와 오디오까지 한 행에 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/26/26ac97d36938c01b07efeef330687db37c0fa8976c18c5d91fc866ad456be4a3.png "Daft DataFrame, 이미지와 오디오까지 한 행에 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.daft.ai/en/stable/api/dataframe/)

출처: [Daft contributors](https://docs.daft.ai/en/stable/api/dataframe/) · [사용 조건](https://github.com/Eventual-Inc/Daft/blob/main/LICENSE). 원문 화면 일부를 캡처했습니다.

```flow
입력 행 | 숫자·문자열과 미디어 열을 함께 다룰 수 있음
변환 계획 | where와 agg로 필터·집계 지정
collect | 이 예제는 로컬에서 계획을 실행
```

Daft DataFrame은 이미지와 오디오를 한 행에 묶어 처리하는 표입니다. 문자열과 숫자뿐 아니라 이미지, 오디오, 비디오, 텐서를 열로 다루고, 데이터가 커지면 Ray나 Kubernetes 작업자로 계산을 나눌 수 있습니다.

```python
import daft

salesDf = daft.from_pydict(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

resultDf = (
    salesDf
    .where(salesDf["region"] == "서울")
    .agg(daft.col("qty").sum().alias("seoulQty"))
    .collect()
)
seoulQty = resultDf.to_pydict()["seoulQty"][0]

print(type(salesDf).__name__)
print(int(seoulQty))
```

```text
DataFrame
5
```

`where` 와 `agg` 는 계획을 만들고 `collect` 가 로컬 실행기에서 계산해 5를 냅니다. [Daft DataFrame API](https://docs.daft.ai/en/stable/api/dataframe/)도 변환을 내부 질의 계획에 쌓고 실행 동작이 계산한다고 설명합니다.

네 행의 문자열과 숫자만 처리할 때는 Polars나 DataFusion이 더 단순합니다. 상품 이미지, 음성 파일, 임베딩과 구조화 열을 같은 행에 두고 전처리나 AI 추론을 묶어야 할 때 Daft의 멀티모달 자료형이 차이를 만듭니다.

## cuDF DataFrame, GPU 메모리에서 계산
### 데이터와 중간 결과를 GPU에 두고 연산

[![cuDF DataFrame, GPU 메모리에서 계산 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/61/61da39b0ae3e07e4ff534621edf083918c4b1f02f6abf5e48a5d12efcc3e6568.png "cuDF DataFrame, GPU 메모리에서 계산 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.rapids.ai/install/)

출처: [NVIDIA Corporation](https://docs.rapids.ai/install/) · [사용 조건](https://github.com/rapidsai/docs/blob/main/LICENSE). 원문 화면 일부를 캡처했습니다.

```flow
입력 이동 | 데이터를 NVIDIA GPU 메모리로 옮김
GPU 계산 | 필터와 합계를 CUDA에서 실행
결과 확인 | 합계를 Python 코드에서 받음
```

cuDF는 NVIDIA RAPIDS가 만드는 GPU DataFrame입니다. pandas와 닮은 선택, 그룹화, 조인 API를 CUDA에서 실행하며 데이터는 시스템 메모리가 아니라 GPU 메모리에 놓입니다.

설치 조건은 앞의 준비 표에서 확인합니다. 다음 코드는 NVIDIA GPU가 있는 Linux 환경을 전제로 합니다. 공식 API와 현재 설치 조건을 대조했지만, 이 글을 검증한 Windows Python에서는 실행하지 않았으므로 출력은 제시하지 않습니다.

<!-- cudf-cu12의 공식 Python import 이름은 cudf다. -->
<!-- hanlint-disable-next installImport -->

```python
import cudf

salesDf = cudf.DataFrame(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

seoulQty = salesDf[salesDf["region"] == "서울"]["qty"].sum()

print(type(salesDf).__name__)
print(seoulQty)
```

두 서울 행의 수량은 3과 2이므로 이 코드에서 구하려는 합계는 5입니다. 네 행의 합계만 필요하다면 GPU로 옮기는 준비가 추가됩니다. 반복할 큰 조인과 집계가 있고 데이터와 중간 결과가 GPU 메모리에 머물 때 cuDF를 검토할 이유가 생깁니다.

## PySpark DataFrame, 여러 대의 실행기로
### 드라이버가 계획하고 실행기가 파티션을 계산

[![PySpark DataFrame, 여러 대의 실행기로 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/34/34d32bcbf9069121bb92e63083de11b0c26bae463750e6d2c7709e3fabcdaf8f.png "PySpark DataFrame, 여러 대의 실행기로 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://spark.apache.org/docs/latest/api/python/getting_started/install.html)

출처: [The Apache Software Foundation](https://spark.apache.org/docs/latest/api/python/getting_started/install.html) · [사용 조건](https://github.com/apache/spark/blob/master/LICENSE). 원문 화면 일부를 캡처했습니다.

```flow
드라이버 | filter와 agg로 작업 계획 생성
실행기 | 파티션별 데이터를 처리
show | 계산을 요구하고 결과 표를 표시
```

PySpark DataFrame은 Spark SQL의 분산 표를 파이썬에서 다루는 API입니다. 데이터와 계산 계획은 Spark가 관리하고, 실제 파티션은 여러 실행기에서 처리할 수 있습니다. pandas와 이름은 같지만 행을 즉시 꺼내 고치는 로컬 객체로 생각하면 맞지 않습니다.

검증 환경에는 Java가 없어 아래 코드는 실행하지 않았고, 설치와 API는 [PySpark 공식 설치 문서](https://spark.apache.org/docs/latest/api/python/getting_started/install.html)와 대조했습니다.

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as sf

spark = SparkSession.builder.master("local[*]").appName("dataframe-twelve").getOrCreate()

salesDf = spark.createDataFrame(
    [("서울", 3), ("부산", 5), ("서울", 2), ("대구", 7)],
    ["region", "qty"],
)

resultDf = (
    salesDf
    .filter(salesDf.region == "서울")
    .agg(sf.sum("qty").alias("수량"))
)

print(type(salesDf).__name__)
resultDf.show()
spark.stop()
```

`filter` 와 `agg` 는 실행할 계획을 만들고 `show()` 가 실제 계산을 요구합니다. 두 서울 행의 수량을 더한 결과는 5가 되어야 합니다. 로컬 모드인 `local[*]` 는 문법 연습용이며, 데이터가 이미 Spark 클러스터와 큰 데이터 레이크에 있을 때 PySpark를 고를 이유가 생깁니다.

## BigFrames DataFrame, BigQuery 안에서 계산
### 로컬에서 쓴 표 연산을 BigQuery 작업으로 실행

[![BigFrames DataFrame, BigQuery 안에서 계산 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7f/7f1c13d4ce5be9938f89b090c1c7967138b47262915503514b6899a69aebf07e.png "BigFrames DataFrame, BigQuery 안에서 계산 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.cloud.google.com/bigquery/docs/install-dataframes)

이 화면은 [Google이 제공한 문서](https://docs.cloud.google.com/bigquery/docs/install-dataframes)의 일부를 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)에 따라 사용했습니다.

```flow
Python 코드 | bigframes.pandas로 연산 작성
BigQuery 작업 | 자료를 쿼리하고 합계 계산
결과 | Python에서 집계 값을 확인
```

BigQuery DataFrames의 Python 패키지 이름은 `bigframes` 이고, pandas 호환 진입점은 `bigframes.pandas` 입니다. DataFrame의 자료와 계산을 로컬 메모리나 직접 관리하는 작업자 대신 Google BigQuery에 둡니다.

BigQuery 설정을 마쳤다면 아래 코드에 적힌 프로젝트 이름을 직접 쓰는 Google Cloud 프로젝트로 바꿉니다. BigFrames 2.48.0 패키지와 DataFrame 생성 API까지 확인했습니다. 실제 BigQuery 작업은 실행하지 않았으므로 출력은 제시하지 않습니다.

```python
import bigframes.pandas as bpd

bpd.options.bigquery.project = "my-project-id"
bpd.options.bigquery.location = "asia-northeast3"

salesDf = bpd.DataFrame(
    {
        "region": ["서울", "부산", "서울", "대구"],
        "qty": [3, 5, 2, 7],
    }
)

seoulQty = salesDf.loc[salesDf["region"] == "서울", "qty"].sum()

print(type(salesDf).__name__)
print(seoulQty)
```

두 서울 행을 고르는 pandas 문법은 같지만 `sum` 은 BigQuery 작업으로 실행됩니다. [Google Cloud 설치 문서](https://docs.cloud.google.com/bigquery/docs/install-dataframes)는 프로젝트와 위치, 인증, 역할을 먼저 요구합니다.

BigQuery에 이미 큰 표가 있고 그 자리에서 집계와 머신러닝을 이어 갈 때 BigFrames가 맞습니다. 로컬 파일 네 줄을 시험하려고 클라우드 프로젝트와 작업 비용을 더하는 선택은 맞지 않습니다.

## 내 데이터로 후보 하나 확인
### 합계가 맞은 뒤 실제 작업의 시간과 메모리 측정

![서울 두 행의 수량 3과 2를 더한 합계 5의 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b9/b9e5aec1876cbd4041c412b50503a601ac14d55398fceeeae61461167cdd0e2c.png "서울 두 행의 수량 3과 2를 더한 합계 5의 설명 이미지 · 설명 이미지")

```flow
후보 선택 | 데이터 위치와 열 종류로 하나를 고름
작은 검증 | 네 행에서 서울 합계 5인지 확인
실제 작업 | 내 파일의 읽기·집계 시간과 메모리 확인
```

예제를 실행해 합계 5를 얻었다면 표를 만들고 행을 고르는 기본 호출은 확인한 셈입니다. 빠른 라이브러리를 찾았다는 뜻은 아닙니다. 후보 하나를 골라 실제 파일을 읽고 집계하면서 시간과 메모리를 확인해 보세요

합계가 다르면 먼저 지역 이름과 수량을 원본 네 행과 대조합니다. 결과가 맞고 시간과 메모리도 감당할 만하다면 그 도구로 작업을 이어 갑니다. 큰 파일의 속도나 분산 처리 여부는 이 네 행만으로 판단하지 않습니다.

## 더 해 볼 것

- 기존 pandas 코드를 유지하며 GPU 연산을 시험하려면 [cudf.pandas 가속기](https://docs.rapids.ai/api/cudf/stable/cudf_pandas/)를 확인합니다.

- 표 생성·조인·그룹화를 연습하려면 [Codaro pandas 입문](https://eddmpython.github.io/codaro/learn/lesson/pandas/00_판다스소개/)에서 시작합니다.
- 열 표현식과 지연 실행은 [Codaro Polars 입문](https://eddmpython.github.io/codaro/learn/lesson/polars/00_Polars소개/)에서 이어 갑니다.
- DataFrame 대신 SQL로 파일을 분석하려면 [Codaro DuckDB 입문](https://eddmpython.github.io/codaro/learn/lesson/duckdb/00_DuckDB소개/)을 봅니다.
