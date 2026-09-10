---
title: 파이썬 QR코드 만들기, 윈도우에서 PNG 저장과 휴대폰 확인
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 윈도우에서 파이썬의 핵심 세 줄로 웹 주소를 QR코드 PNG 파일로 만듭니다. 만든 파일을 휴대폰 카메라로 확인하고, 여러 장을 한 번에 저장하고, 인쇄물에 넣을 크기로 다시 저장하는 순서까지 따라갑니다.
readerQuestion: 윈도우에서 파이썬으로 웹 주소를 QR코드 PNG 파일로 만들고 휴대폰에서 실제로 읽히는지 확인하려면 어떻게 해야 할까?
readerTakeaway: segno.make_qr로 QR코드를 만들고 qr.save로 PNG를 저장한 뒤 휴대폰 카메라로 찍어 확인한다. 인쇄물에 넣을 것은 scale=20으로 다시 저장하고 바깥 흰 여백을 잘라 내지 않는다.
readerLevel: working
readerStartingPoint: 파이썬으로 print 정도는 돌려 봤지만 터미널에서 파이썬 파일을 실행하거나 외부 라이브러리를 설치해 본 적은 없다.
primaryKeyword: 파이썬 QR코드
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a9/a98936b3c6dcf48761a02bdf0bea6fe55b61d52cb34230e7f8f83c0c2c072774.png
ogImageAlt: 주소와 QR코드 PNG 저장 버튼이 함께 보이는 실제 도구 화면
ogImageWidth: 752
ogImageHeight: 426
ogImageType: image/png
---

https://eddmpython.com/tool/python-qr

파이썬으로 웹 주소를 QR코드 PNG로 저장하려면 무엇이 필요할까요? `segno` 라이브러리와 `import`, `make_qr`, `save` 세 줄이면 됩니다. 이 순서대로 실행하면 웹 주소가 담긴 PNG 파일이 손에 남습니다. 만든 PNG는 안내문이나 명함에 넣을 수 있습니다. 휴대폰으로 찍어 그 주소가 실제로 열리는지까지 확인합니다.

하지만 세 줄에서 끝내면 저장된 파일을 못 찾거나, 화면에서 읽히던 QR코드가 종이에서 읽히지 않는 일이 남습니다. 그래서 윈도우 터미널에서 파이썬 설치 여부부터 확인하고, PNG의 저장 위치를 찾은 뒤 휴대폰과 인쇄물에서 차례로 읽어 봅니다. 사용할 `segno`는 설치 한 줄이면 다른 패키지 없이 PNG와 SVG를 저장합니다.

## 작업 폴더에서 터미널 열기

### 앞으로 만들 파일이 모일 자리

![qr 폴더와 그 폴더에서 입력하는 powershell 명령의 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a8/a83563007f6e5796aa0ae8e3e1cfb2ec79f11e7385bbcf951f267d79a44f0285.png "qr 폴더와 그 폴더에서 입력하는 powershell 명령의 설명 이미지 · 설명 이미지")

```flow
바탕화면의 qr 폴더 | 파이썬 파일과 PNG를 둘 곳
탐색기 주소창 | powershell 입력
같은 폴더의 터미널 | 이후 명령을 실행할 곳
```

앞으로 만들 파이썬 파일과 QR코드 그림은 바탕화면의 `qr` 폴더 하나에 모읍니다. 터미널도 그 폴더에서 열어야 명령이 만든 파일을 바로 찾을 수 있습니다.

1. 바탕화면에 `qr` 폴더를 만듭니다
2. `qr` 폴더를 파일 탐색기로 열고 위쪽 주소창에 `powershell`을 입력합니다
3. 엔터를 눌러 터미널을 엽니다

`qr` 폴더에서 터미널을 열었습니다. 이 터미널이 파이썬을 실행할 수 있는지 확인합니다.

## 파이썬 명령 확인

### 버전 한 줄이 나오면 실행 준비 완료

![python --version 명령과 버전 한 줄을 보여 주는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1e/1e78460d7ecff0cb66cde03216f3fb06407a2c54f8ec7a6801a6f576ba081239.png "python --version 명령과 버전 한 줄을 보여 주는 설명 이미지 · 설명 이미지")

```powershell
python --version
```

터미널에 이 명령을 입력합니다. `Python 3.13.7`처럼 버전 한 줄이 나오면 파이썬 명령을 쓸 수 있습니다. 숫자는 설치된 버전에 따라 다릅니다.

