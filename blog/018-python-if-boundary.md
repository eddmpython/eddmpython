---
title: Python if문 경계값이 중요한 이유: 100000원은 어디로 갈까
slug: python-if-boundary
author: eddmpython
section: Python 기초
summary: Python if문 경계값을 거래 금액으로 익힙니다. 100000원을 포함하는 조건과 취소 및 입력 오류를 나누고 네 입력의 기대 결과를 확인합니다.
readerQuestion: Python if문에서 100000원 같은 경계값을 빠뜨리지 않고 분류하려면 어떻게 할까?
readerTakeaway: 조건을 위에서 아래로 배치하고 기준 바로 아래와 같은 값 및 바로 위 값을 실행해 기대한 분류와 같은지 확인한다.
readerLevel: beginner
readerStartingPoint: 숫자 변수와 비교 기호를 알고 Python 파일에서 print 함수를 실행해 본 상태입니다.
primaryKeyword: Python if문 경계값
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b1/b1616142738c76180bbcd27c684c12204f52a0f8c5d622db296121506ece7748.png
ogImageAlt: 거래 금액 한 건이 정상과 고액 및 취소 세 갈래 결과 카드 중 하나로만 들어가는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

Python if문 경계값을 대충 정하면 정확히 `100000`원인 거래가 정상인지 고액인지 애매해집니다. 코드가
실행되면 애매한 결과 대신 한 분류가 나오므로 조건을 쓰기 전에 포함 범위를 정해야 합니다.

이 글에서는 취소, 정상, 고액 거래를 나누는 함수를 만듭니다. `99999`, `100000`, `100001`과 잘못된
입력을 넣어 Python if문이 경계값에서 약속한 결과를 내는지 직접 확인합니다.

## if와 elif 및 else는 한 갈래만 실행합니다

### 취소와 고액 및 정상 거래를 위에서 아래 순서로 한 번만 분류합니다

![거래 금액 한 건이 정상과 고액 및 취소 세 갈래 결과 카드 중 하나로만 들어가는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b1/b1616142738c76180bbcd27c684c12204f52a0f8c5d622db296121506ece7748.png "거래 한 건은 위에서 처음으로 참인 조건 하나를 만나 그 결과로만 들어갑니다")

`if`는 조건이 참일 때 들여쓴 코드만 실행합니다. 첫 조건이 거짓이면 `elif`를 확인하고, 앞의 조건이
모두 거짓이면 `else`를 실행합니다. 한 거래가 취소와 고액으로 동시에 분류되지는 않습니다.

아래 함수는 음수를 취소로 먼저 처리합니다. 그다음 `100000`원 이상을 고액으로 분류합니다. 나머지
`0`원부터 `99999`원까지는 정상입니다. 순서를 바꾸면 음수도 정상으로 잘못 들어갈 수 있습니다.

#### 코드

```python
def classify_amount(amount):
    if amount < 0:
        return "취소"
    elif amount >= 100000:
        return "고액"
    else:
        return "정상"


print(classify_amount(-50000))
print(classify_amount(120000))
print(classify_amount(50000))
```

#### 예시

```text
취소
고액
정상
```

## 경계값 세 개로 이상과 초과를 구분합니다

### 기준 바로 아래와 같은 값 및 바로 위 값을 넣어 조건 기호를 확인합니다

![기준 바로 아래와 같은 값 및 바로 위 금액 세 개가 서로 다른 기대 결과와 연결된 표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/04/04d4ff033587ccc56cef40bc3ed470742917961c90edeffc00ed35396ec229a2.png "기준선 바로 아래는 정상으로 가고 기준선과 바로 위 값은 고액으로 갑니다")

`>= 100000`은 100000원을 포함하고 `> 100000`은 포함하지 않습니다. 한국어로는 각각 `10만원 이상`,
`10만원 초과`입니다. 두 표현을 섞으면 기준에 정확히 걸린 거래가 다른 결과로 갑니다.

