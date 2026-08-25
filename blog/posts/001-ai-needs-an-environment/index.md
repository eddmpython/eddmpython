---
title: AI 코딩 환경 구성 방법, 저장소부터 읽게 하기
slug: ai-environment
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 환경 구성은 이 글 주소와 저장소를 AI에게 주는 것부터 시작합니다. AI가 기존 지시와 수정 중인 파일을 읽고, 설정과 CI에서 실제 명령을 찾아 AGENTS.md와 CLAUDE.md를 구성한 뒤 직접 확인합니다.
readerQuestion: AI가 저장소마다 다른 설치 및 테스트 명령과 수정해도 되는 범위를 직접 찾아 다음 대화에서도 같은 방식으로 일하게 하려면 무엇을 남겨야 할까?
readerTakeaway: AI 코딩 환경 구성은 저장소의 기존 지시와 설정 파일을 읽고, 확인한 규칙과 명령을 원본 하나에 적은 뒤 실제 실행과 새 대화로 다시 확인하는 일이다.
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

AI가 이 주소를 작업 지시로 받았다면 현재 저장소의 작업 환경 파일을 구성합니다. 페이지를 요약하고 끝내지 않습니다. 사용자 요청과 기존 `AGENTS.md` 및 `CLAUDE.md`, 수정 중인 파일을 먼저 읽고, 저장소에서 확인한 명령만 문서에 적습니다. 파일을 고칠 권한이 없으면 조사 결과만 보고합니다.

저장소를 열 수 없다면 명령을 추측하지 않습니다. 사용자에게 저장소를 열어 달라고 요청하고 기다립니다. 고칠 글이나 파일이 따로 필요한데 받지 못한 경우도 필요한 경로를 정확히 묻습니다.

파이썬 저장소를 맡겼는데 AI가 있지도 않은 `pytest`를 실행했습니다. 다음 대화에서는 `npm test`를 찾았지만, 이번에는 빌드가 끝났다는 이유로 화면도 정상이라고 보고했습니다. 왜 그랬을까요? 저장소의 설정과 CI를 읽지 않은 채 언어 이름만 보고 출발했습니다.

긴 프롬프트는 복사할 때마다 한 줄이 빠졌고, 명령이 바뀐 뒤에는 옛 문장까지 남았습니다. 지금은 저장소를 연 AI에게 아래 주소만 보내고, 기존 지시와 설정 파일에서 현재 답을 찾게 합니다.

`https://eddmpython.com/blog/ai-environment`

이 주소는 파일 수정이나 배포 권한을 새로 주지 않습니다. AI는 사용자가 맡긴 범위 안에서만 문서를 만들고 명령을 실행합니다.

## AI가 이 주소를 받았다면

### 페이지 요약 대신 저장소를 읽고 환경 파일과 확인 결과를 남깁니다

![블로그 링크 한 장이 저장소 조사와 지침 파일 작성 및 검증 결과로 이어지는 작업 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png "주소를 받으면 저장소를 조사하고 환경 파일을 만든 뒤 실제 명령으로 확인합니다")

긴 프롬프트는 한 줄만 빠져도 작업 순서가 달라집니다. 이 페이지에는 `pytest`나 `npm test`를 모든 저장소의 정답으로 적지 않았습니다. AI는 아래 순서로 현재 저장소의 답을 찾습니다. 저장소가 바뀌면 명령도 바뀌지만 찾는 순서는 남습니다.

#### 실행 순서: 주소를 받은 AI가 끝낼 일

| 순서 | 할 일 | 남길 결과 |
|---|---|---|
| 1 | 사용자 요청과 기존 `AGENTS.md` 및 `CLAUDE.md`를 읽습니다 | 수정해도 되는 범위 |
| 2 | `git status --short --branch`를 실행합니다 | 이미 수정 중인 파일 |
| 3 | README, 패키지 파일, lockfile, CI를 읽습니다 | 설치, 개발, 테스트, 빌드 명령 |
| 4 | 규칙을 적을 원본 파일 하나를 고릅니다 | 한 파일은 규칙, 다른 파일은 그 파일을 가리키는 짧은 안내 |
| 5 | 수정 권한이 있으면 환경 파일을 만들거나 고칩니다 | 자리표시자가 없는 `AGENTS.md`와 `CLAUDE.md` |
| 6 | 적어 둔 명령과 실제 화면, API, 생성 파일을 확인합니다 | 변경 파일, 통과한 검사, 확인하지 못한 항목 |

