---
title: AI 코딩 환경 만드는 방법, AGENTS.md와 CLAUDE.md 설정하기
slug: ai-environment
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 환경은 AGENTS.md와 CLAUDE.md부터 준비하면 됩니다. AI가 저장소의 README와 설정 파일에서 실제 명령을 찾고, 두 파일에 작업 방법을 적은 뒤 새 대화에서 다시 확인하는 순서를 설명합니다.
readerQuestion: AI가 저장소마다 다른 설치 및 테스트 명령을 직접 찾고 다음 작업에서도 같은 방식으로 일하게 하려면 무엇을 준비해야 할까?
readerTakeaway: AI 코딩 환경은 현재 저장소에서 확인한 명령과 작업 범위를 AGENTS.md와 CLAUDE.md에 적고 직접 실행해 보면 만들 수 있다.
readerLevel: working
readerStartingPoint: AI 코딩 도구로 저장소를 열 수 있지만 AGENTS.md와 CLAUDE.md에 무엇을 적어야 하는지 모르고 매번 설치 및 테스트 명령을 다시 설명하고 있다.
primaryKeyword: AI 코딩 환경
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png
ogImageAlt: 블로그 링크 한 장이 저장소 조사와 지침 파일 작성 및 검증 결과로 이어지는 작업 흐름
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

AI에게 코딩 환경을 만들어 주려면 무엇부터 해야 할까요? 요즘에는 `AGENTS.md`, `CLAUDE.md`, MCP, 스킬까지 방법이 너무 많아서 무엇부터 시작해야 할지 헷갈립니다.

AI 코딩 도구로 새 저장소를 열 때마다 사용자는 설치 명령과 테스트 명령, 손대면 안 되는 파일을 다시 설명해야 합니다. 이 정보가 없으면 AI는 언어 이름만 보고 저장소에 없는 명령을 고를 수도 있습니다.

MCP나 스킬을 추가하기 전에는 `AGENTS.md`와 `CLAUDE.md`에 넣을 내용부터 준비합니다. README와 설정 파일에서 확인한 실제 명령과 손대면 안 되는 파일은 두 파일 중 규칙 원본으로 쓸 파일에 적습니다. 적은 명령은 실제로 실행되는지도 확인하고, 웹 작업은 화면까지 열어 봅니다.

## AI 코딩 환경은 두 파일부터 시작합니다

### 설치 및 테스트 명령과 손대면 안 되는 파일을 적습니다

![블로그 링크 한 장이 저장소 조사와 지침 파일 작성 및 검증 결과로 이어지는 작업 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png "주소를 받으면 저장소를 조사하고 환경 파일을 만든 뒤 실제 명령으로 확인합니다")

`AGENTS.md`와 `CLAUDE.md`를 함께 두되, 저장소 규칙은 원본으로 정한 한 파일에만 적습니다. 다른 파일에는 원본을 먼저 읽으라고 씁니다. 설치 명령, 개발 서버를 여는 명령, 테스트와 빌드 명령, 수정하면 안 되는 파일이 규칙 원본에 들어갑니다. MCP는 AI와 저장소 밖의 도구를 연결하고, 스킬은 반복 작업의 순서를 적어 둡니다.

#### 목록: 규칙 원본에 적을 내용

| 구분 | 적을 내용 | 확인할 파일 |
|---|---|---|
| 설치 | 패키지를 설치하는 명령과 실행 폴더 | README, lockfile |
| 실행 | 개발 서버나 프로그램을 여는 명령 | README, 패키지 설정 |
| 검사 | 가장 작은 테스트, 전체 테스트, 빌드 명령 | 테스트 설정, CI |
| 작업 범위 | 수정하면 안 되는 파일, 비밀정보, 배포 조건 | 기존 지침, `.gitignore`, 배포 문서 |
| 완료 확인 | 화면, API 응답, 생성 파일 중 마지막에 볼 것 | 제품 코드와 운영 문서 |

이 항목을 저장소에서 확인해 규칙 원본에 적게 하려면, 다음 요청과 이 글 주소를 AI에게 보냅니다.

### AI에게 이 글 주소를 보낼 때

