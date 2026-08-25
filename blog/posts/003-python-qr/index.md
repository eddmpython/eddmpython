---
title: 파이썬으로 QR코드 만드는 방법, PNG 파일로 저장하기
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 파이썬 라이브러리 segno로 웹 주소를 QR코드로 만들고 PNG 파일로 저장합니다. 한 칸 크기와 바깥 여백을 정한 뒤 휴대폰 카메라로 주소가 열리는지 확인합니다.
readerQuestion: 파이썬으로 웹 주소를 QR코드로 만들고 PNG 파일로 저장하려면 어떤 코드를 써야 할까?
readerTakeaway: segno.make에 웹 주소를 넣어 QR코드를 만들고 qr.save로 PNG 파일을 저장한 뒤 휴대폰 카메라로 확인한다.
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

파이썬으로 QR코드를 만들 때 코드를 길게 쓸 필요는 없습니다. `segno`라는 파이썬 라이브러리의 `make` 함수에 웹 주소를 넣으면 QR코드가 만들어집니다. 만든 QR코드는 `qr.save`로 `link.png` 파일에 저장합니다. 파일이 생기면 휴대폰 카메라로 찍어서 같은 웹 주소가 열리는지 확인해 봅니다.

![어두운 책상 위에서 휴대폰이 작은 타일 격자 카드를 비추자 카드에서 가는 리본 하나가 흘러나와 화면으로 이어지는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17e97599ef2ac51854f63acd7d52026fa0af03556885fdb76e1cdc597a99ce3d.webp "링크 하나가 휴대폰이 읽는 타일 패턴으로 바뀝니다")

아래 입력칸에 웹 주소나 문구를 넣으면 QR코드를 만들어 줍니다. `모듈 크기`와 `테두리 여백` 슬라이더로 QR코드 한 칸의 크기와 바깥 여백을 설정할 수 있습니다. QR코드가 만들어지면 `PNG 저장` 버튼으로 파일을 받고 `이미지 복사` 버튼으로 복사합니다.

https://eddmpython.com/tool/python-qr

## segno 설치하고 QR코드 저장하기

### 웹 주소를 link.png 파일로 저장합니다

