---
title: AI 오류보고 작성 방법: 한 번에 재현되는 6가지 정보
slug: structured-error-report
author: eddmpython
section: AI 작업 환경
summary: AI 오류보고 작성 방법을 환경과 실행 명령, 합성 입력, 기대와 실제, Traceback, 변경 상태 여섯 가지로 설명합니다.
readerQuestion: 오류 메시지 한 줄 대신 무엇을 보내야 AI가 같은 실패를 재현하고 정확히 고칠 수 있을까?
readerTakeaway: 환경, 실행 명령, 최소 합성 입력, 기대 결과, 실제 결과와 Traceback, 변경 상태 여섯 가지를 복사 가능한 보고서로 전달한다.
readerLevel: beginner
readerStartingPoint: Python 프로젝트를 터미널에서 실행할 수 있고 오류의 Traceback을 복사할 수 있는 상태입니다.
primaryKeyword: AI 오류보고 작성 방법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/74/74109a9a4e7da1bb5b6da1ce846eec8d7cf501ce1ba481e217097cd5742b1d1b.png
ogImageAlt: 환경과 명령 및 입력과 기대와 실제 및 변경 상태 여섯 칸으로 구성된 AI 오류보고
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`AI 오류보고 작성 방법`은 오류 문장을 길게 설명하는 기술이 아닙니다. AI가 내 컴퓨터에서 일어난 실패를 다른 대화에서도 같은 명령과 입력으로 다시 만들 수 있게 정보를 묶는 방법입니다.

`안 돼요`나 Traceback 마지막 한 줄만 보내면 AI는 환경과 입력을 추측합니다. 환경, 명령, 입력, 기대, 실제와 Traceback, 변경 상태 여섯 가지를 고정하면 원인 후보가 빠르게 줄어듭니다.

## 오류보고에 여섯 가지 정보를 넣습니다

### 환경부터 변경 상태까지 서로 다른 칸으로 나눠 빠진 정보를 찾습니다

![환경과 명령 및 입력과 기대와 실제 및 변경 상태 여섯 칸으로 구성된 AI 오류보고](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/74/74109a9a4e7da1bb5b6da1ce846eec8d7cf501ce1ba481e217097cd5742b1d1b.png "여섯 칸이 하나의 재현 절차로 이어지고 빈 정보는 경고로 표시됩니다")

환경에는 운영체제 이름만 쓰지 않습니다. Python 버전, 의존성 설치 명령, 현재 작업 폴더를 적습니다. 실행 명령은 기억으로 바꾸지 말고 실패했을 때 실제로 입력한 줄을 그대로 복사합니다.

기대와 실제도 분리합니다. `결과가 이상함` 대신 기대한 파일과 숫자, 실제로 생성된 파일과 숫자를 적습니다. 마지막으로 `git status --short` 결과를 넣어 오류 전후 어떤 파일이 바뀌었는지 보여 줍니다.

#### 설명 목록

1. 환경: 운영체제, Python 버전, 의존성 설치 상태
2. 실행 명령: 실패를 만든 정확한 한 줄
3. 입력: 민감정보를 뺀 최소 합성 데이터
4. 기대 결과: 파일, 시트, 행 수, 합계
5. 실제 결과: 화면 출력과 전체 Traceback
6. 변경 상태: 최근 변경과 `git status --short`

## 최소 합성 입력으로 실패를 작게 만듭니다

### 회사 원본 대신 같은 열 누락을 만드는 두 행 파일을 사용합니다

![큰 회사 원본 Excel에서 민감정보가 제거된 두 행 합성 파일로 오류가 작아지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/2c/2cb1c25ad43fdda1d708ecf9a71f1877e3e0b7845cd5f8c509b996b1c979aed5.png "원본은 공유 경계 안에 남고 오류 조건만 가진 작은 입력이 재현에 사용됩니다")

수백 행짜리 원본 파일을 보내면 어떤 셀이 원인인지 찾기 어렵고 민감정보도 노출될 수 있습니다. 오류가 사라지지 않는 범위에서 행과 열을 줄입니다. 열 누락 오류라면 정상 열 두 개와 빠진 열 하나가 보이는 두 행이면 충분할 수 있습니다.

합성 입력에는 실명, 계좌, 이메일, 내부 서버 경로를 넣지 않습니다. 대신 `거래-001`, `영업A`, `50000`처럼 업무 규칙만 재현하는 가짜 값을 사용합니다.

#### 예시