저장소 파일을 읽을 수 있는 AI 코딩 도구에는 아래 주소와 함께 `AGENTS.md`와 `CLAUDE.md`를 만들어 달라는 요청을 보냅니다. 저장소를 볼 수 없는 채팅이라면 실제 명령을 찾을 수 없으므로 작업할 저장소나 필요한 파일도 함께 보내야 합니다.

#### 입력 예시: 저장소를 연 AI에게 보낼 요청

```text
이 저장소에 AGENTS.md와 CLAUDE.md를 만들어 줘.
작업 방법은 https://eddmpython.com/blog/ai-environment 를 따라 줘.
```

## 여기서부터는 AI가 실행합니다

AI가 이 페이지를 읽고 있다면 사용자의 요청과 현재 저장소의 기존 지침부터 읽습니다. 아래 순서에 따라 두 파일을 만들거나 고치되, 사용자가 검토만 요청했다면 파일을 바꾸지 않고 확인한 내용만 알려 줍니다.

## 파일을 만들기 전에 현재 작업부터 확인합니다

### 사용자 요청과 이미 수정된 파일을 먼저 읽습니다

![사용자 요청과 기존 저장소 지시가 블로그에 적힌 작업 순서보다 먼저 적용되는 구조](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9e/9ec099a01c225754a9858ee09900021d41029f455c545e2bf592e88e4eb3cebb.png "링크의 순서는 기존 지시를 덮지 않고 저장소에서 빠진 환경 정보만 채웁니다")

먼저 사용자가 무엇을 요청했는지 읽고 `git status --short --branch`를 실행합니다. 사용자가 “검토해”라고 했다면 파일을 만들지 않습니다. 이미 수정 중인 파일이 있다면 되돌리거나 덮어쓰지 않습니다. 기존 `AGENTS.md`나 `CLAUDE.md`가 있으면 새 템플릿으로 바꾸지 말고, 빠진 명령과 규칙만 README, 설정 파일, CI에서 확인해 보탭니다. 배포 명령을 찾았다고 해서 배포해도 되는 것은 아닙니다. 사용자가 배포까지 요청했는지 확인하고, 비밀값과 외부 서비스는 맡긴 범위 안에서만 다룹니다.

#### 확인 목록: 새 파일보다 먼저 볼 세 가지

| 먼저 볼 것 | 확인할 내용 | 하지 않을 일 |
|---|---|---|
| 사용자의 요청 | 검토인지 수정인지, 배포까지 맡겼는지 | 요청 범위를 넓히기 |
| 기존 `AGENTS.md`와 `CLAUDE.md` | 브랜치, 테스트, 비밀정보, 산출물 규칙 | 새 템플릿으로 덮기 |
| `git status --short --branch` | 현재 브랜치와 이미 수정 중인 파일 | 다른 사람의 변경 되돌리기 |

Codex는 프로젝트 루트에서 현재 작업 폴더까지 `AGENTS.md`를 읽고 지시를 합칩니다. `AGENTS.md`의 지시가 서로 다르면 현재 작업 폴더에 더 가까운 파일의 지시가 우선합니다. 자세한 적용 순서는 [OpenAI의 AGENTS.md 공식 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md)에서 확인할 수 있습니다. 이 글 주소는 기존 지시나 사용자가 맡긴 작업 범위를 바꾸지 않습니다.

## README와 설정 파일에서 실제 명령을 찾습니다

### 파일 이름만 보고 설치 및 테스트 명령을 추측하지 않습니다

![저장소의 README와 lockfile 및 CI 파일이 실제 설치 명령과 테스트 명령으로 모이는 조사 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5b/5b147cfff2b937f6ec69165c7d43e5a97c96d8febc2e782ff0507fc4fff00673.png "파일 하나만 보고 추측하지 않고 README와 패키지 파일과 CI가 같은 명령을 쓰는지 확인합니다")

요청 범위와 보존할 변경을 확인했으면 README와 설정 파일에서 실제 명령을 찾습니다. `package.json`이 있다고 항상 저장소 루트에서 `npm test`를 실행하는 것은 아닙니다. `uv.lock`이 있어도 테스트 도구가 `pytest`라고 단정할 수 없습니다. README, 패키지 버전을 고정한 lockfile, 패키지 설정, 테스트 설정, GitHub Actions 같은 자동 검사 파일을 함께 읽고 어느 폴더에서 어떤 명령을 쓰는지 확인합니다.

#### 실행 명령: 설치와 테스트 근거가 있는 파일 찾기

