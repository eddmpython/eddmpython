---
title: AI 코딩 환경, 저장소에 맞게 만드는 방법
slug: ai-environment
date: 2026-08-08
modified: 2026-08-14
author: eddmpython
section: AI 작업 환경
summary: AI 코딩 환경에서 엉뚱한 명령과 범위 밖 수정을 막는 방법을 설명합니다. 실제 프로젝트 다섯 곳에서 뽑은 AGENTS.md, CLAUDE.md, 테스트, 산출물 규칙을 바로 적용할 수 있습니다.
readerQuestion: AI 코딩 도구가 저장소마다 정확한 명령과 수정 범위를 지키게 하려면 무엇을 어떻게 적어야 할까?
readerTakeaway: AGENTS.md는 짧은 입구로 두고, CLAUDE.md에는 제품 경계와 정확한 명령을 적으며, 상세 절차와 완료 증거는 작업별 문서와 게이트로 연결한다.
readerLevel: working
readerStartingPoint: Git 저장소에서 AI 코딩 도구를 쓰고 있지만 프로젝트별 규칙 파일은 아직 정리하지 않았다.
primaryKeyword: AI 코딩 환경
searchIntent: how-to
ogImage: https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b2/b2639594672c77b1ce7fbe7e20e5caa70e374cca0565d6d81e2eaa9fd1fbccf2.png
ogImageAlt: AGENTS.md 파일이 한 방향 화살표로 CLAUDE.md 정본과 프로젝트 문서에 연결된 구조도
ogImageWidth: 1536
ogImageHeight: 1024
ogImageType: image/png
---

AI에게 "이 버그를 고쳐 줘"라고 요청했는데 엉뚱한 테스트를 실행하거나, 건드리면 안 되는 파일까지
수정한 적이 있을 겁니다. 원인은 모델이 멍청해서가 아니라 저장소 안에 답이 없기 때문일 때가 많습니다.

AI는 새 대화를 열 때 이 프로젝트의 Python 버전, 실행 명령, 산출물 위치, 배포 권한을 모릅니다. 결국
익숙한 기본값을 추측합니다. 이 추측을 없애는 것이 AI 코딩 환경을 만드는 일입니다.

이 글은 제가 운영하는 DartLab, Codaro, xlpod, pyproc, ClipScout 저장소의 실제 규칙을 다시 확인해
공통 구조만 뽑았습니다. 아래 순서대로 적용하면 긴 프롬프트 없이도 새 세션이 같은 방식으로 시작하고,
검증하고, 끝낼 수 있습니다.

## 먼저 AI가 틀리는 지점을 한 줄로 찾습니다

### 잘못 실행한 명령 하나를 정확한 저장소 규칙 하나로 바꿉니다

![AI가 추측한 잘못된 테스트 명령과 저장소가 지정한 정확한 테스트 명령을 나란히 비교한 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f689a854e54f8a96ca4420071b6d35b52b0b57ac5a97e6a4938b87b36c26ebe5.png "추측한 명령을 실제 패키지 설정과 프로젝트 문서에서 확인한 명령으로 바꿉니다")

규칙 문서를 처음부터 길게 쓸 필요는 없습니다. 최근 작업에서 AI가 잘못 고른 행동 하나부터 찾으면 됩니다.
예를 들어 전체 테스트를 `pytest`로 직접 실행했다가 메모리가 부족해졌다면, 필요한 규칙은 "테스트를
잘 실행한다"가 아닙니다. 저장소에서 실제로 쓰는 명령 한 줄입니다.

```text
나쁜 규칙: 변경 후 충분히 테스트한다.
좋은 규칙: 전체 검증은 uv run python -X utf8 tests/run.py preflight 로 실행한다.
```

좋은 규칙에는 행동과 확인 방법이 함께 있습니다. 새 세션은 해석할 필요 없이 그대로 실행할 수 있습니다.
실패했을 때도 어떤 명령이 실패했는지 다시 확인할 수 있습니다.

규칙 후보를 찾을 때는 아래 세 질문만 씁니다.

1. AI가 무엇을 추측했는가?
2. 저장소의 실제 정답은 어느 파일이나 명령에 있는가?
3. 다음 세션이 그대로 실행할 한 문장은 무엇인가?

이 방식이면 막연한 원칙을 모으지 않고, 실제로 반복되는 실수부터 줄일 수 있습니다.

## 다섯 프로젝트에서 실제 시작점을 확인했습니다

### 기술보다 제품 형태가 테스트 명령과 완료 증거를 바꿉니다

