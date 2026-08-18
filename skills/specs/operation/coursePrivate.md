---
id: operation.coursePrivate
title: 유료 강의 자료 비공개 운영
category: operation
purpose: 무료로 공개하는 블로그와 유료 수강생만 보는 강의 자료의 경계를 정하고, 강의 자료가 공개 저장소나 공개 빌드로 새지 않게 막는다.
whenToUse:
  - 강의 자료를 어디에 두나
  - 수강생만 보게 하려면
  - Cloudflare Access 설정
  - 수강생 승인과 해제
  - 좌석이 몇 개인가
  - 유료 자료가 깃에 나갔나
  - course 폴더 정책
verify:
  - cd site && npm run check:leak
  - cd site && npm test
---

# 유료 강의 자료 비공개 운영

## 경계

공개와 유료를 나누는 기준은 베낄 수 있는가다.

| 층 | 무엇 | 어디 |
|---|---|---|
| 공개 | 개념, 왜 그런가, 데모 영상, 최소 코드 | `blog/` 와 `eddmpython.com/blog/` |
| 유료 | 슬라이드, 실습용 파일, 채점과 검증, 질문 답변, 코드 리뷰, 커리큘럼 순서 | `course/` (추적하지 않음) |

블로그는 유입 채널이다. 검색어를 그렇게 잡아 두었고 제품 진입도 거기서 온다. 블로그를 막으면
그것이 0 이 된다. 수강생이 값을 느끼는 지점은 텍스트가 아니라 진행과 피드백과 데이터다.

수강생에게는 이렇게 말한다. 블로그는 교재이며 무료로 공개되어 있고, 수업은 그것을 각자의 회사
파일로 바꾸는 시간이다.

## course 폴더 정책

`course/` 는 `.gitignore` 의 `/course/` 로 추적하지 않는다. 이 경로에 든 것은 어떤 경우에도
공개 저장소에 커밋하지 않는다.

되돌릴 수 없는 사실이 하나 있다. 이미 공개된 블로그 40편은 GitHub 이력과 검색 캐시에 남아 있어
지금 감춰도 없던 일이 되지 않는다. 그래서 유료로 두려는 것은 새로 만드는 것만 넣는다.

## 누출을 막는 세 겹

한 겹으로는 부족하다. `.gitignore` 는 규칙이라 `git add -f` 한 번이면 뚫린다.

**1. `.gitignore`** 가 실수로 스테이징되는 것을 1차로 막는다.

**2. `.githooks/pre-commit`** 이 강제 추가까지 막는다. 스테이징 목록을 직접 보기 때문에
`git add -f` 로도 통과하지 못한다. 세 가지를 검사한다.

- `course/` 나 `private/` 아래 경로
- 파일 안의 비공개 표식. `private: true` 또는 `<!-- eddm:private -->`
- 자격증명 모양의 문자열

경로를 옮겨도 표식이 따라오므로 파일을 `blog/` 로 옮겨 커밋해도 막힌다.

새로 클론했다면 훅 경로를 한 번 지정한다.

```bash
git config core.hooksPath .githooks
```

**3. `npm run check:leak`** 이 공개 빌드 산출물을 검사한다. 이 검사가 가장 중요하다.

이 사이트는 글 본문을 JS 번들로 굽는다. `site-dist/assets/index-*.js` 안에 블로그 본문
문자열이 그대로 들어 있는 것을 확인했다. 그래서 Cloudflare Access 로 `/course` 경로를 막아도,
강의 본문이 같은 빌드 파이프라인을 타면 공개 JS 청크와 sitemap 으로 새어 나간다. Access 는 경로
요청만 막지 번들 안의 문자열은 막지 못한다.

검사는 `course/` 원본에서 특징적인 문장을 뽑아 공개 산출물에서 찾는다. 하나라도 나오면 실패다.
`sitemap.xml`, `rss.xml`, `robots.txt` 에 `/course` 주소가 올라갔는지도 함께 본다.
`npm run deploy` 가 빌드 직후 이 검사를 부르므로 새는 상태로는 배포되지 않는다.

## 무엇을 무엇으로 막는가

| 대상 | 방법 | 상태 |
|---|---|---|
| 운영자 admin | Google 로그인 + Cloudflare Access. 허용 계정 하나 | 설정 진행 |
| 오프라인 강의장 | 별도 라우트 + 비밀번호. 강의가 끝나면 라우트를 닫는다 | 아직 만들지 않았다 |
| 블로그 | 막지 않는다. 무료 공개다 | 공개 |

강의장에 Access 를 쓰지 않기로 한 이유가 있다. 오프라인이고 인원이 고정이며 강의가 끝나면 닫으므로
암호가 새도 수명이 짧다. 반대로 Access 는 학생마다 계정 인증을 요구해서 강의장에서 여러 명이 동시에
처음 로그인할 때 가장 취약하다. 그 순간이 하필 오프라인 강의의 핵심 장면이다.

