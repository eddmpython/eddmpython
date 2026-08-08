---
id: operation.domains
title: 도메인과 DNS
category: operation
purpose: 어느 호스트네임이 어느 워커에 붙어 있고 DNS 에서 무엇을 지우면 안 되는지 정한다.
whenToUse:
  - 도메인 구조
  - apex 가 어디로 가나
  - DNS 레코드를 지워도 되나
  - 커스텀 도메인 붙이기
  - xlpod 건드리지 않기
  - 서브도메인 추가
verify:
  - curl -s -o /dev/null -w "%{http_code}\n" https://eddmpython.com/
  - curl -s -o /dev/null -w "%{http_code}\n" https://xlpod.eddmpython.com/
status: observed
---

# 도메인과 DNS

## 호스트네임 지도

`eddmpython.com` 영역 하나에 여러 제품이 함께 산다. **이 저장소가 소유하는 것은 위 두 줄뿐이다.**

| 호스트네임 | 워커 | 소유 |
|---|---|---|
| `eddmpython.com` | `eddmpython-site` | 이 저장소 |
| `www.eddmpython.com` | `eddmpython-site` | 이 저장소 |
| `xlpod.eddmpython.com` | `xlpod` | xlpod 저장소 |
| `relay.xlpod.eddmpython.com` | `xlpod-relay` | xlpod 저장소 |
| `api.eddmpython.com` | `eddmpython-control` | 이전 스택 잔재 |

아래 세 줄은 **다른 제품의 실서비스다. 이 저장소 작업으로 절대 건드리지 않는다.**
배포 후 확인에 xlpod 응답을 넣는 이유가 이것이다.

`api.eddmpython.com` 은 옛 스택에서 남은 워커다. 참조처를 확인하기 전에는 지우지 않는다.

## DNS 에서 지우면 안 되는 것

`eddmpython.com` 영역의 레코드 중 아래는 **삭제 금지다.**

- `MX` 세 줄과 `TXT` (SPF, DKIM, google-site-verification) 는 메일과 도메인 인증이다.
  지우면 메일이 죽는다.
- `xlpod`, `relay.xlpod`, `api` 의 Worker 레코드는 위 표의 다른 제품 것이다.

## 커스텀 도메인을 워커에 붙일 때

같은 호스트네임에 **수동으로 만든 A 나 AAAA 레코드가 있으면 붙지 않는다.**
Cloudflare 가 "externally managed DNS records" 로 거부한다 (오류 코드 100117).
override 플래그로도 통과하지 않는다.

절차는 이렇다.

1. 해당 호스트네임의 `A`, `AAAA` 레코드를 DNS 에서 삭제한다
2. `wrangler.jsonc` 의 `routes` 에 `{ "pattern": "...", "custom_domain": true }` 를 넣는다
3. `wrangler deploy` 한다. Cloudflare 가 Worker 레코드를 새로 만든다

apex 를 옮길 때 옛 워커가 zone route 로 잡고 있었다면 그 route 도 지워야 한다.
route 가 살아 있으면 커스텀 도메인보다 먼저 먹는다.

## HTTPS 와 www

워커가 처리하지 않는다. **Cloudflare 영역 설정이 맡는다.**

워커 안에 HTTPS 강제와 www 정리를 넣었다가 뺐다. 로컬 개발이 http 라 리다이렉트에
걸리고, 자산 요청까지 리다이렉트되어 개발이 막혔다. 영역 기능으로 하는 것이 맞다.

## 되돌리기

커스텀 도메인 부착은 `wrangler.jsonc` 의 `routes` 에서 해당 줄을 지우고 배포하면 떨어진다.
DNS 레코드 삭제는 되돌릴 수 없으니 지우기 전에 값을 적어 둔다.
