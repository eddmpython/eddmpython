---
title: AI 코딩 처음 시작하기, 프로젝트 설명 파일 만드는 방법
slug: ai-environment
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 도구를 처음 열면 프로젝트 폴더, README, AGENTS.md 같은 이름부터 낯설게 보입니다. 각 이름의 뜻을 먼저 알아보고, AI가 프로젝트 파일을 읽어 다음 대화에서도 사용할 설명 파일을 만들게 하는 순서를 보여 줍니다.
readerQuestion: AI 코딩 도구를 처음 쓸 때 내 프로젝트와 실행 방법을 매번 다시 설명하지 않으려면 무엇을 준비해야 할까?
readerTakeaway: 프로젝트 폴더를 AI 코딩 도구로 열고 이 글 주소를 보내면 AI가 프로젝트 파일을 읽어 AGENTS.md 또는 CLAUDE.md에 작업 방법을 정리할 수 있다.
readerLevel: beginner
readerStartingPoint: AI 채팅은 써 봤거나 이름만 들어 봤지만 AI 코딩 도구, 프로젝트 폴더, 저장소, README, 터미널, AGENTS.md, CLAUDE.md의 뜻을 모른다.
primaryKeyword: AI 코딩 시작
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png
ogImageAlt: 글 주소를 받은 AI가 프로젝트 폴더를 읽고 설명 파일을 만든 뒤 실행 방법을 확인하는 흐름
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

AI에게 코딩을 맡겨 보고 싶은데 무엇부터 열어야 할까요? 화면에 저장소, README, 터미널 같은 말이 나오면 코드를 쓰기도 전에 막힐 수 있습니다.

이 글은 AI 코딩 도구를 처음 쓰는 사람을 위한 글입니다. 코드를 모르거나 README를 처음 봐도 괜찮습니다. 먼저 자주 나오는 말을 쉬운 뜻으로 알아보고, AI에게 그대로 보낼 요청문을 복사합니다.

사용자가 직접 할 일은 네 가지입니다. AI 코딩 도구를 설치하고 로그인한 뒤, 작업할 프로젝트 폴더를 열고, 아래 요청문을 보내고, AI가 만든 설명 파일을 확인합니다. 프로그램을 설치하거나 제대로 움직이는지 검사하는 명령은 AI가 프로젝트 안에서 찾아 실행합니다.

## AI 코딩을 시작하기 전에 여섯 단어만 알아두세요

![글 주소를 받은 AI가 프로젝트 폴더를 읽고 설명 파일을 만든 뒤 실행 방법을 확인하는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/a0/a0c462b2c0a8e3ae2613698435f23c9eaa57e030b10e9c4cc38fa9fcc9f1316a.png "AI가 프로젝트 파일을 읽고 설명 파일을 만든 뒤 실제 실행 방법을 확인합니다")

AI 코딩 도구는 대화만 하는 AI와 다릅니다. 사용자가 허용한 프로젝트 파일을 읽고 고칠 수 있으며, 프로그램을 실행하는 명령도 입력할 수 있습니다. Codex와 Claude Code가 이런 도구입니다. 일반 AI 채팅에 이 글 주소만 보내면 내 컴퓨터의 프로젝트 폴더까지 저절로 볼 수는 없습니다.

| 화면에 나오는 말 | 쉬운 뜻 |
|---|---|
| 프로젝트 폴더 | 프로그램을 만드는 파일을 한곳에 모아 둔 폴더 |
| 저장소 또는 repo | 프로젝트 폴더와 파일의 변경 기록을 함께 부르는 말 |
| `README.md` | 이 프로젝트가 무엇이고 어떻게 실행하는지 사람에게 알려 주는 파일 |
| 터미널 | 컴퓨터에 글자로 명령을 입력하는 창 |
| 명령어 | 설치, 실행, 검사 같은 일을 컴퓨터에 시키는 짧은 문장 |
| `AGENTS.md`, `CLAUDE.md` | 이 프로젝트에서 AI가 지켜야 할 작업 방법을 적는 글 파일 |