Microsoft Store 창이 뜨거나 명령을 찾을 수 없다는 메시지가 나오면 이 터미널에서 `python` 명령을 쓸 수 없는 상태입니다. [Python 공식 다운로드](https://www.python.org/downloads/windows/)에서 파이썬을 받아 설치할 때 `Add python.exe to PATH`를 체크하고 터미널을 새로 엽니다.
새 터미널에서 `python --version`을 다시 실행해 버전이 찍히는지 확인합니다.

버전은 확인했지만 QR코드 라이브러리는 아직 없습니다. 같은 파이썬에 `segno`를 설치합니다.

## segno 설치하기

### 확인한 파이썬에 QR코드 라이브러리 추가

![같은 파이썬으로 segno를 설치하는 명령 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3c/3c48c1c65c0f5b6b93c6f935a7d2d6fe7cf383fb39251774f4e7e9c484959ba5.png "같은 파이썬으로 segno를 설치하는 명령 설명 이미지 · 설명 이미지")

```flow
python -m pip | 지금 확인한 파이썬으로 설치
segno | PNG를 만드는 라이브러리
설치 완료 메시지 | 파일에서 import할 준비
```

터미널에 아래 명령을 붙여 넣고 엔터를 누릅니다. 파이썬 파일에 적는 코드가 아니라 터미널에 직접 치는 명령입니다.

```powershell
python -m pip install segno
```

여러 줄이 지나가고 마지막에 `Successfully installed segno-1.6.6`처럼 `Successfully installed`로 시작하는 줄이 보이면 설치된 것입니다. `segno-` 뒤의 버전 번호는 설치하는 시점에 따라 다릅니다. 이미 깔려 있으면 `Requirement already satisfied`가 나옵니다.

`python -m`을 앞에 붙이는 까닭이 있습니다. 컴퓨터에 파이썬이 여러 개 깔려 있으면 `pip`만 썼을 때 `segno`가 다른 파이썬에 설치될 수 있습니다. `python -m pip`를 쓰면 지금 터미널에서 확인한 파이썬에 `segno`를 설치합니다.

`segno` 는 이제 깔렸습니다. 그 라이브러리를 부를 파이썬 파일을 만들 차례입니다.

## 웹 주소를 QR코드 PNG로 저장

### 주소 하나를 PNG 파일 하나로 바꾸기

[![주소와 QR코드 PNG 저장 버튼이 함께 보이는 실제 도구 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a9/a98936b3c6dcf48761a02bdf0bea6fe55b61d52cb34230e7f8f83c0c2c072774.png "주소와 QR코드 PNG 저장 버튼이 함께 보이는 실제 도구 화면 · 실제 캡처")](https://eddmpython.com/blog/python-qr)

```flow
웹 주소 | make_qr의 따옴표 안에 입력
QR코드 | 주소가 담긴 칸 배열
link.png | save가 만든 그림 파일
```

아래 코드는 웹 주소를 `link.png`로 만들고 저장 위치를 화면에 찍습니다. 이 코드를 `make_qr.py`에 넣습니다.

```python
import os
import segno

qr = segno.make_qr("https://eddmpython.com")
qr.save("link.png", scale=8, border=4)
print(os.path.abspath("link.png"))
```

QR코드는 `import segno`, `make_qr`, `save` 세 줄로 만듭니다. `os`와 `print`는 `link.png`가 저장된 위치를 화면에 표시합니다. `segno.make_qr`에 넣은 웹 주소가 QR코드로 바뀌고, `qr.save`가 그 QR코드를 `link.png`라는 그림 파일로 저장합니다.

그림의 크기와 여백은 `scale`과 `border`로 정합니다. `scale=8`로 저장하면 QR코드를 이루는 작은 네모 한 칸이 가로세로 8픽셀로 그려집니다. 화면에서 확인하기에는 충분한 크기입니다. `border=4` 는 바깥 테두리를 네 칸 너비로 남깁니다. 카메라가 QR코드의 끝을 찾는 데 필요한 최소 여백입니다.

1. 메모장을 열어 위 코드를 붙여 넣고 `파일` 메뉴의 `다른 이름으로 저장`을 고릅니다
2. 파일 형식을 `모든 파일`로 바꾸고 이름을 `make_qr.py`로 적어 `qr` 폴더에 저장합니다
3. 저장을 마치면 아까 열어 둔 터미널로 돌아갑니다

저장한 `make_qr.py`를 실행합니다.

```powershell
python make_qr.py
```

정상이라면 아래처럼 `link.png`가 저장된 경로가 한 줄 찍힙니다.

```text
C:\Users\사용자이름\Desktop\qr\link.png
```

`사용자이름` 자리에는 내 컴퓨터의 사용자 이름이 들어가므로 사람마다 다릅니다. 이 줄이 나왔으면 성공입니다.

`link.png`가 만들어졌습니다. 이제 휴대폰 카메라로 화면의 QR코드를 읽어 봅니다.

## 휴대폰이 그 QR코드를 읽는가

### 휴대폰 카메라로 link.png의 주소 열기

![컴퓨터에 띄운 QR코드를 휴대폰으로 비추는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d4/d46033d61c8bf5f1d5bf854029bfe6addf646f2f747ae8e2d03a8d1601d47289.png "컴퓨터에 띄운 QR코드를 휴대폰으로 비추는 설명 이미지 · 설명 이미지")

```flow
link.png 열기 | 컴퓨터 화면에 QR코드 표시
휴대폰으로 비추기 | 카메라 화면에 주소 표시
주소 누르기 | 넣어 둔 웹 페이지가 열리는지 확인
```

`link.png`가 만들어졌다는 사실만으로는 QR코드가 제대로 읽힌다고 볼 수 없습니다. 휴대폰 카메라가 주소를 인식하는지 보고, 화면에 뜬 주소를 눌러 페이지가 열리는지까지 확인합니다.

1. 터미널을 열 때 쓴 파일 탐색기 창으로 돌아갑니다
2. `link.png`를 더블클릭해서 컴퓨터 화면에 띄웁니다
3. 휴대폰 카메라 앱을 켜고 화면 속 QR코드를 비춥니다
4. 잠시 뒤 화면 위에 나타난 주소를 누릅니다

```text
https://eddmpython.com
```

눌러서 그 주소가 열리면 QR코드가 제대로 만들어진 것입니다.

주소가 뜨지 않으면 카메라가 아직 QR코드를 읽지 못한 것입니다. 먼저 그림을 크게 띄우고 화면 밝기를 올린 뒤 다시 찍어 봅니다. 그래도 주소가 뜨지 않으면 휴대폰 카메라로 다른 QR코드를 찍어 읽히는지 확인합니다.

여기까지 확인한 `link.png` 에는 아직 예제 주소가 들어 있습니다. 내 주소로 바꿀 차례입니다.

## 내 주소로 바꿔 다시 저장

### make_qr 괄호 안의 주소 바꾸기

![make_qr 괄호 안의 웹 주소를 바꾸는 코드 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/df/df9f2e4e4ca5976eb5859aef1e60f4eed6ec0a1b4b9a22d11816daa7d55f09da.png "make_qr 괄호 안의 웹 주소를 바꾸는 코드 설명 이미지 · 설명 이미지")

| 바꾸는 곳 | 그대로 둘 곳 |
|---|---|
| make_qr 안의 웹 주소 | link.png 파일 이름 |
| 안내문에 넣을 실제 주소 | scale=8, border=4 |

`make_qr.py`의 웹 주소만 바꾸면 파일 이름과 나머지 코드는 그대로 쓸 수 있습니다.

1. `qr` 폴더에서 `make_qr.py`를 오른쪽 클릭합니다
2. `연결 프로그램`에서 메모장을 고릅니다
3. `make_qr` 괄호 안의 주소를 안내문에 넣을 주소로 고치고 `Ctrl+S`로 저장합니다
4. 터미널에서 `python make_qr.py`를 다시 실행합니다
5. 새로 저장된 `link.png`를 휴대폰으로 찍어 내 주소가 열리는지 확인합니다

QR코드 하나만 만들었다면 여기까지면 됩니다. 이 QR코드를 인쇄하려면 [인쇄용 PNG 크게 저장하기](#인쇄용-png-크게-저장하기)로 바로 갑니다. 주소가 여러 개라면 [여러 주소를 한 번에 QR코드로 만들기](#여러-주소를-한-번에-qr코드로-만들기)에서 여러 장을 먼저 만듭니다.

## 여러 주소를 한 번에 QR코드로 만들기

### 파일 이름과 주소를 짝지어 QR코드 세 장 저장하기

![home.png와 blog.png와 post.png 세 파일의 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/cc/cccb4a09365522d8292021ca5815ca1fd4f4b92f39421a77d21d95b55ed606de.png "home.png와 blog.png와 post.png 세 파일의 설명 이미지 · 설명 이미지")

| links의 이름 | 그 이름으로 저장할 파일 |
|---|---|
| home | home.png |
| blog | blog.png |
| post | post.png |

지금까지 만든 것은 `link.png` 한 장입니다. 안내문에 들어갈 주소가 여러 개라면 코드를 매번 고쳐 실행해야 하므로, 파일 이름과 주소를 목록으로 묶어 한 번에 저장합니다.

메모장에 아래 코드를 넣고 `make_many.py`라는 이름으로 `qr` 폴더에 저장합니다.

```python
import segno

links = {
    "home": "https://eddmpython.com",
    "blog": "https://eddmpython.com/blog",
    "post": "https://eddmpython.com/blog/python-qr",
}

for name, url in links.items():
    qr = segno.make_qr(url)
    qr.save(name + ".png", scale=8, border=4)
    print(name + ".png 저장했습니다")
```

`links`는 파일 이름과 웹 주소를 짝지어 둔 목록입니다. 왼쪽 이름으로 파일을 저장하고 오른쪽 주소를 QR코드에 담으므로, 한 줄마다 QR코드 한 장이 생깁니다.

1. 예제로 적은 세 주소를 내 주소로 고칩니다
2. 주소가 더 필요하면 `links`에 같은 모양으로 한 줄씩 추가합니다
3. `Ctrl+S`로 저장하고 터미널로 돌아갑니다

저장한 파일을 실행합니다.

```powershell
python make_many.py
```

기본 이름 세 개를 그대로 썼다면 터미널에 다음 세 줄이 찍힙니다.

```text
home.png 저장했습니다
blog.png 저장했습니다
post.png 저장했습니다
```

세 줄은 각 PNG가 저장됐다는 뜻입니다. 저장된 그림을 차례로 띄워 `links`에 적은 주소가 각각 뜨는지 휴대폰으로 확인합니다.

지금까지 만든 파일은 전부 화면에서만 확인한 것입니다. 종이에 올리면 크기를 다시 잡아야 합니다.

## 인쇄용 PNG 크게 저장하기

### scale 20으로 큰 원본 만들기

![scale 20과 border 4로 print.png를 저장하는 코드 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17ecc4c63ed3ec316e7dc824ea621d9ed06bc0c4747cca10c44db791363c048e.png "scale 20과 border 4로 print.png를 저장하는 코드 설명 이미지 · 설명 이미지")

| 저장값 | 네모 한 칸의 크기 | 용도 |
|---|---|---|
| scale=8 | 가로세로 8픽셀 | 컴퓨터 화면에서 확인 |
| scale=20 | 가로세로 20픽셀 | 편집 프로그램에 넣을 큰 원본 |

인쇄물에 넣을 PNG는 편집 프로그램에서 늘리지 않도록 처음부터 크게 저장합니다. `scale=20`으로 저장하면 한 칸이 20픽셀로 그려집니다. 화면용 `scale=8` 그림을 편집 프로그램에서 늘리면 칸의 가장자리가 뭉개진 채 인쇄됩니다.

종이에 찍히는 실제 크기는 픽셀 수만으로 정할 수 없습니다. 편집 프로그램에서 줄여 쓸 큰 원본을 만든 뒤 한 장을 인쇄해 크기를 정합니다. QR코드가 하나라면 메모장에 아래 코드를 붙여 넣고 `qr` 폴더에 `make_print.py`로 저장합니다. 여러 장이면 [여러 장을 인쇄용으로 저장](#여러-장을-인쇄용으로-저장)로 바로 갑니다.

```python
import segno

qr = segno.make_qr("https://eddmpython.com")
qr.save("print.png", scale=20, border=4)
```

`make_qr` 괄호 안을 내 주소로 바꾸고 같은 터미널에서 `python make_print.py`를 실행합니다. 명령이 끝나면 `qr` 폴더에 `print.png`가 저장됩니다.

큰 `print.png`를 만들었습니다. 주소가 여러 개면 이름마다 인쇄용 파일을 따로 남깁니다. 한 장만 필요하면 [흰 여백 유지](#흰-여백-유지)로 갑니다.

## 여러 장을 인쇄용으로 저장

### 화면용 PNG를 남기고 새 이름으로 저장

![화면용 파일과 인쇄용 파일을 따로 남긴 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/64/641114cf3e9f88e56b27fd6383cce1d9953d1c8e2efb35fb0dbd4ce916fd03ed.png "화면용 파일과 인쇄용 파일을 따로 남긴 설명 이미지 · 설명 이미지")

| 화면용 파일 | 인쇄용 파일 |
|---|---|
| home.png | home_print.png |
| blog.png | blog_print.png |
| post.png | post_print.png |

인쇄물에 넣을 QR코드가 여러 장이면 `make_many.py`의 전체 코드를 아래처럼 바꿉니다. `links`에는 앞에서 확인한 내 주소를 넣습니다. 저장 이름에 `_print`를 붙였으므로 화면용 파일을 덮어쓰지 않습니다.

```python
import segno

links = {
    "home": "https://eddmpython.com",
    "blog": "https://eddmpython.com/blog",
    "post": "https://eddmpython.com/blog/python-qr",
}

for name, url in links.items():
    qr = segno.make_qr(url)
    qr.save(name + "_print.png", scale=20, border=4)
    print(name + "_print.png 저장했습니다")
```

`Ctrl+S`로 저장한 뒤 같은 터미널에서 `python make_many.py`를 실행합니다. `home_print.png`처럼 새 이름이 찍히고 `qr` 폴더에도 그 이름의 파일이 생깁니다. 인쇄용 그림을 편집 파일에 넣을 때는 바깥 흰 여백을 함께 남겨야 합니다.

## 흰 여백 유지

### QR코드 바깥 네 칸은 자르지 않는 영역

![QR코드 주위의 흰 여백을 남긴 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/56/56f3fc269bbf28bb67299d663844cd7e451fbf0f8a5d513569748531cb306469.png "QR코드 주위의 흰 여백을 남긴 설명 이미지 · 설명 이미지")

| 그림의 영역 | 편집할 때 할 일 |
|---|---|
| 주소가 담긴 네모 배열 | 가로세로 비율을 유지해 크기 조절 |
| 네 변의 흰 여백 | border=4로 저장한 폭을 그대로 유지 |

인쇄용 파일에서도 `border=4`는 그대로 둡니다. QR코드를 개발한 덴소웨이브는 [공식 설명](https://www.qrcode.com/en/howto/code.html)에서 네 변 모두에 네 칸 너비의 여백이 필요하다고 설명합니다. 어두운 배경의 포스터에 넣어도 흰 여백을 잘라 내지 않습니다. 여백이 사라지면 카메라가 QR코드의 끝을 찾기 어려워집니다.

인쇄용 PNG와 흰 여백을 준비했습니다. 마지막은 실제 편집 파일을 종이에 출력해 읽어 보는 일입니다.

## 인쇄해서 읽히는지 확인

### 실제 사용할 크기에서 주소가 뜨는지 확인

![인쇄한 QR코드를 휴대폰으로 확인하는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/47/477b70e71a42979434ae4ea2333217560b365028fe46818f282516e330084a81.png "인쇄한 QR코드를 휴대폰으로 확인하는 설명 이미지 · 설명 이미지")

```flow
편집 파일에 배치 | 실제 안내문이나 명함의 자리와 크기
실제 크기로 인쇄 | 흰 여백을 포함한 PNG
휴대폰으로 확인 | 의도한 주소가 열리는지 확인
```

한 장만 만들었다면 `print.png`를, 여러 장을 만들었다면 `_print.png`로 끝나는 파일을 인쇄합니다.

1. 인쇄용 PNG 한 장을 안내문이나 명함 편집 파일에서 실제로 사용할 자리에 배치합니다
2. 편집 파일을 실제 크기로 한 장 인쇄합니다
3. 인쇄된 QR코드에 휴대폰을 대 봅니다
4. 화면에 뜬 주소를 눌러 의도한 페이지가 열리는지 확인하고, 열리면 인쇄 크기를 기록합니다
5. 나머지 QR코드도 같은 크기로 한 장씩 인쇄해 주소를 누르고 페이지를 확인합니다
6. 주소가 뜨지 않으면 인쇄 크기를 키우고 흰 여백을 잘라 내지 않았는지 확인합니다

## 더 해 볼 것

- 인쇄소에 넘길 파일은 PNG 대신 SVG로 저장합니다. `qr.save("link.svg", scale=8, border=4)` 처럼 확장자만 바꾸면 됩니다.
- 브랜드 색은 저장할 때 `dark` 와 `light` 로 정합니다. `qr.save("navy.png", scale=8, border=4, dark="#1b3a5c", light="white")` 처럼 적습니다.
- QR코드 일부가 가려져도 읽히게 하는 여분의 데이터 양은 [Segno 공식 문서](https://segno.readthedocs.io/en/stable/boost-error-correction-level.html)에서 확인합니다.
- 파일의 픽셀 크기는 `qr.symbol_size(scale=20, border=4)`로 확인합니다.
- 반복문이 파일 이름과 주소를 꺼내는 과정은 아래 실행 칸에서 확인합니다. 이 칸은 파일 대신 이름과 크기를 출력합니다.

https://eddmpython.com/codaro/run/?example=qr-many

- 코드 없이 크기만 바꿔 보려면 이 글 맨 위의 QR코드 만들기 도구에서 `모듈 크기` 와 `테두리 여백` 슬라이더를 움직여 봅니다. 두 슬라이더가 각각 `scale` 과 `border` 입니다.
