---
title: 파이썬으로 QR코드 만들기, 휴대폰이 읽는 PNG 파일까지
slug: python-qr
author: eddmpython
section: 파이썬 도구
summary: 파이썬 세 줄로 웹 주소를 QR코드 PNG 파일로 만듭니다. 만든 파일을 휴대폰 카메라로 확인하고, 여러 장을 한 번에 저장하고, 인쇄물에 넣을 크기로 다시 저장하는 순서까지 따라갑니다.
readerQuestion: 파이썬으로 웹 주소를 QR코드 PNG 파일로 만들고 휴대폰에서 실제로 읽히는지 확인하려면 어떻게 해야 할까?
readerTakeaway: segno.make_qr로 QR코드를 만들고 qr.save로 PNG를 저장한 뒤 휴대폰 카메라로 찍어 확인한다. 인쇄물에 넣을 것은 scale=20으로 다시 저장하고 바깥 흰 여백을 잘라 내지 않는다.
readerLevel: working
readerStartingPoint: 파이썬으로 print 정도는 돌려 봤지만 터미널에서 파이썬 파일을 실행하거나 외부 라이브러리를 설치해 본 적은 없다.
primaryKeyword: 파이썬 QR코드
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/52/529e7d7cb675862be6442f9ecbbb691da4a5ff7dc7c387f1837c9f44533eaf45.webp
ogImageAlt: 어두운 바닥에 놓인 휴대폰 화면이 작은 사각 타일 격자로 덮여 있고 그 위에서 가는 리본 한 줄이 들려 올라오는 장면
ogImageWidth: 1216
ogImageHeight: 832
ogImageType: image/webp
---

https://eddmpython.com/tool/python-qr

파이썬으로 QR코드를 만드는 핵심은 `import`, `make_qr`, `save` 세 줄입니다. 이 글을 따라가면 웹 주소가 담긴 PNG 파일이 손에 남습니다. 안내문이나 명함에 그대로 넣을 수 있고, 휴대폰으로 찍었을 때 실제로 열리는지까지 확인한 파일입니다.

세 줄에서 끝내지 않습니다. 저장은 됐는데 파일이 어디 있는지 못 찾거나, 찾아서 휴대폰을 댔는데 아무 반응이 없거나, 화면에서 읽히던 것이 종이에서 안 읽히는 일이 남아 있기 때문입니다.

파이썬을 설치한 윈도우 컴퓨터에서 터미널로 진행합니다. 깔려 있는지 확인하는 방법과 없을 때 받는 곳도 아래에서 같이 다룹니다. 코드는 `segno` 를 씁니다. 검색해서 나오는 예제는 대부분 `qrcode` 라이브러리를 쓰는데, 안내대로 `pip install qrcode` 만 하고 실행하면 `ModuleNotFoundError: No module named 'PIL'` 이 뜹니다. PNG로 저장하는 일을 `qrcode` 가 아니라 `PIL` 이라는 그림 라이브러리가 맡기 때문입니다. `segno` 는 설치 한 줄이면 다른 패키지 없이 PNG와 SVG를 바로 저장합니다.

![어두운 바닥에 놓인 휴대폰 화면이 작은 사각 타일 격자로 덮여 있고 그 위에서 가는 리본 한 줄이 들려 올라오는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/52/529e7d7cb675862be6442f9ecbbb691da4a5ff7dc7c387f1837c9f44533eaf45.webp "링크 하나가 휴대폰이 읽는 타일 패턴으로 바뀝니다")

## segno 설치하고 QR코드 파일 만들기

먼저 작업할 자리를 만듭니다. 바탕화면에 `qr` 이라는 폴더를 하나 만듭니다. 앞으로 만들 파이썬 파일과 QR코드 그림이 전부 이 폴더에 모입니다.

그 폴더를 파일 탐색기로 열고 위쪽 주소창을 클릭한 다음 `powershell` 이라고 치고 엔터를 누릅니다. 검은 터미널 창이 그 폴더에서 열립니다. 이 창을 끝까지 씁니다.

창이 열리면 먼저 `python --version` 을 칩니다. `Python 3.13.7` 처럼 버전이 찍히면 파이썬이 있는 것입니다. Microsoft Store 창이 뜨거나 명령을 찾을 수 없다는 메시지가 나오면 파이썬이 없습니다. python.org 에서 받아 설치할 때 `Add python.exe to PATH` 를 체크하고 터미널을 새로 엽니다.

