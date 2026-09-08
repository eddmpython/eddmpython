/** 운영자 인증 뒤 Taxly 비공개 서비스의 실행 파일만 스트리밍한다. */
export async function taxlyDownload(request: Request, service: Fetcher | undefined): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!service) return new Response("다운로드 준비 중", { status: 503, headers });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
  }
  // 쿠키, 쿼리, 사용자 지정 경로와 인증 헤더는 제품 서비스로 전달하지 않는다.
  const response = await service.fetch(new Request("https://taxly.internal/launcher", { method: request.method }));
  if (response.status !== 200) {
    await response.body?.cancel();
    return new Response("다운로드 준비 중", { status: 503, headers });
  }
  const output = new Headers(headers);
  output.set("Content-Type", "application/octet-stream");
  output.set("Content-Disposition", 'attachment; filename="taxly.exe"');
  const length = response.headers.get("Content-Length");
  if (length && /^\d+$/.test(length)) output.set("Content-Length", length);
  return new Response(response.body, { headers: output });
}
