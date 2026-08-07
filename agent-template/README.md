# Agent Template

AI 코딩 에이전트에게 저장소를 맡길 때 루트에 두는 규칙 파일입니다.

DartLab, Codaro, xlpod, pyproc 을 만들면서 실제로 사고가 났던 지점을 역산해 남겼습니다.
거짓 실패를 사실로 보고한 일, 지킬 코드가 없는데 게이트만 늘린 일, 참조 대상을 읽지 않고
"반영했다" 고 말한 일 같은 것들입니다.

## 파일

- `CLAUDE.md` 규칙 정본
- `AGENTS.md` 진입점. 규칙을 복제하지 않고 `CLAUDE.md` 로 보냅니다

## 적용

두 파일을 프로젝트 루트에 복사하고 자리표시자를 채웁니다.

| 자리표시자 | 예 |
|---|---|
| `{{PROJECT}}` | `dartlab` |
| `{{MAIN_BRANCH}}` | `main` |
| `{{INSTALL_CMD}}` | `npm install` |
| `{{DEV_CMD}}` | `npm run dev` |
| `{{TEST_CMD}}` | `npm test` |
| `{{BUILD_CMD}}` | `npm run build` |
| `{{DEPLOY_CMD}}` | `npm run deploy` |
| `{{BUILD_OUT_DIR}}` | `../project.out/dist` |
| `{{COMMIT_LANG}}` | `한국어` |
| `{{CHAT_LANG}}` | `한국어` |
| `{{SECRET_STORES}}` | `.env`, GitHub Secrets |
| `{{DOCS_DIR}}` | `docs/` |
| `{{TRACKER}}` | `plan/`, 이슈 트래커 |
| `{{BOUNDARY}}` | 이 저장소가 소유하는 것과 소유하지 않는 것 |
| `{{INVARIANT}}` | 깨면 안 되는 계층 방향과 공개 API 표면 |
| `{{CODE_MAP}}` | 진입점 파일과 핵심 모듈 위치 |
| `{{PITFALL}}` | 메모리 제약, 플랫폼 고유 함정 |

마지막 네 개가 실제로 프로젝트를 구분하는 부분입니다. 앞의 것들은 값만 바뀝니다.

## 유지 기준

**길어지면 앞부분만 지켜집니다.** 규칙을 추가하기 전에 두 가지를 확인하세요.

- 이 항목을 어겨서 실제로 사고가 난 적이 있는가. 없으면 넣지 않습니다.
  예방 차원의 일반론은 노이즈가 되고, 노이즈가 늘면 진짜 규칙의 밀도가 떨어집니다.
- 이 사실이 다른 문서에 이미 있는가. 있으면 포인터만 둡니다.

## 라이선스

MIT.