이제 터미널에 아래를 붙여 넣고 엔터를 누릅니다. 파이썬 파일에 적는 코드가 아니라 터미널에 직접 치는 명령입니다.

```powershell
python -m pip install segno
```

여러 줄이 지나가고 마지막에 `Successfully installed segno-1.6.6` 처럼 `Successfully installed` 로 시작하는 줄이 보이면 설치된 것입니다. 뒤의 번호는 받는 시점에 따라 다릅니다. 이미 깔려 있으면 `Requirement already satisfied` 가 나옵니다.

설치 줄을 `pip install segno` 로 알고 있다면 앞의 `python -m` 이 눈에 걸릴 겁니다. 컴퓨터에 파이썬이 여러 개 깔려 있으면 그냥 `pip` 는 엉뚱한 파이썬에 설치합니다. `python -m pip` 는 지금 이 터미널이 쓰는 파이썬에 설치합니다.

다음으로 코드를 넣을 파일을 만듭니다. 메모장을 열고 아래를 붙여 넣습니다.

```python
import os
import segno

qr = segno.make_qr("https://eddmpython.com")
qr.save("link.png", scale=8, border=4)
print(os.path.abspath("link.png"))
```

메모장에서 `파일` 메뉴의 `다른 이름으로 저장` 을 고르고, 파일 형식을 `모든 파일` 로 바꾼 다음 이름을 `make_qr.py` 로 적어 `qr` 폴더에 저장합니다. 파일 형식을 `텍스트 문서` 로 둔 채 저장하면 실제 이름이 `make_qr.py.txt` 가 되어 실행되지 않습니다. 윈도우는 뒤에 붙은 `.txt` 를 화면에서 숨기기 때문에 눈으로는 구분되지 않습니다.

핵심은 아래 세 줄 가운데 `make_qr` 과 `save` 이고, `os` 와 `print` 는 만든 파일이 어디 저장됐는지 화면에 찍어 주려고 붙인 것입니다. `segno.make_qr` 에 넣은 웹 주소가 QR코드로 바뀝니다. `qr.save` 는 그 QR코드를 `link.png` 라는 그림 파일로 저장합니다. `scale=8` 은 QR코드를 이루는 작은 네모 한 칸을 8픽셀로 그립니다. 화면에서 확인할 때는 이 값이면 넉넉합니다. 바깥 테두리를 네 칸 너비로 남기는 것이 `border=4` 인데, 카메라가 QR코드의 끝을 찾는 데 필요한 최소 여백입니다. 마지막 `print` 는 저장한 파일이 어디에 있는지 화면에 찍어 줍니다.

`segno.make` 가 아니라 `segno.make_qr` 인 것도 중요합니다. `make` 는 내용이 짧으면 마이크로 QR코드라는 더 작은 규격을 고르는데, 마이크로 QR코드를 읽지 못하는 카메라 앱이 있습니다. `make_qr` 은 내용이 짧아도 일반 QR코드만 만듭니다.

https://eddmpython.com/codaro/run/?example=qr-micro

아까 열어 둔 터미널에 아래를 칩니다.

```powershell
python make_qr.py
```

파일이 저장된 경로가 한 줄 찍힙니다.

```text
C:\Users\사용자이름\Desktop\qr\link.png
```

가운데 경로는 컴퓨터마다 다릅니다. 바탕화면이 OneDrive에 백업돼 있으면 `Desktop` 앞에 `OneDrive` 가 한 칸 더 붙습니다. 이 줄이 나왔으면 성공입니다.

파이썬을 아직 설치하지 않았다면 아래 칸에서 주소를 바꿔 크기만 먼저 볼 수 있습니다. 브라우저 안에서는 파일을 만들 수 없어 실제 PNG는 나오지 않습니다. 그림이 지금 필요하면 이 글 맨 위의 입력칸에서 만들어 내려받습니다.

https://eddmpython.com/codaro/run/?example=qr-first