![DartLab, Codaro, xlpod, pyproc, ClipScout가 각자의 실행 명령과 완료 증거로 연결된 비교표](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/3a/3a8bed10f6ab335da7770648fc35d30c8b1f8df78dcffcd8789cd8ded41d4637.png "다섯 프로젝트는 제품 형태에 따라 서로 다른 실행 명령과 완료 증거를 사용합니다")

환경 문서를 잘 쓰려면 다른 저장소의 규칙을 그대로 복사하기 전에 제품이 어떻게 실행되는지 봐야
합니다. 제가 현재 운영하는 다섯 저장소도 시작 파일은 비슷하지만 완료를 증명하는 방법은 달랐습니다.

| 프로젝트 | 주 실행 환경 | 먼저 실행할 대표 게이트 | 화면이나 제품 동작을 바꿨을 때 |
|---|---|---|---|
| DartLab | Python 3.12 이상, uv | `uv run python -X utf8 tests/run.py preflight` | 실제 공개 API와 필요한 UI 게이트까지 확인 |
| Codaro | Python 3.12 이상, uv, Node.js | `uv run python -X utf8 tests/run.py preflight` | 실제 편집기 화면과 생성된 검사 보고서 확인 |
| xlpod | Node.js, uv, Chromium 계열 브라우저 | `node tests/runGates.mjs` | 실제 스프레드시트 스모크와 시각 게이트 확인 |
| pyproc | Node.js, Chromium 계열 브라우저 | `npm test` | 런타임 변경은 `npm run test:browser`, 설치본은 `npm run test:installed` 확인 |
| ClipScout | Rust, Node.js, Tauri | `cargo test --workspace`와 `npm --prefix ui test` | `npm --prefix ui run inspect:audit`로 실제 앱 배선 확인 |

여기서 중요한 점은 "모든 프로젝트는 이 명령을 써야 한다"가 아닙니다. Python 패키지 두 곳은 하나의
러너가 관련 게이트를 모읍니다. xlpod는 CI 설정에서 실행할 목록을 읽는 러너를 둡니다. pyproc은
Node 구조 검사와 실제 브라우저 검사를 나눕니다. ClipScout는 Rust 코어, React 화면, Tauri 앱을 각각
확인합니다.

내 저장소도 같은 방식으로 판단하면 됩니다. 라이브러리라면 설치된 패키지에서 공개 API가 동작하는지,
웹 앱이라면 실제 브라우저에서 클릭과 저장이 되는지, 데스크톱 앱이라면 프론트와 코어 사이 연결이
되는지를 완료 조건으로 적습니다. 단순히 "테스트 통과"라고 쓰면 이 차이가 사라집니다.

## AGENTS.md는 짧은 입구로만 씁니다

### 규칙을 두 파일에 복사하지 말고 정본 한 곳으로 연결합니다

![AGENTS.md 파일이 한 방향 화살표로 CLAUDE.md 정본과 프로젝트 문서에 연결된 구조도](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/b2/b2639594672c77b1ce7fbe7e20e5caa70e374cca0565d6d81e2eaa9fd1fbccf2.png "AGENTS.md는 CLAUDE.md를 읽게 하고 상세 규칙은 프로젝트 문서로 연결합니다")

도구마다 먼저 찾는 파일 이름이 다릅니다. 그래서 `AGENTS.md`와 `CLAUDE.md`를 함께 두는 프로젝트가
많습니다. 문제는 두 파일에 같은 규칙을 복사할 때 생깁니다. 한쪽 테스트 명령만 고친 날부터 도구마다
서로 다른 답을 읽게 됩니다.

제가 확인한 다섯 프로젝트는 모두 `AGENTS.md`를 짧은 진입점으로 사용합니다. 실제 강행규칙은
`CLAUDE.md`에 한 번만 두고, 제품별 상세 절차는 별도 문서로 보냅니다. 가장 작은 `AGENTS.md`는 아래
정도면 충분합니다.

```markdown
# 프로젝트 Agent Bootstrap

작업 시작 전 `CLAUDE.md`를 끝까지 읽는다.
규칙의 정본은 `CLAUDE.md`다.
이 파일에는 규칙을 복사하지 않는다.
```

새 프로젝트가 `AGENTS.md`를 정본으로 삼아도 괜찮습니다. 그때는 방향만 바꾸면 됩니다. 중요한 것은
파일 이름이 아니라 같은 규칙의 본문이 한 곳에만 있는가입니다.

진입 파일에는 긴 배경 설명을 넣지 않습니다. 작업을 시작할 때 반드시 읽을 파일, 충돌할 때 이기는
파일, 상세 문서를 찾을 위치만 남깁니다. 그러면 규칙이 늘어도 입구는 짧게 유지됩니다.

