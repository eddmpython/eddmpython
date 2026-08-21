/**
 * 강의장. 운영자가 자기 노트북의 운영 화면에서 방을 만들고 그 자리에서 비밀번호를 건다.
 *
 * 설계 근거는 ../eddmpython-course/memory/architecture/courseRoom.md 다. 원칙 넷이다.
 *
 * 1. 운영 화면은 로컬호스트에만 있다. 공개 서버에는 운영자용 페이지가 없다
 * 2. 방은 실행 중에 생긴다. 만드는 즉시 /cr/<이름> 주소가 살아난다. 배포가 필요 없다
 * 3. 비밀번호는 방을 만들 때 그 자리에서 건다. Worker secret 이 아니라 방의 상태다
 * 4. 닫힌 카테고리의 본문은 아예 안 내려간다. 가리는 것이 아니라 안 주는 것이다
 *
 * 4번이 이 파일이 존재하는 이유다. 클라이언트에서 거르면 개발자 도구로 앞 내용을 먼저 본다.
 */
import { esc, renderLecture, renderPost, type Cells, type CourseScene } from "./classroom-render";
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

export type CoursePost = { id: string; title: string; summary: string; body: string; scenes?: CourseScene[] };
export type CourseCategory = {
  slug: string;
  order: number;
  title: string;
  /** 이 카테고리를 덮을 때 독자의 일 하나가 무엇이 되는지. schema 2 부터 온다 */
  goal?: string;
  /** 실행 칸 예제. schema 3 부터 온다. 교안이 링크로 부르고 렌더러가 칸으로 그린다 */
  cells?: Cells;
  posts: CoursePost[];
};
type CourseBundle = { schema: number; sceneContract?: number; categories: CourseCategory[] };

/**
 * 묶음의 모양은 eddmpython-course 와의 계약이다. 바꾸면 양쪽을 같은 날 같이 고친다.
 *
 * **두 판을 같이 받는다.** 하나만 받으면 발행과 배포 사이에 강의장이 빈 목록을 낸다.
 * 어느 쪽을 먼저 하든 그 틈이 생기고, 하필 강의 직전이면 그것이 사고다.
 * 2 는 카테고리 성과(goal)가 붙은 판이고 1 은 그 전 판이다.
 */
const COURSE_SCHEMA = new Set([1, 2, 3, 4]);
const COURSE_SCENE_CONTRACT = 1;

export type CourseState = { ok: boolean; categories: CourseCategory[] };

const isPost = (p: unknown): p is CoursePost =>
  !!p &&
  typeof (p as CoursePost).id === "string" &&
  typeof (p as CoursePost).title === "string" &&
  typeof (p as CoursePost).body === "string";

const sceneRoles = new Set(["open", "explain", "invert", "close"]);
const sceneLayouts = new Set(["stage", "sequence", "compare", "code", "demo"]);
const sceneEffects = new Set(["enter", "replace", "focus", "compare", "annotate", "run", "simulate"]);
const isScene = (value: unknown): value is CourseScene => {
  if (!value || typeof value !== "object") return false;
  const scene = value as CourseScene;
  return (
    typeof scene.id === "string" &&
    sceneRoles.has(scene.role) &&
    sceneLayouts.has(scene.layout) &&
    Number.isInteger(scene.visualCount) &&
    scene.visualCount > 0 &&
    Array.isArray(scene.beats) &&
    scene.beats.every(
      (beat) =>
        beat &&
        sceneEffects.has(beat.effect) &&
        Array.isArray(beat.targets) &&
        beat.targets.length > 0 &&
        beat.targets.every((target) => Number.isInteger(target) && target > 0 && target <= scene.visualCount) &&
        (beat.note === undefined || typeof beat.note === "string"),
    )
  );
};

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
  if (bundle.schema === 4 && bundle.sceneContract !== COURSE_SCENE_CONTRACT) {
    return { ok: false, categories: [] };
  }
  const categories = bundle.categories
    .filter((c) => c && typeof c.slug === "string" && Array.isArray(c.posts))
    .map((c) => ({
      ...c,
      order: Number(c.order) || 0,
      posts: c.posts.filter(isPost).map((post) => ({
        ...post,
        scenes: Array.isArray(post.scenes) ? post.scenes.filter(isScene) : undefined,
      })),
    }))
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

    /**
     * 검수를 마친 방을 수강생에게 줄 제품 주소로 옮긴다.
     *
     * 방을 새로 만들면 기존 비밀번호 원문을 다시 알아야 한다. 주소와 이름만 바꾸면 비밀번호
     * 해시는 그대로 보존할 수 있다. 두 키를 따로 쓰면 중간에 두 방이 보이거나 둘 다 사라질 수
     * 있으므로 한 트랜잭션에서 새 키를 쓰고 옛 키를 지운다.
     */
    if (action === "rename") {
      const nextSlug = typeof body.nextSlug === "string" ? body.nextSlug.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!validSlug(nextSlug)) {
        return Response.json({ error: "주소로 쓸 수 없는 이름입니다" }, { status: 400 });
      }
      if (!title || title.length > 60) {
        return Response.json({ error: "강의장 이름은 한 자 이상 60자 이하로 적어 주세요" }, { status: 400 });
      }

      const moved = await this.state.storage.transaction(async (txn) => {
        const current = await txn.get<Room>(`room:${slug}`);
        if (!current) return "missing";
        if (nextSlug !== slug && (await txn.get<Room>(`room:${nextSlug}`))) return "exists";

        current.slug = nextSlug;
        current.title = title;
        if (nextSlug !== slug) {
          // 예전 검수 주소에서 받은 세션으로 제품 방에 들어오지 못하게 한다.
          current.gen = randomHex(8);
          current.fails = 0;
          current.lockedUntil = 0;
        }
        await txn.put(`room:${nextSlug}`, current);
        if (nextSlug !== slug) await txn.delete(`room:${slug}`);
        return "ok";
      });

      if (moved === "missing") {
        return Response.json({ error: "없는 방입니다" }, { status: 404 });
      }
      if (moved === "exists") {
        return Response.json({ error: "옮길 주소에 이미 방이 있습니다" }, { status: 409 });
      }
      return Response.json({ ok: true, slug: nextSlug });
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
:root[data-theme="light"] {
  color-scheme:light;
  --eddm-carbon:${TOKENS.color.ivory};
  --eddm-ink:color-mix(in srgb, ${TOKENS.color.ivory} 92%, ${TOKENS.color.carbon});
  --eddm-ivory:${TOKENS.color.carbon};
  --eddm-sand:color-mix(in srgb, ${TOKENS.color.sand} 45%, ${TOKENS.color.carbon});
  --eddm-text:color-mix(in srgb, ${TOKENS.color.carbon} 78%, transparent);
  --eddm-text-muted:color-mix(in srgb, ${TOKENS.color.carbon} 58%, transparent);
  --eddm-text-dim:color-mix(in srgb, ${TOKENS.color.carbon} 45%, transparent);
  --eddm-text-faint:color-mix(in srgb, ${TOKENS.color.carbon} 35%, transparent);
  --eddm-line:color-mix(in srgb, ${TOKENS.color.carbon} 8%, transparent);
  --eddm-line-base:color-mix(in srgb, ${TOKENS.color.carbon} 11%, transparent);
  --eddm-line-strong:color-mix(in srgb, ${TOKENS.color.carbon} 17%, transparent);
  --eddm-raise:color-mix(in srgb, ${TOKENS.color.carbon} 4%, transparent);
  --eddm-hover:color-mix(in srgb, ${TOKENS.color.carbon} 8%, transparent);
  --eddm-accent-line:color-mix(in srgb, var(--eddm-sand) 35%, transparent);
  --eddm-accent-bg:color-mix(in srgb, var(--eddm-sand) 10%, transparent);
  --eddm-accent-dim:color-mix(in srgb, var(--eddm-sand) 72%, transparent);
}
* { box-sizing: border-box; }
body { margin:0; background:var(--eddm-carbon); color:var(--eddm-ivory); font-family:${TOKENS.font.sans}; word-break:keep-all; -webkit-font-smoothing:antialiased;
  line-height:1.7; -webkit-text-size-adjust:100%; }
