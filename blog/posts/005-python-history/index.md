---
title: 파이썬 역사, 1991년 코드를 오늘 돌려 보면 무엇이 남아 있나
slug: python-history
author: eddmpython
section: 파이썬 이야기
summary: 파이썬 역사를 1989년의 시작과 1991년 공개 코드부터 따라갑니다. 당시 튜토리얼 예제에서 오늘과 다른 네 종류의 문법을 확인하고, 파이썬 3에서 텍스트 처리 방식까지 바뀐 과정을 따라갑니다. 서로 다른 언어 순위와 현재 지원 버전까지 한 흐름으로 확인합니다.
readerQuestion: 파이썬은 35년 동안 무엇이 바뀌었고 무엇이 그대로이며 지금은 어디까지 와 있을까?
readerTakeaway: 1991년 파이썬의 기본 모양은 남았지만 텍스트 처리와 실행 방식은 크게 바뀌었다. 언어 순위는 서로 다른 것을 재므로 하려는 일과 지원 버전으로 선택해야 한다.
readerLevel: beginner
readerStartingPoint: 파이썬을 배우거나 고르는 중이고, 1991년 코드가 지금도 읽히는지와 파이썬 1위라는 숫자가 어디서 나왔는지는 모른다.
primaryKeyword: 파이썬 역사
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a3/a37f561ca85d38f4e6bf4b2c81ecb6386e78c7ac890dd189103ba477cbf8e10b.png
ogImageAlt: 1991년의 비교 기호와 현재의 비교 기호를 나란히 보여 주는 설명 이미지
ogImageWidth: 1672
ogImageHeight: 941
ogImageType: image/png
---

오래된 파이썬 예제를 복사했는데 지금은 문법 오류가 납니다. 들여쓰기와 `class`는 익숙한데 `print`와 비교 기호는 다릅니다. 35년 동안 무엇이 남고 무엇이 바뀌었을까요?

1991년 예제를 직접 고쳐 보고, 파이썬 3에서 텍스트 처리와 실행 방식이 어떻게 달라졌는지 구분합니다. 코드를 바꿔 본 뒤에는 내 파이썬 버전이 지원받는지 확인합니다.

## 1989년 시작, 1991년 공개
### 들여쓰기와 클래스는 첫 공개판부터 있었다

