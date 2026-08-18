---
title: AI 코딩 기준선 만드는 방법: 맡기기 전에 결과부터 고정하기
slug: ai-coding-baseline
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 기준선을 테스트 결과와 샘플 숫자로 만드는 방법을 설명합니다. 사람과 Python 및 AI의 역할을 나누고 변경 전 상태를 기록합니다.
readerQuestion: AI에게 코드를 맡기기 전에 현재 결과와 사람 및 Python과 AI의 책임을 어떻게 고정할까?
readerTakeaway: 변경 전 테스트와 샘플 결과 및 작업 트리 상태를 기록하고 사람은 승인, Python은 반복 계산, AI는 분석과 제안 및 구현을 맡도록 나눈다.
readerLevel: beginner
readerStartingPoint: Excel 자동화와 pytest 검사를 직접 실행해 PASS 또는 FAIL을 확인할 수 있는 상태입니다.
primaryKeyword: AI 코딩 기준선
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/df/df182eaa6d8817cfd9a0617e5820e39969af9ff084b998575b6b9713e5d1140d.png
ogImageAlt: AI 코드 변경 전에 테스트 PASS와 샘플 행 수 및 금액 합계를 한 기준선 카드에 저장하는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`AI 코딩 기준선` 없이 바로 수정을 맡기면 결과가 좋아진 것인지 원래부터 그랬는지 구분하기 어렵습니다. AI에게 요청하기 전에 현재 테스트와 샘플 숫자 및 변경 파일을 짧은 기록으로 남겨야 합니다.

기준선은 긴 기획서가 아닙니다. 같은 입력, 같은 실행 명령, 기대하는 숫자, 사람만 승인할 결정 네 가지를 고정한 출발점입니다. AI가 코드를 바꾼 뒤에도 같은 기준으로 전후를 비교합니다.

## 변경 전 PASS와 샘플 숫자를 저장합니다

### 같은 명령의 테스트 결과와 정상 행 및 확인필요 행과 금액 합계를 한곳에 기록합니다

![AI 코드 변경 전에 테스트 PASS와 샘플 행 수 및 금액 합계를 한 기준선 카드에 저장하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/df/df182eaa6d8817cfd9a0617e5820e39969af9ff084b998575b6b9713e5d1140d.png "테스트 명령과 샘플 결과 숫자가 변경 전 기준선 카드에 함께 고정됩니다")

AI에게 코드를 보여 주기 전에 먼저 현재 상태에서 테스트를 실행합니다. 실패가 있다면 새 요청과 관계없는 기존 실패인지 먼저 적어야 AI 변경 때문에 생긴 실패와 섞이지 않습니다.

같은 샘플 Excel의 입력 행, 정상 행, 확인필요 행, 정상 금액 합계, 금액 차이도 기록합니다. 테스트가 PASS여도 이 숫자가 없다면 사용자가 실제 업무 결과가 유지됐는지 빠르게 확인하기 어렵습니다.

#### 코드

```powershell
uv run pytest -q
uv run python main.py --input samples --output output/result.xlsx
```

#### 예시

```text
기준선 이름: expense-sample-v1
테스트: 5 passed
입력 행: 8
정상 행: 5
확인필요 행: 3
정상 금액 합계: 230000
금액 차이: 0
```

## 사람과 Python 및 AI의 역할을 나눕니다

### 사람은 의미와 승인을 맡고 Python은 반복 계산하며 AI는 분석과 구현을 돕습니다

![사람과 Python 및 AI 세 역할 카드가 승인과 반복 계산 및 분석 구현 책임으로 각각 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/4a/4a6895ac9715a603362b3191e82418411da7b7175e5d0c119154e4d6c326600c.png "세 주체가 서로 다른 책임을 맡고 최종 승인만 사람에게 되돌아옵니다")

사람은 어떤 결과가 맞는지와 확인필요 행을 어떻게 처리할지 결정합니다. 이 판단은 회사 규칙과 업무 맥락이 필요하므로 AI가 임의로 정하면 안 됩니다.

