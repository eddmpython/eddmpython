---
title: 파이썬 데이터프레임 라이브러리, 160MB CSV로 pandas Polars DuckDB를 재 봤습니다
slug: dataframe-libraries
author: eddmpython
section: 파이썬 데이터
summary: 5백만 줄짜리 매출 CSV 한 장에 같은 질문을 던지고 파이썬 데이터프레임 라이브러리로 답을 얻는 다섯 가지 방법의 시간과 메모리를 직접 쟀습니다. pandas가 4.1초에 560MB를 쓰는 자리에서 DuckDB는 0.13초에 47MB를 씁니다. 어디서 차이가 생기고 어느 것을 언제 고르는지 코드와 함께 봅니다.
readerQuestion: pandas가 느리고 메모리를 많이 쓸 때 Polars와 DuckDB 중 무엇으로 어떻게 바꿔야 할까?
readerTakeaway: 읽는 열을 줄이면 시간과 메모리가 같이 준다. Polars는 질문을 먼저 읽어 필요한 열만 가져오고 DuckDB는 파일에 SQL을 바로 던진다. 셋은 Arrow를 공유하므로 하나만 고를 필요가 없다.
readerLevel: working
readerStartingPoint: pandas로 read_csv와 groupby는 해 봤지만 Polars와 DuckDB는 이름만 들어봤고 Parquet이 무엇인지 모른다.
primaryKeyword: 파이썬 데이터프레임 라이브러리
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef0ebfa270d6567d90fdd3f14576e1e77a58d17226e7739bed8043f20def0469.webp
ogImageAlt: 어두운 책상 위에 두꺼운 종이 뭉치가 쌓여 있고 그 옆면에서 얇은 종이 띠 두 장만 뽑혀 나와 밝게 놓인 장면
ogImageWidth: 1216
ogImageHeight: 832
ogImageType: image/webp
---

매출 CSV 한 장을 받았습니다. 5백만 줄에 160MB입니다. 물어볼 것은 한 줄짜리입니다. 서울 지역 수량이 전부 몇 개일까요?

`pandas.read_csv` 로 열고 더했더니 답은 나왔습니다. `5247597` 입니다. 그런데 4.1초가 걸렸고 그동안 메모리를 560MB 썼습니다. 물어본 것은 `region` 과 `qty` 두 열뿐인데 파일에 있는 다섯 열이 전부 메모리에 올라갔습니다.

이 글은 같은 질문 하나를 다섯 가지 방법으로 풀면서 시간과 메모리가 어디서 줄어드는지 따라갑니다. 끝까지 읽으면 pandas와 Polars와 DuckDB로 같은 답을 얻는 코드가 손에 남습니다. 셋 사이에 표를 파일로 거치지 않고 바로 넘기는 방법도 같이 익힙니다.

아래 값들은 전부 한 대의 컴퓨터에서 직접 잰 것입니다. AMD Ryzen 7 8845HS, 논리 코어 16개, 메모리 31GB의 윈도우 노트북이고, 각 방법을 따로 띄운 파이썬에서 일곱 번씩 재서 가운데 값을 적었습니다. 메모리는 그 파이썬이 잡은 최대치입니다.

![어두운 책상 위에 두꺼운 종이 뭉치가 쌓여 있고 그 옆면에서 얇은 종이 띠 두 장만 뽑혀 나와 밝게 놓인 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef0ebfa270d6567d90fdd3f14576e1e77a58d17226e7739bed8043f20def0469.webp "다섯 열이 쌓여 있는데 답에 필요한 것은 두 열입니다")

## pandas로 5백만 줄에서 답 하나 얻기

먼저 지금 쓰는 방법을 그대로 재 봅니다. 파이썬이 깔린 컴퓨터에서 터미널을 열고 네 가지를 한 번에 설치합니다.

```powershell
python -m pip install pandas polars duckdb pyarrow
```

`Successfully installed` 로 시작하는 줄이 나오면 됩니다. 뒤의 번호는 받는 시점에 따라 다릅니다. 이 글의 숫자는 pandas 3.0.5, Polars 1.44.1, DuckDB 1.5.5, PyArrow 25.0.1에서 잰 것입니다.

`sales.csv` 는 이 글에서 쓰는 연습용 파일입니다. 회사 파일을 그대로 쓰면 열 이름이 달라 아래 코드가 안 돌아갑니다. `sales.csv` 를 먼저 만듭니다. 아래를 `make_sales.py` 로 저장합니다. 앞으로 만들 파일이 전부 이 폴더에 모입니다.

