---
title: 파이썬 기초문법을 1분 영상으로 끝내는 방법
slug: python-basic-syntax
author: eddmpython
section: Python 학습과 자동화
summary: 파이썬 기초문법을 1분 영상으로 먼저 보고 하나도 못 알아듣는 상태에서 시작해, 지출내역 세 건을 검토하는 코드를 한 단계씩 만들며 그 영상이 읽히는 지점까지 갑니다.
readerQuestion: 파이썬 문법을 대체 얼마나 배워야 회사 일을 자동화할 수 있나?
readerTakeaway: 지출내역 하나를 끝까지 처리하는 데 필요한 문법은 여섯 개뿐이고, 각각은 앞 단계가 못 하는 것을 메우려고 나온다.
readerLevel: beginner
readerStartingPoint: 브라우저에서 파이썬 코드 한 줄은 실행해 봤지만 변수나 리스트 같은 말은 들어 본 적이 없다.
primaryKeyword: 파이썬 기초문법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/34/34c96f6b38214b253f61acaa2ef46cb2ee75249bf16873ffc13975249b85ebcd.png
ogImageAlt: 지출내역 입력이 변수와 리스트와 딕셔너리 및 조건과 반복과 함수를 지나 결과표로 바뀌는 전체 코드 지도
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

먼저 영상 하나만 보시겠어요?

## 파이썬 기초문법, 1분이면 된다고 하면 믿기시나요

![지출내역 입력이 변수와 리스트와 딕셔너리 및 조건과 반복과 함수를 지나 결과표로 바뀌는 전체 코드 지도](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/34/34c96f6b38214b253f61acaa2ef46cb2ee75249bf16873ffc13975249b85ebcd.png "이 지도의 각 칸이 아래에서 하나씩 열립니다")

