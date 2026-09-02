/**
 * 정적 자산 서빙 + 제품 문서 프록시 + 보안 헤더.
 *
 * 랜딩은 빌드 타임에 모든 경로가 HTML 로 나오므로 SPA fallback 이 필요 없다.
 * 없는 경로는 404 를 유지하되 빈 화면 대신 브랜드 화면을 그린다.
 * HTTPS 강제와 www 정리는 Cloudflare 영역 설정이 맡는다.
 */

/**
 * 제품 문서를 이 도메인의 하위 경로로 서빙한다.
 *
 * 왜 서브도메인이 아니라 하위 경로인가. 검색엔진은 서브도메인을 거의 별개 사이트로
 * 다룬다. 하위 경로로 모으면 권위가 한 호스트에 쌓인다. 두 사이트 모두 GitHub
 * 프로젝트 페이지라 내부 링크와 자산이 이미 같은 접두어를 쓰고 있어 경로 재작성이
 * 필요 없다 (접두어 없는 절대경로 0 개를 확인했다).
 *
 * 지금 단계에서는 원본의 canonical 을 건드리지 않는다. 두 주소가 같은 내용을 내지만
 * canonical 이 원본을 가리키므로 색인은 움직이지 않는다. 색인을 옮기는 것은 각 제품
 * 저장소에서 canonical 과 sitemap 을 바꾸는 다음 단계다.
 */
const PROXIED: Record<string, string> = {
  dartlab: "https://eddmpython.github.io",
  codaro: "https://eddmpython.github.io",
  pyproc: "https://eddmpython.github.io",
};

/** 예전 블로그 URL. 공개 경로는 짧은 slug만 쓴다. */
const LEGACY_BLOG: Record<string, string> = {
  "/blog/2026-08-09-codaro-guide": "/blog/no-install",
  "/blog/2026-08-08-ai-needs-an-environment": "/blog/ai-environment",
  "/blog/run-python-without-install": "/blog/no-install",
  "/blog/ai-needs-an-environment": "/blog/ai-environment",
  // 2026-08-19 에 커리큘럼 네 편을 유료 강의로 옮기고 공개를 닫았다. 본문은 공개하지 않고
  // 이미 색인된 주소만 목록으로 넘겨 죽은 링크를 막는다.
  "/blog/what-automation-does": "/blog",
  "/blog/what-is-python": "/blog",
  "/blog/first-python-code": "/blog",
  "/blog/python-basic-syntax": "/blog",
};

// 프레임 조상 차단과 리소스 출처 제한. pyodide 는 CDN 에서 받고 WASM 을 컴파일한다.
// 프록시하는 제품 문서에는 적용하지 않는다. 각 제품이 자기 출처를 따로 쓴다.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.threads.com",
  "connect-src 'self' https://cdn.jsdelivr.net https://pypi.org https://files.pythonhosted.org https://huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co",
  "media-src 'self' https:",
  "frame-src https://www.youtube-nocookie.com https://www.threads.com",
  "worker-src 'self' blob:",
].join("; ");

// AdSense는 광고 공급 도메인이 바뀔 수 있어 고정 출처 목록을 지원하지 않는다.
// 자동 광고 코드가 있는 글 상세 응답만 HTTPS 하위 리소스를 허용하고 나머지는 기존 CSP를 유지한다.
const ADSENSE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  // giscus 는 자기 스타일시트 link 를 이 페이지의 head 에 직접 꽂는다. iframe 안이 아니라
  // 바깥이라 이 목록에 없으면 막힌다. 아바타 이미지와 GitHub API 호출은 iframe 안에서
  // 일어나므로 img-src 와 connect-src 에는 넣지 않는다.
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://giscus.app",
  // 아래 script-src 와 frame-src 의 https: 가 giscus 의 client.js 와 iframe 을 이미 덮는다.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https:",
  "connect-src 'self' https:",
  "media-src 'self' https:",
  "frame-src https:",
  "worker-src 'self' blob:",
].join("; ");

function isAdSenseArticle(pathname: string): boolean {
  return /^\/blog\/[^/]+$/.test(pathname);
}