```python
import csv
import random

random.seed(7)
지역 = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원"]

with open("sales.csv", "w", newline="", encoding="utf-8") as f:
    쓰기 = csv.writer(f)
    쓰기.writerow(["date", "region", "item", "qty", "price"])
    for _ in range(5_000_000):
        쓰기.writerow([
            f"2025-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
            random.choice(지역),
            f"P{random.randint(1, 500):04d}",
            random.randint(1, 20),
            random.randint(1000, 90000),
        ])
```

그 폴더에서 터미널을 열고 실행합니다. 17초쯤 걸립니다.

```powershell
python make_sales.py
```

만들어진 `sales.csv` 는 `date`, `region`, `item`, `qty`, `price` 다섯 열에 5백만 줄이 들어 있습니다. 값은 무작위라 지역별 합계가 서로 비슷하게 나옵니다.

이 글이 재는 것은 매출의 크기가 아니라 답을 얻는 데 걸리는 시간과 메모리입니다.

이제 서울 수량 합계를 구합니다.

```python
import pandas as pd

df = pd.read_csv("sales.csv")
서울 = df[df["region"] == "서울"]
print(서울["qty"].sum())
```

```text
5247597
```

답은 맞습니다. 시간은 4.1초, 그동안 파이썬이 잡은 메모리의 최대치는 560MB였습니다.

560MB를 둘로 나눠 봅니다. `df.memory_usage(deep=True).sum()` 을 재면 291MB입니다. 표 자체가 291MB입니다. 파이썬과 pandas를 올리는 데만 83MB가 들고, 남는 186MB가 CSV를 표로 바꾸는 동안 원본 조각과 만들어지는 표가 함께 있어서 생기는 자리입니다. 그러니까 160MB짜리 파일 하나를 읽는 데 그 세 배 반이 필요합니다.

표가 파일보다 큰 것은 CSV가 전부 글자이기 때문입니다. `40000` 은 파일 안에서 다섯 글자지만 메모리에서는 8바이트짜리 정수가 되고, 문자열에는 글자 바깥에 그 글자가 어디서 시작하는지 적어 두는 자리가 값마다 8바이트씩 더 붙습니다.

여기서 pandas에게 읽을 열을 미리 알려 줄 수 있습니다. `usecols` 에 필요한 열 이름을 적으면 됩니다.

```python
import pandas as pd

df = pd.read_csv("sales.csv", usecols=["region", "qty"])
print(df[df["region"] == "서울"]["qty"].sum())
```

```text
5247597
```

2.7초에 269MB로 줄었습니다. 시간이 3분의 2, 메모리가 절반입니다.

그런데 `usecols` 에는 조건이 하나 붙습니다. 어느 열이 필요한지 내가 알아내서 손으로 적어야 합니다. 질문이 바뀌면 `usecols` 도 같이 고쳐야 하고, 고치는 것을 잊으면 조용히 다시 느려집니다.

`region` 과 `qty` 만 필요하다는 사실은 이미 코드 아래쪽에 적혀 있습니다. `df[df["region"] == "서울"]["qty"]` 가 그 문장입니다. 그런데 `read_csv` 는 그 줄이 실행되기 한참 전에 이미 파일을 다 읽어 버립니다.

아래 칸에서 pandas 표가 메모리를 얼마나 차지하는지 직접 볼 수 있습니다. 줄 수를 바꿔 가며 눌러 봅니다.

https://eddmpython.com/codaro/run/?example=df-pandas-memory

## Polars가 파일보다 질문을 먼저 읽는다

### 다섯 열 가운데 두 열만 올리기

![세로로 빽빽하게 꽂힌 얇은 판 다섯 줄 가운데 두 줄만 위로 뽑혀 나와 있고 나머지 세 줄은 꽂힌 자리에 그대로 있는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/15/159e3259346a2f8fed48fd874fe2a479214a12f3a3d40ea6645308d505f199ad.webp "질문에 쓰인 열만 파일에서 올라옵니다")

Polars에는 파일을 바로 읽지 않는 함수가 따로 있습니다. `read_csv` 대신 `scan_csv` 를 씁니다.

