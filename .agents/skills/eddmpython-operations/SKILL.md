---
name: eddmpython-operations
description: eddmpython 브랜드 저장소의 사이트, 제품 카탈로그, 공개 AI 작업 템플릿, Cloudflare 배포, SEO, 시각 검증, 도메인, 자산, 비밀 경계 작업을 현재 Skill OS 계약에 맞게 탐색하고 검증한다. eddmpython 저장소 구조 파악, 랜딩이나 제품 정보 수정, 운영 절차 확인, 배포와 롤백, LLM 작업 환경 정리에 사용한다. 블로그 본문 집필과 교정에는 전역 blog-writing 스킬을 사용한다.
---

# eddmpython 운영 라우터

이 스킬은 운영 계약을 복제하지 않는다. 작업 종류를 판별하고 `skills/specs/`의 현재 정본으로 곧바로
연결한 뒤, 그 문서가 요구하는 검증과 정리까지 완료한다.

## 1. 진입점 읽기

다음 순서로 시작한다.

1. 로컬에 있는 `CLAUDE.md`와 `AGENTS.md`
2. `skills/README.md`
3. `skills/specs/start/eddmpythonSkillOs.md`
4. 작업에 해당하는 `skills/specs/operation/*.md`

블로그 글을 쓰거나 교정하는 요청이면 전역 `$blog-writing`을 먼저 사용하고, 발행 작업이 있으면
`operation/blogPublishing.md`와 필요한 운영 문서를 연다. 제품 소스 구현 요청이면 해당 제품
저장소로 이동한다. 이 저장소에는 제품 코어를 복제하지 않는다.

## 2. 작업별 정본 선택

| 작업 | 먼저 읽을 정본 |
|---|---|
| 사이트 배포와 롤백 | `operation/deploy.md`, `operation/visualVerification.md` |
| 도메인과 제품 문서 프록시 | `operation/domains.md`, `operation/productProxy.md` |
| 랜딩 카피와 제품 정보 | `operation/productMarketing.md`, `operation/seoContract.md` |
| 블로그 발행과 이미지 | `operation/blogPublishing.md`, `operation/blogCopy.md`, `operation/contentStrategy.md` |
| 브랜드 이미지와 OG | `operation/brandAssets.md` |
| 비밀과 공개 저장소 경계 | `operation/secrets.md` |
| 임시 산출물과 정리 | `operation/workspace.md` |

낯선 다중 모듈 변경은 `repo-graph map --repo .`로 구조를 먼저 좁힌다. 정확한 문구, 경로, 심볼 참조는
`rg`로 확인한다. 변경 뒤 영향 테스트를 고를 때만 `repo-graph impact <paths> --repo .`를 사용한다.

## 3. 구현 경계 지키기

- 랜딩의 숫자와 기능은 제품 저장소, 공식 릴리스, 라이브 표면 중 하나에서 실측한다
- 고객 인증, OAuth, 라이선스, 다운로드 권한은 각 제품 저장소에 남긴다
- 자격증명과 세션 값은 코드, 문서, 로그, 스크린샷에 쓰지 않는다
- 저장소 안에 임시 빌드, 브라우저 프로필, 스크린샷, Wrangler 상태를 남기지 않는다
- 사용자가 소유한 기존 변경과 겹치지 않게 정확한 경로만 수정하고 커밋한다

사이트나 문서가 실제 절차를 바꾸면 관련 `skills/specs/operation/` 문서를 같은 변경에 맞춘다.

## 4. 검증과 완료

운영 문서와 저장소 스킬은 다음 검사로 연결 상태를 확인한다.

```powershell
cd site
npm run check:skills
```

사이트 변경은 최소한 다음 두 게이트를 모두 통과한다.

```powershell
cd site
npm test
npm run build
```

화면을 바꿨다면 고정된 `pyproc`의 공개 제어 경로로 데스크톱과 모바일 증거를 캡처한다. 출력된 모든
스크린샷을 직접 확인한 뒤 해당 실행만 승인한다.

```powershell
cd site
npm run verify:visual
npm run approve:visual -- --run=<run-id>
npm run check:visual
```

공개 변경 요청은 `operation/deploy.md`의 preflight와 rollback 경계를 확인한 뒤 `npm run deploy`까지
수행한다. 캐시버스터가 붙은 실제 URL에서 본문, 메타데이터, 상태 코드를 다시 확인한다. 마지막에는
저장소 안의 `.wrangler`, `.tmp`, 빌드 산출물과 소유한 브라우저 프로세스가 남지 않았는지 확인한다.
