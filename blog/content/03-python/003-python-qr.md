---
title: 파이썬으로 QR코드 만드는 법, segno 한 줄부터 저장까지
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 링크 하나를 스캔되는 QR코드 이미지로 바꾸고 파일로 저장하는 파이썬 코드를 다룹니다. segno를 설치해 한 줄로 QR코드를 만들고, 오류 복원 수준과 여백을 바꾸면 어떻게 달라지는지 화면으로 확인합니다.
readerQuestion: 링크 하나를 파이썬으로 스캔되는 QR 이미지로 만들고 파일로 저장하려면 무엇을 설치하고 어떤 코드를 써야 할까?
readerTakeaway: segno로 QR을 만들고 error로 복원력을, scale과 border로 크기와 여백을 정해 PNG로 저장한다.
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

명함이나 전단에 넣을 QR을 매번 웹사이트에서 만들다 보면 같은 주소를 또 붙여 넣고, 크기를 다시 맞추고, 워터마크가 붙는지 확인하게 됩니다. 파이썬으로 만들면 `segno.make` 한 줄로 같은 QR을 고정할 수 있습니다. 설치할 것은 `segno` 하나이고, 파이썬이 도는 곳이면 어디서나 돌며, 실행하면 코드를 돌린 폴더에 `link.png` 파일이 생깁니다.

![어두운 책상 위에서 휴대폰이 작은 타일 격자 카드를 비추자 카드에서 가는 리본 하나가 흘러나와 화면으로 이어지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17e97599ef2ac51854f63acd7d52026fa0af03556885fdb76e1cdc597a99ce3d.webp "링크 하나가 휴대폰이 읽는 타일 패턴으로 바뀝니다")

먼저 아래 도구에 주소를 넣어 QR이 어떻게 나오는지 보고 나서, 같은 것을 파이썬으로 옮겨 보겠습니다.

https://eddmpython.com/tool/qr

## 파이썬 QR코드, segno 설치와 첫 저장

### segno를 설치하고 주소 하나를 PNG로 저장합니다

QR을 그리는 라이브러리는 여러 개지만 `segno`는 다른 것을 함께 깔지 않아도 됩니다. 이미지 처리 라이브러리인 Pillow 없이도 PNG와 SVG를 바로 저장하고, 파일 크기도 작습니다. 터미널에 `pip install segno`를 한 번 실행하고, 파이썬 파일에 세 줄을 적습니다.

#### 예시 코드: 주소 하나를 QR PNG로 저장하기

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
qr.save("link.png", scale=6, border=4)
```

`segno.make` 의 괄호 안 주소를 우리 주소로 바꾸고 실행하면, 파일을 저장한 폴더에 `link.png`가 생깁니다. 이미지를 열어 휴대폰 카메라를 대면 그 주소가 뜹니다. 여기서 만든 QR은 조금 가려지거나 인쇄가 뭉개져도 읽히는데, 그 여유가 `error="m"` 에서 나옵니다. 이 값을 올리면 무엇이 달라지는지 다음에서 봅니다.

## 오류 복원을 올리면 칸이 촘촘해진다

### error를 m에서 h로 바꿔 칸 수가 어떻게 느는지 확인합니다

QR은 일부가 가려져도 읽히도록 같은 정보를 여러 번 겹쳐 담습니다. 이 여유분을 오류 복원 수준이라고 부르고, `error` 값으로 정합니다. `l`은 약 7퍼센트, `m`은 15퍼센트, `q`는 25퍼센트, `h`는 30퍼센트까지 가려져도 읽힙니다. 대신 더 많이 담을수록 검은 칸과 흰 칸의 수가 늘어 QR이 촘촘해집니다.

#### 예시 코드: 복원 수준별로 칸 수를 세어 보기

```python
import segno

for level in ["l", "m", "q", "h"]:
    qr = segno.make("https://eddmpython.com", error=level)
    print(level, qr.version, qr.symbol_size(scale=1, border=0))
```

`error` 를 `l`부터 `h`까지 돌리며 `qr.symbol_size`로 칸의 가로세로를 재면, `l`은 25칸인데 `h`로 가면 33칸까지 늘어납니다. 로고를 위에 얹거나 인쇄물이 손상될 자리라면 `h`가 안전하고, 화면에서만 쓸 링크면 `m`으로 충분합니다. 위 도구의 QR도 촘촘해질수록 복원력이 올라간 것이고, 이 촘촘함은 여백이 좁으면 오히려 안 읽히게 만듭니다.

## 여백을 빼면 스캐너가 못 읽는다

### border를 0으로 두고 실제로 안 읽히는 화면을 봅니다

QR 바깥의 흰 테두리는 장식이 아니라 스캐너가 코드의 경계를 찾는 기준입니다. 이 여백을 조용한 구역이라고 부르고, `border` 값으로 칸 단위 두께를 정합니다. 자리를 아끼려고 `border=0`으로 붙여 두면 배경과 QR이 붙어 카메라가 시작점을 못 찾습니다.

#### 예시 코드: 여백을 없앤 실패와 정상 저장을 나란히

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
qr.save("no_margin.png", scale=6, border=0)
qr.save("ok.png", scale=6, border=4)
```

`no_margin.png`는 카메라를 여러 각도로 대도 인식이 안 되고, `border=4`로 저장한 `ok.png`는 바로 읽힙니다. `scale`은 칸 하나를 몇 픽셀로 그릴지라 6이면 넉넉하고, `border`는 칸 단위 여백이라 4 아래로는 내리지 않습니다. 이제 이 값들을 한 파일에 모아 다시 쓸 수 있는 저장 코드로 만듭니다.

## 링크 QR 저장 코드 완성

### 주소와 값을 바꿔 바로 쓰는 저장 함수를 만듭니다

지금까지 만든 것을 모으면, 주소만 바꿔 넣고 실행하는 저장 코드가 됩니다. `error`는 인쇄물이면 `h`, 화면용이면 `m`으로 고르고, `scale`로 크기를, `border`로 여백을 정합니다. 함수로 묶어 두면 파일 이름과 주소만 바꿔 여러 개를 뽑을 수 있습니다.

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

`save_qr`의 괄호 안 주소와 파일 이름을 바꿔 두 번 부르면 `home.png`와 `blog.png`가 각각 저장되고, 인쇄용인 `blog.png`는 `h`와 크기 8로 더 크고 촘촘하게 나옵니다. 저장된 파일을 열어 휴대폰으로 스캔해 주소가 맞게 뜨는지 확인하시기 바랍니다. 링크 하나를 QR로 바꾸고 파일로 남기는 데 필요한 것은 `segno` 하나와 이 함수 한 벌입니다.
