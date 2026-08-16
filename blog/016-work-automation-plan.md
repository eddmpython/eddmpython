---
title: 업무자동화 기획서 작성 방법: 코딩 전에 실패를 잡는 실전 템플릿
slug: work-automation-plan
author: eddmpython
section: 업무자동화 프로젝트
summary: 반복업무 하나를 선택하고 입력과 처리 규칙, 예외, 출력, 검증, 보안, 수동 복구를 실행 가능한 업무자동화 기획서로 만드는 전 과정을 설명합니다.
readerQuestion: Python이나 AI에 반복업무를 맡기기 전에 무엇을 얼마나 구체적으로 적어야 구현 결과를 믿을 수 있을까?
readerTakeaway: 실제 업무를 시작과 끝이 보이는 크기로 자르고 TOML 기획서와 검사 코드 및 실패 테스트를 만들어 구현 전에 모호함을 찾을 수 있다.
readerLevel: beginner
readerStartingPoint: 자동화하고 싶은 반복업무는 있지만 어디까지 맡기고 무엇을 성공으로 판정해야 하는지 정리해 본 적이 없다.
primaryKeyword: 업무자동화 기획서
searchIntent: how-to
depthContract: standalone-project-v1
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8c/8c719c2661f347c5f39fc9960a9fb175df9594269707a80df422c8d93529a6f9.png
ogImageAlt: 모호한 한 줄 요청과 입력 및 규칙과 결과 및 검증이 채워진 실행 계약이 대비되는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`Excel 정리해 줘`라는 말만 있고 업무자동화 기획서 없이 코딩을 시작하면 결과가 나와도 맞는지 판단하기 어렵습니다. 어느
폴더의 파일을 읽는지, `100000원 이상`에 정확히 100000원이 포함되는지, 잘못된 한 행 때문에 전체를
멈출지 같은 결정이 빠져 있기 때문입니다. 구현자는 빈칸을 추측으로 채우고, 사용자는 완성된 뒤에야
자신이 기대한 것과 다르다는 사실을 발견합니다.

이 글에서는 매주 부서별 지출 Excel 세 개를 합치는 업무를 처음부터 설계합니다. 사람만 읽는 체크리스트로
끝내지 않고 `automation-plan.toml`에 계약을 기록하고, Python 검사기로 필수 항목 열두 개를 확인합니다.

아홉 개 실패 테스트까지 실행합니다. Python을 처음 보는 사람도 파일을 그대로 복사해 `12개 PASS`를
확인할 수 있도록 모든 명령과 전체 코드를 제공합니다.

## 기획서는 코딩 전 합의문입니다

### 무엇을 만들지보다 무엇이 맞아야 끝나는지를 먼저 고정합니다

![모호한 한 줄 요청과 입력 및 규칙과 결과 및 검증이 채워진 실행 계약이 대비되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/8c/8c719c2661f347c5f39fc9960a9fb175df9594269707a80df422c8d93529a6f9.png "기획서는 구현 방법을 지시하는 문서가 아니라 결과를 판정할 공통 기준입니다")

업무자동화 기획서는 멋진 화면을 그리는 문서가 아닙니다. 일을 시작할 때 존재하는 자료, 사람이 하던
판단, 끝났을 때 생겨야 하는 결과, 실패했을 때 돌아갈 길을 같은 언어로 적는 합의문입니다. 업무 담당자와
구현자와 결과 사용자가 이 문서를 읽고 같은 장면을 떠올릴 수 있어야 합니다.

모호한 요청은 구현 방법이 여러 개라서 문제가 되는 것이 아닙니다. 서로 다른 결과가 모두 성공처럼 보일
수 있다는 점이 문제입니다. `파일을 합친다`는 말은 열이 다른 파일을 버릴지, 빈값을 유지할지, 중복 행을
제거할지 알려 주지 않습니다. 결과 파일 하나가 생겼다는 사실만으로 어느 선택이 옳았는지 판정할 수
없습니다.

좋은 기획서는 구현 언어도 먼저 고정하지 않습니다. Excel 수식, Power Query, Python, 상용 자동화 도구
중 무엇을 쓰더라도 지켜야 할 업무 계약을 적습니다. 기술을 바꿔도 입력 9행이 출력 9행이어야 하고,
합계가 597000원이어야 하며, 원본 파일은 바뀌지 않아야 한다는 기준은 남습니다.

#### 설명 목록: 모호한 요청을 판정 가능한 문장으로 바꾸기

| 모호한 말 | 기획서에서 고정할 값 | 실행 뒤 확인할 증거 |
| --- | --- | --- |
| Excel을 정리한다 | 읽을 폴더, 파일 수, 필수 열 | 실제로 읽은 파일 이름과 열 목록 |
| 큰 금액을 찾는다 | `금액 >= 100000` | 확인필요 시트의 행과 이유 |
| 보기 좋게 저장한다 | 결과 경로와 시트 이름 및 순서 | 통합 문서의 실제 시트 목록 |
| 오류를 처리한다 | 오류별 중단, 격리, 재시도, 수동 처리 | 종료 코드와 오류 기록 |
| 잘 됐는지 확인한다 | 행 수, 합계, 중복, 재실행, 원본 해시 | 기대값과 실제값이 있는 검증표 |

기획서가 필요한 이유는 문장을 길게 쓰기 위해서가 아니라 성공과 실패를 같은 기준으로 나누기 위해서입니다.
이 기준을 적으려면 먼저 자동화하려는 일을 한 번에 검증할 수 있는 크기로 잘라야 합니다.

## 자동화할 일을 한 문장으로 자릅니다

### 반복 횟수와 시작 자료와 최종 결과를 함께 말할 수 있는 일 하나를 고릅니다

![여러 업무가 뒤섞인 큰 범위에서 반복 횟수와 입력 파일과 결과 파일이 분명한 한 작업만 분리되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e5/e515d1192950239468f14f4602d68d1643c54ec2f3c24f6cb3be97d29e0b5af8.png "첫 자동화는 시작과 끝을 실제 자료로 확인할 수 있는 반복업무 하나여야 합니다")

`월말 보고 자동화`는 첫 프로젝트 이름으로 너무 큽니다. 자료 요청, 다운로드, 표 정리, 승인, 메일 발송이
한 문장에 섞여 있습니다. 어느 단계가 실패했는지 나눌 수 없고, 메일 발송처럼 되돌리기 어려운 행동까지
처음부터 포함될 수 있습니다.

대신 `매주 금요일 부서별 Excel 세 개를 읽어 검증된 결과 Excel 한 개를 만든다`처럼 자릅니다. 이 문장에는
반복 시점, 입력, 출력이 모두 보입니다. 입력 파일을 준비하면 실행을 시작할 수 있고, 결과 파일과 검증표를
보면 끝났는지 확인할 수 있습니다.

자동화 후보를 고를 때는 시간만 보지 않습니다. 자주 반복되는지, 규칙이 얼마나 안정적인지, 잘못됐을 때
피해가 얼마나 큰지 함께 봅니다. 매일 한 시간 걸려도 담당자가 매번 다른 판단을 해야 하는 일은 곧바로
완전 자동화하기 어렵습니다. 반대로 주 1회 두 시간이 걸리고 입력 형식과 판단 규칙이 일정한 일은 작은
실험으로 효과를 확인하기 좋습니다.

#### 입력 예시: 월 예상 절감 시간을 과장 없이 계산하기

한 달 4회, 한 번에 120분 걸리는 일을 자동화 뒤 실행과 검토 10분으로 줄인다고 가정합니다. 절감 시간은
`4 x (120 - 10) / 60 = 7.3시간`입니다. 개발 시간은 이 숫자에 포함하지 않습니다. 처음 한 달의 절감만
보고 개발 기간을 정당화하지 말고, 규칙 변경과 유지보수 시간도 따로 기록합니다.