| 거래ID | 거래일 | 부서 | 비고 |
|---|---|---|---|
| 거래-001 | 2026-08-01 | 영업A | 샘플 |
| 거래-002 | 2026-08-02 | 운영B | 샘플 |

이 입력에는 필수 열인 `금액`이 없습니다. 따라서 기대 오류는 `필수 열 누락: 금액`이며, 다른 데이터 문제보다 먼저 같은 실패를 만들 수 있습니다.

## Traceback은 처음부터 끝까지 복사합니다

### 마지막 예외 문장과 그 위 호출 경로를 함께 보내 실제 실패 위치를 찾습니다

![터미널 Traceback의 실행 파일과 함수 호출 줄 및 마지막 예외가 차례로 강조된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a1/a1d03fc64938e96340d1e6c7d755d595f2866cf0529d8a1fdf335856ce0ded7d.png "마지막 오류 문장만이 아니라 오류에 도달한 호출 경로 전체가 원인 파일과 연결됩니다")

Traceback 마지막 줄은 오류 종류와 메시지를 알려 줍니다. 그 위 줄들은 어떤 파일과 함수를 거쳐 그 오류에 도착했는지 보여 줍니다. 마지막 줄만 보내면 원인은 같지만 위치가 다른 문제를 구분하기 어렵습니다.

비밀값이 출력됐다면 그대로 공유하지 말고 값만 `[비공개]`로 바꿉니다. 파일 경로도 사용자 이름이나 회사명이 포함된 부분만 `[프로젝트]`로 가립니다. 오류 종류, 파일 이름, 줄 번호, 함수 이름은 남깁니다.

#### 예시

```text
Traceback (most recent call last):
  File "run_report.py", line 18, in <module>
    main()
  File "run_report.py", line 12, in main
    report = build_report(input_path)
  File "report.py", line 41, in build_report
    frame = normalize_columns(frame)
  File "report.py", line 22, in normalize_columns
    raise ValueError("필수 열 누락: 금액")
ValueError: 필수 열 누락: 금액
```

## 새 대화에서 복사해 재현을 확인합니다

### 수정 전에 재현 명령과 원인 근거 및 최소 변경 계획을 먼저 답하게 합니다

![완성된 오류보고가 새 AI 대화에서 같은 실패 재현과 한 파일 최소 수정 및 테스트로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4b/4b0f0fafec8ea9edf075c8b6a0ba4ae023dbdfde80dff5c4568b10693bb904d1.png "새 대화에서도 같은 명령으로 실패한 뒤 근거가 있는 최소 수정만 진행됩니다")

오류보고가 충분한지는 설명을 읽어 보는 것보다 새 대화에 붙여 넣어 확인하는 편이 빠릅니다. AI가 같은 명령과 합성 입력으로 실패를 재현하고, 실제 파일과 줄을 근거로 원인을 말할 수 있어야 합니다.

처음부터 고치라고 하지 말고 재현 결과와 최소 변경 계획을 먼저 받습니다. 계획이 맞으면 한 파일을 수정하고 재현 테스트와 전체 테스트를 차례로 실행하게 합니다.

#### 예시

```text
[환경]
Windows, Python 3.x, 프로젝트 루트에서 실행

[실행 명령]
python run_report.py samples/missing-amount.xlsx

[입력]
첨부한 두 행 합성 파일, 금액 열이 없음

[기대]
원본을 바꾸지 않고 누락된 필수 열 이름을 알려 주며 종료

[실제]
아래 Traceback과 함께 종료
<전체 Traceback>

[변경 상태]
git status --short 결과와 오류 직전 변경 파일

아직 수정하지 말고 같은 실패를 재현해 줘
재현 명령, 실제 원인 파일과 줄, 최소 변경 파일, 추가할 테스트를 먼저 보고해 줘
```

#### 확인 목록

- 새 대화에서 같은 명령으로 같은 오류가 재현됩니다.
- AI가 Traceback의 실제 파일과 함수를 원인 근거로 사용합니다.
- 수정 범위는 원인과 테스트에 필요한 최소 파일입니다.
- 합성 입력으로 재현 테스트가 PASS합니다.
- 전체 테스트도 PASS하고 원본 파일은 바뀌지 않습니다.

#### 참고 자료

- [Python 오류와 예외 공식 문서](https://docs.python.org/3/tutorial/errors.html)
- [Python Traceback 공식 문서](https://docs.python.org/3/library/traceback.html)
- [Git status 공식 문서](https://git-scm.com/docs/git-status)