첫 줄은 이미 수정된 파일을 보여 줍니다. 나머지 줄은 설치와 테스트 명령이 적힐 만한 파일을 찾습니다. `rg`가 없다면 현재 환경에서 쓸 수 있는 파일 검색 명령으로 위 목록의 파일을 찾고, 검색 명령이 실패했는지도 따로 확인합니다.

```powershell
git status --short --branch
rg --files -g "README*" -g "AGENTS.md" -g "CLAUDE.md"
rg --files -g "pyproject.toml" -g "uv.lock" -g "package.json" -g "package-lock.json"
rg --files -g ".github/workflows/*" -g "tests/**" -g "test/**"
```

찾은 파일을 열어 같은 명령과 실행 폴더를 가리키는지 대조합니다. README와 CI의 명령이 다르면 현재 CI가 실행하는 명령과 차이를 함께 적습니다. 설치, 실행, 작은 테스트, 전체 테스트, 빌드 명령은 먼저 후보로 적어 둡니다. `.env`에서는 변수 이름과 값을 넣는 위치만 확인하고 비밀번호나 토큰은 출력하지 않습니다.

## 같은 규칙을 두 파일에 복사하지 않습니다

![AGENTS.md와 CLAUDE.md 중 한 파일에만 규칙을 적고 다른 파일이 그곳을 가리키는 두 가지 배치](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f3/f3e10a5d91b6ab8315e0cf92c2221462ebc8c81bf2e4b04e5018da6eca3f7bb1.png "두 도구를 지원하되 같은 규칙을 복사하지 않고 한 방향으로 연결합니다")

이렇게 확인한 명령은 두 파일 중 한 곳에만 적습니다. 같은 테스트 명령을 두 파일에 복사하면 한쪽만 고친 날부터 내용이 달라집니다. 기존 `AGENTS.md`에 규칙이 있다면 그 파일에 테스트 명령과 작업 범위를 계속 적습니다. 두 파일이 모두 없다면 아래 예시처럼 `CLAUDE.md`에 규칙을 적고 `AGENTS.md`에는 `CLAUDE.md`를 먼저 읽으라고 씁니다.

#### 예시 코드: CLAUDE.md를 먼저 읽게 하는 AGENTS.md

아래 예시는 `CLAUDE.md`에 공통 규칙을 적은 저장소에서 씁니다. Codex가 먼저 읽는 `AGENTS.md`에는 원본 파일의 이름만 남깁니다.

```markdown
# 프로젝트 Agent Bootstrap

작업 시작 전에 `CLAUDE.md`를 끝까지 읽는다.
규칙의 원본은 `CLAUDE.md`다.
이 파일에는 규칙을 복사하지 않는다.
```

