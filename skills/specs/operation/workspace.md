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
  - ls ../eddmpython.out
status: observed
---

# 작업 산출물과 임시 파일

## 저장소 안에 임시 파일을 만들지 않는다

`.gitignore` 에 있다는 것은 면제 사유가 아니다. 추적되지 않아도 작업 트리는 더러워진다.

빌드 산출물은 **저장소 밖 형제 폴더**로 나간다.

| 무엇 | 어디 |
|---|---|
| 클라이언트 빌드 | `../eddmpython.out/site-dist` |
| SSR 번들 | `../eddmpython.out/site-ssr` |
| 시각 검증 증거와 승인 | `../eddmpython.out/visual` |
| 옛 히스토리 백업 번들 | `../eddmpython.out/legacy-history-*.bundle` |

경로는 `site/vite.config.ts` 와 `site/wrangler.jsonc` 두 곳이 같은 값을 가리킨다.
한쪽만 고치면 배포가 옛 산출물을 올린다.

## 그럼에도 생기는 것

`wrangler` 는 `site/.wrangler` 를 만든다. 명령이 끝난 직후 같은 자리에서 지운다.
다음 작업으로 넘어가지 않는다.

```bash
cd site && rm -rf .wrangler
```

**지워지지 않으면 프로세스가 파일을 물고 있는 것이다.** 실측한 순서다.

1. `workerd.exe` 를 전부 종료한다
2. wrangler 나 miniflare 를 실행 중인 `node.exe` 를 종료한다
3. 다시 지운다

`wrangler dev` 를 여러 번 띄웠다면 종료된 줄 알았던 프로세스가 남아 있는 경우가 많다.

## 진단과 스크린샷

일회성 probe와 비교 이미지는 저장소 안에 만들지 않고 임시 폴더에서 만든 뒤 같은 턴에 지운다.
배포 승인에 쓰는 렌더 증거는 정식 경로인 `../eddmpython.out/visual/<run-id>`에 둔다. 구체적인 생성과
승인 계약은 [`operation.visualVerification`](visualVerification.md)을 본다.

## 파괴적 명령

경로를 명시해서만 쓴다. `git clean -fdx` 같은 전역 명령은 쓰지 않는다.
`rm -rf` 는 지울 경로가 위 목록에 해당하는지 확인하고 쓴다.

## 확인

작업을 끝낼 때 아래가 비어 있어야 한다.

```bash
git status --short
```

무언가 남았다면 그것이 산출물인지 실제 변경인지 판단하고, 산출물이면 지운다.
