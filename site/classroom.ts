/**
 * 강의장. 운영자가 자기 노트북의 운영 화면에서 방을 만들고 그 자리에서 비밀번호를 건다.
 *
 * 설계 근거는 memory/courseRoom.md 다. 원칙 넷이다.
 *
 * 1. 운영 화면은 로컬호스트에만 있다. 공개 서버에는 운영자용 페이지가 없다
 * 2. 방은 실행 중에 생긴다. 만드는 즉시 /cr/<이름> 주소가 살아난다. 배포가 필요 없다
 * 3. 비밀번호는 방을 만들 때 그 자리에서 건다. Worker secret 이 아니라 방의 상태다
 * 4. 닫힌 카테고리의 본문은 아예 안 내려간다. 가리는 것이 아니라 안 주는 것이다
 *
 * 4번이 이 파일이 존재하는 이유다. 클라이언트에서 거르면 개발자 도구로 앞 내용을 먼저 본다.
 */
import { esc, renderMarkdown } from "./classroom-render";

export type Env = {
  CLASSROOM: DurableObjectNamespace;
  /** 교안 묶음이 들어 있다. eddmpython-course 저장소가 발행한다. */
  COURSE: KVNamespace;
  /** 로컬 운영 화면이 이 Worker 를 조종할 때 쓰는 토큰. 배포 때 한 번 넣는 유일한 비밀값이다. */
  CR_ADMIN_TOKEN?: string;
};

export type CoursePost = { id: string; title: string; summary: string; body: string };
export type CourseCategory = { slug: string; order: number; title: string; posts: CoursePost[] };
type CourseBundle = { schema: number; categories: CourseCategory[] };

/** 묶음의 모양은 eddmpython-course 와의 계약이다. 바꾸면 양쪽을 같은 날 같이 고친다. */
const COURSE_SCHEMA = 1;

/**
 * 교안을 KV 에서 읽는다.
 *
 * **이 저장소에는 교안 글자가 한 자도 없다.** 예전에는 빌드 때 교안 폴더를 읽어 Worker
 * 번들에 구웠다. 그러면 교안을 한 줄 고칠 때마다 공개 사이트를 통째로 배포해야 했고,
 * 공개 저장소 옆에 파는 물건을 두고 훅과 누출 검사로 지켜야 했다.
 *
 * 이제 교안은 비공개 저장소가 KV 로 따로 발행한다. 사이트 배포와 교안 발행이 서로를
 * 기다리지 않는다.
 */
async function course(env: Env): Promise<CourseCategory[]> {
  const bundle = await env.COURSE.get<CourseBundle>("bundle", { type: "json", cacheTtl: 60 });
  if (!bundle || bundle.schema !== COURSE_SCHEMA) return [];
  return [...bundle.categories].sort((a, b) => a.order - b.order);
}

/** 방 하나. 비밀번호는 원문을 두지 않고 salt 를 섞어 늘린 해시만 둔다. */
export type Room = {
  slug: string;
  title: string;
  open: boolean;
  unlocked: string[];
  salt: string;
  hash: string;
  /** 세션 세대. 비밀번호를 바꾸면 새로 뽑아 그 전에 들어온 사람을 전부 내보낸다. */
  gen: string;
  created: number;
  fails: number;
  lockedUntil: number;
};

/** 운영 화면에 보내는 모양. 해시와 salt 는 빼고 보낸다. */
export type PublicRoom = {
  slug: string;
  title: string;
  open: boolean;
  unlocked: string[];
  gen: string;
  created: number;
  lockedUntil: number;
};

const SESSION_COOKIE = "cr_room";
const SESSION_TTL_SEC = 60 * 60 * 12;
const MAX_FAILS = 8;
const LOCK_MS = 5 * 60 * 1000;

const enc = new TextEncoder();

const ROOM_SLUG = /^[a-z0-9][a-z0-9-]{1,30}$/;
const RESERVED = new Set(["api", "login", "state", "admin"]);

