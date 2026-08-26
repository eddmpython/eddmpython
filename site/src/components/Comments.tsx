import { useEffect, useRef } from "react";

/*
 * 글 아래 댓글. GitHub Discussions 를 giscus 로 띄운다.
 *
 * **왜 자체 댓글이 아닌가.** 댓글을 직접 만들면 저장소, 스팸 거르기, 신고 처리, 개인정보
 * 보관이 전부 따라온다. 글 몇 편짜리 블로그가 질 부담이 아니다. Discussions 는 그 전부를
 * GitHub 이 지고, 대화가 저장소 안에 남아 글과 같은 자리에 보관된다.
 *
 * **왜 term 이 URL 이 아니라 폴더 이름인가.** giscus 의 기본 매핑은 pathname 이다. 그런데
 * 이 사이트는 slug 를 바꾼 적이 있다. worker.ts 의 LEGACY_BLOG 에 옛 주소 여덟 개가 새
 * 주소로 넘어가고 있다. pathname 으로 묶으면 slug 를 바꾸는 순간 그 글에 달린 댓글이 전부
 * 고아가 된다. 폴더 이름은 발행 순번을 앞에 달고 있어 거의 바뀌지 않는다.
 *
 * 폴더 이름을 바꾸면 그 글의 댓글은 끊긴다. 바꿔야 하면 Discussions 에서 그 글의 discussion
 * 제목을 새 폴더 이름으로 함께 고친다.
 *
 * **왜 strict 인가.** 기본 매칭은 GitHub 의 제목 퍼지 검색이다. 지금은 글이 적어 안 겹치지만
 * `005-python-...` 같은 글이 생기면 `003-python-qr` 과 토큰이 겹쳐 엉뚱한 스레드가 붙을 수
 * 있다. strict 는 제목 대신 본문에 박힌 SHA-1 로 찾아서 그 위험이 없다.
 *
 * **왜 링크를 같이 두나.** giscus.app 은 남의 서비스이고 2026-05-17 에 그 서비스를 쓰는 모든
 * 사이트의 댓글이 한꺼번에 죽은 적이 있다. iframe 이 안 뜨는 날에도 이 링크는 산다.
 */

/*
 * GitHub 이 정본이고 이 셋은 복사본이다. 비밀이 아니라 공개 식별자다.
 *
 * 다시 얻으려면:
 *   gh api graphql -f query='query { repository(owner: "eddmpython", name: "eddmpython") {
 *     id discussionCategories(first: 20) { nodes { id name } } } }'
 *
 * Announcements 를 쓰는 이유는 그 형식이어야 새 discussion 을 관리자와 giscus 만 만들 수
 * 있기 때문이다. 다른 형식이면 아무나 글과 무관한 discussion 을 만들어 붙일 수 있다.
 */
const REPO = "eddmpython/eddmpython";
const REPO_ID = "R_kgDOTwChOw";
const CATEGORY = "Announcements";
const CATEGORY_ID = "DIC_kwDOTwChO84DC5oO";

/*
 * 테마는 우리가 서빙한다. worker.ts 의 `/giscus.css` 가 design.ts 에서 만들어 낸다.
 *
 * giscus 기본 테마를 그대로 쓰면 로그인 버튼이 GitHub 초록으로 나온다. 이 저장소는 모든
 * 강조가 브랜드 색 하나에서 갈라지기로 되어 있어서 그 초록은 남의 색이다.
 *
 * 절대 URL 이어야 하고 현재 출처에서 만든다. 이 파일을 받아 가는 것은 giscus 서버가 아니라
 * 방문자의 브라우저라 로컬 개발에서도 그대로 돈다. 랜딩은 다크 고정이라 (App.tsx 가
 * designCssVars("dark") 를 박는다) 테마를 갈아 끼울 배선은 두지 않는다.
 */
const themeUrl = () => `${window.location.origin}/giscus.css`;

export function Comments({ postId }: { postId: string }) {
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = slot.current;
    /*
     * 이미 붙었으면 다시 붙이지 않는다. React StrictMode 는 개발에서 effect 를 두 번
     * 부르는데, 이 검사는 상태가 아니라 실제 DOM 을 보므로 두 번째 호출 때 이미 참이다.
     * 서버 렌더에서는 effect 가 아예 돌지 않아 script 가 나가지 않는다.
     */
    if (!host || host.hasChildNodes()) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    const attrs: Record<string, string> = {
      "data-repo": REPO,
      "data-repo-id": REPO_ID,
      "data-category": CATEGORY,
      "data-category-id": CATEGORY_ID,
      "data-mapping": "specific",
      "data-term": postId,
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": themeUrl(),
      "data-lang": "ko",
      /* iframe 의 src 요청 자체가 스크롤이 닿기 전까지 나가지 않는다. 그 안이 수십 KB 짜리 앱이다. */
      "data-loading": "lazy",
    };
    for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
    host.appendChild(script);
  }, [postId]);

  return (
    <section className="mt-16 border-t border-[var(--eddm-line-base)] pt-10">
      <h2 className="text-lg font-medium tracking-tight">댓글</h2>
      <p className="mt-2 text-sm text-ivory/45">
        GitHub 계정으로 답니다.{" "}
        <a
          href={`https://github.com/${REPO}/discussions`}
          className="underline underline-offset-4 transition-colors hover:text-ivory"
          target="_blank"
          rel="noreferrer"
        >
          GitHub 에서 바로 보기
        </a>
      </p>
      <div ref={slot} className="mt-6" />
    </section>
  );
}
