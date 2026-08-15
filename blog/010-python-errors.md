---
title: Python 오류 메시지 읽는 법: 3가지 오류 해결 순서
slug: python-errors
author: eddmpython
section: Python 기초와 실행
summary: Python 오류 메시지 읽는 법을 NameError, TypeError, FileNotFoundError로 연습합니다. 마지막 줄에서 오류 이름을 찾고 파일과 줄 번호를 따라갑니다.
readerQuestion: Python 오류 메시지에서 NameError와 TypeError 및 FileNotFoundError의 원인을 어떤 순서로 찾을까?
readerTakeaway: Traceback의 마지막 줄에서 오류 이름과 설명을 읽고 바로 위의 파일과 줄 번호에서 사용한 이름과 값 및 경로를 확인한다.
readerLevel: beginner
readerStartingPoint: Python 코드를 실행하다가 빨간 Traceback을 본 적은 있지만 어느 줄부터 읽고 무엇을 고쳐야 하는지는 모른다.
primaryKeyword: Python 오류 메시지 읽는 법
searchIntent: troubleshooting
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ea/ea6e53f09c81ce2b8dfc505a791cb1f71c603bec0d6371cd1f6e74c99e4fd042.png
ogImageAlt: 여러 줄의 Python Traceback에서 마지막 오류 줄과 바로 위의 파일 및 줄 번호가 차례로 강조된 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python 오류 메시지 읽는 법을 모르면 빨간 글자가 길다는 이유만으로 코드를 전부 다시 쓰게 됩니다.
하지만 Traceback의 마지막 줄에는 오류 이름과 가장 가까운 원인이 짧게 적혀 있습니다.

이 글에서는 NameError, TypeError, FileNotFoundError를 각각 한 번씩 만듭니다. 마지막 줄을 읽고 파일과
줄 번호를 확인한 뒤 한 가지 원인만 고쳐 정상 결과가 나오는지 확인합니다.

## Traceback은 마지막 줄부터 봅니다

### 오류 이름과 설명을 읽고 바로 위에서 실패한 파일과 줄 번호를 찾습니다

![여러 줄의 Python Traceback에서 마지막 오류 줄과 바로 위의 파일 및 줄 번호가 차례로 강조된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ea/ea6e53f09c81ce2b8dfc505a791cb1f71c603bec0d6371cd1f6e74c99e4fd042.png "맨 아래의 오류 이름으로 문제 종류를 좁힌 뒤 위쪽의 실패 위치로 이동합니다")

Traceback은 Python이 오류가 난 자리까지 어떤 코드를 지나왔는지 보여 주는 기록입니다. 처음에는 맨
아래 한 줄을 읽습니다. `NameError`처럼 오류 이름을 확인하고, 콜론 뒤의 설명에서 찾지 못한 이름이나
맞지 않는 값의 종류 및 열지 못한 파일을 봅니다.

그다음 바로 위쪽의 `File`과 `line`을 찾습니다. `File "practice.py", line 2`라면
`practice.py`의 둘째 줄에서 멈췄다는 뜻입니다. Traceback 모양과 문구는 Python 버전과 실행 도구에
따라 조금 달라도 이 두 위치를 찾는 순서는 같습니다.

#### 설명 목록

```text
1. 마지막 줄의 오류 이름
2. 콜론 뒤의 짧은 설명
3. 바로 위의 파일 이름과 줄 번호
4. 해당 줄에서 사용한 이름과 값 및 경로
```

#### 참고 자료