## CLAUDE.md에는 복사 가능한 명령을 적습니다

### 설치, 개발, 테스트, 빌드, 배포를 실행 위치까지 함께 씁니다

![CLAUDE.md의 명령표에서 설치, 개발, 테스트, 빌드 명령이 각각 터미널 실행 결과로 이어지는 화면](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/c8/c855f7522a308f0192eb3ddf5751c409d1948b3836bcc4b94e60510c18b09389.png "CLAUDE.md에는 복사해서 실행할 수 있는 명령과 실행 위치를 함께 적습니다")

환경 문서에서 가장 먼저 채울 부분은 철학이 아니라 명령표입니다. 패키지 설정, CI, 개발 문서를 직접
읽고 현재 동작하는 명령을 복사합니다. 기억으로 쓰거나 다른 프로젝트 명령을 가져오면 시작부터
틀어집니다.

```markdown
| 목적 | 실행 위치 | 명령 |
|---|---|---|
| 설치 | 저장소 루트 | `uv sync` |
| 개발 | 저장소 루트 | `uv run myapp` |
| 좁은 테스트 | 저장소 루트 | `uv run python -X utf8 tests/run.py gate unit` |
| 전체 검증 | 저장소 루트 | `uv run python -X utf8 tests/run.py preflight` |
| 빌드 | `web/` | `npm run build` |
```

이 표는 예시입니다. 내 저장소에는 실제 명령만 넣어야 합니다. 실행 위치도 반드시 포함합니다.
`npm run build`가 루트에서는 실패하고 `ui/`에서만 동작하는 프로젝트가 흔합니다. Windows에서 Python
출력이 깨진다면 `python -X utf8`처럼 필요한 실행 옵션도 명령에 포함합니다.

배포 명령은 테스트 명령과 같은 줄에 섞지 않습니다. 누가 배포를 허가할 수 있는지, 어떤 브랜치에서
실행하는지, 배포 뒤 어느 주소를 확인하는지를 함께 적습니다. 배포 권한이 없는 세션은 빌드 성공을
배포 완료라고 말하면 안 됩니다.

## 상세 규칙은 작업 종류별 문서로 나눕니다

### 루트에는 사고 방지 규칙만 두고 테스트와 배포 절차는 정본 문서로 보냅니다

![짧은 CLAUDE.md에서 테스트, 배포, 아키텍처 문서 세 갈래로 연결되는 문서 지도](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/f6/f6e0bae0f78582fbcea10bac547342bb2e725e8feb67e1971b1494cf5e6c43ca.png "짧은 루트 규칙은 필요한 작업 문서로 연결되고 상세 절차는 각 정본 문서에만 있습니다")

모든 설명을 `CLAUDE.md`에 넣으면 중요한 명령이 긴 배경 사이에 묻힙니다. 루트 문서에는 잘못하면
데이터나 이력을 망가뜨리는 경계와 문서 지도를 둡니다. 자주 바뀌거나 특정 작업에서만 필요한 절차는
별도 문서로 나눕니다.

다섯 프로젝트는 이름은 달라도 비슷한 세 층을 사용했습니다.

| 층 | 무엇을 적나 | 예시 |
|---|---|---|
| 진입점 | 가장 먼저 읽을 정본 | `AGENTS.md` |
| 공통 경계 | 수정 범위, 비밀정보, 브랜치, 기본 명령 | `CLAUDE.md` |
| 작업별 계약 | 테스트, 배포, 아키텍처, 운영 절차 | `docs/`, `docs/skills/`, 제품 스펙 문서 |

DartLab은 작업별 지식을 Skill OS 문서로 찾습니다. Codaro는 `docs/skills/`에 환경과 제품 계약을
나눕니다. xlpod는 제품 핸드북에서 테스트와 배포를 분리합니다. pyproc은 `docs/`에 공개 계약을 두고
실행 증거는 `tests/`가 맡습니다. ClipScout는 지금 구현된 제품 계약과 앞으로 만들 계획을 구분합니다.

내 저장소에서도 `CLAUDE.md`에 "모든 테스트 종류"를 복사하지 않고 테스트 정본 경로를 적습니다.
새 게이트를 추가할 때 정본 한 곳만 고치면 진입 문서는 그대로 유지됩니다.

## 산출물 경로와 완료 증거를 함께 적습니다

### 테스트가 끝난 위치, 보고서, 실제 화면을 확인해야 완료입니다

![테스트 명령이 보고서 파일과 브라우저 화면 및 완료 체크로 이어지는 검증 흐름](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/01/01dbd75b059ac447b91004ebb181a8f9ab752273c153c8badf6682420c2b6962.png "명령 실행 뒤 보고서와 실제 화면을 확인하고 남은 프로세스와 임시 파일까지 정리합니다")