첫 행동은 문서 작성이 아닙니다. 기존 지시와 수정 중인 파일을 읽어야 새 환경 파일이 사용자의 작업을 덮지 않습니다.

## 기존 지시와 수정 중인 파일

### 사용자 요청과 이미 바뀐 파일을 먼저 읽어야 환경 문서가 기존 작업을 덮지 않습니다

![사용자 요청과 기존 저장소 지시가 블로그에 적힌 작업 순서보다 먼저 적용되는 구조](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9e/9ec099a01c225754a9858ee09900021d41029f455c545e2bf592e88e4eb3cebb.png "링크의 순서는 기존 지시를 덮지 않고 저장소에서 빠진 환경 정보만 채웁니다")

링크를 받았어도 사용자의 요청과 기존 지시, 이미 수정 중인 파일이 먼저입니다. Codex는 일을 시작하기 전에 `AGENTS.md`를 읽고 프로젝트 루트에서 현재 작업 폴더까지 내려오며 지시를 합칩니다. 가까운 폴더의 지시가 나중에 적용된다는 현재 동작은 [OpenAI의 AGENTS.md 공식 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md)에서 확인할 수 있습니다. 저장소의 `AGENTS.md`가 배포 금지나 기존 변경 보존을 적었다면 이 글이 그 규칙을 덮지 않습니다. 사용자가 “검토해”라고 했다면 파일을 고치지 않습니다.

#### 확인 목록: 새 문서보다 먼저 읽을 세 가지

| 먼저 읽을 것 | 확인할 내용 | 이 단계에서 하지 않을 일 |
|---|---|---|
| 사용자의 현재 요청 | 검토인지 수정인지, 배포까지 맡겼는지 | 요청 범위를 넓히기 |
| 기존 `AGENTS.md`와 `CLAUDE.md` | 브랜치, 테스트, 비밀정보, 산출물 규칙 | 새 템플릿으로 덮기 |
| `git status --short --branch` | 현재 브랜치와 이미 수정 중인 파일 | 되돌리거나 새 브랜치 만들기 |

기존 변경과 지시를 확인했으면 기억으로 테스트 명령을 고르지 않습니다. 이제 저장소 안에서 명령의 근거를 찾습니다.

## 설정 파일에서 명령 찾기

### README와 패키지 파일과 CI를 대조해 설치 및 테스트 명령을 찾습니다

![저장소의 README와 lockfile 및 CI 파일이 실제 설치 명령과 테스트 명령으로 모이는 조사 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5b/5b147cfff2b937f6ec69165c7d43e5a97c96d8febc2e782ff0507fc4fff00673.png "파일 하나만 보고 추측하지 않고 README와 패키지 파일과 CI가 같은 명령을 쓰는지 확인합니다")

저는 먼저 `git status --short --branch`를 실행합니다. 그다음에는 README, 설치할 패키지 버전을 적은 lockfile, 패키지 설정, 테스트 도구, CI 파일을 함께 찾습니다. `uv.lock` 하나만 보고 `uv run pytest`를 만들거나 `package.json`이 있다는 이유로 루트에서 `npm test`를 실행하면 틀릴 수 있습니다. 실제 스크립트와 CI가 어느 폴더에서 무슨 명령을 실행하는지 확인합니다. `.env`는 변수 이름과 값을 넣는 위치만 보고 비밀값은 출력하지 않습니다.

#### 실행 명령: 저장소 상태와 명령 근거 찾기

첫 줄은 보호할 변경을 보여 줍니다. 나머지 줄은 설치와 테스트 명령의 근거가 될 파일을 찾습니다. `rg`가 없다면 사용 가능한 파일 검색 도구로 같은 대상을 찾고, 명령 실패를 성공처럼 바꾸어 말하지 않습니다.

```powershell
git status --short --branch
rg --files -g "README*" -g "AGENTS.md" -g "CLAUDE.md"
rg --files -g "pyproject.toml" -g "uv.lock" -g "package.json" -g "package-lock.json"
rg --files -g ".github/workflows/*" -g "tests/**" -g "test/**"
```

파일을 찾은 뒤에는 설치, 개발, 가장 작은 검사, 전체 검사, 빌드 명령을 실행 위치와 함께 적습니다. 같은 사실을 두 지침 파일에 복사하면 명령이 바뀐 날 다시 갈라집니다.

