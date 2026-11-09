/**
 * 운영자 강의방. eddmpython.com/room/master.
 *
 * 운영자가 비밀번호를 치지 않고 eddmpython 구글 계정으로 들어와, 강의방 화면 그대로 전체 수업을
 * 본다. 구글이 확인해 준 메일이 `MASTER_EMAIL` 하나일 때만 이 강의방 세션을 낸다. 세션은 운영
 * 세션 세대에 묶여 `모든 운영 세션 끊기`가 함께 끊는다.
 *
 * 강의방 화면은 `classroom.ts`의 `handleRoom`이 가상 방(`master`)으로 그린다. 이 파일은 그 앞에서
 * 구글 로그인과 세션 확인만 한다. 가상 방은 읽기만 하고 수강생 기록을 남기지 않으며 차례 잠금을
 * 건너뛴다.
 *
 * 구글 로그인은 이 강의장이 가진 웹 클라이언트로 한다. 인증은 제품마다 따로 가진다.
 * 클라이언트 값은 Worker 시크릿 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에만 두고,
 * 둘 중 하나라도 없으면 이 강의방은 들어가지 않는다.
 */
import { call } from "./rooms";
import { checkToken, clearCookie, cookie, issueToken, randomHex, readCookie, safeEqual } from "./auth";
import { adminCookie, googleReady, questionReturnTo } from "./admin";
import { esc } from "./classroom-render";
import { header, page } from "./shell";
import { STUDENT_STYLE } from "./students";
import type { Env } from "./env";

/** 들어올 수 있는 구글 계정. 공개 연락처와 같은 eddmpython 계정 하나다. */
export const MASTER_EMAIL = "eddmpython@gmail.com";
/** 운영자 강의방의 방 이름과 주소. 저장된 강의방은 이 이름을 쓰지 못한다(`rooms.ts` RESERVED). */
export const MASTER_SLUG = "master";
export const MASTER_ROOT = `/room/${MASTER_SLUG}`;
const SESSION_COOKIE = "eddm_master";
const STATE_COOKIE = "eddm_master_state";
const SUBJECT = "master";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

function callback(url: URL): string {
  return `${url.origin}${MASTER_ROOT}/callback`;
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
    title: "운영자 강의방",
    style: STUDENT_STYLE,
    status,
    headers: { ...privateHeaders, ...(setCookie ? { "set-cookie": setCookie } : {}) },
    inner: `${header()}<main class="students"><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a class="button" href="${esc(link)}">${esc(linkText)}</a></p></main>`,
  });
}

const notReady = (setCookie?: string) => gatePage("구글 로그인 연결 전입니다", "구글 로그인을 연결하면 이 주소에서 eddmpython 구글 계정으로 바로 들어갑니다.", 503, "/admin", "강의 관리로 가기", setCookie);

function redirect(location: string, setCookie?: string[]): Response {
  const headers = new Headers({ ...privateHeaders, location });
  for (const value of setCookie ?? []) headers.append("set-cookie", value);
  return new Response(null, { status: 303, headers });
}

/** 로그인 뒤 돌아갈 곳. 이 강의방 안의 주소와 운영장 질문 링크만 받는다. */
function returnPath(returnTo: string): string {
  if (returnTo.startsWith("/admin/students/questions") && questionReturnTo(returnTo) === returnTo) return returnTo;
  const inRoom = returnTo === MASTER_ROOT || (returnTo.startsWith(`${MASTER_ROOT}/`) && /^[a-zA-Z0-9/_.-]*$/.test(returnTo) && !returnTo.includes("//") && !returnTo.includes(".."));
  return inRoom && !/^\/room\/master\/(login|callback)$/.test(returnTo) ? returnTo : MASTER_ROOT;
}

async function adminSession(env: Env): Promise<{ key: string; gen: string }> {
  const { data } = await call(env, { action: "adminSession" });
  return { key: String(data.key ?? ""), gen: String(data.gen ?? "") };
}

async function start(env: Env, url: URL): Promise<Response> {
  if (!googleReady(env)) return notReady();
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
  return redirect(target.href, [cookie(STATE_COOKIE, `${state}.${verifier}.${encodeURIComponent(returnTo)}`, MASTER_ROOT, url)]);
}

async function finish(request: Request, env: Env, url: URL): Promise<Response> {
  const clear = clearCookie(STATE_COOKIE, MASTER_ROOT, url);
  const retry = (title: string, message: string, status: number) => gatePage(title, message, status, `${MASTER_ROOT}/login`, "다시 들어가기", clear);
  if (!googleReady(env)) return notReady(clear);
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
  const { key, gen } = await adminSession(env);
  // 운영장 세션도 같이 준다. 메일의 질문 링크로 온 운영자는 그 질문으로 돌아간다.
  return redirect(returnPath(returnTo), [clear, cookie(SESSION_COOKIE, await issueToken(key, SUBJECT, gen), MASTER_ROOT, url), await adminCookie(env, url)]);
}

/**
 * `/room/master` 아래 요청의 문. 로그인과 돌아오는 주소는 여기서 끝내고, 세션이 맞으면
 * `null`을 돌려 `handleRoom`이 가상 방을 그리게 한다.
 */
export async function masterGate(request: Request, env: Env, url: URL): Promise<Response | null> {
  const path = url.pathname.replace(/\/$/, "");
  // 구글에 적어 둔 돌아올 주소는 eddmpython.com 하나다. www로 들어오면 그 주소로 옮긴다.
  if (url.hostname.startsWith("www.")) {
    const apex = new URL(url.href);
    apex.hostname = url.hostname.slice(4);
    return new Response(null, { status: 308, headers: { ...privateHeaders, location: apex.href } });
  }
  if (path === `${MASTER_ROOT}/login` || path === `${MASTER_ROOT}/callback`) {
    if (request.method !== "GET") return new Response("not found", { status: 404, headers: privateHeaders });
    return path.endsWith("/login") ? start(env, url) : finish(request, env, url);
  }
  const { key, gen } = await adminSession(env);
  if (key && gen && await checkToken(key, readCookie(request, SESSION_COOKIE), SUBJECT, gen)) return null;
  if (request.method !== "GET") return Response.json({ error: "로그인이 필요합니다" }, { status: 401, headers: privateHeaders });
  if (!googleReady(env)) return notReady();
  return redirect(`${MASTER_ROOT}/login?returnTo=${encodeURIComponent(path)}`);
}

/** 옛 주소(`/master`, `/admin/master`)는 운영자 강의방으로 옮긴다. */
export async function handleMaster(request: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (request.method !== "GET") return new Response("not found", { status: 404, headers: privateHeaders });
  if (path === "/master/login") return redirect(`${MASTER_ROOT}/login${url.search}`);
  if (path === "/master" || path === "/admin/master") return redirect(MASTER_ROOT);
  return new Response("not found", { status: 404, headers: privateHeaders });
}