```python
import polars as pl

질문 = (
    pl.scan_csv("sales.csv")
    .filter(pl.col("region") == "서울")
    .select(pl.col("qty").sum())
)

print(질문.collect().item())
```

```text
5247597
```

0.5초에 320MB입니다. `usecols` 를 적은 pandas보다 다섯 배 빠른데 메모리는 269MB에서 오히려 늘었습니다. 왜 늘었는지는 이 절 끝에서 봅니다.

`scan_csv` 와 `read_csv` 는 여기서 갈립니다. `read_csv` 는 그 줄에서 파일을 읽습니다. `scan_csv` 는 읽겠다는 계획만 세우고 넘어갑니다. 그래서 `질문` 에는 아직 데이터가 없습니다. 그 뒤에 붙은 `filter` 와 `select` 도 실행되지 않고 계획에 항목으로 쌓입니다. 마지막 `collect()` 를 부르는 순간 Polars는 쌓인 계획 전체를 한 번에 보고, 그제야 파일을 엽니다.

계획을 전부 본 뒤에 파일을 열기 때문에 Polars는 `usecols` 에 손으로 적던 것을 스스로 알아냅니다. `질문.explain()` 을 찍어 보면 Polars가 세운 계획이 그대로 나옵니다.

```python
import polars as pl

질문 = (
    pl.scan_csv("sales.csv")
    .filter(pl.col("region") == "서울")
    .select(pl.col("qty").sum())
)

print(질문.explain())
```

```text
SELECT [col("qty").sum()]
  simple π 1/1 ["qty"]
    Csv SCAN [sales.csv]
    PROJECT 2/5 COLUMNS
    SELECTION: col("region") == "서울"
    ESTIMATED ROWS: 5067963
```

가운데의 `Csv SCAN` 이 파일을 여는 단계이고, 그 바로 아래 두 줄이 파일을 열면서 함께 하는 일입니다. `PROJECT 2/5 COLUMNS` 가 다섯 열 중 두 열만 표에 올리겠다는 뜻입니다. 열 이름은 어디에도 적지 않았습니다. `filter` 가 `region` 을 쓰고 `select` 가 `qty` 를 쓴다는 사실에서 Polars가 직접 뽑아냈습니다. `SELECTION` 은 서울만 남기는 조건을 파일을 읽는 단계까지 내려보냈다는 뜻이고, 그래서 서울이 아닌 줄은 표에 올라오지도 않습니다.

맨 아래 `ESTIMATED ROWS` 는 Polars가 어림한 줄 수입니다. 앞에서 본 답 `5247597` 과 자릿수가 비슷하지만 상관이 없습니다.

질문을 바꾸면 계획도 따라 바뀝니다. `select` 에 `price` 를 하나 더 넣고 다시 찍으면 `PROJECT 3/5 COLUMNS` 가 됩니다. 고칠 곳은 질문 한 군데뿐입니다.

아래 칸에서 Polars 표의 `filter` 와 `group_by` 를 손에 익힐 수 있습니다. 브라우저에 실린 Polars에는 `scan_csv` 와 `explain` 이 없어서 지연 실행은 내 컴퓨터에서만 봅니다.

https://eddmpython.com/codaro/run/?example=df-polars-group

미뤄 둔 답을 이제 봅니다. 메모리가 `usecols` 쪽보다 더 든 이유는 파일에 있습니다. `sales.csv` 는 한 줄만 떼어 봐도 처음부터 끝까지 글자입니다. 두 열만 쓰겠다고 정해도 그 두 열이 파일 안에서 줄마다 흩어져 있어서, 나머지 세 열을 건너뛰려면 결국 모든 줄을 한 글자씩 훑어야 합니다. Polars는 그 일을 코어 열여섯 개에 나눠 맡기기 때문에 빠른 대신 읽는 동안 쓰는 자리가 더 넓습니다.

계획은 표에 올릴 열만 줄였지 디스크에서 읽는 양은 줄이지 못했습니다. 파일이 CSV라서 생기는 한계입니다.

