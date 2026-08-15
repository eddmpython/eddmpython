---
title: Python 기초문법 6가지를 영상과 실행 셀로 배우는 방법
slug: python-basic-syntax
author: eddmpython
section: Python 학습과 자동화
summary: Python 기초문법 배우는 방법을 1분 영상과 실행 셀로 설명합니다. 변수, 리스트, 딕셔너리, 조건문, 반복문, 함수를 지출내역 예제로 직접 바꿉니다.
readerQuestion: Python 기초문법을 외우지 않고 영상과 실행 셀에서 값을 바꾸며 배우는 방법은 무엇일까?
readerTakeaway: 변수부터 함수까지 하나의 지출내역 예제로 값을 바꾸고 결과를 예측한 뒤 실행하면 문법의 쓰임을 연결할 수 있다.
readerLevel: beginner
readerStartingPoint: 브라우저에서 Python 코드를 한 번 실행했지만 변수, 리스트, 조건문과 함수가 업무에서 언제 쓰이는지는 모른다.
primaryKeyword: Python 기초문법 배우는 방법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fc/fcfc19b3f647af1361c0935afb59d78f6277a113826f2b9cc06433cf2339b357.png
ogImageAlt: 짧은 세로 영상의 여섯 문법 카드가 각각 실행 가능한 코드 셀과 지출내역 결과로 연결된 학습 지도
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 기초문법 배우는 방법을 검색하면 변수부터 함수까지 정의가 한꺼번에 나옵니다. 이름만 외우면
코드에서 어느 값을 바꾸고 어떤 결과를 봐야 하는지 알기 어렵습니다.

이 글에서는 1분 영상으로 Python 기초문법 지도를 먼저 봅니다. 이어서 지출 금액과 부서 이름을 직접
바꾸는 실행 셀 여섯 개를 사용하고, 마지막 셀에서 여섯 문법을 한 번에 연결합니다.

## Python 기초문법 지도를 영상으로 봅니다

### 1분 영상에서 여섯 개념의 이름만 찾고 바로 첫 실행 셀로 이동합니다

![짧은 세로 영상의 여섯 문법 카드가 각각 실행 가능한 코드 셀과 지출내역 결과로 연결된 학습 지도](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fc/fcfc19b3f647af1361c0935afb59d78f6277a113826f2b9cc06433cf2339b357.png "영상은 전체 위치를 보여 주고 각 실행 셀은 값을 바꿨을 때 달라지는 결과를 보여 줍니다")

아래 영상은 `파이썬 필수 기초 1분이면 충분합니다`라는 짧은 전체 지도입니다. 영상을 보면서 변수,
리스트, 딕셔너리, 조건문, 반복문, 함수라는 이름이 어디에 나오는지만 확인합니다.

영상만 보고 문법을 이해했다고 판단하지는 않습니다. 영상이 끝나면 바로 다음 절의 실행 셀에서
`영업팀`과 `100000`을 다른 값으로 바꿉니다. 입력을 바꾸기 전에는 결과가 어떻게 달라질지도 먼저
예상합니다.

https://www.youtube.com/shorts/priwCYZJ8h4

#### 확인 목록

- 값 하나를 이름에 저장하는 개념이 변수입니다.
- 여러 값을 한 묶음으로 두는 개념이 리스트입니다.
- 이름과 이름을 짝으로 연결하는 개념이 딕셔너리입니다.
- 기준에 따라 결과를 나누는 개념이 조건문입니다.
- 여러 값에 같은 일을 적용하는 개념이 반복문입니다.
- 같은 규칙을 다시 쓰도록 묶는 개념이 함수입니다.

## 변수는 바꿀 값에 이름을 붙입니다

### 부서와 금액 및 기준값을 서로 다른 이름에 저장하고 결과를 확인합니다

![영업팀과 지출금액 및 기준금액 카드가 department amount amount_limit 세 저장칸에 각각 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/cd/cd7ce7ab554b1392b5ab7337770ab2d10d2dfb376a8c4ea4e0eedd197e16039e.png "변수 이름을 보면 어떤 업무값이 저장됐는지 찾고 오른쪽 값만 바꿀 수 있습니다")

변수는 값을 담아 두는 이름입니다. `department = "영업팀"`은 영업팀이라는 글자를
`department`라는 이름으로 저장합니다. 다음 줄에서 `department`를 쓰면 저장한 글자를 다시 가져올
수 있습니다.