:focus-visible { outline:2px solid var(--eddm-accent-dim); outline-offset:2px; border-radius:.25rem; }
::selection { background:var(--eddm-accent-line); }
.wrap { max-width:56rem; margin:0 auto; padding:2.5rem 1.25rem 5rem; }
.wrap.wide { max-width:88rem; }

/* 머리띠. 랜딩 Nav.tsx 의 실측값 그대로다. 값을 바꾸면 두 화면이 어긋난다 */
.hd { display:flex; flex-direction:column; align-items:center; gap:20px; margin-bottom:56px; }
.hd-logo { display:flex; align-items:center; gap:10px; text-decoration:none; border:0; color:inherit; }
.hd-symbol { height:21px; width:auto; color:var(--eddm-ivory); display:block; }
.hd-word { font-size:15px; letter-spacing:-.025em; line-height:1.5; color:var(--eddm-ivory); }
.hd-word b { font-weight:700; }
.hd-word i { font-style:normal; font-weight:400; color:var(--eddm-text); }
.hd-right { display:flex; flex-wrap:wrap; align-items:center; justify-content:center;
  column-gap:20px; row-gap:10px; font-size:14px; line-height:1.4285714; color:var(--eddm-text); }
.hd .nav-link { color:inherit; text-decoration:none; border:0; transition:color .15s cubic-bezier(.4,0,.2,1); }
.hd .nav-link:hover { color:var(--eddm-ivory); }
.hd-icons { display:flex; align-items:center; gap:14px; }
.hd .nav-icon { color:var(--eddm-text-muted); border:0; transition:color .15s cubic-bezier(.4,0,.2,1); }
.hd .nav-icon:hover { color:var(--eddm-ivory); }
.hd .nav-icon svg { height:18px; width:18px; display:block; }
.hd .theme-toggle { display:grid; place-items:center; width:2.15rem; height:2.15rem; margin:0; padding:0;
  border:1px solid var(--eddm-line-base); border-radius:.55rem; background:var(--eddm-raise);
  color:var(--eddm-text-muted); cursor:pointer; transition:color .15s cubic-bezier(.4,0,.2,1),
  background .15s cubic-bezier(.4,0,.2,1), border-color .15s cubic-bezier(.4,0,.2,1); }
.hd .theme-toggle:hover { border-color:var(--eddm-line-strong); background:var(--eddm-hover); color:var(--eddm-ivory); }
.hd .theme-toggle svg { display:none; width:17px; height:17px; }
:root[data-theme="light"] .theme-toggle .theme-icon-moon { display:block; }
:root[data-theme="dark"] .theme-toggle .theme-icon-sun { display:block; }
@media (min-width:768px) {
  .hd { flex-direction:row; justify-content:space-between; gap:0; margin-bottom:64px; }
}

.eyebrow { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase;
  color:var(--eddm-sand); margin:0 0 .6rem; }
.hero { margin-bottom:2.5rem; }
.hero h1 { margin:0 0 .6rem; font-size:1.9rem; letter-spacing:-.02em; line-height:1.25; }
.hero .sub { margin:0; color:var(--eddm-text-muted); }
.gate { position:relative; overflow:hidden; max-width:42rem; margin:0 auto; padding:2rem;
  border:1px solid var(--eddm-line-base); border-radius:1rem; background:var(--eddm-raise); }
.gate::before { content:""; position:absolute; top:0; left:0; right:0; height:2px;
  background:var(--eddm-sand); opacity:.65; }
.gate h1 { font-size:clamp(1.75rem,5vw,2.35rem); line-height:1.2; letter-spacing:-.03em; }
.gate .sub { max-width:34rem; margin-bottom:0; color:var(--eddm-text-muted); line-height:1.8; }
.gate form { margin-top:2rem; }
.gate input[type=password] { background:var(--eddm-carbon); }
@media (max-width:520px) {
  .gate { padding:1.5rem; }
  .gate form { flex-direction:column; }
  .gate input[type=password] { flex:0 0 auto; width:100%; }
  .gate button { width:100%; }
}

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
.body-top { display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem; }
.body-title { min-width:0; }
.lecture-open { flex:0 0 auto; display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem;
  padding:.55rem .8rem; border:1px solid var(--eddm-accent-line); border-radius:.6rem;
  background:var(--eddm-accent-bg); color:var(--eddm-sand); font-size:.82rem; font-weight:500; }
.lecture-open svg { width:16px; height:16px; }
.lecture-open:hover { border-color:var(--eddm-sand); }
@media (max-width:640px) {
  .body-top { display:block; }
  .lecture-open { margin:0 0 1.5rem; }
}

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
figure.media { margin:1.75rem 0; }
figure.media img, figure.media video { margin:0; }
figure.media figcaption { margin-top:.55rem; font-size:.86rem; line-height:1.6; color:var(--eddm-text-muted); }
/* 섹션과 섹션 사이를 벌리고 윗선으로 가른다. 스크롤할 때 경계가 눈에 보여야 한다.
   h3 는 h2 를 풀어 쓴 부제라 h2 에 붙여 두고 본문 색보다 흐리게 둔다. */
article h2 { margin:4rem 0 .5rem; padding-top:1.75rem; border-top:1px solid var(--eddm-line);
  font-size:var(--eddm-section-title-size-mobile); font-weight:var(--eddm-section-title-weight);
  letter-spacing:var(--eddm-section-title-tracking); line-height:var(--eddm-section-title-line-height);
  display:flex; gap:1.25rem; align-items:baseline; }
@media (min-width:768px) {
  article h2 { font-size:var(--eddm-section-title-size-desktop); }
}
article h2:first-child { margin-top:0; padding-top:0; border-top:0; }
/* 섹션 번호. 목차의 번호와 같아서 지금 몇 번째인지 세지 않고 안다. */
article h2 .sn { flex:0 0 auto; font-size:.82rem; font-weight:500; letter-spacing:.04em;
  color:var(--eddm-accent-dim); font-variant-numeric:tabular-nums; }