```text
업무: 부서별 지출내역 자동 취합
반복: 매월 4회
현재 시간: 회당 120분
목표 시간: 실행과 검토를 합쳐 회당 10분
월 예상 절감: 7.3시간
시작: input 폴더에 부서별 Excel 세 개가 있음
끝: 검증표가 PASS인 결과 Excel 한 개를 담당자가 확인함
```

돈을 송금하거나 고객에게 메시지를 보내는 일처럼 실패 비용이 큰 업무는 시간 절감이 커도 첫 대상으로
적합하지 않을 수 있습니다. 처음에는 결과를 파일로 만들고 사람이 승인하는 지점에서 멈추는 편이 안전합니다.
범위를 골랐다면 기억에 의존해 기획서를 쓰지 말고 실제 수작업을 한 번 관찰해야 합니다.

## 현재 수작업을 한 번 그대로 봅니다

### 사람의 클릭보다 입력 상태와 판단 순간과 종료 증거를 시간 순서로 기록합니다

![수작업의 시작 자료와 변환 단계와 판단 지점과 마지막 확인 증거가 시간 순서로 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ab/ab8c2bf205b06279e19ce950d30a02c8bb5e446d095b8a07edf1fd9fcf2c10cc.png "한 번의 실제 수행을 관찰하면 숨은 입력과 판단과 확인 동작이 드러납니다")

담당자는 익숙한 일을 설명할 때 중요한 단계를 생략합니다. 빈 부서 셀을 노란색으로 표시하고, 지난주
파일과 합계를 눈으로 비교하고, 결과 이름에 날짜를 붙이는 행동을 너무 당연하게 여겨 말하지 않을 수
있습니다. 자동화는 생략된 습관을 알 수 없으므로 실제 실행을 한 번 따라가며 기록해야 합니다.

클릭 순서를 모두 적을 필요는 없습니다. `Excel을 열고 B열을 클릭한다`보다 그 행동이 만든 상태를 적는
편이 도구가 바뀌어도 쓸모가 있습니다. `세 파일의 필수 열을 확인한다`, `금액이 100000원 이상인 행을
확인 대상으로 분리한다`, `원본 합계와 결과 합계를 비교한다`처럼 입력과 판단과 증거를 기록합니다.

관찰 중에는 정상 경로뿐 아니라 멈칫하는 순간을 표시합니다. 파일 이름이 예상과 다를 때, 금액 셀에
`금액미정`이 있을 때, 결과 파일이 이미 열려 있을 때 담당자가 무엇을 하는지 묻습니다. 이 순간들이 나중에
예외 정책과 테스트가 됩니다.

#### 설명 목록: 수작업 관찰표에 남길 여섯 가지

- 시작 조건: 누가 언제 어떤 자료가 도착했음을 확인하는가
- 입력 위치: 폴더, 파일 이름 모양, 시트, 열, 파일 수는 무엇인가
- 변환 동작: 정렬, 형식 변경, 합치기처럼 모든 행에 적용하는 일은 무엇인가
- 판단 순간: 어떤 조건에서 행을 제외하거나 별도 확인하는가
- 외부 효과: 원본 수정, 메일 발송, 업로드처럼 되돌리기 어려운 행동이 있는가
- 종료 증거: 담당자가 마지막에 보는 숫자와 파일과 메시지는 무엇인가

한 번만 관찰하면 드문 월말 예외를 놓칠 수 있습니다. 최근 실패 사례나 담당자가 따로 메모한 규칙도 함께
확인하되, 첫 기획서에 모든 미래 상황을 넣으려 하지 않습니다. 현재 확인한 범위와 아직 모르는 범위를
구분해 적습니다. 관찰 기록에서 가장 먼저 계약으로 고정할 대상은 자동화가 읽을 입력입니다.

## 입력 계약은 파일 이름보다 깊습니다

### 폴더와 파일 수와 시트와 열과 자료형과 고유 키를 실제 값으로 적습니다

![Excel 입력 계약이 폴더와 파일 수와 시트와 열과 자료형과 고유 키의 층으로 분해된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/fb/fb40e2dc5315a361eae21cc4d38414fa735df0d4bb89600f956b361303fe0d12.png "입력 계약은 파일을 찾는 규칙부터 한 행을 구분하는 키까지 내려갑니다")

`input/*.xlsx를 읽는다`만으로는 입력 계약이 완성되지 않습니다. 같은 폴더에 지난주 결과가 들어오면 함께
읽을지, 숨김 파일은 제외할지, 파일이 두 개뿐이면 멈출지 결정해야 합니다. 통합 문서 안에서도 어느 시트를
읽고 어떤 열이 필수인지 알아야 합니다.

이 예제는 `input` 폴더의 Excel 세 개를 기대합니다. 각 파일에는 `지출ID`, `사용일`, `부서`, `항목`,
`금액` 열이 있어야 합니다. `지출ID`는 서로 다른 행을 구분하는 고유 키입니다. 행 번호는 정렬하면 바뀌므로
키로 쓰지 않습니다.

자료형은 화면 모양이 아니라 코드가 읽은 값으로 적습니다. `금액` 열에 쉼표와 `원`이 섞일 수 있다면
허용 형식과 변환 실패 행동을 함께 씁니다. `사용일`도 Excel 날짜, `2026-08-01` 문자열, 빈값 중 무엇을
허용할지 정합니다. 이 결정을 미루면 구현자가 편한 방향으로 데이터를 버리거나 바꿀 수 있습니다.

#### 입력 예시: 지출 Excel 세 개의 계약 고정하기

| 항목 | 계약 값 | 틀렸을 때 행동 |
| --- | --- | --- |
| 폴더 | `input` | 폴더가 없으면 준비 오류로 중단 |
| 파일 모양 | `*.xlsx` | 임시 파일과 결과 파일은 제외 |
| 파일 수 | 정확히 3개 | 실제 이름과 개수를 표시하고 중단 |
| 필수 열 | 지출ID, 사용일, 부서, 항목, 금액 | 파일 이름과 빠진 열을 표시하고 중단 |
| 고유 키 | 지출ID | 중복 수를 FAIL로 기록하고 전달 금지 |
| 원본 보호 | 입력 파일 바이트 변경 0개 | 변경된 파일 이름을 FAIL로 기록 |

파일 수를 정확히 세 개로 고정할 수 없는 업무라면 최소와 최대, 또는 허용 이름 목록을 적습니다. 중요한
것은 예제의 숫자를 그대로 쓰는 일이 아니라 코드가 입력을 어디까지 받아들일지 사람이 먼저 결정하는
것입니다. 입력이 고정되면 모든 행에 적용할 처리와 조건에 따라 갈리는 판단을 분리할 수 있습니다.

## 처리와 판단을 서로 분리합니다

### 항상 실행하는 변환 순서와 조건에 따라 갈리는 업무 규칙을 다른 표로 씁니다

![모든 행이 지나는 처리 파이프라인과 조건에 따라 갈라지는 판단 규칙이 서로 다른 경로로 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/56/56ac992cf73e385dc0bde19c4577aff131afd541084eeb62693fd87f0f70c54b.png "처리 순서와 판단 조건을 분리하면 코드와 테스트의 책임도 선명해집니다")

처리는 입력마다 같은 순서로 실행하는 동작입니다. 필수 열을 확인하고, 날짜와 금액을 정규화하고, 세 파일의
행을 세로로 합치고, 원본 파일 이름을 새 열에 남기는 일이 여기에 속합니다. 중간 단계가 실패하면 어느
변환에서 문제가 생겼는지 알 수 있도록 순서를 유지합니다.

