---
title: Python 자동화 인수인계서 작성 방법: 동료가 혼자 재실행하는 6단계
slug: handoff-runbook
author: eddmpython
section: 실무 전환
summary: Python 자동화 인수인계서 작성 방법을 설치, 입력, 실행, 결과, 검증, 오류복구 6단계로 설명합니다. 처음 보는 동료가 문서만으로 재실행하게 만듭니다.
readerQuestion: 코드를 만든 사람이 없어도 동료가 같은 Excel 결과를 만들게 하려면 무엇을 남겨야 할까?
readerTakeaway: 환경 설치부터 오류복구까지 복사 가능한 명령과 기대 결과를 적고 처음 보는 동료의 무도움 재실행으로 문서를 검증한다.
readerLevel: beginner
readerStartingPoint: 합성 입력으로 전체 테스트를 통과한 Python Excel 자동화 프로젝트가 준비된 상태입니다.
primaryKeyword: Python 자동화 인수인계서 작성 방법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1e/1e2b9f0000725f07006dd1cf3288f072b9fa6bf0ef2f9d2a752bfd23f45c4ea2.png
ogImageAlt: 설치와 입력 및 실행과 결과와 검증 및 오류복구가 연결된 Python 자동화 인수인계서 6단계
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`Python 자동화 인수인계서 작성 방법`은 코드 설명을 길게 적는 일이 아닙니다. 프로젝트를 처음 보는
동료가 문서를 위에서 아래로 따라 같은 합성 입력의 결과와 PASS 검증표를 만드는 절차를 쓰는 일입니다.

좋은 인수인계서는 작성자가 옆에서 설명하지 않아도 작동합니다. 설치, 입력, 실행, 결과, 검증, 오류복구
여섯 단계마다 복사할 명령과 성공 상태를 함께 둡니다.

## 인수인계서를 여섯 실행 단계로 구성합니다

### 설치부터 오류복구까지 각 단계에 행동과 성공 증거를 한 쌍으로 적습니다

![설치와 입력 및 실행과 결과와 검증 및 오류복구가 연결된 Python 자동화 인수인계서 6단계](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/1e/1e2b9f0000725f07006dd1cf3288f072b9fa6bf0ef2f9d2a752bfd23f45c4ea2.png "여섯 단계가 끊기지 않고 이어지며 각 단계가 확인 표시로 끝납니다")

`Python을 설치합니다`처럼 넓게 쓰면 버전과 명령을 다시 물어봐야 합니다. 각 단계는 어디에서 무엇을
실행하고 어떤 파일이나 문장이 보이면 성공인지까지 적습니다.

오류복구를 마지막에 두지만 실패한 사람만 읽는 부록으로 만들지는 않습니다. 흔한 오류와 확인 명령을
실행 단계 바로 옆에서도 찾을 수 있게 문서 안 링크나 제목을 맞춥니다.

#### 설명 목록

1. 설치: 필요한 Python 버전과 의존성 설치 명령
2. 입력: 허용 파일 형식과 저장 위치 및 필수 열
3. 실행: 프로젝트 루트에서 복사할 한 줄 명령
4. 결과: 생성 파일 위치와 시트 이름 및 기대 숫자
5. 검증: 좁은 테스트와 전체 테스트 및 수동 확인
6. 오류복구: 흔한 실패, 원인 확인, 안전한 재실행

## 새 폴더에서 설치와 실행을 그대로 따라 합니다

### 작업 폴더와 명령 및 입력 경로를 정확히 적어 기억에 의존하지 않게 합니다

![새 프로젝트 폴더에서 환경 설치와 합성 입력 복사 및 실행 명령이 차례로 진행되는 터미널 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/71/719a0afa01c526f8ac6e1c6a4744b3e803d65f1be55ff3fb050ba25b5ef1f131.png "깨끗한 폴더에서 문서의 명령만 사용해 결과 Excel이 생성됩니다")

