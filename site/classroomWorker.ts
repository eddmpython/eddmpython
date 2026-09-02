/**
 * course 전용 배포 단위.
 *
 * `/admin`과 `/room`만 받아 강의장 런타임을 공개 사이트와 독립적으로 배포한다.
 * 교안 KV와 기존 사이트 Worker의 Durable Object를 그대로 쓰므로 교안과 방 상태를
 * 복제하지 않는다.
 */
import { handleAdmin } from "./admin";
import { handleRoom } from "./classroom";
import type { Env } from "./env";
import { securityHeaders } from "./securityHeaders";

function withClassroomHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return withClassroomHeaders(await handleAdmin(request, env, url));
    }
    if (pathname === "/room" || pathname.startsWith("/room/")) {
      return withClassroomHeaders(await handleRoom(request, env, url));
    }
    return withClassroomHeaders(new Response("Not Found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