판단은 조건에 따라 결과가 갈리는 업무 규칙입니다. `금액 >= 100000`이면 확인필요로 보내고, 부서가
비었으면 오류 이유를 붙이는 일이 판단입니다. 처리와 판단을 한 문장에 섞으면 숫자를 변환하지 못한 행에
비교 연산을 먼저 적용하는 식의 순서 오류가 생깁니다.

`이상`과 `초과`는 반드시 기호로 다시 씁니다. `10만원 이상`은 100000원을 포함하는 `>= 100000`이고,
`10만원 초과`는 포함하지 않는 `> 100000`입니다. 경계값 한 행을 예제에 넣어 두 표현의 차이가 실제
결과로 드러나게 합니다.

#### 입력 예시: 처리 순서와 판단 규칙을 업무 ID로 구분하기

아래 입력은 모든 행이 반드시 지나는 처리 네 단계와 조건에 따라 갈리는 판단 두 개를 분리합니다. `P`와
`R` ID가 핵심이며, 실행 뒤에는 실패한 ID를 그대로 보고해 기획서와 검사와 테스트에서 같은 규칙을 찾습니다.

```text
처리 P1: 각 파일의 필수 열을 확인한다
처리 P2: 사용일을 YYYY-MM-DD로 통일한다
처리 P3: 금액에서 쉼표와 원을 제거하고 숫자로 바꾼다
처리 P4: 세 파일의 행을 합치고 원본파일 열을 추가한다

규칙 R1: 금액 >= 100000이면 확인필요에 고액 지출 이유를 남긴다
규칙 R2: 부서가 비었거나 금액 변환에 실패하면 원문과 오류 이유를 남긴다
```

각 규칙에는 짧은 ID를 붙입니다. 나중에 검증표가 `R1 FAIL`이라고 말하면 기획서와 코드와 테스트에서
같은 규칙을 찾을 수 있습니다. 규칙이 정리된 뒤에는 정상값이 아닌 입력이 왔을 때 전체 작업을 어떻게
이어 갈지 예외별로 결정해야 합니다.

## 예외마다 멈춤과 격리를 정합니다

### 무슨 오류인지뿐 아니라 이미 끝난 작업과 남길 증거와 다음 행동까지 기록합니다

![파일 없음과 열 누락과 잘못된 행과 열린 결과 파일이 중단과 격리와 재시도와 수동 처리로 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/0a/0ad824c1bf2530308393345df7e27f57db07efb5e2ae01a83081af342289ad23.png "같은 오류라는 이름 아래에서도 안전한 다음 행동은 서로 다릅니다")

`오류를 처리한다`는 문장은 구현할 수 없습니다. 어떤 조건에서 오류가 되고, 이미 무엇을 읽거나 썼으며,
사용자가 무엇을 해야 하는지 정해야 합니다. 이 글에서는 예외 행동을 중단, 격리, 재시도, 수동 처리 네
종류로 나눕니다.

입력 파일이 없거나 필수 열이 빠진 경우에는 계산 자체를 믿을 수 없으므로 중단합니다. 금액이 문자인 한
행은 원문과 이유를 `03_확인필요`에 격리하고 나머지 정상 행은 계속 처리할 수 있습니다. 네트워크처럼
잠시 뒤 나아질 수 있는 실패만 제한된 횟수로 재시도합니다. 결과 파일이 열려 있어 교체할 수 없다면 기존
결과를 보존하고 사람이 파일을 닫은 뒤 다시 실행하게 합니다.

재시도는 편리하지만 이미 적용된 효과를 두 번 만들 수 있습니다. 메일을 보낸 뒤 응답만 끊겼다면 다시
보낼 때 중복 발송이 됩니다. 그래서 기획서에는 실패 시점까지 완료된 행동과 재실행해도 같은 결과가 되는지
적어야 합니다. 결과 파일 저장은 임시 파일을 완성한 뒤 교체하면 중간 파일 손상을 줄일 수 있습니다.

#### 실패 예시: 오류 조건과 행동과 증거를 한 줄로 연결하기

| ID | 조건 | 정책 | 남길 증거와 다음 행동 |
| --- | --- | --- | --- |
| E1 | 입력 파일 0개 | 중단 | input 경로를 표시하고 결과를 만들지 않음 |
| E2 | 필수 열 누락 | 중단 | 파일 이름과 빠진 열을 표시함 |
| E3 | 숫자가 아닌 금액 | 격리 | 원문과 행 키와 이유를 확인필요에 남김 |
| E4 | 결과 파일이 열림 | 수동 | 기존 결과를 유지하고 파일을 닫은 뒤 재실행 |

예외 정책이 있어야 실패한 날에도 사용자가 다음 행동을 알 수 있습니다. 이제 성공했을 때 무엇이 생기고
누가 확인하는지를 출력 계약으로 이어서 적습니다.

## 출력은 파일과 사용자 행동까지 씁니다

### 결과 경로와 시트와 열뿐 아니라 누가 무엇을 확인하고 언제 전달하는지도 고정합니다

![결과 Excel의 네 시트와 검토 담당자와 전달 승인 지점이 한 흐름으로 연결된 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/6b/6b8aceada0004e112e38699e5865defb30433a368775e2106b954d57a578bb14.png "출력 계약은 파일 생성에서 끝나지 않고 사용자의 확인과 전달까지 이어집니다")

출력 계약에는 `Excel 한 개`가 아니라 정확한 상대 경로와 파일 이름을 씁니다. 이 예제의 결과는
`output/expense_result.xlsx`이고 시트는 `01_통합내역`, `02_부서별요약`, `03_확인필요`,
`04_검증결과` 순서입니다. 번호를 붙이면 사람이 열었을 때도 확인 순서가 흔들리지 않습니다.

결과 파일을 누가 검토하는지도 중요합니다. 자동화가 `03_확인필요`에 행을 분리했더라도 담당자가 이유와
원문을 확인하지 않으면 업무는 끝나지 않았습니다. 검토 담당자, 확인할 시트, 전달 조건을 기획서에 넣어야
코드가 끝난 시점과 업무가 끝난 시점을 구분할 수 있습니다.

첫 버전에서는 메일 발송과 회계 시스템 업로드를 범위에서 뺍니다. 검증된 파일을 만든 뒤 담당자가 직접
전달하면 잘못된 결과가 외부로 퍼지는 것을 막을 수 있습니다. 충분한 운영 증거가 쌓인 뒤 별도 승인과
중복 방지 계약을 갖추고 다음 자동화를 설계합니다.

#### 출력 예시: 결과 파일을 사용자가 읽는 순서 정하기

입력은 자동화가 만든 결과 파일 한 개이고, 핵심은 네 시트를 검토 순서대로 고정하는 것입니다. 담당자가
확인필요 행을 검토하고 검증결과가 모두 통과했을 때만 전달했다는 행동까지 남아야 이 출력 계약이 끝납니다.

```text
결과 경로: output/expense_result.xlsx
01_통합내역: 입력 9행과 원본파일 열을 확인
02_부서별요약: 부서별 건수와 금액을 확인
03_확인필요: 담당자가 원문과 이유를 검토
04_검증결과: 모든 항목이 PASS인지 확인
전달 조건: 담당자가 확인필요를 검토하고 검증결과가 전부 PASS일 때만 전달
```

출력 모양이 정해져도 내용이 맞는지는 별도 문제입니다. 파일 존재보다 강한 완료 조건을 숫자와 실행
시나리오로 만들어야 합니다.

