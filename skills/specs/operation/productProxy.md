---
id: operation.productProxy
title: 제품 문서 하위 경로 프록시
category: operation
purpose: DartLab, Codaro, pyproc 문서를 eddmpython.com 하위 경로로 서빙하는 구조와 그 이유, 아직 남은 단계를 정한다.
whenToUse:
  - dartlab 문서 주소
  - 왜 서브도메인이 아닌가
  - 프록시 끄기
  - 검색 결과 주소 바꾸기
  - canonical
verify:
  - curl -s -o /dev/null -w "%{http_code}\n" "https://eddmpython.com/dartlab/?cb=1"
  - curl -s "https://eddmpython.com/dartlab/" | grep -o 'rel="canonical" href="[^"]*"'
status: observed
---

# 제품 문서 하위 경로 프록시

## 무엇이 도는가

`site/worker.ts` 의 `PROXIED` 표에 있는 첫 경로 조각을 GitHub Pages 로 넘긴다.
경로는 그대로 유지한다.

```
eddmpython.com/dartlab/*   ->   eddmpython.github.io/dartlab/*
eddmpython.com/codaro/*    ->   eddmpython.github.io/codaro/*
eddmpython.com/pyproc/*    ->   eddmpython.github.io/pyproc/*
```

업스트림이 자기 호스트로 리다이렉트하면 `Location` 을 이 호스트로 되돌린다.
랜딩용 CSP 는 프록시 경로에 적용하지 않는다. 각 제품이 자기 출처를 쓰기 때문이다.

## 왜 만들었나

실측한 색인 분포다.

| 사이트 | 호스트 | URL 수 |
|---|---|---|
| DartLab | eddmpython.github.io | 615 |
| Codaro | eddmpython.github.io | 536 |
| xlpod | xlpod.eddmpython.com | 4 |
| eddmpython.com | apex | 3 |

**1,158 개 중 1,151 개가 GitHub 도메인에 있었다.** 브랜드 도메인이 아니라 남의 도메인에
검색 자산이 쌓이는 상태였다.

## 왜 서브도메인이 아니라 하위 경로인가

검색엔진은 서브도메인을 거의 별개 사이트로 다룬다. `dartlab.eddmpython.com` 으로 옮겨도
apex 가 쌓은 것을 물려받지 못한다. 하위 경로라야 한 호스트에 모인다.

그리고 하위 경로면 **공개 주소가 호스팅 업체에서 독립한다.** 지금은 GitHub Pages 지만
뒤에서 무엇으로 바꾸든 밖에서 보이는 주소는 그대로다.

## 왜 이 저장소에서 가능했나

실측으로 확인한 두 가지다.

1. apex 에 이미 워커가 있어 프록시를 붙일 자리가 있었다
2. 두 사이트가 GitHub **프로젝트 페이지**라 자산 경로가 전부 상대경로거나
   `/dartlab/`, `/codaro/` 접두어다. **접두어 없는 절대경로가 0 개다.**
   그래서 경로 재작성 없이 그대로 넘길 수 있다

두 번째가 깨지면 (제품 사이트가 루트 절대경로를 쓰기 시작하면) 이 구조는 무너진다.
제품 쪽에서 빌드 base 를 바꿀 때 이 문서를 확인한다.

## 지금 색인은 움직이지 않는다

각 제품 페이지의 canonical 이 여전히 원본을 가리킨다.

```html
<link rel="canonical" href="https://eddmpython.github.io/dartlab/">
```

그래서 같은 내용이 두 주소에 있어도 구글은 원본만 색인한다. 중복 문제도 생기지 않는다.
**의도한 상태다.** 되돌리기 쉬운 지점에서 멈춰 둔 것이다.

## 다음 단계 (아직 안 함)

색인을 옮기려면 **각 제품 저장소**에서 두 가지를 바꾼다. 이 저장소 밖 작업이다.

1. canonical 을 `https://eddmpython.com/dartlab/...` 로 변경
2. 각 사이트맵의 호스트를 같이 변경

리다이렉트도 DNS 도 GitHub 설정도 필요 없다. `rel=canonical` 은 다른 도메인을 가리켜도
유효하다. GitHub Pages 는 커스텀 도메인을 걸면 301 을 내주지만 (mermaid, pnpm 에서 실측),
그 방식은 DNS 를 GitHub 으로 돌려야 해서 이 워커와 충돌한다.

옮기고 나면 apex 에 sitemap index 를 두어 1,158 개를 한 묶음으로 만든다.
몇 주간 순위가 출렁이는 구간이 있다.

## 위험

프록시를 켠 뒤 **이 워커가 전 제품 문서의 단일 장애점**이 된다. 서브도메인이면 각자
독립이라 하나 죽어도 나머지는 산다.

다만 이 워커는 이미 브랜드 사이트를 서빙하는 같은 인프라다. 죽으면 어차피 랜딩도 죽는다.
새 위험을 만드는 것이 아니라 기존 위험의 범위가 넓어지는 것으로 본다.

## 되돌리기

`site/worker.ts` 의 `PROXIED` 에서 해당 줄을 지우고 배포한다. 그 경로는 다시 404 가 되고
원본 주소만 남는다. 2 단계를 이미 했다면 제품 저장소의 canonical 도 원복해야 한다.
