---
title: 파이썬으로 QR코드 만드는 방법, Segno로 PNG 저장하기
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 파이썬으로 주소를 QR코드로 만들고 PNG 파일로 저장합니다. QR코드의 바깥 여백과 실제 복원 수준을 확인한 뒤 휴대폰으로 읽어 봅니다.
readerQuestion: 파이썬으로 주소를 QR코드 이미지로 만들고 휴대폰에서 제대로 열리는지 어떻게 확인할까?
readerTakeaway: segno의 make 함수로 QR코드를 만들고 save 함수로 PNG 파일을 저장한 뒤 휴대폰으로 주소가 열리는지 확인한다.
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

파이썬으로 QR코드를 만들 때 코드를 길게 쓸 필요는 없습니다. `segno`라는 파이썬 라이브러리의 `make` 함수로 QR코드를 만들고, `save` 함수로 PNG 파일을 저장할 수 있습니다. QR코드가 만들어지면 휴대폰 카메라로 찍어서 주소가 제대로 열리는지 확인해 봅니다.

![어두운 책상 위에서 휴대폰이 작은 타일 격자 카드를 비추자 카드에서 가는 리본 하나가 흘러나와 화면으로 이어지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17e97599ef2ac51854f63acd7d52026fa0af03556885fdb76e1cdc597a99ce3d.webp "링크 하나가 휴대폰이 읽는 타일 패턴으로 바뀝니다")

아래 도구에 주소를 넣으면 QR코드가 바로 생깁니다. QR코드 한 칸의 크기와 바깥 여백을 바꾸면 최종 이미지 크기도 바로 바뀝니다. QR코드 일부가 가려져도 읽을 수 있게 같은 정보를 더 넣는 정도는 M으로 고정했습니다.

https://eddmpython.com/tool/python-qr

## 파이썬 QR코드 만들고 PNG 저장하기

### segno를 설치한 뒤 주소를 link.png로 저장합니다