작성자 컴퓨터에만 있는 가상환경이나 절대 경로를 쓰면 동료 컴퓨터에서 멈춥니다. 프로젝트 안의 상대
경로를 사용하고, 명령을 어느 폴더에서 실행할지 첫 줄에 적습니다.

아래 예시는 PowerShell에서 프로젝트 루트로 이동한 뒤 환경을 만들고 합성 파일을 처리합니다. 실제
저장소의 Python 버전과 설치 파일 이름에 맞게 바꿉니다.

#### 코드

```powershell
cd C:\work\expense-automation
python --version
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python run_report.py samples\synthetic-five-rows.xlsx
```

명령마다 기대 문장도 적습니다. 예를 들어 실행이 끝나면 종료 코드가 0이고 `output/result.xlsx`가 새로
생기며 원본 합성 파일의 수정 시간이 바뀌지 않아야 합니다.

## 결과 파일과 숫자를 화면으로 대조합니다

### 여섯 시트와 정상 4행 및 확인필요 1행과 합계 249998원을 확인합니다

![결과 Excel의 여섯 시트와 행 수 및 금액 합계가 인수인계서 기대값과 맞는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/16/16066535c61a7e50cf7fd8729f0f7c24c1d6d46285a1765d0998085dc5eb024b.png "동료가 만든 파일의 구조와 숫자가 문서의 기준표와 하나씩 일치합니다")

파일이 생겼다는 사실만 확인하면 빈 시트나 잘못된 합계도 성공으로 볼 수 있습니다. 인수인계서에는 결과
파일의 시트 순서와 핵심 숫자를 작은 표로 둡니다.

자동 테스트 결과와 사람이 Excel에서 볼 항목을 분리합니다. 동료는 테스트 PASS를 확인한 뒤 실제 파일을
열어 시트 이름과 검증 표의 숫자를 대조합니다.

#### 예시

| 검사 | 기대값 |
|---|---|
| 결과 파일 | `output/result.xlsx` |
| 시트 | 정상, 확인필요, 부서요약, 검증, 고액거래, 취소거래 |
| 정상 행 | 4 |
| 확인필요 행 | 1 |
| 정상 금액 합계 | 249998 |
| 고액거래와 취소거래 | 각각 1행 |

```powershell
python -m pytest -q
```

## 작성자 도움 없는 재실행으로 문서를 검수합니다

### 처음 보는 동료의 첫 멈춤 지점을 기록하고 문서만 고친 뒤 다시 시험합니다

![작성자와 분리된 동료가 인수인계서만 보고 실행하고 첫 멈춤을 문서 수정과 재시험으로 연결하는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/da/daf268afa775457340a6acbafa198f44036e46ceac5fbe20bc7e00273bb21ed7.png "말로 힌트를 주지 않고 막힌 지점을 문서 결함으로 되돌려 다음 실행을 개선합니다")

인수인계서 검수 때 작성자가 옆에서 명령을 알려 주면 문서의 빈칸이 가려집니다. 동료에게 저장소 주소와
인수인계서만 주고, 처음 멈춘 위치와 화면 메시지를 그대로 기록하게 합니다.

사람이 실수했다고 끝내지 않습니다. 경로가 모호했는지, 성공 문장이 없었는지, 오류복구가 실제 메시지와
달랐는지 찾아 문서를 고칩니다. 고친 뒤 새 폴더에서 다시 실행해야 인수인계가 완료됩니다.

#### 확인 목록

- 처음 보는 동료가 작성자 도움 없이 설치했습니다.
- 합성 입력과 실행 명령을 스스로 찾았습니다.
- 결과 파일과 기대 숫자를 직접 대조했습니다.
- 전체 테스트가 PASS했습니다.
- 첫 멈춤 지점과 원인을 인수인계서에 반영했습니다.
- 수정한 문서로 새 폴더에서 두 번째 재실행에 성공했습니다.

#### 참고 자료

- [Python venv 공식 문서](https://docs.python.org/3/library/venv.html)
- [Python 패키지 설치 안내](https://packaging.python.org/en/latest/tutorials/installing-packages/)
