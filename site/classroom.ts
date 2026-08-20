/**
 * 강의장. 운영자가 자기 노트북의 운영 화면에서 방을 만들고 그 자리에서 비밀번호를 건다.
 *
 * 설계 근거는 ../eddmpython-course/memory/courseRoom.md 다. 원칙 넷이다.
 *
 * 1. 운영 화면은 로컬호스트에만 있다. 공개 서버에는 운영자용 페이지가 없다
 * 2. 방은 실행 중에 생긴다. 만드는 즉시 /cr/<이름> 주소가 살아난다. 배포가 필요 없다
 * 3. 비밀번호는 방을 만들 때 그 자리에서 건다. Worker secret 이 아니라 방의 상태다
 * 4. 닫힌 카테고리의 본문은 아예 안 내려간다. 가리는 것이 아니라 안 주는 것이다
 *
 * 4번이 이 파일이 존재하는 이유다. 클라이언트에서 거르면 개발자 도구로 앞 내용을 먼저 본다.
 */
import { esc, renderPost } from "./classroom-render";
// 심볼 좌표와 SNS 주소는 랜딩과 같은 정본을 읽는다. brand.ts 는 React 를 부르지 않는다.
import { SYMBOL, BRAND, TOKENS, cssVars } from "./src/brand";
import { SOCIAL } from "./src/social";

export type Env = {
  CLASSROOM: DurableObjectNamespace;
  /** 교안 묶음이 들어 있다. eddmpython-course 저장소가 발행한다. */
  COURSE: KVNamespace;
  /** 로컬 운영 화면이 이 Worker 를 조종할 때 쓰는 토큰. 배포 때 한 번 넣는 유일한 비밀값이다. */
  CR_ADMIN_TOKEN?: string;
};

export type CoursePost = { id: string; title: string; summary: string; body: string };
export type CourseCategory = {
  slug: string;
  order: number;
  title: string;
  /** 이 카테고리를 덮을 때 독자의 일 하나가 무엇이 되는지. schema 2 부터 온다 */
  goal?: string;
  posts: CoursePost[];
};
type CourseBundle = { schema: number; categories: CourseCategory[] };

/**
 * 묶음의 모양은 eddmpython-course 와의 계약이다. 바꾸면 양쪽을 같은 날 같이 고친다.
 *
 * **두 판을 같이 받는다.** 하나만 받으면 발행과 배포 사이에 강의장이 빈 목록을 낸다.
 * 어느 쪽을 먼저 하든 그 틈이 생기고, 하필 강의 직전이면 그것이 사고다.
 * 2 는 카테고리 성과(goal)가 붙은 판이고 1 은 그 전 판이다.
 */
const COURSE_SCHEMA = new Set([1, 2]);

export type CourseState = { ok: boolean; categories: CourseCategory[] };

const isPost = (p: unknown): p is CoursePost =>
  !!p &&
  typeof (p as CoursePost).id === "string" &&
  typeof (p as CoursePost).title === "string" &&
  typeof (p as CoursePost).body === "string";

/**
 * 교안을 KV 에서 읽는다.
 *
 * **이 저장소에는 교안 글자가 한 자도 없다.** 예전에는 빌드 때 교안 폴더를 읽어 Worker
 * 번들에 구웠다. 그러면 교안을 한 줄 고칠 때마다 공개 사이트를 통째로 배포해야 했고,
 * 공개 저장소 옆에 파는 물건을 두고 훅과 누출 검사로 지켜야 했다.
 *
 * 이제 교안은 비공개 저장소가 KV 로 따로 발행한다. 사이트 배포와 교안 발행이 서로를
 * 기다리지 않는다.
 *
 * **무슨 일이 있어도 던지지 않는다.** 묶음이 깨졌을 때 던지면 강의장만이 아니라 운영
 * 화면까지 같이 죽는다. 그러면 강의 중에 운영자가 방 목록조차 못 본다.
 */
async function course(env: Env): Promise<CourseState> {
  let bundle: CourseBundle | null = null;
  try {
    const raw = await env.COURSE.get("bundle", { cacheTtl: 60 });
    if (raw === null) return { ok: true, categories: [] };
    bundle = JSON.parse(raw) as CourseBundle;
  } catch {
    // 묶음이 깨졌으면 교안이 없는 것으로 본다. 여기서 던지면 강의장만이 아니라 운영 화면도
    // 같이 죽는다. 강의 중에 운영자가 방 목록조차 못 보게 되는 것이 제일 나쁜 결과다.
    return { ok: false, categories: [] };
  }
  if (!bundle || !COURSE_SCHEMA.has(bundle.schema) || !Array.isArray(bundle.categories)) {
    return { ok: false, categories: [] };
  }
  const categories = bundle.categories
    .filter((c) => c && typeof c.slug === "string" && Array.isArray(c.posts))
    .map((c) => ({ ...c, order: Number(c.order) || 0, posts: c.posts.filter(isPost) }))
    .sort((a, b) => a.order - b.order);
  return { ok: true, categories };
}

