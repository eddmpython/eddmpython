---
title: 파이썬 역사, 1991년 코드를 오늘 돌려 보면 무엇이 남아 있나
slug: python-history
author: eddmpython
section: 파이썬 이야기
summary: 파이썬 역사를 1989년의 시작과 1991년 공개 코드부터 따라갑니다. 당시 튜토리얼은 네 군데만 고치면 오늘도 읽히지만, 파이썬 3의 텍스트 처리처럼 뼈대를 건드린 변화도 있었습니다. 서로 다른 언어 순위와 현재 지원 버전까지 한 흐름으로 확인합니다.
readerQuestion: 파이썬은 35년 동안 무엇이 바뀌었고 무엇이 그대로이며 지금은 어디까지 와 있을까?
readerTakeaway: 1991년 파이썬의 기본 모양은 남았지만 텍스트 처리와 실행 방식은 크게 바뀌었다. 언어 순위는 서로 다른 것을 재므로 하려는 일과 지원 버전으로 선택해야 한다.
readerLevel: beginner
readerStartingPoint: 파이썬을 배우거나 고르는 중이고, 1991년 코드가 지금도 읽히는지와 파이썬 1위라는 숫자가 어디서 나왔는지는 모른다.
primaryKeyword: 파이썬 역사
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2d/2d262b3f368695458f52a10d478faf6064f6cdfaf03308fa0fe079173b18429c.webp
ogImageAlt: 어두운 책상 위에 금속 덩이 하나가 놓여 있고 왼쪽 면은 심하게 삭아 얽어 있으며 오른쪽 면은 매끈한데 가운데를 가로지르는 홈 하나가 양쪽으로 끊김 없이 이어진 장면
ogImageWidth: 1216
ogImageHeight: 832
ogImageType: image/webp
---

파이썬은 1989년 크리스마스 연휴에 만들기 시작했고 1991년 2월 처음 공개됐습니다. 공개된 지 35년이 지났지만, 당시 코드를 지금 돌리면 어디가 깨지고 무엇이 남는지 보여 주는 글은 드뭅니다.

1991년 튜토리얼 코드를 오늘 파이썬에 넣으면 네 군데가 깨지고 나머지는 그대로 읽힙니다. 반면 파이썬 2에서 3으로 넘어갈 때는 텍스트를 다루는 방식까지 바뀌어 두 판이 11년 넘게 함께 쓰였습니다.

언어 순위도 한 가지 답을 주지 않습니다. TIOBE는 파이썬을 1위로, Stack Overflow는 JavaScript를 1위로, GitHub은 TypeScript를 1위로 놓습니다. 셋 다 지금 살아 있는 최신 조사이고 셋 다 맞습니다. 이 글은 오래된 코드를 직접 돌린 뒤, 세 순위가 무엇을 재는지와 지금 지원받는 파이썬 버전까지 확인합니다.

![어두운 책상 위에 금속 덩이 하나가 놓여 있고 왼쪽 면은 심하게 삭아 얽어 있으며 오른쪽 면은 매끈한데 가운데를 가로지르는 홈 하나가 양쪽으로 끊김 없이 이어진 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2d/2d262b3f368695458f52a10d478faf6064f6cdfaf03308fa0fe079173b18429c.webp "35년 전에 정한 모양이 지금 것과 겹칩니다")

## 파이썬 역사의 시작, 1989년 크리스마스와 1991년 코드

