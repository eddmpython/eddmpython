/**
 * 운영자 바로 보기. eddmpython.com/master.
 *
 * 운영자가 비밀번호를 치지 않고 eddmpython 구글 계정으로 들어와, 강의방마다 열린 수업을
 * 미리보기로 바로 연다. 구글이 확인해 준 메일이 `MASTER_EMAIL` 하나일 때만 운영 세션을 낸다.
 * 세션은 비밀번호 로그인과 같은 운영 세션이라 `모든 운영 세션 끊기`가 함께 끊는다.
 *
 * 구글 로그인은 이 강의장이 가진 웹 클라이언트로 한다. 인증은 제품마다 따로 가진다.
 * 클라이언트 값은 Worker 시크릿 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에만 두고,
 * 둘 중 하나라도 없으면 이 주소는 들어가지 않고 비밀번호 로그인만 남는다.
 *
 * 수업 링크는 운영장의 미리보기(`/admin/students/<방>/preview`)로 간다. 미리보기는 읽기만
 * 하고 수강생 기록을 남기지 않으며 차례 잠금을 건너뛴다. 화면을 새로 만들지 않고 그 길을 쓴다.
 */
import { call, type PublicRoom } from "./rooms";
import { course, roomCourse } from "./course";
import { clearCookie, cookie, randomHex, readCookie, safeEqual } from "./auth";
import { adminCookie, googleReady, questionReturnTo, signedIn } from "./admin";
import { esc } from "./classroom-render";
import { header, page } from "./shell";
import { STUDENT_STYLE } from "./students";
import type { Env } from "./env";

/** 들어올 수 있는 구글 계정. 공개 연락처와 같은 eddmpython 계정 하나다. */
export const MASTER_EMAIL = "eddmpython@gmail.com";
const MASTER_PATH = "/master";
const VIEW_PATH = "/admin/master";
const STATE_COOKIE = "eddm_master";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

const MASTER_STYLE = `
.master-room{margin:1.2rem 0}
.master-room h2{margin:0}
.master-room details{margin:.6rem 0}
.master-posts{margin:.3rem 0 .6rem;padding-left:1.4rem;line-height:1.9}
`;

function callback(url: URL): string {
  return `${url.origin}${MASTER_PATH}/callback`;
}

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 토큰 끝점에서 TLS로 바로 받은 id_token이라 서명 대신 받는 쪽과 발급자, 만료를 본다.
 * 다른 곳에서 건네받은 토큰은 이 함수로 믿지 않는다.
 */
function idClaims(token: unknown): Record<string, unknown> | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const text = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "="));
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(text, c => c.charCodeAt(0))));
    return claims && typeof claims === "object" ? claims : null;
  } catch { return null; }
}

function gatePage(title: string, message: string, status: number, link: string, linkText: string, setCookie?: string): Response {
  return page({
    title: "강의방 바로 보기",
    style: STUDENT_STYLE,
    status,
    headers: { ...privateHeaders, ...(setCookie ? { "set-cookie": setCookie } : {}) },
    inner: `${header()}<main class="students"><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a class="button" href="${esc(link)}">${esc(linkText)}</a></p></main>`,
  });
}

function redirect(location: string, setCookie?: string[]): Response {
  const headers = new Headers({ ...privateHeaders, location });
  for (const value of setCookie ?? []) headers.append("set-cookie", value);
  return new Response(null, { status: 303, headers });
}

async function start(env: Env, url: URL): Promise<Response> {
  if (!googleReady(env)) return gatePage("구글 로그인 연결 전입니다", "지금은 강의 관리에서 비밀번호로 들어갑니다.", 503, "/admin", "강의 관리로 가기");
  const state = randomHex(16);
  const verifier = randomHex(32);
  const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const target = new URL(GOOGLE_AUTH);
  target.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: callback(url),
    response_type: "code",
    scope: "openid email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    login_hint: MASTER_EMAIL,
  }).toString();
  const returnTo = url.searchParams.get("returnTo") ?? "";
  return redirect(target.href, [cookie(STATE_COOKIE, `${state}.${verifier}.${encodeURIComponent(returnTo)}`, MASTER_PATH, url)]);
}