export function validSlug(slug: string): boolean {
  return ROOM_SLUG.test(slug) && !RESERVED.has(slug);
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** 강의장 비밀번호는 짧다. 그대로 해시하면 금방 뒤집히므로 반복해서 늘린다. */
async function stretch(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return hex(bits);
}

/** 길이가 같으면 전부 비교한다. 타이밍으로 비밀번호를 재는 것을 막는다. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function publicRoom(room: Room): PublicRoom {
  return {
    slug: room.slug,
    title: room.title,
    open: room.open,
    unlocked: room.unlocked,
    gen: room.gen,
    created: room.created,
    lockedUntil: room.lockedUntil,
  };
}

/* 상태 보관 ------------------------------------------------------------- */

/**
 * 강의장 전체를 든다. 방 목록, 방마다의 열림 상태, 세션 서명 키가 여기 있다.
 * 인스턴스가 하나라 수강생이 여럿이어도 운영자 클릭이 모두에게 같게 반영된다.
 */
export class Classroom {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async rooms(): Promise<Map<string, Room>> {
    const found = await this.state.storage.list<Room>({ prefix: "room:" });
    return new Map([...found].map(([k, v]) => [k.slice(5), v]));
  }

  private async put(room: Room): Promise<void> {
    await this.state.storage.put(`room:${room.slug}`, room);
  }

  /** 쿠키 서명 키. 처음 필요할 때 만들어 두고 계속 쓴다. 배포 때 넣을 비밀값을 하나 줄인다. */
  private async signKey(): Promise<string> {
    const found = await this.state.storage.get<string>("signKey");
    if (found) return found;
    const made = randomHex(32);
    await this.state.storage.put("signKey", made);
    return made;
  }

  async fetch(request: Request): Promise<Response> {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const slug = typeof body.slug === "string" ? body.slug : "";
    const now = Date.now();

    if (action === "signKey") return Response.json({ key: await this.signKey() });

    if (action === "list") {
      const all = [...(await this.rooms()).values()].sort((a, b) => b.created - a.created);
      return Response.json({ rooms: all.map(publicRoom) });
    }

    if (action === "get") {
      const room = (await this.rooms()).get(slug);
      return Response.json({ room: room ? publicRoom(room) : null });
    }

    if (action === "create") {
      if (!validSlug(slug)) {
        return Response.json({ error: "주소로 쓸 수 없는 이름입니다" }, { status: 400 });
      }
      if ((await this.rooms()).has(slug)) {
        return Response.json({ error: "이미 있는 방입니다" }, { status: 409 });
      }
      const password = String(body.password ?? "");
      if (password.length < 4) {
        return Response.json({ error: "비밀번호는 네 자 이상입니다" }, { status: 400 });
      }
      const salt = randomHex(16);
      await this.put({
        slug,
        title: String(body.title ?? slug).slice(0, 60) || slug,
        // 만들면 바로 산다. 주소를 알려 주는 순간 들어올 수 있다.
        open: true,
        unlocked: [],
        salt,
        hash: await stretch(password, salt),
        gen: randomHex(8),
        created: now,
        fails: 0,
        lockedUntil: 0,
      });
      return Response.json({ ok: true });
    }

    const room = (await this.rooms()).get(slug);
    if (!room) return Response.json({ error: "없는 방입니다" }, { status: 404 });

    if (action === "remove") {
      await this.state.storage.delete(`room:${slug}`);
      return Response.json({ ok: true });
    }

    if (action === "password") {
      const password = String(body.password ?? "");
      if (password.length < 4) {
        return Response.json({ error: "비밀번호는 네 자 이상입니다" }, { status: 400 });
      }
      room.salt = randomHex(16);
      room.hash = await stretch(password, room.salt);
      // 세대를 새로 뽑아 앞의 세션을 전부 끊는다. 안 그러면 이미 들어온 사람이 그대로 남는다.
      room.gen = randomHex(8);
      room.fails = 0;
      room.lockedUntil = 0;
      await this.put(room);
      return Response.json({ ok: true });
    }

    if (action === "open") {
      room.open = Boolean(body.open);
      // 방을 닫으면 잠금도 처음으로 되돌린다. 다음 강의가 앞 강의 상태를 물려받지 않는다.
      if (!room.open) room.unlocked = [];
      await this.put(room);
      return Response.json({ ok: true });
    }

    if (action === "toggle") {
      const category = String(body.category ?? "");
      const at = room.unlocked.indexOf(category);
      if (at >= 0) room.unlocked.splice(at, 1);
      else room.unlocked.push(category);
      await this.put(room);
      return Response.json({ ok: true });
    }

    if (action === "login") {
      if (room.lockedUntil > now) {
        return Response.json({ ok: false, retryAfter: Math.ceil((room.lockedUntil - now) / 1000) });
      }
      const given = await stretch(String(body.password ?? ""), room.salt);
      if (!safeEqual(given, room.hash)) {
        room.fails += 1;
        // 공개 주소에 짧은 비밀번호가 걸려 있다. 계속 두드리면 잠근다.
        if (room.fails >= MAX_FAILS) {
          room.fails = 0;
          room.lockedUntil = now + LOCK_MS;
        }
        await this.put(room);
        return Response.json({ ok: false });
      }
      if (room.fails || room.lockedUntil) {
        room.fails = 0;
        room.lockedUntil = 0;
        await this.put(room);
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "모르는 동작입니다" }, { status: 400 });
  }
}

type Call = { status: number; data: Record<string, any> };

async function call(env: Env, body: Record<string, unknown>): Promise<Call> {
  const stub = env.CLASSROOM.get(env.CLASSROOM.idFromName("main"));
  const res = await stub.fetch("https://cr/do", { method: "POST", body: JSON.stringify(body) });
  return { status: res.status, data: (await res.json()) as Record<string, any> };
}

/* 세션 ------------------------------------------------------------------ */

async function signKey(env: Env): Promise<string> {
  const { data } = await call(env, { action: "signKey" });
  return data.key as string;
}

function issueSession(key: string, room: PublicRoom): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${room.slug}.${room.gen}.${expires}`;
  return hmac(key, payload).then((sig) => `${payload}.${sig}`);
}

/**
 * 쿠키가 이 방의 것이고 아직 살아 있는지 본다.
 *
 * 방 이름만이 아니라 **세대**까지 본다. 비밀번호를 바꾸거나 방을 지웠다 다시 만들면 세대가
 * 바뀌고 앞의 쿠키가 전부 죽는다. 비밀번호를 바꾸는 이유는 그것이 샜기 때문인데 세대를
 * 안 보면 이미 들어와 있는 사람은 12시간을 그대로 남는다.
 */
async function hasSession(key: string, request: Request, room: PublicRoom): Promise<boolean> {
  const raw = request.headers.get("cookie") ?? "";
  let token: string | null = null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) token = v.join("=");
  }
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [got, gen, expiresRaw, sig] = parts;
  if (got !== room.slug) return false;
  if (!room.gen || gen !== room.gen) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
  return safeEqual(sig, await hmac(key, `${got}.${gen}.${expiresRaw}`));
}

function sessionCookie(token: string, slug: string, url: URL): string {
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${SESSION_COOKIE}=${token}; Path=/cr/${slug}; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
}

/* 화면 ------------------------------------------------------------------ */

const STYLE = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:#101514; color:#f5f3ee; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  line-height:1.7; -webkit-text-size-adjust:100%; }
.wrap { max-width:56rem; margin:0 auto; padding:2.5rem 1.25rem 5rem; }
h1 { font-size:1.6rem; letter-spacing:-0.01em; margin:0 0 .35rem; }
.sub { color:#f5f3eeaa; font-size:.95rem; margin:0 0 2rem; }
form { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:1.5rem; }
input[type=password] { flex:1 1 14rem; min-width:0; padding:.7rem .9rem; border-radius:.6rem;
  border:1px solid #ffffff26; background:#ffffff0d; color:inherit; font-size:1rem; }
button { padding:.7rem 1.1rem; border-radius:.6rem; border:1px solid #d8be9155; background:#d8be911a;
  color:#d8be91; font-size:.95rem; cursor:pointer; }
button:hover { background:#d8be9130; }
.err { color:#f5b3a0; margin-top:1rem; font-size:.92rem; }
.cat { border:1px solid #ffffff1f; border-radius:.8rem; padding:1.1rem 1.25rem; margin:0 0 .9rem; }
.cat h2 { margin:0 0 .2rem; font-size:1.05rem; }
.tag { font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:#d8be91; }
a.post { display:block; padding:.55rem 0; border-bottom:1px solid #ffffff14; color:inherit; text-decoration:none; }
a.post:last-child { border-bottom:0; }
a.post:hover { color:#d8be91; }
.wait { color:#f5f3ee77; }
article img, article video { max-width:100%; height:auto; border-radius:.6rem; display:block; margin:1.2rem 0; }
article img { cursor:zoom-in; }
article h2 { margin-top:2.4rem; font-size:1.25rem; }
article pre { overflow-x:auto; background:#00000055; padding:1rem; border-radius:.6rem; }
article table { display:block; overflow-x:auto; border-collapse:collapse; }
.slider { display:flex; gap:.75rem; overflow-x:auto; scroll-snap-type:x mandatory; margin:1.2rem 0; }
.slider img { scroll-snap-align:center; flex:0 0 88%; margin:0; }
.zoom { position:fixed; inset:0; background:#000000e8; display:none; align-items:center;
  justify-content:center; z-index:50; padding:1rem; cursor:zoom-out; }
.zoom.on { display:flex; }
.zoom img { max-width:100%; max-height:100%; border-radius:.4rem; }
.back { color:#f5f3ee88; text-decoration:none; font-size:.9rem; }
article a { color:#d8be91; text-decoration:none; border-bottom:1px solid #d8be9155; }
article a:hover { border-bottom-color:#d8be91; }
.yt { margin:1.2rem 0; }
.yt .frame { position:relative; width:100%; padding-top:56.25%; border-radius:.6rem;
  overflow:hidden; background:#000; }
.yt.tall .frame { padding-top:0; aspect-ratio:9/16; max-width:22rem; margin-inline:auto; }
.yt iframe, .yt .ytplay { position:absolute; inset:0; width:100%; height:100%; border:0; }
.yt .ytplay { background-color:#000; background-size:cover; background-position:center;
  cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.yt .ytplay span { width:4rem; height:4rem; border-radius:50%; background:#000000bf;
  border:1px solid #ffffff40; display:flex; align-items:center; justify-content:center;
  transition:transform .15s; }
.yt .ytplay span::after { content:""; margin-left:.28rem; border-style:solid;
  border-width:.62rem 0 .62rem 1rem; border-color:transparent transparent transparent #f5f3ee; }
.yt .ytplay:hover span { transform:scale(1.06); }
.yt.tall iframe { position:static; aspect-ratio:9/16; }
.yt figcaption { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.35rem 1rem;
  align-items:baseline; margin-top:.5rem; font-size:.88rem; color:#f5f3ee85; }
.yt figcaption a { color:#f5f3eeb8; white-space:nowrap; }
.pending { border:1px dashed #ffffff26; border-radius:.6rem; margin:1.2rem 0; padding:2.4rem 1.5rem;
  text-align:center; background:#ffffff08; }
.pending b { display:block; font-size:.72rem; letter-spacing:.14em; color:#f5f3ee60;
  text-transform:uppercase; margin-bottom:.6rem; font-weight:500; }
.pending span { display:block; font-size:.9rem; color:#f5f3ee85; line-height:1.7; }
.pending i { display:block; margin-top:.5rem; font-size:.75rem; color:#f5f3ee48; font-style:normal; }
.slider .pending { flex:0 0 88%; margin:0; scroll-snap-align:center; }
`;

const ZOOM_SCRIPT = `
const z = document.getElementById("zoom");
document.addEventListener("click", (e) => {
  const t = e.target;
  const play = t.closest ? t.closest("button.ytplay") : null;
  if (play) {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + play.dataset.yt + "?autoplay=1&rel=0&playsinline=1";
    f.title = play.dataset.label || "YouTube 영상";
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.referrerPolicy = "strict-origin-when-cross-origin";
    f.allowFullscreen = true;
    play.replaceWith(f);
    return;
  }
  if (t.tagName === "IMG" && t.closest("article")) {
    z.querySelector("img").src = t.src;
    z.querySelector("img").alt = t.alt;
    z.classList.add("on");
  } else if (z.classList.contains("on")) {
    z.classList.remove("on");
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") z.classList.remove("on"); });
`;

/**
 * 인라인 스크립트를 쓰므로 이 응답만 nonce 를 붙인 CSP 를 직접 단다.
 * worker.ts 의 기본 CSP 는 script-src 'self' 라 인라인이 막힌다. 확대와 실시간 동기화가
 * 둘 다 스크립트라서 nonce 없이는 강의장이 죽은 화면이 된다.
 */
function page(title: string, inner: string, extraScript = ""): Response {
  const nonce = randomHex(16);
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><div class="wrap">${inner}</div>
<div class="zoom" id="zoom"><img alt=""></div>
<script nonce="${nonce}">${ZOOM_SCRIPT}${extraScript}</script></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data: https:",
        "media-src 'self' https:",
        "style-src 'self' 'unsafe-inline'",
        `script-src 'nonce-${nonce}'`,
        "connect-src 'self'",
        "frame-src https://www.youtube-nocookie.com",
      ].join("; "),
    },
  });
}

