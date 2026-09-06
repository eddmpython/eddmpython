---
title: CSV와 Parquet, 같은 표를 저장하면 무엇이 달라질까
slug: csv-parquet
author: eddmpython
section: 데이터 파일
summary: CSV와 Parquet에 같은 표를 저장하고 자료형, 파일 크기, 필요한 열을 읽는 방식을 비교합니다. 세 행에서는 CSV가 더 작았던 결과부터 십만 행의 실측까지 확인하고, 브라우저에서 두 파일을 직접 내려받습니다.
readerQuestion: 같은 표를 CSV와 Parquet으로 저장하면 무엇이 달라지고 내 작업에는 어느 형식이 맞을까?
readerTakeaway: CSV는 문자로 내용을 확인하고 주고받기 좋지만 읽을 때 자료형을 정해야 한다. Parquet은 자료형을 담고 열을 골라 읽기 좋으며, 용량과 속도 차이는 실제 데이터로 확인한다.
readerLevel: working
readerStartingPoint: CSV를 열거나 파이썬에서 표를 읽어 봤지만 Parquet의 저장 방식과 자료형 보존, 열 선택 읽기는 모른다.
primaryKeyword: CSV Parquet
searchIntent: comparison
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e3/e3e8457fc24c04b909495bf869259a7330074f5fd3d1b019c90723e0afea8c82.png
ogImageAlt: sample-3.csv와 sample-3.parquet 파일을 보여 주는 설명 이미지
ogImageWidth: 1672
ogImageHeight: 941
ogImageType: image/png
---

https://eddmpython.com/tool/csv-parquet

표를 저장하려는데 예제마다 확장자가 다릅니다. 익숙한 CSV를 쓰면 될지, Parquet으로 바꾸면 무엇이 나아지는지 파일 이름만으로는 알 수 없습니다. 같은 표를 두 형식으로 저장해 보면 선택할 근거가 생깁니다.

이 글을 따라가면 두 파일을 직접 내려받고, 자료형과 용량, 읽을 열을 기준으로 내 작업에 맞는 형식을 고를 수 있습니다. 맨 위 도구에서 `3행`을 고른 뒤 `파일 비교`를 눌러 보세요

## CSV와 Parquet으로 같은 표 저장

### 같은 세 행을 두 형식으로 저장하면 CSV와 Parquet 파일을 하나씩 받습니다

![세 행 예제와 비교 버튼이 보이는 실제 CSV와 Parquet 도구 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c0/c09d7caad365f3d731484fcc1df9e6a6adafbd0fd1f1cc16d73c7acd1b31d3eb.png "세 행 예제와 비교 버튼이 보이는 실제 CSV와 Parquet 도구 화면 · 실제 캡처")

비교할 것은 아래 세 행입니다. `code`는 상품을 구별하는 문자열, `region`은 지역 이름, `qty`는 수량입니다. 코드 `0012`는 수량 12와 다르므로 앞의 0도 남아야 합니다. 실제 판매 기록이 아니라 차이를 확인하려고 만든 실험용 표입니다.

| code | region | qty |
|---|---|---:|
| 0012 | 서울 | 3 |
| 0013 | 부산 | 5 |
| 0014 | 서울 | 2 |

도구는 같은 표를 CSV와 Parquet으로 저장합니다. CSV에는 압축을 쓰지 않고, Parquet에는 Snappy 압축을 씁니다. Snappy는 저장한 내용을 다시 복원할 수 있는 압축 방식입니다. 두 형식을 읽고 쓰는 파이썬 라이브러리인 PyArrow 22.0.0으로 비교 조건을 고정했습니다.

`CSV 내려받기`와 `Parquet 내려받기`를 누르면 `sample-3.csv`와 `sample-3.parquet`을 받습니다. 브라우저의 다운로드 목록에서 두 파일을 확인합니다. 내려받은 파일의 크기는 도구에 표시된 크기와 같습니다.

## CSV 안에 남는 문자