## 완료 조건은 숫자와 시나리오입니다

### 건수와 합계와 중복과 원본 보존을 Given When Then 문장으로 검증 가능하게 만듭니다

![기대 행 수와 합계와 중복과 원본 해시가 실제 결과와 비교되고 정상 및 실패 시나리오로 이어지는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/75/7537a594081812ce2fb40055f313edf7e3714f89779818aedbc9ab2beed8359e.png "완료 조건은 관찰 가능한 숫자와 재현 가능한 상황을 함께 가져야 합니다")

결과 파일이 존재한다는 검사는 저장이 끝났다는 사실만 알려 줍니다. 서로 다른 두 행의 금액이 각각
1000원씩 반대 방향으로 틀리면 전체 합계는 그대로일 수 있습니다. 그래서 행 수, 고유 키 집합, 행별 값,
파생 요약, 재실행, 원본 보존처럼 서로 다른 층의 검사가 필요합니다.

기대값은 합성 자료처럼 사람이 손으로 계산할 수 있는 작은 입력에서 먼저 정합니다. 입력 9행, 출력 9행,
확인필요 4행, 합계 597000원, 중복 ID 0개, 바뀐 원본 0개를 기획서에 적습니다. 구현 뒤 숫자를 정하면
현재 결과에 맞춰 정답을 바꾸는 오류가 생길 수 있으므로 기획 단계에서 고정합니다.

상황은 `Given, When, Then` 순서로 쓰면 읽기 쉽습니다. Cucumber의 공식 Gherkin 설명도 Given은 알려진
시작 상태, When은 행동, Then은 사용자가 관찰할 결과를 나타낸다고 설명합니다. 도구를 반드시 도입할
필요는 없고 세 문장 구조만 사용해도 입력과 행동과 결과가 섞이는 문제를 줄일 수 있습니다.

#### 예상 결과: 정상과 실패를 함께 고정하는 여섯 시나리오

| 범주 | Given | When | Then |
| --- | --- | --- | --- |
| 정상 | 필수 열을 가진 세 파일과 고유한 9개 ID | 취합 명령 실행 | 통합 9행과 합계 597000원 |
| 경계 | 금액이 정확히 100000원인 행 | 고액 규칙 적용 | 확인필요에 포함 |
| 누락 | 한 파일에 금액 열이 없음 | 입력 계약 검사 | 결과를 만들지 않고 파일과 열 표시 |
| 잘못된 값 | 금액이 `금액미정`인 행 | 숫자 변환 | 원문을 보존하고 해당 행 격리 |
| 중복 | 두 파일에 같은 지출ID | 고유 키 검사 | 검증 FAIL과 전달 금지 |
| 재실행 | 입력이 바뀌지 않은 첫 실행 뒤 | 같은 명령 재실행 | 행 수와 합계와 업무 시트가 같음 |

#### 참고 자료: 관찰 가능한 완료 조건 작성하기