function loginPage(slug: string, title: string, message = ""): Response {
  return page(
    title,
    `<h1>${esc(title)}</h1><p class="sub">비밀번호를 받으신 분만 들어옵니다.</p>
     <form method="post" action="/cr/${esc(slug)}/login">
       <input type="password" name="password" placeholder="비밀번호" autofocus autocomplete="current-password">
       <button type="submit">들어가기</button>
     </form>${message ? `<p class="err">${esc(message)}</p>` : ""}`,
  );
}

/* 라우팅 ---------------------------------------------------------------- */

function visible(categories: CourseCategory[], unlocked: string[]): CourseCategory[] {
  return categories.filter((c) => unlocked.includes(c.slug));
}

const poll = (slug: string) => `
setInterval(async () => {
  const r = await fetch("/cr/${slug}/state", { cache: "no-store" });
  // 세션이 끊겼으면(비밀번호가 바뀌었거나 방이 지워졌다) 그 자리에 머물지 않고 나간다
  if (r.status === 401 || r.status === 404) { location.reload(); return; }
  if (!r.ok) return;
  const s = await r.json();
  if (s.stamp !== window.__stamp) location.reload();
}, 3000);`;

/**
 * 상태 지문. 무엇이 열렸는지가 **읽히지 않는** 값이어야 한다.
 *
 * 처음에는 열린 카테고리 슬러그를 그대로 이어 붙였다. 그것은 지문이 아니라 커리큘럼
 * 폴더 이름 목록이고 진도까지 같이 새어 나간다. 이 저장소는 커리큘럼 공개를 금지한다.
 * 서명 키로 눌러서 밖에서는 바뀌었다는 것만 알게 한다.
 */