Python은 정해진 규칙으로 같은 계산을 반복하고 테스트는 결과를 비교합니다. AI는 프로젝트를 읽고 수정안을 만들며 테스트를 실행할 수 있지만, 숫자의 업무 의미와 배포 승인은 사람에게 남습니다.

#### 설명 목록

- 사람: 목적, 업무 규칙, 예외 승인, 최종 결과와 배포를 결정합니다.
- Python: 입력 검사, 데이터 변환, 집계, 파일 저장을 같은 규칙으로 반복합니다.
- 테스트: 행 수와 금액 및 원본 보호가 기대값과 같은지 판정합니다.
- AI: 코드 흐름을 분석하고 수정안을 구현하며 변경 내용과 위험을 설명합니다.

한 역할이 다른 역할을 대신하지 않습니다. AI가 자신 있게 답해도 테스트가 실패하면 완료가 아니고, 테스트가 통과해도 새 업무 규칙이 맞는지는 사람이 승인합니다.

## 완료 숫자와 사람 승인 항목을 구분합니다

### 코드가 자동 판정할 조건과 담당자가 직접 볼 조건을 두 목록으로 나눕니다

![자동 판정 가능한 숫자 검사와 사람이 승인해야 하는 업무 판단이 두 개의 분리된 목록으로 보이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9f/9fb20918fbcd55923244020acc3110fed0185395c9b2febf60e9d3f46cbac5d5.png "숫자와 파일 검사는 자동 PASS로 가고 예외 의미와 배포 결정은 사람 승인으로 갑니다")

완료 조건에는 코드가 자동으로 판정할 항목과 사람이 직접 판단할 항목이 함께 있습니다. 둘을 섞어 `문제없이 잘 동작함`이라고 적으면 AI가 무엇을 증명해야 하는지 알 수 없습니다.

자동 조건은 숫자와 파일로 적고, 사람 조건은 누가 무엇을 보고 승인하는지 적습니다. 그러면 AI는 자동 검사를 실행해 증거를 남기고 사람의 결정이 필요한 부분은 완료했다고 추측하지 않습니다.

#### 확인 목록

- 자동 판정: pytest 전체 PASS
- 자동 판정: 입력 행 수와 정상 및 확인필요 행 수의 합이 같음
- 자동 판정: 상세 합계와 요약 합계의 차이가 0
- 자동 판정: 원본 파일 해시가 실행 전후 동일함
- 사람 승인: 확인필요 행의 오류 이유가 업무 담당자에게 이해됨
- 사람 승인: 새 열 이름과 결과 시트 구성이 실제 업무에 맞음
- 사람 승인: commit, push, 배포를 실행해도 됨

## 작업 트리가 깨끗한지 확인합니다

### 변경 파일 목록과 diff를 기록해 AI 작업 전후의 범위를 비교합니다

![깨끗한 Git 작업 트리에서 AI 변경 파일 세 개와 최종 diff 검토로 이어지는 전후 비교 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5b/5b265b79f7f8c9da65bcc93c98a7a2ac1fbc66a4b3b37cb17624f6b4f74daccd.png "변경 전 파일 0개가 기록되고 AI 작업 뒤 허용된 세 파일만 diff 검토로 이어집니다")

기준선을 만들 때 `git status --short`로 기존 변경 파일을 확인합니다. 출력이 비어 있으면 작업 트리가 깨끗한 상태입니다. 출력이 있다면 사용자 작업일 수 있으므로 파일 이름을 기록하고 보존합니다.

AI 작업 뒤 같은 명령과 `git diff --stat`을 실행합니다. 요청 범위 밖 파일이 바뀌었거나 기존 변경이 사라졌다면 테스트가 통과해도 그대로 승인하지 않습니다.

#### 코드

```powershell
git status --short
git diff --stat
git diff --check
```

#### 예시

```text
변경 전: 기존 변경 0개, 5 passed, 금액 차이 0
변경 후: 허용 파일 3개, 7 passed, 금액 차이 0
사람 승인: 대기
```

#### 참고 자료

- [Git status 공식 문서](https://git-scm.com/docs/git-status)
- [Git diff 공식 문서](https://git-scm.com/docs/git-diff)
- [OpenAI Codex 사용 사례](https://developers.openai.com/codex/use-cases)
