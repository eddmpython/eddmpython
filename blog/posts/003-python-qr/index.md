---
title: 파이썬으로 QR코드 만드는 방법, segno로 PNG 저장하고 여백 확인하기
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 주소 하나를 파이썬 QR코드로 만들어 PNG 파일로 저장합니다. segno가 실제로 고른 오류 복원 수준과 여백을 포함한 픽셀 크기도 출력해서 확인합니다.
readerQuestion: 주소 하나를 파이썬으로 QR 이미지로 만들고, 저장된 크기와 오류 복원 수준까지 확인하려면 어떤 코드를 써야 할까?
readerTakeaway: segno로 QR을 저장한 뒤 designator로 실제 오류 복원 수준을 읽고 border 네 칸을 포함한 픽셀 크기를 확인한다.
readerLevel: working
readerStartingPoint: 파이썬으로 print 정도는 돌려 봤지만 외부 라이브러리를 설치해 이미지 파일을 만들어 본 적은 없다.
primaryKeyword: 파이썬 QR코드
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17e97599ef2ac51854f63acd7d52026fa0af03556885fdb76e1cdc597a99ce3d.webp
ogImageAlt: 어두운 책상 위에서 휴대폰이 작은 타일 격자 카드를 비추자 카드에서 가는 리본 하나가 흘러나와 화면으로 이어지는 장면
ogImageWidth: 1216
ogImageHeight: 832
ogImageType: image/webp
---

주소를 QR PNG로 남기는 데 긴 코드는 필요 없습니다. `segno.make`로 QR을 만들고 `save`로 저장하면 됩니다. 다만 파일이 생겼다는 사실만 보고 끝내면 오류 복원 수준과 여백을 잘못 읽기 쉽습니다. 이 글에서는 저장 결과를 숫자로 찍어 보고, 마지막에는 휴대폰으로 주소가 맞는지 확인합니다.

![어두운 책상 위에서 휴대폰이 작은 타일 격자 카드를 비추자 카드에서 가는 리본 하나가 흘러나와 화면으로 이어지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17e97599ef2ac51854f63acd7d52026fa0af03556885fdb76e1cdc597a99ce3d.webp "링크 하나가 휴대폰이 읽는 타일 패턴으로 바뀝니다")

파이썬 코드를 쓰기 전에 주소 길이와 여백이 QR 크기를 어떻게 바꾸는지 아래 도구에서 확인합니다. 이 도구는 오류 복원 수준 M을 고정하고, 모듈 한 칸의 픽셀 수와 바깥 여백을 바로 바꿉니다.

https://eddmpython.com/tool/python-qr

## 파이썬 QR코드, segno 설치와 PNG 저장

### 주소를 넣어 QR을 만들고 파일이 생긴 폴더와 픽셀 크기를 확인합니다

