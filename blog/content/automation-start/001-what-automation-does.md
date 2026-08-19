---
title: 업무 자동화로 무엇이 되는지 화면으로 본다
slug: what-automation-does
author: eddmpython
section: Python 학습과 자동화
summary: 업무 자동화가 실제로 무엇을 하는지 혼자 돌아가는 화면 다섯 개로 보고, 그 일들이 화면 누르기와 값 옮기기와 값 만들기 세 종류로 갈린다는 것을 확인합니다.
readerQuestion: 업무 자동화라는 말은 들었는데, 실제로 무엇이 되나?
readerTakeaway: 자동화가 하는 일은 화면을 대신 누르기, 흩어진 값을 찾아 모으기, 없는 값을 만들기 세 종류다.
readerLevel: beginner
readerStartingPoint: 엑셀은 매일 쓰지만 코드를 한 줄도 써 본 적이 없고, 자동화라는 말이 정확히 무엇을 가리키는지 모른다.
primaryKeyword: 업무 자동화
searchIntent: explanation
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3a/3a32ae457b3851760457c6ce147e7297127ad3e7d403f3d45c3967fc1b8e9a44.png
ogImageAlt: 하나의 Python 파일이 표 계산, 웹 요청, 자동화 시계, AI 모델 결과에 각각 연결된 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

업무 자동화란 뭘까요? 사람이 매달 똑같이 하던 손동작을 글로 적어 두고, 컴퓨터가 그 글을 읽어 대신하게 하는 일입니다. 말로만 들으면 잘 안 잡히죠. 그래서 혼자 돌아가는 화면 다섯 개를 먼저 보겠습니다.

## 마우스를 사람이 안 잡아도 그림이 그려집니다

![왼쪽 코드가 실행되는 동안 오른쪽 그림판에 사각 나선이 그려지는 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/26/26a61e5a395d39d010b201143df44ff76e3725c913d1c9a4399c314e8dbb288d.mp4 "왼쪽 코드를 실행하자 오른쪽 그림판에서 선이 이어집니다")

왼쪽에서 코드가 실행되는 동안 오른쪽 그림판에 사각 나선이 생깁니다. 마우스 포인터가 움직이는데 그 마우스를 잡은 사람은 없습니다. `pyautogui.drag` 라는 한 줄이 마우스를 200픽셀 끌고 다음 줄이 방향을 바꿉니다. 사람 손이 하던 동작을 순서대로 적어 두고 되풀이한 것이죠. 그럼 내 컴퓨터의 그림판에서만 되는 일일까요?

## 브라우저 안에서도 대신 눌러 줍니다

![공식 할 일 목록에 Buy milk가 입력되고 완료로 표시되는 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6d/6d7cfb1ebc80d49de79f20640d4ca71260aad30ae7ebb9c0236622244c5978e9.mp4 "입력칸에 글자가 들어가고 첫 줄에 완료 표시가 켜집니다")

브라우저가 열리고 입력칸에 `Buy milk` 가 찍히고 목록에 줄이 하나씩 쌓입니다. 마지막에 첫 줄이 완료로 바뀌죠. `Playwright` 가 공개 데모 주소를 열고 칸을 찾아 글자를 넣고 체크박스를 눌렀습니다. 다만 넣은 값은 둘 다 제가 미리 코드에 적어 둔 것이었습니다. 회사 일은 넣을 값을 미리 모르는 경우가 훨씬 많은데 말이죠.

## 실행 전에 몰랐던 값을 받아 옵니다

![사업자등록번호를 넣자 표에 계속사업자라는 상태가 채워지는 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5e/5e4de925132c227ae7380d32d551c427793a4ff40006d02f321f4f06259c8b1d.mp4 "번호를 넣은 칸 옆에 조회 결과가 하나씩 들어옵니다")

왼쪽 칸에 사업자등록번호를 넣으면 오른쪽 칸에 `계속사업자` 가 채워집니다. 국세청 홈페이지를 열고 번호를 붙여 넣고 결과를 옮겨 적던 일이죠. 이 답은 실행하기 전에 알 수 없었습니다. 국세청 조회 창구에 물어보고 받아 온 값이니까요. 거래처가 300곳이면 300번 붙여 넣던 일입니다. 그럼 이미 내 컴퓨터에 있는 파일은 어떨까요?

## 내 엑셀 파일도 같은 식으로 넘깁니다

![엑셀 파일을 올리자 계정별 막대 그래프 대시보드가 생기는 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/45/45a2d0545791403e5c48fd1115880a14c8da715d3e3b31cc440c4a486d8b7d1e.mp4 "파일을 올린 직후 계정별 카드가 화면에 깔립니다")

엑셀 파일을 올리자 이자수익, 보험료 같은 계정 이름별로 막대 그래프 카드가 깔립니다. 시트를 열고 범위를 잡고 차트를 넣던 순서를 한 번 적어 두면 다음 달 파일에도 그대로 적용되죠. 앞의 조회와 이 대시보드는 새 숫자를 만들지 않았습니다. 있던 값을 가져다 자리만 바꿨으니 의심되면 원본을 열어 대조하면 됩니다.

## 없는 값을 만들어 내기도 합니다

![나스닥 숫자 표와 앞으로 30일 예측 선이 한 화면에 나타나는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/af/af0807f0918766f5780d23f06fb42e1055b8803d22a44fec22ed19120a7718c6.mp4 "표 오른쪽 끝에서 선이 앞으로 더 이어져 나갑니다")

나스닥과 예측 모델을 고르면 지난 시세 1,482행을 읽고 앞으로 30일 선을 그립니다. 표 오른쪽 끝에서 선이 더 이어지는 부분이 아직 오지 않은 날짜입니다. 이 30일치는 어느 화면에도 어느 파일에도 없던 값입니다. 지난 값에서 뽑아낸 추정이라 참고용이지 약속이 아니죠. 앞 절과 달리 대조할 원본이 없습니다.

## 업무 자동화 한 건에 셋이 섞여 있습니다

![하나의 Python 파일이 표 계산, 웹 요청, 자동화 시계, AI 모델 결과에 각각 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3a/3a32ae457b3851760457c6ce147e7297127ad3e7d403f3d45c3967fc1b8e9a44.png "파일 하나가 목적에 맞는 도구를 하나씩 불러 씁니다")

지금까지 본 다섯 화면을 하는 일로 묶으면 셋이 됩니다. 무엇을 자동화할지 고를 때 이 구분이 먼저입니다. 종류가 다르면 걸리는 곳도 다르고 결과가 맞는지 확인하는 방법도 달라지기 때문이죠. 그리고 회사에서 한 번 손대는 일에는 이 셋이 대개 섞여 나옵니다.

- **화면을 대신 누르기** 사람 손이 하던 동작을 순서대로 적어 두고 되풀이합니다.
- **흩어진 값을 찾아 모으기** 홈페이지나 파일에 이미 있는 값을 가져다 한자리에 놓습니다.
- **없는 값을 만들기** 있는 값에서 아직 없는 값을 추정해 냅니다.

거래처 상태를 조회해서 채우고, 월별 파일을 합쳐서 보고, 다음 달 예상을 가늠하는 식이죠. 지금 눌러 보고 싶으시면 [Codaro 학습 화면](https://eddmpython.com/codaro/learn/)이나 [xlpod 앱](https://xlpod.eddmpython.com/)을 열어 보시기 바랍니다. 그럼 이 셋을 무엇으로 만들까요? 엑셀 매크로도 `RPA` 도 있는데 파이썬을 고르는 이유가 따로 있습니다.
