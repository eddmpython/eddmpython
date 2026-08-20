---
id: operation.coursePrivate
title: 유료 강의 자료 비공개
category: operation
purpose: 유료 교안이 어디 있고 공개 표면과 어떻게 갈라져 있는지, 무엇이 그 경계를 지키는지 정한다.
whenToUse:
  - 교안을 어디에 두나
  - 커리큘럼을 블로그에 올려도 되나
  - 공개와 유료의 경계
  - 누출 검사가 무엇을 보나
verify:
  - cd site && npm run check:leak
  - git config core.hooksPath
status: observed
---

# 유료 강의 자료 비공개

**교안은 이 저장소에 없다.** 형제 비공개 저장소 `eddmpython-course` 에 있다.

```text
sideProject/
  eddmpython/          공개. 랜딩, 블로그, 강의장 Worker
  eddmpython-course/   비공개. 교안. 여기가 정본이다
  eddmpython.out/      두 저장소의 산출물. 저장소 밖이다
```

## 2026-08-20 에 저장소를 나눴다

그 전까지 교안은 이 저장소의 추적하지 않는 `course/` 폴더에 있었다. 이 문서가 옮길 시점으로
적어 둔 조건 셋 중 둘이 이미 와 있었다.

- **원본이 이 컴퓨터에만 있는 것이 위험해질 때.** 이력도 백업도 없었고 OneDrive 동기화는
  꺼져 있어서 그 폴더는 어디에도 복제되지 않았다
- **두 대 이상에서 고쳐야 할 때.** 세션 둘이 같은 파일을 고치는데 합칠 방법이 없었다

**`.gitignore` 는 규칙이고 별도 저장소는 물리다.** 파는 물건을 공개 저장소 옆에 두고 훅과
검사로 지키는 것은 경계로 지키는 것이지 구조로 지키는 것이 아니다.

## 이 저장소의 빌드에 교안 글자가 없다

교안은 Cloudflare KV 에 있고 강의장 Worker 가 요청마다 읽는다. 비공개 저장소가 KV 로 발행한다.

```text
eddmpython-course  ──npm run publish:course──▶  KV  ──▶  강의장 /cr
```

이렇게 한 이유가 둘이다.

- **새어 나갈 경로가 구조적으로 없다.** 빌드가 교안을 읽지 않으므로 공개 번들에 들어갈 수 없다
- **교안 발행이 사이트 배포를 기다리지 않는다.** 교안은 강의 준비 때마다 고치는데 공개 사이트의
  배포 의식(테스트, 시각 승인)을 매번 통과할 이유가 없다

묶음의 모양은 두 저장소 사이의 계약이다. 바꾸면 `schema` 를 올리고 양쪽을 같은 날 같이 고친다.
읽는 쪽은 `site/classroom.ts`, 쓰는 쪽은 `eddmpython-course/scripts/publish.mjs` 다.

## 이미 공개된 이력은 그대로 둔다

2026-08-19 에 운영자가 정했다. 유료로 돌린 네 편의 본문이 GitHub 공개 이력에 남아 있고 그것을
지우지 않는다. **커리큘럼을 계속 발전시키므로 지금 공개된 것은 곧 옛 판이 된다.**
history 재작성은 되돌릴 수 없고 이미 클론한 곳에는 어차피 남는다.

내린 주소는 `site/worker.ts` 의 `LEGACY_BLOG` 가 `/blog` 로 넘겨 죽은 링크만 막는다.

## 경계

공개와 유료를 나누는 기준은 베낄 수 있는가다.

| 층 | 무엇 | 어디 |
|---|---|---|
| 공개 | 개념, 왜 그런가, 데모 영상, 최소 코드 | `blog/` 와 `eddmpython.com/blog/` |
| 유료 | 슬라이드, 실습용 파일, 채점과 검증, 질문 답변, 코드 리뷰, 커리큘럼 순서 | `eddmpython-course` |

