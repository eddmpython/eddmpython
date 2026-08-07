/**
 * 정적 자산 서빙 + SPA 라우트 + 보안 헤더.
 * HTTPS 강제와 www 정리는 Cloudflare 영역 설정이 맡는다.
 * 알려진 앱 경로만 index.html 로 되돌린다. 나머지는 진짜 404 를 낸다.
 */

const SPA_ROUTES = [/^\/blog(\/|$)/];

const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "cross-origin-opener-policy": "same-origin-allow-popups",
};

// 프레임 조상 차단과 리소스 출처 제한. pyodide 는 CDN 에서 받고 WASM 을 컴파일한다.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://www.threads.com",
  "connect-src 'self' https://cdn.jsdelivr.net https://pypi.org https://files.pythonhosted.org https://huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co",
  "frame-src https://www.youtube-nocookie.com https://www.threads.com",
  "worker-src 'self' blob:",
].join("; ");

function withHeaders(res: Response, isHtml: boolean): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  if (isHtml) headers.set("content-security-policy", CSP);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(request.url);

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      const type = asset.headers.get("content-type") ?? "";
      return withHeaders(asset, type.includes("text/html"));
    }

    const wantsHtml =
      request.method === "GET" &&
      (request.headers.get("sec-fetch-mode") === "navigate" ||
        (request.headers.get("accept") ?? "").includes("text/html"));

    if (!wantsHtml) return withHeaders(asset, false);

    const index = await env.ASSETS.fetch(new URL("/", url).toString());

    // 앱이 아는 경로면 SPA 로 넘긴다.
    if (SPA_ROUTES.some((re) => re.test(url.pathname))) {
      return withHeaders(
        new Response(index.body, { status: 200, headers: index.headers }),
        true,
      );
    }

    // 그 외에는 404 를 유지하되 빈 화면 대신 랜딩을 그린다.
    return withHeaders(
      new Response(index.body, { status: 404, headers: index.headers }),
      true,
    );
  },
};