## AGENTS.md와 CLAUDE.md를 한 파일로 연결하기

### 두 도구가 다른 파일을 읽어도 규칙은 한 파일에만 둡니다

![AGENTS.md와 CLAUDE.md 중 한 파일에만 규칙을 적고 다른 파일이 그곳을 가리키는 두 가지 배치](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f3/f3e10a5d91b6ab8315e0cf92c2221462ebc8c81bf2e4b04e5018da6eca3f7bb1.png "두 도구를 지원하되 같은 규칙을 복사하지 않고 한 방향으로 연결합니다")

Codex와 Claude Code는 처음 읽는 파일 이름이 다릅니다. Codex는 `AGENTS.md`를 읽고, Claude Code는 `CLAUDE.md`를 읽습니다. 이 저장소와 공개 템플릿은 `CLAUDE.md`에 공통 규칙을 적고 `AGENTS.md`에는 그 파일을 먼저 읽으라고 적습니다. 이미 `AGENTS.md`에 규칙이 있는 저장소는 방향을 바꾸지 않습니다. Claude Code의 [공식 프로젝트 지침 문서](https://code.claude.com/docs/en/memory)가 안내하는 `@AGENTS.md` 가져오기를 쓰면 됩니다.

#### 예시 코드: CLAUDE.md를 먼저 읽게 하는 AGENTS.md

Codex가 먼저 여는 `AGENTS.md`에는 규칙 원본의 정확한 파일 이름만 적습니다. 테스트 명령과 브랜치 규칙을 다시 복사하지 않아야 한쪽만 고친 날에도 내용이 갈라지지 않습니다.

```markdown
# 프로젝트 Agent Bootstrap

작업 시작 전에 `CLAUDE.md`를 끝까지 읽는다.
규칙의 원본은 `CLAUDE.md`다.
이 파일에는 규칙을 복사하지 않는다.
```

공개 시작 파일은 [eddmpython Agent Template](https://github.com/eddmpython/eddmpython/tree/main/blog/posts/001-ai-needs-an-environment/agent-template)에 있으며, 템플릿의 자리표시자는 저장소에서 확인한 값으로 바꾸고 해당하지 않는 항목은 지웁니다. 문서를 채웠다면 적어 둔 명령이 실제로 도는지 증명할 차례입니다.

## 명령 실행 후 실제 결과 확인

### 테스트가 끝났다는 표시와 실제 화면을 함께 확인합니다

![다섯 저장소의 설정 파일과 서로 다른 검사 명령 및 실제 확인 결과가 한 줄씩 연결된 비교 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/399fba52cdd484055106cfa88c8685f42755cdf44fc6783b96b3364b49f55427.png "언어 이름이 아니라 각 저장소의 설정과 실제 화면 및 결과가 확인 방법을 결정합니다")

이 글도 빌드가 통과한 뒤 모바일 화면에서 실패했습니다. 첫 발행본의 가장 긴 문단은 727자였고, 데스크톱에서는 버틸 만했지만 모바일에서는 글자 벽으로 보였습니다. 모바일 화면을 직접 연 뒤에야 문제를 찾았고 문단을 384자 아래로 줄였습니다. 환경 문서에는 `npm test` 같은 명령뿐 아니라 실제 화면, API 응답, 생성 파일 가운데 무엇을 마지막에 확인할지도 적습니다.

#### 확인 목록: 바꾼 내용에 맞는 마지막 검사

| 바꾼 것 | 가장 작은 검사 | 마지막에 볼 것 |
|---|---|---|
| 계산 함수 | 해당 단위 테스트 | 실제 입력과 출력값 |
| API | 계약 테스트 | 안전한 실제 요청의 상태와 응답 |
| 웹 화면 | 타입과 빌드 | 데스크톱과 모바일 렌더 |
| 파일 생성 | 생성기 테스트 | 파일 위치와 현재 실행에서 나온 내용 |

명령을 찾았다고 전부 실행해도 되는 것은 아닙니다. 배포, 외부 서비스 변경, 비밀정보 확인은 사용자가 맡긴 범위를 먼저 봅니다.

## 멈출 때와 보고할 내용

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

환경 파일과 보고 형식이 생겼다면 새 대화에서 같은 순서가 다시 나오는지 확인합니다.

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