블로그는 유입 채널이다. 검색어를 그렇게 잡아 두었고 제품 진입도 거기서 온다. 블로그를 막으면
그것이 0 이 된다. 수강생이 값을 느끼는 지점은 텍스트가 아니라 진행과 피드백과 데이터다.

**파이썬 업무자동화 커리큘럼을 블로그로 공개하지 않는다.** 2026-08-19 운영자 결정이고 전면
금지다. 블로그는 그때그때 올리는 단편이며 연재를 지지 않는다.

## 누출을 막는 세 겹

저장소를 나눈 것이 첫째다. 나머지 둘은 **사람이 옮겨 적는 것**을 막는다. 구조가 막는 것과
사람이 옮겨 적는 것은 다른 문제다.

**1. 저장소 분리.** 빌드가 교안을 읽지 않는다. `course/` 경로는 이 저장소에 없다.

**2. `.githooks/pre-commit`.** 스테이징 목록을 직접 보므로 `git add -f` 로도 통과하지 못한다.

- `course/` 나 `private/` 아래 경로
- 파일 안의 비공개 표식. `private: true` 또는 `<!-- eddm:private -->`
- 자격증명 모양의 문자열

경로를 옮겨도 표식이 따라오므로 파일을 `blog/` 로 옮겨 커밋해도 막힌다. 새로 클론했다면 훅
경로를 한 번 지정한다.

```bash
git config core.hooksPath .githooks
```

**3. `npm run check:leak`.** 형제 저장소의 `curriculum/` 과 `_archive/` 에서 특징적인 문장을
뽑아 공개 빌드 산출물에서 찾는다. 하나라도 나오면 실패다. `sitemap.xml`, `rss.xml`,
`robots.txt` 에 `/course` 주소가 올라갔는지도 함께 본다.

**형제 저장소가 없으면 이 검사는 통과하지 않고 멈춘다.** 검사할 원본이 없는데 초록불을 찍으면
그것은 게이트가 아니라 장식이다. 배포는 두 저장소가 다 있는 기계에서만 한다.

```bash
git clone https://github.com/eddmpython/eddmpython-course ../../eddmpython-course
```

## 수강생이 교안을 보는 곳

강의장이다. 2026-08-19 에 짓고 2026-08-20 에 다시 지었다. 절차의 정본은
`skills/specs/operation/classroom.md` 이고 설계 근거는 `../eddmpython-course/memory/courseRoom.md` 에 있다.

- 운영 화면은 운영자 노트북에만 있다. 공개 서버에 운영자 페이지는 없다
- 방을 만들면 그 자리에서 주소가 살아나고 비밀번호도 거기서 건다
- **운영자가 클릭한 카테고리만 열린다.** 닫힌 것은 가리는 것이 아니라 안 준다

Cloudflare Access 를 쓰지 않는다. 오프라인이고 인원이 고정이며 강의가 끝나면 닫으므로 암호가
새도 수명이 짧다. 반대로 Access 는 학생마다 계정 인증을 요구해서 강의장에서 여러 명이 동시에
처음 로그인할 때 가장 취약하고, 그 순간이 하필 오프라인 강의의 핵심 장면이다.

나중에 원격 수강이나 상시 열람 때문에 수강생을 Access 로 받게 되면 그때 아래를 참고한다.

- 좌석은 등록이 아니라 인증할 때 소모된다. 무료 좌석은 50 석이다
- 다 차면 새 사용자의 로그인이 막히고 기존 사용자는 영향이 없다
- 1 개월에서 1 년 사이 미접속자를 자동으로 빼는 설정이 있으며 하루 한 번 돈다
- **확인하지 않은 것**: 50 석을 넘겼을 때의 사용자당 단가. 결제 전에 대시보드에서 직접 확인한다

관련 문서는
[Zero Trust 좌석 관리](https://developers.cloudflare.com/cloudflare-one/team-and-resources/users/seat-management/)
와 [Access 정책](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/) 이다.