### CSV를 문자로 열면 쉼표가 값을 나누고 줄바꿈이 행을 나눕니다

![sample-3.csv에 저장된 네 줄을 보여 주는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f6f753e1bd563103966869d032fc55270400e7192922735a016255eb1d9b9cd5.png "쉼표는 값 사이에, 줄바꿈은 행 끝에 있습니다 · 설명 이미지")

`sample-3.csv`를 UTF-8을 읽는 텍스트 편집기로 열면 아래 네 줄이 나옵니다. 첫 줄은 열 이름이고 그 아래가 데이터입니다. 쉼표는 값을, 줄바꿈은 행을 나눕니다. 이 예제의 문자열에는 큰따옴표도 붙었습니다.

```text
"code","region","qty"
"0012","서울",3
"0013","부산",5
"0014","서울",2
```

CSV의 장점은 내용을 문자로 바로 볼 수 있다는 데 있습니다. 다른 프로그램에 넘길 때도 파일 내용과 열 이름을 대조하기 쉽습니다. 다만 이 네 줄 어디에도 `code는 문자열`, `qty는 정수`라는 자료형 선언은 없습니다.

## CSV 읽기의 자료형 추정

### 숫자 모양의 코드를 정수로 읽으면 파일에 있던 앞자리 0이 결과에서 사라집니다

![문자열 0012와 정수 12를 비교하는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e5/e541ae1a1c650e186d226db26eec8dbe62c46819da0e6b463912e735e22102e2.png "파일의 문자는 남아 있고, 정수로 읽은 결과에서 앞자리 0이 빠집니다 · 설명 이미지")

이 실험에서 PyArrow의 CSV 읽기는 `code` 열을 정수로 추정했습니다. 값들이 모두 숫자 모양이기 때문입니다. `0012`를 정수로 바꾸면 값은 12가 되고 앞자리 0은 남지 않습니다. 큰따옴표로 감싼 CSV 값이라고 해서 모든 읽기 도구가 문자열로 취급하는 것은 아닙니다.

