---
id: operation.secrets
title: 비밀정보와 공개 경계
category: operation
purpose: 공개 저장소에서 무엇을 커밋하면 안 되고 공개 전에 무엇을 확인하는지 정한다.
whenToUse:
  - 공개해도 되나
  - 자격증명 어디에 두나
  - 커밋 전 확인
  - 히스토리에 비밀이 있나
verify:
  - git show-ref
  - git rev-list --all --not main --count
  - git count-objects -vH
status: observed
---

# 비밀정보와 공개 경계

## 이 저장소는 공개된다

커밋하는 모든 것이 영구히 공개된다고 보고 쓴다. 지운 파일도 이력에 남는다.

## 자격증명

`.env`, `.dev.vars`, Cloudflare Secrets, GitHub Secrets 에만 둔다.
값을 Git, 로그, 예외 메시지, 문서, 스크린샷, 브라우저 번들에 남기지 않는다.

`wrangler` 는 OAuth 토큰을 사용자 홈의 설정 파일에 둔다. 저장소와 무관한 위치이며
그 경로나 값을 문서에 옮기지 않는다.

예제 환경 파일에는 변수 이름만 두고 값은 비운다. 서비스별로 최소권한 토큰을 따로 발급한다.

## 브라우저에 내보내지 않는 것

유료 제품 코어, 서명, 라이선스 판정, 배포 토큰은 번들에 넣지 않는다.
이 저장소는 브랜드 표면이고 인증과 라이선스는 각 제품이 소유한다.

## 공개 전 이력 검사

**현재 트리가 깨끗한 것으로 충분하지 않다.** 매달려 있는 ref 가 옛 커밋을 붙잡고 있으면
`git push --tags` 나 `--mirror` 한 번에 전부 공개된다.

```bash
git show-ref                          # main 과 origin 말고 다른 ref 가 있나
git rev-list --all --not main --count # main 밖 커밋 수. 0 이어야 한다
git count-objects -vH                 # 크기가 갑자기 크면 의심한다
```

실제로 이 저장소에서 걸렸던 일이다. 태그 하나와 `refs/codex/` 하나가 이전 플랫폼 커밋
252 개 (88MB) 를 붙잡고 있었고 그 안에 서비스계정 개인키와 API 키, 제3자 개인정보가 있었다.
`main` 자체는 깨끗했다.

처리한 방식은 이랬다.

1. `git bundle` 로 저장소 밖에 통째 백업한다. 데이터를 잃지 않고 되돌릴 수 있게 한다
2. ref 를 제거한다
3. `git reflog expire --expire=now --all && git gc --prune=now` 로 객체를 실제로 뺀다
4. 크기와 `--not main` 커밋 수로 확인한다. 88.28MB 에서 1.20MB 로 줄었다

**ref 를 지웠다고 자격증명이 안전해지는 것이 아니다.** 오래 노출됐던 값은 폐기하고
재발급한다.

## 커밋 규율

- `git add .` 과 `git add -A` 를 쓰지 않는다. 관련 경로만 정확히 stage 한다
- `npm test` 와 프로덕션 빌드가 통과할 때만 커밋한다
- push 와 history 재작성은 명시 지시를 받고 한다

## 라이선스 경계

코드는 MIT 다. 브랜드 자산 (이름, 로고, 워드마크, 제품 스크린샷) 은 예외다.
스크린샷에는 제3자 콘텐츠가 담긴다. 상장사 공시 본문, 한국거래소와 금융위원회가 공개하는
시세, 캡처된 화면 안의 플랫폼 상표다. 각 소유자의 것이며 제품이 동작하는 모습을 보이기
위해서만 실린다. 정본은 `LICENSE` 다.
