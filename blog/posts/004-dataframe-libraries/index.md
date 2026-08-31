---
title: 파이썬 데이터프레임 라이브러리 여섯 가지, 엑셀이 못 여는 표부터
slug: dataframe-libraries
author: eddmpython
section: 파이썬 데이터
summary: 엑셀은 1,048,576줄에서 멈춥니다. 그 위의 표를 다루는 파이썬 데이터프레임 라이브러리 여섯 가지를 하나씩 소개합니다. pandas, Polars, DuckDB, PyArrow, Dask, Ibis 순서이고 뒤로 갈수록 앞 것이 못 하던 일을 합니다. 5백만 줄 160MB 파일에 같은 질문을 던져 시간과 메모리를 직접 쟀습니다.
readerQuestion: 엑셀로 안 열리는 표를 파이썬으로 다루려는데 라이브러리가 여럿이다. 무엇부터 쓰고 언제 다른 것으로 옮기나?
readerTakeaway: pandas로 시작하고, 기다리는 시간이 걸리면 Parquet과 Polars로 옮기고, 답만 필요하면 DuckDB에 파일을 통째로 물어본다. 나머지 셋은 한 대를 넘어가거나 엔진을 갈아탈 때 꺼낸다.
readerLevel: working
readerStartingPoint: 엑셀은 쓸 줄 알고 pandas로 read_csv와 groupby는 해 봤지만 Polars와 DuckDB는 이름만 들어봤고 Parquet이 무엇인지 모른다.
primaryKeyword: 파이썬 데이터프레임 라이브러리
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef0ebfa270d6567d90fdd3f14576e1e77a58d17226e7739bed8043f20def0469.webp
ogImageAlt: 어두운 책상 위에 두꺼운 종이 뭉치가 쌓여 있고 그 옆면에서 얇은 종이 띠 두 장만 뽑혀 나와 밝게 놓인 장면
ogImageWidth: 1216
ogImageHeight: 832
ogImageType: image/webp
---

거래 기록을 CSV로 내려받았더니 5백만 줄에 160MB입니다. 엑셀로 열면 1,048,576줄에서 잘립니다. 뒤쪽 4백만 줄은 파일 안에 있는데 화면에 올라오지 않습니다.

그래서 이 표는 엑셀 밖에서 다뤄야 합니다. 그런데 파이썬 데이터프레임 라이브러리는 하나가 아니라 여럿입니다. 이 글은 그중 여섯 가지를 절마다 하나씩 소개합니다. 순서는 pandas, Polars, DuckDB, PyArrow, Dask, Ibis이고, 뒤로 갈수록 앞 것이 못 하던 일을 맡습니다. 끝까지 읽으면 같은 질문 하나를 다섯 방식으로 푸는 코드와, 그 다섯이 표를 주고받는 규격 하나가 손에 남습니다.

아래 숫자는 전부 한 대의 노트북에서 직접 잰 것입니다. AMD Ryzen 7 8845HS, 논리 코어 16개, 메모리 31GB의 윈도우 노트북이고, 방법마다 파이썬을 새로 띄워 일곱 번씩 재서 가운데 값을 적었습니다. **시간은 `import` 를 마친 뒤부터 답이 나올 때까지이고, 메모리는 그 파이썬이 잡은 최대치입니다.** 재는 코드는 아래 `내 파일에서 직접 재기` 에 그대로 있습니다.

![어두운 책상 위에 두꺼운 종이 뭉치가 쌓여 있고 그 옆면에서 얇은 종이 띠 두 장만 뽑혀 나와 밝게 놓인 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/ef0ebfa270d6567d90fdd3f14576e1e77a58d17226e7739bed8043f20def0469.webp "다섯 열이 쌓여 있는데 답에 필요한 것은 두 열입니다")

## pandas로 엑셀 파일과 5백만 줄 열기

먼저 여섯 가지 전부와 이 글에서 쓰는 도구를 한 번에 설치합니다.

```powershell
python -m pip install pandas polars duckdb pyarrow "dask[dataframe]" "ibis-framework[duckdb]" openpyxl fastexcel psutil
```

`Successfully installed` 로 시작하는 줄이 나오면 됩니다. 이 글의 숫자는 pandas 3.0.5, Polars 1.44.1, DuckDB 1.5.5, PyArrow 25.0.1, Dask 2026.8.0, Ibis 12.0.0에서 잰 것입니다.