article h3 { margin:0 0 1.5rem 2.1rem; font-size:.95rem; font-weight:400; line-height:1.65; color:var(--eddm-text-muted); }
article h3 + figure.media, article h3 + .slider, article h3 + .yt,
article h3 + img, article h3 + video, article h3 + .pending { margin-top:.7rem; }
article p { margin:1.25rem 0; line-height:1.85; color:var(--eddm-text); }
/* 사례 라벨과 바로 아래 시각물을 한 묶음으로 보이게 한다. 위 본문과는 벌리고 이미지는 붙인다. */
article p.lb { display:flex; align-items:center; gap:.6rem; margin:2.4rem 0 .55rem; padding:.55rem .75rem;
  border-left:2px solid var(--eddm-sand); border-radius:0 .45rem .45rem 0;
  background:var(--eddm-raise); color:var(--eddm-ivory); }
article p.lb::before { content:""; flex:0 0 auto; width:5px; height:5px; border-radius:50%; background:var(--eddm-sand); }
article p.lb strong { font-weight:500; font-size:.95rem; }
article p.lb + figure.media, article p.lb + .slider, article p.lb + .yt,
article p.lb + img, article p.lb + video, article p.lb + .pending { margin-top:0; }
article ul, article ol { margin:1.25rem 0; padding-left:1.25rem; line-height:1.85; color:var(--eddm-text); }
article li { margin:.5rem 0; }
article li::marker { color:var(--eddm-accent-dim); }
article pre { overflow-x:auto; background:#00000055; padding:1rem; border-radius:.6rem; }
.table-wrap { margin:1.5rem 0; overflow-x:auto; border:1px solid var(--eddm-line-base); border-radius:.65rem; }
article table { width:100%; min-width:42rem; border-collapse:collapse; }
article th, article td { padding:.75rem .85rem; border-bottom:1px solid var(--eddm-line-base);
  text-align:left; vertical-align:top; line-height:1.6; }
article th { color:var(--eddm-ivory); background:var(--eddm-hover); font-size:.86rem; font-weight:500; }
article td { color:var(--eddm-text); font-size:.88rem; }
article tbody tr:last-child td { border-bottom:0; }
.cell { margin:1.9rem 0; border:1px solid var(--eddm-accent-line); border-radius:.85rem; overflow:hidden;
  background:var(--eddm-raise); }
.cell.bad { border-color:#e0908a66; }
.cell-h { display:flex; align-items:center; gap:.5rem; padding:.7rem 1rem;
  border-bottom:1px solid var(--eddm-line-base); background:var(--eddm-accent-bg); }
.cell-dot { width:6px; height:6px; border-radius:50%; background:var(--eddm-sand); flex:0 0 auto; }
.cell-k { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--eddm-sand); }
.cell-s { margin-left:auto; font-size:.78rem; color:var(--eddm-text-faint); }
.cell-t { margin:.9rem 1rem .2rem; font-size:.98rem; color:var(--eddm-text); font-weight:500; }
.cell-d { margin:.2rem 1rem .8rem; font-size:.88rem; line-height:1.7; color:var(--eddm-text-muted); }
.cell-c { display:block; width:100%; box-sizing:border-box; resize:vertical; border:0; outline:0;
  background:#00000055; color:var(--eddm-text); padding:.9rem 1rem; line-height:1.65;
  font-family:inherit; font-size:.86rem; white-space:pre; overflow-x:auto; }
.cell-c:focus { background:#00000077; }
.cell-b { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; padding:.75rem 1rem;
  border-top:1px solid var(--eddm-line-base); }
.cell-b button { border-radius:.5rem; padding:.4rem .9rem; font-size:.86rem; cursor:pointer;
  border:1px solid var(--eddm-line-strong); background:transparent; color:var(--eddm-text); }
.cell-b button[data-run] { background:var(--eddm-ivory); color:var(--eddm-carbon); border-color:transparent; font-weight:500; }
.cell-b button:disabled { opacity:.5; cursor:default; }
.cell-hint { font-size:.78rem; color:var(--eddm-text-faint); }
.cell-o { margin:0; padding:.9rem 1rem; border-top:1px solid var(--eddm-line-base);
  background:transparent; border-radius:0; max-height:18rem; overflow:auto; font-size:.82rem;
  line-height:1.6; color:var(--eddm-text-muted); white-space:pre-wrap; word-break:break-word; }
.cell.bad .cell-o { color:#e0908a; }
.cell-miss { padding:1rem; color:#e0908a; font-size:.88rem; }
.cell-miss i { display:block; margin-top:.3rem; font-style:normal; color:var(--eddm-text-faint); }
.slider { display:flex; gap:.75rem; overflow-x:auto; scroll-snap-type:x mandatory; margin:1.2rem 0; }
.slider figure.media { scroll-snap-align:center; flex:0 0 88%; margin:0; }
.slider img { margin:0; }
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

/* 같은 교안의 강의 장면 투영. 읽기 본문과 별도 슬라이드 원고를 만들지 않는다. */
.lecture-deck[hidden] { display:none; }
.lecture-deck { position:fixed; inset:0; z-index:100; display:grid; grid-template-rows:auto minmax(0,1fr) auto;
  --eddm-lecture-progress:0%;
  width:100vw; height:100vh; max-width:none; max-height:none; margin:0; padding:0;
  overflow:hidden; background:
    radial-gradient(circle at 50% -18%, var(--eddm-accent-bg), transparent 42%),
    linear-gradient(145deg, color-mix(in srgb,var(--eddm-ink) 92%,var(--eddm-sand)), var(--eddm-carbon) 58%);
  color:var(--eddm-ivory); }
.lecture-deck:fullscreen { width:100vw; height:100vh; max-width:none; max-height:none; margin:0; padding:0; }
body.lecture-on { overflow:hidden; }
.lecture-bar { position:relative; z-index:4; display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
  align-items:center; gap:1rem; min-height:4.75rem; padding:.7rem clamp(1rem,2vw,2rem);
  border-bottom:1px solid var(--eddm-line-base); background:color-mix(in srgb,var(--eddm-carbon) 88%,transparent);
  backdrop-filter:blur(18px); }
.lecture-bar::after { content:""; position:absolute; left:0; bottom:-1px; width:var(--eddm-lecture-progress);
  height:2px; background:var(--eddm-sand); box-shadow:0 0 1.25rem var(--eddm-accent-line);
  transition:width .28s ease-out; }
.lecture-brand { min-width:0; display:flex; align-items:center; gap:.75rem; color:var(--eddm-text-muted); }
.lecture-symbol-wrap { flex:0 0 auto; display:grid; place-items:center; width:2.45rem; height:2.45rem;
  border:1px solid var(--eddm-accent-line); border-radius:.75rem; background:var(--eddm-accent-bg); }
.lecture-symbol { width:1.35rem; height:auto; color:var(--eddm-ivory); }
.lecture-brand-copy { min-width:0; display:grid; gap:.14rem; }
.lecture-brand-copy b { color:var(--eddm-ivory); font-size:.74rem; font-weight:600; letter-spacing:.08em;
  text-transform:uppercase; }
.lecture-brand-copy i { overflow:hidden; color:var(--eddm-text-muted); font-size:.78rem; font-style:normal;
  white-space:nowrap; text-overflow:ellipsis; }
.lecture-progress { position:relative; min-width:8.6rem; padding:.52rem .9rem; overflow:hidden;
  border:1px solid var(--eddm-line-base); border-radius:999px; background:var(--eddm-raise);
  color:var(--eddm-sand); font-size:.76rem; font-weight:600; letter-spacing:.04em; text-align:center;
  font-variant-numeric:tabular-nums; }
.lecture-actions { display:flex; justify-content:flex-end; gap:.45rem; }
.lecture-actions button, .lecture-foot button { display:flex; align-items:center; justify-content:center; gap:.45rem;
  min-width:2.55rem; height:2.55rem; padding:.35rem .78rem; border:1px solid var(--eddm-line-base);
  border-radius:.72rem; background:var(--eddm-raise); color:var(--eddm-text-muted); font-size:.76rem;
  transition:color .15s ease, border-color .15s ease, background .15s ease, transform .15s ease; }
.lecture-actions button:hover, .lecture-foot button:hover { color:var(--eddm-ivory); border-color:var(--eddm-accent-line);
  background:var(--eddm-accent-bg); transform:translateY(-1px); }
.lecture-actions button > svg, .lecture-foot button > svg { width:1rem; height:1rem; flex:0 0 auto; }
.lecture-stage { position:relative; min-height:0; overflow:hidden; isolation:isolate; }
.lecture-stage::before { content:""; position:absolute; z-index:-1; inset:8% 18% 10%; border-radius:50%;
  background:radial-gradient(ellipse,var(--eddm-accent-bg),transparent 68%); filter:blur(24px); pointer-events:none; }
.lecture-scene { display:none; position:relative; width:100%; height:100%;
  padding:clamp(1.2rem,3.2vw,3.25rem) clamp(1rem,5vw,5rem);
  grid-template-rows:auto minmax(0,1fr) auto; gap:clamp(.9rem,2vh,1.6rem); }
.lecture-scene.on { display:grid; }
.scene-head { position:relative; z-index:2; display:flex; align-items:flex-start; gap:1rem; max-width:92rem;
  width:100%; margin:0 auto; }
.scene-head > span { flex:0 0 auto; display:grid; place-items:center; width:2.3rem; height:2.3rem;
  border:1px solid var(--eddm-accent-line); border-radius:.72rem; background:var(--eddm-accent-bg);
  color:var(--eddm-sand); font-size:.75rem; font-weight:600; font-variant-numeric:tabular-nums; }
.scene-head > div { min-width:0; }
.scene-head h2 { margin:0; font-size:clamp(1.85rem,3.15vw,3.55rem); line-height:1.1; letter-spacing:-.04em; }
.scene-head p { max-width:68rem; margin:.65rem 0 0; color:var(--eddm-text-muted);
  font-size:clamp(.92rem,1.25vw,1.18rem); line-height:1.55; }
.lecture-scene[data-scene-empty="true"] { grid-template-rows:minmax(0,1fr); }
.lecture-scene[data-scene-empty="true"] .scene-head { align-self:center; max-width:78rem; }
.lecture-scene[data-scene-empty="true"] .scene-head > span { width:3rem; height:3rem; margin-top:.35rem;
  border-radius:.9rem; font-size:.82rem; }
.lecture-scene[data-scene-empty="true"] .scene-head h2 { max-width:68rem;
  font-size:clamp(3.15rem,6.2vw,7rem); line-height:1.02; letter-spacing:-.055em; }
.lecture-scene[data-scene-empty="true"] .scene-head p { max-width:48rem; margin-top:1.15rem;
  font-size:clamp(1rem,1.6vw,1.35rem); line-height:1.6; }
.lecture-scene[data-scene-empty="true"] .scene-canvas,
.lecture-scene[data-scene-empty="true"] .scene-callout { display:none; }
.scene-canvas { align-self:stretch; display:grid; grid-template-columns:minmax(0,1fr); align-items:center;
  justify-items:center; gap:clamp(.75rem,2vw,1.5rem); width:min(92rem,100%); min-height:0; margin:0 auto; }
.scene-canvas > p:not(.lb), .scene-canvas > ul, .scene-canvas > ol { display:none; }
.scene-canvas .slider { display:contents; }
.scene-canvas .lb, .scene-canvas h4 { display:none; grid-column:1/-1; justify-self:start; margin:0;
  padding:.5rem .72rem; border:1px solid var(--eddm-line-base); border-radius:.62rem;
  background:color-mix(in srgb,var(--eddm-ink) 82%,transparent); color:var(--eddm-sand);
  font-size:.8rem; font-weight:600; }
.scene-canvas [data-scene-label-visible="true"] { display:flex; }
.scene-canvas [data-visual] { display:none; justify-self:center; max-width:100%; max-height:100%; margin:0; opacity:1; }
.scene-canvas [data-visual][data-scene-visible="true"] { display:block; animation:scene-enter .28s ease-out both; }
.scene-canvas figure.media[data-scene-visible="true"] { display:grid; }
.scene-canvas [data-visual][data-scene-effect="replace"] { animation-name:scene-replace; }
.scene-canvas [data-visual][data-scene-effect="focus"] { filter:drop-shadow(0 0 1rem var(--eddm-accent-line)); }
.scene-canvas [data-visual][data-scene-dim="true"] { opacity:.18; filter:saturate(.55); }
.scene-canvas [data-visual][data-scene-live="true"] { outline:3px solid var(--eddm-sand); outline-offset:4px; }
.scene-canvas figure.media img, .scene-canvas figure.media video, .scene-canvas .yt,
.scene-canvas .course-embed, .scene-canvas iframe { max-height:57vh; max-width:100%; margin:0 auto; }
.scene-canvas figure.media, .scene-canvas .yt, .scene-canvas .course-embed { width:76rem; max-width:100%; }
.scene-canvas figure.media img, .scene-canvas figure.media video {
  width:auto; height:auto; max-width:100%; justify-self:center;
  object-fit:contain; object-position:center; border:1px solid var(--eddm-line-strong); border-radius:1rem;
  background:var(--eddm-ink); box-shadow:0 1.7rem 5rem color-mix(in srgb,var(--eddm-ink) 48%,transparent); }
html[data-theme="light"] .scene-canvas figure.media img,
html[data-theme="light"] .scene-canvas figure.media video {
  box-shadow:0 1.7rem 5rem color-mix(in srgb,var(--eddm-ivory) 18%,transparent); }
.scene-canvas figure.media[data-scene-visible="true"] {
  width:auto; max-width:none; justify-self:stretch; justify-items:center; align-content:center; }
.scene-canvas figure.media figcaption, .scene-canvas .yt figcaption, .scene-canvas .course-embed figcaption {
  margin-top:.7rem; padding:.4rem .68rem; border:1px solid var(--eddm-line-base); border-radius:999px;
  background:color-mix(in srgb,var(--eddm-carbon) 88%,transparent); color:var(--eddm-text-muted);
  font-size:.75rem; line-height:1.4; }
.scene-canvas figure.media figcaption { width:max-content; max-width:100%; text-align:center; }
.scene-canvas pre { width:76rem; max-width:100%; max-height:57vh; overflow:auto; margin:0; padding:clamp(1rem,2.2vw,2rem);
  border:1px solid var(--eddm-line-strong); border-radius:1rem;
  background:color-mix(in srgb,var(--eddm-ink) 94%,var(--eddm-sand)); color:var(--eddm-ivory);
  box-shadow:0 1.4rem 4rem color-mix(in srgb,var(--eddm-ink) 42%,transparent);
  font-family:${TOKENS.font.mono}; font-size:clamp(.82rem,1.35vw,1.15rem); line-height:1.65; white-space:pre; }
html[data-theme="light"] .scene-canvas pre {
  box-shadow:0 1.4rem 4rem color-mix(in srgb,var(--eddm-ivory) 14%,transparent); }
.scene-canvas .table-wrap { width:76rem; max-width:100%; max-height:57vh; overflow:auto;
  border:1px solid var(--eddm-line-strong); border-radius:1rem; background:var(--eddm-raise); }
.scene-canvas table { width:100%; border-collapse:collapse; }
.scene-canvas th, .scene-canvas td { padding:.75rem .9rem; border-bottom:1px solid var(--eddm-line-base); text-align:left; }
.scene-canvas th { background:var(--eddm-hover); color:var(--eddm-ivory); }
.scene-canvas td { color:var(--eddm-text); }
.scene-canvas .cell { width:76rem; max-width:100%; max-height:57vh; overflow:auto; margin:0; }
.scene-canvas .course-embed { width:76rem; max-width:100%; }
.course-embed iframe { display:block; width:100%; aspect-ratio:var(--course-embed-ratio,16/9); border:0; border-radius:.65rem;
  background:var(--eddm-raise); }
.course-embed figcaption { margin-top:.55rem; color:var(--eddm-text-muted); }
.lecture-scene[data-active-layout="compare"] .scene-canvas {
  grid-template-columns:repeat(2,minmax(0,1fr)); align-content:center; align-items:start;
  column-gap:clamp(1.2rem,3vw,2.25rem); row-gap:.65rem; }
.lecture-scene[data-active-layout="compare"] .scene-canvas [data-scene-label-for] { width:100%; box-sizing:border-box; }
.lecture-scene[data-active-layout="compare"] .scene-canvas pre { width:100%; height:clamp(12rem,28vh,18rem);
  min-height:0; box-sizing:border-box; white-space:pre-wrap; overflow-wrap:anywhere; }
.lecture-scene[data-active-layout="compare"] .scene-canvas [data-scene-label-for][data-scene-slot="1"] {
  grid-column:1; grid-row:1; }
.lecture-scene[data-active-layout="compare"] .scene-canvas [data-scene-label-for][data-scene-slot="2"] {
  grid-column:2; grid-row:1; }
.lecture-scene[data-active-layout="compare"] .scene-canvas [data-visual][data-scene-slot="1"] {
  grid-column:1; grid-row:2; }
.lecture-scene[data-active-layout="compare"] .scene-canvas [data-visual][data-scene-slot="2"] {
  grid-column:2; grid-row:2; }
.lecture-scene[data-layout="sequence"] .scene-canvas { grid-template-columns:minmax(0,1fr); }
.lecture-scene[data-layout="code"] .scene-canvas pre { width:88rem; max-width:100%; }
.lecture-scene[data-layout="demo"] .scene-canvas [data-visual] { width:82rem; max-width:100%; }
.scene-callout { min-height:2.5rem; max-width:72rem; margin:0 auto; padding:.65rem 1rem; border:1px solid transparent;
  border-left-width:3px; border-radius:.7rem;
  color:transparent; font-size:clamp(.85rem,1.15vw,1rem); line-height:1.55; }
.scene-callout.on { border-color:var(--eddm-accent-line); border-left-color:var(--eddm-sand);
  background:var(--eddm-accent-bg); color:var(--eddm-ivory); }
.lecture-notes { position:absolute; right:1.25rem; bottom:1rem; z-index:3; width:min(32rem,calc(100% - 2.5rem));
  max-height:45%; overflow:auto; padding:1.15rem 1.25rem; border:1px solid var(--eddm-line-strong); border-radius:1rem;
  background:color-mix(in srgb,var(--eddm-ink) 94%,transparent);
  box-shadow:0 1.5rem 4rem color-mix(in srgb,var(--eddm-ink) 65%,transparent); backdrop-filter:blur(16px); }
.lecture-notes[hidden] { display:none; }
.lecture-notes b { display:block; margin-bottom:.55rem; color:var(--eddm-sand); font-size:.75rem; letter-spacing:.08em; }
.lecture-notes p { margin:0; color:var(--eddm-text); font-size:.85rem; line-height:1.7; white-space:pre-line; }
.lecture-foot { position:relative; z-index:4; display:flex; align-items:center; justify-content:space-between; gap:1rem;
  min-height:4rem; padding:.65rem clamp(1rem,2vw,2rem); border-top:1px solid var(--eddm-line-base);
  background:color-mix(in srgb,var(--eddm-carbon) 88%,transparent); backdrop-filter:blur(18px); }
.lecture-help { color:var(--eddm-text-faint); font-size:.72rem; letter-spacing:.01em; }
.lecture-nav { display:flex; gap:.45rem; }
@keyframes scene-enter { from { opacity:0; transform:translateY(12px) scale(.985); } to { opacity:1; transform:none; } }
@keyframes scene-replace { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:none; } }
@media (max-width:720px) {
  .lecture-bar { grid-template-columns:minmax(0,1fr) auto; min-height:4.2rem; padding:.5rem .75rem; }
  .lecture-symbol-wrap { width:2.25rem; height:2.25rem; }
  .lecture-brand-copy b { font-size:.67rem; }
  .lecture-brand-copy i { font-size:.72rem; }
  .lecture-progress { grid-row:2; grid-column:1/-1; justify-self:stretch; min-width:0; padding:.35rem .7rem;
    border-radius:.55rem; font-size:.7rem; }
  .lecture-actions button { width:2.3rem; min-width:2.3rem; height:2.3rem; padding:0; }
  .lecture-actions button span { display:none; }
  .lecture-scene { padding:1rem .85rem; gap:.7rem; }
  .scene-head { gap:.7rem; }
  .scene-head > span { width:2rem; height:2rem; border-radius:.6rem; font-size:.68rem; }
  .scene-head h2 { font-size:clamp(1.55rem,7vw,2.25rem); }
  .scene-head p { margin-top:.4rem; font-size:.82rem; line-height:1.45; }
  .lecture-scene[data-scene-empty="true"] .scene-head { display:grid; gap:1rem; }
  .lecture-scene[data-scene-empty="true"] .scene-head > span { width:2.6rem; height:2.6rem; margin:0; }
  .lecture-scene[data-scene-empty="true"] .scene-head h2 { font-size:clamp(2.7rem,14vw,4.4rem); }
  .lecture-scene[data-scene-empty="true"] .scene-head p { margin-top:.85rem; font-size:.95rem; }
  .lecture-scene[data-active-layout="compare"] .scene-canvas { grid-template-columns:minmax(0,1fr); }
  .lecture-scene[data-active-layout="compare"] .scene-canvas [data-scene-label-for][data-scene-slot="1"] {
    grid-column:1; grid-row:1; }
  .lecture-scene[data-active-layout="compare"] .scene-canvas [data-visual][data-scene-slot="1"] {
    grid-column:1; grid-row:2; }
  .lecture-scene[data-active-layout="compare"] .scene-canvas [data-scene-label-for][data-scene-slot="2"] {
    grid-column:1; grid-row:3; }
  .lecture-scene[data-active-layout="compare"] .scene-canvas [data-visual][data-scene-slot="2"] {
    grid-column:1; grid-row:4; }
  .lecture-scene[data-active-layout="compare"] .scene-canvas pre { height:clamp(7rem,17vh,9rem); padding:.75rem;
    font-size:.7rem; line-height:1.5; }
  .lecture-help { display:none; }
  .lecture-foot { min-height:3.6rem; padding:.5rem .75rem; justify-content:flex-end; }
  .lecture-foot button { height:2.45rem; }
  .scene-canvas figure.media img, .scene-canvas figure.media video, .scene-canvas .yt,
  .scene-canvas .course-embed, .scene-canvas pre, .scene-canvas .table-wrap, .scene-canvas .cell { max-height:48vh; }
}
@media (prefers-reduced-motion:reduce) {
  .scene-canvas [data-visual][data-scene-visible="true"] { animation:none; }
}
`;

/**
 * 첫 화면을 그리기 전에 시스템 설정이나 저장한 선택을 적용한다. body 뒤에서 바꾸면
 * 라이트 화면이 잠깐 어둡게 번쩍이므로 head에서 먼저 실행한다.
 */
const THEME_INIT_SCRIPT = `
(() => {
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: light)");
  const choices = new Set(["system", "light", "dark"]);
  let saved = "system";
  try {
    const value = localStorage.getItem("eddmpython-classroom-theme");
    if (value && choices.has(value)) saved = value;
  } catch {}
  const set = (choice, persist = true) => {
    const selected = choices.has(choice) ? choice : "system";
    const resolved = selected === "system" ? (media.matches ? "light" : "dark") : selected;
    root.dataset.themeChoice = selected;
    root.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? "${TOKENS.color.ivory}" : "${TOKENS.color.carbon}");
    if (persist) {
      try { localStorage.setItem("eddmpython-classroom-theme", selected); } catch {}
    }
  };
  window.__eddmTheme = { media, set };
  set(saved, false);
})();
`;

/** 아이콘 토글과 시스템 테마 변경을 연결한다. */
const THEME_SCRIPT = `
(() => {
  const api = window.__eddmTheme;
  if (!api) return;
  const root = document.documentElement;
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;
  const sync = () => {
    const current = root.dataset.theme === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    const label = next === "light" ? "라이트 테마로 변경" : "다크 테마로 변경";
    toggle.dataset.nextTheme = next;
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  };
  toggle.addEventListener("click", () => {
    api.set(toggle.dataset.nextTheme);
    sync();
  });
  api.media.addEventListener("change", () => {
    if (root.dataset.themeChoice === "system") api.set("system", false);
    sync();
  });
  sync();
})();
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
 * pyproc 이 고정한 Pyodide 배포판. `site/src/pymachine.ts` 와 **같은 판이어야 한다.**
 * 블로그 실행 칸과 강의장 실행 칸이 다른 파이썬을 돌리면 같은 코드가 다르게 동작한다.
 */
const ENGINE = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

/**
 * 실행 칸을 살린다.
 *
 * **페이지 전체가 파이썬 머신 하나를 나눠 쓴다.** 004 는 실행 칸이 일곱 개인데 칸마다
 * 부팅하면 강의가 멈춘다. 처음 실행을 누를 때만 받아 오고 그 뒤로는 즉시 돈다.
 *
 * 미리 부팅하지 않는 것도 일부러다. 수강생이 글만 읽고 지나가는 편이 훨씬 많은데
 * 페이지를 열자마자 수십 MB 를 받으면 강의장 전체가 느려진다.
 */
const CELL_SCRIPT = `
(() => {
  const cells = document.querySelectorAll("[data-cell]");
  if (!cells.length) return;
  let booting = null;
  const boot = () => {
    if (!booting) {
      booting = import("${ENGINE}pyodide.mjs")
        .then((m) => m.loadPyodide({ indexURL: "${ENGINE}" }))
        .catch((e) => { booting = null; throw e; });
    }
    return booting;
  };
  cells.forEach((cell) => {
    const ta = cell.querySelector("[data-code]");
    const out = cell.querySelector("[data-out]");
    const st = cell.querySelector("[data-state]");
    const run = cell.querySelector("[data-run]");
    const reset = cell.querySelector("[data-reset]");
    if (!ta || !out || !st || !run) return;
    const first = ta.value;
    if (reset) reset.addEventListener("click", () => { ta.value = first; ta.focus(); });
    run.addEventListener("click", async () => {
      run.disabled = true;
      cell.classList.remove("bad");
      out.textContent = "";
      st.textContent = booting ? "실행 중" : "파이썬을 처음 받는 중입니다";
      try {
        const py = await boot();
        st.textContent = "실행 중";
        const lines = [];
        py.setStdout({ batched: (s) => lines.push(s) });
        py.setStderr({ batched: (s) => lines.push(s) });
        const value = await py.runPythonAsync(ta.value);
        if (value !== undefined && value !== null) lines.push(String(value));
        out.textContent = lines.length ? lines.join("\\n") : "(나온 값이 없습니다)";
        st.textContent = "완료";
      } catch (e) {
        out.textContent = e && e.message ? e.message : String(e);
        st.textContent = "오류";
        cell.classList.add("bad");
      } finally {
        run.disabled = false;
      }
    });
  });
})();
`;

/** H2 장면과 선언된 beat를 전체화면 강의 흐름으로 실행한다. */
const LECTURE_SCRIPT = `
(() => {
  const deck = document.querySelector("[data-lecture-deck]");
  const openButton = document.querySelector("[data-lecture-open]");
  if (!deck || !openButton) return;
  const scenes = [...deck.querySelectorAll(".lecture-scene")];
  if (!scenes.length) return;
  const progress = deck.querySelector("[data-lecture-progress]");
  const notes = deck.querySelector("[data-lecture-notes]");
  const notesText = deck.querySelector("[data-lecture-notes-text]");
  const notesButton = deck.querySelector("[data-lecture-notes-toggle]");
  let sceneAt = 0;
  let beatAt = -1;
  let beforeHash = "";
  let opened = false;

  const beatsOf = (scene) => {
    try { return JSON.parse(scene.dataset.beats || "[]"); }
    catch { return []; }
  };
  const targetsOf = (scene, beat) => beat.targets.map((n) => scene.querySelector('[data-visual="' + n + '"]')).filter(Boolean);
  const allVisuals = (scene) => [...scene.querySelectorAll("[data-visual]")];
  const hideAll = (scene) => allVisuals(scene).forEach((visual) => {
    delete visual.dataset.sceneVisible;
    delete visual.dataset.sceneEffect;
    delete visual.dataset.sceneDim;
    delete visual.dataset.sceneLive;
    delete visual.dataset.sceneSlot;
  });

  scenes.forEach((scene) => {
    let labels = [];
    scene.querySelectorAll(".scene-canvas .lb, .scene-canvas h4, .scene-canvas [data-visual]").forEach((node) => {
      if (node.matches("[data-visual]")) {
        labels.forEach((label) => { label.dataset.sceneLabelFor = node.dataset.visual; });
        labels = [];
      } else labels.push(node);
    });
  });

  const syncLabels = (scene) => {
    scene.querySelectorAll("[data-scene-label-for]").forEach((label) => {
      const visual = scene.querySelector('[data-visual="' + label.dataset.sceneLabelFor + '"]');
      label.dataset.sceneLabelVisible = visual?.dataset.sceneVisible === "true" ? "true" : "false";
      if (visual?.dataset.sceneSlot) label.dataset.sceneSlot = visual.dataset.sceneSlot;
      else delete label.dataset.sceneSlot;
    });
  };

  const trigger = (visual, effect) => {
    if (effect === "run") {
      const play = visual.matches("button.ytplay") ? visual : visual.querySelector("button.ytplay");
      const video = visual.matches("video") ? visual : visual.querySelector("video");
      const run = visual.querySelector("[data-run]");
      if (play) play.click();
      else if (video) video.play().catch(() => {});
      else if (run && !run.disabled) run.click();
    }
    if (effect === "simulate") {
      visual.dataset.sceneLive = "true";
      const control = visual.querySelector("button, input, textarea, iframe") || visual;
      if (control.focus) control.focus({ preventScroll:true });
    }
  };

  const apply = (fire = false) => {
    const scene = scenes[sceneAt];
    const beats = beatsOf(scene);
    hideAll(scene);
    delete scene.dataset.activeLayout;
    const callout = scene.querySelector("[data-scene-callout]");
    callout.textContent = "";
    callout.classList.remove("on");
    for (let i = 0; i <= beatAt; i += 1) {
      const beat = beats[i];
      if (!beat) continue;
      const targets = targetsOf(scene, beat);
      allVisuals(scene).forEach((visual) => delete visual.dataset.sceneDim);
      if (beat.effect === "replace" || beat.effect === "compare") hideAll(scene);
      if (beat.effect === "replace") delete scene.dataset.activeLayout;
      targets.forEach((visual) => {
        visual.dataset.sceneVisible = "true";
        visual.dataset.sceneEffect = beat.effect;
      });
      if (beat.effect === "focus") {
        allVisuals(scene).filter((visual) => visual.dataset.sceneVisible === "true" && !targets.includes(visual))
          .forEach((visual) => { visual.dataset.sceneDim = "true"; });
      }
      if (beat.effect === "compare") {
        scene.dataset.activeLayout = "compare";
        targets.forEach((visual, index) => { visual.dataset.sceneSlot = String(index + 1); });
      }
      if (beat.effect === "annotate") {
        callout.textContent = beat.note || "";
        callout.classList.toggle("on", Boolean(beat.note));
      }
      if (fire && i === beatAt && (beat.effect === "run" || beat.effect === "simulate")) {
        targets.forEach((visual) => trigger(visual, beat.effect));
      }
    }
    syncLabels(scene);
    const shown = Math.max(0, beatAt + 1);
    scene.dataset.sceneEmpty = allVisuals(scene).some((visual) => visual.dataset.sceneVisible === "true") ? "false" : "true";
    const ratio = Math.min(1, (sceneAt + (beats.length ? shown / beats.length : 0)) / scenes.length);
    deck.style.setProperty("--eddm-lecture-progress", (ratio * 100).toFixed(2) + "%");
    progress.textContent = String(sceneAt + 1).padStart(2, "0") + " / " + String(scenes.length).padStart(2, "0") + " · " + shown + " / " + beats.length;
    progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    history.replaceState(null, "", "#lecture=" + scene.dataset.scene + "." + shown);
    if (!notes.hidden) fillNotes();
  };

  const showScene = (nextScene, nextBeat = -1, fire = false) => {
    sceneAt = Math.max(0, Math.min(scenes.length - 1, nextScene));
    const beats = beatsOf(scenes[sceneAt]);
    beatAt = Math.max(-1, Math.min(beats.length - 1, nextBeat));
    scenes.forEach((scene, index) => {
      scene.classList.toggle("on", index === sceneAt);
      scene.setAttribute("aria-hidden", index === sceneAt ? "false" : "true");
      if (index !== sceneAt) hideAll(scene);
    });
    apply(fire);
  };

  const next = () => {
    const beats = beatsOf(scenes[sceneAt]);
    if (beatAt < beats.length - 1) showScene(sceneAt, beatAt + 1, true);
    else if (sceneAt < scenes.length - 1) showScene(sceneAt + 1, -1);
  };
  const prev = () => {
    if (beatAt >= 0) showScene(sceneAt, beatAt - 1);
    else if (sceneAt > 0) {
      const before = beatsOf(scenes[sceneAt - 1]);
      showScene(sceneAt - 1, before.length - 1);
    }
  };

  function fillNotes() {
    const scene = scenes[sceneAt];
    const parts = [...scene.querySelectorAll(".scene-canvas > p:not(.lb), .scene-canvas > ul, .scene-canvas > ol")]
      .map((node) => node.textContent.trim()).filter(Boolean);
    notesText.textContent = parts.length ? parts.join("\\n\\n") : "이 장면에는 별도 설명 문단이 없습니다";
  }

  const toggleNotes = () => {
    notes.hidden = !notes.hidden;
    notesButton.setAttribute("aria-pressed", notes.hidden ? "false" : "true");
    if (!notes.hidden) fillNotes();
  };

  const close = async () => {
    if (!opened) return;
    opened = false;
    deck.hidden = true;
    document.body.classList.remove("lecture-on");
    notes.hidden = true;
    notesButton.setAttribute("aria-pressed", "false");
    if (document.fullscreenElement === deck) await document.exitFullscreen().catch(() => {});
    history.replaceState(null, "", beforeHash || location.pathname + location.search);
    openButton.focus();
  };

  const nearestScene = () => {
    const headings = [...document.querySelectorAll("article h2[id]")];
    let found = 0;
    headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top <= innerHeight * .45) found = index; });
    return found;
  };

  const open = async (fromHash = false) => {
    if (opened) return;
    opened = true;
    if (!fromHash) beforeHash = location.hash && !location.hash.startsWith("#lecture=") ? location.hash : location.pathname + location.search;
    deck.hidden = false;
    document.body.classList.add("lecture-on");
    let targetScene = nearestScene();
    let targetBeat = -1;
    const saved = location.hash.match(/^#lecture=(s\\d+)\\.(\\d+)$/);
    if (saved) {
      const found = scenes.findIndex((scene) => scene.dataset.scene === saved[1]);
      if (found >= 0) targetScene = found;
      targetBeat = Number(saved[2]) - 1;
    }
    showScene(targetScene, targetBeat);
    if (!fromHash && deck.requestFullscreen) await deck.requestFullscreen().catch(() => {});
  };

  openButton.addEventListener("click", () => { void open(false); });
  deck.querySelector("[data-lecture-close]").addEventListener("click", () => { void close(); });
  deck.querySelector("[data-lecture-next]").addEventListener("click", next);
  deck.querySelector("[data-lecture-prev]").addEventListener("click", prev);
  notesButton.addEventListener("click", toggleNotes);
  deck.querySelector(".lecture-stage").addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, textarea, video, iframe, .cell, .lecture-notes")) return;
    next();
  });
  document.addEventListener("keydown", (event) => {
    if (!opened) return;
    if (event.target?.matches?.("input, textarea")) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); prev(); }
    else if (event.key === "Home") { event.preventDefault(); showScene(0, -1); }
    else if (event.key === "End") { event.preventDefault(); const last = scenes.length - 1; showScene(last, beatsOf(scenes[last]).length - 1); }
    else if (event.key.toLowerCase() === "n") { event.preventDefault(); toggleNotes(); }
    else if (event.key === "Escape") { event.preventDefault(); void close(); }
  });

  if (/^#lecture=s\\d+\\.\\d+$/.test(location.hash)) void open(true);
})();
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
  <div class="hd-right">${links}<span class="hd-icons">${icons}
    <button type="button" class="theme-toggle" data-theme-toggle aria-label="화면 테마 변경" title="화면 테마 변경">
      <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56"/>
      </svg>
      <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>
      </svg>
    </button>
    </span>
  </div>
</nav>`;
}

