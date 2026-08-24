---
title: 파이썬으로 QR코드 만드는 법, segno 한 줄부터 저장까지
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 링크 하나를 스캔되는 QR코드 이미지로 바꾸고 파일로 저장하는 파이썬 코드를 다룹니다. segno를 설치해 한 줄로 QR코드를 만들고, 오류 복원 수준과 여백을 바꾸면 어떻게 달라지는지 화면으로 확인합니다.
readerQuestion: 링크 하나를 파이썬으로 스캔되는 QR 이미지로 만들고 파일로 저장하려면 무엇을 설치하고 어떤 코드를 써야 할까?
readerTakeaway: segno 로 QR 을 만들고 error 로 복원력을, scale 과 border 로 크기와 여백을 정해 PNG 로 저장한다.
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

명함에 넣을 QR 을 만들려고 또 웹사이트를 엽니다. 주소를 붙여 넣고, 크기를 맞추고, 워터마크가 붙는지 확인합니다. 매번 같은 일입니다. 파이썬으로 만들면 `segno.make` 한 줄로 고정됩니다. 설치할 것은 `segno` 하나입니다. 파이썬이 도는 곳이면 어디서나 돌고, 실행하면 코드를 돌린 폴더에 `link.png` 가 생깁니다.

![어두운 책상 위에서 휴대폰이 작은 타일 격자 카드를 비추자 카드에서 가는 리본 하나가 흘러나와 화면으로 이어지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17e97599ef2ac51854f63acd7d52026fa0af03556885fdb76e1cdc597a99ce3d.webp "링크 하나가 휴대폰이 읽는 타일 패턴으로 바뀝니다")

먼저 아래 도구에 주소를 넣어 QR 이 어떻게 나오는지 보고 나서, 같은 것을 파이썬으로 옮겨 보겠습니다.

https://eddmpython.com/tool/python-qr

## 파이썬 QR코드, segno 설치와 첫 저장

### segno를 설치하고 주소 하나를 PNG로 저장합니다

QR 을 그리는 라이브러리는 여러 개입니다. `segno` 를 고른 이유는 딸려 오는 것이 없어서입니다. `pip install segno` 를 돌리면 설치 목록에 `segno` 한 줄만 찍힙니다. 이미지 처리 라이브러리인 Pillow 를 따로 깔지 않아도 PNG 와 SVG 가 바로 저장되고 파일도 가볍습니다. 터미널에 그 한 줄을 실행하고 파이썬 파일에 세 줄을 적습니다.

#### 예시 코드: 주소 하나를 QR PNG로 저장하기

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
qr.save("link.png", scale=6, border=4)
```

괄호 안 주소를 우리 주소로 바꾸고 실행합니다. 코드를 돌린 폴더에 `link.png` 가 생깁니다. 317 바이트입니다. 이미지를 열어 휴대폰 카메라를 대면 그 주소가 뜹니다. 여기서 만든 QR 은 조금 가려지거나 인쇄가 뭉개져도 읽히는데, 그 여유가 `error="m"` 에서 나옵니다. 그럼 이 값을 `h` 로 올리면 칸이 그만큼 촘촘해질까요?

## 오류 복원을 올려도 칸이 바로 늘지 않는다

### error를 l부터 h까지 돌려 칸 수가 뛰는 자리를 찾습니다

QR 은 같은 정보를 여러 번 겹쳐 담습니다. 일부가 가려져도 읽히라고 넣는 여유분이고, 이것을 오류 복원 수준이라 부르며 `error` 값으로 정합니다. `l`은 약 7퍼센트, `m`은 15퍼센트, `q`는 25퍼센트, `h`는 30퍼센트까지 가려져도 읽힙니다. 겹쳐 담는 양이 늘면 칸도 늘겠죠. 네 값을 다 돌려 재 봅니다.

#### 예시 코드: 복원 수준별로 칸 수를 세어 보기

```python
import segno

for level in ["l", "m", "q", "h"]:
    qr = segno.make("https://eddmpython.com", error=level)
    print(level, qr.version, qr.symbol_size(scale=1, border=0))