CSV 파일 자체가 `0012`를 지운 것은 아닙니다. 읽는 쪽이 자료형을 추정한 결과입니다. [PyArrow CSV 문서](https://arrow.apache.org/docs/python/csv.html)는 자료형을 자동으로 추정하며 필요하면 열별로 지정할 수 있다고 설명합니다.

## CSV에서 code를 문자열로 읽기

### code의 자료형을 문자열로 지정하면 0012의 앞자리 0이 남습니다

![같은 CSV를 자동 추정과 문자열 지정으로 읽은 실제 두 출력](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/05/050c5f14f61ebf60da47ab3fb0990f868cedf8868000321245287125f5a7cc8f.png "같은 CSV를 자동 추정과 문자열 지정으로 읽은 실제 두 출력 · 실제 캡처")

CSV의 앞자리 0을 남기려면 읽을 때 `code`를 문자열로 지정합니다. 아래 실행 칸은 같은 CSV 문자를 두 번 읽습니다. 처음에는 자동 추정에 맡기고, 두 번째에는 `code`를 문자열로 지정합니다. 실행하면 첫 줄은 `[12, 13, 14]`, 두 번째 줄은 `['0012', '0013', '0014']`가 나옵니다.

| 읽기 설정 | 첫 code 값 | 자료형 |
|---|---|---|
| 자동 추정 | 12 | int64 |
| code를 문자열로 지정 | 0012 | string |

https://eddmpython.com/codaro/run/?example=csv-parquet-code

`ConvertOptions`는 CSV 문자를 어떤 값으로 바꿀지 정하는 설정입니다. `column_types`에 열 이름 `code`와 문자열 자료형 `pa.string()`을 짝지어 넣습니다. 입력에 있는 `0012`를 `0007`로 고치고 다시 실행하면 자동 추정은 7, 문자열 지정은 `0007`을 남깁니다.

코드의 `BytesIO`는 파일처럼 읽고 쓸 바이트를 메모리에 담습니다. 이 실행 칸은 디스크 파일을 바꾸지 않습니다.

CSV를 받는 사람에게는 `code`를 문자열로 읽는 설정도 알려 줘야 합니다. 값과 읽기 설정을 함께 전달해야 같은 상품 코드를 얻습니다.

## Parquet에 함께 저장한 자료형

### Parquet을 다시 읽으면 저장할 때 정한 자료형과 값이 함께 돌아옵니다

![Parquet의 세 열 자료형과 code 값을 읽은 실제 출력](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d3/d3fc9c43ed8cc307c14e0ced1fb6de4b3b8c59f99a5d2ff420596a7bdbb642e5.png "Parquet의 세 열 자료형과 code 값을 읽은 실제 출력 · 실제 캡처")

Parquet으로 저장한 표를 읽으면 `code`는 문자열로 돌아옵니다. 파일에 열 이름과 자료형을 설명하는 정보가 함께 들어 있기 때문입니다. 이 열 설명을 스키마라고 부릅니다. `string`은 문자열, `int64`는 이 표의 수량을 담는 정수 자료형입니다.

| 열 | 저장할 때 정한 자료형 | 다시 읽은 첫 값 |
|---|---|---|
| code | string | 0012 |
| region | string | 서울 |
| qty | int64 | 3 |

Parquet은 텍스트 편집기에서 CSV처럼 표의 내용을 읽을 수 없습니다. 여기서는 Parquet을 읽는 PyArrow로 자료형과 값을 확인합니다. 내려받은 파일을 다시 열려면 Parquet을 지원하는 프로그램이 필요합니다.

아래 코드는 표를 Parquet 바이트로 저장한 뒤 스키마와 `code` 값을 읽습니다. `table`이 원본 표이고 `buffer`가 저장한 바이트를 담습니다. `write_table`은 저장, `read_schema`는 자료형 확인, `read_table`은 표 읽기를 맡습니다.

https://eddmpython.com/codaro/run/?example=csv-parquet-schema

출력 앞의 세 줄에는 `code: string`, `region: string`, `qty: int64`가 나옵니다. 마지막 줄에는 `['0012', '0013', '0014']`가 나옵니다. CSV와 달리 `code`를 문자열로 읽으라고 따로 지정하지 않아도 `0012`가 그대로 나왔습니다.

Parquet에 넣기 전부터 코드가 정수 12였다면 앞자리 0이 생기는 것은 아닙니다. 저장할 때 올바른 값과 자료형을 가진 표를 넣어야 합니다. [Parquet 읽기와 쓰기 문서](https://arrow.apache.org/docs/python/parquet.html)에서 스키마를 확인하는 방법도 볼 수 있습니다.

## 세 행의 파일 크기

### 세 행을 저장하면 설명 정보도 담는 Parquet이 CSV보다 큰 파일이 됩니다

![세 행을 저장한 CSV와 Parquet의 실제 파일 크기와 읽기 결과](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/df/dfc0d31bf78e2b0bf3d1473d36656ffb23caf2abf933345354982db2a4180100.png "세 행을 저장한 CSV와 Parquet의 실제 파일 크기와 읽기 결과 · 실제 캡처")

세 행을 저장한 CSV는 76바이트, Parquet은 1,005바이트였습니다. 같은 표인데 Parquet이 더 큽니다. 세 행의 값 외에 스키마와 열의 위치 같은 설명 정보도 저장하기 때문입니다. Parquet 파일 끝의 메타데이터가 데이터 위치를 알려 주는 구조는 [공식 파일 형식 문서](https://parquet.apache.org/docs/file-format/)에 나와 있습니다.

그래서 작은 설정표 하나를 넘기는 상황에서 파일 크기만 보고 Parquet을 고를 이유는 없습니다. 문자로 열어 확인하기 쉬운 CSV가 오히려 편할 수 있습니다.

![같은 세 행을 저장한 CSV 76바이트와 Parquet 1005바이트, 다시 읽은 첫 코드 12와 0012를 나란히 보여 주는 실제 비교 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/38/3847dfed31ead88bed82077319308fe988154cdd19cbbbc0ed016c3b06935164.png "위 도구에서 3행을 비교한 실제 실행 결과")

## 행 수에 따른 파일 크기

### 반복이 많은 1,000행과 100,000행 표에서는 Parquet 파일이 CSV보다 작습니다

![십만 행을 저장한 CSV와 Parquet의 실제 파일 크기](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/81/8169b54069f31858d3006cbb3a76c99098c6e576bef7d3750f5b4c3ac98b7e98.png "십만 행을 저장한 CSV와 Parquet의 실제 파일 크기 · 실제 캡처")

맨 위 도구에서 `1,000행`, `100,000행`을 차례로 고르고 `파일 비교`를 누릅니다. 행 수를 바꿀 때마다 실제로 두 형식의 바이트를 새로 만들며, 막대 길이는 그 실행에서 큰 파일을 기준으로 표시합니다.

| 행 수 | CSV, 압축 없음 | Parquet, Snappy |
|---|---:|---:|
| 3 | 76바이트 | 1,005바이트 |
| 1,000 | 18,022바이트 | 6,359바이트 |
| 100,000 | 1,800,022바이트 | 18,217바이트 |

이 실험에서는 1,000행과 100,000행을 저장한 Parquet 파일이 CSV보다 작았습니다. 다만 십만 행에 십만 가지 서로 다른 내용이 있는 것은 아닙니다. 코드 1,000종이 반복되고, 지역과 수량은 네 행짜리 패턴이 반복됩니다. 반복이 많은 합성 데이터이므로 이 크기 비율을 사진 경로나 긴 자유 서술문이 든 표에 그대로 적용하면 안 됩니다.

여기까지면 두 파일을 받아 자료형과 크기를 비교하는 데 충분합니다. 아래부터는 왜 크기가 달라졌는지, 일부 열만 읽는 작업에는 무엇이 달라지는지 확인합니다.

## Snappy 압축의 영향

### 같은 Parquet의 Snappy 압축을 끄면 파일이 커지지만 이 CSV보다는 작습니다

![같은 십만 행의 Parquet 압축 설정별 실제 파일 크기 출력](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6f/6feaed0b21c7dea8de301729384dec44064a5bf2438426feeba4b371b1fe658b.png "같은 십만 행의 Parquet 압축 설정별 실제 파일 크기 출력 · 실제 캡처")

같은 표를 `compression=None`으로 저장한 Parquet은 184,643바이트였습니다. Snappy를 끄면 커지지만 여전히 이 CSV보다는 작습니다. 압축 외에도 숫자와 반복되는 값을 기록하는 방식이 다르기 때문입니다. 예를 들어 반복되는 지역 이름을 매번 길게 적는 대신, 이름을 한 번 적어 두고 짧은 번호로 가리킬 수 있습니다. 값을 파일에 기록하는 이런 방식을 인코딩이라고 부릅니다.

| 십만 행을 저장한 조건 | 파일 크기 |
|---|---:|
| CSV, 압축 없음 | 1,800,022바이트 |
| Parquet, 압축 없음 | 184,643바이트 |
| Parquet, Snappy | 18,217바이트 |

아래 실행 칸은 앞의 십만 행과 같은 표를 만들고 Parquet의 압축만 바꿉니다. `None`은 압축 없음, `"snappy"`는 Snappy 압축입니다. 두 출력을 보면 압축 설정만 바꿨을 때의 차이를 확인할 수 있습니다.

https://eddmpython.com/codaro/run/?example=csv-parquet-compression

이 실험은 CSV에 별도 압축을 붙이지 않았습니다. 따라서 모든 압축 파일 가운데 무엇이 가장 작은지 가리는 결과도 아닙니다. [write_table의 저장 옵션](https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html)에서 압축과 사전 인코딩이 별도 설정인 것을 확인할 수 있습니다.

## Parquet의 열별 저장

### Parquet은 한 행 묶음 안에서 같은 열에 속한 값들을 모아 저장합니다

![한 행 묶음에서 code와 region과 qty를 열별로 모은 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fd/fd712fda14f3fa681bccd2beeb88741d92c0c9f13a41135d4ffbaf69545d0b83.png "한 행 묶음 안의 관계를 단순화했습니다. 실제 바이트 배치는 아닙니다 · 설명 이미지")

그림은 파일의 실제 바이트를 그대로 그린 것이 아니라, 열별로 값이 모이는 관계를 나타낸 도식입니다. Parquet은 행들을 묶은 단위 안에서 `code`, `region`, `qty`를 각각 모아 저장합니다. 큰 파일에는 이런 행 묶음이 여럿 있을 수 있습니다.

수량 합계만 필요하다면 지역 이름과 상품 코드까지 읽을 필요는 없습니다. Parquet 읽기는 파일의 설명 정보를 보고 필요한 `qty` 열을 찾아 읽을 수 있습니다. CSV도 결과에 일부 열만 남기게 할 수 있지만, 열을 구분하려면 원문의 구분자를 해석해야 합니다.

## 필요한 열만 읽기

### 읽을 열에 qty만 지정하면 수량 열만 담은 표가 나옵니다

![Parquet에서 qty 열만 읽은 실제 출력](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3f/3ff8619424379015785dfcacbd7430d7b0eb688f6862e82439eb91a16b3ac8f0.png "Parquet에서 qty 열만 읽은 실제 출력 · 실제 캡처")

아래 코드는 같은 세 열을 저장하지만 읽을 때 `columns=["qty"]`를 넘깁니다. 출력은 `['qty']`와 `{'qty': [3, 5, 2]}` 두 줄입니다. 첫 줄은 읽은 열 이름, 두 번째는 그 열의 값입니다.

https://eddmpython.com/codaro/run/?example=csv-parquet-columns

`columns`를 `["region", "qty"]`로 바꾸고 다시 실행하면 지역과 수량 두 열이 나옵니다. 파일을 다른 형식으로 다시 저장한 것이 아니라 읽을 열만 바꾼 것입니다. [read_table 문서](https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html)도 `columns`에 읽을 열 이름을 넘기도록 설명합니다.

열 선택은 저장한 전체 파일의 크기를 줄이지 않습니다. 내려받은 파일은 그대로이고, 읽는 작업에서 필요한 열만 요청합니다.

## 파일 크기와 읽기 시간

### 작은 파일이 항상 빨리 읽히는 것은 아니므로 같은 작업의 시간을 따로 잽니다

![이 글의 측정 기록에 있는 CSV와 Parquet 읽기 시간 비교표 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f2/f22cbae3c1166c56e31428e14d5b287b37e1453c137237201305e5c3c660090b.png "이 글의 측정 기록에 있는 CSV와 Parquet 읽기 시간 비교표 화면 · 실제 캡처")

파일이 작으면 읽기도 빨라질까요? 아래 실측에서는 1,000행 Parquet이 CSV보다 작았지만 읽는 시간은 더 길었습니다. 십만 행 전체 읽기도 용량 차이만큼 빨라지지 않았습니다. 반면 `qty`만 읽을 때는 Parquet 쪽 시간이 더 짧았습니다.

| 읽은 범위 | CSV | Parquet |
|---|---:|---:|
| 3행, 모든 열 | 0.875ms | 1.583ms |
| 1,000행, 모든 열 | 1.193ms | 2.103ms |
| 100,000행, 모든 열 | 7.352ms | 6.398ms |
| 100,000행, qty만 | 4.920ms | 2.072ms |

이 시간은 Windows 11, Python 3.14.7, PyArrow 22.0.0에서 디스크에 저장한 예제 파일을 읽어 잰 값입니다. 각 읽기를 한 번 미리 실행한 뒤 일곱 번 측정해 가운데 값을 썼고, 측정 순서는 번갈아 뒤집었습니다. 두 읽기 모두 여러 스레드로 나누지 않았으며, CSV의 모든 열을 읽을 때는 `code`를 문자열로 지정해 같은 자료형의 표를 만들었습니다.

파일을 이미 썼고 한 번 읽은 뒤라 운영체제 캐시가 영향을 줍니다. 처음 디스크에서 읽는 시간이나 인터넷 다운로드 시간은 아닙니다. 브라우저 도구의 실행 시간과도 별개입니다. 브라우저에서는 첫 패키지 다운로드가 더해지므로 버튼을 누르고 기다린 시간을 이 표와 비교하지 않습니다.

아주 짧은 작업이라 실행 환경과 다른 프로그램의 부하에 따라 값이 흔들릴 수 있습니다.

이 숫자는 라이브러리 순위가 아니라 같은 파일을 어떤 범위로 읽었는지 확인하는 예입니다. 내 파일 형식을 고를 때도 용량과 실제 읽기 작업을 함께 봅니다.

## 내 파일 형식 고르기

### 받을 프로그램의 지원 여부를 확인한 뒤 자료형과 실제 읽기 작업으로 형식을 고릅니다

![sample-3.csv와 sample-3.parquet 파일을 보여 주는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e3/e3e8457fc24c04b909495bf869259a7330074f5fd3d1b019c90723e0afea8c82.png "지원 여부가 먼저입니다. 그다음 실제 작업으로 고른 형식을 확인합니다 · 설명 이미지")

파일을 받는 프로그램이 Parquet을 읽지 못하면 작은 파일이어도 쓸 수 없습니다. 반대로 파이썬 분석에서 자료형을 유지하고 일부 열을 반복해 읽는다면 Parquet을 먼저 시험할 이유가 있습니다. CSV를 고를 때는 코드처럼 모양이 중요한 열의 자료형을 읽는 쪽에도 전달합니다.

| 내 작업 | 먼저 검토할 형식 |
|---|---|
| 작은 표를 문자로 열어 확인하고 주고받기 | CSV |
| 받는 프로그램이 CSV만 지원 | CSV |
| 코드와 수량의 자료형을 함께 보관 | Parquet |
| 큰 표에서 일부 열을 반복해서 분석 | Parquet을 실제 파일로 시험 |

선택한 형식의 파일을 실제로 받을 프로그램에서 열고, `code`의 앞자리 0과 수량이 원본과 같은지 확인합니다. 맨 위 도구에 나오는 `첫 code 값`은 내려받을 바이트를 다시 읽은 결과입니다. 본문 실행 칸에서는 별도 예제 표로 읽기 설정을 바꿔 봅니다.

받는 프로그램에서 코드가 12로 나왔다면 저장 전 자료형과 읽기 설정을 다시 확인합니다. 열 이름과 행 수뿐 아니라 코드의 앞자리 0과 수량 값까지 원본과 같다면, 그 파일로 실제 분석 작업을 이어 갑니다.

## 더 해 볼 것

- 압축한 CSV와 비교하려면 [PyArrow CSV 읽기](https://arrow.apache.org/docs/python/csv.html)에서 gzip 파일을 여는 예제를 봅니다.
- 여러 파일로 나뉜 큰 표는 [Arrow Datasets](https://arrow.apache.org/docs/python/dataset.html)에서 필요한 열과 조건으로 읽습니다.
- 표를 다룰 라이브러리가 아직 정해지지 않았다면 [데이터프레임 라이브러리 비교](/blog/dataframe-libraries)에서 실행 환경에 맞는 후보를 고릅니다.
- 시간 측정을 재현하려면 [이 글의 측정 코드](https://github.com/eddmpython/eddmpython/tree/main/blog/posts/006-csv-parquet)를 받습니다. `measure.py`는 브라우저 도구와 같은 표 생성 코드를 사용합니다.