귀도 반 로섬이 네덜란드의 연구소 CWI에서 파이썬을 만들기 시작한 때는 1989년 12월 크리스마스 연휴였습니다. 연휴에 시간이 비었기 때문에 이 일을 시작했고, 이름은 뱀이 아니라 1970년대 BBC 코미디 `Monty Python's Flying Circus`에서 따왔습니다. 당시 대본을 읽던 그는 짧고 겹치지 않으면서 조금 알쏭달쏭한 이름을 찾았다고 [공식 문서의 자주 묻는 질문](https://docs.python.org/3/faq/general.html#why-is-it-called-python)에 적혀 있습니다.

처음 공개된 파이썬은 1991년 2월 유즈넷의 `alt.sources`에 올라온 0.9.0입니다. 클래스와 상속, 예외 처리, 함수, 모듈, 그리고 중괄호 대신 들여쓰기로 블록을 나누는 방식이 이때 이미 있었습니다.

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

1991년에는 같은지 비교하는 기호가 `=` 하나였습니다. `==`가 없었습니다. 그래서 오늘 파이썬은 이 줄을 비교가 아니라 대입으로 읽고 멈춥니다.

위 코드는 예제를 줄인 것이라 깨지는 자리가 하나만 보입니다. 튜토리얼 전체를 오늘 파이썬에 넣으면 넷이 깨집니다. 같은지 비교하는 `=`, 상속을 적는 방식, 예외를 던지는 방식, 그리고 `print`입니다.

| 1991년에 쓰던 것 | 오늘 |
|---|---|
| `if a[i] = e:` | `if a[i] == e:` |
| `class Sub() = Base:` | `class Sub(Base):` |
| `raise Error, '메시지'` | `raise Error('메시지')` |
| `print x` | `print(x)` |

나머지는 그대로입니다. `class`로 클래스를 열고 `def`로 메서드를 만들고 첫 인자로 `self`를 받는 것이 1991년 모양 그대로입니다. 속성에 값을 넣는 것도, 리스트에 붙이는 것도, `in`으로 확인하고 `for`로 돌고 `del`로 지우는 것도 오늘 그대로 읽힙니다.

1991년에 잡은 기본 모양은 놀랄 만큼 많이 남았습니다. 아래 칸에 그 `Set` 클래스가 들어 있습니다. 눌러 보면 어디서 멈추는지 보이고, 위 표대로 고쳐서 다시 누르면 그 자리에서 돌아갑니다.

https://eddmpython.com/codaro/run/?example=py-1991-syntax

다만 35년의 변화가 철자뿐이었던 것은 아닙니다. 위 표의 `print`를 바꾼 파이썬 3은 텍스트를 다루는 방식까지 갈랐고, 그 변화 때문에 파이썬 2와 3은 11년 넘게 함께 쓰였습니다.

## 파이썬 2에서 3으로, 2008년부터 2020년까지

![어두운 바닥에 놓인 넓은 판 하나가 가운데에서 갈라져 두 조각으로 벌어져 있고 그 틈을 가로질러 가는 다리 하나가 밝게 놓인 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/dd/dd263228b071495adb445023a0ceb12bbabdb1c6f58eb5479d2adf5e8475af91.webp "3.0은 2와 호환되지 않는 판이었습니다")

파이썬 2.0은 2000년에 나왔습니다. 목록을 한 줄로 만들어 내는 리스트 컴프리헨션과 한글 같은 글자를 다루는 유니코드 문자열이 이때 들어왔습니다.

3.0은 2008년 12월에 나왔습니다. 파이썬 개발팀이 2와 일부러 호환되지 않게 만든 판입니다. 가장 눈에 띄는 변화는 `print`였는데, 2에서는 문법 요소였고 3에서는 함수가 됐습니다. 이 변경은 [PEP 3105](https://peps.python.org/pep-3105/)로 정해졌습니다. PEP는 파이썬을 어떻게 바꿀지 적어서 공개로 논의하는 제안서입니다.

2에서 쓰던 `print`를 오늘 파이썬에 넣으면 이렇게 멈춥니다.

```python
print "안녕"
```

```text
SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?
```

더 큰 변화는 눈에 안 보이는 쪽이었습니다. 컴퓨터에서 글자는 숫자로 저장되고, 그 숫자를 글자로 되돌리는 규칙이 인코딩입니다. 파이썬 2에서 `str`은 바이트였고 텍스트는 따로 `unicode` 타입이었습니다. 파이썬 3은 `str`을 텍스트로 만들고 바이트는 `bytes`로 분리했습니다.

그래서 파이썬 3에서 `str`과 `bytes`를 섞어 더하면 그 자리에서 오류로 멈춥니다. 한글이 나중에 깨진 채 발견되는 것보다, 텍스트와 바이트가 만난 자리에서 문제를 확인하는 편이 고치기 쉽습니다.

이 호환성 변화 때문에 옮겨 가는 데 오래 걸렸습니다. 3.0이 2008년 12월에 나왔고 2.7 지원이 2020년 1월 1일에 끝났으니 두 판이 11년 넘게 함께 살았습니다. [PEP 373](https://peps.python.org/pep-0373/)에 따르면 2.7 지원 종료는 원래 계획한 2015년보다 5년 늦춰졌습니다.

지금 파이썬 2.7은 지원이 끝난 판입니다. 아래 칸에서는 2의 `print` 문법이 파이썬 3에서 어떤 오류를 내는지 바로 볼 수 있습니다.

https://eddmpython.com/codaro/run/?example=py-two-to-three

그렇게 11년을 끌고도 파이썬은 어느 조사에서나 앞자리에 있습니다. 몇 위인지가 조사마다 다를 뿐입니다.

## 순위표마다 1위가 다른 이유

세 조사를 나란히 놓으면 이렇습니다.

| 조사 | 파이썬 | JavaScript | 1위 | 세는 것 |
|---|---|---|---|---|
| [TIOBE](https://www.tiobe.com/tiobe-index/) 2026년 8월 | 1위 18.53% | 6위 2.63% | 파이썬 | 웹 검색과 강의, 공급업체로 계산한 관심도 |
| [Stack Overflow](https://survey.stackoverflow.co/2025/technology) 2025 | 4위 57.9% | 1위 66% | JavaScript | 지난 1년간 썼다고 답한 사람의 비율 |
| [GitHub Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/) 2025 | 2위 | 3위 | TypeScript | 2025년 8월 월간 기여자 수 |

같은 JavaScript가 한 표에서 6위이고 다른 표에서 1위입니다. 조사가 틀린 것이 아니라 서로 다른 질문에 답한 것입니다. 표에 있는 두 퍼센트를 서로 견주면 안 됩니다. TIOBE에서 18.53%는 검색에서 차지한 몫이고, Stack Overflow에서 57.9%는 지난 1년 동안 그 언어를 썼다고 답한 사람의 비율입니다.

TIOBE는 Google, Amazon, Wikipedia, Bing을 비롯한 20곳이 넘는 웹사이트에서 검색 결과를 모아 지수를 계산합니다. 숙련된 개발자와 강의, 외부 공급업체가 얼마나 보이는지도 이 계산에 들어갑니다. TIOBE 자신도 이 숫자는 최고의 언어나 작성된 코드의 양을 뜻하지 않는다고 밝힙니다.

Stack Overflow는 개발자에게 직접 묻습니다. 지난 1년 동안 그 언어로 개발을 많이 했느냐는 물음에 그렇다고 답한 비율입니다. 웹 페이지를 만들면 JavaScript와 HTML을 안 쓸 수가 없으니 그쪽이 높게 나옵니다. 여러 개를 고를 수 있어서 합이 100%를 넘습니다.

GitHub은 월간 기여자 수를 셉니다. Octoverse 2025에서 TypeScript는 2025년 8월 파이썬을 약 4만 2천 명 차이로 넘어섰고, 파이썬은 2위에 남았습니다. 같은 보고서에서는 파이썬이 AI와 데이터 과학 작업에서 여전히 앞선다고 설명합니다.

그래서 순위표로 언어를 고르면 무엇을 놓칠까요? 세 표 어디에도 `내가 하려는 일에 맞는가`는 없습니다. 데이터 분석이나 AI 자동화를 하려면 파이썬 생태계를 먼저 보고, 브라우저 화면을 만들려면 JavaScript와 TypeScript 생태계를 먼저 봐야 합니다. 순위는 그 판단을 대신해 주지 않습니다.

순위가 알려 주지 않는 것이 하나 더 있습니다. 지금 이 언어 안에서 무엇이 바뀌는 중인지입니다.

## 지금 빨라지는 세 갈래, 그중 하나가 GIL

![어두운 바닥이 넓은 판으로 갈라져 있고 그 사이를 지나는 아주 좁은 통로 하나만 멀리까지 이어지며 그 안에 작은 불빛이 켜진 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/bc/bc6d287b4a9a6edb25e2a55975d68a281ff08dfe12ce146fc7adb898d6e3c39b.webp "셋 중 하나가 이 좁은 자리를 넓히는 일입니다")

파이썬은 느리다는 말을 오래 들었습니다. 그 말이 지금도 맞지만, 파이썬 개발팀이 최근 몇 년 사이 여기에 크게 손을 대고 있습니다.

먼저 내 코드를 읽어서 실행하는 인터프리터가 빨라졌습니다. [Python 3.11 공식 설명](https://docs.python.org/3/whatsnew/3.11.html#faster-cpython)은 3.11이 3.10보다 평균 25% 빠르다고 밝힙니다. 코드를 한 줄도 고치지 않고 버전만 올려 얻는 속도입니다.

두 번째가 GIL입니다. GIL이 켜진 일반 CPython에서는 CPU 작업을 하는 스레드 가운데 하나만 한 시점에 파이썬 바이트코드를 실행합니다. 파일이나 네트워크를 기다리는 스레드는 겹쳐서 움직일 수 있고, 일부 외부 패키지는 계산하는 동안 GIL을 놓기도 합니다. 그래도 CPU 계산만 하는 순수 파이썬 코드는 스레드를 늘려도 여러 코어를 동시에 쓰기 어렵습니다.

지금 내 파이썬에 그 자물쇠가 걸려 있는지는 아래 코드로 볼 수 있습니다. 3.13보다 낮은 판에서도 실행되며, 그때는 GIL이 켜진 것으로 표시합니다.

```python
import sys
import sysconfig

gilEnabled = sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True

print("이 파이썬     ", sys.version.split()[0])
print("GIL 켜져 있나 ", gilEnabled)
print("GIL 없는 빌드 ", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
```

첫 줄에는 지금 쓰는 판이 찍힙니다. 둘째 줄의 `sys._is_gil_enabled()`는 현재 GIL이 켜져 있는지 보여 줍니다. 셋째 줄의 `sysconfig.get_config_var("Py_GIL_DISABLED")`는 GIL을 끌 수 있는 빌드인지 가립니다. `GIL 없는 빌드`가 `False`면 애초에 끌 수 없는 일반 빌드입니다.

https://eddmpython.com/codaro/run/?example=py-gil-check

이 자물쇠를 선택해서 끌 수 있게 만든 것이 [PEP 703](https://peps.python.org/pep-0703/)입니다. `free-threaded` 빌드는 3.13에 실험으로 들어왔고, 3.14에서는 [PEP 779](https://peps.python.org/pep-0779/)가 정한 기준을 채워 공식 지원 단계가 됐습니다. 다만 기본 빌드는 여전히 GIL을 켭니다. [공식 안내](https://docs.python.org/3/howto/free-threading-python.html)에 따르면 `free-threaded` 빌드의 단일 스레드 평균 부담은 환경에 따라 약 1%에서 8%입니다. 여러 코어를 쓰는 대신 그 부담과 패키지 호환성을 함께 확인해야 합니다.

세 번째는 자주 도는 코드를 컴퓨터가 바로 알아듣는 말로 미리 바꿔 두는 JIT입니다. 3.13에 실험으로 들어왔고, 3.14의 공식 macOS와 Windows 바이너리에도 포함됐습니다. 아직 실험 기능이며 기본으로 켜지지 않습니다.

둘의 상태는 다릅니다. `free-threaded` 빌드는 지원되는 선택지가 됐고 JIT는 아직 실험입니다. 그러면 이 변화가 들어오는 새 판은 언제 나올까요?

## 파이썬 버전은 매년 10월, 지원은 5년

2026년 9월 1일 기준 최신 안정 버전은 3.14.7이고 3.15는 시험판입니다. [PEP 790](https://peps.python.org/pep-0790/)의 일정대로면 3.15.0은 2026년 10월 1일에 나옵니다.

[PEP 602](https://peps.python.org/pep-0602/)가 정한 출시 주기는 매년 10월 한 번입니다. 3.13부터는 한 판이 나온 뒤 처음 2년 동안 버그를 고치고, 다음 3년 동안 보안 문제를 고칩니다. 그래서 한 판의 지원 기간은 모두 5년입니다.

이제 이 주기를 내 파이썬에 대 보면 됩니다.

## 무엇을 하면 되나

파이썬을 배울지 고민하는 중이라면 순위보다 하려는 일을 먼저 봅니다. 아직 파이썬을 깔지 않았다면 이 글의 실행 칸에서 1991년 코드를 눌러 보는 것으로 시작할 수 있습니다.

이미 파이썬을 쓰고 있다면 지금 쓰는 판이 지원받는지 확인합니다. 터미널에서는 `python --version`을 쓰고, 코드 안에서는 `sys.version`을 찍으면 됩니다.

```python
import sys

print(sys.version.split()[0])
```

2026년 9월 1일 [공식 지원표](https://devguide.python.org/versions/)에서 3.14와 3.13은 버그 수정 단계이고, 3.12와 3.11은 보안 수정 단계입니다. 3.10 지원은 2026년 10월에 끝나므로 지금 업그레이드를 준비해야 합니다. 3.9는 2025년 10월 31일에 이미 끝났습니다.

새 판은 [Python 다운로드](https://www.python.org/downloads/)에서 받을 수 있습니다. 운영체제와 설치 도구마다 기존 판을 다루는 방식이 다르므로, 설치 뒤 `sys.version`을 다시 찍고 쓰던 코드와 패키지를 확인합니다.

순위표는 어떤 언어가 많이 보이는지 알려 주지만 내 일을 대신 골라 주지는 않습니다. 1991년 코드가 보여 주듯 파이썬의 기본 모양은 오래 남았고, 지원표가 보여 주듯 지금 쓸 판은 계속 바뀝니다. 하려는 일로 언어를 고르고 지원 상태로 버전을 고르면 됩니다.

## 더 해 볼 것

- 파이썬이 무엇을 바꾸는 중인지 직접 보려면 [PEP 목록](https://peps.python.org/)을 엽니다. `Accepted`만 걸러 보면 다음 판에 들어올 것이 보입니다.
- 자물쇠 없는 파이썬은 윈도우와 macOS 설치 프로그램에서 `free-threaded`를 골라 켭니다. 무엇이 아직 안 되는지는 [공식 free-threading 안내](https://docs.python.org/3/howto/free-threading-python.html)에 있습니다.
- 개발팀이 무엇을 하는지 따라가려면 [Python Insider](https://blog.python.org/)를 봅니다. 릴리스와 큰 변경이 여기에 먼저 올라옵니다.
- 파이썬 2 코드를 아직 들고 있다면 `2to3` 명령을 찾아도 없습니다. `2to3`와 `lib2to3`는 3.13에서 빠졌습니다. 3.12 이하를 따로 깔면 `2to3 -w 내파일.py`로 한 번은 돌릴 수 있습니다.