- [Cucumber Gherkin 공식 문서](https://cucumber.io/docs/gherkin/reference/)

성공과 실패 시나리오를 정했으면 자동화가 절대 건드리면 안 되는 자료와 실패한 날 사람이 이어받을 방법도
같은 기획서에 넣어야 합니다.

## 수정 금지와 수동 복구도 설계합니다

### 원본과 비밀과 자동 발송을 범위 밖에 두고 실패한 날 사람이 이어받는 길을 남깁니다

![원본 폴더와 비밀값이 보호 경계 안에 있고 합성 자료와 결과 파일 및 수동 복구 경로가 밖에 놓인 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/98/98a4b1237da4148030ac778e4ff6853700c5021539a732ed23cadfbaf49614a4.png "자동화의 안전 경계는 수정 금지와 공유 금지와 수동 복구를 함께 보여 줍니다")

자동화는 편의를 위해 원본을 덮어쓰면 안 됩니다. 이 예제는 `input`을 수정 금지 경로로 선언하고 결과를
별도 `output`에 저장합니다. 실행 전후 원본 파일 해시를 비교하면 파일 이름과 수정 시각만 보는 것보다
강하게 보호할 수 있습니다.

실제 회사 파일을 예제나 AI 입력으로 사용하지 않습니다. 열 구조와 자료형과 오류 모양은 유지하되 사람
이름, 계좌번호, 거래처명, 실제 금액은 가짜 값으로 바꿉니다. NIST의 비식별화 안내는 부분 합성 데이터를
행이나 열 또는 셀을 선택적으로 대체한 자료로 구분합니다. 합성이라고 이름 붙였다는 이유만으로 안전하다고
가정하지 말고 공유 전에 사람이 값을 다시 확인해야 합니다.

비밀값은 기획서와 코드에 쓰지 않고 `.env` 같은 별도 비밀 파일의 변수 이름만 적습니다. 이 글의 예제는
외부 API를 쓰지 않으므로 비밀값 자체가 필요하지 않습니다. 실제 업무에 연결할 때도 토큰 값이 아니라
`ACCOUNTING_API_TOKEN이 필요하다`처럼 이름과 용도만 기획서에 남깁니다.

수동 복구는 자동화의 패배가 아닙니다. 실행이 실패하면 오류 메시지와 원본을 보존하고 기존 수작업 절차로
그날 업무를 끝낼 수 있어야 합니다. 자동화가 없던 때의 절차, 담당자, 필요한 파일, 재실행 전에 확인할
항목을 한 문단으로 적습니다.

#### 확인 목록: 공유 전 지울 값과 남길 구조

- 실제 사람과 회사와 거래처 이름을 합성 식별자로 바꿈
- 계좌, 이메일, 전화번호, 주소, 사번을 제거하거나 가짜 값으로 바꿈
- 실제 계약과 거래 금액을 업무 규칙만 시험할 가짜 숫자로 바꿈
- 열 이름과 자료형과 빈값과 경계값과 중복 모양은 유지함
- API 토큰과 비밀번호 값은 제거하고 필요한 환경 변수 이름만 남김
- 원본 파일과 결과 파일의 경로를 분리함
- 실패 시 사용할 수동 절차와 담당자를 적음

#### 참고 자료: 합성 자료도 다시 검토하기

- [NIST SP 800-188 비식별화 안내](https://csrc.nist.gov/pubs/sp/800/188/final)

지금까지의 결정은 문서로만 읽어도 유용하지만, 필수 항목이 빠졌는지 자동으로 확인하려면 구조가 있는
파일로 옮기는 편이 좋습니다.

## 실행 가능한 기획서 파일을 만듭니다

### TOML 한 파일에 업무와 범위와 검증을 적어 사람과 Python이 같은 계약을 읽게 합니다

![프로젝트 폴더 안의 TOML 기획서와 Python 검사기와 테스트 파일이 하나의 계약을 함께 읽는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ef/efc1ef0fccdad1bd856837bab6350b4614feb267fa8eca3d7b8a1f8756cf5221.png "사람이 채우는 기획서와 자동 검사가 같은 파일을 읽으면 문서와 검증의 차이가 줄어듭니다")

TOML은 `이름 = 값`과 `[묶음]`으로 구성된 설정 파일 형식입니다. 중괄호가 많은 JSON보다 사람이 직접
고치기 쉽고, Python 3.11 이상에는 읽기 전용 표준 모듈 `tomllib`이 들어 있습니다. 여기서는 기획서를
프로그램으로 수정하지 않고 읽어서 검사하기만 하므로 별도 TOML 패키지가 필요하지 않습니다.

프로젝트는 기획서, 검사 코드, 테스트, 패키지 설정 네 부분으로 나눕니다. 실제 자동화 코드는 아직 없습니다.
기획서가 통과하기 전에 구현을 시작하지 않는다는 경계를 파일 구조로도 드러내기 위해서입니다.

#### 실행 명령: uv와 Python 3.12 준비 상태 확인하기

PowerShell에서 `uv --version`을 실행해 버전이 보이는지 먼저 확인합니다. 명령을 찾을 수 없다면 아래 공식
설치 문서에서 Windows 방법을 따라 설치하고 PowerShell을 새로 엽니다. 그다음 `uv python install 3.12`를
실행하면 이 프로젝트에 필요한 Python을 준비할 수 있습니다.

```powershell
uv --version
uv python install 3.12
uv python list --only-installed
```

- [uv 공식 설치 문서](https://docs.astral.sh/uv/getting-started/installation/)

#### 실행 명령: 빈 프로젝트 폴더와 파일 자리 만들기

PowerShell에서 연습할 폴더로 이동한 뒤 아래 명령을 실행합니다. `uv init`은 프로젝트 기본 파일을 만들고,
뒤의 명령은 기획서와 검사기와 테스트가 들어갈 폴더를 준비합니다. 이미 같은 이름의 폴더가 있다면 새
연습 위치에서 시작합니다.

```powershell
mkdir automation-plan-example
cd automation-plan-example
uv init --python 3.12
mkdir src, tests
```

#### 예시 코드: pytest 개발 의존성을 pyproject.toml에 고정하기

아래 내용을 `pyproject.toml`에 저장합니다. 실행 프로그램은 표준 라이브러리만 쓰고, 고장 주입 테스트를
위해 pytest만 개발 의존성으로 둡니다. Python 3.12 이상을 요구하므로 `tomllib`을 바로 사용할 수 있습니다.

```toml
[project]
name = "automation-plan-example"
version = "0.1.0"
requires-python = ">=3.12"

[dependency-groups]
dev = ["pytest>=8.4,<10"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

#### 입력 예시: 업무자동화 계약을 TOML로 기록하기

아래 전체 내용을 프로젝트 루트의 `automation-plan.toml`에 저장합니다. `[[rules]]`처럼 대괄호가 두 개인
부분은 같은 종류의 항목을 여러 개 적는 목록입니다. 처음에는 예제를 그대로 실행하고, 통과한 뒤 자신의
업무 이름과 경로와 숫자를 한 항목씩 바꿉니다.

```toml
[task]
name = "부서별 지출내역 자동 취합"
owner = "재무팀 지출 담당자"
trigger = "매주 금요일 오후 4시에 세 부서 파일이 도착한 뒤"
runs_per_month = 4
manual_minutes_per_run = 120
target_minutes_per_run = 10
start_state = "input 폴더에 부서별 Excel 세 개가 있다"
end_state = "검증표가 PASS인 결과 Excel 한 개를 담당자가 확인한다"

[scope]
included = [
  "부서별 Excel 세 개의 행을 세로로 합치기",
  "확인필요 행을 별도 시트로 분리하기",
  "부서별 건수와 금액 합계를 만들기",
]
excluded = [
  "원본 파일의 셀 값 수정",
  "결과 파일의 이메일 자동 발송",
  "회계 시스템 승인 처리",
]
forbidden_paths = ["input"]
manual_fallback = "실패 메시지와 원본 파일을 보존하고 기존 수작업 절차로 취합한다"

[input]
file_pattern = "input/*.xlsx"
expected_file_count = 3
required_columns = ["지출ID", "사용일", "부서", "항목", "금액"]
unique_key = "지출ID"

[[rules]]
id = "R1"
condition = "금액이 100000원 이상이다"
action = "03_확인필요 시트에 고액 지출 사유로 기록한다"

[[rules]]
id = "R2"
condition = "부서가 비었거나 금액을 숫자로 바꿀 수 없다"
action = "원문 값을 보존하고 03_확인필요 시트에 오류 이유를 기록한다"

[[exceptions]]
id = "E1"
condition = "입력 파일이 0개다"
policy = "stop"
action = "결과를 만들지 않고 input 폴더 경로와 함께 종료한다"

[[exceptions]]
id = "E2"
condition = "필수 열이 하나라도 없다"
policy = "stop"
action = "파일 이름과 빠진 열을 표시하고 종료한다"

[[exceptions]]
id = "E3"
condition = "금액 셀에 숫자가 아닌 값이 있다"
policy = "quarantine"
action = "해당 행만 확인필요로 보내고 나머지 행은 계속 처리한다"

[[exceptions]]
id = "E4"
condition = "결과 Excel을 다른 프로그램이 열고 있다"
policy = "manual"
action = "기존 결과를 유지하고 파일을 닫은 뒤 다시 실행하라고 안내한다"

[output]
file = "output/expense_result.xlsx"
sheets = ["01_통합내역", "02_부서별요약", "03_확인필요", "04_검증결과"]
review_owner = "재무팀 지출 담당자"

[acceptance]
input_rows = 9
output_rows = 9
review_rows = 4
amount_total = 597000
duplicate_ids = 0
source_files_changed = 0
rerun_same = true

[[scenarios]]
category = "normal"
name = "정상 파일 세 개"
given = "필수 열을 가진 Excel 세 개와 고유한 지출ID 아홉 개가 있다"
when = "취합 명령을 한 번 실행한다"
then = "통합 9행과 합계 597000원이 만들어진다"

[[scenarios]]
category = "boundary"
name = "정확히 100000원인 지출"
given = "금액이 정확히 100000원인 행이 있다"
when = "고액 지출 규칙을 적용한다"
then = "그 행이 확인필요에 포함된다"

[[scenarios]]
category = "missing"
name = "필수 열 누락"
given = "부산 파일에 금액 열이 없다"
when = "입력 계약을 검사한다"
then = "결과를 만들지 않고 부산 파일과 금액 열을 알린다"

[[scenarios]]
category = "invalid"
name = "문자 금액"
given = "한 행의 금액이 금액미정이다"
when = "금액을 숫자로 변환한다"
then = "원문을 보존한 채 그 행만 확인필요로 보낸다"

[[scenarios]]
category = "duplicate"
name = "중복 지출ID"
given = "서로 다른 파일에 같은 지출ID가 있다"
when = "통합 결과의 고유 키를 검사한다"
then = "검증을 FAIL로 기록하고 결과를 전달하지 않는다"

[[scenarios]]
category = "rerun"
name = "같은 입력으로 재실행"
given = "첫 실행 뒤 입력 파일이 바뀌지 않았다"
when = "같은 명령을 한 번 더 실행한다"
then = "행 수와 합계와 업무 시트 내용이 첫 실행과 같다"

[security]
share_policy = "synthetic-only"
sensitive_fields = ["사원명", "계좌번호", "거래처명"]
secrets_location = ".env"
max_sample_rows = 20

[handoff]
first_command = "uv run python src/validate_plan.py automation-plan.toml"
test_command = "uv run pytest -q"
approved_by = ["업무 담당자", "결과 사용자"]
```

#### 예상 결과: 네 파일의 역할을 폴더에서 확인하기

`uv.lock`은 `uv sync`를 실행할 때 생기며 같은 pytest 버전을 다시 설치할 수 있게 합니다. `.venv`는
패키지가 설치되는 로컬 환경이므로 기획서 내용이 아닙니다.

```text
automation-plan-example/
├─ automation-plan.toml
├─ pyproject.toml
├─ src/
│  └─ validate_plan.py
├─ tests/
│  └─ test_validate_plan.py
└─ uv.lock
```

#### 참고 자료: Python 표준 TOML 읽기

- [Python tomllib 공식 문서](https://docs.python.org/3/library/tomllib.html)

기획서 파일은 사람이 읽기에는 충분하지만 오타나 누락을 스스로 알려 주지 않습니다. 다음으로 이 파일의
열두 계약을 읽어 PASS와 FAIL을 만드는 검사기를 작성합니다.

## 검사 코드로 빠진 계약을 찾습니다

### 열두 가지 검사를 실행해 모호한 문장과 위험한 경로를 코딩 전에 FAIL로 돌립니다

![TOML 기획서의 열두 계약이 검사기를 지나 PASS와 구체적인 FAIL 이유로 나뉘는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/10/10c0d2f5adad46238367f65e74466275a894dccac4deeaeb6c0b4d8390f3c708.png "검사기는 기획서의 빈칸과 중복과 위험한 경로를 구현 전에 찾습니다")

검사기는 업무를 자동화하지 않습니다. 기획서가 구현을 시작할 만큼 구체적인지만 확인합니다. 최상위 구조,
업무 시간, 범위, 입력, 판단 규칙, 예외, 출력, 경로 안전, 완료 조건, 시나리오, 보안, 인수인계 열두 묶음을
각각 검사합니다.

검사 결과를 하나의 참 또는 거짓으로 끝내지 않고 항목별 PASS와 FAIL로 출력합니다. 사용자는 `경로 안전
FAIL`을 보고 결과 경로가 원본 폴더 안에 있다는 사실을 바로 찾을 수 있습니다. TOML 문법이 깨졌거나
파일을 읽을 수 없는 준비 오류는 종료 코드 2, 내용 계약 실패는 1, 모두 통과하면 0을 반환합니다.

#### 예시 코드: TOML 기획서의 열두 계약 검사하기

아래 전체 내용을 `src/validate_plan.py`에 저장합니다. `require_text`와 `require_positive_int`는 빈 문장과
잘못된 숫자를 공통으로 검사합니다. 각 `check_` 함수는 기획서의 한 책임만 맡으며, 마지막 `CHECKS`가
화면에 표시할 열두 검사 순서를 고정합니다.

```python
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
import sys
import tomllib
from typing import Any, Callable


MAX_PLAN_BYTES = 256 * 1024
REQUIRED_COVERAGE = {"normal", "boundary", "missing", "invalid", "duplicate", "rerun"}
ALLOWED_EXCEPTION_POLICIES = {"stop", "quarantine", "retry", "manual"}


class PlanError(ValueError):
    pass


class PlanLoadError(ValueError):
    pass


@dataclass(frozen=True)
class CheckResult:
    name: str
    passed: bool
    detail: str


@dataclass(frozen=True)
class ValidationReport:
    checks: tuple[CheckResult, ...]
    monthly_hours_saved: float | None

    @property
    def passed(self) -> bool:
        return all(check.passed for check in self.checks)


def require_table(data: dict[str, Any], key: str) -> dict[str, Any]:
    value = data.get(key)
    if not isinstance(value, dict):
        raise PlanError(f"[{key}] 표가 필요합니다")
    return value


def require_text(table: dict[str, Any], key: str) -> str:
    value = table.get(key)
    if not isinstance(value, str) or not value.strip():
        raise PlanError(f"{key}에 빈 문자열이 아닌 값이 필요합니다")
    return value.strip()


def require_positive_int(table: dict[str, Any], key: str) -> int:
    value = table.get(key)
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise PlanError(f"{key}에는 1 이상의 정수가 필요합니다")
    return value


def require_string_list(table: dict[str, Any], key: str) -> list[str]:
    value = table.get(key)
    if not isinstance(value, list) or not value:
        raise PlanError(f"{key}에는 하나 이상의 항목이 필요합니다")
    if any(not isinstance(item, str) or not item.strip() for item in value):
        raise PlanError(f"{key}의 모든 항목은 빈 문자열이 아니어야 합니다")
    return [item.strip() for item in value]


def require_records(data: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = data.get(key)
    if not isinstance(value, list) or not value or any(not isinstance(item, dict) for item in value):
        raise PlanError(f"[[{key}]] 항목이 하나 이상 필요합니다")
    return value


def relative_path(value: str, field: str) -> PurePosixPath:
    path = PurePosixPath(value.replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts:
        raise PlanError(f"{field}는 프로젝트 안의 상대 경로여야 합니다")
    return path


def check_task(data: dict[str, Any]) -> str:
    task = require_table(data, "task")
    for key in ("name", "owner", "trigger", "start_state", "end_state"):
        require_text(task, key)
    runs = require_positive_int(task, "runs_per_month")
    manual = require_positive_int(task, "manual_minutes_per_run")
    target = require_positive_int(task, "target_minutes_per_run")
    if target >= manual:
        raise PlanError("target_minutes_per_run은 manual_minutes_per_run보다 작아야 합니다")
    saved = runs * (manual - target) / 60
    return f"월 예상 절감 {saved:.1f}시간"


def check_scope(data: dict[str, Any]) -> str:
    scope = require_table(data, "scope")
    included = require_string_list(scope, "included")
    excluded = require_string_list(scope, "excluded")
    require_string_list(scope, "forbidden_paths")
    require_text(scope, "manual_fallback")
    overlap = set(included) & set(excluded)
    if overlap:
        raise PlanError(f"included와 excluded가 겹칩니다: {sorted(overlap)}")
    return f"포함 {len(included)}개, 제외 {len(excluded)}개"


def check_input(data: dict[str, Any]) -> str:
    input_plan = require_table(data, "input")
    pattern = require_text(input_plan, "file_pattern")
    relative_path(pattern, "input.file_pattern")
    expected = require_positive_int(input_plan, "expected_file_count")
    columns = require_string_list(input_plan, "required_columns")
    unique_key = require_text(input_plan, "unique_key")
    if unique_key not in columns:
        raise PlanError("input.unique_key는 required_columns 안에 있어야 합니다")
    return f"파일 {expected}개, 필수 열 {len(columns)}개"


def check_rules(data: dict[str, Any]) -> str:
    rules = require_records(data, "rules")
    ids = []
    for rule in rules:
        ids.append(require_text(rule, "id"))
        require_text(rule, "condition")
        require_text(rule, "action")
    if len(ids) != len(set(ids)):
        raise PlanError("rules.id는 중복될 수 없습니다")
    return f"판단 규칙 {len(rules)}개"


def check_exceptions(data: dict[str, Any]) -> str:
    exceptions = require_records(data, "exceptions")
    ids = []
    for exception in exceptions:
        ids.append(require_text(exception, "id"))
        require_text(exception, "condition")
        require_text(exception, "action")
        policy = require_text(exception, "policy")
        if policy not in ALLOWED_EXCEPTION_POLICIES:
            allowed = ", ".join(sorted(ALLOWED_EXCEPTION_POLICIES))
            raise PlanError(f"exceptions.policy는 {allowed} 중 하나여야 합니다")
    if len(ids) != len(set(ids)):
        raise PlanError("exceptions.id는 중복될 수 없습니다")
    return f"예외 정책 {len(exceptions)}개"


def check_output(data: dict[str, Any]) -> str:
    output = require_table(data, "output")
    relative_path(require_text(output, "file"), "output.file")
    sheets = require_string_list(output, "sheets")
    require_text(output, "review_owner")
    if len(sheets) != len(set(sheets)):
        raise PlanError("output.sheets는 중복될 수 없습니다")
    return f"결과 시트 {len(sheets)}개"


def check_path_safety(data: dict[str, Any]) -> str:
    scope = require_table(data, "scope")
    output = require_table(data, "output")
    output_path = relative_path(require_text(output, "file"), "output.file")
    for raw_root in require_string_list(scope, "forbidden_paths"):
        root = relative_path(raw_root, "scope.forbidden_paths")
        if output_path.parts[: len(root.parts)] == root.parts:
            raise PlanError(f"output.file이 수정 금지 경로 {root} 안에 있습니다")
    return "결과 경로가 수정 금지 경로와 분리됨"


def check_acceptance(data: dict[str, Any]) -> str:
    acceptance = require_table(data, "acceptance")
    input_rows = require_positive_int(acceptance, "input_rows")
    output_rows = require_positive_int(acceptance, "output_rows")
    require_positive_int(acceptance, "amount_total")
    for key in ("review_rows", "duplicate_ids", "source_files_changed"):
        value = acceptance.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise PlanError(f"acceptance.{key}에는 0 이상의 정수가 필요합니다")
    if acceptance.get("rerun_same") is not True:
        raise PlanError("acceptance.rerun_same은 true여야 합니다")
    if input_rows != output_rows:
        raise PlanError("acceptance.input_rows와 output_rows가 같아야 합니다")
    return f"입력과 출력 {input_rows}행 일치"


def check_scenarios(data: dict[str, Any]) -> str:
    scenarios = require_records(data, "scenarios")
    categories = set()
    for scenario in scenarios:
        categories.add(require_text(scenario, "category"))
        for key in ("name", "given", "when", "then"):
            require_text(scenario, key)
    missing = sorted(REQUIRED_COVERAGE - categories)
    if missing:
        raise PlanError(f"scenarios에 필요한 범주가 빠졌습니다: {', '.join(missing)}")
    return f"실행 시나리오 {len(scenarios)}개"


def check_security(data: dict[str, Any]) -> str:
    security = require_table(data, "security")
    if require_text(security, "share_policy") != "synthetic-only":
        raise PlanError("security.share_policy는 synthetic-only여야 합니다")
    fields = require_string_list(security, "sensitive_fields")
    require_text(security, "secrets_location")
    rows = require_positive_int(security, "max_sample_rows")
    if rows > 20:
        raise PlanError("security.max_sample_rows는 20 이하여야 합니다")
    return f"민감 필드 {len(fields)}개, 합성 샘플 최대 {rows}행"


def check_handoff(data: dict[str, Any]) -> str:
    handoff = require_table(data, "handoff")
    require_text(handoff, "first_command")
    require_text(handoff, "test_command")
    approvers = require_string_list(handoff, "approved_by")
    if len(approvers) < 2:
        raise PlanError("handoff.approved_by에는 업무 담당자와 결과 사용자가 모두 필요합니다")
    return f"승인 역할 {len(approvers)}개"


def check_top_level(data: dict[str, Any]) -> str:
    required = {
        "task", "scope", "input", "rules", "exceptions", "output",
        "acceptance", "scenarios", "security", "handoff",
    }
    missing = sorted(required - data.keys())
    if missing:
        raise PlanError(f"최상위 항목이 빠졌습니다: {', '.join(missing)}")
    return "필수 최상위 항목 10개"


CHECKS: tuple[tuple[str, Callable[[dict[str, Any]], str]], ...] = (
    ("구조", check_top_level),
    ("업무", check_task),
    ("범위", check_scope),
    ("입력", check_input),
    ("판단 규칙", check_rules),
    ("예외", check_exceptions),
    ("출력", check_output),
    ("경로 안전", check_path_safety),
    ("완료 조건", check_acceptance),
    ("시나리오", check_scenarios),
    ("보안", check_security),
    ("인수인계", check_handoff),
)


def validate_plan(data: dict[str, Any]) -> ValidationReport:
    results = []
    for name, check in CHECKS:
        try:
            detail = check(data)
            results.append(CheckResult(name, True, detail))
        except PlanError as error:
            results.append(CheckResult(name, False, str(error)))

    hours = None
    if results[1].passed:
        task = require_table(data, "task")
        hours = (
            task["runs_per_month"]
            * (task["manual_minutes_per_run"] - task["target_minutes_per_run"])
            / 60
        )
    return ValidationReport(tuple(results), hours)


def load_plan(path: Path) -> dict[str, Any]:
    try:
        payload = path.read_bytes()
    except OSError as error:
        raise PlanLoadError(f"기획서를 읽을 수 없습니다: {path}: {error}") from error
    if len(payload) > MAX_PLAN_BYTES:
        raise PlanLoadError(f"기획서가 {MAX_PLAN_BYTES}바이트 제한을 넘습니다")
    try:
        text = payload.decode("utf-8")
        data = tomllib.loads(text)
    except (UnicodeDecodeError, tomllib.TOMLDecodeError) as error:
        raise PlanLoadError(f"TOML 문법 오류: {error}") from error
    if not isinstance(data, dict):
        raise PlanLoadError("기획서 최상위 값은 TOML 표여야 합니다")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="업무자동화 기획서 계약 검사")
    parser.add_argument("plan", type=Path, help="검사할 automation-plan.toml 경로")
    args = parser.parse_args(argv)

    try:
        data = load_plan(args.plan)
    except PlanLoadError as error:
        print(f"기획서 준비 실패: {error}", file=sys.stderr)
        return 2

    report = validate_plan(data)
    for check in report.checks:
        result = "PASS" if check.passed else "FAIL"
        print(f"{result:4} {check.name:8} {check.detail}")

    if not report.passed:
        print("기획서 검증 실패: FAIL 항목을 고친 뒤 다시 실행합니다", file=sys.stderr)
        return 1

    print(f"기획서 검증 완료: 12개 PASS, 월 예상 절감 {report.monthly_hours_saved:.1f}시간")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

#### 실행 명령: 기획서 열두 항목 검사하기

프로젝트 루트에서 의존성을 설치한 뒤 검사기를 실행합니다. 첫 명령은 `pyproject.toml`과 `uv.lock`에 맞는
환경을 준비하고, 두 번째 명령은 기획서 경로를 검사기에 전달합니다.

```powershell
uv sync
uv run python src/validate_plan.py automation-plan.toml
```

#### 예상 결과: 열두 줄 PASS와 절감 시간 확인하기

정상 예제에서는 열두 검사 줄이 모두 PASS이고 마지막에 월 예상 절감 7.3시간이 표시됩니다. PASS 개수만
보지 말고 파일 수, 열 수, 규칙 수, 시나리오 수가 자신이 적은 값과 맞는지도 읽습니다.

```text
PASS 구조       필수 최상위 항목 10개
PASS 업무       월 예상 절감 7.3시간
PASS 범위       포함 3개, 제외 3개
PASS 입력       파일 3개, 필수 열 5개
PASS 판단 규칙    판단 규칙 2개
PASS 예외       예외 정책 4개
PASS 출력       결과 시트 4개
PASS 경로 안전    결과 경로가 수정 금지 경로와 분리됨
PASS 완료 조건    입력과 출력 9행 일치
PASS 시나리오     실행 시나리오 6개
PASS 보안       민감 필드 3개, 합성 샘플 최대 20행
PASS 인수인계     승인 역할 2개
기획서 검증 완료: 12개 PASS, 월 예상 절감 7.3시간
```

정상 예제가 통과했다는 사실만으로 검사기가 고장을 찾는지는 알 수 없습니다. 일부러 기획서를 망가뜨리고
원하는 항목이 FAIL이 되는지 시험해야 합니다.

## 고장을 넣어 기획서 검사를 시험합니다

### 정상 통과 뒤 필수 항목 누락과 중복 규칙과 금지 경로를 깨뜨려 FAIL을 확인합니다

![정상 기획서 복사본에 아홉 종류의 고장이 하나씩 들어가고 예상한 검사만 FAIL이 되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/17/17c286b84ad876537379331e062d40c28bc370ed9c3fb52efe03c55ed0bc0482.png "검사기 자체도 고장 난 기획서를 실제로 거부하는지 시험해야 믿을 수 있습니다")

테스트는 원본 기획서를 직접 망가뜨리지 않습니다. pytest의 `tmp_path`가 테스트마다 새 임시 폴더를 만들고,
그 안에 기획서 복사본을 둡니다. 한 테스트가 수정한 파일이 다음 테스트에 남지 않으므로 실패 원인을 서로
섞지 않을 수 있습니다.

아홉 테스트는 정상 통과, 필수 표 누락, 규칙 ID 중복, 재실행 시나리오 누락, 알 수 없는 예외 정책, 원본
폴더 안의 결과 경로, 줄어들지 않는 목표 시간, TOML 문법 오류, 파일 크기 제한을 확인합니다. 각 실패
테스트는 종료 코드와 사람이 읽을 오류 문장을 함께 검사합니다.

#### 예시 코드: 기획서 검사기의 아홉 고장 주입 테스트 작성하기

아래 전체 내용을 `tests/test_validate_plan.py`에 저장합니다. `replace_once`는 예제의 정확한 한 줄만 바꾸고,
`run_validator`는 실제 사용자가 실행하는 것처럼 별도 Python 프로세스에서 종료 코드와 출력을 받습니다.

```python
from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT_ROOT / "src" / "validate_plan.py"
SOURCE_PLAN = PROJECT_ROOT / "automation-plan.toml"


def copy_plan(tmp_path: Path) -> Path:
    target = tmp_path / "automation-plan.toml"
    shutil.copy2(SOURCE_PLAN, target)
    return target


def run_validator(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(path)],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def replace_once(path: Path, old: str, new: str) -> None:
    source = path.read_text(encoding="utf-8")
    assert old in source
    path.write_text(source.replace(old, new, 1), encoding="utf-8")


def test_complete_plan_passes_twelve_checks(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)

    completed = run_validator(plan)

    assert completed.returncode == 0
    assert completed.stdout.count("PASS") == 13
    assert "12개 PASS" in completed.stdout
    assert "월 예상 절감 7.3시간" in completed.stdout


def test_missing_top_level_section_is_reported(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)
    replace_once(plan, "[input]", "[input_missing]")

    completed = run_validator(plan)

    assert completed.returncode == 1
    assert "최상위 항목이 빠졌습니다: input" in completed.stdout


def test_duplicate_rule_id_is_reported(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)
    replace_once(plan, 'id = "R2"', 'id = "R1"')

    completed = run_validator(plan)

    assert completed.returncode == 1
    assert "rules.id는 중복될 수 없습니다" in completed.stdout


def test_missing_scenario_coverage_is_reported(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)
    replace_once(plan, 'category = "rerun"', 'category = "normal"')

    completed = run_validator(plan)

    assert completed.returncode == 1
    assert "scenarios에 필요한 범주가 빠졌습니다: rerun" in completed.stdout


def test_unknown_exception_policy_is_reported(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)
    replace_once(plan, 'policy = "quarantine"', 'policy = "ignore"')

    completed = run_validator(plan)

    assert completed.returncode == 1
    assert "exceptions.policy는 manual, quarantine, retry, stop 중 하나" in completed.stdout


def test_output_cannot_enter_forbidden_source_path(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)
    replace_once(plan, 'file = "output/expense_result.xlsx"', 'file = "input/expense_result.xlsx"')

    completed = run_validator(plan)

    assert completed.returncode == 1
    assert "output.file이 수정 금지 경로 input 안에 있습니다" in completed.stdout


def test_target_time_must_be_smaller_than_manual_time(tmp_path: Path) -> None:
    plan = copy_plan(tmp_path)
    replace_once(plan, "target_minutes_per_run = 10", "target_minutes_per_run = 120")

    completed = run_validator(plan)

    assert completed.returncode == 1
    assert "target_minutes_per_run은 manual_minutes_per_run보다 작아야 합니다" in completed.stdout


def test_invalid_toml_returns_preparation_exit_code(tmp_path: Path) -> None:
    plan = tmp_path / "automation-plan.toml"
    plan.write_text('[task\nname = "broken"', encoding="utf-8")

    completed = run_validator(plan)

    assert completed.returncode == 2
    assert "기획서 준비 실패: TOML 문법 오류" in completed.stderr


def test_oversized_plan_returns_preparation_exit_code(tmp_path: Path) -> None:
    plan = tmp_path / "automation-plan.toml"
    plan.write_text("x" * (256 * 1024 + 1), encoding="utf-8")

    completed = run_validator(plan)

    assert completed.returncode == 2
    assert "262144바이트 제한을 넘습니다" in completed.stderr
```

#### 실행 명령: 정상과 실패 경로 아홉 개 확인하기

프로젝트 루트에서 아래 명령을 실행합니다. 점 아홉 개는 서로 독립된 테스트 아홉 개가 통과했다는 뜻입니다.
테스트 하나가 실패하면 그 이름과 기대 문장부터 읽고 기획서 또는 검사기의 해당 계약을 확인합니다.

```powershell
uv run pytest -q
```

#### 예상 결과: 고장 주입 테스트 아홉 개 통과하기

정상 기획서 한 개와 서로 다른 고장을 넣은 복사본 여덟 개가 입력입니다. 검사기가 정상은 받아들이고 각
고장은 정해 둔 이유로 거부하면 점 아홉 개와 `9 passed`가 나오며, 이것이 성공과 실패 경로를 함께 검증한 증거입니다.

```text
.........
9 passed
```

#### 참고 자료: 테스트마다 별도 임시 폴더 사용하기

- [pytest tmp_path 공식 문서](https://docs.pytest.org/en/stable/how-to/tmp_path.html)

이제 `automation-plan.toml`, 검사기의 `12개 PASS`, pytest의 `9 passed`가 한 묶음입니다. 구현자나 AI에게
전달할 때는 저장소와 이 세 증거를 함께 줍니다. 구현 전에는 입력 파일을 쓰지 않고, 합성 자료에서 시작하며,
먼저 계획과 바꿀 파일을 설명하게 합니다.

#### 입력 예시: 구현 전에 전달할 작업 지시 고정하기

```text
automation-plan.toml을 업무 계약의 정본으로 사용합니다.
먼저 프로젝트 파일을 읽고 입력, 규칙, 예외, 출력, 완료 조건을 자신의 말로 요약합니다.
모호하거나 서로 충돌하는 값이 있으면 코드를 쓰기 전에 목록으로 보고합니다.
input은 수정하지 않고 합성 Excel로 첫 실행을 만듭니다.
각 acceptance 값과 scenarios의 Given, When, Then을 자동 검사로 연결합니다.
uv run python src/validate_plan.py automation-plan.toml과 uv run pytest -q를 모두 통과시킵니다.
변경 파일, 실행 명령, PASS 증거, 남은 한계를 마지막에 보고합니다.
```

자신의 업무로 옮길 때는 한꺼번에 모든 값을 바꾸지 않습니다. 먼저 `[task]`의 시작과 끝, `[input]`의 실제
열과 고유 키, `[[rules]]`의 경계값, `[acceptance]`의 손계산 숫자를 차례로 바꿉니다. 그다음 수정 금지
경로와 수동 복구를 실제 담당자와 확인합니다. 검사기 12개와 고장 주입 테스트 9개가 다시 통과한 뒤에만
자동화 구현을 시작합니다.