**빈 폴더를 하나 만들고 그 안에서 작업합니다.** 앞으로 나오는 파이썬 코드는 전부 그 폴더에 `.py` 파일로 저장해 `python 파일이름.py` 로 돌립니다. 만들어지는 파일도 전부 그 폴더에 모입니다.

연습용 파일을 먼저 만듭니다. 회사 파일을 그대로 쓰면 열 이름이 달라 아래 코드가 안 돌아갑니다. 아래를 `make_sales.py` 로 저장합니다.

```python
import csv
import random

import pandas as pd

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

pd.read_csv("sales.csv", nrows=1000).to_excel("sales_small.xlsx", index=False)
```

그 폴더에서 터미널을 열고 실행합니다. 17초쯤 걸립니다.

```powershell
python make_sales.py
```

파일이 둘 생깁니다. `sales.csv` 는 `date`, `region`, `item`, `qty`, `price` 다섯 열에 5백만 줄이고 159.5MB입니다. `sales_small.xlsx` 는 그 앞 천 줄만 담은 엑셀 파일이고, 엑셀로 열리는 쪽과 안 열리는 쪽을 나란히 두려고 함께 만들었습니다. 값은 무작위입니다.

엑셀 시트 한 장은 1,048,576줄이 최대입니다. 5백만 줄은 그 다섯 배에 가깝습니다. 파이썬으로 그 한계를 넘겨 저장하려 해도 `ValueError: This sheet is too large!` 로 거부당합니다.

백사만 줄 안에 들어오는 파일이라면 pandas가 엑셀을 그대로 엽니다. `read_excel` 에 파일 이름만 주면 되고, `.xlsx` 를 읽는 일은 방금 함께 받은 `openpyxl` 이 맡습니다.

```python
import pandas as pd

표 = pd.read_excel("sales_small.xlsx")
print(표.shape)
print(표.columns.tolist())
```

```text
(1000, 5)
['date', 'region', 'item', 'qty', 'price']
```

`(1000, 5)` 는 천 줄 다섯 열이라는 뜻입니다. 엑셀에서 보던 그 표가 그대로 파이썬 변수 하나에 들어왔습니다.

이제 잘려서 못 보던 5백만 줄 쪽으로 갑니다. 물어볼 것은 하나입니다. 서울에서 팔린 수량이 전부 몇 개일까요?

```python
import pandas as pd

df = pd.read_csv("sales.csv")
서울 = df[df["region"] == "서울"]
print(서울["qty"].sum())
```

```text
5247597
```

답은 나왔습니다. 이 코드에 시간과 메모리를 함께 재면 3.72초에 최대 533MB가 나옵니다. 재는 코드는 아래 `내 파일에서 직접 재기` 의 `measure.py` 에 있습니다.

160MB짜리 파일 하나를 읽는 데 메모리는 그 세 배가 듭니다. 표가 파일보다 큰 것은 CSV가 전부 글자이기 때문입니다. 파일에서 글자로 이어져 있던 값이 메모리에서는 열마다 정해진 크기의 자리를 새로 잡습니다. `40000` 은 글자 다섯 개였다가 8바이트를 쓰는 숫자 하나가 됩니다.

물어본 것은 `region` 과 `qty` 두 열뿐인데 파일에 있는 다섯 열이 전부 메모리에 올라갔습니다. 여기서 pandas에게 읽을 열을 미리 알려 줄 수 있습니다. `usecols` 에 필요한 열 이름을 적으면 됩니다.

```python
import pandas as pd

df = pd.read_csv("sales.csv", usecols=["region", "qty"])
print(df[df["region"] == "서울"]["qty"].sum())
```

```text
5247597
```

1.86초에 270MB로 줄었습니다. 시간이 절반, 메모리도 절반입니다.

아래 칸은 브라우저 안에서 그대로 도는 파이썬입니다. pandas 표가 메모리를 얼마나 차지하는지 줄 수를 바꿔 가며 눌러 봅니다.

https://eddmpython.com/codaro/run/?example=df-pandas-memory