파일 이름 뒤의 `.md`는 메모장처럼 글을 적는 파일 형식입니다. `README.md`가 없다고 프로젝트가 고장 난 것은 아닙니다. `AGENTS.md`와 `CLAUDE.md`도 모든 프로젝트에 처음부터 있는 파일은 아닙니다.

Codex는 `AGENTS.md`에서 프로젝트 지침을 읽습니다. Claude Code는 `CLAUDE.md`를 읽습니다. Codex만 쓴다면 `AGENTS.md`부터 만들고, Claude Code만 쓴다면 `CLAUDE.md`부터 만들면 됩니다. 두 도구를 함께 쓸 때는 같은 내용을 두 번 쓰지 않고 한 파일을 다른 파일에서 불러옵니다. 자세한 읽기 방식은 [OpenAI의 AGENTS.md 안내](https://developers.openai.com/codex/guides/agents-md)와 [Claude Code의 CLAUDE.md 안내](https://code.claude.com/docs/en/memory)에서 확인할 수 있습니다.

## 프로젝트 폴더를 열고 요청문을 보냅니다

아직 AI 코딩 도구를 준비하지 않았다면 Codex나 Claude Code 가운데 하나를 골라 설치하고 로그인합니다. [Codex 시작 안내](https://developers.openai.com/codex/quickstart)와 [Claude Code 시작 안내](https://code.claude.com/docs/en/quickstart)에서 지금 쓰는 컴퓨터에 맞는 설치 방법을 볼 수 있습니다.

도구를 열면 작업 파일이 들어 있는 프로젝트 폴더를 선택하고, 도구가 그 폴더의 파일을 읽고 고칠 수 있도록 허용합니다. 이미 받은 프로젝트가 있다면 그 파일들이 들어 있는 폴더를 고릅니다. 새 프로젝트를 시작한다면 `my-first-project`처럼 이름을 붙인 빈 폴더를 하나 만들어 엽니다. 바탕 화면 전체나 사용자 폴더 전체를 선택할 필요는 없습니다.

프로젝트 폴더를 열었다면 아래 요청문을 그대로 보냅니다.

```text
나는 AI 코딩 도구를 처음 쓴다.
이 프로젝트 폴더를 살펴보고 아래 글의 순서대로 AI용 설명 파일을 만들어 줘
https://eddmpython.com/blog/ai-environment

Codex를 쓰고 있다면 AGENTS.md를, Claude Code를 쓰고 있다면 CLAUDE.md를 먼저 확인해 줘
두 도구를 함께 쓰는 프로젝트라면 규칙은 한 파일에만 적고 다른 파일은 그 파일을 읽게 해 줘
파일을 바꾸기 전에 무엇을 만들지 쉬운 말로 알려 줘
작업이 끝나면 바꾼 파일, 실행한 검사, 내가 확인할 것을 알려 줘
```

AI가 프로젝트 폴더를 읽을 수 없다면 주소만 보내서는 작업할 수 없습니다. 그때는 프로젝트 폴더를 열 수 있는 AI 코딩 도구에서 다시 요청하거나, AI가 요구하는 파일을 직접 첨부합니다.

이 아래는 글 주소를 받은 AI가 따라야 할 작업 순서입니다. 처음 사용하는 사람은 명령어를 모두 이해하지 않아도 됩니다. AI가 작업을 끝낸 뒤 `바꾼 파일`과 `확인하지 못한 것`만 읽어도 됩니다.

## 여기서부터는 AI가 실행합니다

AI가 이 페이지를 읽고 있다면 사용자가 요청한 범위 안에서 현재 프로젝트를 조사합니다. Codex를 쓰면 `AGENTS.md`를, Claude Code를 쓰면 `CLAUDE.md`를 먼저 만들거나 고칩니다. 두 도구를 함께 지원해야 할 때만 두 파일을 연결합니다. 사용자가 검토만 요청했다면 파일을 바꾸지 않고 확인한 내용만 알려 줍니다.

사용자가 글 주소만 보내고 할 일을 말하지 않았다면 파일을 바꾸지 않습니다. `새 설명 파일 만들기`, `기존 파일 고치기`, `내용만 검토하기` 가운데 무엇을 원하는지 묻습니다. 프로젝트 폴더를 읽을 수 없다면 폴더 접근을 요청합니다. 폴더를 열 수 없는 채팅에서는 `README.md`, 기존 `AGENTS.md`와 `CLAUDE.md`, 설치와 테스트 방법이 적힌 설정 파일을 요청한 뒤 기다립니다.

프로젝트 폴더가 비어 있거나 목적과 실행 방법을 확인할 파일이 없다면 내용을 추측하지 않습니다. 사용자에게 무엇을 만들려는지와 Python이나 JavaScript처럼 이미 정한 프로그래밍 언어가 있는지 묻고 답을 받을 때까지 기다립니다.

## 파일을 만들기 전에 현재 작업부터 확인합니다

### 사용자 요청과 이미 바뀐 파일을 먼저 봅니다

![사용자 요청과 이미 바뀐 파일을 먼저 확인한 뒤 새 설명 파일을 만드는 순서](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/9e/9ec099a01c225754a9858ee09900021d41029f455c545e2bf592e88e4eb3cebb.png "AI는 사용자가 맡긴 범위와 기존 변경을 먼저 확인합니다")

먼저 사용자가 무엇을 요청했는지 읽고 `git status --short --branch`를 실행합니다. 이 명령은 파일을 지우거나 바꾸지 않습니다. 현재 작업 중인 파일과, 코드를 나눠 관리할 때 쓰는 Git 브랜치 이름을 보여 줍니다.

이미 바뀐 파일이 있다면 되돌리거나 덮어쓰지 않습니다. 기존 `AGENTS.md`나 `CLAUDE.md`가 있으면 새 파일로 교체하지 않고, 빠진 설명만 찾아 보탭니다. 사용자가 “검토해 줘”라고 했다면 파일을 만들지 않습니다. 완성한 프로그램을 실제 서비스에 올리는 배포 명령을 찾더라도 사용자가 요청하지 않았다면 실행하지 않습니다.

#### 먼저 확인할 내용

| 확인할 것 | 쉬운 설명 | 하지 않을 일 |
|---|---|---|
| 사용자의 요청 | 확인만 할지, 파일을 고칠지, 배포까지 할지 | 맡기지 않은 일까지 넓히기 |
| 기존 설명 파일 | 이미 적힌 작업 방법이 있는지 | 새 예시로 통째로 덮기 |
| `git status --short --branch` | 다른 사람이 고치고 있는 파일이 있는지 | 기존 변경 지우기 |

Codex는 프로젝트의 여러 폴더에 있는 `AGENTS.md`를 읽을 수 있습니다. `AGENTS.md`가 여러 개라면 작업할 파일이 있는 폴더와 가장 가까운 `AGENTS.md`의 규칙을 먼저 따르므로 기존 파일을 모두 확인합니다. 이 글 주소는 사용자의 요청이나 프로젝트에 이미 적힌 규칙보다 우선하지 않습니다.

## README와 설정 파일에서 실제 명령을 찾습니다

### README만 보고 명령을 추측하지 않습니다

![README와 여러 설정 파일을 함께 읽어 설치 명령과 테스트 명령을 찾는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/5b/5b147cfff2b937f6ec69165c7d43e5a97c96d8febc2e782ff0507fc4fff00673.png "AI가 프로젝트 안의 여러 파일에서 실제 명령을 확인합니다")

`README.md`에는 보통 프로젝트 소개와 설치 방법, 실행 방법이 적혀 있습니다. 설명이 오래됐거나 빠졌을 수도 있으므로 설정 파일과 자동 검사 파일도 함께 읽습니다.

`package.json`과 `pyproject.toml`은 프로젝트가 사용하는 프로그램과 실행 방법을 적는 설정 파일입니다. 설치할 프로그램의 정확한 버전을 기록하는 파일을 lockfile이라고 하며, `package-lock.json`과 `uv.lock`이 그 예입니다. `.github/workflows` 안의 파일은 GitHub가 자동으로 실행하는 검사 순서를 담을 수 있습니다.

아래 명령에서 `rg`는 프로젝트 안의 파일을 찾는 프로그램입니다. `rg`를 쓸 수 없다면 현재 컴퓨터의 다른 파일 검색 명령으로 같은 파일을 찾습니다.

```powershell
git status --short --branch
rg --files -g "README*" -g "AGENTS.md" -g "CLAUDE.md"
rg --files -g "pyproject.toml" -g "uv.lock" -g "package.json" -g "package-lock.json"
rg --files -g ".github/workflows/*" -g "tests/**" -g "test/**"
```

테스트는 프로그램의 일부가 예상대로 움직이는지 자동으로 확인하는 작업입니다. 빌드는 프로그램을 만드는 원본 파일을 실제 실행하거나 서비스에 올릴 수 있는 파일로 바꾸는 작업입니다.

찾은 파일에서 설치, 프로그램 실행, 가장 작은 테스트, 전체 테스트, 빌드 명령을 확인합니다. 명령을 어느 폴더에서 실행해야 하는지도 함께 적습니다. README와 자동 검사 파일에 적힌 명령이 다르면 어느 쪽을 실제로 확인했는지 설명합니다. 비밀번호나 서비스 접속 정보를 담을 수 있는 `.env` 파일에서는 항목 이름만 확인하고 값은 출력하지 않습니다.

## 필요한 설명 파일만 만들고 규칙은 한곳에 적습니다

![AGENTS.md와 CLAUDE.md 가운데 한 파일에 규칙을 적고 다른 파일이 그 규칙을 읽는 구조](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f3/f3e10a5d91b6ab8315e0cf92c2221462ebc8c81bf2e4b04e5018da6eca3f7bb1.png "같은 작업 방법을 두 파일에 복사하지 않습니다")

사용자가 Codex만 쓴다면 `AGENTS.md`에 확인한 명령과 수정하면 안 되는 파일을 적습니다. Claude Code만 쓴다면 `CLAUDE.md`에 적습니다. 쓰지 않는 도구의 파일까지 만들 필요는 없습니다.

두 도구를 함께 쓴다면 기존 프로젝트의 방식을 먼저 따릅니다. 두 파일이 모두 없다면 `AGENTS.md`에 공통 규칙을 적고, `CLAUDE.md`에서 그 파일을 불러오는 구성이 간단합니다.

#### 예시: CLAUDE.md가 AGENTS.md를 읽게 만들기

```markdown
@AGENTS.md
```

기존 프로젝트가 `CLAUDE.md`에 규칙을 모아 두었다면 그 규칙을 `AGENTS.md`로 옮기지 않습니다. `AGENTS.md`에는 아래처럼 `CLAUDE.md`를 먼저 읽으라고 적을 수 있습니다.

```markdown
# 프로젝트 설명

작업을 시작하기 전에 `CLAUDE.md`를 끝까지 읽는다.
공통 작업 방법은 `CLAUDE.md`에만 적는다.
```

설명 파일에는 프로젝트의 목적, 설치와 실행 명령, 테스트와 빌드 명령, 수정하면 안 되는 파일, 비밀정보를 다루는 방법, 작업을 마친 뒤 확인할 내용을 적습니다. “알아서 잘 테스트한다”처럼 확인할 수 없는 말은 쓰지 않습니다. `npm test`처럼 실제로 찾은 명령과 실행할 폴더를 적습니다.

현재 프로젝트에 맞게 바꿔 쓸 예시는 [eddmpython Agent Template](https://github.com/eddmpython/eddmpython/tree/main/blog/posts/001-ai-needs-an-environment/agent-template)에 있습니다. 예시를 그대로 복사하지 말고 현재 프로젝트에서 확인한 값만 남깁니다.

## 명령을 적은 뒤 직접 실행합니다

![설치와 실행 및 테스트 명령을 하나씩 실행하고 결과를 확인하는 장면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/39/399fba52cdd484055106cfa88c8685f42755cdf44fc6783b96b3364b49f55427.png "설명 파일에 적은 명령이 실제로 동작하는지 하나씩 확인합니다")

설명 파일에 명령을 적었다면 같은 폴더에서 직접 실행합니다. 개발 서버는 완성 중인 화면을 내 컴퓨터에서 미리 여는 프로그램입니다.

#### 적은 명령을 확인하는 방법

| 설명 파일에 적은 것 | AI가 실행할 것 | 사용자에게 알려 줄 결과 |
|---|---|---|
| 설치 명령 | 문서에 적은 폴더에서 설치 | 어떤 설치 도구를 썼고 성공했는지 |
| 프로그램 실행 | 개발 서버나 프로그램 열기 | 열린 주소나 프로그램 이름 |
| 작은 테스트 | 가장 좁은 테스트 실행 | 통과 여부와 실패한 항목 |
| 전체 테스트 | 프로젝트의 자동 검사 파일에 적힌 명령 실행 | 통과 여부와 실패한 항목 |
| 빌드 | 배포 전에 쓰는 명령 실행 | 성공 여부와 만들어진 폴더 |

웹사이트라면 개발 서버 주소를 브라우저로 열어 첫 화면이 보이는지도 확인합니다. 명령이 실패하면 성공했다고 적지 않습니다. 실행한 명령, 실행한 폴더, 나온 오류를 함께 남깁니다.

## 실행하지 못한 검사는 그대로 적습니다

### 실패한 이유와 아직 확인하지 못한 일을 나눠 적습니다

![기존 변경, 없는 도구, 비밀정보, 배포 권한 때문에 멈춘 작업을 따로 알려 주는 그림](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/22/224f77ce7c9528b75c42653dfc4bcaf96ff50057765096fdb5db81ce568767a0.png "실행하지 못한 일은 이유와 함께 따로 보고합니다")

필요한 프로그램이 설치되지 않아 테스트를 실행하지 못했다면 통과했다고 말하면 안 됩니다. 왜 실행하지 못했는지와 README에서 찾은 설치 방법을 알려 줍니다. 비밀번호나 인증 정보가 필요한 작업은 값을 추측하지 않고 사용자에게 필요한 항목의 이름만 요청합니다.

#### 작업을 마친 뒤 사용자에게 보낼 보고 예시

```text
바꾼 파일
- AGENTS.md

확인한 파일
- README.md
- package.json
- GitHub 자동 검사 파일

통과한 검사
- npm test

확인하지 못한 것
- 배포 권한이 없어 실제 배포는 실행하지 않음

사용자가 확인할 것
- AGENTS.md에 적힌 실행 폴더와 명령이 맞는지 확인
```

## 사람은 새 대화에서 다시 확인합니다

### 이전 대화가 없어도 같은 설명 파일을 읽어야 합니다

![새 대화의 AI가 프로젝트 설명 파일을 읽고 같은 테스트를 실행하는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/e7/e73d4c46c9f28f6baeb7f7ea09433ca25fe59858416f9280899289784c47d09e.png "새 대화에서도 같은 작업 방법을 찾는지 확인합니다")

설명 파일을 만든 대화에는 AI가 방금 읽은 파일과 명령이 남아 있습니다. 설명 파일에 필요한 명령이 빠져 있어도 그 대화에서는 AI가 방금 읽은 내용을 기억해 맞는 답을 할 수 있습니다. 그래서 새 대화에서 한 번 더 확인해야 합니다.

새 대화를 열고 아래처럼 요청합니다.

```text
이 프로젝트에서 가장 작은 테스트를 찾아 실행해 줘
어떤 설명 파일과 README를 읽었는지, 어떤 폴더에서 무슨 명령을 실행했는지도 알려 줘
```

AI가 `AGENTS.md`나 `CLAUDE.md`를 읽고, 이전과 같은 폴더에서 같은 테스트를 골랐다면 설명 파일이 작동합니다. 다른 명령을 골랐다면 새 대화에서 AI가 읽은 파일과 명령의 근거를 확인하고 설명 파일을 고칩니다.

새 대화에서도 같은 설명 파일을 읽고 같은 명령을 찾았다면 AI 코딩을 시작할 준비가 끝났습니다.