`segno`는 PNG와 SVG 파일을 저장합니다. 다른 파이썬 패키지를 함께 설치하지 않아도 된다고 공식 [PyPI 페이지](https://pypi.org/project/segno/)에 적혀 있습니다. 터미널에서 `segno`를 설치한 뒤 파이썬 파일에 주소와 파일 이름을 넣습니다.

#### 실행 명령: segno 하나만 설치하기

아래 명령은 현재 터미널에서 쓰는 파이썬에 `segno`를 설치합니다. 명령이 오류 없이 끝나면 같은 터미널에서 파이썬 파일을 실행합니다. 파이썬이 여러 개 설치돼 있을 때 엉뚱한 곳에 `segno`가 설치되는 일을 줄일 수 있습니다.

```powershell
python -m pip install segno
```

#### 예시 코드: 주소를 link.png로 저장하기

`make` 함수에 주소를 넣으면 QR코드가 생깁니다. `save` 함수는 현재 폴더에 `link.png`를 저장하고, 마지막 `print`는 QR코드의 버전과 복원 수준과 PNG 크기를 보여 줍니다.

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
qr.save("link.png", scale=6, border=4)
print(qr.designator, qr.symbol_size(scale=6, border=4))
```

`segno 1.6.6`에서 이 코드를 실행하면 `2-M (198, 198)`이 나옵니다. `2-M`의 2는 QR코드 버전이고, M은 코드 일부가 가려져도 읽을 수 있게 같은 정보를 얼마나 더 넣었는지를 나타내는 오류 복원 수준입니다. 뒤의 두 숫자는 PNG 파일의 가로와 세로 크기입니다. 현재 폴더에서 `link.png`를 열면 만든 QR코드가 보입니다. 그런데 `error="m"`을 넣으면 실제 복원 수준도 항상 M일까요?

## Segno가 실제로 고른 복원 수준

### error에 넣은 값보다 높은 복원 수준이 나올 수 있습니다

제가 처음 쓴 설명이 틀렸습니다. `error="l"`과 `error="m"`으로 따로 만들었지만 실제 복원 수준을 출력하지 않은 채 두 QR코드가 다르다고 적었습니다. 다시 실행해 보니 둘 다 `2-M`이었습니다. Segno는 QR코드 크기를 키우지 않고도 복원 정보를 더 넣을 수 있으면 수준을 자동으로 높입니다.

#### 예시 코드: 요청한 수준과 실제 수준 비교하기

L, M, Q, H를 차례로 넣고 `qr.designator`를 출력합니다. `qr.designator`는 실제 QR코드 버전과 복원 수준을 보여 줍니다. [Segno 공식 문서](https://segno.readthedocs.io/en/stable/boost-error-correction-level.html)에 따르면 기본 설정에서는 `error`에 넣은 수준보다 높은 수준이 나올 수 있습니다.

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

왼쪽의 `l`, `m`, `q`, `h`는 코드에 넣은 값이고, 오른쪽의 `2-M`, `3-H`는 실제 결과입니다. L을 넣어도 버전 2에 M 수준의 복원 정보를 담을 자리가 있어서 M으로 높아졌습니다. Q도 같은 이유로 H가 됐습니다. 네 수준을 그대로 비교하고 싶다면 `boost_error=False`를 넣습니다.

#### 예시 코드: Segno가 복원 수준을 높이지 않게 하기

`boost_error=False`를 넣으면 요청한 복원 수준이 `qr.designator`에 그대로 나옵니다. 같은 주소라도 L과 M은 25칸이고 Q와 H는 29칸입니다. 복원 수준을 한 단계 높인다고 QR코드가 한 칸씩 커지는 것은 아닙니다.

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

복원 수준을 자동으로 높이는 기능은 끄지 않아도 됩니다. 저는 QR코드 크기를 그대로 두면서 더 잘 읽히게 해 주는 기본 설정을 씁니다. 대신 코드에 넣은 `error`만 보지 않고 `qr.designator`로 실제 수준을 확인합니다. 다음에는 25칸짜리 QR코드가 왜 198픽셀로 저장되는지 계산합니다.

## border로 QR코드 여백 넣기

### border=4를 넣으면 네 칸짜리 빈 테두리가 생깁니다

QR코드 바깥의 빈 테두리가 있어야 휴대폰이 코드의 끝을 찾기 쉽습니다. Segno는 일반 QR코드에 네 칸의 여백을 기본으로 넣습니다. QR코드를 이루는 작은 칸 하나를 모듈이라고 부릅니다. `scale=6`은 모듈 한 칸을 가로와 세로 6픽셀로 그리라는 뜻입니다.

#### 예시 코드: 여백을 뺀 크기와 넣은 크기 재기

같은 QR코드에 `border=0`과 `border=4`를 번갈아 넣습니다. 주소와 복원 수준은 그대로라서 QR코드 안쪽의 25칸은 바뀌지 않습니다. `border=4`를 넣었을 때는 바깥 여백만 더해집니다.

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

QR코드 안쪽은 25칸이고 한 칸은 6픽셀이므로 `25 x 6`은 150픽셀입니다. 양쪽에 네 칸씩 넣은 여백은 `4 x 6 x 2`, 곧 48픽셀이라서 최종 크기는 198픽셀이 됩니다. 그럼 종이에 인쇄할 때도 `scale=6`만 보면 될까요? 아닙니다. 편집 프로그램에서 정한 크기와 프린터 설정이 종이 위의 실제 크기를 바꿉니다. 저는 `border=4`를 남긴 QR코드를 명함이나 안내문에 넣고, 실제 크기로 인쇄한 뒤 다시 찍어 봅니다.

## 주소만 바꿔 쓰는 QR 저장 함수

### 주소와 파일 이름을 바꿔 저장하고 실제 수준과 픽셀 크기를 한 줄로 남깁니다

QR코드를 만들 때마다 같은 코드를 다시 쓰기는 귀찮습니다. 주소, 파일 이름, 최소 복원 수준, 한 칸의 픽셀 크기를 받는 함수로 묶습니다. Segno가 복원 수준을 자동으로 높이게 두고 실제 수준은 `qr.designator`로 확인합니다.

#### 예시 코드: 저장 뒤 실제 QR 정보를 출력하는 함수

`module_px`는 QR코드 한 칸의 픽셀 수입니다. 함수는 여백을 네 칸으로 넣고, 저장한 파일 이름과 실제 복원 수준과 PNG 크기를 함께 보여 줍니다.

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

주소가 길거나 복원 수준이 높으면 QR코드 칸 수가 늘어날 수 있어서 두 PNG 파일의 크기가 다릅니다. `error="x"`처럼 없는 수준을 넣으면 `ValueError`가 나고, Segno가 지원하지 않는 `.bmp` 파일로 저장해도 오류가 납니다. 복원 수준은 L, M, Q, H 중 하나를 넣고 파일 이름은 `.png`나 `.svg`로 끝냅니다. 코드가 오류 없이 끝나도 확인할 일이 남았습니다. PNG 파일을 실제 문서에 넣어 쓸 크기로 인쇄한 뒤 휴대폰 카메라로 찍습니다. 휴대폰에 열린 주소가 코드에 넣은 주소와 같은지도 확인해 보세요
