---
title: xlwings Lite, 엑셀 안에서 파이썬을 시작하는 방법
slug: xlwings-lite
author: eddmpython
section: 엑셀과 파이썬
summary: xlwings Lite 기본 예제로 열린 시트의 A1에 문장을 씁니다. 기초 문법은 Codaro에서 시작하고, 문법 공부에서 막히면 pandas 실습과 공식 치트시트로 바로 넘어갑니다.
readerQuestion: 엑셀에서 바로 파이썬을 쓰려면 무엇을 열고 어디부터 배우면 될까?
readerTakeaway: xlwings Lite는 열린 엑셀을 읽고 쓰는 자리이며, 표 처리 문법은 Codaro의 pandas 과정과 공식 치트시트로 익힐 수 있다.
readerLevel: beginner
readerStartingPoint: 엑셀에서 셀과 시트를 다룰 줄 알지만 파이썬을 설치하거나 코드를 작성해 본 적은 없다.
primaryKeyword: xlwings Lite
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/51/5155d93ab956d89c89325c352ac5ffc1d4265456c2887debdfc56eec1ca54dd1.png
ogImageAlt: Excel 홈 리본에 추가된 xlwings Lite 버튼
ogImageWidth: 573
ogImageHeight: 232
ogImageType: image/png
---

엑셀 표를 파이썬으로 다뤄 보고 싶은데, 파이썬 설치 방법과 파일 경로가 낯설 수 있습니다. 지금 열어 둔 시트에서 시작하고 싶다면 xlwings 중에서도 **xlwings Lite**를 고르면 됩니다.

새 통합문서에서 Python 기본 예제를 실행해 A1에 `Hello xlwings!`를 써 봅니다. 필요한 문법을 배울 Codaro 과정과 pandas 치트시트도 함께 연결해 두었습니다.

## xlwings Lite 열기
### Excel 추가 기능을 설치하면 시트 옆에 Python 편집기가 열립니다

![Excel 홈 리본에 추가된 xlwings Lite 버튼](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/51/5155d93ab956d89c89325c352ac5ffc1d4265456c2887debdfc56eec1ca54dd1.png "xlwings Lite 공식 안내 화면")