- [Python 공식 튜토리얼의 오류와 예외](https://docs.python.org/3/tutorial/errors.html)

## NameError는 이름을 비교합니다

### 만든 변수 이름과 오류 줄에서 사용한 이름의 철자가 같은지 확인합니다

![금액 변수 이름 두 개를 글자 단위로 비교해 한 글자가 빠진 이름을 찾는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/44/4459d43388edbfd1104d368ff00251f944a394394b5cff0af16d208817ec7c8b.png "NameError에서는 값보다 먼저 이름을 만든 줄과 사용한 줄의 철자를 맞춥니다")

NameError는 Python이 사용하려는 이름을 찾지 못했을 때 나옵니다. 아래 코드는 `amount`를 만들었지만
출력 줄에서는 `amunt`라고 적었습니다. 마지막 줄의 설명에 찾지 못한 이름이 나오므로 두 철자를 바로
비교할 수 있습니다.

수정 범위는 오류가 난 이름 하나입니다. `amunt`를 `amount`로 고친 뒤 다시 실행해 `120000`이
나오는지 확인합니다. 비슷한 이름을 새로 만들거나 코드 전체를 바꾸면 원인을 확인하기 어렵습니다.

#### 코드

```python
amount = 120000
print(amunt)
```

#### 예시

```python
amount = 120000
print(amount)
```

#### 확인 목록

- 이름을 만드는 줄이 오류 줄보다 위에 있습니다.
- 대문자와 소문자가 같습니다.
- 단어의 철자와 밑줄 위치가 같습니다.

## TypeError는 값의 종류를 봅니다

### 더하기 양쪽 값의 type을 출력해 str과 int가 섞였는지 확인합니다

![더하기 기호 양쪽의 문자 금액과 정수 배송비가 서로 다른 자료형 카드로 분리된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/15/157dbf61c726c1eec27d8b378c646dddce9bc7a86ab0d3b260fb6936aa884169.png "TypeError에서는 같은 연산에 들어간 두 값의 자료형을 나란히 확인합니다")

TypeError는 그 자료형으로 할 수 없는 동작을 시도했을 때 나옵니다. `"120000"`은 문자열 `str`이고
`30000`은 정수 `int`입니다. 문자열과 정수를 더하면 Python은 문장을 이어야 하는지 숫자를 계산해야
하는지 정하지 않고 오류를 냅니다.

오류 줄의 두 값을 `type`으로 각각 확인합니다. 금액 문자가 숫자만 포함한다면 `int`로 바꾼 뒤
더합니다. 수정한 코드에서 `150000`이 나오면 자료형을 계산 전에 맞춘 것입니다.

#### 코드

```python
amount = "120000"
fee = 30000
print(type(amount).__name__, type(fee).__name__)
total = amount + fee
```

#### 예시

```python
amount = int("120000")
fee = 30000
total = amount + fee
print(total)
```

## FileNotFoundError는 위치를 봅니다

### 현재 폴더와 파일 경로 및 실제 존재 여부를 출력해 서로 맞는지 확인합니다

![현재 폴더와 요청한 input 파일 경로 및 존재 여부가 한 줄씩 대조되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ba/baee7b819d25f5cb8cc66e12aa26f0fd81098742de010fe986b0d2c4654d565d.png "FileNotFoundError에서는 파일명만 보지 않고 현재 위치부터 대상 파일까지를 함께 확인합니다")

FileNotFoundError는 코드가 지정한 경로에서 파일을 열지 못했을 때 나옵니다. 파일이 정말 없어도
나오지만, 다른 폴더에서 실행했거나 확장자가 `.xlsx.xlsx`처럼 달라도 같은 오류가 납니다. 먼저
Python이 보고 있는 현재 폴더와 대상 경로를 출력합니다.

`Path.cwd()`는 현재 폴더를 보여 주고 `file_path.exists()`는 해당 경로에 파일이 있으면 `True`를
보여 줍니다. `False`라면 파일을 여는 줄을 다시 실행하기 전에 현재 폴더, `input` 폴더 목록, 실제
확장자를 확인합니다.

#### 코드

```python
from pathlib import Path

file_path = Path("input") / "영업팀.xlsx"

print("현재 폴더:", Path.cwd())
print("대상 경로:", file_path.resolve())
print("파일 존재:", file_path.exists())
```

#### 예시

```text
현재 폴더: C:\...\expense_automation
대상 경로: C:\...\expense_automation\input\영업팀.xlsx
파일 존재: False
```

#### 참고 자료

- [Python FileNotFoundError 공식 설명](https://docs.python.org/3/library/exceptions.html#FileNotFoundError)

## 한 번에 한 원인만 고칩니다

### 오류 하나를 재현하고 가장 작은 수정 뒤 같은 명령으로 다시 실행합니다

![실패한 코드 복사본에서 한 줄만 바뀐 뒤 같은 실행 명령과 정상 결과가 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/d5/d5b06e7a8607b5dcac0e37110e269431c6746c5ada9967cfec1350a89b903c79.png "변경을 한 곳으로 제한해야 어떤 수정이 오류를 해결했는지 확인할 수 있습니다")

오류를 고칠 때 여러 파일과 여러 줄을 함께 바꾸면 어떤 변경이 효과가 있었는지 알 수 없습니다. 먼저
같은 명령으로 오류가 다시 나는지 확인합니다. 마지막 줄에서 가장 가까운 원인 하나를 고치고 같은
명령을 다시 실행합니다.

정상 실행 뒤에는 화면이 멈추지 않았다는 사실만 보지 않습니다. 기대한 금액이나 파일 또는 행 수가
나왔는지 확인합니다. 오류가 사라졌지만 합계가 틀렸다면 실행 오류는 해결됐어도 업무 결과는 아직
맞지 않은 상태입니다.

#### 예시

```text
실행 명령: python practice.py
오류 이름: TypeError
실패 위치: practice.py 4줄
확인한 값: amount는 str, fee는 int
수정한 한 곳: amount를 int로 변환
재실행 결과: 오류 없음
업무 결과: total이 150000인지 확인
```

## 오류 기록을 일곱 줄로 남깁니다

### 실행 명령과 기대 결과 및 실제 결과를 함께 적으면 같은 오류를 다시 만들 수 있습니다

![명령과 Traceback 및 기대값과 입력 정보가 일곱 칸의 오류 기록표에 채워지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/80/80c8d627722ed5068288a49cc87146d796693b3c694bfb94b8d570b7a99de328.png "오류 이름만 복사하지 않고 실행 조건과 기대 결과를 함께 남겨야 원인을 다시 확인할 수 있습니다")

오류를 다른 사람이나 AI에게 설명할 때 마지막 한 줄만 보내면 실행 위치와 입력값을 알 수 없습니다.
실행 명령, Traceback 전체, 기대 결과, 실제 결과, 입력 파일, 직전 변경, 이미 확인한 내용을 함께
적습니다. 회사 원본 대신 같은 오류가 나는 작은 합성 값을 사용합니다.

아래 일곱 줄을 채운 뒤 같은 명령을 다시 실행합니다. 다른 폴더나 다른 입력에서는 오류가 나지 않는다면
그 차이가 원인 후보입니다. 기록만 보고도 오류를 다시 만들 수 있고 수정 뒤 기대값과 비교할 수 있으면
오류 읽기 실습이 끝난 것입니다.

#### 예시

```text
실행 명령:
오류 전체 Traceback:
기대한 결과:
실제 결과:
입력 파일과 행 수:
직전에 변경한 파일:
이미 확인한 내용:
```

#### 참고 자료

- [Python 기본 예외 전체 목록](https://docs.python.org/3/library/exceptions.html)