명령이 종료 코드 0을 냈다는 사실만으로 모든 작업이 끝나지는 않습니다. 검사 보고서가 어디에
생기는지, 실제 화면을 봐야 하는지, 백그라운드 프로세스를 누가 닫는지도 적어야 합니다.

Codaro는 검사별 산출물을 `output/test-runner/<gate>/` 아래에 두고 임시 파일은 그 안의 `scratch`나
운영체제 임시 폴더로 보냅니다. xlpod와 pyproc은 실제 브라우저를 띄우는 게이트가 서버와 브라우저
프로세스를 정리합니다. ClipScout의 실제 앱 점검은 격리된 데이터와 내보내기 폴더를 사용하고 앱을
닫습니다. 저장소마다 경로는 다르지만 목적은 같습니다. 제품 파일과 검사 찌꺼기를 섞지 않는 것입니다.

완료 조건은 아래처럼 요청 결과와 연결해 씁니다.

```markdown
## 완료 조건

- 코드 변경: 관련 단위 테스트와 전체 preflight가 통과한다.
- 화면 변경: 데스크톱과 모바일 목표 화면을 직접 확인한다.
- 배포 변경: 프로덕션 주소에서 같은 시나리오를 다시 확인한다.
- 산출물: 보고서는 `output/test-runner/<gate>/`에 남긴다.
- 정리: 시작한 서버와 브라우저를 종료하고 루트의 임시 파일이 0개인지 확인한다.
- 보고: 실행하지 못한 검증은 완료 항목과 분리해 적는다.
```

이렇게 적으면 "코드는 고쳤지만 실제 버튼은 연결되지 않은 상태"를 완료라고 부르기 어렵습니다. 반대로
문서만 바꾼 작업에 무거운 브라우저 게이트를 무조건 실행하는 낭비도 줄일 수 있습니다.

## 공개 템플릿은 일곱 칸부터 채웁니다

### 제품 경계와 실제 명령부터 채운 뒤 작은 작업으로 행동을 검증합니다

![공개 AI 코딩 환경 템플릿의 일곱 필수 칸이 실제 프로젝트 값으로 채워지는 체크리스트](https://huggingface.co/datasets/eddmpython/eddmpython-media/resolve/main/objects/sha256/57/57878e78ff3bfffe9418885d4ce7906b0093ff41bcefb2ed901c184f03784e9d.png "공개 템플릿에서 제품 경계, 환경, 명령, 문서, 산출물, 완료 증거, 권한을 먼저 채웁니다")

[공개 에이전트 템플릿](https://github.com/eddmpython/eddmpython/tree/main/agent-template)은 이 글에서
설명한 구조를 바로 복사할 수 있게 만든 자료입니다. 이번 검토에서 설명보다 먼저 해야 할 일이 보이도록
README의 적용 순서도 고쳤습니다.

처음에는 아래 일곱 칸만 채우면 됩니다.

1. 제품 경계: 이 저장소가 소유하는 것과 소유하지 않는 것
2. 실행 환경: 운영체제, 셸, 런타임, 패키지 관리자
3. 정확한 명령: 설치, 개발, 좁은 테스트, 전체 검증, 빌드
4. 문서 지도: 코드와 현재 계약을 어디서 읽는지
5. 산출물 위치: 빌드, 보고서, 스크린샷, 임시 파일 경로
6. 완료 증거: 테스트 외에 실제 API, 브라우저, 앱 확인이 필요한지
7. 권한 경계: commit, push, 배포, 외부 서비스 변경을 누가 허가하는지

파일을 복사한 뒤 남은 자리표시자를 찾습니다.

```bash
rg -n "\{\{[A-Z_]+\}\}" AGENTS.md CLAUDE.md
```

결과가 0개가 되면 README 한 줄 수정처럼 작은 작업을 새 세션에 맡깁니다. 올바른 파일부터 읽는지,
정확한 명령을 실행하는지, 관련 없는 변경을 보존하는지 확인합니다. 틀린 행동이 나오면 규칙을 막연하게
늘리지 말고 그 행동을 바꾸는 명령이나 경로 한 줄을 추가합니다.

AI 코딩 환경의 목표는 긴 규칙집이 아닙니다. 새 세션이 제품 범위를 알고, 맞는 명령을 실행하고,
확인한 증거로 완료를 말하게 만드는 것입니다. 모델을 바꾸기 전에 저장소가 이 세 가지 답을 주고
있는지부터 확인하면 됩니다.