async function stampOf(key: string, room: PublicRoom): Promise<string> {
  const raw = `${room.gen}:${room.open ? 1 : 0}:${[...room.unlocked].sort().join(",")}`;
  return (await hmac(key, raw)).slice(0, 16);
}

/** 로컬 운영 화면이 부르는 유일한 조종 통로다. 공개 서버에 운영자 페이지는 없다. */
async function admin(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("not found", { status: 404 });
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!env.CR_ADMIN_TOKEN || !safeEqual(token, env.CR_ADMIN_TOKEN)) {
    return Response.json({ error: "운영 토큰이 맞지 않습니다" }, { status: 401 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const { status, data } = await call(env, body);
  if (status >= 400) return Response.json(data, { status });
  // 무엇을 했든 전체 상태를 돌려준다. 운영 화면이 늘 실물을 그린다.
  const { data: listed } = await call(env, { action: "list" });
  return Response.json({
    ok: true,
    result: data,
    rooms: listed.rooms,
    categories: (await course(env)).map((c) => ({
      slug: c.slug,
      title: c.title,
      posts: c.posts.length,
    })),
  });
}

export async function handleClassroom(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/cr";

  if (path === "/cr/api/admin") return admin(request, env);

  if (path === "/cr") {
    return page("강의장", `<h1>강의장</h1><p class="sub wait">강사가 알려 준 주소로 들어오세요.</p>`);
  }

  const parts = path.split("/").slice(2);
  const slug = parts[0] ?? "";
  if (!validSlug(slug)) return new Response("not found", { status: 404 });

  const { data: found } = await call(env, { action: "get", slug });
  // 없는 방은 없는 주소다. 만들기 전에는 아무 데도 존재하지 않는다.
  if (!found.room) return new Response("없는 강의장입니다.", { status: 404 });
  const room = found.room as PublicRoom;

  if (parts[1] === "login" && parts.length === 2) {
    if (request.method !== "POST") return loginPage(slug, room.title);
    const form = await request.formData();
    const { data: tried } = await call(env, {
      action: "login",
      slug,
      password: String(form.get("password") ?? ""),
    });
    if (!tried.ok) {
      return loginPage(
        slug,
        room.title,
        tried.retryAfter
          ? `너무 여러 번 틀렸습니다. ${Math.ceil(tried.retryAfter / 60)}분 뒤에 다시 해 주세요.`
          : "비밀번호가 맞지 않습니다.",
      );
    }
    return new Response(null, {
      status: 303,
      headers: {
        location: `/cr/${slug}`,
        "set-cookie": sessionCookie(await issueSession(await signKey(env), room), slug, url),
      },
    });
  }

  const key = await signKey(env);

  // 폴링도 들어온 사람만 한다. 앞에 두면 비밀번호 없이 방 상태를 감시할 수 있다.
  if (!(await hasSession(key, request, room))) {
    if (parts[1] === "state" && parts.length === 2) {
      return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    return loginPage(slug, room.title);
  }

  if (parts[1] === "state" && parts.length === 2) {
    // 지문만 준다. 본문도 카테고리 목록도 여기서 안 내려간다.
    return Response.json(
      { stamp: await stampOf(key, room) },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const stamp = `window.__stamp=${JSON.stringify(await stampOf(key, room))};${poll(slug)}`;

  if (!room.open) {
    return page(
      room.title,
      `<h1>${esc(room.title)}</h1><p class="sub wait">아직 열리지 않았습니다.</p>`,
      stamp,
    );
  }

  const open = visible(await course(env), room.unlocked);

  if (parts.length === 1) {
    const cards = open.length
      ? open
          .map(
            (c) => `<div class="cat"><span class="tag">${esc(c.slug)}</span>
              <h2>${esc(c.title)}</h2>
              ${c.posts
                .map(
                  (p) =>
                    `<a class="post" href="/cr/${esc(slug)}/${esc(c.slug)}/${esc(p.id)}">${esc(p.title)}</a>`,
                )
                .join("")}
            </div>`,
          )
          .join("")
      : '<p class="wait">강사가 카테고리를 열면 여기에 나타납니다.</p>';
    return page(
      room.title,
      `<h1>${esc(room.title)}</h1><p class="sub">강사가 연 것만 보입니다.</p>${cards}`,
      stamp,
    );
  }

  if (parts.length === 3) {
    const category = open.find((c) => c.slug === parts[1]);
    // 잠긴 카테고리는 본문을 만들지도 않는다. 여기서 막는 것이 이 설계의 요점이다.
    if (!category) return new Response("아직 열리지 않았습니다.", { status: 404 });
    const post = category.posts.find((p) => p.id === parts[2]);
    if (!post) return new Response("없는 글입니다.", { status: 404 });
    return page(
      post.title,
      `<a class="back" href="/cr/${esc(slug)}">← ${esc(category.title)}</a>
       <h1 style="margin-top:1rem">${esc(post.title)}</h1>
       <p class="sub">${esc(post.summary)}</p>
       <article>${renderMarkdown(post.body)}</article>`,
      stamp,
    );
  }

  return new Response("not found", { status: 404 });
}