`segno`는 QR코드를 PNG나 SVG 파일로 저장하는 파이썬 라이브러리입니다. 다른 파이썬 패키지를 함께 설치하지 않아도 된다고 공식 [PyPI 페이지](https://pypi.org/project/segno/)에 적혀 있습니다. 먼저 아래 명령으로 `segno`를 설치합니다.

#### 실행 명령: segno 설치하기

`python -m pip install segno`를 실행하면 현재 터미널에서 쓰는 파이썬에 `segno`가 설치됩니다. 설치가 끝나면 같은 터미널에서 파이썬 파일을 실행합니다.

```powershell
python -m pip install segno
```

#### 예시 코드: 웹 주소를 link.png로 저장하기

`segno.make`에 웹 주소를 넣어 QR코드를 만듭니다. `qr.save`는 현재 폴더에 `link.png`를 저장합니다. 마지막 `print`는 실제 오류 복원 수준과 PNG 크기를 보여 줍니다.

```python
import segno

qr = segno.make("https://eddmpython.com", error="m")
qr.save("link.png", scale=6, border=4)
print(qr.designator, qr.symbol_size(scale=6, border=4))
```

`segno 1.6.6`에서 이 코드를 실행하면 `2-M (198, 198)`이 나옵니다. `2-M`의 `2`는 QR코드 버전입니다. `M`은 QR코드 일부가 가려져도 읽을 수 있게 같은 정보를 더 넣는 정도입니다. 이 값을 오류 복원 수준이라고 부릅니다. `(198, 198)`은 PNG 파일의 가로와 세로 크기입니다. 현재 폴더에서 `link.png`를 열면 만든 QR코드가 보입니다. 코드에 `error="m"`을 넣었지만 Segno가 실제로 M을 썼는지는 `qr.designator`로 확인해야 합니다.

## 실제 오류 복원 수준 확인하기

### error 값과 qr.designator 결과를 비교합니다

처음에는 `error="l"`과 `error="m"`으로 만들면 서로 다른 QR코드가 나온다고 썼습니다. 하지만 `qr.designator`를 출력해 보니 둘 다 `2-M`이었습니다. Segno는 QR코드 칸 수를 늘리지 않고 복원 정보를 더 넣을 수 있으면 수준을 자동으로 올립니다.

#### 예시 코드: L, M, Q, H 결과 출력하기

`error`에 L, M, Q, H를 차례로 넣습니다. `qr.designator`에는 Segno가 실제로 만든 버전과 복원 수준이 나옵니다. [Segno 공식 문서](https://segno.readthedocs.io/en/stable/boost-error-correction-level.html)에 따르면 기본 설정에서는 `error`에 넣은 값보다 높은 수준이 나올 수 있습니다.

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

`l 2-M`에서 `l`은 코드에 넣은 값이고 `2-M`은 실제 결과입니다. L을 넣어도 버전 2에 M 수준의 정보를 넣을 자리가 있어서 M으로 올라갔습니다. Q를 넣은 QR코드도 같은 이유로 H가 됐습니다. L, M, Q, H를 입력한 그대로 사용하려면 `boost_error=False`를 넣습니다.

#### 예시 코드: 입력한 복원 수준 그대로 만들기

`boost_error=False`를 넣으면 코드에 입력한 복원 수준이 `qr.designator`에 그대로 나옵니다.

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

`l`, `m`, `q`, `h`가 각각 `2-L`, `2-M`, `3-Q`, `3-H`로 나옵니다. L과 M은 가로 25칸이고 Q와 H는 가로 29칸입니다. 복원 수준을 한 단계 올린다고 QR코드가 한 칸씩 커지지는 않습니다. `boost_error`의 기본값은 `True`입니다. 저는 같은 칸 수에 더 높은 복원 수준을 넣어 주는 기본값을 그대로 씁니다. 코드에 넣은 수준보다 올라갔는지는 `qr.designator`로 확인합니다. 방금 만든 `2-M` QR코드는 가로 25칸입니다. `scale=6`과 `border=4`를 넣으면 이 25칸이 198픽셀이 됩니다.

## border로 바깥 여백 넣기

### border=4는 네 칸만큼 여백을 넣습니다

`border`는 QR코드 바깥의 빈 여백을 정합니다. 휴대폰 카메라는 이 여백으로 QR코드의 끝을 구분합니다. Segno는 일반 QR코드에 네 칸의 여백을 기본으로 넣습니다. QR코드를 이루는 작은 네모 한 칸을 모듈이라고 부릅니다. `scale=6`은 모듈 한 칸을 가로와 세로 각각 6픽셀로 저장한다는 뜻입니다.

#### 예시 코드: border=0과 border=4 크기 비교하기

`border=0`으로 여백이 없는 크기를 확인하고 `border=4`로 네 칸의 여백을 넣은 크기를 확인합니다. 웹 주소와 복원 수준은 같아서 QR코드 안쪽의 25칸은 바뀌지 않습니다.

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

QR코드 안쪽은 25칸이고 한 칸은 6픽셀이므로 `25 x 6`은 150픽셀입니다. 왼쪽과 오른쪽에 들어간 여백은 `4 x 6 x 2`, 곧 48픽셀입니다. 150에 48을 더하면 PNG 파일의 가로 크기는 198픽셀이 됩니다. 세로 크기도 같은 방법으로 계산합니다. 종이에 인쇄할 때는 `scale=6`만 보고 크기를 정할 수 없습니다. 편집 프로그램에서 QR코드의 가로와 세로를 몇 cm로 넣었는지, 프린터가 확대하거나 줄였는지에 따라 실제 크기가 달라집니다. `border=4`를 넣은 QR코드를 명함이나 안내문에 배치하고 실제 크기로 인쇄한 뒤 휴대폰으로 찍어 봅니다.

## 여러 웹 주소를 QR코드로 저장하기

### save_qr 함수에 주소와 파일 이름을 넣습니다

`save_qr` 함수로 묶어 두면 웹 주소와 파일 이름만 바꿔 여러 QR코드를 저장합니다. `level`에는 L, M, Q, H 가운데 하나를 넣습니다. `module_px`에는 QR코드 한 칸을 몇 픽셀로 저장할지 넣습니다.

#### 예시 코드: home.png와 blog.png 저장하기

`save_qr`는 QR코드 바깥에 네 칸의 여백을 넣습니다. 파일을 저장한 뒤에는 파일 이름, 실제 복원 수준, PNG 크기를 한 줄로 보여 줍니다.

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

`blog.png`는 웹 주소가 더 길고 H 수준과 8픽셀 모듈을 사용해서 `home.png`보다 큽니다. `error="x"`처럼 없는 수준을 넣으면 `ValueError`가 납니다. Segno가 지원하지 않는 `.bmp` 파일 이름을 넣어도 저장할 수 없습니다. 복원 수준은 L, M, Q, H 중 하나를 넣고 파일 이름은 `.png`나 `.svg`로 끝냅니다. PNG 파일을 저장했으면 실제 문서에 넣고 사용할 크기로 인쇄합니다. 휴대폰 카메라로 QR코드를 찍은 뒤 코드에 넣은 웹 주소가 그대로 열리는지 확인해 보세요