`can't open file` 이 들어간 긴 메시지가 나오는 경우는 둘입니다. 파일 이름이 실제로는 `make_qr.py.txt` 이거나, 터미널이 다른 폴더를 보고 있는 것입니다. 터미널에 `dir` 을 치면 그 폴더의 진짜 파일 이름이 나옵니다. `make_qr.py.txt` 로 보이면 메모장에서 파일 형식을 `모든 파일` 로 두고 다시 저장합니다.

`ModuleNotFoundError: No module named 'segno'` 가 나오면 설치한 파이썬과 방금 실행한 파이썬이 서로 다른 것입니다. 이 터미널에서 `python -m pip install segno` 를 실행하고 다시 돌려 봅니다.

## 만든 파일 찾아서 휴대폰으로 찍어 보기

터미널을 열 때 쓴 파일 탐색기 창으로 돌아가면 `link.png` 가 보입니다. 창을 닫았다면 바탕화면의 `qr` 폴더를 다시 엽니다. 터미널에 찍힌 경로가 가리키는 곳이 그 폴더입니다. `link.png` 를 더블클릭해서 컴퓨터 화면에 띄웁니다.

휴대폰 카메라 앱을 켜고 화면 속 QR코드를 비춥니다. 잠깐 기다리면 `https://eddmpython.com` 이라는 주소가 화면 위에 뜹니다. 눌러서 그 주소가 열리면 QR코드가 제대로 만들어진 것입니다.

주소가 뜨지 않았다면 파일은 만들어졌지만 카메라가 QR코드를 읽지 못하는 상태입니다. 화면에 띄운 그림이 너무 작거나 화면이 너무 어두운지 봅니다. 그림을 확대해서 다시 찍으면 대개 읽힙니다.

주소가 열렸으면 이제 내 주소로 바꿉니다. `qr` 폴더에서 `make_qr.py` 를 오른쪽 클릭하고 `연결 프로그램` 에서 메모장을 고릅니다. 더블클릭하면 메모장이 열리는 대신 파일이 그대로 실행되니 오른쪽 클릭으로 엽니다.

열린 메모장에서 `make_qr("...")` 안의 주소를 안내문에 넣을 주소로 고치고 `Ctrl+S` 로 저장합니다. 터미널에서 `python make_qr.py` 를 다시 실행하면 `link.png` 가 새 주소로 다시 저장됩니다. 그 파일을 휴대폰으로 찍어 내 주소가 열리는지 확인합니다. 아래에서 쓸 주소도 이것입니다.

한 장짜리는 여기까지로 끝입니다. 주소가 여러 개이거나 종이에 올릴 것이라면 저장하는 방식이 달라집니다.

## 여러 주소를 한 번에 QR코드로 만들기

지금까지 만든 것은 `link.png` 한 장입니다. 안내문에 들어갈 주소가 여러 개라면 코드를 매번 고쳐 다시 실행해야 합니다. 목록으로 묶으면 한 번에 저장됩니다.

메모장으로 아래를 만들고 같은 방법으로 `make_many.py` 라는 이름으로 `qr` 폴더에 저장합니다.

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

같은 터미널에서 `python make_many.py` 를 실행하면 세 줄이 찍힙니다.

```text
home.png 저장했습니다
blog.png 저장했습니다
post.png 저장했습니다
```

`links` 는 파일 이름과 웹 주소를 짝지어 둔 목록입니다. 왼쪽이 저장할 파일 이름이 되고 오른쪽이 QR코드에 들어갈 주소입니다. 예제로 적은 세 줄을 내 주소로 고쳐 쓰고, 더 필요하면 같은 모양으로 한 줄씩 추가합니다.

`for name, url in links.items():` 는 목록을 위에서부터 한 줄씩 꺼내 왼쪽을 `name` 에, 오른쪽을 `url` 에 담습니다. 세 줄을 적었으니 세 번 돌면서 세 장을 저장합니다.

https://eddmpython.com/codaro/run/?example=qr-many

파일 이름을 왼쪽에 따로 적는 까닭은 주소를 그대로 쓸 수 없기 때문입니다. 주소 안의 `/` 와 `:` 는 파일 이름에 쓸 수 없는 기호라서 저장이 실패합니다.

세 장을 차례로 열어 각각 다른 주소로 열리는지 휴대폰으로 확인합니다. 지금까지 만든 파일은 전부 화면에서만 확인한 것입니다. 종이에 올리면 크기를 다시 잡아야 합니다.

