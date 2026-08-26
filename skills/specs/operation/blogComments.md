---
id: operation.blogComments
title: 블로그 댓글
category: operation
purpose: 글 아래 댓글을 GitHub Discussions 로 받는 배선과 그 화면이 브랜드를 입는 방법을 정한다.
whenToUse:
  - 댓글이 안 뜬다
  - giscus 설정
  - 댓글 색이 GitHub 초록이다
  - slug 를 바꾸는데 댓글이 걱정된다
  - 댓글을 끄고 싶다
verify:
  - cd site && npm run build
  - cd site && npm run blog:shot
status: observed
---

# 블로그 댓글

글 아래 댓글은 GitHub Discussions 를 giscus 로 띄운다. 컴포넌트는
`site/src/components/Comments.tsx` 하나이고 글 상세에만 붙는다.

댓글을 직접 만들면 저장소, 스팸 거르기, 신고 처리, 개인정보 보관이 전부 따라온다. 글 몇 편짜리
블로그가 질 부담이 아니다. Discussions 는 그 전부를 GitHub 이 지고 대화가 글과 같은 저장소에
남는다.

## 사전 조건 셋

giscus 는 이 셋이 다 맞아야 댓글을 받는다.

| 무엇 | 어디서 | 지금 |
|---|---|---|
| 저장소가 public | 저장소 Settings | 맞음 |
| Discussions 켜짐 | Settings > Features > Discussions | 맞음 |
| giscus 앱 설치 | https://github.com/apps/giscus | 맞음 |

앱이 빠지면 댓글이 보이기는 해도 쓰지 못한다. 화면에 뜨는 것만으로는 구별되지 않으므로
`npm run blog:shot` 으로 로그인 버튼이 나오는지 확인한다.

## 식별자

`Comments.tsx` 가 든 값은 복사본이고 GitHub 이 정본이다. 비밀이 아니라 공개 식별자다.

```powershell
gh api graphql -f query='query { repository(owner: \"eddmpython\", name: \"eddmpython\") {
  id discussionCategories(first: 20) { nodes { id name } } } }'
```

카테고리는 **Announcements** 를 쓴다. 그 형식이어야 새 discussion 을 관리자와 giscus 만 만들 수
있다. 다른 형식이면 아무나 글과 무관한 discussion 을 만들어 붙일 수 있다.

## 글과 스레드를 잇는 법

`data-mapping` 은 `specific` 이고 `data-term` 은 **글 폴더 이름**이다 (`003-python-qr`).

기본값인 `pathname` 을 쓰지 않는다. 이 사이트는 slug 를 바꾼 적이 있고 `worker.ts` 의
`LEGACY_BLOG` 에 옛 주소 여덟 개가 새 주소로 넘어가고 있다. pathname 으로 묶으면 slug 를 바꾸는
순간 그 글의 댓글이 전부 고아가 된다. 폴더 이름은 발행 순번을 달고 있어 거의 바뀌지 않는다.

**폴더 이름을 바꾸면 그 글의 댓글은 끊긴다.** 바꿔야 하면 Discussions 에서 그 글의 discussion
제목을 새 폴더 이름으로 함께 고친다.

`data-strict` 는 `1` 이다. 기본 매칭은 GitHub 의 제목 퍼지 검색이라 `005-python-...` 같은 글이
생기면 `003-python-qr` 과 토큰이 겹쳐 엉뚱한 스레드가 붙을 수 있다. strict 는 제목 대신 본문에
박힌 SHA-1 로 찾는다.

discussion 은 미리 만들지 않는다. 첫 댓글을 쓰는 사람이 생기면 giscus 가 만든다. 미리 만들면
GitHub 검색 색인이 최종 일관성이라 만든 직후 giscus 가 못 찾고, 그 틈에 첫 방문자가 댓글을 달면
같은 글에 discussion 이 둘 생긴다.

## CSP

글 상세는 `worker.ts` 의 `ADSENSE_CSP` 를 받는다. `isAdSenseArticle` 이 경로로 판정하므로
`/blog/<slug>` 는 광고 유무와 상관없이 그 정책이다.