Polars를 처음부터 순서대로 익히려면 [Codaro의 Polars 입문 과정](https://eddmpython.com/codaro/learn/lesson/polars/00_Polars%EC%86%8C%EA%B0%9C/)에서 이어 봅니다. pandas 쪽은 [판다스 입문 과정](https://eddmpython.com/codaro/learn/lesson/pandas/00_%ED%8C%90%EB%8B%A4%EC%8A%A4%EC%86%8C%EA%B0%9C/)이 같은 자리에 있습니다.

## Parquet으로 저장하면 읽을 것이 줄어든다

CSV는 줄 단위로 저장합니다. 한 줄 안에 다섯 열의 값이 쉼표로 이어져 있고, 다음 줄에 또 다섯 열이 있습니다. 그래서 `qty` 열만 모아 보려면 5백만 줄을 전부 지나가면서 네 번째 쉼표 뒤를 매번 찾아야 합니다.

Parquet은 열 단위로 저장합니다. `region` 값 5백만 개가 한 덩어리로 모여 있고, `qty` 값 5백만 개가 또 한 덩어리로 모여 있습니다. 그래서 두 열만 필요하면 파일에서 그 두 덩어리만 집어 오고 나머지 세 덩어리는 건드리지 않습니다. 한 덩어리 안의 값은 종류가 같아서 압축도 훨씬 잘 됩니다.

바꾸는 데는 한 줄이면 됩니다.

```python
import polars as pl
import os

pl.read_csv("sales.csv").write_parquet("sales.parquet")

for 이름 in ("sales.csv", "sales.parquet"):
    print(f"{이름:16} {os.path.getsize(이름) / 1048576:6.1f} MB")
```

```text
sales.csv         159.5 MB
sales.parquet      33.1 MB
```

여기서는 `scan_csv` 가 아니라 `read_csv` 를 씁니다. 옮겨 적으려면 어차피 파일 전체가 필요합니다.

같은 5백만 줄이 33.1MB가 됐습니다. 5분의 1 남짓입니다. 이제 읽는 쪽만 `scan_csv` 에서 `scan_parquet` 으로 바꿉니다.

```python
import polars as pl

질문 = (
    pl.scan_parquet("sales.parquet")
    .filter(pl.col("region") == "서울")
    .select(pl.col("qty").sum())
)

print(질문.collect().item())
```

```text
5247597
```

0.4초에 68MB입니다. 파일 형식만 바꿨는데 메모리가 320MB에서 68MB로 떨어졌습니다. Polars가 세운 계획은 그대로인데 이번에는 그 계획대로 두 덩어리만 실제로 디스크에서 꺼내 왔기 때문입니다.

68MB까지 왔습니다. 그런데 이 68MB는 여전히 파이썬이 자기 메모리 안에 표를 만들어 들고 있는 값입니다. 답으로 필요한 것은 숫자 하나뿐입니다.

## DuckDB로 파일에 SQL을 바로 던지기

DuckDB는 데이터프레임 라이브러리가 아니라 분석용 데이터베이스입니다. 서버를 띄우지 않고 파이썬 안에서 그대로 도는 종류입니다. 계정도 접속 주소도 없습니다.

DuckDB에게는 파일 이름을 SQL 안에 그대로 적습니다.

```python
import duckdb

print(duckdb.sql("""
    SELECT sum(qty)
    FROM 'sales.parquet'
    WHERE region = '서울'
""").fetchone()[0])
```

```text
5247597
```

0.13초에 47MB입니다. `import` 를 뺀 코드 전체가 SQL 한 문장입니다.

`FROM 'sales.parquet'` 을 봅니다. 파일을 파이썬 변수로 먼저 읽는 단계가 없습니다. DuckDB가 그 파일을 직접 열어서 필요한 부분만 읽고, 파이썬에게는 계산이 끝난 숫자 하나만 돌려줍니다. 앞의 네 방법은 전부 표를 파이썬 메모리에 만들어 놓고 그 표에서 답을 뽑았습니다.

47MB 가운데 표가 차지한 몫은 거의 없습니다. 같은 파이썬에서 `import duckdb` 만 하고 재면 이미 38MB이고, 질문에 답하느라 더 쓴 자리는 9MB뿐입니다.

SQL이 짧은 것은 이 질문이 쉬워서만이 아닙니다. 지역별 순위처럼 계산 위에 계산을 얹는 자리에서 차이가 더 벌어집니다. 지역별 매출과 순위를 같이 구해 봅니다.

```python
import duckdb

print(duckdb.sql("""
    SELECT
        region,
        sum(qty * price) AS 매출,
        rank() OVER (ORDER BY sum(qty * price) DESC) AS 순위
    FROM 'sales.parquet'
    GROUP BY region
    ORDER BY 순위
    LIMIT 5
"""))
```

```text
┌─────────┬──────────────┬───────┐
│ region  │     매출     │ 순위  │
│ varchar │    int128    │ int64 │
├─────────┼──────────────┼───────┤
│ 울산    │ 239225881863 │     1 │
│ 인천    │ 239168737161 │     2 │
│ 강원    │ 239044035351 │     3 │
│ 서울    │ 238975691737 │     4 │
│ 대구    │ 238762180448 │     5 │
└─────────┴──────────────┴───────┘
```

아래 칸에서는 CSV를 만들고 Parquet으로 바꿔 크기를 비교한 뒤 그 Parquet에 SQL을 던집니다. 브라우저 안에서 그대로 돕니다.

https://eddmpython.com/codaro/run/?example=df-duckdb-parquet

DuckDB를 처음부터 익히려면 [Codaro의 DuckDB 입문 과정](https://eddmpython.com/codaro/learn/lesson/duckdb/00_DuckDB%EC%86%8C%EA%B0%9C/)에 열두 개 레슨이 있습니다.

여기까지 다섯 가지가 전부 `5247597` 을 돌려줬습니다.

| 방법 | 시간 | 최대 메모리 |
|---|---|---|
| pandas + CSV | 4.1초 | 560MB |
| pandas + CSV, `usecols` 지정 | 2.7초 | 269MB |
| Polars `scan_csv` | 0.5초 | 320MB |
| Polars `scan_parquet` | 0.4초 | 68MB |
| DuckDB + Parquet | 0.13초 | 47MB |

같은 답인데 시간은 서른 배 남짓, 메모리는 열두 배 차이입니다. 그러면 이제 하나를 골라서 나머지를 버려야 할 것 같은데, 실제로는 그럴 필요가 없습니다.

## 셋은 같은 몸을 나눠 쓴다

### 파일을 거치지 않고 표를 넘기기

![매끈한 판 하나를 가운데 두고 생김새가 서로 다른 공구 세 개가 각각 다른 방향에서 그 판의 같은 면에 닿아 있는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/69/69f86a5f36d0171f7a1c4cff45560283c7afb9133269c10e30abac524ab8c905.webp "표는 하나이고 그것을 잡는 손이 셋입니다")

Polars로 만든 표를 DuckDB에게 물어보겠습니다. 파일로 저장했다가 다시 읽는 단계는 없습니다.

```python
import polars as pl
import duckdb

판매 = pl.read_parquet("sales.parquet")

합계 = duckdb.sql("""
    SELECT region, sum(qty * price) AS 매출
    FROM 판매
    GROUP BY region
    ORDER BY 매출 DESC
    LIMIT 3
""")

print(합계.pl())
```

```text
shape: (3, 2)
┌────────┬───────────────┐
│ region ┆ 매출          │
│ ---    ┆ ---           │
│ str    ┆ decimal[38,0] │
╞════════╪═══════════════╡
│ 울산   ┆ 239225881863  │
│ 인천   ┆ 239168737161  │
│ 강원   ┆ 239044035351  │
└────────┴───────────────┘
```

결과에 붙은 타입 이름이 앞의 DuckDB 출력에서 본 `int128` 과 달리 `decimal[38,0]` 으로 나오는데 값은 같습니다. 자릿수를 잃지 않으려고 넉넉한 십진 타입으로 받는 것입니다.

`FROM 판매` 를 봅니다. `판매` 는 파이썬 변수 이름입니다. DuckDB가 SQL 안에서 파이썬 변수를 찾아 표처럼 읽었습니다.

마지막의 `.pl()` 은 결과를 Polars 표로 받겠다는 뜻이고, `.df()` 로 바꾸면 pandas 표로 받습니다.

SQL 안에서 파이썬 변수를 표로 읽을 수 있는 이유는 Polars와 DuckDB가 메모리에 데이터를 담는 방식을 맞춰 두었기 때문입니다. 그 방식의 이름이 Apache Arrow입니다. Arrow는 라이브러리라기보다 약속에 가깝습니다. 표 하나를 메모리의 어느 자리에 어떤 순서로 늘어놓을지 정해 놓은 규격이고, 둘 다 그 규격으로 주고받습니다.

얼마나 그대로 넘어가는지는 열의 종류에 따라 다릅니다. 200만 줄짜리 표를 만들어 넘겨 보면 이렇게 갈립니다.

| 표의 열 | 표 크기 | 넘길 때 늘어난 메모리 |
|---|---|---|
| 정수 두 열 | 31MB | 0MB |
| 문자열 두 열 | 21MB | 53MB |

숫자는 Arrow가 정한 모양 그대로 이미 놓여 있어서 가리키기만 하면 됩니다. 문자열은 Polars가 안에서 자기만의 방식으로 들고 있다가 넘길 때 Arrow 모양으로 다시 늘어놓습니다. 그래서 문자열이 많은 표는 넘길 때 그만큼 자리를 더 씁니다.

그래도 파일로 저장했다가 다시 읽는 것보다는 훨씬 쌉니다. 그 길은 표를 전부 글자로 바꿔 디스크에 쓰고 다시 읽어 들이는 일이라 시간과 자리를 양쪽에서 씁니다.

pandas도 이 규격 쪽으로 한 발 옮겼습니다. 앞의 pandas 절에서 문자열이 메모리를 많이 쓴다고 했는데, 그것을 어느 규격으로 담는지가 pandas 3.0부터 바뀌었습니다.

```python
import pandas as pd

s = pd.Series(["가", "나"])
print(s.dtype)
print(type(s.array).__name__)
```

```text
str
ArrowStringArray
```

`object` 가 아니라 `str` 이 나오고 그 속이 `ArrowStringArray` 입니다. pandas 3.0의 문자열은 Arrow 규격 위에 올라가 있습니다. 다만 숫자 열은 아직 예전 방식 그대로라 pandas 표를 넘길 때는 옮겨 적는 양이 Polars 쪽보다 많습니다. 앞의 5백만 줄 표로 재면 Polars에서 넘길 때 690MB, pandas에서 넘길 때 1571MB가 최대치였습니다.

넘기는 것 자체는 똑같이 됩니다.

```python
import pandas as pd
import duckdb

표 = pd.read_parquet("sales.parquet")
print(duckdb.sql("SELECT count(*) FROM 표").fetchone()[0])
```

```text
5000000
```

`FROM 표` 가 그대로 통했습니다. 앞의 `FROM 판매` 와 같은 자리에 pandas 표를 놓은 것뿐입니다. 어느 표를 쓰든 SQL은 고치지 않습니다.

아래 칸에서 Polars 표를 DuckDB로 넘기고 결과를 다시 Polars와 pandas로 받아 봅니다.

https://eddmpython.com/codaro/run/?example=df-arrow-handoff

가리키기만 한다는 것은 가리킬 표가 한 대의 메모리에 올라가 있어야 한다는 뜻이기도 합니다.

여기까지면 한 대의 컴퓨터에서 쓰는 데 충분합니다. 아래부터는 그 한 대를 넘어갈 때 봅니다.

## 한 대로 안 될 때 쓰는 파이썬 데이터프레임 라이브러리

지금까지 본 셋은 전부 한 대 안에서 돕니다. 데이터가 그 한 대의 디스크나 메모리를 넘어가면 다른 도구가 필요합니다. 한 대로 되는 동안은 아래 어느 것도 필요 없습니다. 이름과 조건만 훑고 지나가도 됩니다.

| 이름 | 무엇인가 | 언제 고르나 |
|---|---|---|
| Dask | 큰 표를 조각으로 나눠 여러 코어와 여러 대에 흩어 돌리는 라이브러리 | pandas 코드가 이미 많고 그 코드를 거의 그대로 여러 대로 넓히고 싶을 때 |
| Modin | `import modin.pandas as pd` 한 줄로 pandas를 Ray나 Dask 위에서 돌리는 라이브러리 | 코드를 고치지 않고 코어를 더 쓰고 싶을 때 |
| PySpark | pandas 비슷한 표(`pyspark.pandas`)를 주는 Spark 클러스터용 파이썬 API | 회사에 이미 Spark 클러스터가 있을 때 |
| cuDF | NVIDIA GPU에서 도는 데이터프레임 | GPU가 있고 데이터가 GPU 메모리에 들어갈 때 |
| Ibis | 같은 파이썬 코드를 DuckDB, BigQuery, Spark 같은 여러 엔진으로 번역해 보내는 도구 | 개발은 노트북 DuckDB로 하고 운영은 창고 데이터베이스로 보낼 때 |
| Daft | 열에 이미지와 오디오가 들어가는 표를 다루는 분산 엔진 | 표 안에 파일이 들어 있을 때 |
| Vaex | 파일을 메모리에 올리지 않고 그 자리에서 들여다보는 탐색용 데이터프레임 | 아주 큰 파일을 훑어보며 그림을 그릴 때 |

한 대에서 DuckDB로 Parquet을 읽다가 정말 안 될 때 이 가운데 하나로 옮겨 갑니다. PySpark와 cuDF는 클러스터와 GPU가 먼저 있어야 하고, 나머지는 노트북에서도 돌지만 그만큼 손이 더 갑니다.


## 무엇으로 시작하나

받은 파일이 몇 MB이고 답이 몇 초 안에 나온다면 pandas를 그대로 씁니다. 자료가 가장 많고 남이 읽기도 쉽습니다.

기다리는 시간이 눈에 걸리기 시작하면 순서는 둘입니다. 먼저 파일을 Parquet으로 저장하고 읽는 쪽도 `pl.scan_parquet` 으로 바꿉니다. 둘을 같이 바꿔야 앞에서 본 320MB에서 68MB가 나옵니다. 읽는 쪽을 pandas에 그대로 두면 파일만 바꿔서는 그 숫자가 나오지 않습니다.

그래도 모자라면 물어보는 방식을 바꿉니다. 표를 만들어 놓고 계산하는 게 아니라, DuckDB에게 파일을 주고 답만 받습니다.

지금 확인해 봅니다. 갖고 있는 CSV 하나를 골라 아래 코드의 `내파일` 을 전부 그 파일 이름으로 바꾼 뒤 실행합니다.

```python
import polars as pl
import duckdb
import os

원본 = pl.read_csv("내파일.csv")
원본.write_parquet("내파일.parquet")

for 이름 in ("내파일.csv", "내파일.parquet"):
    print(f"{이름:24} {os.path.getsize(이름):>12,} 바이트")

바뀐줄수 = duckdb.sql("SELECT count(*) FROM '내파일.parquet'").fetchone()[0]
print(f"원본 줄 수    {원본.height:>12,}")
print(f"Parquet 줄 수 {바뀐줄수:>12,}")
```

Parquet 쪽 바이트가 CSV보다 작고 아래 두 줄 수가 같으면 제대로 바뀐 것입니다. 백 줄 안팎의 아주 짧은 파일이면 Parquet이 더 클 수도 있습니다. 그 크기에서는 어느 쪽이든 기다릴 일이 없습니다.

엑셀에서 저장한 한국어 CSV라면 첫 줄에서 이렇게 멈춥니다.

```text
ComputeError: invalid utf-8 sequence
```

엑셀은 한글을 UTF-8이 아니라 `cp949` 로 저장합니다. 읽는 줄에 그 이름을 적어 주면 지나갑니다. 위 코드의 `원본 = pl.read_csv(...)` 줄을 아래 줄로 바꿉니다.

```python
import polars as pl

원본 = pl.read_csv("내파일.csv", encoding="cp949")
원본.write_parquet("내파일.parquet")
```

## 더 해 볼 것

- 파일 하나가 아니라 폴더 전체를 한 번에 읽습니다. `duckdb.sql("SELECT * FROM 'data/*.parquet'")` 처럼 별표를 쓰면 여러 파일을 표 하나로 봅니다.
- Polars의 `sink_parquet` 은 결과를 메모리에 모으지 않고 파일로 바로 흘려보냅니다. 결과 자체가 메모리보다 클 때 씁니다.
- DuckDB에서 만든 표를 `.to_arrow_table()` 로 받으면 PyArrow Table이 됩니다. 다른 언어나 도구로 넘길 때 손실이 가장 적습니다. 이름이 비슷한 `.arrow()` 는 Table이 아니라 `RecordBatchReader` 를 돌려줍니다.
- 내 파일에서도 같은 것을 재려면 시간은 `time.perf_counter` 로 감싸고 메모리는 `psutil.Process().memory_info().peak_wset` 으로 봅니다. 이 글의 메모리 숫자가 그 값입니다.
- pandas 2에서 쓰던 코드를 3.0으로 옮길 때는 [pandas 3.0 마이그레이션 문서](https://pandas.pydata.org/docs/dev/whatsnew/v3.0.0.html)를 먼저 봅니다. `SettingWithCopyWarning` 을 보던 자리의 동작이 달라졌습니다.