/**
 * `cells` 는 이 페이지에 실행 칸이 있는지다.
 *
 * 실행 칸이 있는 글에만 파이썬 배포판 출처를 연다. 목록 화면과 실행 칸 없는 글까지
 * 열어 둘 이유가 없다. CSP 는 좁을수록 좋다.
 */
function page(
  title: string,
  inner: string,
  extraScript = "",
  wide = false,
  cells = false,
): Response {
  const nonce = randomHex(16);
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${esc(BRAND.carbon)}">
<title>${esc(title)} | eddmpython</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="${TOKENS.fontHref}">
<script nonce="${nonce}">${THEME_INIT_SCRIPT}</script>
<style>${STYLE}</style></head>
<body><div class="wrap${wide ? " wide" : ""}">${inner}</div>
<div class="zoom" id="zoom"><img alt=""></div>
<script nonce="${nonce}">${THEME_SCRIPT}${ZOOM_SCRIPT}${extraScript}</script></body></html>`;
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
        // 실행 칸이 있는 글만 파이썬 배포판을 받아 온다. wasm 을 컴파일하므로 그 권한도 같이 연다.
        `script-src 'nonce-${nonce}'${cells ? " 'wasm-unsafe-eval' https://cdn.jsdelivr.net" : ""}`,
        `connect-src 'self'${cells ? " https://cdn.jsdelivr.net" : ""}`,
        // course-embed 는 https 문서를 sandbox iframe 으로 격리한다. 교안의 raw HTML 은 실행하지 않는다.
        "frame-src 'self' https:",
        ...(cells ? ["worker-src 'self' blob:"] : []),
      ].join("; "),
    },
  });
}

function loginPage(slug: string, title: string, message = ""): Response {
  return page(
    title,
    `${header()}<section class="gate">
       <p class="eyebrow">eddmpython course</p>
       <h1>${esc(title)}</h1>
       <p class="sub">등록된 수강생을 위한 비공개 과정입니다. 안내받은 비밀번호로 입장해 주세요</p>
       <form method="post" action="/cr/${esc(slug)}/login">
         <input type="password" name="password" placeholder="수강 비밀번호" aria-label="수강 비밀번호" autofocus autocomplete="current-password">
         <button type="submit">과정 입장</button>
       </form>${message ? `<p class="err">${esc(message)}</p>` : ""}
     </section>`,
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
const ADMIN_ACTIONS = new Set([
  "list",
  "create",
  "remove",
  "rename",
  "password",
  "open",
  "toggle",
  "unlock",
]);

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
    return page(
      "course",
      `${header()}<section class="gate"><p class="eyebrow">eddmpython course</p>
       <h1>비공개 과정</h1><p class="sub wait">안내받은 과정 주소로 들어오세요</p></section>`,
    );
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
      `${header()}<section class="gate"><p class="eyebrow">eddmpython course</p>
       <h1>${esc(room.title)}</h1><p class="sub wait">아직 열리지 않았습니다. 이 화면을 열어 두세요</p></section>`,
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
         <p class="eyebrow">eddmpython course</p>
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
    const { html, headings, hasCells } = renderPost(post.body, category.cells ?? {});
    const lecture = renderLecture(post.body, post.scenes ?? [], category.cells ?? {});

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

    const lectureUi = lecture.ok
      ? `<div class="lecture-deck" data-lecture-deck role="dialog" aria-modal="true" aria-label="${esc(
          post.title,
        )} 강의 모드" hidden>
           <header class="lecture-bar">
             <span class="lecture-brand">
               <span class="lecture-symbol-wrap"><svg class="lecture-symbol" viewBox="${esc(SYMBOL.viewBox)}" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${esc(
                 SYMBOL.shape,
               )}"/><ellipse cx="${SYMBOL.eye.cx}" cy="${SYMBOL.eye.cy}" rx="${SYMBOL.eye.rx}" ry="${
                 SYMBOL.eye.ry
               }" fill="${esc(BRAND.eye)}"/></svg></span>
               <span class="lecture-brand-copy"><b>eddmpython course</b><i>${esc(category.title)} · ${esc(post.title)}</i></span>
             </span>
             <span class="lecture-progress" data-lecture-progress role="progressbar" aria-label="강의 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">01 / ${String(post.scenes?.length ?? 0).padStart(2, "0")} · 0 / 0</span>
             <div class="lecture-actions">
               <button type="button" data-lecture-notes-toggle aria-label="발표자 노트" title="발표자 노트" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg><span>노트</span></button>
               <button type="button" data-lecture-close aria-label="강의 모드 닫기" title="강의 모드 닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg><span>닫기</span></button>
             </div>
           </header>
           <div class="lecture-stage">
             ${lecture.html}
             <aside class="lecture-notes" data-lecture-notes hidden><b>발표자 노트</b><p data-lecture-notes-text></p></aside>
           </div>
           <footer class="lecture-foot">
             <span class="lecture-help">클릭 또는 Space 다음 · ← → 이동 · N 노트 · Esc 종료</span>
             <div class="lecture-nav"><button type="button" data-lecture-prev aria-label="이전 비트"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg><span>이전</span></button><button type="button" data-lecture-next aria-label="다음 비트"><span>다음</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div>
           </footer>
         </div>`
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
           <div class="body-top"><div class="body-title">
             <p class="eyebrow">${esc(category.title)} · ${at + 1}편</p>
             <h1>${esc(post.title)}</h1>
             <p class="sub">${esc(post.summary)}</p>
           </div>${
             lecture.ok
               ? `<button type="button" class="lecture-open" data-lecture-open><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="m9 21 3-4 3 4M8 9h8M8 12h5"/></svg>강의 모드</button>`
               : ""
           }</div>
           <article>${html}</article>
           ${foot}
         </main>
         ${toc}
       </div>${lectureUi}`,
      stamp + TOC_SCRIPT + (hasCells || lecture.hasCells ? CELL_SCRIPT : "") + (lecture.ok ? LECTURE_SCRIPT : ""),
      true,
      hasCells || lecture.hasCells,
    );
  }

  return new Response("not found", { status: 404 });
}