pandas는 엑셀 파일과 5백만 줄 CSV를 같은 방식으로 열어 줬고, `usecols` 를 적으면 메모리도 절반이 됐습니다. 그런데 그 열 이름은 내가 알아내서 손으로 적은 것입니다. 질문이 바뀌면 `usecols` 도 같이 고쳐야 하고, 고치는 것을 잊으면 조용히 다시 느려집니다.

## Polars는 질문을 읽고 필요한 열만 올린다

![세로로 빽빽하게 꽂힌 얇은 판 다섯 줄 가운데 두 줄만 위로 뽑혀 나와 있고 나머지 세 줄은 꽂힌 자리에 그대로 있는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/15/159e3259346a2f8fed48fd874fe2a479214a12f3a3d40ea6645308d505f199ad.webp "질문에 쓰인 열만 파일에서 올라옵니다")

`region` 과 `qty` 만 필요하다는 사실은 이미 pandas 코드 아래쪽에 적혀 있었습니다. `df[df["region"] == "서울"]["qty"]` 가 그 문장입니다. 문제는 `read_csv` 가 그 줄이 실행되기 한참 전에 파일을 다 읽어 버린다는 것입니다.

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

0.18초에 334MB입니다. `usecols` 를 손으로 적은 pandas보다 열 배 빠릅니다.

`scan_csv` 와 `read_csv` 는 여기서 갈립니다. `read_csv` 는 그 줄에서 파일을 읽습니다. `scan_csv` 는 읽겠다는 계획만 세우고 넘어갑니다. 그래서 `질문` 에는 아직 데이터가 없습니다. 뒤에 붙은 `filter` 와 `select` 도 실행되지 않고 계획에 항목으로 쌓입니다. 마지막 `collect()` 를 부르는 순간 Polars는 쌓인 계획 전체를 한 번에 보고, 그제야 파일을 엽니다.

계획을 전부 본 뒤에 파일을 열기 때문에 Polars는 `usecols` 에 손으로 적던 것을 스스로 알아냅니다. `질문.explain()` 을 찍으면 세운 계획이 그대로 나옵니다.

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

가운데의 `Csv SCAN` 이 파일을 여는 단계이고, 그 아래 두 줄이 파일을 열면서 함께 하는 일입니다. `PROJECT 2/5 COLUMNS` 가 다섯 열 중 두 열만 표에 올리겠다는 뜻입니다. 열 이름은 어디에도 적지 않았습니다. `filter` 가 `region` 을 쓰고 `select` 가 `qty` 를 쓴다는 사실에서 Polars가 직접 뽑아냈습니다. `SELECTION` 은 서울만 남기는 조건을 파일을 읽는 단계까지 내려보냈다는 뜻이고, 그래서 서울이 아닌 줄은 표에 올라오지도 않습니다.

계획을 Polars가 세우기 때문에 질문을 바꾸면 계획도 따라 바뀝니다. `select` 에 `price` 를 하나 더 넣고 다시 찍으면 `PROJECT 3/5 COLUMNS` 가 됩니다. 고칠 곳은 질문 한 군데뿐입니다.

그런데 빨라진 것은 시간뿐입니다. 메모리는 `usecols` 를 적은 pandas가 270MB였는데 Polars는 334MB로 오히려 더 씁니다. CSV가 줄 단위로 적혀 있기 때문입니다. 두 열만 쓰겠다고 정해도 그 두 열이 줄마다 흩어져 있어서, 나머지 세 열을 건너뛰려면 결국 모든 줄을 한 글자씩 훑어야 합니다. Polars는 그 일을 코어 열여섯 개에 나눠 맡깁니다. 그래서 빠른 대신 읽는 동안 차지하는 자리가 더 넓습니다.

계획은 표에 올릴 열만 줄였지 디스크에서 읽는 양은 줄이지 못한 것입니다. 파일이 CSV라서 생기는 한계입니다. 그러면 파일 형식을 바꿔 봅니다.

CSV는 줄 단위로 저장합니다. 한 줄 안에 다섯 열의 값이 쉼표로 이어져 있고 다음 줄에 또 다섯 열이 있습니다. Parquet은 열 단위로 저장합니다. `region` 값 5백만 개가 한 덩어리로 모여 있고 `qty` 값 5백만 개가 또 한 덩어리로 모여 있습니다. 두 열만 필요하면 그 두 덩어리만 집어 오고 나머지 세 덩어리는 건드리지 않습니다. 한 덩어리 안의 값은 종류가 같아서 압축도 훨씬 잘 됩니다.

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