조건 기호를 확인할 때는 기준에서 멀리 떨어진 숫자보다 바로 아래, 같은 값, 바로 위를 넣습니다.
`99999`, `100000`, `100001`을 실행하면 포함 여부와 숫자 자료형 비교를 한 번에 확인할 수 있습니다.

#### 코드

```python
boundary_cases = [99999, 100000, 100001]

for amount in boundary_cases:
    result = classify_amount(amount)
    print(amount, result)
```

#### 예시

```text
99999 정상
100000 고액
100001 고액
```

## 여러 확인 조건을 or로 묶습니다

### 부서 누락이나 금액 오류나 고액 중 하나만 맞아도 확인필요로 보냅니다

![부서 누락과 숫자 변환 실패 및 고액 조건 세 개가 확인필요 결과 하나로 모이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a1/a19328faa3bdfb1a2601c9eeea8fb5ee4400891bad8cf72fba48aa7029af44b2.png "서로 다른 세 문제 중 하나라도 발견되면 거래를 확인필요 목록으로 보냅니다")

`or`는 여러 조건 중 하나라도 참이면 전체를 참으로 만듭니다. 부서가 비었거나 금액이 숫자가 아니거나
금액이 `100000`원 이상이면 사람이 확인할 거래로 모을 수 있습니다. 세 문제가 모두 없어야 정상으로
넘어갑니다.

숫자 변환은 조건문 전에 시도합니다. `int("오만원")`처럼 바꿀 수 없는 값은 `ValueError`가 나므로
`try`와 `except`에서 `None`으로 표시합니다. 조건문은 그 표시를 보고 입력 오류를 찾습니다.

#### 코드

```python
def review_status(department, raw_amount):
    try:
        amount = int(raw_amount)
    except ValueError:
        amount = None

    if department == "" or amount is None or amount >= 100000:
        return "확인필요"
    if amount < 0:
        return "취소"
    return "정상"


print(review_status("", "50000"))
print(review_status("영업팀", "오만원"))
print(review_status("영업팀", "120000"))
print(review_status("영업팀", "50000"))
```

#### 예시

```text
확인필요
확인필요
확인필요
정상
```

## 조건문을 네 입력으로 직접 확인합니다

### 정상과 경계값과 취소 및 잘못된 금액의 기대 결과를 먼저 적습니다

![정상과 경계와 취소 및 잘못된 금액 네 입력이 기대값과 실제값 비교에서 모두 통과한 표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5f/5f8efb7e9d76d4fbdcd3ad3a849fe3164c52bab211255eb30df0df2c9ac34a00.png "네 입력마다 먼저 적은 기대 결과와 함수가 돌려준 실제 결과를 한 줄씩 비교합니다")

조건문은 눈으로 읽는 것보다 입력과 기대 결과를 짝지어 실행하는 편이 정확합니다. 아래 목록에는 정상,
경계값, 취소, 잘못된 금액이 한 번씩 들어 있습니다. `assert`는 실제 결과가 기대 결과와 다르면 그 줄에서
오류를 냅니다.

네 줄이 모두 맞으면 마지막 `조건 검사 통과`가 출력됩니다. 나중에 분류 기준을 바꿔도 같은 코드를
다시 실행하면 어느 입력의 결과가 달라졌는지 바로 알 수 있습니다.

#### 코드

```python
test_cases = [
    (("영업팀", "50000"), "정상"),
    (("영업팀", "100000"), "확인필요"),
    (("영업팀", "-50000"), "취소"),
    (("영업팀", "오만원"), "확인필요"),
]

for inputs, expected in test_cases:
    actual = review_status(*inputs)
    assert actual == expected, (inputs, expected, actual)

print("조건 검사 통과")
```

#### 예시

```text
조건 검사 통과
```

#### 참고 자료

- [Python if문 공식 문서](https://docs.python.org/3/tutorial/controlflow.html#if-statements)