`segno`는 다른 패키지를 함께 설치하지 않아도 PNG와 SVG를 저장하며, 공식 [PyPI 설명](https://pypi.org/project/segno/)에도 외부 의존성이 없다고 적혀 있습니다. 터미널에서 설치 명령을 한 번 실행한 뒤, 파이썬 파일에 주소와 파일 이름을 적습니다.

#### 실행 명령: segno 하나만 설치하기

아래 명령은 현재 파이썬이 쓰는 환경에 `segno`를 설치합니다. 명령이 오류 없이 끝나면 설치됐거나 이미 설치돼 있다는 결과가 보입니다. 같은 터미널에서 파이썬 파일을 실행하면 다른 환경을 잘못 열지 않습니다.

```powershell
python -m pip install segno
```

#### 예시 코드: 주소를 link.png로 저장하기

`make`가 주소를 QR로 바꾸고 `save`가 현재 폴더에 `link.png`를 만들며, 마지막 줄은 Segno가 고른 버전과 오류 복원 수준, 여백을 포함한 PNG 크기를 출력합니다.

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
qr.save("link.png", scale=6, border=4)
print(qr.designator, qr.symbol_size(scale=6, border=4))
```

이 글을 확인한 `segno 1.6.6`에서는 `2-M (198, 198)`이 찍혔는데, `2-M`은 버전 2와 오류 복원 수준 M을 뜻하고 뒤의 두 숫자는 저장될 PNG의 가로와 세로 픽셀입니다. 코드를 실행한 폴더에서 `link.png`를 열면 생성한 QR이 보입니다. 그런데 `error="m"`을 적었다고 해서 출력이 언제나 M으로 고정될까요?

## error 자동 승격 확인

### designator를 출력하면 요청한 값과 Segno가 실제로 고른 값이 갈립니다

제가 틀렸습니다. `l`과 `m`의 버전과 칸 수만 출력한 뒤 둘의 복원력을 비교했는데, 정작 실제 오류 복원 수준을 찍지 않았습니다. 다시 실행해 보니 `l`과 `m`은 모두 `2-M`이었습니다. 왜 그랬을까요? Segno는 QR 버전을 키우지 않고 더 높은 오류 복원 수준을 담을 자리가 남으면 수준을 자동으로 올립니다.

#### 예시 코드: 요청값과 실제 designator 비교하기

네 값을 차례로 넘기고 `designator`를 출력합니다. [Segno의 오류 복원 설명](https://segno.readthedocs.io/en/stable/boost-error-correction-level.html)에 따르면 기본값에서는 `error`를 고정값이 아니라 최솟값으로 읽습니다.

```python
import segno

url = "https://eddmpython.com"

for level in ["l", "m", "q", "h"]:
    qr = segno.make(url, error=level)
    print(level, qr.designator, qr.symbol_size(border=0))
```

```text
l 2-M (25, 25)
m 2-M (25, 25)
q 3-H (29, 29)
h 3-H (29, 29)
```

첫 글자는 우리가 요청한 값이고 `2-M`, `3-H`가 실제 결과입니다. `l`을 요청해도 버전 2 안에 M을 담을 수 있어서 M으로 올라갔고, `q`도 버전 3 안에서 H로 올라갔습니다. L, M, Q, H를 정확히 비교해야 한다면 `boost_error=False`를 넘겨 자동 승격을 끕니다.

#### 예시 코드: 자동 승격을 끄고 네 수준 고정하기

이번에는 요청한 오류 복원 수준이 `designator`에 그대로 남습니다. 같은 주소라도 L과 M은 25칸, Q와 H는 29칸이라 수준을 올릴 때마다 한 칸씩 고르게 늘지는 않습니다.

```python
for level in ["l", "m", "q", "h"]:
    qr = segno.make(url, error=level, boost_error=False)
    print(level, qr.designator, qr.symbol_size(border=0))
```

```text
l 2-L (25, 25)
m 2-M (25, 25)
q 3-Q (29, 29)
h 3-H (29, 29)
```

자동 승격은 끄지 않아도 됩니다. 저는 작은 버전을 유지하면서 복원 수준을 올려 주는 기본값을 그대로 씁니다. 대신 코드에 적은 `error`가 실제 결과라고 단정하지 않고 `designator`를 확인합니다. 이제 25칸이 왜 저장할 때 198픽셀이 되는지 여백까지 계산해 보겠습니다.

## border 네 칸과 픽셀 크기

### QR 본체와 바깥 여백을 따로 재서 저장될 PNG 크기를 계산합니다

QR 바깥의 빈 테두리는 스캐너가 코드의 경계를 찾는 공간입니다. Segno는 일반 QR에 네 모듈의 여백을 기본값으로 씁니다. 여기서 모듈은 QR을 이루는 작은 칸 하나입니다. `scale=6`은 모듈 한 칸을 6픽셀 정사각형으로 그리라는 뜻입니다.

#### 예시 코드: 여백을 뺀 크기와 넣은 크기 재기

같은 QR에 `border=0`과 `border=4`를 번갈아 넣습니다. 주소와 오류 복원 수준이 같으므로 QR 본체는 바뀌지 않고, 바깥 여백만 결과 크기에 더해집니다.

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
print("여백 없음", qr.symbol_size(scale=6, border=0))
print("여백 네 칸", qr.symbol_size(scale=6, border=4))
```

```text
여백 없음 (150, 150)
여백 네 칸 (198, 198)
```

QR 본체는 25칸이고 한 칸이 6픽셀이므로 `25 x 6`은 150픽셀이고, 양쪽 여백 네 칸에 해당하는 `4 x 6 x 2`, 곧 48픽셀이 더해져 가로와 세로가 모두 198픽셀이 됩니다. 그럼 인쇄는요? `scale=6`만 보고 인쇄 크기가 충분하다고 말할 수는 없습니다. PNG가 종이에서 몇 밀리미터로 놓일지는 편집 프로그램의 배율과 출력 해상도가 함께 정합니다. 저는 QR 파일에는 `border=4`를 남기고, 명함이나 안내문에 배치한 뒤 실제 크기로 인쇄해서 다시 스캔합니다.

## 다시 쓰는 QR 저장 함수

### 주소와 파일 이름을 바꿔 저장하고 실제 수준과 픽셀 크기를 한 줄로 남깁니다

매번 확인 코드를 다시 쓰기는 귀찮습니다. 주소, 파일 이름, 최소 오류 복원 수준, 모듈 크기만 받는 함수로 묶으면 저장 결과가 한 줄에 남습니다. 자동 승격은 기본값을 쓰고, 실제 결과는 `designator`로 읽습니다.

#### 예시 코드: 저장 뒤 실제 QR 정보를 출력하는 함수

`module_px`는 모듈 한 칸의 픽셀 수입니다. 함수는 여백을 네 칸으로 고정하고, 저장한 파일 이름과 실제 오류 복원 수준과 PNG 크기를 함께 출력합니다.

```python
import segno

def save_qr(url, name, level="m", module_px=6):
    qr = segno.make(url, error=level)
    qr.save(name, scale=module_px, border=4)
    size = qr.symbol_size(scale=module_px, border=4)
    print(name, qr.designator, size)

save_qr("https://eddmpython.com", "home.png")
save_qr(
    "https://eddmpython.com/blog",
    "blog.png",
    level="h",
    module_px=8,
)
```

```text
home.png 2-M (198, 198)
blog.png 4-H (328, 328)
```

주소가 길어지고 오류 복원 수준이 높아지면 더 큰 버전이 필요할 수 있어서 두 파일의 크기가 다릅니다. `error="x"`처럼 없는 수준을 넣으면 `ValueError`가 나고, Segno가 지원하지 않는 `.bmp` 확장자로 저장해도 오류가 납니다. 오류 복원 수준은 L, M, Q, H 중에서 다시 고르고 파일은 `.png`나 `.svg`로 저장하면 됩니다. 코드가 오류 없이 끝났다고 QR 검사가 끝난 것은 아닙니다. 저장한 PNG를 실제 문서에 배치하고, 쓸 크기로 출력한 뒤 휴대폰 카메라로 읽어 봅니다. 화면에 뜬 주소가 코드에 넣은 주소와 같은지도 확인해 보세요