function withHeaders(res: Response, isHtml: boolean, adsense = false): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(securityHeaders)) headers.set(k, v);
  // 응답이 자기 CSP 를 이미 달고 왔으면 덮어쓰지 않는다. 강의장은 인라인 스크립트에
  // nonce 를 붙여 자기 정책을 낸다. 여기서 덮으면 확대와 실시간 동기화가 죽는다.
  if (isHtml && !headers.has("content-security-policy")) {
    headers.set("content-security-policy", adsense ? ADSENSE_CSP : CSP);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/** /dartlab/* 를 GitHub Pages 의 같은 경로로 넘긴다. 경로는 그대로 유지한다. */
async function proxy(request: Request, url: URL, origin: string) {
  const upstream = new URL(url.pathname + url.search, origin);
  const res = await fetch(upstream.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  });

  const headers = new Headers(res.headers);

  // 업스트림이 자기 호스트로 돌려보내면 우리 호스트로 되돌린다.
  const loc = headers.get("location");
  if (loc) {
    try {
      const target = new URL(loc, origin);
      if (target.origin === origin) {
        headers.set("location", target.pathname + target.search + target.hash);
      }
    } catch {
      /* 상대 경로면 그대로 둔다 */
    }
  }

  for (const [k, v] of Object.entries(securityHeaders)) headers.set(k, v);
  // 원본이 어디서 왔는지 남긴다. 디버깅과 감사용이다.
  headers.set("x-eddm-proxy", origin.replace("https://", ""));

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

function redirect(to: string, requestUrl: URL): Response {
  const target = new URL(to, requestUrl.origin);
  target.search = requestUrl.search;
  target.hash = requestUrl.hash;
  return new Response(null, {
    status: 301,
    headers: {
      location: target.toString(),
      ...securityHeaders,
    },
  });
}

import { handleRoom } from "./classroom";
import { handleAdmin } from "./admin";
import { giscusThemeCss } from "./src/design";
import type { Env as SiteEnv } from "./env";
import { securityHeaders } from "./securityHeaders";

// Durable Object 는 저장소 모듈이 든다. 운영장과 강의방이 같은 것을 본다.
export { Classroom } from "./rooms";

export default {
  async fetch(request: Request, env: { ASSETS: Fetcher } & SiteEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    const legacy = LEGACY_BLOG[pathname] ?? LEGACY_BLOG[url.pathname];
    if (legacy) return redirect(legacy, url);

    /*
     * 댓글 위젯의 테마. giscus.app 의 iframe 이 이 파일을 받아 자기 head 에 넣는다.
     *
     * 정적 파일로 두지 않는 이유는 색의 정본이 design.ts 하나이기 때문이다. public 에 CSS 를
     * 두면 브랜드 색을 그 파일에 다시 적게 되고, 강조색을 갈 때 한 곳만 고치면 되는 약속이
     * 깨진다. 받아 가는 쪽이 다른 출처라 CORS 헤더가 필요하다.
     */
    if (pathname === "/giscus.css") {
      return new Response(giscusThemeCss(), {
        headers: {
          "content-type": "text/css; charset=utf-8",
          "access-control-allow-origin": "https://giscus.app",
          /*
           * 파일 이름에 내용 해시를 붙일 수 없다. 주소를 giscus 에 넘기는 쪽은 브라우저이고
           * 그 주소는 고정이라, 오래 캐시하면 브랜드 색을 갈아도 이미 방문한 사람은 옛 색을
           * 계속 본다. 600 바이트짜리라 매번 재검증해도 비용이 없다.
           */
          "cache-control": "no-cache",
          "x-content-type-options": "nosniff",
        },
      });
    }

    /**
     * 운영장. 모든 강의를 여기서 배선한다.
     *
     * 강의방보다 먼저 잡는다. 운영장이 위고 강의방은 그것이 만드는 여럿 중 하나다.
     * 둘 다 정적 자산보다 먼저 잡아야 index.html 로 새지 않는다.
     */
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const res = await handleAdmin(request, env as unknown as SiteEnv, url);
      return withHeaders(res, (res.headers.get("content-type") ?? "").includes("text/html"));
    }

    // 강의방. 교안 본문은 Worker 안에만 있고 인증을 통과한 요청에만 내려간다.
    if (pathname === "/room" || pathname.startsWith("/room/")) {
      const res = await handleRoom(request, env as unknown as SiteEnv, url);
      return withHeaders(res, (res.headers.get("content-type") ?? "").includes("text/html"));
    }
    // 전체 교안 검수 라우터는 LOCAL_PREVIEW_BYPASS와 로컬 호스트를 handleRoom이 함께 확인한다.
    if (pathname === "/room-test" || pathname.startsWith("/room-test/")) {
      const res = await handleRoom(request, env as unknown as SiteEnv, url);
      return withHeaders(res, (res.headers.get("content-type") ?? "").includes("text/html"));
    }

    const first = url.pathname.split("/")[1] ?? "";
    const upstream = PROXIED[first];
    if (upstream) return proxy(request, url, upstream);

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      const type = asset.headers.get("content-type") ?? "";
      const isHtml = type.includes("text/html");
      return withHeaders(asset, isHtml, isHtml && isAdSenseArticle(pathname));
    }

    const wantsHtml =
      request.method === "GET" &&
      (request.headers.get("sec-fetch-mode") === "navigate" ||
        (request.headers.get("accept") ?? "").includes("text/html"));

    if (!wantsHtml) return withHeaders(asset, false);

    const index = await env.ASSETS.fetch(new URL("/", url).toString());

    return withHeaders(
      new Response(index.body, { status: 404, headers: index.headers }),
      true,
    );
  },
};
