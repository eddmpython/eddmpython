---
id: operation.classroom
title: 강의장
category: operation
purpose: 오프라인 강의에서 운영자가 실시간으로 여는 교안 열람 방을 어떻게 켜고 끄고 검증하는지 정한다.
whenToUse:
  - 강의장 열기
  - 강의장 비밀번호
  - 카테고리 잠금 풀기
  - 로컬에서 강의장 테스트
  - 교안이 공개 번들에 새는지
verify:
  - cd site && node scripts/build-course.mjs
  - cd site && npm run check:leak
  - cd site && node scripts/classroom-shot.mjs
status: observed
---

# 강의장

오프라인 강의장에서 **운영자가 실시간으로 여는 방**이다. 정적 페이지가 아니다.
설계 근거와 아직 안 정한 것은 `memory/courseRoom.md` 에 있다.

## 강의장에서 벌어지는 일

1. 운영자가 `/cr/admin` 에서 방을 **연다**
2. 수강생에게 주소를 알려 준다. `/cr` 이다
3. 수강생이 **비밀번호**를 치고 들어온다
4. 열어 둔 동안 계속 들어올 수 있다. 지각한 사람도 들어온다
5. **운영자가 클릭한 카테고리만 수강생 화면에 열린다**
6. 진도가 나가면 다음 카테고리를 클릭해 연다
7. 끝나면 방을 닫는다. **닫으면 잠금도 처음으로 되돌아간다**

## 닫힌 것은 가리지 않고 안 준다

**이 설계의 요점이다.** 미리 다 내려놓고 화면에서만 가리면 수강생이 개발자 도구로 앞 내용을
먼저 본다. 강의장에는 파이썬을 배우러 온 사람들이 앉아 있으므로 그 일이 실제로 생긴다.

`site/classroom.ts` 는 잠긴 카테고리의 본문을 **만들지도 않는다.** 주소를 직접 쳐도 404 다.

| 상태 | 카테고리 본문 주소 |
|---|---|
| 로그인 안 함 | 로그인 화면 |
| 방 닫힘 | 대기 화면. 본문 없음 |
| 방 열림, 카테고리 잠김 | **404** |
| 방 열림, 카테고리 열림 | 200 |

## 교안 본문은 Worker 번들에만 있다

`site/scripts/build-course.mjs` 가 `course/curriculum/` 을 읽어
`site/course-content.generated.ts` 를 만든다. **그 파일은 Worker 에서만 import 한다.**

클라이언트 번들(`site-dist/assets/*.js`)에 넣으면 비밀번호를 걸어도 본문이 이미 공개된 상태가
된다. Worker 코드는 브라우저로 내려가지 않으므로 거기에만 둔다.

- 생성물은 추적하지 않는다. `.gitignore` 가 막는다
- `course/` 가 없는 체크아웃에서는 빈 모듈을 쓴다. 빌드가 깨지지 않는다
- **`npm run check:leak` 이 계속 0건이어야 한다.** 어떤 구현으로 바꾸든 이 조건이 먼저다

## 상태 보관

`Classroom` Durable Object 하나가 `{ open, unlocked[] }` 를 든다. 수강생이 여럿이어도 같은
인스턴스를 보므로 운영자 클릭이 모두에게 같게 반영된다.

수강생 화면은 3초마다 `/cr/api/state` 를 읽는다. **그 응답에는 상태 지문만 있고 카테고리
목록도 본문도 없다.** 지문이 바뀌면 페이지를 다시 읽는다.

## 인증

| 무엇 | 어떻게 | 비밀값 |
|---|---|---|
| 수강생 | 방 비밀번호 | `CR_PASSWORD` |
| 운영자 | 운영자 키 | `CR_ADMIN_KEY` |
| 세션 | HMAC 서명 쿠키. `HttpOnly`, `SameSite=Lax`, 12시간 | `CR_SECRET` |

비밀번호 비교는 상수 시간에 가깝게 한다. 길이가 다르면 즉시 거짓이고 같으면 전부 비교한다.

**운영자 인증은 아직 키 하나다.** `memory/courseRoom.md` 는 자체 Google OAuth 를 최종안으로
적어 뒀고 그것은 Google Cloud Console 설정이 필요해 아직 안 했다. 지금 구조는 그때
`/cr/admin` 진입 판정만 바꾸면 되게 되어 있다.

## 로컬에서 테스트

바탕화면 바로가기 `eddmpython 강의장 테스트` 가 `site/scripts/classroom-dev.ps1` 을 부른다.
교안을 다시 굽고 필요하면 사이트를 빌드한 뒤 `wrangler dev` 를 띄우고 운영자 화면을 연다.

```powershell
site\scripts\classroom-dev.ps1
```

비밀값은 `site/.dev.vars` 다. 추적하지 않는다. 없으면 `site/.dev.vars.example` 를 복사한다.
**교안을 고쳤으면 다시 실행해야 반영된다.** 1번 단계가 그 일을 한다.

## 화면 검수

강의장은 sitemap 에 없고 비밀번호 뒤에 있어서 `verify:visual` 이 못 본다. 따로 찍는다.

```powershell
node scripts/classroom-shot.mjs
```

`../eddmpython.out/classroom-shots/` 에 데스크톱과 모바일로 로그인, 목록, 본문 세 화면이
찍힌다. **DOM 이 통과했다고 넘어가지 않고 실제 픽셀을 눈으로 본다.**
본문 이미지는 `loading="lazy"` 라 스크립트가 강제로 로드한 뒤 찍는다.

## 배포

아직 배포하지 않았다. 배포하려면 비밀값 셋을 Worker secret 으로 넣는다.

```powershell
npx wrangler secret put CR_PASSWORD
npx wrangler secret put CR_ADMIN_KEY
npx wrangler secret put CR_SECRET
```

Durable Object 마이그레이션이 `wrangler.jsonc` 에 있으므로 첫 배포에서 클래스가 만들어진다.

## 롤백

`site/wrangler.jsonc` 의 `durable_objects` 와 `migrations` 를 지우고 `worker.ts` 의
`/cr` 분기와 `Classroom` export 를 빼면 강의장이 사라진다. 교안 본문은 저장소 밖이 아니라
`course/` 에 그대로 있으므로 잃는 것이 없다.
