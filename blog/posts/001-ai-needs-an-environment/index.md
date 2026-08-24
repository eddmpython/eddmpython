---
title: AI 코딩 환경 구성 방법, 저장소부터 읽게 하기
slug: ai-environment
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 환경 구성은 저장소의 실제 규칙과 테스트 명령, 권한 경계를 먼저 찾는 일입니다. 조사 결과를 AGENTS.md와 CLAUDE.md 한 정본에 남기고 새 대화에서 다시 검증합니다.
readerQuestion: AI가 저장소마다 다른 명령과 작업 경계를 직접 찾아 다음 대화에서도 같은 방식으로 일하게 하려면 무엇을 남겨야 할까?
readerTakeaway: AI 코딩 환경 구성은 긴 프롬프트가 아니라 기존 지시, 설정 파일, 실제 실행 결과를 읽어 한 정본에 남기고 새 대화에서 행동을 다시 확인하는 일이다.
readerLevel: working
readerStartingPoint: AI 코딩 도구로 저장소를 열 수 있지만 매번 설치 명령, 테스트 명령, 수정하면 안 되는 범위를 다시 설명하고 있다.
primaryKeyword: AI 코딩 환경 구성
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png
ogImageAlt: 블로그 링크 한 장이 저장소 조사와 지침 파일 작성 및 검증 결과로 이어지는 작업 흐름
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

파이썬 저장소를 맡겼는데 AI가 있지도 않은 `pytest`를 실행했습니다. 다음 대화에서는 `npm test`를 찾았지만, 이번에는 빌드가 끝났다는 이유로 화면도 정상이라고 보고했습니다. 모델을 바꿔도 비슷했습니다. 왜 그랬을까요? 저장소의 설정과 CI를 읽지 않은 채 언어 이름만 보고 출발한 것이 원인이었습니다.

긴 프롬프트를 붙여도 복사할 때마다 한 줄이 빠졌고, 명령이 바뀐 뒤에는 옛 문장까지 남았습니다. 지금은 저장소를 연 AI에게 아래 주소를 보내고, 기존 지시와 설정 파일에서 현재 답을 찾게 합니다.

`https://eddmpython.com/blog/ai-environment`

링크가 맡는 것은 프로젝트의 정답이 아니라 조사 순서입니다. AI가 이 페이지와 저장소를 읽을 수 있어야 하고, 파일 수정과 명령 실행 권한도 현재 요청 안에 있어야 합니다.

## AI 코딩 환경 구성 링크의 역할

### 주소 한 줄은 저장소 조사부터 완료 보고까지 같은 순서로 시작하게 합니다

![블로그 링크 한 장이 저장소 조사와 지침 파일 작성 및 검증 결과로 이어지는 작업 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png "주소는 답을 복사하는 버튼이 아니라 조사 순서와 완료 조건을 여는 입구로 읽습니다")

긴 프롬프트는 한 줄만 빠져도 다른 작업 계약이 됩니다. 이 링크에는 `pytest`나 `npm test` 가운데 하나를 정답으로 박아 두지 않았습니다. 대신 기존 지시를 읽고, 작업 트리를 확인하고, 패키지 설정과 CI에서 명령을 찾고, 실제 실행 결과를 보고하라고 적었습니다. 저장소가 바뀌면 명령도 바뀌지만 조사 순서는 남습니다.

#### 입력 예시: 링크로 현재 저장소 환경 조사 요청하기

주소만 받으면 페이지 요약으로 끝내는 도구도 있으므로, 아래처럼 현재 저장소를 조사하라는 동사를 붙여야 결과가 분명해집니다. AI는 템플릿을 곧바로 복사하지 않고 기존 파일과 변경 상태부터 읽어야 합니다.

```text
현재 저장소를 아래 글의 순서대로 조사해 작업 환경을 구성해 줘.
기존 지시와 수정 중인 파일은 보존하고, 확인한 명령만 문서에 적어.

https://eddmpython.com/blog/ai-environment
```

