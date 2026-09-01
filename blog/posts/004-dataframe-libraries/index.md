---
title: 파이썬 데이터프레임 라이브러리 12가지
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
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef0ebfa270d6567d90fdd3f14576e1e77a58d17226e7739bed8043f20def0469.webp
ogImageAlt: 어두운 책상 위에 두꺼운 종이 뭉치가 쌓여 있고 그 옆면에서 얇은 종이 띠 두 장만 뽑혀 나와 밝게 놓인 장면
ogImageWidth: 1216
ogImageHeight: 832
ogImageType: image/webp
---

엑셀의 행과 열을 파이썬으로 옮기면 대개 pandas의 `DataFrame` 을 처음 만납니다. 그런데 DataFrame이라는 이름을 쓰는 라이브러리는 pandas 하나가 아닙니다. 그렇다면 내 표에는 무엇을 골라야 할까요? 같은 표처럼 보여도 어느 메모리에 놓이는지, 계산을 언제 시작하는지, 한 대에서 도는지 여러 대에서 도는지가 다릅니다.

이 글은 Python에서 `DataFrame` 또는 `GeoDataFrame` 객체를 제공하는 열두 가지를 절마다 하나씩 다룹니다. DuckDB는 데이터베이스이고 PyArrow는 `Table` 과 메모리 규격을 제공하며 Ibis는 계산 표현식을 여러 엔진으로 보냅니다. 셋 다 훌륭한 표 도구지만 DataFrame 열두 가지에는 넣지 않았습니다. SQL로 파일을 분석하려는 독자는 [Codaro DuckDB 입문](https://eddmpython.github.io/codaro/learn/lesson/duckdb/00_DuckDB소개/)에서 따로 시작할 수 있습니다.

같은 판매 기록 네 줄을 열두 DataFrame에 넣고, 서울 수량의 합계가 5인지 확인합니다. 작은 표를 쓰는 이유는 모든 코드를 같은 눈금으로 읽기 위해서입니다. 속도는 데이터 크기와 장비에 따라 뒤집히므로 서로 다른 컴퓨터와 클러스터에서 나온 숫자를 한 순위표로 섞지 않았습니다. 아래 버전과 실행 조건은 2026년 9월 1일에 다시 확인했습니다.

![어두운 책상 위에 두꺼운 종이 뭉치가 쌓여 있고 그 옆면에서 얇은 종이 띠 두 장만 뽑혀 나와 밝게 놓인 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef0ebfa270d6567d90fdd3f14576e1e77a58d17226e7739bed8043f20def0469.webp "표는 커져도 질문에 쓰는 열은 일부입니다")

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

처음에는 데이터가 있는 자리와 열의 종류를 봅니다. 일반 로컬 표는 pandas와 Polars, 메모리보다 큰 로컬 파일은 Vaex, SQL식 지연 계획은 DataFusion이 맡습니다. 좌표는 GeoPandas, 여러 DataFrame을 받는 라이브러리는 Narwhals, pandas 호환 병렬화는 Modin, 여러 작업자는 Dask가 후보입니다. 이미지와 오디오가 섞이면 Daft, NVIDIA GPU는 cuDF, Spark 클러스터는 PySpark, BigQuery에 이미 있는 표는 BigFrames로 좁힙니다.

## pandas DataFrame, 가장 넓은 출발점

pandas의 `DataFrame` 은 행과 열에 이름이 붙은 2차원 표입니다. 숫자, 문자열, 날짜처럼 자료형이 다른 열을 한 표에 둘 수 있고 행에도 인덱스라는 라벨이 있습니다. 두 표를 계산할 때 행 라벨과 열 이름을 맞춰 주는 동작이 pandas의 중요한 특징입니다.

설치는 한 줄입니다.

```powershell
python -m pip install pandas
```

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

DataFrame 생성부터 조인과 그룹화까지 이어서 연습하려면 [Codaro pandas 입문](https://eddmpython.github.io/codaro/learn/lesson/pandas/00_판다스소개/)으로 갑니다.

## Polars DataFrame, 열 중심 표현식

![세로로 빽빽하게 꽂힌 얇은 판 다섯 줄 가운데 두 줄만 위로 뽑혀 나와 있고 나머지 세 줄은 꽂힌 자리에 그대로 있는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/15/159e3259346a2f8fed48fd874fe2a479214a12f3a3d40ea6645308d505f199ad.webp "필요한 열을 표현식으로 골라 계산합니다")

Polars DataFrame도 행과 열로 된 2차원 표지만 pandas 문법을 복제하지 않습니다. 행마다 함수를 부르기보다 `pl.col("qty")` 같은 열 표현식을 조합하고, Rust로 만든 실행기가 여러 CPU 코어를 활용합니다.

```powershell
python -m pip install polars
```

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

표현식과 지연 실행을 더 배우려면 [Codaro Polars 입문](https://eddmpython.github.io/codaro/learn/lesson/polars/00_Polars소개/)으로 이어집니다.

## Vaex DataFrame, 메모리보다 큰 로컬 파일

Vaex DataFrame은 HDF5와 Arrow 파일을 메모리에 전부 복사하지 않고 필요한 열을 늦게 계산하는 로컬 표입니다. 공식 문서는 이를 [lazy Out-of-Core DataFrame](https://vaex.io/docs/index.html)이라고 부릅니다. 파일은 노트북 디스크에 있고 계산은 한 컴퓨터에서 한다는 점이 Dask 같은 분산 표와 다릅니다.

```powershell
python -m pip install vaex
```

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

`from_dict` 로 만든 작은 표의 실제 클래스 이름은 `DataFrameLocal` 입니다. 서울 조건은 선택으로 남고 `sum` 이 수량 열을 읽어 5를 계산합니다. 이 예제는 API를 확인하기 위한 메모리 표이며, Vaex의 이유는 큰 HDF5나 Arrow 파일을 `open` 으로 열 때 드러납니다.

작은 CSV 몇 개를 다룬다면 pandas나 Polars가 단순합니다. 파일을 HDF5나 Arrow로 준비할 수 있고 탐색 집계를 반복하지만 전체를 메모리에 올리기 어려울 때 Vaex를 검토합니다.

## DataFusion DataFrame, 프로그램 안의 질의 엔진

DataFusion DataFrame은 Rust와 Apache Arrow로 질의를 먼저 계획하므로 실제 계산은 마지막 동작에서 시작됩니다. 서버나 데이터베이스 파일을 먼저 띄우지 않고 Python 프로세스 안에서 CSV, Parquet, JSON, Arrow 자료를 읽으며 SQL과 DataFrame API를 함께 씁니다.

```powershell
python -m pip install datafusion
```

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

DataFusion DataFrame은 셀을 직접 고치는 분석 노트보다 질의 기능을 프로그램 안에 넣을 때 맞습니다. SQL과 DataFrame 표현식을 같은 Arrow 실행기에 태울 수 있습니다. 다른 데이터 시스템에 질의 엔진을 넣으려는 개발자에게 맞습니다.

## GeoPandas GeoDataFrame, 좌표와 도형이 있는 열

GeoPandas의 `GeoDataFrame` 은 pandas DataFrame에 점, 선, 면을 담는 geometry 열을 더하고, 그 도형이 쓰는 좌표계를 함께 기록할 수 있습니다. 아래 네 행에는 서울, 부산, 대구의 경도와 위도를 점으로 넣습니다.

```powershell
python -m pip install geopandas shapely
```

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

Narwhals DataFrame은 데이터를 직접 실행하는 새 엔진이 아니라 pandas, Polars, Modin, cuDF, PyArrow를 같은 표현식으로 다루는 호환 계층입니다. 아래에서는 pandas를 백엔드로 골라 Narwhals DataFrame 하나를 만듭니다.

```powershell
python -m pip install narwhals pandas
```

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

Dask DataFrame은 여러 pandas DataFrame을 행 방향 파티션으로 나눈 뒤 하나의 큰 표처럼 보이게 합니다. 각 파티션의 열 이름과 자료형을 빈 pandas 표인 메타데이터로 기억하고, 계산 순서는 작업 그래프로 쌓습니다.

```powershell
python -m pip install "dask[dataframe]"
```

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

Dask의 강점은 DataFrame 하나가 여러 파일과 여러 작업자에 걸쳐 있을 수 있다는 점입니다. 그렇다고 모든 pandas 코드를 그대로 빠르게 만드는 것은 아닙니다. 정렬과 조인처럼 파티션 사이에서 행을 옮기는 셔플은 비싸고, 한 번에 처리하는 파티션 수가 많으면 메모리도 함께 늘어납니다.

한 대의 메모리에 안정적으로 들어가는 표라면 pandas나 Polars가 더 단순합니다. [Dask DataFrame 설계 문서](https://docs.dask.org/en/latest/dataframe-design.html)는 각 파티션이 pandas DataFrame이라고 명시합니다. 이미 pandas 코드가 있고 자료가 메모리보다 크거나 여러 파일로 나뉘었을 때 Dask를 검토할 이유가 생깁니다.

## Modin DataFrame, pandas 문법을 병렬 엔진으로

![매끈한 판 하나를 가운데 두고 생김새가 서로 다른 공구 세 개가 각각 다른 방향에서 그 판의 같은 면에 닿아 있는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/69/69f86a5f36d0171f7a1c4cff45560283c7afb9133269c10e30abac524ab8c905.webp "표 모양은 같아도 계산 도구의 구조는 다릅니다")

Modin은 pandas와 같은 이름의 함수를 제공하면서 DataFrame을 Ray나 Dask 엔진 위의 파티션으로 나눕니다. 기존 코드에서 `import pandas as pd` 를 `import modin.pandas as pd` 로 바꾸는 것이 출발점입니다.

현재 Modin 0.37.1은 pandas 3.0과 같은 환경에 섞을 수 없습니다. 기존 프로젝트와 분리한 가상환경에서 호환되는 pandas를 함께 받습니다.

```powershell
python -m pip install "modin[ray]==0.37.1"
```

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

이미지와 오디오를 한 행에 묶어야 합니다. 그래서 Daft DataFrame이 그 표를 맡습니다. 문자열과 숫자뿐 아니라 이미지, 오디오, 비디오, 텐서를 열로 다루고, 데이터가 커지면 Ray나 Kubernetes 작업자로 계산을 나눌 수 있습니다.

```powershell
python -m pip install daft
```

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

cuDF는 NVIDIA RAPIDS가 만드는 GPU DataFrame입니다. pandas와 닮은 선택, 그룹화, 조인 API를 CUDA에서 실행하며 데이터는 시스템 메모리가 아니라 GPU 메모리에 놓입니다.

설치는 일반적인 Windows Python의 `pip install` 한 줄로 끝나지 않습니다. cuDF 26.08은 NVIDIA Volta 이후 GPU와 Linux 환경을 요구하고, Windows 11에서는 WSL2의 Linux 안에 설치합니다. CUDA 버전에 맞는 패키지도 골라야 하므로 [RAPIDS 설치 선택기](https://docs.rapids.ai/install/)에서 현재 장비에 맞는 명령을 받아야 합니다. CUDA 12를 쓰는 WSL2 Linux라면 현재 설치 형태는 다음과 같습니다.

```powershell
python -m pip install "cudf-cu12==26.8.*" --extra-index-url=https://pypi.nvidia.com
```

설치가 끝난 환경에서 DataFrame을 다루는 모양은 이렇습니다. 공식 API와 현재 설치 조건을 대조했지만, 이 글을 검증한 Windows Python에서는 실행하지 않았으므로 출력은 제시하지 않습니다.

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

두 서울 행의 수량은 3과 2이므로 합계 식이 겨누는 답은 5입니다. NVIDIA GPU가 있어도 네 행을 CPU에서 GPU로 옮기는 비용이 계산보다 큽니다. 반복할 큰 조인과 집계가 있고 데이터와 중간 결과가 GPU 메모리에 머물 때 cuDF를 검토할 이유가 생깁니다.

기존 pandas 코드를 그대로 두고 GPU 연산을 시도하는 `cudf.pandas` 가속기도 있습니다. 지원되는 연산은 cuDF로 보내고 나머지는 pandas로 되돌리므로, 실제 작업에서는 어느 연산이 GPU에서 돌았는지 프로파일로 확인해야 합니다.

## PySpark DataFrame, 여러 대의 실행기로

PySpark DataFrame은 Spark SQL의 분산 표를 파이썬에서 다루는 API입니다. 데이터와 계산 계획은 Spark가 관리하고, 실제 파티션은 여러 실행기에서 처리할 수 있습니다. pandas와 이름은 같지만 행을 즉시 꺼내 고치는 로컬 객체로 생각하면 맞지 않습니다.

PySpark 4.2.0은 Python 3.10 이상과 Java 17 이상을 요구합니다. 현재 검증 환경에는 Java가 없어 아래 코드는 실행하지 않았고, 설치와 API는 [PySpark 공식 설치 문서](https://spark.apache.org/docs/latest/api/python/getting_started/install.html)와 대조했습니다.

```powershell
python -m pip install pyspark
```

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

BigQuery DataFrames의 Python 패키지 이름은 `bigframes` 이고, pandas 호환 진입점은 `bigframes.pandas` 입니다. DataFrame의 자료와 계산을 로컬 메모리나 직접 관리하는 작업자 대신 Google BigQuery에 둡니다.

```powershell
python -m pip install bigframes
```

아래 코드의 프로젝트 이름은 자신의 Google Cloud 프로젝트로 바꿔야 합니다. BigQuery API, 결제 설정, 인증과 필요한 IAM 역할도 먼저 준비합니다. BigFrames 2.48.0 패키지와 DataFrame 생성 API까지 확인했습니다. 실제 BigQuery 작업은 실행하지 않았으므로 출력은 제시하지 않습니다.

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

두 서울 행을 고르는 pandas 문법은 같지만 `sum` 은 BigQuery 작업으로 실행됩니다. 작은 목록은 질의에 직접 들어갈 수 있고 큰 입력은 임시 BigQuery 표로 올라갑니다. [Google Cloud 설치 문서](https://docs.cloud.google.com/bigquery/docs/install-dataframes)는 프로젝트와 위치, 인증, 역할을 먼저 요구합니다.

BigQuery에 이미 큰 표가 있고 그 자리에서 집계와 머신러닝을 이어 갈 때 BigFrames가 맞습니다. 로컬 파일 네 줄을 시험하려고 클라우드 프로젝트와 작업 비용을 더하는 선택은 맞지 않습니다.
