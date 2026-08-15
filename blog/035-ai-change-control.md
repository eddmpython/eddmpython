---
title: AI 코드 변경 검토 방법: 테스트와 diff로 범위 확인하고 되돌리기
slug: ai-change-control
date: 2026-08-15
modified: 2026-08-15
author: eddmpython
section: AI 작업 환경
summary: AI 코드 변경 검토 방법을 테스트와 Git diff로 설명합니다. 요청 범위를 확인하고 잘못 바뀐 파일 하나만 안전하게 되돌리는 절차까지 연결합니다.
readerQuestion: AI가 바꾼 코드에서 요청하지 않은 변경을 어떻게 찾고 필요한 파일만 남길 수 있을까?
readerTakeaway: 변경 전 상태를 기록하고 좁은 테스트와 전체 테스트를 통과시킨 뒤 파일별 diff를 읽고 승인하지 않은 한 파일만 정확히 복구한다.
readerLevel: beginner
readerStartingPoint: Git으로 관리되는 Python 자동화 프로젝트와 실행 가능한 pytest 테스트가 준비된 상태입니다.
primaryKeyword: AI 코드 변경 검토 방법
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a5/a511253cfdfecc35eab19e3b0411fa999ea1202a228f3aea1f943403cf564a04.png
ogImageAlt: AI 코드 변경이 테스트와 변경 파일 목록 및 diff와 사람 승인 네 관문을 지나는 모습
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

`AI 코드 변경 검토 방법`의 핵심은 AI 답변을 믿는 것이 아니라 저장소에 남은 증거를 보는 것입니다.
AI가 `요청한 기능만 수정했습니다`라고 말해도 실제 변경 파일과 코드 차이는 Git으로 확인해야 합니다.

검토는 변경 전 상태, 테스트, 파일 목록, 줄 단위 diff, 사람 승인 순서로 진행합니다. 잘못 바뀐 파일을
찾으면 전체 작업을 지우지 않고 그 파일 하나만 정확히 되돌립니다.

## 변경 전 상태를 출발점으로 남깁니다

### 작업 전 Git 상태와 테스트 결과를 저장해 AI 변경 뒤와 비교합니다

![AI 코드 변경이 테스트와 변경 파일 목록 및 diff와 사람 승인 네 관문을 지나는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a5/a511253cfdfecc35eab19e3b0411fa999ea1202a228f3aea1f943403cf564a04.png "변경 내용은 네 검토 관문을 모두 통과한 뒤에만 승인됩니다")

작업 트리에 이미 사용자 변경이 있으면 AI 작업과 섞일 수 있습니다. 먼저 `git status --short`로 파일
목록을 확인하고, 기존 테스트를 실행합니다. 깨끗하지 않다면 기존 변경 파일과 이유를 따로 기록합니다.

이 단계의 목적은 무조건 변경 0개를 만드는 것이 아닙니다. AI가 작업하기 전부터 있던 변경과 AI가 새로
만든 변경을 구분할 기준을 갖는 것입니다.

#### 코드

```powershell
git status --short
python -m pytest -q
```

#### 예시

| 항목 | 예시 |
|---|---|
| 기존 변경 파일 | 없음 |
| 기존 테스트 | 18 passed |
| 요청한 변경 파일 | `report.py`, `test_report.py` |
| 수정 금지 파일 | `.env`, `samples/original/*` |

## 좁은 테스트 뒤에 전체 테스트를 실행합니다

### 새 조건 테스트로 빠르게 확인하고 전체 테스트로 기존 기능을 다시 검사합니다

![새 기능의 좁은 테스트가 먼저 통과하고 전체 회귀 테스트가 뒤이어 통과하는 두 단계 검증](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7b/7b1c3fccf0762cd7dfadf70fbb7881000530ad0ac9cae4ab9e24a8a579946608.png "빠른 새 기능 검증 뒤에 전체 기능 검증이 이어져 회귀 오류를 찾습니다")