0.016초에 68MB입니다. 파일 형식만 바꿨는데 334MB이던 메모리가 여기까지 떨어졌습니다. Polars가 세운 계획은 그대로인데 이번에는 그 계획대로 두 덩어리만 실제로 디스크에서 꺼내 왔기 때문입니다.

파일만 Parquet으로 바꾸고 읽는 쪽을 pandas에 두면 `pd.read_parquet("sales.parquet", columns=["region", "qty"])` 로 0.18초에 359MB입니다. 시간도 열 배 넘게 걸리고 메모리는 다섯 배입니다. 두 덩어리만 꺼내 오는 것과 그것을 파이썬 표로 만들어 들고 있는 것은 다른 일이기 때문입니다.

파일을 바로 읽지 않고 계획만 쌓는 이 방식은 내 컴퓨터에서만 볼 수 있습니다. 브라우저에 실린 Polars에는 `scan_csv` 와 `explain` 이 없기 때문입니다. 대신 아래 칸에서는 `filter` 와 `group_by` 를 눌러 가며 Polars 문법을 손에 익힙니다.

https://eddmpython.com/codaro/run/?example=df-polars-group

Polars는 질문을 먼저 읽어 필요한 두 열만 가져왔고 68MB까지 내려왔습니다. 그런데 68MB는 여전히 파이썬이 자기 메모리 안에 표를 만들어 들고 있는 값입니다. 답으로 필요한 것은 숫자 하나뿐입니다.

## DuckDB에 파일을 그대로 물어보기

DuckDB는 데이터프레임 라이브러리가 아니라 분석용 데이터베이스입니다. 서버를 따로 띄우지 않고 파이썬 안에서 바로 돕니다. 그래서 계정도 접속 주소도 필요 없습니다. pandas, Polars와 나란히 놓는 이유는 같은 질문에 답할 때 셋을 실제로 맞바꿔 쓰기 때문입니다.

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

0.013초에 48MB입니다. `import` 를 뺀 코드 전체가 SQL 한 문장입니다.

`FROM 'sales.parquet'` 을 봅니다. 파일을 파이썬 변수로 먼저 읽는 단계가 없습니다. DuckDB가 그 파일을 직접 열어서 필요한 부분만 읽고, 파이썬에게는 계산이 끝난 숫자 하나만 돌려줍니다. pandas와 Polars는 표를 파이썬 메모리에 만들어 놓고 그 표에서 답을 뽑았는데, DuckDB는 그 단계를 통째로 건너뛴 것입니다.

48MB 가운데 표가 차지한 몫은 거의 없습니다. 같은 파이썬에서 `import duckdb` 만 하고 재면 이미 38MB이고, 질문에 답하느라 더 쓴 자리는 10MB뿐입니다.

SQL이 짧은 것은 이 질문이 쉬워서만이 아닙니다. 집계 위에 순위를 얹는 질문도 SQL 한 문장 안에 그대로 들어갑니다.

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

값은 무작위로 만든 것이라 지역별 매출이 거의 붙어 있습니다. 볼 것은 `rank() OVER (...)` 한 줄로 순위 열이 붙었다는 사실입니다.

아래 칸에서는 CSV를 만들고 Parquet으로 바꿔 크기를 비교한 뒤 그 Parquet에 SQL을 던집니다.

https://eddmpython.com/codaro/run/?example=df-duckdb-parquet

DuckDB는 파일을 파이썬으로 들어 올리지 않고 48MB로 답을 줬습니다. 그런데 돌려받은 것은 숫자 하나입니다. 그 답을 파이썬 표로 이어서 다루려면 라이브러리끼리 표를 주고받아야 합니다. 표를 메모리에 늘어놓는 방식이 서로 다르면 넘길 때마다 사본을 통째로 새로 만들게 됩니다.

## PyArrow, 표를 파일 없이 넘기는 규격

![매끈한 판 하나를 가운데 두고 생김새가 서로 다른 공구 세 개가 각각 다른 방향에서 그 판의 같은 면에 닿아 있는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/69/69f86a5f36d0171f7a1c4cff45560283c7afb9133269c10e30abac524ab8c905.webp "표는 하나이고 그것을 잡는 손이 셋입니다")

