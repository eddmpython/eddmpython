/**
 * 정적 자산 서빙 + 보안 헤더.
 * 블로그는 빌드 타임에 실제 HTML 로 나오므로 SPA fallback 이 필요 없다.
 * 없는 경로는 404 를 유지하되 빈 화면 대신 브랜드 화면을 그린다.
 * HTTPS 강제와 www 정리는 Cloudflare 영역 설정이 맡는다.
 */

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

    return withHeaders(
      new Response(index.body, { status: 404, headers: index.headers }),
      true,
    );
  },
};
