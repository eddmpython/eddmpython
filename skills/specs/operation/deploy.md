---
id: operation.deploy
title: 배포와 롤백
category: operation
purpose: 이 사이트가 어디에 어떻게 배포되고 문제가 생기면 어떻게 되돌리는지 정한다.
whenToUse:
  - 어디에 배포되나
  - GitHub Pages 인가
  - 배포 명령
  - 롤백
  - 배포했는데 옛 내용이 나온다
  - CI 가 있나
verify:
  - cd site && npm test
  - cd site && npm run build
  - cd site && npm run check:visual
  - npx wrangler deployments list --name eddmpython-site
status: observed
---

# 배포와 롤백

## 어디에 배포되나

**Cloudflare Workers 다. GitHub Pages 가 아니다.**

| 항목 | 값 |
|---|---|
| 워커 이름 | `eddmpython-site` |
| 진입점 | `site/worker.ts` |
| 정적 자산 | `../../eddmpython.out/site-dist` (저장소 밖) |
| 도메인 | `eddmpython.com`, `www.eddmpython.com` |
| 설정 | `site/wrangler.jsonc` |

`.github/workflows` 가 없다. **CI 가 없고 배포는 운영자가 로컬에서 손으로 한다.**
자동 배포를 붙일 계획이 생기기 전까지 이 상태가 정상이다.

제품 문서 (`/dartlab`, `/codaro`, `/pyproc`) 는 이 워커가 GitHub Pages 로 넘긴다.
`operation.productProxy` 를 본다.

## 완료의 정의

사이트나 블로그의 공개 변경은 저장소 수정, Git push, Hugging Face 이미지 업로드, 프로덕션 빌드
중 어느 하나만 끝났다고 완료가 아니다. 수정, 개선, 발행 요청은 아래 세 단계가 모두 끝나야 완료다.

1. 테스트와 프로덕션 빌드가 통과한다.
2. 데스크톱과 모바일 렌더 증거를 실제로 확인하고 현재 빌드에 승인한다.
3. `eddmpython-site` Cloudflare Worker에 실제 배포한다.
4. 캐시버스터를 붙인 프로덕션 URL에서 변경 내용과 운영 경계를 확인한다.

초안 작성, 검토, 진단만 요청받은 경우에는 배포하지 않는다. 공개 변경을 요청받았다면 별도 배포
지시를 기다리지 않는다. **Git push는 메인 사이트 배포가 아니며 완료 조건을 충족하지 않는다.**

배포 전에는 Wrangler 로그인 계정, 대상 워커 이름, 현재 정상 배포의 version id를 확인한다. 배포 뒤
검증이 실패하면 원인을 먼저 확인하고, 새 배포가 운영을 깨뜨렸다면 기록한 version id로 롤백한다.

## 배포 절차

```bash
cd site
npm run build
npm run verify:visual
npm run approve:visual -- --run=<run-id>
npm run deploy
```

`deploy` 는 `build` 를 다시 돌린 뒤 승인된 빌드 지문과 현재 빌드 지문을 비교하고 Wrangler를 실행한다.
`build` 는 `test` 와 `verify:seo` 를 품는다. 시각 검증의 상세 계약은
[`operation.visualVerification`](visualVerification.md)을 본다.
즉 아래가 순서대로 통과해야 배포가 시작된다.

1. `check:blog` 글 파일과 frontmatter 검사
2. `tsc --noEmit` 타입 검사
3. `vite build` 클라이언트 번들, SSR 번들, 프리렌더, sitemap, RSS, favicon
4. `verify:seo` 빌드된 HTML 과 JSON-LD, sitemap, RSS 계약 확인
5. `verify:visual` 데스크톱과 모바일 렌더, 자동 화면 계약 확인
6. 모든 스크린샷의 실제 확인과 `approve:visual` 승인
7. `check:visual` 현재 빌드와 승인 지문 일치 확인
8. `wrangler deploy`

하나라도 실패하면 배포되지 않는다. 이 순서를 우회해 `wrangler deploy` 만 부르지 않는다.

## 배포 후 확인

```bash
for p in "" blog rss.xml sitemap.xml favicon.svg nope; do
  printf "%s /%s\n" "$(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: text/html' "https://eddmpython.com/$p")" "$p"
done
curl -s -o /dev/null -w "xlpod %{http_code}\n" https://xlpod.eddmpython.com/
```

기대값은 `/nope` 만 404 이고 나머지는 200 이다. xlpod 는 이 배포와 무관하므로
항상 200 이어야 한다. 값이 달라졌다면 이 배포가 남의 도메인을 건드린 것이다.

**배포 직후 옛 내용이 잠깐 나올 수 있다.** Cloudflare 엣지 캐시다. 실제로 바뀌었는지는
쿼리스트링을 붙여 확인한다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://eddmpython.com/블로그경로?cb=$(date +%s)"
```

캐시버스터로 기대값이 나오면 배포는 정상이고 캐시가 만료되기를 기다리면 된다.

블로그 변경은 상태 코드만 확인하지 않는다. 캐시버스터를 붙인 글 HTML에서 다음 값을 변경 계획과
대조한다.

- 모든 H2의 고유한 본문 이미지가 렌더됐는가
- `og:image`와 `twitter:image`가 의도한 Hugging Face 콘텐츠 주소 객체인가
- `/blog`, `rss.xml`, `sitemap.xml`에 새 글이나 수정 결과가 반영됐는가

이 확인 전에는 저장소, catalog, 원격 객체가 맞더라도 발행 완료라고 보고하지 않는다.

## 롤백

```bash
npx wrangler deployments list --name eddmpython-site
npx wrangler rollback <version-id>
```

버전 목록에서 직전 정상 버전의 id 를 골라 되돌린다. 자산과 워커 코드가 함께 돌아간다.

## 배포 후 정리

`wrangler` 가 `site/.wrangler` 를 만든다. **저장소 안에 남기지 않는다.**

```bash
cd site && rm -rf .wrangler
```

파일이 잠겨 지워지지 않으면 `workerd.exe` 와 wrangler 를 물고 있는 node 프로세스가
살아 있는 것이다. 먼저 끝내고 지운다. 자세한 규율은 `operation.workspace` 를 본다.

## 하지 않는 것

- 프로덕션 DNS 변경은 명시 지시를 받고 한다. `operation.domains` 를 본다.
- `wrangler deploy` 로 남의 워커 이름을 덮어쓰지 않는다. 계정에 xlpod 계열 워커가 함께 있다.
- 테스트와 빌드를 건너뛰고 배포하지 않는다.