아래 셀에서 `영업팀`을 `관리팀`으로 바꾸고 실행합니다. 마지막 결과의 부서도 관리팀으로 바뀌면
성공입니다. 그다음 `amount_limit`을 `150000`으로 바꿔 기준금액도 별도 값이라는 점을 확인합니다.

https://eddmpython.com/codaro/run/?example=expense-variables

#### 참고 자료

- [Python 공식 튜토리얼의 변수 할당 설명](https://docs.python.org/3/tutorial/introduction.html#numbers)

## 리스트는 여러 금액을 한 번에 묶습니다

### 대괄호 안에 거래 금액을 넣고 건수와 합계를 한 번에 계산합니다

![서로 다른 지출 금액 카드 세 장이 하나의 대괄호 목록 안으로 들어가 건수와 합계 결과로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/68/68070b3221c00ebcea5fbc31528312641bd9fc6fd5db65cb86c82debda3b6af0.png "리스트에 금액을 추가하면 같은 목록을 사용하는 건수와 합계가 함께 달라집니다")

리스트는 여러 값을 순서대로 담는 묶음입니다. `amounts = [50000, 120000, 80000]`에는 거래 금액
세 개가 들어 있습니다. `len(amounts)`는 값의 개수를 세고 `sum(amounts)`는 금액을 모두 더합니다.

아래 셀을 먼저 실행하면 `3건, 합계 250,000원`이 나옵니다. 목록 끝에 `30000`을 추가하고 다시
실행했을 때 `4건, 합계 280,000원`으로 바뀌면 리스트와 계산의 연결을 확인한 것입니다.

https://eddmpython.com/codaro/run/?example=expense-list-total

#### 참고 자료

- [Python 공식 튜토리얼의 리스트 설명](https://docs.python.org/3/tutorial/introduction.html#lists)

## 딕셔너리는 이름 변환표를 만듭니다

### 서로 다른 Excel 열 이름을 표준 열 이름과 한 쌍으로 연결합니다

![사용일 조직 사용금액 세 원본 열 카드가 일자 부서 금액 세 표준 열 카드와 한 쌍씩 연결된 변환표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/88/88f1273c59fc9d28554f8b6c7eee6a07df1bd43c22990ceffbbb7774341f56fd.png "왼쪽 키를 찾으면 오른쪽 값에 저장된 표준 열 이름을 얻습니다")

딕셔너리는 키와 값을 한 쌍으로 저장합니다. 이번 예제에서는 원본 파일의 `사용금액`을 표준 열 이름
`금액`과 연결합니다. 원본 파일마다 열 이름이 조금 달라도 같은 표준 이름으로 바꿀 때 사용할 수
있습니다.

아래 셀에서 `column_name`을 `사용금액`으로 실행하면 `금액`이 나옵니다. 이를 `조직`으로 바꿨을 때
`부서`가 나오면 딕셔너리의 왼쪽 이름으로 오른쪽 값을 찾은 것입니다.

https://eddmpython.com/codaro/run/?example=expense-column-map

#### 참고 자료

- [Python 공식 튜토리얼의 딕셔너리 설명](https://docs.python.org/3/tutorial/datastructures.html#dictionaries)

## 조건문은 기준에 따라 결과를 나눕니다

### 금액이 기준 이상이면 확인필요로 표시하고 그렇지 않으면 정상으로 표시합니다

![지출금액 카드가 기준금액 비교 지점을 지나 정상과 확인필요 두 결과 카드 중 하나로 이동하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/93/938fedb10321e58d5fbefe95d78fee444df1a98900a05019879e9fba72db8a62.png "조건문의 비교 결과가 참이면 위 결과를, 거짓이면 아래 결과를 선택합니다")

조건문은 비교 결과에 따라 실행할 줄을 나눕니다. `amount >= amount_limit`은 지출 금액이 기준금액보다
크거나 같은지 묻습니다. 맞으면 `확인필요`, 아니면 `정상`을 `result`에 저장합니다.

아래 셀에서 금액을 `99999`로 실행한 뒤 `100000`으로 바꿉니다. 기준과 같은 `100000`부터
확인필요가 나오면 `>=`에 같은 값도 포함된다는 뜻을 실제 결과로 확인한 것입니다.

https://eddmpython.com/codaro/run/?example=expense-condition

#### 참고 자료

- [Python 공식 튜토리얼의 if 조건문 설명](https://docs.python.org/3/tutorial/controlflow.html#if-statements)

## 반복문은 같은 판단을 여러 번 합니다

### 리스트의 금액을 앞에서부터 하나씩 꺼내 같은 조건으로 분류합니다

![금액 목록의 세 카드가 같은 비교 장치를 차례로 통과해 세 줄의 분류 결과로 쌓이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/74/741f080e209bb42b9f575de9f2d92b71c3c18e3928aa9f1bdfc1816cdaa901e9.png "반복문은 목록의 첫 값부터 마지막 값까지 같은 코드 블록을 다시 실행합니다")

반복문은 여러 값에 같은 일을 적용합니다. `for amount in amounts`는 리스트에서 금액을 하나씩 꺼내
`amount`에 넣습니다. 아래에 들여쓴 조건문은 금액 개수만큼 다시 실행됩니다.

아래 셀의 목록에 `100000`을 추가하고 실행합니다. 결과가 네 줄이 되고 새 금액도 확인필요로
분류되면 반복문이 추가한 값까지 처리한 것입니다. 목록 길이를 바꿔도 조건문을 복사할 필요가 없습니다.

https://eddmpython.com/codaro/run/?example=expense-loop

#### 참고 자료

- [Python 공식 튜토리얼의 for 반복문 설명](https://docs.python.org/3/tutorial/controlflow.html#for-statements)

## 함수는 같은 규칙을 다시 사용합니다

### 금액을 받아 분류 결과를 돌려주는 규칙에 이름을 붙여 세 번 실행합니다

![금액 입력 세 개가 classify_expense 함수 카드 하나를 차례로 지나 정상과 확인필요 결과로 돌아오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ba/ba22b13bfe117f620ed7cd2e3ddc8f671679e5e8212eed7c3eb3e71d1cf9ddfb.png "함수 안의 조건은 한 번 적고 입력 금액만 바꿔 여러 번 사용할 수 있습니다")

함수는 여러 줄의 규칙에 이름을 붙인 코드 묶음입니다. `classify_expense(amount)`는 금액 하나를 받고
정상 또는 확인필요라는 결과를 돌려줍니다. 이 돌려주는 값을 반환값이라고 부릅니다.

아래 셀은 같은 함수를 금액 세 개에 사용합니다. 함수 안의 기준을 `50000`으로 바꿔 다시 실행했을 때
세 결과가 같은 새 기준으로 바뀌면 함수를 다시 사용한 이유를 확인한 것입니다.

https://eddmpython.com/codaro/run/?example=expense-function

#### 참고 자료

- [Python 공식 튜토리얼의 함수 정의 설명](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)

## 여섯 개념을 한 셀에서 연결합니다

### 부서별 거래 목록을 읽어 금액을 분류하고 전체 합계와 결과 목록을 만듭니다

![변수 리스트 딕셔너리 조건 반복 함수 여섯 카드가 하나의 지출내역 결과와 합계로 합쳐지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ea/ea47def546eefb8e3c5d3d3e0bdcf2cdb08390dd313c77cfb32396967961be3c.png "각 문법은 따로 외울 항목이 아니라 입력 목록을 결과로 바꾸는 한 코드 안에서 연결됩니다")

마지막 셀에는 지금까지 실행한 여섯 개념이 함께 들어 있습니다. `records` 리스트에는 부서와 금액을
담은 딕셔너리가 있고, 반복문은 거래를 하나씩 꺼냅니다. 함수는 금액을 분류하고 변수는 기준금액을
보관합니다.

먼저 그대로 실행해 합계 `250,000원`과 확인필요 항목 하나를 확인합니다. 그다음 `120000`을
`90000`으로 바꿔 다시 실행합니다. 합계가 `220,000원`으로 바뀌고 확인필요 항목이 사라지면 입력부터
판단과 출력까지 모두 연결된 것입니다.

https://eddmpython.com/codaro/run/?example=expense-syntax-together

#### 확인 목록

- `amount_limit` 변수에서 기준금액을 찾았습니다.
- `records` 리스트에서 거래 개수를 확인했습니다.
- 각 거래와 `column_map`은 키와 값이 있는 딕셔너리입니다.
- 함수 안의 조건문이 정상과 확인필요를 나눕니다.
- 반복문이 모든 거래에 함수를 적용합니다.
- 합계와 결과 목록이 마지막에 보입니다.
