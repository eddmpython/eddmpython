---
title: 자동화를 왜 파이썬으로 시작하나
slug: what-is-python
author: eddmpython
section: Python 학습과 자동화
summary: 자동화 도구가 여럿인데 파이썬을 고르는 이유를 남이 만들어 둔 코드가 많다는 것과 몇 달 뒤에도 읽힌다는 것 두 가지로 보고, 그 성질이 1989년에 정해졌다는 것과 파이썬이 맞지 않는 자리까지 확인합니다.
readerQuestion: 자동화 도구가 여럿인데 왜 파이썬으로 시작하나?
readerTakeaway: 파이썬을 고르는 이유는 남이 만들어 둔 코드를 불러 쓸 수 있고 몇 달 뒤에도 그 코드가 읽히기 때문이다.
readerLevel: beginner
readerStartingPoint: 자동화로 무엇이 되는지는 봤지만 파이썬이라는 이름만 들었을 뿐 코드를 한 줄도 써 본 적이 없다.
primaryKeyword: 파이썬 자동화
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f0/f05d6e40a7b4e6e7a81d9760c7f4f728da507b616abc9a1abc0c1e21dac80f7a.png
ogImageAlt: 같은 가격 합계를 계산하는 짧고 정돈된 코드와 기호가 많은 코드가 나란히 놓인 비교
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

파이썬만 있는 건 아닙니다. 엑셀에는 빠른 채우기와 매크로가 있고, 화면을 대신 눌러 주는 `RPA` 와 노코드 도구도 있죠. 화면 누르기만 하면 끝나는 일이라면 이쪽이 손이 덜 갑니다. 곤란해지는 자리는 앞에서 본 셋이 한 일감에 섞여 나올 때입니다. 조회한 값을 표에 채우고 합치고 문서로 내보내는 일을 도구 셋에 나눠 맡기면 그 사이를 사람이 이어 줘야 하거든요.

## 남이 만들어 둔 코드를 불러 씁니다

앞에서 마우스를 끈 `pyautogui` 와 브라우저를 연 `Playwright` 는 파이썬 문법이 아닙니다. 다른 사람이 만들어 공개한 코드 묶음이고 라이브러리라고 부르죠. 표를 다루는 `pandas`, 계산을 맡는 `NumPy`, 모델을 학습시키는 `PyTorch` 도 그런 묶음입니다. 중요한 건 개수가 아니라 셋이 전부 `import` 한 줄로 붙는다는 점이에요. 그 이음매가 여기서 사라집니다.

## 몇 달 뒤에도 읽혀야 고칠 수 있습니다

![같은 가격 합계를 계산하는 짧고 정돈된 코드와 기호가 많은 코드가 나란히 놓인 비교](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f0/f05d6e40a7b4e6e7a81d9760c7f4f728da507b616abc9a1abc0c1e21dac80f7a.png "같은 계산을 적는 방법이 언어마다 다릅니다")

자동화는 한 번 돌리고 끝나지 않습니다. 다음 달에 열어 조건을 바꾸는데 그때 코드를 못 읽으면 손을 못 대죠. 저도 여섯 줄짜리 계산을 두 달 뒤에 열었다가 위에서부터 다시 읽었습니다. 파이썬은 `if` 나 `for` 아래 줄을 같은 간격으로 들여쓰면 한 묶음입니다. 들여쓰기가 꾸밈이 아니라 실행 범위를 정하는 문법이거든요.

## 이 둘은 1989년에 정해졌습니다

![1989년 겨울 달력에서 시작한 코드가 1991년 공개와 2008년 Python 3 문서로 이어지는 연표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8d/8da6da4beb36a994488e2e79553ace349f184febbd16894cd9921188120495d8.png "처음의 두 선택이 오늘 자동화에 쓰이는 이유가 됩니다")

앞에서 본 두 성질은 우연이 아닙니다. 네덜란드 CWI 연구소의 Guido van Rossum 이 1989년 12월에 새 언어를 만들기 시작했는데, 그가 앞서 참여한 교육용 언어 ABC 는 문법이 읽기 쉬웠지만 외부 기능을 붙이기 어려웠죠. 그래서 들여쓰기로 코드 묶음을 눈에 보이게 하고, 성능이 필요한 기능은 `C` 로 만들어 연결할 수 있게 했습니다.

#### 참고 자료: 시작 기록

- [Guido van Rossum 이 쓴 Python 의 시작](https://www.python.org/doc/essays/foreword/)
- [Python 일반 FAQ 의 역사 설명](https://docs.python.org/3/faq/general.html#why-was-python-created-in-the-first-place)

무거운 계산을 `C` 로 넘긴다는 말을 뒤집으면 파이썬 혼자서는 그 계산이 느리다는 뜻이기도 합니다.

## 파이썬으로 열지 않는 편이 나은 자리

![브라우저, 모바일 앱, 고성능 엔진, 네트워크 서버, 데이터와 AI 작업이 알맞은 언어 경로로 나뉜 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9b/9b029651ee8ef83cbcd60e5a6bd3f5fdbf359d0200368fa3b4b4edb268651f94.png "할 일마다 먼저 열어 볼 언어가 다릅니다")

브라우저 화면은 `JavaScript`, 아이폰 앱은 `Swift`, 매 밀리초를 다투는 계산은 `C++` 이 맡습니다. 파이썬은 실행 속도가 빠른 언어가 아니고 `NumPy` 가 빠른 것도 무거운 계산을 `C` 에 넘기기 때문이죠. 개인적으로는 이 한계가 회사 업무에서는 거의 안 걸린다고 봅니다. 그럼 이제 진짜 코드를 한 줄 써 볼 차례인데, 설치는 안 해도 됩니다.
