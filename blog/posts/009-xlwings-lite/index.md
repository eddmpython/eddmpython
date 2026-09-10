---
title: xlwings Lite, 엑셀 안에서 파이썬을 시작하는 방법
slug: xlwings-lite
author: eddmpython
section: 엑셀과 파이썬
summary: 엑셀을 열어 둔 채 파이썬으로 A1 셀에 문장을 써 봅니다. xlwings Lite 사용법과 .xlsx의 ZIP 구조를 설명하고, Codaro 기초 과정과 pandas 실습 및 치트시트를 안내합니다.
readerQuestion: 엑셀에서 바로 파이썬을 쓰려면 무엇을 열고 어디부터 배우면 될까?
readerTakeaway: xlwings Lite로 현재 통합문서의 셀을 바꾸고, .xlsx 파일을 외부 프로그램으로 수정할 수 있는 이유를 이해한다. 필요한 문법은 Codaro에서 연습한다.
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

엑셀 작업을 파이썬으로 자동화하고 싶은데, 설치부터 막히셨나요? **xlwings Lite를 쓰면 엑셀을 열어 둔 채 파이썬 코드를 실행할 수 있습니다.** 컴퓨터에 파이썬을 따로 설치할 필요도 없습니다.

먼저 기본 예제를 실행해 A1 셀에 `Hello xlwings!`를 써 보겠습니다. 코드가 낯설 때 공부할 곳과, 엑셀 파일을 외부에서도 수정할 수 있는 이유도 함께 설명합니다.

## xlwings Lite 열기
### Excel 추가 기능을 설치하면 시트 옆에 Python 편집기가 열립니다

![Excel 홈 리본에 추가된 xlwings Lite 버튼](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/51/5155d93ab956d89c89325c352ac5ffc1d4265456c2887debdfc56eec1ca54dd1.png "xlwings Lite 공식 안내 화면")