AI가 고친 기능에 가까운 테스트부터 실행하면 오류를 빨리 찾을 수 있습니다. 10만원 경계를 바꿨다면
경계 테스트 파일을 먼저 실행하고, 통과한 뒤 프로젝트 전체 테스트를 실행합니다.

좁은 테스트만 통과하면 다른 기능이 깨졌는지 알 수 없습니다. 전체 테스트만 실행하면 어느 변경에서
문제가 생겼는지 찾는 시간이 길어집니다. 두 단계를 순서대로 사용하는 이유입니다.

#### 코드

```powershell
python -m pytest tests/test_boundaries.py -q
python -m pytest -q
```

## 변경 파일과 줄 단위 diff를 읽습니다

### 요청한 파일만 바뀌었는지 확인하고 코드와 테스트를 한 쌍으로 검토합니다

![요청한 두 파일과 요청하지 않은 설정 파일이 Git diff에서 분리되어 보이는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/48/48cdb7964af4c8dac7c37585daa6da46ab3ba0df272090fa65b5c418d42d5610.png "허용된 코드와 테스트 변경은 검토 대상으로 남고 범위 밖 설정 변경은 거부됩니다")

테스트가 모두 통과해도 요청하지 않은 설정, 문서, 의존성 파일이 바뀌었을 수 있습니다. 먼저 파일 이름과
변경량을 보고, 그다음 각 파일의 실제 줄을 읽습니다.

`report.py`의 조건이 바뀌었다면 `test_report.py`에 경계 테스트가 함께 있는지 확인합니다. 반대로
`requirements.txt`나 배포 설정이 요청 없이 바뀌었다면 이유가 분명할 때까지 승인하지 않습니다.

#### 코드

```powershell
git diff --stat
git diff --name-only
git diff -- report.py
git diff -- tests/test_report.py
```

#### 확인 목록

- 요청한 규칙과 직접 관련된 줄인가?
- 기존 동작을 바꾸는 삭제가 숨어 있지 않은가?
- 새 코드의 실패 조건을 잡는 테스트가 있는가?
- 원본 파일과 비밀 설정 및 배포 파일은 그대로인가?

## 잘못 바뀐 파일 하나만 되돌립니다

### diff를 다시 확인한 뒤 정확한 경로에만 git restore를 사용합니다

![여러 변경 파일 가운데 잘못 바뀐 설정 파일 하나만 선택되어 원래 상태로 복구되는 모습](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/7d/7d22b486bdfa20f53a94c830c6b96dff32910decdc4fbd464fc15fe8ec0ee68d.png "승인한 코드 변경은 남고 선택한 한 파일만 작업 전 내용으로 돌아갑니다")

`git restore`는 커밋하지 않은 변경을 없앨 수 있으므로 먼저 해당 파일의 diff를 읽습니다. 필요한 내용이
있다면 별도 메모나 패치로 보관한 뒤, 되돌릴 파일의 정확한 경로만 지정합니다.

아래 예시는 AI가 요청 없이 바꾼 `config/settings.json` 하나만 작업 전 상태로 돌립니다. `report.py`와
테스트 파일의 승인한 변경은 그대로 남습니다.

#### 코드

```powershell
git diff -- config/settings.json
git restore -- config/settings.json
git status --short
python -m pytest -q
```

복구 뒤에는 상태와 전체 테스트를 다시 확인합니다. 완료 조건은 잘못 바뀐 파일이 목록에서 사라지고,
승인한 파일만 남으며, 모든 테스트가 다시 PASS인 상태입니다.

#### 확인 목록

| 검사 | 통과 조건 |
|---|---|
| 변경 파일 | 승인한 경로만 남음 |
| 새 기능 테스트 | PASS |
| 전체 테스트 | PASS |
| 원본과 비밀값 | 변경 없음 |
| diff | 설명할 수 없는 줄 없음 |

#### 참고 자료

- [Git diff 공식 문서](https://git-scm.com/docs/git-diff)
- [Git restore 공식 문서](https://git-scm.com/docs/git-restore)
- [pytest 공식 문서](https://docs.pytest.org/en/stable/)