PyArrow는 pandas, Polars, DuckDB와 성격이 다릅니다. 표를 계산해 주는 도구가 아니라 표를 메모리 어느 자리에 어떤 순서로 늘어놓을지 정해 놓은 규격입니다. 그 규격의 이름이 Apache Arrow입니다. 직접 부를 일은 적지만 셋이 이 규격으로 표를 주고받습니다. 정말 깔려서 도는지는 `import pyarrow; print(pyarrow.__version__)` 한 줄로 확인합니다.

규격을 맞춰 두면 무슨 일이 되는지 보겠습니다. Polars로 만든 표를 DuckDB에게 물어봅니다. 파일로 저장했다가 다시 읽는 단계는 없습니다.

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

`FROM 판매` 를 봅니다. `판매` 는 파이썬 변수 이름입니다. DuckDB가 SQL 안에서 파이썬 변수를 찾아 표처럼 읽었습니다. 마지막의 `.pl()` 은 결과를 Polars 표로 받겠다는 뜻이고 `.df()` 로 바꾸면 pandas 표로 받습니다. `판매` 자리에 pandas 표를 놓아도 SQL은 한 글자도 고치지 않습니다.

공짜는 아닙니다. `pl.read_parquet` 으로 5백만 줄 표를 통째로 올린 직후에 파이썬이 잡은 자리는 최대 453MB였는데, 그 표를 DuckDB에 넘기고 나자 700MB로 올라갔습니다. 그래도 파일로 저장했다가 다시 읽는 길에는 디스크에 한 번 쓰고 다시 읽는 시간이 통째로 더 붙습니다.

아래 칸에서 Polars 표를 DuckDB로 넘기고 결과를 다시 Polars와 pandas로 받아 봅니다.

https://eddmpython.com/codaro/run/?example=df-arrow-handoff

PyArrow 덕분에 pandas와 Polars와 DuckDB가 표 하나를 같이 봤습니다. 그런데 표를 그대로 가리키려면 가리킬 표가 한 대의 메모리에 통째로 올라가 있어야 합니다. 여기까지가 한 대의 노트북에서 쓰는 조합이고, 그 전제가 깨지는 자리부터 도구가 바뀝니다.

## Dask는 메모리보다 큰 표를 맡는다

Dask는 큰 표를 조각으로 잘라 여러 코어에 나눠 맡깁니다. 조각 하나하나가 pandas 표이고, 그래서 쓰는 문법도 pandas와 거의 같습니다. 달라지는 것은 두 군데입니다. `pd` 대신 `dd` 를 부르고, 답이 필요한 자리에서 `compute()` 를 붙입니다.

```python
import dask.dataframe as dd

df = dd.read_csv("sales.csv", blocksize="32MB")
print("조각 수", df.npartitions)
print(df[df["region"] == "서울"]["qty"].sum().compute())
```

```text
조각 수 5
5247597
```

`blocksize="32MB"` 가 파일을 32MB씩 잘라 읽으라는 뜻이고, 159.5MB짜리 파일이 조각 다섯 개가 됐습니다. `compute()` 를 부르기 전까지는 Polars의 `collect()` 와 마찬가지로 계획만 쌓입니다.

같은 답이 나왔습니다. 그런데 2.12초에 729MB를 썼습니다. 조각으로 나눴는데 pandas로 통째로 읽은 533MB보다 오히려 많습니다. 조각을 여러 개 동시에 처리하느라 여러 조각이 한꺼번에 메모리에 올라와 있고, 조각마다 pandas를 따로 돌리는 비용도 붙기 때문입니다.

**그러니까 이 크기에서 Dask는 쓰지 않습니다.** 이 글의 파일은 160MB이고 노트북 메모리는 31GB이니 Dask가 값을 하는 조건이 아닙니다. 위의 2.12초와 729MB는 Dask에게 불리한 자리에서 잰 숫자입니다.

파일이 메모리보다 크면 이야기가 뒤집힙니다. 그 자리에서는 pandas가 아예 못 읽거나 디스크로 넘어가는데 Dask는 조각 하나씩만 올려서 끝까지 돌립니다.