출처: [Zoomer Analytics GmbH](https://lite.xlwings.org/quickstart). 공식 공개 화면을 인용했습니다.

xlwings Lite는 Excel 추가 기능 안에서 Python을 실행합니다. 컴퓨터에 Python을 따로 설치하지 않아도 되며, 개인과 업무 용도로 무료로 쓸 수 있습니다. Windows와 Mac의 Microsoft 365 및 Office 2021 이상, 웹용 Excel을 지원합니다. Mac은 macOS 13 이상이 필요합니다. [공식 시작 안내](https://lite.xlwings.org/quickstart)

연습용 새 통합문서를 열고 아래 순서로 추가합니다. xlwings Lite 자체는 가입을 요구하지 않지만, 웹용 Excel을 쓴다면 Excel에 접속할 Microsoft 계정은 필요합니다.

1. Excel의 `홈(Home)`에서 `추가 기능(Add-ins)`을 엽니다. Excel 버전에 따라 `삽입(Insert)`에 있습니다
2. `xlwings`를 검색하고 `추가(Add)`를 누릅니다
3. 시트 오른쪽에 xlwings Lite 편집기가 열리는지 확인합니다

회사에서 추가 기능 스토어를 막아 뒀다면 사내 IT 담당자에게 xlwings Lite 설치를 요청해야 합니다. 개인 컴퓨터의 Python 설치로 해결할 단계는 아닙니다.

## 열린 셀에 바로 쓰기
### 기본 스크립트로 Excel과 Python이 연결되는 자리를 봅니다

![xlwings Lite 공식 문서의 기본 스크립트와 셀에 값을 쓰는 코드](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c8/c85587ad23d6a24051606b87a8d0199c13546a9171892e253f035201f8b5ba81.png "공식 Scripts 문서의 기본 예제")

출처: [Zoomer Analytics GmbH](https://lite.xlwings.org/custom-scripts). 공식 공개 화면을 인용했습니다.

편집기를 열면 `main.py`에 기본 예제가 들어 있습니다. 새 통합문서의 첫 시트를 비워 둔 상태에서 초록색 `Run Hello World` 버튼을 누릅니다. 기본 예제가 없거나 이미 코드를 바꿨다면 [공식 Scripts 문서의 Button Label 예제](https://lite.xlwings.org/custom-scripts#button-label)를 `main.py`에 넣고 같은 버튼을 누르면 됩니다. 예제는 첫 시트의 A1에 `Hello xlwings!`를 씁니다.

어떻게 지금 열린 엑셀을 찾을까요? 공식 예제의 `book`은 현재 통합문서를 가리킵니다. `sheet = book.sheets[0]`은 첫 시트를 `sheet`라는 이름으로 부르는 코드입니다. 따라서 `sheet["A1"].value`는 첫 시트 A1의 값을 가리킵니다. 파일 경로를 적지 않아도 어느 시트의 어느 셀을 바꿀지 코드로 지정하는 방식입니다.

열린 시트에 결과를 쓰는 작업은 스크립트부터 시작합니다. `Run Hello World`를 눌렀을 때 A1에 `Hello xlwings!`가 나타나면, Python 코드가 현재 통합문서의 셀을 바꾼 것입니다.

## 기초 문법은 Codaro에서
### 변수와 함수가 낯설면 짧은 예제를 바꾸며 익힙니다

![Codaro의 파이썬 첫 수업과 실행할 예제](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e6/e65e858bfad623ccb0abc19f59761710afce17df257350ef7f4cffd8097f82fa.png "Codaro 파이썬 기초 과정")

출처: [eddmpython](https://eddmpython.github.io/codaro/learn/lesson/30days/day01_%ED%97%AC%EB%A1%9C%EC%9B%94%EB%93%9C/). 공식 공개 화면을 인용했습니다.

`book` 같은 이름에 값을 붙이는 방식이나 함수의 들여쓰기가 낯설다면 [Codaro 파이썬 기초 첫 수업](https://eddmpython.github.io/codaro/learn/lesson/30days/day01_헬로월드/)에서 시작합니다. Codaro는 설명을 읽고 Python 예제를 실행하며 배우는 학습 도구입니다. 첫 수업에서 출력할 문장을 바꿔 보고, 변수와 함수로 공부 범위를 넓히면 됩니다.

Codaro에서 익힐 것은 Python 문법입니다. **지금 열린 Excel 통합문서에 접근하는 코드는 xlwings Lite에서 실행합니다.** Codaro 학습 화면을 열었다고 내 Excel의 셀이 연결되는 것은 아닙니다.


## 문법에서 막히면 pandas부터
### 엑셀의 필터와 집계를 표 처리 코드에 연결합니다

![Codaro pandas 입문의 학습 내용과 첫 설명](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ac/ac3f508d341a1e41e2adc74265964ef1139d20ec87a9ea7d98daf751947d380b.png "Codaro pandas 입문 과정")

출처: [eddmpython](https://eddmpython.github.io/codaro/learn/lesson/pandas/00_%ED%8C%90%EB%8B%A4%EC%8A%A4%EC%86%8C%EA%B0%9C/). 공식 공개 화면을 인용했습니다.

기초 문법 공부가 잘 안 풀린다면 전 과정을 끝낼 때까지 엑셀 작업을 미룰 필요는 없습니다. 표를 다루는 일이 목적이라면 pandas부터 시작해 보세요

pandas는 행과 열로 된 데이터를 계산하는 Python 라이브러리입니다. pandas에서 다루는 표를 `DataFrame`이라고 부릅니다. 엑셀에서 열을 고르고, 조건에 맞는 행만 남기고, 부서별 합계를 구하던 일을 코드로 표현할 수 있습니다.

[Codaro pandas 입문](https://eddmpython.github.io/codaro/learn/lesson/pandas/00_판다스소개/)을 열고 표의 열 이름과 값을 먼저 살펴봅니다. 표의 모양을 확인했다면 [레스토랑 팁 분석](https://eddmpython.github.io/codaro/learn/lesson/pandas/01_레스토랑팁분석/)처럼 데이터가 있는 수업에서 행 선택과 집계에 필요한 Python 문법을 함께 익힙니다.

xlwings Lite와 pandas는 맡은 일이 다릅니다. **xlwings Lite는 Excel의 셀을 읽고 쓰고, pandas는 읽어 온 표를 계산합니다.** 예를 들어 부서별 매출 합계라면 시트에서 매출표를 읽고, pandas로 부서별 금액을 더한 뒤, 합계표를 시트에 씁니다. pandas를 배워 두면 가운데 계산 부분을 바꿀 수 있습니다.


## pandas 치트시트 곁에 두기
### 함수 이름이 기억나지 않을 때 필요한 동작으로 찾습니다

![pandas 공식 치트시트의 표 생성, 정렬, 행과 열 선택 구역](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/85/852a987f4825928cc78735de0978272378f52ad1495b6ef1c594b3426c091ed2.png "pandas 공식 치트시트 PDF 첫 페이지")

출처: [pandas contributors; Irv Lustig, Princeton Consultants](https://pandas.pydata.org/Pandas_Cheat_Sheet.pdf). 공식 PDF 첫 페이지를 원문 그대로 표시했습니다. [사용 조건](https://github.com/pandas-dev/pandas/blob/main/LICENSE)

[pandas 공식 치트시트 PDF 열기](https://pandas.pydata.org/Pandas_Cheat_Sheet.pdf)

치트시트는 pandas의 자주 쓰는 문법을 모은 참고표입니다. 처음부터 외우기보다 Codaro의 pandas 예제를 바꾸다가 함수 이름이 생각나지 않을 때 펼쳐 둡니다. 영문 자료지만 표 선택, 정렬, 집계처럼 하려는 일에 따라 구역이 나뉘어 있습니다.

| 엑셀에서 하던 일 | 치트시트에서 찾을 구역 |
|---|---|
| 필요한 열만 고르기 | Subset Variables |
| 조건에 맞는 행 남기기 | Subset Observations |
| 금액순으로 정렬하기 | Reshaping Data |
| 부서별 합계 구하기 | Group Data |

치트시트 예제의 열 이름은 자기 데이터에 맞게 바꿔야 합니다. 치트시트는 문법을 찾는 곳이고, 값을 바꾼 뒤 결과가 어떻게 달라지는지는 Codaro 예제에서 확인합니다.


## 더 해 볼 것

- 셀에서 Python 함수를 직접 부르려면 [xlwings Lite 사용자 함수 안내](https://lite.xlwings.org/custom-functions)를 봅니다
- pandas 표를 Excel 범위로 읽고 쓰는 형식은 [xlwings DataFrame 변환 안내](https://docs.xlwings.org/en/stable/converters.html#pandas-dataframe-converter)에서 확인합니다
- xlwings Lite에서도 pandas를 쓰려면 [패키지 설치 안내](https://lite.xlwings.org/dependencies)를 확인합니다
- 다른 xlwings 예제를 가져올 때는 [Lite 지원 범위](https://lite.xlwings.org/custom-scripts#limitations)를 확인합니다