async function finish(request: Request, env: Env, url: URL): Promise<Response> {
  const clear = clearCookie(STATE_COOKIE, MASTER_PATH, url);
  const retry = (title: string, message: string, status: number) => gatePage(title, message, status, `${MASTER_PATH}/login`, "다시 들어가기", clear);
  if (!googleReady(env)) return gatePage("구글 로그인 연결 전입니다", "지금은 강의 관리에서 비밀번호로 들어갑니다.", 503, "/admin", "강의 관리로 가기", clear);
  if (url.searchParams.get("error")) return retry("구글 로그인을 마치지 못했습니다", "구글 화면에서 로그인을 끝내지 않았습니다.", 400);
  const [state = "", verifier = "", ...rest] = (readCookie(request, STATE_COOKIE) ?? "").split(".");
  const code = url.searchParams.get("code") ?? "";
  if (!state || !verifier || !code || !safeEqual(url.searchParams.get("state") ?? "", state)) {
    return retry("로그인 요청을 확인하지 못했습니다", "로그인을 시작한 창에서 다시 들어가 주세요.", 400);
  }
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callback(url),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  }).catch(() => null);
  const data = response?.ok ? ((await response.json().catch(() => null)) as Record<string, unknown> | null) : null;
  const claims = idClaims(data?.id_token);
  if (!claims || claims.aud !== env.GOOGLE_CLIENT_ID || !ISSUERS.has(String(claims.iss)) || !(Number(claims.exp) * 1000 > Date.now())) {
    return retry("구글 로그인을 확인하지 못했습니다", "잠시 뒤 다시 들어가 주세요.", 502);
  }
  if (!(claims.email_verified === true || claims.email_verified === "true") || String(claims.email ?? "").toLowerCase() !== MASTER_EMAIL) {
    return retry("들어갈 수 없는 계정입니다", "이 주소는 eddmpython 구글 계정으로만 들어갑니다.", 403);
  }
  let returnTo = "";
  try { returnTo = decodeURIComponent(rest.join(".")); } catch { returnTo = ""; }
  // 메일의 질문 링크로 왔으면 그 질문으로, 아니면 바로 보기 화면으로 간다.
  const location = returnTo.startsWith("/admin/students/questions") && questionReturnTo(returnTo) === returnTo ? returnTo : VIEW_PATH;
  return redirect(location, [clear, await adminCookie(env, url)]);
}

function roomHtml(room: PublicRoom, categories: ReturnType<typeof roomCourse>): string {
  const title = `<h2>${esc(room.title)}</h2><p class="muted small">/room/${esc(room.slug)}${room.open ? "" : " · 닫힘"}</p>`;
  // 닫힌 강의방은 수강생 화면이 '아직 열리지 않았습니다'만 보여 미리보기 링크를 걸지 않는다.
  if (!room.open) return `<section class="panel master-room">${title}<p class="muted">닫힌 강의방이라 미리보기가 열리지 않습니다.</p></section>`;
  const root = `/admin/students/${encodeURIComponent(room.id)}/preview`;
  const groups = categories.map(c => `<details><summary>${esc(c.title)} <span class="muted small">${c.posts.length}편</span></summary><ol class="master-posts">${c.posts.map(p => `<li><a href="${root}?lesson=${encodeURIComponent(`${c.slug}/${p.id}`)}" target="_blank" rel="noreferrer">${esc(p.title)}</a></li>`).join("")}</ol></details>`).join("");
  return `<section class="panel master-room"><div class="topline"><div>${title}</div><a class="button" href="${root}" target="_blank" rel="noreferrer">강의방 첫 화면</a></div>${groups || '<p class="muted">이 강의방에 넣은 수업이 없습니다.</p>'}</section>`;
}

async function view(env: Env): Promise<Response> {
  const listed = await call(env, { action: "list" });
  // 열린 강의방을 먼저 보이고 닫힌 강의방은 뒤에 둔다.
  const rooms = ((listed.data.rooms ?? []) as PublicRoom[]).slice().sort((a, b) => Number(b.open) - Number(a.open));
  const found = await course(env);
  const body = rooms.map(room => roomHtml(room, roomCourse(found.categories, room))).join("");
  return page({
    title: "강의방 바로 보기",
    style: STUDENT_STYLE + MASTER_STYLE,
    wide: true,
    headers: privateHeaders,
    inner: `${header()}<main class="students"><div class="topline"><h1>강의방 바로 보기</h1><form method="post" action="/admin/logout"><button>나가기</button></form></div><nav class="admin-nav"><a href="${VIEW_PATH}" aria-current="page">바로 보기</a><a href="/admin/students">수강자 관리</a><a href="/admin/students/questions">질문함</a><a href="/admin">강의장 설정</a></nav><p class="muted">수업을 누르면 수강생 화면 그대로 새 탭에 열립니다. 미리보기는 읽기만 하고 수강생 기록을 남기지 않습니다.</p>${found.ok ? "" : '<p class="message">교안 묶음을 읽지 못했습니다.</p>'}${body || '<p class="empty">아직 강의방이 없습니다.</p>'}</main>`,
  });
}

export async function handleMaster(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (request.method !== "GET") return new Response("not found", { status: 404, headers: privateHeaders });
  if (path === VIEW_PATH) return (await signedIn(env, request)) ? view(env) : redirect(`${MASTER_PATH}/login`);
  // 구글에 적어 둔 돌아올 주소는 eddmpython.com 하나다. www로 들어오면 그 주소로 옮긴다.
  if (url.hostname.startsWith("www.")) {
    const apex = new URL(url.href);
    apex.hostname = url.hostname.slice(4);
    return new Response(null, { status: 308, headers: { ...privateHeaders, location: apex.href } });
  }
  if (path === MASTER_PATH) return redirect(VIEW_PATH);
  if (path === `${MASTER_PATH}/login`) return start(env, url);
  if (path === `${MASTER_PATH}/callback`) return finish(request, env, url);
  return new Response("not found", { status: 404, headers: privateHeaders });
}