Dask는 pandas 코드를 거의 그대로 두고 메모리보다 큰 표까지 끌고 갑니다. 그런데 지금 쓴 `dd.read_csv` 와 `compute()` 는 Dask에만 있는 이름입니다. 나중에 이 계산을 회사 데이터베이스로 옮기기로 하면 질문을 처음부터 다시 씁니다.

## Ibis로 같은 코드를 다른 엔진에 보내기

Ibis는 계산을 스스로 하지 않습니다. 파이썬으로 쓴 질문을 받아서 뒤에 붙은 엔진의 SQL로 번역해 보내고 결과만 받아 옵니다. 앞에서 설치할 때 `ibis-framework[duckdb]` 라고 적은 대괄호 안이 그 엔진입니다.

먼저 DuckDB를 뒤에 붙이고 같은 질문을 던져 봅니다.

```python
import ibis

t = ibis.read_parquet("sales.parquet")
질문 = t.filter(t.region == "서울").agg(수량=t.qty.sum())
print(질문.to_pandas().iloc[0, 0])
```

```text
5247597
```

0.88초에 141MB입니다. DuckDB에 직접 물어본 0.013초보다 느린데, 파이썬 질문을 SQL로 번역하는 값이 여기에 들어 있습니다.

번역한 결과는 눈으로 볼 수 있습니다. `ibis.to_sql` 에 질문을 넣으면 엔진에게 실제로 보내는 SQL이 나옵니다. 월별 매출을 구하는 질문 하나를 DuckDB와 SQLite 양쪽에 태워 봅니다.

SQLite는 파이썬에 처음부터 들어 있어서 `ibis-framework[duckdb]` 만 설치해도 그대로 붙습니다.

```python
import ibis
import pandas as pd

작은 = pd.read_excel("sales_small.xlsx")
작은["date"] = pd.to_datetime(작은["date"])

def 질문(t):
    return (
        t.group_by(월=t.date.month())
        .agg(매출=(t.qty * t.price).sum())
        .order_by(ibis.desc("매출"))
        .limit(3)
    )

for 이름, 연결 in (("DuckDB", ibis.duckdb.connect()), ("SQLite", ibis.sqlite.connect())):
    연결.create_table("판매", 작은)
    t = 연결.table("판매")
    print(f"=== {이름} ===")
    print(ibis.to_sql(질문(t), dialect=이름.lower()))
```

```text
=== DuckDB ===
SELECT
  *
FROM (
  SELECT
    EXTRACT(month FROM "t0"."date") AS "월",
    SUM("t0"."qty" * "t0"."price") AS "매출"
  FROM "판매" AS "t0"
  GROUP BY
    1
) AS "t1"
ORDER BY
  "t1"."매출" DESC
LIMIT 3
=== SQLite ===
    CAST(STRFTIME('%m', "t0"."date") AS INTEGER) AS "월",
```

SQLite 쪽은 이 한 줄만 다르고 나머지는 위와 글자까지 같아서 잘라 붙였습니다. 파이썬에서 쓴 것은 `t.date.month()` 한 번뿐인데, DuckDB에게는 `EXTRACT(month FROM ...)` 으로 SQLite에게는 `CAST(STRFTIME('%m', ...) AS INTEGER)` 로 번역돼 나갔습니다. `질문` 함수는 한 글자도 고치지 않았고 `connect()` 만 바뀌었습니다.

붙일 수 있는 엔진은 스물두 개인데, 나머지는 그 엔진을 따로 설치하고 접속 정보까지 적어야 씁니다. 지금 바로 되는 것은 `duckdb` 와 `sqlite` 입니다.

Ibis는 질문 하나로 여러 엔진을 상대합니다. 대신 그 번역에 0.88초와 141MB가 듭니다.

## 파이썬 데이터프레임 라이브러리 여섯 가지, 무엇을 언제 쓰나

PyArrow를 뺀 다섯 가지가 같은 파일에서 같은 답 `5247597` 을 돌려줬습니다. 아래 표에는 같은 라이브러리라도 읽는 방식이 다르면 줄을 나눠 적었고, PyArrow 행만은 답을 구한 시간이 아니라 Polars 표를 DuckDB에 넘길 때 메모리가 어디까지 올라가는지를 적었습니다.