[파이썬 필수 기초 1분 영상](https://www.youtube.com/shorts/priwCYZJ8h4)을 먼저 보시기 바랍니다. 회사 업무 자동화에 필요한 파이썬 문법이 저 1분에 다 들어 있습니다.

다 보셨나요? 그리고 지금 무슨 생각이 드시나요?

저라면 이럴 겁니다. 저게 무슨 소린지 하나도 모르겠는데 1분이면 된다니 장난하나 싶죠. 맞습니다. 저 영상만 보고 코드를 쓸 수 있는 사람은 없습니다. 이번 프로그램의 입력은 부서와 금액이 들어 있는 지출내역 세 건입니다. 이 세 건을 검토하는 코드를 지금부터 한 칸씩 만들어 보겠습니다. 다 만들고 나서 영상을 다시 보시면 그때는 읽힙니다.

## 값에 이름부터 붙입니다

![부서와 금액과 기준값 카드가 각각의 변수 이름표에 연결되고 출력 문장에 다시 사용되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/18/18a507345379e23d2ab8b2b34821da8648e06fceeecf2368abdf6158aa476154.png "등호는 같다는 뜻이 아니라 오른쪽 값에 왼쪽 이름을 붙이라는 지시입니다")

영업팀이 12만원을 썼고 검토 기준이 10만원이라고 하겠습니다. 이 셋에 각각 이름을 붙여 두면 아래 줄에서 그 이름으로 다시 꺼내 쓸 수 있습니다. 이렇게 붙이는 이름을 변수라고 부릅니다. 변수는 값을 다시 찾기 위해 붙이는 이름입니다.

https://eddmpython.com/codaro/run/?example=expense-variables

`department` 를 다른 부서로 바꾸고 실행해 보시기 바랍니다. 아래 문장이 따라 바뀌죠? 이름을 한 번 붙여 두면 값이 바뀌어도 코드는 그대로입니다.

그런데 회사 지출내역이 한 건일 리가 없습니다. 300건이면 이름을 300개 만들어야 할까요?

## 여러 값은 하나로 묶습니다

![금액 카드 세 장이 대괄호 모양 목록에 입력 순서대로 들어가고 건수와 합계 결과로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/96/96aca7768b408fc5f4d264436f5c513e03c7fe4fb0469311fc973073afd63d54.png "대괄호 안에 넣은 순서가 그대로 유지됩니다")

대괄호 `[ ]` 안에 금액을 쉼표로 나눠 적으면 이름 하나에 다 들어갑니다. 300건을 담아도 코드 길이는 그대로죠. 이 그릇을 리스트라고 부릅니다. 리스트는 여러 값을 순서대로 담는 자료형입니다.

https://eddmpython.com/codaro/run/?example=expense-list-total

`len` 이 건수를 세고 `sum` 이 합계를 냅니다. 금액을 하나 더 넣고 실행하면 둘 다 같이 바뀝니다.

다만 리스트는 순서로만 찾습니다. 두 번째 값을 꺼내려면 두 번째라는 걸 알고 있어야 하죠. 엑셀에서 열 위치가 바뀌면 수식이 어긋나는 것과 같습니다. 이름으로 찾을 수는 없을까요?

## 이름으로 찾으려면 짝을 지어 둡니다

![원본 Excel 열 이름 카드 세 장이 각각의 표준 열 이름 카드와 한 쌍으로 연결된 변환표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/71/716598bedae7e253bc30eb531341bdc6f91267aad3f4767b4b07b799dab5694e.png "왼쪽 이름을 넣으면 오른쪽 값이 나옵니다")

딕셔너리는 키와 값을 한 쌍으로 묶는 자료형입니다. 중괄호 `{ }` 안에 `이름: 값` 형태로 적습니다. 부서마다 엑셀 열 이름이 `조직`, `사용부서`, `팀` 으로 제각각일 때 이걸로 표준 이름에 맞춥니다.

https://eddmpython.com/codaro/run/?example=expense-column-map

`column_map["사용금액"]` 처럼 이름을 넣으면 짝지어 둔 값이 나옵니다. 몇 번째인지 셀 필요가 없죠.

여기까지 오면 값을 담을 수는 있습니다. 그런데 담은 것을 보고 무엇을 할지는 아직 하나도 정하지 않았습니다.

## 기준을 넘는지 갈라 봅니다

![지출 금액과 기준금액이 비교 지점에 들어가고 닫힌 결과 카드와 열린 결과 카드 중 하나가 선택되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/52/5274db969e51c93221735e8d221b39f0c4a8e985a36de149a71cb6fba2722c50.png "비교 결과가 참이면 위쪽 줄이, 거짓이면 아래쪽 줄이 실행됩니다")

조건문은 비교 결과에 따라 실행할 코드 묶음을 고릅니다. `if` 아래 들여쓴 줄은 조건이 참일 때만 돌고, `else` 아래 들여쓴 줄은 거짓일 때만 돕니다.

https://eddmpython.com/codaro/run/?example=expense-condition

`amount` 를 `100000` 으로 정확히 맞추고 실행해 보시기 바랍니다. `확인필요` 가 나옵니다. `>=` 는 같은 값도 포함하기 때문이죠. 부호 하나 때문에 결산 때 건수가 안 맞는 일이 실제로 생깁니다. `>` 로 바꾸면 `정상` 으로 뒤집힙니다.

이제 `120000` 한 건은 갈랐습니다. 그런데 300건을 이렇게 하나씩 적을 수는 없겠죠.

## 같은 판단을 건마다 되풀이합니다

![금액 목록의 세 카드가 같은 비교 코드 블록을 차례로 통과해 세 줄의 결과 목록으로 쌓이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c4/c488ba7323bf36a02f765f8644dfac04919af49d124d8a564f2fb9cca9f1ccfc.png "목록의 값이 하나씩 같은 코드를 통과합니다")

반복문은 여러 항목에 같은 코드를 적용합니다. `for amount in amounts:` 는 목록에서 값을 하나 꺼내 `amount` 라는 이름에 넣고 아래 들여쓴 줄을 실행하는 일을 목록이 빌 때까지 되풀이합니다.

https://eddmpython.com/codaro/run/?example=expense-loop

금액을 하나 더 넣고 실행하면 결과가 한 줄 더 늘어납니다. 코드는 한 글자도 안 고쳤는데 말이죠. 300건이든 3만 건이든 같습니다.

이 규칙을 다른 파일에서도 쓰고 싶으면 어떻게 할까요? 지금은 반복문 안에 규칙이 박혀 있어서 통째로 복사해야 합니다.

## 규칙에 이름을 붙여 다시 씁니다

![서로 다른 금액 카드가 금액과 기준 입력칸이 있는 하나의 함수 코드 블록을 지나 분류 결과로 나오는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/09/09f955a54389759a8505a136952fc826f81956cccf9d13c23efcdffbbe071e82.png "입력을 받아 결과를 돌려주는 한 덩어리에 이름을 붙입니다")

`def` 로 시작해 이름과 받을 값을 적고 결과를 `return` 으로 돌려주면, 그 덩어리를 어디서든 이름으로 부를 수 있습니다. 엑셀의 사용자 정의 함수와 같은 자리죠. 함수는 여러 줄의 코드에 이름을 붙인 것입니다.

https://eddmpython.com/codaro/run/?example=expense-function

같은 `classify_expense` 를 세 번 부르는데 코드는 한 번만 적혀 있습니다. 기준을 바꿀 일이 생기면 이 한 곳만 고치면 되고요. 개인적으로는 이 지점부터 코드가 자산이 된다고 봅니다.

그럼 지금까지 만든 것을 한 파일에 모으면 어떻게 될까요?

## 문법 여섯이 모이면 영상이 읽힙니다

![부서별 지출 딕셔너리 세 건이 여섯 문법의 코드 단계를 지나 합계와 거래별 분류 결과표로 바뀌는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/24/2488fb08e37335b290eb7f97b6aafd94999e515c5ef34bb4650e9b4554dbfafd.png "위에서 하나씩 열어 본 칸이 전부 여기 들어 있습니다")

완성 예제의 입력은 딕셔너리 세 개를 담은 리스트입니다. 거래마다 부서와 금액이 짝지어 들어 있고, 반복문이 그것을 하나씩 꺼내 함수로 분류하고, 결과를 다시 목록에 쌓습니다.

https://eddmpython.com/codaro/run/?example=expense-syntax-together

`amount_limit` 을 `50000` 으로 낮추고 실행해 보시기 바랍니다. 확인필요 건수가 늘어나죠? 전표 검토 기준을 바꾸는 일이 코드 한 줄입니다.

세어 보면 여섯입니다. 이름 붙이기, 묶기, 짝짓기, 가르기, 되풀이하기, 다시 쓰기. 각각은 앞 단계가 못 하는 것을 메우려고 나왔습니다. 외울 목록이 아니라 막힐 때마다 하나씩 꺼내 쓰는 도구인 셈이죠.

이제 [맨 위 영상](https://www.youtube.com/shorts/priwCYZJ8h4)을 다시 보시기 바랍니다. 아까는 1분이 장난 같았는데 지금은 어떠신가요?

다만 지금까지 다룬 값은 전부 코드 안에 직접 적은 것입니다. 진짜 엑셀 파일을 열어서 읽어 오는 일은 아직 하지 않았습니다.