첫 행동은 문서 작성이 아닙니다. 링크보다 먼저 적용되는 저장소 지시와 사용자의 현재 요청을 확인해야 합니다.

## 기존 지시와 작업 트리

### 사용자 요청과 이미 바뀐 파일을 먼저 읽어야 환경 문서가 기존 작업을 덮지 않습니다

![사용자 요청과 기존 저장소 지시가 블로그 작업 계약보다 앞에서 합쳐지는 우선순위 구조](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9e/9ec099a01c225754a9858ee09900021d41029f455c545e2bf592e88e4eb3cebb.png "링크의 절차는 기존 지시를 덮는 명령이 아니라 비어 있는 환경 정보를 조사하는 보조 계약입니다")

링크를 받았어도 기존 지시와 작업 트리가 먼저입니다. Codex는 일을 시작하기 전에 `AGENTS.md`를 읽고 프로젝트 루트에서 현재 작업 폴더까지 내려오며 지시를 합치는데, 가까운 폴더의 지시가 나중에 들어간다는 현재 동작은 [OpenAI의 AGENTS.md 공식 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md)에서 확인할 수 있습니다. 저장소의 `AGENTS.md`가 배포 금지나 기존 변경 보존을 적었다면 이 글이 그 규칙을 덮지 않습니다. 사용자가 “검토해”라고 했는데 파일을 고치는 일도 같은 범위 위반입니다.

#### 확인 목록: 새 문서보다 먼저 읽을 세 가지

| 먼저 읽을 것 | 확인할 내용 | 이 단계에서 하지 않을 일 |
|---|---|---|
| 사용자의 현재 요청 | 검토인지 수정인지, 배포까지 맡겼는지 | 요청 범위를 넓히기 |
| 기존 `AGENTS.md`와 `CLAUDE.md` | 브랜치, 테스트, 비밀정보, 산출물 규칙 | 새 템플릿으로 덮기 |
| `git status --short --branch` | 현재 브랜치와 이미 바뀐 파일 | 되돌리거나 새 브랜치 만들기 |

기존 변경과 지시를 확인했으면 기억으로 테스트 명령을 고르지 않습니다. 이제 저장소 안에서 명령의 근거를 찾습니다.

## 설정 파일에서 명령 찾기

### lockfile과 패키지 설정과 CI를 대조하면 설치 및 테스트 명령이 한곳으로 모입니다

![저장소의 README와 lockfile 및 CI 파일이 실제 설치 명령과 테스트 명령으로 모이는 조사 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5b/5b147cfff2b937f6ec69165c7d43e5a97c96d8febc2e782ff0507fc4fff00673.png "파일 이름 하나가 아니라 여러 정본이 같은 실행 명령을 가리키는지 대조합니다")

저는 먼저 `git status --short --branch`를 실행합니다. 그다음에는 README, lockfile, 패키지 설정, 테스트 러너, CI 파일을 함께 찾습니다. `uv.lock` 하나만 보고 `uv run pytest`를 만들거나 `package.json`이 있다는 이유로 루트에서 `npm test`를 실행하면 틀릴 수 있습니다. 실제 스크립트와 CI가 어느 폴더에서 무슨 명령을 부르는지 대조해야 합니다. `.env`는 변수 이름과 주입 위치만 보고 값은 출력하지 않습니다.

#### 실행 명령: 저장소 상태와 명령 근거 찾기

첫 줄은 보호할 변경을 보여 줍니다. 나머지 줄은 설치와 테스트 명령의 근거가 될 파일을 찾습니다. `rg`가 없다면 사용 가능한 파일 검색 도구로 같은 대상을 찾고, 명령 실패를 성공처럼 바꾸어 말하지 않습니다.

```powershell
git status --short --branch
rg --files -g "README*" -g "AGENTS.md" -g "CLAUDE.md"
rg --files -g "pyproject.toml" -g "uv.lock" -g "package.json" -g "package-lock.json"
rg --files -g ".github/workflows/*" -g "tests/**" -g "test/**"
```

