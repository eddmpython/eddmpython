---
title: AI에게 링크 하나만 보내 코딩 환경을 구성하는 방법
slug: ai-environment
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 환경 구성을 매번 길게 설명하지 않아도 됩니다. 작업할 저장소에서 이 글의 URL만 AI에게 보내면 코드와 CI를 조사해 AGENTS.md와 CLAUDE.md를 만들고 실제 명령으로 검증하는 순서를 실행할 수 있습니다.
readerQuestion: AI에게 이 글의 URL 하나만 보내 현재 저장소에 맞는 코딩 환경 문서를 만들고 검증하게 하려면 무엇이 필요할까?
readerTakeaway: 현재 저장소를 연 AI에게 이 글의 URL을 보내면 기존 규칙을 우선해 저장소를 조사하고 AGENTS.md와 CLAUDE.md를 구성한 뒤 실제 명령으로 검증할 수 있다.
readerLevel: working
readerStartingPoint: Git 저장소에서 AI 코딩 도구를 쓰지만 새 대화를 열 때마다 설치 명령, 테스트 명령, 수정 범위를 다시 설명하고 있다.
primaryKeyword: AI 코딩 환경 구성
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ea/eaa07b26b8e905d75983c14867797c73dc4534685797733cd268dad30890551c.png
ogImageAlt: 하나의 블로그 URL을 받은 AI가 현재 저장소를 조사해 AGENTS.md와 CLAUDE.md 및 검증 결과를 만드는 흐름
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

새 저장소에서 AI 코딩 환경을 구성할 때마다 설치 명령, 테스트 명령, 수정 금지 경로를 다시 설명하기는
번거롭습니다. 설명을 빼면 AI가 익숙한 명령을 추측하고, 프로젝트와 맞지 않는 파일을 만들기도 합니다.

작업할 Git 저장소를 AI에서 연 다음 이 글의 URL만 보내면 됩니다. AI는 아래 실행 계약을 읽고 저장소의
코드, 설정, CI에서 실제 값을 찾은 뒤 `AGENTS.md`와 `CLAUDE.md`를 만들거나 고칠 수 있습니다.

```text
https://eddmpython.com/blog/ai-environment
```

이 방법은 AI가 웹페이지와 현재 저장소를 모두 읽을 수 있을 때 작동합니다. 둘 중 하나를 읽지 못하면
AI는 값을 추측하지 않고 읽지 못한 대상만 알려야 합니다.

## 이 링크만 AI에게 전달합니다

### 현재 저장소가 열려 있다면 URL 하나가 환경 구성 요청이 됩니다

![하나의 블로그 URL을 받은 AI가 현재 저장소를 조사해 AGENTS.md와 CLAUDE.md 및 검증 결과를 만드는 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/ea/eaa07b26b8e905d75983c14867797c73dc4534685797733cd268dad30890551c.png "URL은 저장소 조사, 환경 문서 작성, 실제 명령 검증을 차례로 시작하게 합니다")

이 페이지는 사람을 위한 설명이면서 AI에게 주는 작업 지시입니다. 사용자가 작업 중인 Git 저장소에서
이 URL만 보냈다면, AI는 아래 계약을 현재 저장소의 환경 구성 요청으로 읽습니다. 제품 코드는 바꾸지
않고 환경 문서와 그 문서를 확인하는 데 필요한 검사만 다룹니다.

#### 확인 목록