`frame-src` 와 `script-src` 의 `https:` 가 iframe 과 `client.js` 를 이미 덮는다. **`style-src` 에만
`https://giscus.app` 을 더했다.** giscus 는 자기 스타일시트 link 를 iframe 안이 아니라 이 페이지의
head 에 직접 꽂기 때문이다. 아바타 이미지와 GitHub API 호출은 iframe 안에서 일어나므로
`img-src` 와 `connect-src` 는 건드리지 않는다.

## 브랜드를 입히는 법

댓글은 giscus.app 이 iframe 으로 그리므로 이 사이트의 CSS 가 닿지 않는다. 유일한 통로는
`data-theme` 에 CSS 파일 주소를 주는 것이다.

그 파일은 `worker.ts` 의 `/giscus.css` 가 내고 내용은 `src/design.ts` 의 `giscusThemeCss()` 가
만든다. 정적 파일로 두지 않는 이유는 색의 정본이 `design.ts` 하나이기 때문이다. `public` 에 CSS 를
두면 브랜드 색을 거기 다시 적게 되고 강조색을 갈 때 한 곳만 고치면 되는 약속이 깨진다.

기본 테마를 그대로 쓰면 로그인 버튼이 GitHub 초록(`#238636`)으로 나온다. 그 초록은 남의 색이다.

### 셀렉터가 `main` 인 이유

**giscus 의 테마 파일은 변수를 `:root` 가 아니라 `main` 에 정의한다.** CSS 변수는 상속이라 버튼에
더 가까운 조상의 값이 이긴다. `:root` 에 적으면 `getComputedStyle(html)` 로는 우리 값이 보이는데
정작 버튼은 `main` 의 값을 쓴다. 변수가 먹은 것처럼 보이면서 화면은 그대로인 상태가 된다.

2026-08-26 에 그 상태를 실제로 만들었고 `scripts/giscus-probe.mjs` 로 iframe 안에 붙어 계산값을
읽고서야 알았다.

### 테마 CSS 를 캐시하지 않는다

파일 이름에 내용 해시를 붙일 수 없다. 주소를 giscus 에 넘기는 쪽은 브라우저이고 그 주소는
고정이라, 오래 캐시하면 브랜드 색을 갈아도 이미 방문한 사람은 옛 색을 계속 본다. 600 바이트라
매번 재검증해도 비용이 없어서 `no-cache` 로 둔다.

## 검수

```powershell
# Worker 를 띄운다. CSP 가 실제로 붙어야 하므로 vite preview 로는 성립하지 않는다
npx wrangler dev --port 8788 --persist-to ../../eddmpython.out/wrangler-state

npm run blog:shot                          # 로컬. 데스크톱과 모바일
node scripts/blog-shot.mjs https://eddmpython.com   # 운영
node scripts/giscus-probe.mjs https://eddmpython.com  # iframe 안의 실제 색
```

`blog-shot` 은 스타일시트가 CSP 를 통과했는지, iframe 이 떴는지, 대체 링크가 남아 있는지, 가로로
넘치지 않는지를 본다. `giscus-probe` 는 iframe 안에 붙어 버튼의 계산된 색을 읽는다.

**브랜드 색은 로컬 http 로 검수되지 않는다.** iframe 은 `https://giscus.app` 인데 테마 CSS 가
`http://localhost` 라, 부모 문서가 http 면 그 iframe 이 안전한 맥락을 잃어 CSS 가 적용되지 않는다.
같은 CSS 를 최상위로 열면 정상 적용된다. 색 확인은 운영 주소에서 한다.

## 대체 링크

댓글 제목 아래 GitHub Discussions 로 가는 링크를 함께 둔다. giscus.app 은 남의 서비스이고
2026-05-17 에 그 서비스를 쓰는 모든 사이트의 댓글이 한꺼번에 죽은 적이 있다. iframe 이 안 뜨는
날에도 이 링크는 산다. 서버 렌더 HTML 에 들어가므로 스크립트가 아예 안 돌아도 남는다.

## 되돌리기

| 무엇 | 어떻게 |
|---|---|
| 댓글을 끈다 | `Post.tsx` 에서 `<Comments />` 한 줄을 뺀다 |
| 브랜드 테마만 끈다 | `Comments.tsx` 의 `data-theme` 을 `transparent_dark` 로 되돌린다 |
| 스레드를 옮긴다 | Discussions 에서 그 discussion 의 제목을 새 폴더 이름으로 고친다 |

댓글을 꺼도 이미 쌓인 대화는 Discussions 에 그대로 남는다.