| 라이브러리 | 이 글에서 시킨 일 | 시간 | 최대 메모리 |
|---|---|---|---|
| pandas | CSV 다섯 열을 전부 읽기 | 3.72초 | 533MB |
| pandas | CSV에서 `usecols` 로 두 열만 | 1.86초 | 270MB |
| pandas | Parquet에서 두 열만 | 0.18초 | 359MB |
| Polars | CSV를 `scan_csv` 로 | 0.18초 | 334MB |
| Polars | Parquet을 `scan_parquet` 으로 | 0.016초 | 68MB |
| DuckDB | Parquet에 SQL 한 문장 | 0.013초 | 48MB |
| PyArrow | 셋 사이에서 표를 넘기는 규격 | 직접 부르지 않음 | 넘길 때 453MB에서 700MB |
| Dask | CSV를 32MB 조각 다섯 개로 | 2.12초 | 729MB |
| Ibis | 질문을 DuckDB SQL로 번역 | 0.88초 | 141MB |

고르는 기준은 셋입니다. 파일이 얼마나 큰가, 표가 필요한가 답만 필요한가, 나중에 다른 엔진으로 옮길 생각인가입니다.

받은 파일이 엑셀로 열리고 답이 몇 초 안에 나온다면 **pandas** 를 그대로 씁니다. 위 표에서 가장 느린 3.72초이지만 `usecols` 한 줄만 더하면 1.86초까지 줄고, 검색하면 나오는 예제도 가장 많습니다. 기다리는 시간이 눈에 걸리기 시작하면 그때 파일을 Parquet으로 저장하고 읽는 쪽도 **Polars** 의 `scan_parquet` 으로 바꿉니다. 둘을 같이 바꿔야 0.016초에 68MB가 나오고, 파일만 바꾸고 읽는 쪽을 pandas에 두면 359MB입니다.

표를 만들 것 없이 답만 필요하면 **DuckDB** 에게 파일을 직접 물어봅니다. 집계 위에 순위를 얹는 질문도 SQL 한 문장에 들어갑니다. 그렇게 pandas와 Polars와 DuckDB를 섞어 쓰기 시작하면 **PyArrow** 는 이미 밑에 깔려서 도는 규격이라, 셋 사이에서 표를 주고받을 생각이라면 함께 설치합니다.

남은 둘은 지금이 아니라 조건이 왔을 때 꺼냅니다. **Dask** 는 파일이 메모리보다 클 때이고, 메모리에 들어가는 동안에는 2.12초에 729MB로 오히려 손해입니다. **Ibis** 는 나중에 회사 데이터베이스로 같은 계산을 보낼 계획일 때 값을 합니다.

### 내 파일에서 직접 재기

시간은 `time.perf_counter` 로 감싸고 메모리는 `psutil` 로 봅니다. 아래를 `measure.py` 로 저장해 돌리면 앞에서 만든 `sales.parquet` 을 그대로 잽니다.

```python
import time

import psutil
import polars as pl

시작 = time.perf_counter()
질문 = (
    pl.scan_parquet("sales.parquet")
    .filter(pl.col("region") == "서울")
    .select(pl.col("qty").sum())
)
답 = 질문.collect().item()
걸린시간 = time.perf_counter() - 시작

정보 = psutil.Process().memory_info()
메모리 = getattr(정보, "peak_wset", 정보.rss)

print(f"답        {답:,}")
print(f"걸린 시간 {걸린시간:.3f}초")
print(f"메모리    {메모리 / 1048576:.0f}MB")
```

```text
답        5,247,597
걸린 시간 0.018초
메모리    68MB
```

마지막에서 두 번째 줄이 갈리는 자리입니다. `peak_wset` 은 윈도우에서만 나오는 최대치라 맥과 리눅스에서는 그 이름이 없습니다. 그래서 `getattr` 로 받고, 없으면 지금 잡고 있는 `rss` 로 내려갑니다. 이 글의 숫자는 전부 윈도우의 `peak_wset` 입니다.

**처음 한 번은 0.1초를 넘기기도 합니다.** 이 글의 표는 같은 것을 일곱 번 재서 가운데 값을 적었습니다. 한 번만 재면 값이 그렇게 흔들리는 것이 정상입니다.