```

반복문이 네 수준을 차례로 만들고 각각의 버전과 칸 수를 찍습니다. 22자짜리 우리 주소를 넣고 실행하면 이렇게 나옵니다.

```text
l 2 (25, 25)
m 2 (25, 25)
q 3 (29, 29)
h 3 (29, 29)
```

고르게 늘지 않습니다. `l` 과 `m` 이 똑같이 25칸이고, `q` 로 넘어가는 자리에서 29칸으로 한 번에 뜁니다. 계단입니다. QR 은 칸 수를 마음대로 정하지 못하고 21칸, 25칸, 29칸처럼 정해진 크기 중에서 고르는데, 이 크기를 버전이라 부르고 위 출력의 가운데 숫자가 그것을 가리킵니다. `l` 과 `m` 은 둘 다 버전 2 로 나왔죠. 여유분을 더 담고도 같은 칸에 들어갔다는 뜻이고, **그래서 `m` 은 `l` 과 크기가 같으면서 복원력만 두 배입니다.** 주소 길이가 바뀌면 뛰는 자리도 바뀌니 우리 주소로 직접 돌려 보시기 바랍니다. 그런데 방금 칸을 셀 때 `border=0` 을 넘겼습니다. 이 값이 무엇이길래 0 을 넣어야 순수한 칸 수가 나오는지 다음에서 잽니다.

## 여백을 빼면 그림이 48픽셀 작아진다

### border가 픽셀 크기와 읽힘을 동시에 바꿉니다

QR 바깥의 흰 테두리는 장식이 아닙니다. 스캐너가 코드의 경계를 찾는 기준이고, 이 여백을 조용한 구역이라 부릅니다. QR 표준은 네 칸을 요구하며 `segno` 도 `border` 를 안 적으면 4 를 씁니다. 자리를 아끼려고 `border=0` 으로 붙이면 배경과 QR 이 맞닿아 스캐너가 시작점을 잡을 기준을 잃습니다.

#### 예시 코드: 여백을 뺀 것과 넣은 것의 픽셀 재기

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
print("border=0", qr.symbol_size(scale=6, border=0))
print("border=4", qr.symbol_size(scale=6, border=4))
```

`symbol_size` 에 `scale` 과 `border` 를 같이 넘기면 저장될 그림의 픽셀 크기를 미리 알려 줍니다. 두 줄을 실행하면 이렇게 나옵니다.

```text
border=0 (150, 150)
border=4 (198, 198)
```

48픽셀 차이입니다. `border=0` 이 150픽셀이고 `border=4` 가 198픽셀이라 여백이 사방으로 그만큼 더합니다. 25칸짜리 QR 에 한 칸이 6픽셀이고 좌우로 네 칸씩 붙으니 `4 x 6 x 2` 가 그대로 48입니다. `scale` 은 칸 하나를 몇 픽셀로 그릴지 정하고 6이면 화면과 인쇄 양쪽에 넉넉합니다. `border` 는 칸 단위 여백이라 4 아래로 내리지 않습니다. 값의 뜻을 알았으니 한 파일에 모아 다시 쓸 저장 코드로 만듭니다.

## 링크 QR 저장 코드 완성

### 주소와 값을 바꿔 바로 쓰는 저장 함수를 만듭니다

지금까지 잰 세 값을 한 함수에 모으면 주소만 바꿔 넣고 실행하는 저장 코드가 됩니다. `error` 는 인쇄물이면 `h`, 화면용이면 `m` 으로 고르고 `scale` 로 크기를, `border` 로 여백을 정합니다. 저장한 뒤 어떤 QR 이 나왔는지 확인하려고 버전과 칸 수를 함께 찍습니다.

#### 예시 코드: 주소와 파일 이름만 바꿔 쓰는 저장 함수

```python
import segno

def save_qr(url, name, level="m", size=6):
    qr = segno.make(url, error=level)
    qr.save(name, scale=size, border=4)
    print(name, "저장", qr.version, "버전", qr.symbol_size())

save_qr("https://eddmpython.com", "home.png")
save_qr("https://eddmpython.com/blog", "blog.png", level="h", size=8)
```

함수를 두 번 부르면 `home.png` 와 `blog.png` 가 각각 저장되고 어떤 QR 이 나왔는지 한 줄씩 찍힙니다.

```text
home.png 저장 2 버전 (33, 33)
blog.png 저장 4 버전 (41, 41)
```

여기서 걸립니다. `home.png` 의 33칸이 앞에서 잰 25칸과 다릅니다. `symbol_size()` 를 괄호만 열고 부르면 여백 네 칸이 사방에 포함된 값을 주기 때문이고, 앞 절에서 25칸이 나온 것은 `border=0` 을 넘겼기 때문입니다. **칸 수를 세려면 `symbol_size(scale=1, border=0)` 로 부르고, 그냥 `symbol_size()` 는 여백까지 친 크기라고 읽습니다.** 인쇄용인 `blog.png` 는 주소가 길고 `h` 라서 버전 4까지 올라갔습니다.

#### 실패 예시: 없는 값과 없는 확장자를 넣었을 때

```text
segno.make("https://eddmpython.com", error="x")
ValueError: Illegal error correction level: "x". Supported levels: L, M, Q, H

qr.save("qr.bmp", scale=6)
ValueError: Unknown file extension ".bmp"
```

`error` 에 `x` 처럼 없는 값을 넣거나 `.bmp` 로 저장하면 위 오류가 그대로 뜹니다. 오류 문구가 쓸 수 있는 값을 알려 주므로 `L, M, Q, H` 중에서 다시 고르고, 확장자는 `.png` 나 `.svg` 로 바꾸면 넘어갑니다. 저장한 파일을 열어 휴대폰으로 스캔해 주소가 맞게 뜨는지 확인해 보시기 바랍니다. 링크 하나를 QR 로 바꾸고 파일로 남기는 데 필요한 것은 `segno` 하나와 이 함수 한 벌입니다.