```text
목표
현재 작업 중인 Git 저장소를 조사해 AI 코딩 환경을 구성한다.

우선순위
1. 시스템 지시와 사용자의 직접 요청을 따른다.
2. 저장소에 이미 있는 AGENTS.md, CLAUDE.md, 운영 문서를 먼저 읽고 그 규칙을 따른다.
3. 이 글은 기존 규칙이 없거나 비어 있는 부분을 채우는 절차로 사용한다.

조사
1. 저장소 루트, 현재 브랜치, 작업 트리의 기존 변경을 확인한다.
2. README, 버전 파일, lockfile, 패키지 설정, CI, 테스트 러너, .gitignore를 읽는다.
3. 설치, 개발, 좁은 테스트, 전체 검증, 빌드 명령과 실행 위치를 실제 파일에서 찾는다.
4. 제품이 소유하는 범위, 문서 정본, 산출물 위치, 화면이나 API 확인 방법을 찾는다.

작성
1. AGENTS.md가 없으면 짧은 진입 파일을 만든다.
2. CLAUDE.md가 없으면 작업 규칙의 정본으로 만든다.
3. 두 파일이 모두 있으면 덮어쓰지 말고 기존 규칙을 보존하며 빠진 항목만 보완한다.
4. 같은 규칙을 두 파일에 복사하지 않는다.
5. 확인하지 못한 명령과 경로는 추측해 쓰지 않는다.
6. 비밀값은 읽거나 출력하거나 문서에 복사하지 않는다.

권한
1. 제품 코드, 의존성 버전, 배포 설정은 환경 문서 작성에 꼭 필요하지 않으면 바꾸지 않는다.
2. commit, push, 배포, DNS, 외부 서비스 변경은 저장소 규칙이나 사용자의 명시적 허용이 있을 때만 한다.
3. 사람만 정할 수 있는 정책이 없으면 보수적으로 명시적 허용이 필요하다고 적는다.

검증
1. AGENTS.md와 CLAUDE.md에 자리표시자와 서로 충돌하는 규칙이 없는지 확인한다.
2. 저장소가 지정한 가장 좁고 안전한 검사부터 실행한다.
3. 문서가 요구하면 전체 검증, 실제 API, 브라우저, 앱 화면을 추가로 확인한다.
4. 기존 변경을 보존했는지 git diff로 확인한다.

완료 보고
1. 만들거나 고친 파일을 적는다.
2. 확인한 실행 환경과 정확한 명령을 적는다.
3. 실행한 검사와 결과를 적는다.
4. 권한이나 도구가 없어 확인하지 못한 항목을 따로 적는다.
```