기존 저장소가 `AGENTS.md`를 원본으로 쓰고 있다면 원본을 바꾸지 않습니다. `CLAUDE.md`에서 아래처럼 `AGENTS.md`를 불러옵니다. 파일을 불러오는 방법은 Claude Code의 [프로젝트 지침 가져오기](https://code.claude.com/docs/en/memory)에서도 확인할 수 있습니다.

```markdown
# 프로젝트 Agent Bootstrap

@AGENTS.md
```

저장소에 맞게 고칠 템플릿은 [eddmpython Agent Template](https://github.com/eddmpython/eddmpython/tree/main/blog/posts/001-ai-needs-an-environment/agent-template)에 있습니다. 템플릿의 빈칸은 저장소에서 확인한 값으로 바꾸고 해당하지 않는 항목은 지웁니다.

## 명령을 적은 뒤 직접 실행합니다

![설치부터 빌드까지 다섯 명령과 각 실행 결과가 한 줄씩 연결된 확인 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/399fba52cdd484055106cfa88c8685f42755cdf44fc6783b96b3364b49f55427.png "환경 파일에 적은 명령을 하나씩 실행하고 결과를 따로 확인합니다")

문서에 `npm test`라고 적었다면 현재 저장소의 올바른 폴더에서 직접 실행해 봅니다. 개발 서버 명령을 적었다면 서버를 열고 주소가 맞는지 확인합니다. 명령이 실패하면 성공한 것처럼 쓰지 않고 오류와 실행한 폴더를 함께 남깁니다.

#### 확인 목록: 환경 파일에 적은 명령 검증

| 적은 내용 | 실행할 것 | 확인할 결과 |
|---|---|---|
| 설치 명령 | 문서에 적은 폴더에서 설치 | 사용한 패키지 도구와 설치 결과 |
| 개발 서버 | 문서에 적은 실행 명령 | 열린 주소와 첫 화면 |
| 작은 테스트 | 가장 좁은 테스트 명령 | 통과 여부와 실행 시간 |
| 전체 테스트 | CI와 같은 테스트 명령 | 통과 여부와 실패한 항목 |
| 빌드 | 배포 전에 쓰는 빌드 명령 | 종료 상태와 생성된 폴더 |

## 실행하지 못한 검사는 그대로 적습니다

### 실패 이유와 아직 확인하지 못한 항목을 따로 남깁니다

![수정 중인 작업 트리, 설치되지 않은 도구, 비밀값, 배포 단계마다 멈춤 표시가 나뉜 그림](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/22/224f77ce7c9528b75c42653dfc4bcaf96ff50057765096fdb5db81ce568767a0.png "실패 종류마다 대처와 보고 방법이 다르므로 모두 성공했다고 한 줄로 뭉뚱그리지 않습니다")

테스트 도구가 없어서 `npm test`를 실행하지 못했다면 통과했다고 말하면 안 됩니다. 실행하지 못한 이유와 README에서 찾은 설치 방법을 적습니다. 이미 수정된 파일이 이번 요청에서도 고쳐야 할 파일이라면 기존 내용을 덮어쓰지 말고 해당 파일의 경로를 사용자에게 알립니다.

#### 실패 예시: 전체 테스트를 실행하지 못한 작업 보고

아래 보고는 바꾼 파일, 확인한 근거, 통과한 검사, 아직 확인하지 못한 항목을 나눕니다. 다음 사람이 같은 저장소를 열었을 때 어디서부터 이어야 하는지 알 수 있게 파일 이름과 실행하지 못한 이유를 그대로 적습니다.

```text
변경 파일
- AGENTS.md
- CLAUDE.md

확인한 근거
- package.json과 CI에서 npm 사용을 확인함

통과한 검사
- 템플릿의 빈칸이 남지 않았는지 확인함

미확인 항목
- 의존성이 없어 npm test를 실행하지 못함
- 설치 방법은 README의 개발 환경 절에서 확인함
```

## 사람은 새 대화에서 다시 확인합니다

### 이전 대화 없이도 같은 규칙과 명령을 찾아야 합니다

![새 대화가 AGENTS.md와 CLAUDE.md를 읽고 작은 검사와 제품 증거 및 완료 보고까지 재현하는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e7/e73d4c46c9f28f6baeb7f7ea09433ca25fe59858416f9280899289784c47d09e.png "처음 작성한 대화가 아니라 아무 설명이 없는 다음 대화에서 같은 판단이 나오는지 확인합니다")

두 파일을 만들던 대화에는 방금 읽은 README와 설정 파일 내용이 남아 있습니다. 그래서 문서가 빠져 있어도 그 대화에서는 맞는 명령을 고를 수 있습니다. 파일을 만든 AI와의 대화를 마친 뒤 새 대화를 열고, 현재 저장소에서 가장 작은 테스트를 찾아 실행해 달라고 요청합니다. AI가 기존 변경을 보존하고 두 지침 파일을 읽은 뒤 같은 폴더에서 같은 명령을 고르는지 확인합니다.

#### 확인 목록: 새 대화에서 볼 여섯 가지

- 어떤 `AGENTS.md`와 `CLAUDE.md`를 읽었는가
- 요청한 작업 범위를 어떻게 판단했는가
- 실행 전후 `git status`에서 기존 변경이 그대로 남아 있는가
- 설치 및 테스트 명령을 어느 파일에서 찾았는가
- 실제로 통과한 검사는 무엇인가
- 아직 실행하지 못했거나 확인하지 못한 것은 무엇인가

새 대화에서도 AI가 두 지침 파일을 읽고 올바른 폴더에서 앞서 확인한 명령을 골랐다면 두 파일이 제대로 작동합니다. 외부 서비스가 필요한 작업에서만 MCP를 연결하고, 같은 작업 순서를 여러 저장소에서 반복할 때 스킬을 추가하면 됩니다.