`질문` 부터 `답` 까지를 앞 절에서 쓴 pandas나 DuckDB 코드로 바꾸고 맨 위의 `import polars as pl` 도 그 라이브러리로 바꾸면 그 방법을 잰 숫자가 나옵니다.

### 내 파일로 바꿔 보기

갖고 있는 CSV 하나를 **앞에서 만든 작업 폴더로 복사한 뒤** 아래 코드 첫 줄의 `내파일.csv` 만 그 파일 이름으로 바꿔 실행합니다.

```python
import polars as pl
import duckdb
import os

파일 = "내파일.csv"
바뀐파일 = 파일.replace(".csv", ".parquet")

원본 = pl.read_csv(파일)
원본.write_parquet(바뀐파일)

for 이름 in (파일, 바뀐파일):
    print(f"{이름:24} {os.path.getsize(이름):>12,} 바이트")

바뀐줄수 = duckdb.sql(f"SELECT count(*) FROM '{바뀐파일}'").fetchone()[0]
print(f"원본 줄 수    {원본.height:>12,}")
print(f"Parquet 줄 수 {바뀐줄수:>12,}")
```

Parquet 쪽 바이트가 CSV보다 작고 아래 두 줄 수가 같으면 제대로 바뀐 것입니다. 백 줄 안팎의 아주 짧은 파일이면 Parquet이 더 클 수도 있습니다.

엑셀에서 저장한 한국어 CSV라면 첫 줄에서 이렇게 멈춥니다.

```text
ComputeError: invalid utf-8 sequence
```

엑셀은 한글을 UTF-8이 아니라 `cp949` 로 저장합니다. 읽는 줄에 그 이름을 적어 주면 지나갑니다. 위 코드에서 `원본 = pl.read_csv(파일)` 한 줄만 이렇게 바꿉니다.

```python
원본 = pl.read_csv(파일, encoding="cp949")
```

## 더 해 볼 것

- DuckDB도 엑셀 파일을 읽습니다. `duckdb.sql("INSTALL excel; LOAD excel;")` 을 처음 한 번 하고 나면 `read_xlsx('sales_small.xlsx')` 로 부릅니다. `.xls` 는 안 되고 `.xlsx` 만 됩니다.
- Polars도 엑셀 파일을 읽습니다. `pl.read_excel("sales_small.xlsx")` 이고 앞에서 함께 설치한 `fastexcel` 이 그 일을 맡습니다.
- Dask도 Parquet에서 두 열만 읽으면 0.26초 315MB까지 좁혀집니다. 같은 파일을 Polars로 읽은 0.016초 68MB에는 못 미칩니다.
- 파일 하나가 아니라 폴더 전체를 한 번에 읽습니다. `duckdb.sql("SELECT count(*) FROM '*.parquet'")` 처럼 별표를 쓰면 그 폴더의 여러 파일을 표 하나로 봅니다.
- Polars의 `sink_parquet` 은 결과를 메모리에 모으지 않고 파일로 바로 흘려보냅니다. 결과 자체가 메모리보다 클 때 씁니다.
- Ibis에 붙는 엔진 이름 전체는 `import importlib.metadata as md` 를 먼저 하고 `md.entry_points(group="ibis.backends")` 로 뽑아 봅니다. 붙이려는 엔진을 정했으면 그 이름으로 `ibis-framework[이름]` 을 설치합니다.
- Modin은 `import modin.pandas as pd` 한 줄로 pandas 코드를 병렬화합니다. 다만 0.37.1 기준으로 `pandas<2.4` 를 요구해서, 이 글대로 pandas 3.0.5를 깔았다면 설치하는 순간 pandas가 2.3.3으로 되돌아갑니다. 따로 가상환경을 만들어 시험합니다.
- GPU가 있으면 cuDF, 회사에 Spark 클러스터가 있으면 PySpark가 같은 자리를 맡습니다. 둘 다 GPU와 JVM이 먼저 있어야 해서 `pip install` 한 줄로는 끝나지 않습니다.
- pandas 2에서 쓰던 코드를 3.0으로 옮길 때는 [pandas 3.0 마이그레이션 문서](https://pandas.pydata.org/docs/dev/whatsnew/v3.0.0.html)를 먼저 봅니다. `SettingWithCopyWarning` 을 보던 자리의 동작이 달라졌습니다.