[![1989년 시작, 1991년 공개 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c3/c36be9f8b93226ff4785a73fd25924a4a4d35b6a3dffc2dc04277dc5016803e9.png "1989년 시작, 1991년 공개 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.python.org/3/faq/general.html#why-was-python-created-in-the-first-place)

출처: [Python Software Foundation](https://docs.python.org/3/faq/general.html#why-was-python-created-in-the-first-place) · [사용 조건](https://docs.python.org/3/license.html). 원문 화면 일부를 캡처했습니다.

```flow
1989년 12월 | 귀도 반 로섬이 CWI에서 개발 시작
1991년 2월 | 유즈넷에 Python 0.9.0 공개
첫 공개판의 모양 | 들여쓰기·클래스·함수·예외·모듈
```

귀도 반 로섬이 네덜란드의 연구소 CWI에서 파이썬을 만들기 시작한 때는 1989년 12월 크리스마스 연휴였습니다. 연휴에 시간이 비어 개발을 시작했습니다.

처음 공개된 파이썬은 1991년 2월 유즈넷의 `alt.sources`에 올라온 0.9.0입니다. 클래스와 상속, 예외 처리, 함수, 모듈, 그리고 중괄호 대신 들여쓰기로 블록을 나누는 방식이 이때 이미 있었습니다. 첫 공개판에 클래스가 있었다는 사실만으로 오늘의 호환성을 알 수는 없으므로 오래된 예제의 문법을 직접 대조해 봅니다.

## 1991년 코드에서 달라진 문법
### 같은지 비교하는 기호부터 고쳐 보기

![1991년의 비교 기호와 현재의 비교 기호를 나란히 보여 주는 설명 이미지](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a3/a37f561ca85d38f4e6bf4b2c81ecb6386e78c7ac890dd189103ba477cbf8e10b.png "1991년의 비교 기호와 현재의 비교 기호를 나란히 보여 주는 설명 이미지 · 설명 이미지")

| 1991년 비교 | 오늘의 비교 |
|---|---|
| `if a[i] = e:` | `if a[i] == e:` |

그러면 그때 코드가 지금도 돌아갈까요? python.org가 아직도 [0.9.1 소스](https://www.python.org/ftp/python/src/Python-0.9.1.tar.gz)를 배포하고 있고, 그 안에 튜토리얼 예제가 들어 있습니다. 다음은 거기 실린 코드를 줄인 것입니다.

```python
class Set():
    def new(self):
        self.elements = []
        return self

    def add(self, e):
        if e not in self.elements:
            self.elements.append(e)

    def remove(self, e):
        for i in range(len(self.elements)):
            if self.elements[i] = e:
                del self.elements[i]
                break
```

이 `Set` 클래스를 오늘 파이썬에 넣으면 이렇게 멈춥니다.

```text
SyntaxError: cannot assign to subscript here. Maybe you meant '==' instead of '='?
```

이 예제는 같은지 비교할 때 `=` 하나를 썼습니다. 그래서 오늘 파이썬은 이 줄을 비교가 아니라 대입으로 읽고 멈춥니다.

위 코드는 예제를 줄인 것이라 깨지는 자리가 하나만 보입니다. 이 글에서 대조한 튜토리얼 예제에는 네 종류의 문법 차이가 있습니다. 같은지 비교하는 `=`, 상속을 적는 방식, 예외를 던지는 방식, 그리고 `print`입니다.

| 1991년에 쓰던 것 | 오늘 |
|---|---|
| `if a[i] = e:` | `if a[i] == e:` |
| `class Sub() = Base:` | `class Sub(Base):` |
| `raise Error, '메시지'` | `raise Error('메시지')` |
| `print x` | `print(x)` |

이 예제에서 클래스를 만드는 기본 모양은 남았습니다. `class`로 클래스를 열고 `def`로 메서드를 만들고 첫 인자로 `self`를 받는 것이 1991년 모양 그대로입니다. 속성에 값을 넣는 것도, 리스트에 붙이는 것도, `in`으로 확인하고 `for`로 돌고 `del`로 지우는 것도 오늘 그대로 읽힙니다.

아래 실습 칸은 오래된 코드를 문법 검사에 넣습니다. 실행 버튼을 누르면 먼저 깨지는 줄이 나오고, 표대로 고친 뒤 다시 누르면 문법을 통과하는지 확인할 수 있습니다. 문법 검사는 메서드를 실제로 호출한 결과까지 확인하지는 않습니다.

https://eddmpython.com/codaro/run/?example=py-1991-syntax

35년 동안 문법만 바뀐 것은 아닙니다. 위 표의 `print`를 바꾼 파이썬 3은 텍스트와 바이트를 구분하는 방식도 바꿨고, 그 변화 때문에 파이썬 2와 3은 11년 넘게 함께 쓰였습니다.

## 파이썬 3에서 함수가 된 print
### 출력할 값을 괄호 안에 넣는 호출로 변경

[![파이썬 3에서 함수가 된 print 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4d/4d090fc86d9281e1b99af9e43aedeeeeceaaf7fb67ae9c5397285c203d97fd11.png "파이썬 3에서 함수가 된 print 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://peps.python.org/pep-3105/)

출처: [Python Enhancement Proposals authors](https://peps.python.org/pep-3105/) · [사용 조건](https://peps.python.org/pep-3105/#copyright). 원문 화면 일부를 캡처했습니다.

| Python 2 | Python 3 |
|---|---|
| `print "안녕"` | `print("안녕")` |

3.0은 2008년 12월에 나왔습니다. 파이썬 개발팀이 2와 일부러 호환되지 않게 만든 판입니다. 가장 눈에 띄는 변화는 `print`였는데, 2에서는 문법 요소였고 3에서는 함수가 됐습니다. 이 변경은 [PEP 3105](https://peps.python.org/pep-3105/)로 정해졌습니다. PEP는 파이썬을 어떻게 바꿀지 적어서 공개로 논의하는 제안서입니다.

2에서 쓰던 `print`를 오늘 파이썬에 넣으면 이렇게 멈춥니다.

```python
print "안녕"
```

```text
SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?
```

아래 실습 칸에서 Python 2의 `print` 문법을 검사한 뒤 괄호를 넣어 다시 확인해 보세요

https://eddmpython.com/codaro/run/?example=py-two-to-three

`print`는 괄호를 넣어 고칠 수 있지만 텍스트를 다루는 코드는 자료형까지 확인해야 했습니다.

## 텍스트와 바이트의 분리
### 텍스트는 str, 바이트는 bytes로 구분

[![텍스트와 바이트의 분리 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/67/67aea24b7ddedfc50fa0ffe9c8bb75a4ec56bdd3542604641d7ad61ed33c5c97.png "텍스트와 바이트의 분리 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.python.org/3/whatsnew/3.0.html#text-vs-data-instead-of-unicode-vs-8-bit)

출처: [Python Software Foundation](https://docs.python.org/3/whatsnew/3.0.html#text-vs-data-instead-of-unicode-vs-8-bit) · [사용 조건](https://docs.python.org/3/license.html). 원문 화면 일부를 캡처했습니다.

| 맡는 일 | Python 2 | Python 3 |
|---|---|---|
| 텍스트 | `unicode` | `str` |
| 바이트 | `str` | `bytes` |

컴퓨터는 글자를 바이트로 저장합니다. 글자와 바이트를 서로 바꿀 때 쓰는 규칙이 문자 인코딩입니다. 파이썬 2에서 `str`은 바이트였고 텍스트는 따로 `unicode` 타입이었습니다. 파이썬 3은 `str`을 텍스트로 만들고 바이트는 `bytes`로 분리했습니다.

그래서 파이썬 3에서 `str`과 `bytes`를 섞어 더하면 그 자리에서 오류로 멈춥니다. 한글이 나중에 깨진 채 발견되는 것보다, 텍스트와 바이트가 만난 자리에서 문제를 확인하는 편이 고치기 쉽습니다.

텍스트와 바이트를 구분하면서 기존 코드와 라이브러리도 함께 고쳐야 했습니다. 문법을 몇 군데 바꾸는 일만으로 전환이 끝나지 않았습니다.

## 두 판이 함께 쓰인 11년
### 파이썬 3 공개 뒤에도 파이썬 2 지원이 이어졌다

[![두 판이 함께 쓰인 11년 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/28/289f5eaf161408dfef2d81e8b96756fd870d6de2af8b36d892aa7885dbe51978.png "두 판이 함께 쓰인 11년 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://peps.python.org/pep-0373/)

출처: [Python Enhancement Proposals authors](https://peps.python.org/pep-0373/) · [사용 조건](https://peps.python.org/pep-0373/#copyright). 원문 화면 일부를 캡처했습니다.

```flow
2008년 12월 | Python 3.0 공개
2015년 | Python 2.7의 원래 지원 종료 계획
2020년 1월 1일 | 연장된 Python 2.7 지원 종료
```

이 호환성 변화 때문에 옮겨 가는 데 오래 걸렸습니다. 3.0이 2008년 12월에 나왔고 2.7 지원이 2020년 1월 1일에 끝났으니 두 버전이 11년 넘게 함께 쓰였습니다. [PEP 373](https://peps.python.org/pep-0373/)에 따르면 2.7 지원 종료는 원래 계획한 2015년보다 5년 늦춰졌습니다.

지금 파이썬 2.7은 지원이 끝난 판입니다. 긴 전환기를 거친 파이썬의 사용 규모는 언어 순위에서도 볼 수 있지만, 조사마다 세는 대상이 다릅니다.

## 순위표마다 1위가 다른 이유
### 관심도·설문 응답·기여자 수는 서로 다른 숫자

[![순위표마다 1위가 다른 이유 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/00/0006a5e2a353a9982b5e5b1019ca3493c3ce55877cc18b7b5e538fa9c06b0846.png "순위표마다 1위가 다른 이유 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://survey.stackoverflow.co/2025/technology)

출처: [Stack Exchange Inc.](https://survey.stackoverflow.co/2025/technology) · [사용 조건](https://survey.stackoverflow.co/2025/). 원문 화면 일부를 캡처했습니다.

세 조사의 발표 시점을 함께 놓고 비교합니다. 이 표는 각 시점의 기록이며 오늘 순위를 실시간으로 보여 주지는 않습니다.

| 조사 | 파이썬 | JavaScript | 1위 | 세는 것 |
|---|---|---|---|---|
| [TIOBE](https://www.tiobe.com/tiobe-index/) 2026년 8월 | 1위 18.53% | 6위 2.63% | 파이썬 | 웹 검색과 강의, 공급업체로 계산한 관심도 |
| [Stack Overflow](https://survey.stackoverflow.co/2025/technology) 2025 | 4위 57.9% | 1위 66% | JavaScript | 지난 1년간 썼다고 답한 사람의 비율 |
| [GitHub Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/) 2025 | 2위 | 3위 | TypeScript | 2025년 8월 월간 기여자 수 |

같은 JavaScript가 한 표에서 6위이고 다른 표에서 1위입니다. 조사가 틀린 것이 아니라 서로 다른 질문에 답한 것입니다. 파이썬의 TIOBE 18.53%와 Stack Overflow 57.9%를 같은 기준으로 견주면 안 됩니다. TIOBE에서 18.53%는 검색에서 차지한 몫이고, Stack Overflow에서 57.9%는 지난 1년 동안 그 언어를 썼다고 답한 사람의 비율입니다.

TIOBE 자신도 이 숫자는 최고의 언어나 작성된 코드의 양을 뜻하지 않는다고 밝힙니다.

Stack Overflow는 개발자에게 직접 묻습니다. 지난 1년 동안 그 언어로 개발을 많이 했느냐는 물음에 그렇다고 답한 비율입니다. 여러 개를 고를 수 있어서 합이 100%를 넘습니다.

GitHub은 월간 기여자 수를 셉니다. Octoverse 2025에서 TypeScript는 2025년 8월 파이썬을 약 4만 2천 명 차이로 넘어섰고, 파이썬은 2위에 남았습니다. 같은 보고서에서는 파이썬이 AI와 데이터 과학 작업에서 여전히 앞선다고 설명합니다.

그래서 순위표로 언어를 고르면 무엇을 놓칠까요? 세 표 어디에도 `내가 하려는 일에 맞는가`는 없습니다. 데이터 분석이나 AI 자동화를 하려면 파이썬 생태계를 먼저 보고, 브라우저 화면을 만들려면 JavaScript와 TypeScript 생태계를 먼저 봐야 합니다. 순위는 그 판단을 대신해 주지 않습니다.

## 코드 실행을 빠르게 만든 인터프리터
### 같은 코드를 처리하는 비용을 줄인 Python 3.11

[![코드 실행을 빠르게 만든 인터프리터 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2c/2c7ea3f802b05ac03dc6add4761b8f76a03b00a08c7264808ff0a7893f9af08b.png "코드 실행을 빠르게 만든 인터프리터 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.python.org/3/whatsnew/3.11.html#faster-cpython)

출처: [Python Software Foundation](https://docs.python.org/3/whatsnew/3.11.html#faster-cpython) · [사용 조건](https://docs.python.org/3/license.html). 원문 화면 일부를 캡처했습니다.

```flow
같은 Python 코드 | 입력과 알고리즘은 유지
인터프리터 개선 | 코드를 해석하고 실행하는 비용을 줄임
실제 작업 확인 | 내 코드의 시간은 별도로 측정
```

파이썬 코드를 읽어서 실행하는 프로그램을 인터프리터라고 부릅니다. Python 3.11에서는 인터프리터 자체의 실행 비용을 줄였습니다. [Python 3.11 공식 설명](https://docs.python.org/3/whatsnew/3.11.html#faster-cpython)은 표준 벤치마크 묶음에서 3.11이 3.10보다 평균 1.25배 빨랐다고 밝힙니다. 내 코드도 반드시 25% 빨라진다는 보장은 아니므로 실제 작업의 실행 시간을 따로 재야 합니다.

인터프리터가 한 작업을 빨리 처리하는 것과 여러 스레드가 동시에 계산하는 것은 다른 문제입니다.

## GIL이 제한하는 동시 계산
### 순수 파이썬 CPU 작업은 스레드 수만 늘려도 나뉘지 않는다

[![GIL이 제한하는 동시 계산 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/85/85ca2f04948b13a64e1900789dfd91d1230b3189a29091d4fa4fa7df78c92db5.png "GIL이 제한하는 동시 계산 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.python.org/3/glossary.html#term-global-interpreter-lock)

출처: [Python Software Foundation](https://docs.python.org/3/glossary.html#term-global-interpreter-lock) · [사용 조건](https://docs.python.org/3/license.html). 원문 화면 일부를 캡처했습니다.

| 작업 | GIL이 켜진 일반 CPython |
|---|---|
| 순수 Python CPU 계산 | 한 시점에 한 스레드가 Python 바이트코드 실행 |
| 파일·네트워크 대기 | 기다리는 동안 다른 스레드가 움직일 수 있음 |
| 외부 패키지의 계산 | 패키지가 GIL을 놓는지에 따라 다름 |

CPython은 보통 설치해서 쓰는 파이썬 인터프리터입니다. 스레드는 한 프로그램 안에서 나눠 실행하는 작업 흐름이고, 바이트코드는 인터프리터가 처리할 명령입니다.

GIL은 여러 스레드가 파이썬 객체를 동시에 다루지 못하게 조정하는 잠금입니다. GIL이 켜진 일반 CPython에서는 CPU 작업을 하는 스레드 가운데 하나만 한 시점에 파이썬 바이트코드를 실행합니다. 파일이나 네트워크를 기다리는 스레드는 겹쳐서 움직일 수 있고, 일부 외부 패키지는 계산하는 동안 GIL을 놓기도 합니다. 그래도 CPU 계산만 하는 순수 파이썬 코드는 스레드를 늘려도 여러 코어를 동시에 쓰기 어렵습니다.

GIL의 제한을 읽어도 내 실행 파일이 어떤 빌드인지는 아직 알 수 없습니다.

## 내 CPython의 GIL 상태 확인
### 지금 켜져 있는지와 끌 수 있는 빌드인지 구분

[![블로그 실행 칸에서 실제 GIL 상태와 빌드 설정을 출력한 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a5/a512e16cb22905452dfd3905e99e901472852cf5504d32f0b7b120ecee15fbf0.png "블로그 실행 칸에서 실제 GIL 상태와 빌드 설정을 출력한 화면 · 실제 캡처")](https://eddmpython.com/blog/python-history)

아래 코드는 CPython의 현재 GIL 상태와 빌드 설정을 출력합니다. 3.13보다 낮은 일반 CPython에서는 상태 조회 함수가 없으므로 GIL이 켜진 것으로 표시합니다.

```python
import sys
import sysconfig

gilEnabled = sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True

print("이 파이썬     ", sys.version.split()[0])
print("GIL 켜져 있나 ", gilEnabled)
print("GIL 선택 빌드 ", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
```

첫 줄에는 지금 쓰는 판이 찍힙니다. 둘째 줄의 `sys._is_gil_enabled()`는 현재 GIL이 켜져 있는지 보여 줍니다. 셋째 줄의 `sysconfig.get_config_var("Py_GIL_DISABLED")`는 GIL을 끌 수 있는 빌드인지 가립니다. `GIL 선택 빌드`가 `False`면 일반 빌드입니다. 둘째 줄은 현재 상태이고 셋째 줄은 실행 파일의 종류이므로 같은 질문이 아닙니다.

https://eddmpython.com/codaro/run/?example=py-gil-check

현재 상태와 빌드 종류를 확인했습니다. GIL을 끌 수 있는 빌드를 쓰려면 지원 상태와 패키지 호환성도 확인해야 합니다.

## GIL을 끄는 선택 빌드
### 여러 코어를 쓰려면 패키지 호환성도 확인

[![GIL을 끄는 선택 빌드 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/45/451d6184fd6d89fa189dfc2edf0bbe32700ede7b64ed5fd304fbad4c2ddde5f8.png "GIL을 끄는 선택 빌드 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://docs.python.org/3/howto/free-threading-python.html)

출처: [Python Software Foundation](https://docs.python.org/3/howto/free-threading-python.html) · [사용 조건](https://docs.python.org/3/license.html). 원문 화면 일부를 캡처했습니다.

| 버전과 빌드 | GIL 설정과 free-threaded 지원 |
|---|---|
| Python 3.13 | 실험 도입 |
| Python 3.14 | 공식 지원되는 선택지 |
| 기본 빌드 | GIL을 켜고 실행 |

GIL을 선택해서 끌 수 있게 만든 제안이 [PEP 703](https://peps.python.org/pep-0703/)입니다. `free-threaded` 빌드는 3.13에 실험으로 들어왔고, 3.14에서는 [PEP 779](https://peps.python.org/pep-0779/)가 정한 기준을 채워 공식 지원 단계가 됐습니다. 다만 기본 빌드는 여전히 GIL을 켭니다. [공식 안내](https://docs.python.org/3/howto/free-threading-python.html)에 따르면 `free-threaded` 빌드는 단일 스레드로 실행할 때 기본 빌드보다 평균 약 1%에서 8% 더 느렸습니다. 이는 pyperformance 벤치마크 결과이며 작업과 장비에 따라 차이가 납니다. 여러 코어로 계산할 수 있더라도 실제 작업의 처리 시간과 패키지 호환성을 함께 확인해야 합니다.

GIL을 끄는 빌드는 여러 스레드의 동시 계산을 위한 선택입니다. 자주 실행하는 코드를 기계어로 바꾸는 JIT는 별도의 기능입니다.

## 자주 실행하는 코드를 기계어로 바꾸는 JIT
### 실행 중 자주 쓰는 코드를 기계어로 컴파일

[![자주 실행하는 코드를 기계어로 바꾸는 JIT 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/59/592b517e9171f238d390577b04f50c008d9fd4308565cb41ea433d1eea0e2118.png "자주 실행하는 코드를 기계어로 바꾸는 JIT 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://peps.python.org/pep-0744/)

출처: [Brandt Bucher, Savannah Ostrowski](https://peps.python.org/pep-0744/) · [사용 조건](https://peps.python.org/pep-0744/#copyright). 원문 화면 일부를 캡처했습니다.

```flow
실행 관찰 | 자주 실행되는 코드를 찾음
컴파일 | CPU가 실행할 기계어로 바꿈
재사용 | 컴파일 비용과 이후 실행 시간 함께 확인
```

JIT는 프로그램이 도는 중에 자주 실행되는 코드를 컴퓨터가 직접 처리하는 기계어로 바꾸는 컴파일러입니다. 3.13에 실험으로 들어왔고, 3.14의 공식 macOS와 Windows 바이너리에도 포함됐습니다. [Python 3.14 공식 설명](https://docs.python.org/3/whatsnew/3.14.html#binary-releases-for-the-experimental-just-in-time-compiler)에 따르면 아직 실험 기능이며 기본으로 켜지지 않습니다. 작업에 따라 느려질 수도 있어 운영 코드의 속도 향상을 보장하는 선택지는 아닙니다.

`free-threaded` 빌드는 지원되는 선택지가 됐고 JIT는 아직 실험입니다. 파이썬의 새 판은 얼마나 자주 나오고, 한 판은 언제까지 지원받을까요?

## 매년 새 판, 한 판의 지원은 5년
### Python 3.13부터 버그 수정 2년과 보안 수정 3년

[![매년 새 판, 한 판의 지원은 5년 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/34/34a7763099ca93e9c860adc03f2b40f10f69549c832bbb942c7106d9c3ddf917.png "매년 새 판, 한 판의 지원은 5년 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://peps.python.org/pep-0602/)

출처: [Python Enhancement Proposals authors](https://peps.python.org/pep-0602/) · [사용 조건](https://peps.python.org/pep-0602/#copyright). 원문 화면 일부를 캡처했습니다.

```flow
새 판 출시 | 매년 10월
처음 2년 | 버그와 보안 문제 수정
다음 3년 | 보안 문제 수정
```

2026년 9월 1일 기준 최신 안정 버전은 3.14.7이고 3.15는 시험판입니다. [PEP 790](https://peps.python.org/pep-0790/)의 일정대로면 3.15.0은 2026년 10월 1일에 나옵니다.

[PEP 602](https://peps.python.org/pep-0602/)가 정한 출시 주기는 매년 10월 한 번입니다. 3.13부터는 한 판이 나온 뒤 처음 2년 동안 버그를 고치고, 다음 3년 동안 보안 문제를 고칩니다. 그래서 한 판의 지원 기간은 모두 5년입니다.

이제 이 주기를 내 파이썬에 대 보면 됩니다.

## 내 버전의 지원 상태 확인
### 버전 숫자를 공식 지원표와 대조

[![내 버전의 지원 상태 확인 개념을 확인하는 공식 문서 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/79/796c48b0b5e6fb0cecde769d49894330c26b3c2c62414aab477515f243cf4911.png "내 버전의 지원 상태 확인 개념을 확인하는 공식 문서 화면 · 실제 캡처")](https://devguide.python.org/versions/)

이미 파이썬을 쓰고 있다면 지금 쓰는 판이 지원받는지 확인합니다. 터미널에서는 `python --version`을 쓰고, 코드 안에서는 `sys.version`을 찍으면 됩니다. 위 화면은 [Python Software Foundation의 지원표](https://devguide.python.org/versions/)를 [CC0 사용 조건](https://github.com/python/devguide/blob/main/LICENSE)에 따라 캡처했습니다.

```python
import sys

print(sys.version.split()[0])
```

| 버전 | 2026년 9월 1일 지원 상태 |
|---|---|
| 3.14·3.13 | 버그 수정 |
| 3.12·3.11 | 보안 수정 |
| 3.10 | 보안 수정, 2026년 10월 지원 종료 예정 |
| 3.9 | 지원 종료 |

표는 2026년 9월 1일 [공식 지원표](https://devguide.python.org/versions/)를 기준으로 했습니다. 3.10 지원은 2026년 10월에 끝나므로 지금 업그레이드를 준비해야 합니다. 3.9는 2025년 10월 31일에 이미 끝났습니다.

새 판은 [Python 다운로드](https://www.python.org/downloads/)에서 받을 수 있습니다. 운영체제와 설치 도구마다 기존 판을 다루는 방식이 다르므로, 설치 뒤 `sys.version`을 다시 찍고 쓰던 코드와 패키지를 확인합니다.

출력된 버전이 지원 중이고 쓰던 코드와 패키지도 동작하면 확인을 마칩니다. 지원이 끝났거나 종료가 가까우면 별도 환경에서 새 버전으로 코드를 실행한 뒤 옮깁니다. 버전 번호만 바뀌고 코드가 깨진 상태라면 아직 전환이 끝난 것이 아닙니다.

## 더 해 볼 것

- 파이썬이라는 이름은 BBC 코미디 `Monty Python's Flying Circus`에서 따왔습니다. 이름을 고른 이야기는 [공식 FAQ](https://docs.python.org/3/faq/general.html#why-is-it-called-python)에 있습니다.
- 파이썬이 무엇을 바꾸는 중인지 직접 보려면 [PEP 목록](https://peps.python.org/)을 엽니다. `Accepted`는 수락된 제안입니다. 적용될 버전과 구현 상태는 각 제안에서 따로 확인합니다.
- GIL을 끌 수 있는 파이썬을 설치하려면 윈도우와 macOS 설치 프로그램에서 `free-threaded`를 고릅니다. 무엇이 아직 안 되는지는 [공식 free-threading 안내](https://docs.python.org/3/howto/free-threading-python.html)에 있습니다.
- 개발팀이 무엇을 하는지 따라가려면 [Python Insider](https://blog.python.org/)를 봅니다. 릴리스와 큰 변경이 여기에 먼저 올라옵니다.
- 파이썬 2 코드를 아직 들고 있다면 `2to3` 명령을 찾아도 없습니다. `2to3`와 `lib2to3`는 3.13에서 빠졌습니다. 3.12 이하를 따로 깔면 `2to3 -w 내파일.py`로 한 번은 돌릴 수 있습니다.