출처: [Zoomer Analytics GmbH](https://lite.xlwings.org/quickstart). 공식 공개 화면을 인용했습니다.

xlwings Lite는 개인과 업무 용도로 무료로 쓸 수 있습니다. Windows와 Mac의 Microsoft 365 및 Office 2021 이상, 웹용 Excel을 지원합니다. Mac에서는 macOS 13 이상이 필요합니다. [공식 시작 안내](https://lite.xlwings.org/quickstart)

연습용 새 통합문서를 열고 xlwings Lite를 추가합니다. 웹용 Excel을 쓴다면 먼저 Microsoft 계정으로 Excel에 접속합니다.

1. Excel의 `홈(Home)`에서 `추가 기능(Add-ins)`을 엽니다. Excel 버전에 따라 `삽입(Insert)`에 있습니다
2. `xlwings`를 검색하고 `추가(Add)`를 누릅니다
3. 시트 오른쪽에 xlwings Lite 편집기가 열리는지 확인합니다

회사에서 추가 기능 설치를 제한한다면 사내 IT 담당자에게 설치를 요청해야 합니다. 설치 후 오른쪽에 편집기가 나타나면, 그 안에 있는 기본 예제를 실행할 수 있습니다.

## A1 셀에 문장 쓰기
### 실행 버튼을 누르면 A1 셀에 문장이 나타납니다

![xlwings Lite 공식 문서의 기본 스크립트와 셀에 값을 쓰는 코드](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c8/c85587ad23d6a24051606b87a8d0199c13546a9171892e253f035201f8b5ba81.png "공식 Scripts 문서의 기본 예제")

출처: [Zoomer Analytics GmbH](https://lite.xlwings.org/custom-scripts). 공식 공개 화면을 인용했습니다.

편집기를 열면 `main.py`에 기본 예제가 들어 있습니다. 새 통합문서의 첫 시트를 비워 둔 상태에서 초록색 `Run Hello World` 버튼을 누릅니다. 기본 예제가 없거나 이미 코드를 바꿨다면 [공식 Scripts 문서의 Button Label 예제](https://lite.xlwings.org/custom-scripts#button-label)를 `main.py`에 넣고 같은 버튼을 누르면 됩니다. 예제는 첫 시트의 A1에 `Hello xlwings!`를 씁니다.

코드는 어느 엑셀 파일을 바꿀지 어떻게 알까요? 예제에서 `book`은 지금 열어 둔 통합문서를 뜻합니다. `book.sheets[0]`은 그 문서의 첫 시트입니다. 파이썬에서는 순서를 0부터 세기 때문입니다. `sheet = book.sheets[0]`으로 첫 시트에 `sheet`라는 이름을 붙이고, `sheet["A1"].value`에 문장을 넣으면 A1 셀의 값이 바뀝니다. 그래서 파일 경로를 따로 입력하지 않아도 현재 통합문서에 문장을 쓸 수 있습니다.

A1에 `Hello xlwings!`가 나타났다면 파이썬으로 엑셀의 셀을 바꿔 본 셈입니다. 기본 예제 실행은 여기까지입니다. 아래부터는 저장된 엑셀 파일의 구조를 확인하고, 코드를 직접 바꿀 때 필요한 문법을 찾아봅니다.

## .xlsx 파일은 ZIP이다
### Excel을 켜지 않고 저장된 파일 내용을 바꿀 수 있습니다

[엑셀 파일을 압축파일로 열어 보는 영상](https://www.youtube.com/shorts/l4J3QvePJtQ)

**일반적인 `.xlsx` 파일은 여러 파일을 ZIP으로 묶어 놓은 압축파일입니다.** 그래서 엑셀을 켜지 않고도 다른 프로그램으로 저장된 파일 내용을 읽고 수정할 수 있습니다. 압축을 풀면 셀의 값, 수식, 서식 등을 기록한 XML 파일이 나옵니다. XML은 글자로 내용을 기록하는 형식이라 다른 프로그램에서도 읽고 고칠 수 있습니다. 엑셀은 그 내용을 읽어서 우리가 아는 셀과 시트 모양으로 보여 줍니다. [Microsoft의 파일 구조 설명](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document)

영상처럼 직접 확인하려면 먼저 연습용 통합문서를 컴퓨터에 `.xlsx` 파일로 저장합니다. 웹용 Excel에서는 `파일` 메뉴에서 사본을 내려받습니다. 저장한 파일을 복사하고 복사본의 확장자만 `.zip`으로 바꿔 엽니다. Windows에서 확장자가 안 보이면 파일 탐색기의 `보기 > 표시 > 파일 확장명`을 켭니다. 압축파일 안의 `xl/worksheets` 폴더를 찾아보세요

XML 내용을 프로그램으로 고치고 다시 ZIP으로 묶으면, 엑셀을 켜지 않고도 저장된 내용을 바꿀 수 있습니다. 다만 엑셀이 다시 읽을 수 있도록 내부 파일의 구조와 연결 관계는 유지해야 합니다. 이 방식은 암호화되지 않은 `.xlsx`에 해당하며, 옛 `.xls` 파일에는 적용되지 않습니다.

xlwings Lite에서 작성한 파이썬 코드도 통합문서 안에 저장됩니다. 따라서 외부 프로그램으로 통합문서에 저장된 코드를 교체할 수도 있습니다. 교체한 코드는 엑셀에서 xlwings Lite를 열어 실행합니다. AI가 통합문서 안의 코드를 교체할 때 따를 지침은 스킬 문서에 담았습니다. 문서 링크는 글 끝에 있습니다. [공식 코드 저장 설명](https://lite.xlwings.org/self-hosting)

문장을 바꾸거나 다른 셀에 쓰는 코드를 직접 작성하고 싶다면 파이썬 문법을 조금씩 익혀 보세요

## 기초 문법은 Codaro에서
### 변수와 함수가 낯설면 짧은 예제를 바꾸며 익힙니다

![Codaro의 파이썬 첫 수업과 실행할 예제](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e6/e65e858bfad623ccb0abc19f59761710afce17df257350ef7f4cffd8097f82fa.png "Codaro 파이썬 기초 과정")

출처: [eddmpython](https://eddmpython.github.io/codaro/learn/lesson/30days/day01_%ED%97%AC%EB%A1%9C%EC%9B%94%EB%93%9C/). 공식 공개 화면을 인용했습니다.

파이썬 코드를 처음 본다면 [Codaro 파이썬 기초 첫 수업](https://eddmpython.github.io/codaro/learn/lesson/30days/day01_헬로월드/)을 열어 보세요

Codaro는 브라우저에서 설명을 읽고 파이썬 코드를 실행해 볼 수 있는 학습 도구입니다. 첫 수업에서는 화면에 출력할 문장을 바꿔 봅니다. 실행 결과가 달라지는 것을 확인한 뒤, 변수와 함수를 차례로 배우면 됩니다.

Codaro에서 문법을 연습하고, 엑셀의 셀을 다룰 때는 xlwings Lite로 돌아오면 됩니다. 기초 과정을 순서대로 공부하기가 어렵다면, 익숙한 표를 다루면서 필요한 문법부터 배우는 방법도 있습니다.

## 문법에서 막히면 pandas부터
### 익숙한 표를 다루며 필요한 문법부터 배웁니다

![Codaro pandas 입문의 학습 내용과 첫 설명](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ac/ac3f508d341a1e41e2adc74265964ef1139d20ec87a9ea7d98daf751947d380b.png "Codaro pandas 입문 과정")

출처: [eddmpython](https://eddmpython.github.io/codaro/learn/lesson/pandas/00_%ED%8C%90%EB%8B%A4%EC%8A%A4%EC%86%8C%EA%B0%9C/). 공식 공개 화면을 인용했습니다.

기초 문법 공부가 잘 안 풀린다면 전 과정을 끝낼 때까지 엑셀 작업을 미룰 필요는 없습니다. 표를 다루는 일이 목적이라면 pandas 실습부터 시작해도 됩니다. pandas는 파이썬으로 표를 읽고 가공할 때 쓰는 라이브러리입니다. 엑셀에서 필요한 열을 고르거나, 조건에 맞는 행만 남기거나, 부서별 합계를 구하던 일을 코드로 할 수 있습니다.

[Codaro pandas 입문](https://eddmpython.github.io/codaro/learn/lesson/pandas/00_판다스소개/)에서 표의 열 이름과 값을 살펴봅니다. 행을 고르고 합계를 구하는 코드는 [레스토랑 팁 분석](https://eddmpython.github.io/codaro/learn/lesson/pandas/01_레스토랑팁분석/) 수업에서 연습합니다. 예제를 실행하면서 필요한 파이썬 문법을 함께 익힐 수 있습니다.

배운 pandas 코드는 xlwings Lite와 함께 쓸 수 있습니다. 예를 들어 부서별 매출을 집계한다면, xlwings Lite로 시트의 매출표를 읽고 pandas로 부서별 금액을 더한 뒤 결과를 다시 시트에 씁니다. **표를 읽고 쓰는 일은 xlwings Lite가, 표를 계산하는 일은 pandas가 맡는 것입니다.**

예제를 따라 하다 보면 함수 이름이 기억나지 않을 때가 있습니다. 그때는 필요한 문법을 모아 놓은 치트시트를 찾아보면 됩니다.

## pandas 치트시트 곁에 두기
### 열 선택, 정렬, 합계에 쓸 함수를 찾아봅니다

![pandas 공식 치트시트의 표 생성, 정렬, 행과 열 선택 구역](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/85/852a987f4825928cc78735de0978272378f52ad1495b6ef1c594b3426c091ed2.png "pandas 공식 치트시트 PDF 첫 페이지")

출처: [pandas contributors; Irv Lustig, Princeton Consultants](https://pandas.pydata.org/Pandas_Cheat_Sheet.pdf). 공식 PDF 첫 페이지를 원문 그대로 표시했습니다. [사용 조건](https://github.com/pandas-dev/pandas/blob/main/LICENSE)

[pandas 공식 치트시트 PDF 열기](https://pandas.pydata.org/Pandas_Cheat_Sheet.pdf)

공식 치트시트는 영문 자료지만 열 선택, 정렬, 집계처럼 하려는 일에 따라 구역이 나뉘어 있습니다. 엑셀에서 하던 일을 기준으로 아래 표에서 필요한 구역을 찾아보세요

| 엑셀에서 하던 일 | 치트시트에서 찾을 구역 |
|---|---|
| 필요한 열만 고르기 | Subset Variables |
| 조건에 맞는 행 남기기 | Subset Observations |
| 금액순으로 정렬하기 | Reshaping Data |
| 부서별 합계 구하기 | Group Data |

찾은 예제를 쓸 때는 열 이름을 지금 다루는 표에 맞게 바꿔 줍니다. Codaro 예제에서 선택할 열이나 조건을 하나 바꾸고 다시 실행해 보세요

출력된 표에서 원하는 열과 행이 남았는지 확인하면, 코드가 무슨 일을 했는지 눈으로 알 수 있습니다.

## 더 해 볼 것

- 통합문서 안의 Python 코드를 외부에서 바꾸려면 AI에게 [xlwings Lite ZIP 수정 스킬](https://github.com/eddmpython/eddmpython/blob/main/blog/posts/009-xlwings-lite/xlwings-lite-zip/SKILL.md) 주소와 연습용 통합문서, 교체할 Python 파일을 함께 줍니다
- 셀에서 Python 함수를 직접 부르려면 [xlwings Lite 사용자 함수 안내](https://lite.xlwings.org/custom-functions)를 봅니다
- pandas 표를 Excel 범위로 읽고 쓰는 형식은 [xlwings DataFrame 변환 안내](https://docs.xlwings.org/en/stable/converters.html#pandas-dataframe-converter)에서 확인합니다
- xlwings Lite에서도 pandas를 쓰려면 [패키지 설치 안내](https://lite.xlwings.org/dependencies)를 확인합니다
- 다른 xlwings 예제를 가져올 때는 [Lite 지원 범위](https://lite.xlwings.org/custom-scripts#limitations)를 확인합니다
