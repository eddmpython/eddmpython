---
id: start.localSetup
title: 받아서 돌리기
category: start
purpose: 저장소를 받은 뒤 개발 서버를 띄우고 검사를 돌리기까지의 최소 절차.
whenToUse:
  - 처음 설치
  - 개발 서버
  - 어떤 명령이 있나
  - 빌드가 안 된다
verify:
  - cd site && npm install
  - cd site && npm test
status: observed
---

# 받아서 돌리기

## 필요한 것

- Node.js 와 npm
- Python (블로그 미디어 검증 스크립트가 쓴다)
- Chromium 계열 브라우저. 랜딩의 실행 셀이 요구한다

배포까지 하려면 Cloudflare 계정 접근이 필요하다. `npx wrangler login` 으로 붙는다.

## 설치와 실행

```bash
cd site
npm install
npm run dev
```

## 명령

| 명령 | 무엇 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run check:blog` | 글 파일과 frontmatter 검사 |
| `npm run test:blog-package` | SEO 제목, 섹션 구성, 이미지 브리프 표본 검사 |
| `npm run check:skills` | 운영 문서 frontmatter 와 링크 검사 |
| `npm run verify:media` | catalog 에 등록한 원격 이미지 확인 |
| `npm run verify:seo` | 빌드된 HTML, JSON-LD, sitemap, RSS 계약 확인 |
| `npm test` | 위 검사들과 타입 체크 |
| `npm run build` | 프로덕션 빌드. `test` 와 `verify:seo` 를 품는다 |
| `npm run og` | og 이미지 다시 만들기 |
| `npm run deploy` | 빌드 후 Cloudflare Workers 배포 |

## 알아 둘 것

- **빌드 산출물은 저장소 밖으로 나간다.** `../eddmpython.out/` 을 본다
- 글은 `site/` 가 아니라 저장소 루트 `blog/` 에 있다. dev 서버가 그 폴더를 읽도록
  `server.fs.allow` 가 열려 있다
- 랜딩의 실행 셀은 처음 누를 때 Python 런타임을 내려받는다. 30초쯤 걸리고
  Chromium 계열에서만 동작한다

## 다음

- 이 저장소의 경계는 [`start.eddmpythonSkillOs`](eddmpythonSkillOs.md)
- 배포와 롤백은 [`operation.deploy`](../operation/deploy.md)