파일을 찾은 뒤에는 설치, 개발, 가장 작은 검사, 전체 검사, 빌드 명령을 실행 위치와 함께 적습니다. 같은 사실을 두 지침 파일에 복사하면 명령이 바뀐 날 다시 갈라집니다.

## AGENTS.md와 CLAUDE.md 한 정본

### 두 도구가 다른 파일을 읽어도 규칙 본문은 한 파일에만 남깁니다

![AGENTS.md와 CLAUDE.md 중 한 파일만 큰 정본이 되고 다른 파일이 그곳을 가리키는 두 가지 배치](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f3/f3e10a5d91b6ab8315e0cf92c2221462ebc8c81bf2e4b04e5018da6eca3f7bb1.png "두 도구를 지원하되 같은 규칙을 복사하지 않고 한 방향으로 연결합니다")

Codex와 Claude Code는 처음 읽는 파일 이름이 다릅니다. Codex는 `AGENTS.md`를 읽고, Claude Code는 `CLAUDE.md`를 읽습니다. 이 저장소와 공개 템플릿은 `CLAUDE.md`를 공통 규칙의 정본으로 두고 `AGENTS.md`에는 그 파일을 먼저 읽으라고 적습니다. 반대로 이미 `AGENTS.md`가 정본인 저장소는 방향을 억지로 바꾸지 않습니다. Claude Code의 [공식 프로젝트 지침 문서](https://code.claude.com/docs/en/memory)가 안내하는 `@AGENTS.md` 가져오기를 쓰면 됩니다.

#### 예시 코드: CLAUDE.md를 먼저 읽게 하는 AGENTS.md

Codex가 먼저 여는 `AGENTS.md`에는 정본의 정확한 파일 이름만 적습니다. 테스트 명령과 브랜치 정책을 다시 복사하지 않아야 한쪽만 고친 날에도 규칙이 갈라지지 않습니다.

```markdown
# 프로젝트 Agent Bootstrap

작업 시작 전에 `CLAUDE.md`를 끝까지 읽는다.
규칙의 정본은 `CLAUDE.md`다.
이 파일에는 규칙을 복사하지 않는다.
```

공개 시작 파일은 [eddmpython Agent Template](https://github.com/eddmpython/eddmpython/tree/main/blog/posts/001-ai-needs-an-environment/agent-template)에 있으며, 템플릿의 자리표시자는 저장소에서 확인한 값으로 바꾸고 해당하지 않는 항목은 지웁니다. 문서를 채웠다면 적어 둔 명령이 실제로 도는지 증명할 차례입니다.

## 명령과 완료 증거

### 테스트 종료 코드와 실제 제품 화면을 함께 봐야 작업 완료를 말할 수 있습니다

![다섯 저장소의 설정 파일과 서로 다른 전체 검사 명령 및 완료 증거가 한 줄씩 연결된 비교 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/399fba52cdd484055106cfa88c8685f42755cdf44fc6783b96b3364b49f55427.png "언어 이름이 아니라 각 저장소가 가진 러너와 제품 표면이 검증 방법을 결정합니다")

이 글도 빌드가 통과한 뒤 모바일 화면에서 실패했습니다. 첫 발행본의 가장 긴 문단은 727자였고, 데스크톱에서는 버틸 만했지만 모바일에서는 글자 벽으로 보였습니다. 빌드는 통과했습니다. 모바일 화면을 직접 연 뒤에야 문제를 찾았고 문단을 384자 아래로 줄였습니다. 그래서 환경 문서에는 `npm test` 같은 명령뿐 아니라 화면, API 응답, 생성 파일처럼 제품에 맞는 완료 증거도 적어야 합니다.

#### 설명 목록: 변경 종류에 맞는 마지막 확인

| 바꾼 것 | 가장 작은 검사 | 마지막에 볼 것 |
|---|---|---|
| 계산 함수 | 해당 단위 테스트 | 실제 입력과 출력값 |
| API | 계약 테스트 | 안전한 실제 요청의 상태와 응답 |
| 웹 화면 | 타입과 빌드 | 데스크톱과 모바일 렌더 |
| 파일 생성 | 생성기 테스트 | 파일 위치와 현재 실행에서 나온 내용 |

명령을 찾았다고 전부 실행할 권한이 생기지는 않으며, 배포와 외부 서비스 변경과 비밀정보 접근은 실패했을 때 영향이 다르므로 멈출 조건을 따로 적습니다.

## 멈출 조건과 보고

### 실행하지 못한 검사와 권한 밖 작업을 따로 적어야 실패가 완료로 둔갑하지 않습니다

![깨끗하지 않은 작업 트리와 없는 도구 및 비밀값과 배포 버튼 앞에서 멈춤 표시가 갈라지는 안전 경계](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/22/224f77ce7c9528b75c42653dfc4bcaf96ff50057765096fdb5db81ce568767a0.png "실패 종류마다 되돌리기와 보고 방법이 다르므로 한 줄의 성공 상태로 합치지 않습니다")

`npm test`를 못 돌렸다면 완료가 아닙니다. 테스트 도구가 없으면 다른 명령으로 통과한 척하지 않고, 실행하지 못한 이유와 저장소에서 찾은 설치 안내를 남깁니다. 작업 트리에 관련 없는 수정이 있으면 보존하고, 요청 파일과 겹칠 때만 정확한 경로를 알려야 합니다. 배포 명령과 비밀값 위치를 찾았다는 사실도 실행 권한과는 다릅니다.

#### 실패 예시: 검증 도구가 없어 전체 검사를 못 돌린 보고

아래 보고는 확인한 근거와 통과한 검사와 미확인 항목을 섞지 않습니다. 다음 사람이 같은 저장소를 열었을 때 어디서 이어야 하는지 알 수 있어야 실패 보고가 쓸모를 가집니다.

```text
변경 파일
- AGENTS.md
- CLAUDE.md

확인한 근거
- package.json과 CI에서 npm 사용을 확인함

통과한 검사
- 자리표시자 검색 결과 0건

미확인 항목
- 의존성이 없어 npm test를 실행하지 못함
- 설치 근거는 README의 개발 환경 절에서 확인함
```

문서와 보고 형식이 생겼다면 새 대화를 열 차례입니다.

## 새 대화에서 같은 행동 확인

### 앞 대화의 기억이 없어도 같은 지시와 명령을 찾으면 환경 구성이 끝납니다

![새 대화가 AGENTS.md와 CLAUDE.md를 읽고 작은 검사와 제품 증거 및 완료 보고까지 재현하는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e7/e73d4c46c9f28f6baeb7f7ea09433ca25fe59858416f9280899289784c47d09e.png "처음 작성한 대화가 아니라 아무 설명이 없는 다음 대화에서 같은 판단이 나오는지 확인합니다")

문서를 쓴 대화는 방금 읽은 설정과 명령을 기억합니다. `AGENTS.md`가 비어 있어도 그 대화만큼은 맞는 명령을 고를 수 있습니다. 새 대화를 열고 “현재 저장소에서 가장 작은 검사를 찾아 실행해 줘”라고만 요청해 봅니다. AI가 기존 변경을 보존하고, 지침 파일을 읽고, 저장소에 적힌 실행 위치에서 같은 검사를 고르는지 확인합니다.

#### 실행 명령: 남은 자리표시자 찾기

새 대화를 열기 전에 템플릿 값이 남았는지 확인합니다. 아무 줄도 나오지 않아야 통과입니다. `rg` 자체가 실패한 경우와 검색 결과가 0건인 경우를 구분하고, 이 검사 뒤에는 저장소의 실제 테스트를 별도로 실행합니다.

```powershell
rg -n "\{\{[A-Z_]+\}\}" AGENTS.md CLAUDE.md
```

새 대화의 보고에서는 네 가지만 봅니다. 어떤 파일을 읽었는지, 명령의 근거가 어디였는지, 실제로 통과한 검사가 무엇인지, 아직 확인하지 못한 항목이 무엇인지입니다. `AGENTS.md`와 테스트 명령이 새 대화에서도 같게 읽히면 AI 코딩 환경 구성이 다음 작업에도 남습니다.