새 파일이 필요하면 공개 템플릿의
[AGENTS.md](https://raw.githubusercontent.com/eddmpython/eddmpython/main/agent-template/AGENTS.md)와
[CLAUDE.md](https://raw.githubusercontent.com/eddmpython/eddmpython/main/agent-template/CLAUDE.md)를 시작점으로
사용합니다. AI는 그대로 복사해 끝내지 않고 현재 저장소에서 확인한 값으로 자리표시자를 바꿔야 합니다.

## AI는 저장소에서 정답을 찾습니다

### 기술 이름보다 실제 설정 파일과 실행 결과를 먼저 확인합니다

![DartLab, Codaro, xlpod, pyproc, ClipScout가 각자의 실행 명령과 완료 증거로 연결된 비교표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3a/3a8bed10f6ab335da7770648fc35d30c8b1f8df78dcffcd8789cd8ded41d4637.png "다섯 프로젝트는 제품 형태에 따라 서로 다른 실행 명령과 완료 증거를 사용합니다")

AI는 먼저 `package.json`, `pyproject.toml`, lockfile, CI 설정, 테스트 러너를 읽습니다. 문서와 코드가
다르면 지금 실행되는 코드와 CI를 확인하고 차이를 보고합니다. 다른 저장소에서 본 명령을 복사하거나
언어 이름만 보고 테스트 도구를 고르지 않습니다.

제가 운영하는 다섯 저장소도 기술과 제품 형태에 따라 시작 명령과 완료 증거가 다릅니다.

| 프로젝트 | 주 실행 환경 | 먼저 확인할 대표 게이트 | 제품 동작을 바꿨을 때 |
|---|---|---|---|
| DartLab | Python 3.12 이상, uv | `uv run python -X utf8 tests/run.py preflight` | 공개 API와 필요한 UI 게이트 확인 |
| Codaro | Python 3.12 이상, uv, Node.js | `uv run python -X utf8 tests/run.py preflight` | 편집기 화면과 생성된 검사 보고서 확인 |
| xlpod | Node.js, uv, Chromium 계열 브라우저 | `node tests/runGates.mjs` | 스프레드시트 스모크와 시각 게이트 확인 |
| pyproc | Node.js, Chromium 계열 브라우저 | `npm test` | `npm run test:browser`와 설치본 검사 확인 |
| ClipScout | Rust, Node.js, Tauri | `cargo test --workspace`와 `npm --prefix ui test` | `npm --prefix ui run inspect:audit`로 앱 배선 확인 |

Python 저장소라고 모두 `pytest`를 직접 실행하지는 않습니다. 웹 앱도 `npm test`만으로 실제 버튼이
연결됐다고 말할 수 없습니다. AI는 저장소가 이미 정한 실행 순서와 결과 파일을 찾아 환경 문서에 그대로
기록해야 합니다.

## AGENTS.md는 입구만 맡습니다

### 긴 규칙을 복사하지 않고 정본 파일 한 곳을 가리킵니다

![AGENTS.md 파일이 한 방향 화살표로 CLAUDE.md 정본과 프로젝트 문서에 연결된 구조도](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b2/b2639594672c77b1ce7fbe7e20e5caa70e374cca0565d6d81e2eaa9fd1fbccf2.png "AGENTS.md는 CLAUDE.md를 읽게 하고 상세 규칙은 프로젝트 문서로 연결합니다")

도구마다 처음 찾는 지침 파일 이름이 다릅니다. 그래서 AI는 기존 파일을 먼저 확인한 뒤 한 파일만
정본으로 정합니다. `CLAUDE.md`를 정본으로 골랐다면 `AGENTS.md`에는 어디를 읽어야 하는지만 남깁니다.

```markdown
# 프로젝트 Agent Bootstrap

작업 시작 전 `CLAUDE.md`를 끝까지 읽는다.
규칙의 정본은 `CLAUDE.md`다.
이 파일에는 규칙을 복사하지 않는다.
```

이미 `AGENTS.md`가 정본인 저장소에서는 방향을 바꿉니다. 중요한 것은 파일 이름이 아니라 설치 명령과
권한 규칙을 한 곳에서만 고치는 것입니다. AI는 기존 정본을 새 템플릿으로 덮어쓰면 안 됩니다.

## CLAUDE.md에 실제 명령을 씁니다

### 설치와 테스트 명령을 실행 위치와 함께 기록합니다

![CLAUDE.md의 명령표에서 설치, 개발, 테스트, 빌드 명령이 각각 터미널 실행 결과로 이어지는 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c8/c855f7522a308f0192eb3ddf5751c409d1948b3836bcc4b94e60510c18b09389.png "CLAUDE.md에는 복사해서 실행할 수 있는 명령과 실행 위치를 함께 적습니다")

AI는 패키지 설정과 CI에서 찾은 명령을 복사 가능한 형태로 적습니다. 같은 명령도 저장소 루트에서
실행하는지 `ui/` 폴더에서 실행하는지에 따라 결과가 달라집니다. 필요한 런타임 버전과 Windows 전용
옵션도 실제 설정에 있을 때 함께 기록합니다.

```markdown
| 목적 | 실행 위치 | 명령 |
|---|---|---|
| 설치 | 저장소 루트 | `uv sync` |
| 개발 | 저장소 루트 | `uv run myapp` |
| 좁은 테스트 | 저장소 루트 | `uv run python -X utf8 tests/run.py gate unit` |
| 전체 검증 | 저장소 루트 | `uv run python -X utf8 tests/run.py preflight` |
| 빌드 | `web/` | `npm run build` |
```

이 표의 명령은 형식 예시입니다. AI는 대상 저장소에서 같은 값을 확인했을 때만 사용합니다. 배포는
명령만 찾았다는 이유로 실행하지 않고, 허용된 브랜치와 배포 뒤 확인할 실제 주소까지 문서에서 확인합니다.

## 긴 절차는 정본 문서로 연결합니다

### 루트에는 사고 방지 규칙을 두고 세부 절차는 실제 문서로 보냅니다

![짧은 CLAUDE.md에서 테스트, 배포, 아키텍처 문서 세 갈래로 연결되는 문서 지도](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f6e0bae0f78582fbcea10bac547342bb2e725e8feb67e1971b1494cf5e6c43ca.png "짧은 루트 규칙은 필요한 작업 문서로 연결되고 상세 절차는 각 정본 문서에만 있습니다")

`CLAUDE.md`가 너무 길면 테스트 명령과 수정 금지 경로를 찾기 어렵습니다. AI는 루트 파일에 제품 범위,
비밀정보, 기존 변경 보호, 기본 명령과 문서 지도만 둡니다. 테스트 종류와 배포 순서가 이미 별도 문서에
있으면 내용을 복사하지 않고 정확한 경로를 연결합니다.

| 층 | 적을 내용 | 예시 위치 |
|---|---|---|
| 진입점 | 가장 먼저 읽을 정본 | `AGENTS.md` |
| 공통 경계 | 수정 범위, 비밀정보, 브랜치, 기본 명령 | `CLAUDE.md` |
| 작업별 계약 | 테스트, 배포, 아키텍처, 운영 절차 | `docs/`, `tests/`, 제품 스펙 문서 |

문서가 없는 작업을 위해 빈 폴더부터 만들 필요는 없습니다. AI는 현재 존재하는 정본을 연결하고, 같은
절차가 반복돼 루트 문서를 가릴 때만 별도 문서를 제안합니다.

## 작은 검사로 환경 구성을 확인합니다

### 문서 작성 뒤 실제 명령과 산출물 및 화면을 차례로 확인합니다

![테스트 명령이 보고서 파일과 브라우저 화면 및 완료 체크로 이어지는 검증 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/01/01dbd75b059ac447b91004ebb181a8f9ab752273c153c8badf6682420c2b6962.png "명령 실행 뒤 보고서와 실제 화면을 확인하고 남은 프로세스와 임시 파일까지 정리합니다")

환경 파일을 만들었다고 구성이 끝난 것은 아닙니다. AI는 저장소가 지정한 가장 작은 검사를 먼저 실행해
명령과 실행 위치가 맞는지 봅니다. 화면을 바꾸는 프로젝트라면 문서에 적힌 브라우저나 앱 검사까지
확인하고, 실행한 서버와 임시 파일을 정리합니다.

```markdown
## 완료 조건

- 문서: 자리표시자가 남지 않고 AGENTS.md와 CLAUDE.md가 서로 충돌하지 않는다
- 명령: 저장소에서 확인한 가장 좁은 검사가 통과한다
- 제품: 문서가 요구하는 API, 브라우저, 앱 확인을 수행한다
- 산출물: 보고서와 스크린샷이 지정된 경로에 생긴다
- 정리: 시작한 프로세스를 종료하고 관련 없는 기존 변경을 보존한다
- 보고: 실행하지 못한 검증을 완료 항목과 분리한다
```

의존성이 없어 검사를 실행할 수 없다면 AI는 성공했다고 말하지 않습니다. 저장소에서 확인한 설치 명령,
실행하지 못한 검사, 필요한 권한을 완료 보고의 미확인 항목에 남깁니다.

## 일곱 칸이 채워졌는지 확인합니다

### 제품 경계부터 권한까지 확인하면 다음 대화도 같은 규칙으로 시작합니다

![공개 AI 코딩 환경 템플릿의 일곱 필수 칸이 실제 프로젝트 값으로 채워지는 체크리스트](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/57/57878e78ff3bfffe9418885d4ce7906b0093ff41bcefb2ed901c184f03784e9d.png "공개 템플릿에서 제품 경계, 환경, 명령, 문서, 산출물, 완료 증거, 권한을 먼저 채웁니다")

마지막으로 AI가 만든 문서에서 아래 일곱 항목을 찾습니다. 이름만 있고 실제 경로나 명령이 없다면 아직
완료가 아닙니다. 사람이 정해야 하는 권한은 AI가 임의로 넓히지 않고 명시적 허용이 필요하다고 적습니다.

1. 제품 경계: 이 저장소가 소유하는 것과 소유하지 않는 것
2. 실행 환경: 운영체제, 셸, 런타임, 패키지 관리자
3. 정확한 명령: 설치, 개발, 좁은 테스트, 전체 검증, 빌드
4. 문서 지도: 코드와 현재 계약을 읽을 실제 경로
5. 산출물 위치: 빌드, 보고서, 스크린샷, 임시 파일 경로
6. 완료 증거: 테스트 외에 확인할 실제 API, 브라우저, 앱 화면
7. 권한 경계: commit, push, 배포, 외부 서비스 변경 조건

자리표시자가 남았는지는 아래 명령으로 확인합니다.

```bash
rg -n "\{\{[A-Z_]+\}\}" AGENTS.md CLAUDE.md
```

결과가 0개이고 작은 검사가 통과했다면 다음 저장소에서도 같은 URL을 사용하면 됩니다. 작업할 저장소를
AI에서 연 뒤 `https://eddmpython.com/blog/ai-environment`만 보내고, AI가 보고한 변경 파일, 검사 결과,
미확인 항목 세 가지를 확인합니다.
