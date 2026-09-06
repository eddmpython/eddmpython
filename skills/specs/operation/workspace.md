---
id: operation.workspace
title: 작업 산출물과 임시 파일
category: operation
purpose: 빌드 산출물과 임시 파일을 어디에 두고 언제 지우는지 정한다.
whenToUse:
  - dist 가 어디에 생기나
  - .wrangler 가 안 지워진다
  - 스크린샷 어디에 두나
  - 저장소가 더러워졌다
verify:
  - git status --short
  - cd site && npm run check:workspace
status: observed
---

# 작업 산출물과 임시 파일

## 경계

2026-09-05 운영자 결정이다. `.out`과 `eddmpython.out` 같은 저장소별 외부 산출물 폴더는
허용하지 않는다. 정식 산출물이나 보존 증거라는 이름으로 예외를 두지 않는다.

의존성은 반드시 저장소 안에 설치한다. Node는 `site/node_modules`, Python은 루트 `.venv`를 쓴다.
다른 저장소나 외부 실행 공간의 설치본을 빌리거나 링크로 연결하지 않는다. 의존 환경과 도구의
전역 캐시는 임시 파일이 아니므로 작업 정리 대상으로 취급하지 않는다.

빌드, 이미지 발행 대기 파일, 브라우저 프로필, 스크린샷, 진단 로그는 전역
`$development-hygiene`의 공통 실행 공간 아래 작업별 고유 디렉터리에 둔다.
소스와 추적하는 시험 입력은 저장소에 남긴다.

## 작업 시작

PowerShell에서 저장소 루트를 기준으로 한 번 지정한다. 빌드, 화면 확인, 이미지 발행과 배포를
마칠 때까지 같은 셸 환경을 이어 쓴다. 새 작업마다 새 경로를 만들고 고정 경로로 재사용하지 않는다.

```powershell
$taskRun = Join-Path $env:LOCALAPPDATA ('dev-workspace\work-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskRun
$env:EDDMPYTHON_RUN_DIR = $taskRun
$taskTemp = Join-Path $taskRun 'tmp'
New-Item -ItemType Directory -Path $taskTemp
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
$env:TMPDIR = $taskTemp
$env:PYTHONDONTWRITEBYTECODE = '1'
```

`site/scripts/executionWorkspace.mjs`는 지정한 경로가 공통 실행 공간 바로 아래의 실제 디렉터리인지,
고유 접미사가 있는지 확인한다. 경로가 없거나 잘못됐으면 명확한 오류로 멈추며 자동 대체 경로를
만들지 않는다. 이미지 발행의 `blog/scripts/media_paths.py`도 같은 환경변수를 검증한다.
`test-workspace-gate.mjs`가 두 언어의 실제 경로 일치를 확인한다.

Python 의존성은 처음 한 번 저장소 루트에서 준비한다.

```powershell
uv venv .venv
uv pip install --python .venv/Scripts/python.exe -r blog/requirements.txt
```

이미지 명령은 `.venv/Scripts/python.exe -B blog/scripts/publish_media.py`처럼 저장소 환경으로 실행한다.
macOS와 Linux에서는 `.venv/bin/python`을 사용한다. 외부 임시 환경을 만드는 `uv run --with`를
설치된 프로젝트 의존성 대신 쓰지 않는다.

## 경로 연결

Vite는 현재 실행 공간에 클라이언트와 SSR 빌드 및 캐시를 만든다. `siteWrangler.mjs`는 같은 빌드를
공식 `--assets` 인수로 전달하고 로컬 상태와 배포 번들, 진단 로그도 현재 실행 공간으로 보낸다.
`wrangler.jsonc`에는 기계별 고정 출력 경로를 적지 않는다.

시각 검증과 SEO 및 누출 검사는 같은 빌드를 읽는다. 이미지 대기 파일은 현재 실행 공간의
`blog-media/<post-id>/`에 두고 검수한 바이트를 Hugging Face에 발행한 뒤 제거한다.
경로별 상세 계약은 [blogMedia.md](blogMedia.md)와 [visualVerification.md](visualVerification.md)를 따른다.

`workspace-contract.mjs`의 `ALLOWED`는 현재 작업에서 식별한 출력 종류다. 영구 보존 허가가 아니다.
새 출력 종류에는 무엇이며 어떻게 다시 만드는지 적는다. 원본이 아직 발행되지 않았거나 링크가
들어 있거나 용량 예산을 넘으면 `npm run check:workspace`가 보고한다. 원본이 든 폴더를
이름만 보고 지우라고 안내하지 않는다.

## 작업 종료

1. 시작 전 `git status --short`와 비교해 기존 파일과 이번 작업의 변경을 구분한다
2. 이번 작업에서 시작한 프로세스만 종료한다. 같은 이름의 모든 프로세스를 종료하지 않는다
3. 이미지 원본과 명시한 납품물을 먼저 정식 위치에 보존한다
4. 이번 작업 폴더의 절대 경로와 소유 파일을 확인한 뒤 임시 산출물 및 빈 작업 폴더를 제거한다
5. `site/.wrangler`처럼 도구가 저장소 안에 만든 이번 작업의 임시 파일도 확인하고 정리한다
6. 잠긴 파일이나 설명하지 못한 잔여물이 없고, 기존 의존성과 사용자 변경이 유지됐는지 확인한다

현재 작업의 화면 증거는 검수와 승인에만 사용한다. 배포와 확인이 끝나면 함께 정리한다.
승인이 필요한 원고가 남아 있으면 원고와 발행된 이미지 주소는 보존하되 다시 만들 수 있는
미리보기 빌드와 화면 캡처를 영구 보존 폴더로 바꾸지 않는다.

`git status`가 비어야 한다고 판단하지 않는다. 정상적인 소스 변경은 남을 수 있다.
저장소 루트, 공통 실행 공간 전체, 다른 작업 폴더와 기존 의존성은 삭제 대상이 아니다.