## 인쇄할 QR코드 저장하기

명함에 넣을 QR코드는 어떤 크기로 저장해야 할까요? 종이 위의 크기는 절 끝에서 시험 인쇄 한 장이 알려 줍니다. 그 전에 파일부터 크게 저장해야 합니다. 화면에서 쓰던 `scale=8` 로는 모자랍니다. 작게 저장한 그림을 편집 프로그램에서 늘리면 칸의 가장자리가 뭉개집니다. 그 뭉개진 그림이 그대로 인쇄됩니다.

인쇄물에 넣을 것은 처음부터 크게 저장합니다. 메모장으로 아래를 만들어 `make_print.py` 로 저장합니다. 여기서도 주소는 앞에서 정한 내 주소로 고칩니다.

```python
import segno

qr = segno.make_qr("https://eddmpython.com")
qr.save("print.png", scale=20, border=4)
print(qr.symbol_size(scale=8, border=4))
print(qr.symbol_size(scale=20, border=4))
```

같은 터미널에서 `python make_print.py` 를 실행하면 `print.png` 가 저장되고 두 줄이 찍힙니다.

```text
(264, 264)
(660, 660)
```

`symbol_size` 는 파일이 가로세로 몇 픽셀로 저장되는지 알려 줍니다. 위가 앞에서 만든 `link.png` 의 크기이고 아래가 방금 저장한 `print.png` 의 크기입니다. 660픽셀은 화면용 264픽셀의 두 배 반이라, 안내문이나 명함에 앉혀도 칸의 가장자리가 뭉개지지 않습니다.

`border=4` 는 그대로 둡니다. QR코드를 만든 덴소웨이브도 [공식 설명](https://www.qrcode.com/en/howto/code.html)에서 네 변 모두에 네 칸 너비의 여백이 필요하다고 밝힙니다. 어두운 배경의 포스터에서는 이 흰 테두리가 눈에 띄어 잘라 내고 싶어집니다. 잘라 내면 화면에서 읽히던 QR코드가 인쇄물에서 안 읽힙니다.

종이에 찍히는 크기는 파일이 몇 픽셀인지만 보고 정할 수 없습니다. 편집 프로그램에서 몇 cm로 배치했는지, 프린터가 확대하거나 줄였는지에 따라 달라집니다. `print.png` 를 실제로 쓸 크기로 한 장 인쇄해서 휴대폰으로 찍어 봅니다. 그 한 장이 읽히면 같은 크기로 나머지도 그대로 씁니다.

앞에서 만든 세 장도 인쇄물에 넣을 것이라면 `make_many.py` 의 `scale=8` 을 `scale=20` 으로 바꿔 다시 실행합니다.

## 더 해 볼 것

여기까지 왔으면 화면과 종이 양쪽에서 읽히는 PNG를 갖고 있습니다. 아래는 필요할 때 꺼내 쓰는 것들입니다.

- 인쇄소에 넘길 파일은 PNG 대신 SVG로 저장합니다. `qr.save("link.svg", scale=8, border=4)` 처럼 확장자만 바꾸면 됩니다.
- 브랜드 색은 저장할 때 `dark` 와 `light` 로 정합니다. `qr.save("navy.png", scale=8, border=4, dark="#1b3a5c", light="white")` 처럼 적습니다.
- `make` 와 `make_qr` 의 차이는 `is_micro` 로 찍어 볼 수 있습니다. `print(segno.make("naver.com").is_micro, segno.make_qr("naver.com").is_micro)` 를 실행하면 `True False` 가 나옵니다.
- QR코드에는 여분의 데이터가 함께 들어갑니다. 일부가 가려져도 그 데이터로 내용을 되살려 읽습니다. Segno가 그 양을 어떻게 정하는지는 [공식 문서](https://segno.readthedocs.io/en/stable/boost-error-correction-level.html)에 있습니다.
- 도안을 코드 없이 잡아 보려면 이 글 맨 위의 입력칸에서 `모듈 크기` 와 `테두리 여백` 슬라이더를 움직여 봅니다. 두 슬라이더가 각각 `scale` 과 `border` 입니다.

무엇을 하든 마지막은 같습니다. 저장한 파일을 쓸 자리에 올려 놓고 휴대폰으로 한 번 찍어 봅니다.