강의장 라우트와 그것을 열고 닫는 admin 기능은 블로그 40 편이 확정되고 슬라이드를 만들기 시작할 때
함께 만든다. 지킬 콘텐츠가 없는 상태에서 잠금장치부터 만들지 않는다.

## 운영자 admin

admin 은 운영자 한 명만 들어간다. 인증은 Cloudflare Access 가 맡고 앱 코드에는 인증을 넣지 않는다.
`CLAUDE.md` 가 자체 인증 구축을 금지하므로 Access 로 앞을 막는 방식만 쓴다.

### Google Cloud Console

1. APIs & Services 에서 Credentials 를 열고 Configure Consent Screen 을 External 로 만든다
2. Create OAuth client 를 고르고 Application type 은 Web application 로 한다
3. 아래 두 칸을 정확히 채운다. 한 글자만 달라도 로그인이 실패한다

| 칸 | 값 |
|---|---|
| Authorized JavaScript origins | `https://<팀이름>.cloudflareaccess.com` |
| Authorized redirect URIs | `https://<팀이름>.cloudflareaccess.com/cdn-cgi/access/callback` |

팀 이름은 Cloudflare 대시보드의 `Settings` 에서 `Team name and domain` 의 `Team name` 이다.
추측해서 넣지 않고 그 화면에서 직접 확인한다.

4. Client ID 와 Client Secret 을 복사한다

### Cloudflare 등록

Zero Trust 에서 Integrations 의 Identity providers 로 가서 Google 을 추가하고 위 두 값을 넣는다.
한 번 등록하면 이후 만드는 모든 Access 앱에서 다시 쓸 수 있다.

### Access 앱

Access controls 의 Applications 에서 self-hosted 로 만들고 도메인은 `eddmpython.com` 이다.
Path 는 `admin` 과 `admin/*` 을 모두 넣는다. 와일드카드가 부모 경로를 포함하지 않기 때문이다.

정책은 Allow 하나이고 selector 는 `Emails` 에 `eddmpython@gmail.com` 한 줄이다. 한 명이라
List 를 만들지 않는다. IdP 는 Google 하나만 켜고 `Apply instant authentication` 을 켠다. 그러면
로그인 선택 화면을 건너뛰고 바로 구글로 간다.

### 확인

시크릿 창에서 `eddmpython.com/admin` 을 연다. 구글 로그인 화면이 뜨고 통과한 뒤 사이트 404 가
나오면 인증 체인이 정상이다. 아직 그 경로에 페이지를 만들지 않았으므로 404 가 정상 신호다.

admin 은 미검증 OAuth 앱의 100 명 상한과 무관하다. 운영자 계정 하나만 쓰기 때문이다. 그 상한은
수강생을 구글로 받을 때만 문제가 된다.

## 수강생 접근

강의장은 비밀번호 방식이므로 수강생 이메일을 Access 에 등록하지 않는다. 명단 관리와 좌석 소모가
아예 없다.

나중에 원격 수강이나 상시 열람이 필요해져서 수강생을 Access 로 받게 되면 그때 아래를 참고한다.

- 좌석은 등록이 아니라 인증할 때 소모된다
- 무료 좌석은 50 석이다. 다 차면 새 사용자의 로그인이 막히고 기존 사용자는 영향이 없다
- 1 개월에서 1 년 사이 미접속자를 자동으로 빼는 설정이 있으며 하루 한 번 돈다
- 명단은 `Reusable components` 의 `Lists` 에 `User email addresses` 형식으로 CSV 로 올리고
  정책에서 `Emails` 를 `in list` 로 참조한다

**확인하지 않은 것**: 50 석을 넘겼을 때의 사용자당 단가. 공개 요금 페이지에서 숫자를 확인하지
못했다. 결제 전에 대시보드에서 직접 확인한다.

관련 문서는
[Zero Trust 좌석 관리](https://developers.cloudflare.com/cloudflare-one/team-and-resources/users/seat-management/)
와 [Access 정책](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/) 이다.

## 별도 비공개 저장소로 옮길 시점

지금은 `course/` 를 추적하지 않는 것으로 충분하다. 웹에 올릴 강의 콘텐츠가 아직 없기 때문이다.

다음 중 하나가 생기면 별도 비공개 저장소로 옮긴다.

- 강의 콘텐츠가 쌓여 원본이 이 컴퓨터에만 있는 것이 위험해질 때
- 두 대 이상에서 강의 자료를 고쳐야 할 때
- 다른 사람과 함께 만들 때

`.gitignore` 는 규칙이고 별도 저장소는 물리다. 유료 자료는 한 번 새면 되돌릴 수 없어서 결국은
물리로 나누는 편이 맞다. 옮길 때는 빌드가 그 저장소에서 콘텐츠를 가져오는 배선을 함께 만든다.