/**
 * 교안의 판 번호. 발행할 때마다 바뀐다.
 *
 * 상태 지문에 이것을 넣지 않으면 교안을 다시 발행해도 **이미 화면을 열고 있는 수강생이
 * 모른다.** 새로 들어오는 사람만 새 내용을 본다. 예전에는 교안이 Worker 번들에 있어서
 * 재배포가 강제 새로고침 노릇을 했는데 KV 로 옮기면서 그 효과가 사라졌다.
 */
async function courseVersion(env: Env): Promise<string> {
  try {
    return (await env.COURSE.get("version", { cacheTtl: 60 })) ?? "";
  } catch {
    return "";
  }
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

/**
 * 강의장 비밀번호는 짧다. 그대로 해시하면 금방 뒤집히므로 반복해서 늘린다.
 *
 * 반복은 10만 회다. **Cloudflare Workers 가 PBKDF2 반복을 10만 회로 막는다.** 12만 회를
 * 요청했더니 로컬 miniflare 는 통과하고 배포된 Worker 만 NotSupportedError 로 던졌다.
 * 로그를 잡기 전까지 create 와 login 이 프로덕션에서만 500 이었다. 이 상한을 넘기지 않는다.
 */
const PBKDF2_ITERATIONS = 100000;

async function stretch(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
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

    /**
     * 로그인 잠금을 푼다.
     *
     * 수강생이 여덟 번 틀리면 5분 막힌다. 강의 중의 5분은 길고, 그 사이 그 사람은 아무것도
     * 못 본다. 비밀번호를 바꾸면 풀리기는 하지만 세대가 돌아 **이미 들어와 있는 사람이 전부
     * 튕긴다.** 한 사람 때문에 강의실 전체를 내보내지 않으려고 따로 둔다.
     */
    if (action === "unlock") {
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

// 브랜드 값은 여기서 만들지 않는다. src/brand.ts 의 TOKENS 가 정본이고 그것이 변수를 깐다.
// scripts/check-brand.mjs 가 이 파일에 hex 가 다시 나타나면 막는다.
const STYLE = `
${cssVars()}
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:var(--eddm-carbon); color:var(--eddm-ivory); font-family:${TOKENS.font.sans}; word-break:keep-all; -webkit-font-smoothing:antialiased;
  line-height:1.7; -webkit-text-size-adjust:100%; }
.wrap { max-width:56rem; margin:0 auto; padding:2.5rem 1.25rem 5rem; }
.wrap.wide { max-width:88rem; }

/* 머리띠. 랜딩 Nav.tsx 의 실측값 그대로다. 값을 바꾸면 두 화면이 어긋난다 */
.hd { display:flex; flex-direction:column; align-items:center; gap:20px; margin-bottom:56px; }
.hd-logo { display:flex; align-items:center; gap:10px; text-decoration:none; border:0; color:inherit; }
.hd-symbol { height:21px; width:auto; color:var(--eddm-ivory); display:block; }
.hd-word { font-size:15px; letter-spacing:-.025em; line-height:1.5; color:var(--eddm-ivory); }
.hd-word b { font-weight:700; }
.hd-word i { font-style:normal; font-weight:400; color:rgba(245,243,238,.8); }
.hd-right { display:flex; flex-wrap:wrap; align-items:center; justify-content:center;
  column-gap:20px; row-gap:10px; font-size:14px; line-height:1.4285714; color:rgba(245,243,238,.7); }
.hd .nav-link { color:inherit; text-decoration:none; border:0; transition:color .15s cubic-bezier(.4,0,.2,1); }
.hd .nav-link:hover { color:var(--eddm-ivory); }
.hd-icons { display:flex; align-items:center; gap:14px; }
.hd .nav-icon { color:rgba(245,243,238,.6); border:0; transition:color .15s cubic-bezier(.4,0,.2,1); }
.hd .nav-icon:hover { color:var(--eddm-ivory); }
.hd .nav-icon svg { height:18px; width:18px; display:block; }
@media (min-width:768px) {
  .hd { flex-direction:row; justify-content:space-between; gap:0; margin-bottom:64px; }
}

.eyebrow { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase;
  color:var(--eddm-sand); margin:0 0 .6rem; }
.hero { margin-bottom:2.5rem; }
.hero h1 { margin:0 0 .6rem; font-size:1.9rem; letter-spacing:-.02em; line-height:1.25; }
.hero .sub { margin:0; color:var(--eddm-text-muted); }

/* 글 화면. 왼쪽 과정 이동, 가운데 본문, 오른쪽 목차 */
.lay { display:grid; grid-template-columns:15rem minmax(0,1fr) 15rem; gap:3rem; align-items:start; }
.side, .toc { position:sticky; top:2rem; max-height:calc(100vh - 4rem); overflow-y:auto;
  font-size:.85rem; scrollbar-width:thin; }
.side-h, .toc-h { margin:1.25rem 0 .6rem; font-size:.72rem; letter-spacing:.12em;
  text-transform:uppercase; color:var(--eddm-text-dim); }
.nav-post { display:flex; gap:.6rem; padding:.5rem .6rem; border-radius:.45rem;
  color:var(--eddm-text-muted); text-decoration:none; line-height:1.5; }
.nav-post b { color:var(--eddm-text-faint); font-weight:500; font-variant-numeric:tabular-nums; }
.nav-post:hover { background:var(--eddm-raise); color:var(--eddm-ivory); }
.nav-post.on { background:var(--eddm-accent-bg); color:var(--eddm-sand); }
.nav-post.on b { color:var(--eddm-accent-dim); }
.toc-h { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem;
  list-style:none; cursor:default; }
.toc-h::-webkit-details-marker { display:none; }
.toc-at { letter-spacing:0; font-variant-numeric:tabular-nums; }
.toc a { display:flex; gap:.55rem; padding:.4rem .7rem; border-left:2px solid var(--eddm-line);
  color:var(--eddm-text-muted); text-decoration:none; line-height:1.5; }
.toc a b { flex:0 0 auto; font-weight:500; opacity:.55; font-variant-numeric:tabular-nums; }
.toc a:hover { color:var(--eddm-ivory); border-left-color:var(--eddm-line-strong); }
.toc a.on { color:var(--eddm-sand); border-left-color:var(--eddm-sand); }
/* 읽은 만큼 차는 띠. 글이 길어서 어디쯤인지 감이 없으면 지친다. */
.prog { position:fixed; top:0; left:0; right:0; height:2px; z-index:20; pointer-events:none; }
.prog i { display:block; height:100%; width:0; background:var(--eddm-sand); opacity:.55;
  transition:width .1s linear; }
/* 섹션을 닫는 질문. 본문에 묻히지 않게 한 단 밝게 둔다. */
article .q { font-style:normal; color:var(--eddm-ivory); }
.body h1 { margin:0 0 .7rem; font-size:1.75rem; letter-spacing:-.02em; line-height:1.3; }
.body .sub { margin:0 0 2.5rem; color:var(--eddm-text-muted); line-height:1.7; }

/* 이전 다음 */
.pager { display:flex; gap:1rem; margin-top:4rem; padding-top:2rem; border-top:1px solid var(--eddm-line); }
.pager a { flex:1; padding:1rem 1.1rem; border:1px solid var(--eddm-line-base); border-radius:.7rem;
  text-decoration:none; color:inherit; display:block; }
.pager a:hover { border-color:var(--eddm-accent-line); }
.pager .nx { text-align:right; }
.pager span { display:block; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase;
  color:var(--eddm-sand); margin-bottom:.35rem; }
.pager b { font-weight:400; font-size:.9rem; color:var(--eddm-text); line-height:1.5; }
.pager i { flex:1; }

@media (max-width:1100px) {
  .lay { grid-template-columns:minmax(0,1fr); gap:2rem; }
  .side, .toc { position:static; max-height:none; }
  .toc { order:-1; border:1px solid var(--eddm-line); border-radius:.7rem; padding:.5rem 1rem; }
  .toc[open] { padding-bottom:1rem; }
  .toc-h { cursor:pointer; padding:.5rem 0; }
  .toc-h::after { content:"펼치기"; font-size:.7rem; color:var(--eddm-sand); letter-spacing:0; }
  .toc[open] .toc-h::after { content:"접기"; }
  .side { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
  .side .side-h { width:100%; margin:.5rem 0 0; }
}
h1 { font-size:1.6rem; letter-spacing:-0.01em; margin:0 0 .35rem; }
.sub { color:var(--eddm-text); font-size:.95rem; margin:0 0 2rem; }
form { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:1.5rem; }
input[type=password] { flex:1 1 14rem; min-width:0; padding:.7rem .9rem; border-radius:.6rem;
  border:1px solid var(--eddm-line-strong); background:var(--eddm-raise); color:inherit; font-size:1rem; }
button { padding:.7rem 1.1rem; border-radius:.6rem; border:1px solid var(--eddm-accent-line); background:var(--eddm-accent-bg);
  color:var(--eddm-sand); font-size:.95rem; cursor:pointer; }
button:hover { background:var(--eddm-accent-bg); }
.err { color:#f5b3a0; margin-top:1rem; font-size:.92rem; }
.cat { border:1px solid var(--eddm-line-base); border-radius:.85rem; padding:1.4rem 1.5rem 1.1rem; margin:0 0 1rem; }
.cat-h { display:flex; align-items:baseline; gap:.75rem; }
.cat-n { font-size:.78rem; font-weight:500; color:var(--eddm-accent-dim); font-variant-numeric:tabular-nums; }
.cat h2 { margin:0; font-size:1.1rem; font-weight:500; letter-spacing:-.01em; flex-grow:1; }
.state { flex:0 0 auto; font-size:.7rem; letter-spacing:.06em; padding:.15rem .6rem; border-radius:99px; }
.state.on { background:var(--eddm-accent-bg); color:var(--eddm-sand); }
/* 이 카테고리를 덮으면 무엇이 되는지. 왜 듣는지가 목록에서 보여야 한다. */
.goal { margin:.5rem 0 1rem 2.1rem; font-size:.87rem; color:var(--eddm-text-muted); line-height:1.7; }
/* 잠긴 카테고리. 가리지 않고 이름만 보여 준다. 본문은 여전히 안 내려간다. */
.later { border:1px solid var(--eddm-line); border-radius:.85rem; padding:1.1rem 1.5rem; opacity:.6; }
.later-h { margin:0 0 .7rem; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:var(--eddm-text-faint); }
.later-row { display:flex; justify-content:space-between; gap:1rem; padding:.4rem 0; font-size:.92rem; color:var(--eddm-text-muted); }
.tag { font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--eddm-sand); }
a.post { display:flex; gap:.9rem; align-items:baseline; margin-left:2.1rem; padding:.65rem 0;
  border-top:1px solid var(--eddm-line); color:inherit; text-decoration:none; line-height:1.6; }
a.post b { flex:0 0 auto; font-weight:500; font-size:.78rem; color:var(--eddm-text-faint);
  font-variant-numeric:tabular-nums; }
a.post:hover { color:var(--eddm-sand); }
a.post:hover b { color:var(--eddm-accent-dim); }
.wait { color:var(--eddm-text-dim); }
article img, article video { max-width:100%; height:auto; border-radius:.6rem; display:block; margin:1.75rem 0; }
article img { cursor:zoom-in; }
/* 섹션과 섹션 사이를 벌리고 윗선으로 가른다. 스크롤할 때 경계가 눈에 보여야 한다.
   h3 는 h2 를 풀어 쓴 부제라 h2 에 붙여 두고 본문 색보다 흐리게 둔다. */
article h2 { margin:4rem 0 .5rem; padding-top:1.75rem; border-top:1px solid var(--eddm-line);
  font-size:1.3rem; font-weight:500; letter-spacing:-.01em; line-height:1.4;
  display:flex; gap:1.25rem; align-items:baseline; }
article h2:first-child { margin-top:0; padding-top:0; border-top:0; }
/* 섹션 번호. 목차의 번호와 같아서 지금 몇 번째인지 세지 않고 안다. */
article h2 .sn { flex:0 0 auto; font-size:.82rem; font-weight:500; letter-spacing:.04em;
  color:var(--eddm-accent-dim); font-variant-numeric:tabular-nums; }
article h3 { margin:0 0 1.5rem 2.1rem; font-size:.95rem; font-weight:400; line-height:1.65; color:var(--eddm-text-muted); }
article p { margin:1.25rem 0; line-height:1.85; color:var(--eddm-text); }
/* 사례 라벨. 앞의 점 하나로 본문과 갈린다. 굵은 글씨만으로는 안 갈렸다. */
article p.lb { display:flex; align-items:center; gap:.55rem; margin:2rem 0 .85rem; color:var(--eddm-ivory); }
article p.lb::before { content:""; flex:0 0 auto; width:5px; height:5px; border-radius:50%; background:var(--eddm-sand); }
article p.lb strong { font-weight:500; font-size:.95rem; }
article ul, article ol { margin:1.25rem 0; padding-left:1.25rem; line-height:1.85; color:var(--eddm-text); }
article li { margin:.5rem 0; }
article li::marker { color:var(--eddm-accent-dim); }
article pre { overflow-x:auto; background:#00000055; padding:1rem; border-radius:.6rem; }
article table { display:block; overflow-x:auto; border-collapse:collapse; }
.slider { display:flex; gap:.75rem; overflow-x:auto; scroll-snap-type:x mandatory; margin:1.2rem 0; }
.slider img { scroll-snap-align:center; flex:0 0 88%; margin:0; }
.zoom { position:fixed; inset:0; background:#000000e8; display:none; align-items:center;
  justify-content:center; z-index:50; padding:1rem; cursor:zoom-out; }
.zoom.on { display:flex; }
.zoom img { max-width:100%; max-height:100%; border-radius:.4rem; }
.back { color:var(--eddm-text-muted); text-decoration:none; font-size:.9rem; }
article a { color:var(--eddm-sand); text-decoration:none; border-bottom:1px solid var(--eddm-accent-line); }
article a:hover { border-bottom-color:var(--eddm-sand); }
.yt { margin:1.75rem 0; }
.yt figcaption { margin-top:.6rem; display:flex; gap:.75rem; align-items:baseline;
  justify-content:space-between; font-size:.85rem; color:var(--eddm-text-muted); line-height:1.6; }
.yt figcaption a { font-size:.8rem; white-space:nowrap; }
.yt figcaption .at { font-style:normal; margin-left:.5rem; padding:.1rem .45rem; border-radius:.35rem;
  background:var(--eddm-accent-bg); color:var(--eddm-sand); font-size:.78rem; white-space:nowrap; }
.yt .frame { position:relative; width:100%; padding-top:56.25%; border-radius:.6rem;
  overflow:hidden; background:#000; }
.yt.tall .frame { padding-top:0; aspect-ratio:9/16; max-width:22rem; margin-inline:auto; }
.yt iframe, .yt .ytplay { position:absolute; inset:0; width:100%; height:100%; border:0; }
.yt .ytplay { background-color:#000; background-size:cover; background-position:center;
  cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.yt .ytplay span { width:4rem; height:4rem; border-radius:50%; background:#000000bf;
  border:1px solid var(--eddm-line-strong); display:flex; align-items:center; justify-content:center;
  transition:transform .15s; }
.yt .ytplay span::after { content:""; margin-left:.28rem; border-style:solid;
  border-width:.62rem 0 .62rem 1rem; border-color:transparent transparent transparent var(--eddm-ivory); }
.yt .ytplay:hover span { transform:scale(1.06); }
.yt.tall iframe { position:static; aspect-ratio:9/16; }
.yt figcaption { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.35rem 1rem;
  align-items:baseline; margin-top:.5rem; font-size:.88rem; color:var(--eddm-text-muted); }
.yt figcaption a { color:var(--eddm-text); white-space:nowrap; }
.pending { border:1px dashed var(--eddm-line-strong); border-radius:.6rem; margin:1.2rem 0; padding:2.4rem 1.5rem;
  text-align:center; background:var(--eddm-raise); }
.pending b { display:block; font-size:.72rem; letter-spacing:.14em; color:var(--eddm-text-dim);
  text-transform:uppercase; margin-bottom:.6rem; font-weight:500; }
.pending span { display:block; font-size:.9rem; color:var(--eddm-text-muted); line-height:1.7; }
.pending i { display:block; margin-top:.5rem; font-size:.75rem; color:var(--eddm-text-faint); font-style:normal; }
.slider .pending { flex:0 0 88%; margin:0; scroll-snap-align:center; }
`;

/**
 * 목차가 지금 보는 절을 따라간다.
 *
 * 강사가 화면을 띄워 놓고 설명하는 동안 수강생이 "지금 어디" 를 놓치면 따라오지 못한다.
 * IntersectionObserver 로 화면에 든 절을 잡아 목차에 표시만 한다.
 */
const TOC_SCRIPT = `
(() => {
  const toc = document.querySelector(".toc");
  if (!toc) return;
  // 좁은 화면에서는 접어 둔다. 열 줄이 펼쳐지면 본문에 닿기까지 두 화면을 스크롤한다.
  const narrow = () => matchMedia("(max-width:1100px)").matches;
  if (narrow()) toc.removeAttribute("open");
  // 목차에서 뛰면 그 자리에서 다시 접는다. 펼친 채로 두면 본문을 가린다.
  toc.addEventListener("click", (e) => {
    if (narrow() && e.target.closest && e.target.closest("a[data-to]")) {
      setTimeout(() => toc.removeAttribute("open"), 0);
    }
  });
  if (!("IntersectionObserver" in window)) return;
  const links = new Map();
  toc.querySelectorAll("a[data-to]").forEach((a) => links.set(a.dataset.to, a));
  const seen = new Set();
  const mark = () => {
    let top = null;
    for (const id of links.keys()) if (seen.has(id)) { top = id; break; }
    links.forEach((a, id) => a.classList.toggle("on", id === top));
    if (top) {
      const a = links.get(top);
      const box = toc.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      if (r.top < box.top || r.bottom > box.bottom) a.scrollIntoView({ block: "nearest" });
    }
  };
  const at = document.querySelector(".toc-at");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) seen.add(e.target.id);
      else seen.delete(e.target.id);
    }
    mark();
    // 목차 머리의 "3 / 10". 지금 몇 번째인지 숫자로도 말해 준다.
    if (at) {
      let n = 0;
      let i = 0;
      for (const id of links.keys()) { i += 1; if (seen.has(id)) { n = i; break; } }
      if (n) at.textContent = n + " / " + links.size;
    }
  }, { rootMargin: "-72px 0px -65% 0px" });
  document.querySelectorAll("article h2[id]").forEach((h) => io.observe(h));

  // 읽은 만큼 차는 띠. 글이 길어서 어디쯤인지 감이 없으면 지친다.
  const bar = document.querySelector(".prog i");
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + "%";
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();
  }
})();
`;

const ZOOM_SCRIPT = `
const z = document.getElementById("zoom");
document.addEventListener("click", (e) => {
  const t = e.target;
  const play = t.closest ? t.closest("button.ytplay") : null;
  if (play) {
    const f = document.createElement("iframe");
    const at = play.dataset.start ? "&start=" + play.dataset.start : "";
    f.src = "https://www.youtube-nocookie.com/embed/" + play.dataset.yt + "?autoplay=1&rel=0&playsinline=1" + at;
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
const SITE = "https://eddmpython.com";

/** 랜딩 `Nav.tsx` 의 링크 그대로. 강의장은 다른 출처라 절대 주소로 건다. */
const NAV_LINKS = [
  { label: "제품", href: `${SITE}/#products` },
  { label: "데이터", href: `${SITE}/#data` },
  { label: "블로그", href: `${SITE}/blog` },
  { label: "FAQ", href: `${SITE}/#faq` },
];

/**
 * SNS 아이콘. `src/components/icons.tsx` 의 path 를 옮겨 왔다.
 *
 * 심볼과 주소는 `src/brand.ts` 와 `src/social.ts` 에서 그대로 import 하는데 아이콘만
 * 옮겨 적는 이유는 그쪽이 React 컴포넌트라서다. 랜딩에서 아이콘을 고치면 여기도 고친다.
 */
const NAV_ICONS = [
  {
    label: "GitHub",
    href: SOCIAL.github,
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>`,
  },
  {
    label: "Threads",
    href: SOCIAL.threads,
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.27 11.13a6.9 6.9 0 0 0-.26-.12c-.15-2.82-1.7-4.44-4.29-4.46h-.04c-1.55 0-2.84.66-3.63 1.87l1.43.98c.6-.9 1.53-1.1 2.2-1.1h.03c.83 0 1.46.25 1.86.72.3.35.5.83.6 1.44a10.9 10.9 0 0 0-2.4-.12c-2.42.14-3.98 1.55-3.87 3.51.05 1 .55 1.85 1.4 2.4.72.47 1.65.7 2.62.65 1.28-.07 2.28-.56 2.98-1.45.53-.68.87-1.56 1.02-2.66.62.37 1.07.87 1.32 1.46.43 1.01.46 2.68-.9 4.03-1.19 1.19-2.62 1.7-4.78 1.72-2.4-.02-4.21-.79-5.39-2.28C4.98 16.3 4.42 14.36 4.4 12c.02-2.36.58-4.3 1.67-5.72C7.25 4.79 9.06 4.02 11.46 4c2.42.02 4.26.79 5.48 2.29.6.73 1.05 1.66 1.35 2.73l1.68-.45c-.36-1.32-.93-2.46-1.7-3.4C16.7 3.24 14.4 2.24 11.47 2.22h-.01c-2.93.02-5.2 1.02-6.75 2.97C3.33 6.92 2.62 9.2 2.6 11.99v.02c.02 2.79.73 5.07 2.11 6.8 1.55 1.95 3.82 2.95 6.75 2.97h.01c2.6-.02 4.44-.7 5.95-2.21 1.98-1.98 1.92-4.46 1.27-5.98-.47-1.1-1.36-1.99-2.57-2.58Zm-4.44 4.06c-1.07.06-2.19-.42-2.24-1.42-.04-.74.53-1.57 2.3-1.67l.4-.01c.64 0 1.24.06 1.79.18-.2 2.54-1.4 2.86-2.25 2.92Z"/></svg>`,
  },
  {
    label: "YouTube",
    href: SOCIAL.youtube,
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.09 0 12 0 12s0 3.91.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.91 24 12 24 12s0-3.91-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/></svg>`,
  },
  {
    label: "메일",
    href: SOCIAL.mail,
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>`,
  },
];

/**
 * 브랜드 머리띠. 랜딩 `Nav.tsx` 와 같은 것을 낸다.
 *
 * 강의장은 Worker 가 HTML 문자열로 뽑는 화면이라 React 컴포넌트를 부를 수 없다. 대신
 * 심볼 좌표(`src/brand.ts`)와 주소(`src/social.ts`)는 정본을 그대로 import 한다.
 * 복사해 두면 한쪽을 고칠 때 다른 쪽이 조용히 어긋난다.
 *
 * 링크는 새 탭으로 연다. 강의 중에 수강생이 눌러 강의 화면을 잃으면 안 된다.
 */
function header(): string {
  const links = NAV_LINKS.map(
    (l) => `<a class="nav-link" href="${esc(l.href)}" target="_blank" rel="noreferrer">${esc(l.label)}</a>`,
  ).join("");
  const icons = NAV_ICONS.map(
    (i) =>
      `<a class="nav-icon" href="${esc(i.href)}"${
        i.href.startsWith("mailto:") ? "" : ' target="_blank"'
      } rel="noreferrer" aria-label="${esc(i.label)}">${i.svg}</a>`,
  ).join("");
  return `<nav class="hd">
  <a class="hd-logo" href="${esc(SITE)}" target="_blank" rel="noreferrer" aria-label="eddmpython 홈">
    <svg class="hd-symbol" viewBox="${esc(SYMBOL.viewBox)}" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${esc(
      SYMBOL.shape,
    )}"/><ellipse cx="${SYMBOL.eye.cx}" cy="${SYMBOL.eye.cy}" rx="${SYMBOL.eye.rx}" ry="${
    SYMBOL.eye.ry
  }" fill="${esc(BRAND.eye)}"/></svg>
    <span class="hd-word"><b>eddm</b><i>python</i></span>
  </a>
  <div class="hd-right">${links}<span class="hd-icons">${icons}</span></div>
</nav>`;
}

function page(title: string, inner: string, extraScript = "", wide = false): Response {
  const nonce = randomHex(16);
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="${TOKENS.fontHref}">
<style>${STYLE}</style></head>
<body><div class="wrap${wide ? " wide" : ""}">${inner}</div>
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
        // 랜딩과 같은 글꼴을 쓰려고 연다. 글꼴이 다르면 같은 화면이 아니다.
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "font-src 'self' https://cdn.jsdelivr.net",
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
async function stampOf(key: string, room: PublicRoom, version: string): Promise<string> {
  const raw = `${room.gen}:${room.open ? 1 : 0}:${[...room.unlocked].sort().join(",")}:${version}`;
  return (await hmac(key, raw)).slice(0, 16);
}

/**
 * 운영 화면이 부를 수 있는 동작. 여기 없는 것은 토큰이 맞아도 안 넘긴다.
 *
 * 예전에는 받은 몸통을 그대로 DO 에 넘겼다. 그래서 `signKey` 도 넘어갔다. 그 열쇠가 나가면
 * **모든 방의 세션 쿠키를 조용히 위조**할 수 있고, 열쇠는 한 번 만들면 바뀌지 않으므로
 * 비밀번호를 아무리 바꿔도 소용이 없다. 방을 만들고 지우는 것은 화면에 보이지만 이것은
 * 안 보인다. 토큰은 노트북의 평문 JSON 에 있다. 새는 날을 전제로 좁혀 둔다.
 */
const ADMIN_ACTIONS = new Set(["list", "create", "remove", "password", "open", "toggle", "unlock"]);

/** 로컬 운영 화면이 부르는 유일한 조종 통로다. 공개 서버에 운영자 페이지는 없다. */
async function admin(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("not found", { status: 404 });
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!env.CR_ADMIN_TOKEN || !safeEqual(token, env.CR_ADMIN_TOKEN)) {
    return Response.json({ error: "운영 토큰이 맞지 않습니다" }, { status: 401 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (!ADMIN_ACTIONS.has(String(body.action ?? ""))) {
    return Response.json({ error: "운영 화면이 부르지 않는 동작입니다" }, { status: 400 });
  }
  const { status, data } = await call(env, body);
  if (status >= 400) return Response.json(data, { status });
  // 무엇을 했든 전체 상태를 돌려준다. 운영 화면이 늘 실물을 그린다.
  const { data: listed } = await call(env, { action: "list" });
  const found = await course(env);
  return Response.json({
    ok: true,
    result: data,
    rooms: listed.rooms,
    // 교안을 못 읽어도 방 조종은 계속된다. 운영자에게 상태만 알려 준다.
    courseOk: found.ok,
    categories: found.categories.map((c) => ({
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
      { stamp: await stampOf(key, room, await courseVersion(env)) },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const mark = await stampOf(key, room, await courseVersion(env));
  const stamp = `window.__stamp=${JSON.stringify(mark)};${poll(slug)}`;

  if (!room.open) {
    return page(
      room.title,
      `<h1>${esc(room.title)}</h1><p class="sub wait">아직 열리지 않았습니다.</p>`,
      stamp,
    );
  }

  const all = (await course(env)).categories;
  const open = visible(all, room.unlocked);

  if (parts.length === 1) {
    // 잠긴 카테고리도 이름만 보여 준다. 진도가 어디까지 남았는지 알면 덜 불안하다.
    // 본문은 여전히 안 내려간다. 그것이 이 파일이 존재하는 이유다.
    const locked = all.filter((c: CourseCategory) => !room.unlocked.includes(c.slug));
    const cards = open.length
      ? open
          .map((c, i) => {
            const n = String(i + 1).padStart(2, "0");
            const posts = c.posts
              .map(
                (p, j) =>
                  `<a class="post" href="/cr/${esc(slug)}/${esc(c.slug)}/${esc(p.id)}"><b>${String(
                    j + 1,
                  ).padStart(2, "0")}</b><span>${esc(p.title)}</span></a>`,
              )
              .join("");
            return `<div class="cat"><div class="cat-h"><span class="cat-n">${n}</span>
              <h2>${esc(c.title)}</h2><span class="state on">열림</span></div>
              ${c.goal ? `<p class="goal">이 카테고리를 덮으면 ${esc(c.goal)} 것이 됩니다.</p>` : ""}
              ${posts}
            </div>`;
          })
          .join("")
      : '<p class="wait">곧 시작합니다. 이 화면을 열어 두시면 됩니다.</p>';
    const later = locked.length
      ? `<div class="later"><p class="later-h">다음에 열립니다</p>${locked
          .map(
            (c) =>
              `<div class="later-row"><span>${esc(c.title)}</span><span>${c.posts.length}편</span></div>`,
          )
          .join("")}</div>`
      : "";
    const total = open.reduce((n, c) => n + c.posts.length, 0);
    return page(
      room.title,
      `${header()}
       <section class="hero">
         <p class="eyebrow">파이썬 업무자동화</p>
         <h1>${esc(room.title)}</h1>
         <p class="sub">${
           total
             ? `${open.length}개 과정 ${total}편이 열려 있습니다. 순서대로 따라오시면 됩니다.`
             : "곧 시작합니다. 이 화면을 열어 두고 기다리시면 됩니다."
         }</p>
       </section>${cards}${later}`,
      stamp,
    );
  }

  if (parts.length === 3) {
    const category = open.find((c) => c.slug === parts[1]);
    // 잠긴 카테고리는 본문을 만들지도 않는다. 여기서 막는 것이 이 설계의 요점이다.
    if (!category) return new Response("아직 열리지 않았습니다.", { status: 404 });
    const at = category.posts.findIndex((p) => p.id === parts[2]);
    const post = category.posts[at];
    if (!post) return new Response("없는 글입니다.", { status: 404 });
    const { html, headings } = renderPost(post.body);

    // 왼쪽. 같은 과정의 글을 오간다. 강의 중에 앞 편으로 되돌아가는 일이 잦다.
    const nav = category.posts
      .map(
        (p, i) =>
          `<a class="nav-post${p.id === post.id ? " on" : ""}" href="/cr/${esc(slug)}/${esc(
            category.slug,
          )}/${esc(p.id)}"><b>${String(i + 1).padStart(2, "0")}</b><span>${esc(p.title)}</span></a>`,
      )
      .join("");

    // 오른쪽. 절이 스물 몇 개라 목차 없이는 강사가 원하는 자리를 스크롤로 찾아야 한다.
    const toc = headings.length
      ? `<details class="toc" open><summary class="toc-h"><span>목차</span><span class="toc-at">1 / ${
          headings.length
        }</span></summary>${headings
          .map(
            (h: string, i: number) =>
              `<a href="#s${i + 1}" data-to="s${i + 1}"><b>${String(i + 1).padStart(
                2,
                "0",
              )}</b><span>${esc(h)}</span></a>`,
          )
          .join("")}</details>`
      : "";

    const prev = category.posts[at - 1];
    const next = category.posts[at + 1];
    const foot =
      prev || next
        ? `<div class="pager">${
            prev
              ? `<a href="/cr/${esc(slug)}/${esc(category.slug)}/${esc(prev.id)}"><span>이전</span><b>${esc(prev.title)}</b></a>`
              : "<i></i>"
          }${
            next
              ? `<a class="nx" href="/cr/${esc(slug)}/${esc(category.slug)}/${esc(next.id)}"><span>다음</span><b>${esc(next.title)}</b></a>`
              : "<i></i>"
          }</div>`
        : "";

    return page(
      post.title,
      `<div class="prog" aria-hidden="true"><i></i></div>
       ${header()}
       <div class="lay">
         <aside class="side">
           <a class="back" href="/cr/${esc(slug)}">← ${esc(room.title)}</a>
           <p class="side-h">${esc(category.title)}</p>
           ${nav}
         </aside>
         <main class="body">
           <p class="eyebrow">${esc(category.title)} · ${at + 1}편</p>
           <h1>${esc(post.title)}</h1>
           <p class="sub">${esc(post.summary)}</p>
           <article>${html}</article>
           ${foot}
         </main>
         ${toc}
       </div>`,
      stamp + TOC_SCRIPT,
      true,
    );
  }

  return new Response("not found", { status: 404 });
}
