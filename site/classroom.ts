/**
 * 강의장. 운영자가 실시간으로 열고 카테고리를 하나씩 푼다.
 *
 * 설계 근거는 memory/courseRoom.md 다. 핵심은 셋이다.
 *
 * 1. 열림 상태를 서버가 든다. Durable Object 하나가 방과 카테고리 잠금을 들고 있다
 * 2. 수강생 화면이 그 상태를 따라온다. 3초 폴링이다
 * 3. 닫힌 카테고리의 본문은 아예 안 내려간다. 가리는 것이 아니라 안 주는 것이다
 *
 * 3번이 이 파일이 존재하는 이유다. 클라이언트에서 거르면 개발자 도구로 앞 내용을 먼저 본다.
 */
import { COURSE, type CourseCategory } from "./course-content.generated";

export type Env = {
  CLASSROOM: DurableObjectNamespace;
  CR_PASSWORD?: string;
  CR_ADMIN_KEY?: string;
  CR_SECRET?: string;
};

export type RoomState = { open: boolean; unlocked: string[] };

const SESSION_COOKIE = "cr_session";
const SESSION_TTL_SEC = 60 * 60 * 12;

/* ── 세션 서명 ────────────────────────────────────────────────────────────── */

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 길이와 무관하게 상수 시간에 가깝게 비교한다. 타이밍으로 비밀번호를 재는 것을 막는다. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function issueSession(env: Env, role: "student" | "admin"): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${role}.${expires}`;
  return `${payload}.${await hmac(env.CR_SECRET ?? "", payload)}`;
}

async function readSession(env: Env, token: string | null): Promise<"student" | "admin" | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expiresRaw, sig] = parts;
  if (role !== "student" && role !== "admin") return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return null;
  const expected = await hmac(env.CR_SECRET ?? "", `${role}.${expiresRaw}`);
  return safeEqual(sig, expected) ? role : null;
}

function cookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function sessionCookie(token: string, url: URL): string {
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${SESSION_COOKIE}=${token}; Path=/cr; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
}

/* ── 상태 보관 ────────────────────────────────────────────────────────────── */

/** 방 하나의 열림 상태를 든다. 수강생이 여럿이어도 같은 인스턴스를 본다. */
export class Classroom {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const stored = (await this.state.storage.get<RoomState>("room")) ?? {
      open: false,
      unlocked: [],
    };

    if (url.pathname === "/read") {
      return Response.json(stored);
    }

    if (url.pathname === "/write") {
      const body = (await request.json()) as { open?: boolean; toggle?: string };
      const next: RoomState = { open: stored.open, unlocked: [...stored.unlocked] };
      if (typeof body.open === "boolean") {
        next.open = body.open;
        // 방을 닫으면 잠금도 처음으로 되돌린다. 다음 강의가 앞 강의 상태를 물려받지 않는다.
        if (!body.open) next.unlocked = [];
      }
      if (body.toggle) {
        const at = next.unlocked.indexOf(body.toggle);
        if (at >= 0) next.unlocked.splice(at, 1);
        else next.unlocked.push(body.toggle);
      }
      await this.state.storage.put("room", next);
      return Response.json(next);
    }

    return new Response("not found", { status: 404 });
  }
}

async function roomStub(env: Env) {
  return env.CLASSROOM.get(env.CLASSROOM.idFromName("main"));
}

async function readRoom(env: Env): Promise<RoomState> {
  const res = await (await roomStub(env)).fetch("https://cr/read");
  return (await res.json()) as RoomState;
}

async function writeRoom(env: Env, patch: { open?: boolean; toggle?: string }): Promise<RoomState> {
  const res = await (await roomStub(env)).fetch("https://cr/write", {
    method: "POST",
    body: JSON.stringify(patch),
  });
  return (await res.json()) as RoomState;
}

/* ── 화면 ────────────────────────────────────────────────────────────────── */

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

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
.cat p { margin:0; color:#f5f3ee99; font-size:.9rem; }
.cat.locked { opacity:.45; }
.tag { font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:#d8be91; }
a.post { display:block; padding:.55rem 0; border-bottom:1px solid #ffffff14; color:inherit; text-decoration:none; }
a.post:last-child { border-bottom:0; }
a.post:hover { color:#d8be91; }
.wait { color:#f5f3ee77; }
article img { max-width:100%; height:auto; border-radius:.6rem; display:block; margin:1.2rem 0; cursor:zoom-in; }
article h2 { margin-top:2.4rem; font-size:1.25rem; }
article pre { overflow-x:auto; background:#00000055; padding:1rem; border-radius:.6rem; }
article table { display:block; overflow-x:auto; border-collapse:collapse; }
.slider { display:flex; gap:.75rem; overflow-x:auto; scroll-snap-type:x mandatory; margin:1.2rem 0; }
.slider img { scroll-snap-align:center; flex:0 0 88%; margin:0; }
.zoom { position:fixed; inset:0; background:#000000e8; display:none; align-items:center;
  justify-content:center; z-index:50; padding:1rem; cursor:zoom-out; }
.zoom.on { display:flex; }
.zoom img { max-width:100%; max-height:100%; border-radius:.4rem; }
.row { display:flex; gap:.6rem; align-items:center; flex-wrap:wrap; margin-top:.8rem; }
.back { color:#f5f3ee88; text-decoration:none; font-size:.9rem; }
`;

function page(title: string, inner: string, extraScript = ""): Response {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><div class="wrap">${inner}</div>
<div class="zoom" id="zoom"><img alt=""></div>
<script>
const z = document.getElementById('zoom');
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.tagName === 'IMG' && t.closest('article')) {
    z.querySelector('img').src = t.src; z.querySelector('img').alt = t.alt; z.classList.add('on');
  } else if (z.classList.contains('on')) { z.classList.remove('on'); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') z.classList.remove('on'); });
${extraScript}
</script></body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function loginPage(message = ""): Response {
  return page(
    "강의장",
    `<h1>강의장</h1><p class="sub">비밀번호를 받으신 분만 들어옵니다.</p>
     <form method="post" action="/cr/login">
       <input type="password" name="password" placeholder="비밀번호" autofocus autocomplete="current-password">
       <button type="submit">들어가기</button>
     </form>${message ? `<p class="err">${esc(message)}</p>` : ""}`,
  );
}

/** 아주 작은 마크다운 렌더. 교안이 쓰는 것만 다룬다. 연속 이미지는 슬라이더가 된다. */
function renderMarkdown(body: string): string {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: string[] = [];
  let images: string[] = [];
  const flush = () => {
    if (!images.length) return;
    out.push(images.length > 1 ? `<div class="slider">${images.join("")}</div>` : images[0]);
    images = [];
  };
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    const img = b.match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/);
    if (img) {
      images.push(`<img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy">`);
      continue;
    }
    flush();
    if (b.startsWith("## ")) out.push(`<h2>${esc(b.slice(3))}</h2>`);
    else if (b.startsWith("#### ")) out.push(`<h4>${esc(b.slice(5))}</h4>`);
    else if (b.startsWith("```")) out.push(`<pre>${esc(b.replace(/^```\w*\n?|\n?```$/g, ""))}</pre>`);
    else if (/^[-*]\s/m.test(b)) {
      const items = b.split("\n").filter((l) => /^[-*]\s/.test(l.trim()));
      out.push(`<ul>${items.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join("")}</ul>`);
    } else if (/^https?:\/\/\S+$/.test(b)) out.push(`<p><a href="${esc(b)}">${esc(b)}</a></p>`);
    else out.push(`<p>${inline(b)}</p>`);
  }
  flush();
  return out.join("\n");
}

function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/* ── 라우팅 ──────────────────────────────────────────────────────────────── */

function visible(room: RoomState): CourseCategory[] {
  return COURSE.filter((c) => room.unlocked.includes(c.slug)).sort((a, b) => a.order - b.order);
}

const POLL = `
setInterval(async () => {
  const r = await fetch('/cr/api/state', { cache: 'no-store' });
  if (!r.ok) return;
  const s = await r.json();
  if (s.stamp !== window.__stamp) location.reload();
}, 3000);`;

export async function handleClassroom(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/cr";
  const role = await readSession(env, cookie(request, SESSION_COOKIE));

  if (path === "/cr/login" && request.method === "POST") {
    const form = await request.formData();
    const given = String(form.get("password") ?? "");
    if (!env.CR_PASSWORD) return loginPage("강의장 비밀번호가 설정되지 않았습니다.");
    if (!safeEqual(given, env.CR_PASSWORD)) return loginPage("비밀번호가 맞지 않습니다.");
    const token = await issueSession(env, "student");
    return new Response(null, {
      status: 303,
      headers: { location: "/cr", "set-cookie": sessionCookie(token, url) },
    });
  }

  if (path === "/cr/admin/login" && request.method === "POST") {
    const form = await request.formData();
    const given = String(form.get("password") ?? "");
    if (!env.CR_ADMIN_KEY) return loginPage("운영자 키가 설정되지 않았습니다.");
    if (!safeEqual(given, env.CR_ADMIN_KEY)) return loginPage("운영자 키가 맞지 않습니다.");
    const token = await issueSession(env, "admin");
    return new Response(null, {
      status: 303,
      headers: { location: "/cr/admin", "set-cookie": sessionCookie(token, url) },
    });
  }

  if (path === "/cr/admin") {
    if (role !== "admin") {
      return page(
        "강의장 운영",
        `<h1>강의장 운영</h1><p class="sub">운영자 키가 필요합니다.</p>
         <form method="post" action="/cr/admin/login">
           <input type="password" name="password" placeholder="운영자 키" autofocus>
           <button type="submit">들어가기</button>
         </form>`,
      );
    }
    const room = await readRoom(env);
    const rows = COURSE.sort((a, b) => a.order - b.order)
      .map((c) => {
        const on = room.unlocked.includes(c.slug);
        return `<div class="cat"><span class="tag">${esc(c.slug)}</span>
          <h2>${esc(c.title)}</h2><p>글 ${c.posts.length}편</p>
          <div class="row"><form method="post" action="/cr/admin/toggle">
            <input type="hidden" name="toggle" value="${esc(c.slug)}">
            <button type="submit">${on ? "닫기" : "열기"}</button>
          </form><span class="${on ? "tag" : "wait"}">${on ? "열림" : "잠김"}</span></div></div>`;
      })
      .join("");
    return page(
      "강의장 운영",
      `<h1>강의장 운영</h1>
       <p class="sub">방이 ${room.open ? "열려" : "닫혀"} 있습니다. 수강생 주소는 <code>/cr</code> 입니다.</p>
       <form method="post" action="/cr/admin/toggle">
         <input type="hidden" name="open" value="${room.open ? "0" : "1"}">
         <button type="submit">${room.open ? "방 닫기" : "방 열기"}</button>
       </form>
       <div style="margin-top:2rem">${rows || '<p class="wait">교안 카테고리가 없습니다.</p>'}</div>`,
    );
  }

  if (path === "/cr/admin/toggle" && request.method === "POST") {
    if (role !== "admin") return new Response("forbidden", { status: 403 });
    const form = await request.formData();
    const patch: { open?: boolean; toggle?: string } = {};
    if (form.has("open")) patch.open = String(form.get("open")) === "1";
    if (form.has("toggle")) patch.toggle = String(form.get("toggle"));
    await writeRoom(env, patch);
    return new Response(null, { status: 303, headers: { location: "/cr/admin" } });
  }

  if (path === "/cr/api/state") {
    const room = await readRoom(env);
    // 상태 지문만 준다. 본문도 카테고리 목록도 여기서 안 내려간다.
    return Response.json(
      { stamp: `${room.open ? 1 : 0}:${[...room.unlocked].sort().join(",")}` },
      { headers: { "cache-control": "no-store" } },
    );
  }

  if (role !== "student" && role !== "admin") return loginPage();

  const room = await readRoom(env);
  if (!room.open && role !== "admin") {
    return page("강의장", `<h1>강의장</h1><p class="sub wait">아직 열리지 않았습니다.</p>`, POLL);
  }

  const open = visible(room);
  const stamp = `${room.open ? 1 : 0}:${[...room.unlocked].sort().join(",")}`;

  if (path === "/cr") {
    const cards = open.length
      ? open
          .map(
            (c) => `<div class="cat"><span class="tag">${esc(c.slug)}</span>
              <h2>${esc(c.title)}</h2>
              ${c.posts.map((p) => `<a class="post" href="/cr/${esc(c.slug)}/${esc(p.id)}">${esc(p.title)}</a>`).join("")}
            </div>`,
          )
          .join("")
      : '<p class="wait">강사가 카테고리를 열면 여기에 나타납니다.</p>';
    return page(
      "강의장",
      `<h1>강의장</h1><p class="sub">강사가 연 것만 보입니다.</p>${cards}`,
      `window.__stamp=${JSON.stringify(stamp)};${POLL}`,
    );
  }

  const m = path.match(/^\/cr\/([^/]+)\/([^/]+)$/);
  if (m) {
    const category = open.find((c) => c.slug === m[1]);
    // 잠긴 카테고리는 본문을 만들지도 않는다. 여기서 막는 것이 이 설계의 요점이다.
    if (!category) return new Response("아직 열리지 않았습니다.", { status: 404 });
    const post = category.posts.find((p) => p.id === m[2]);
    if (!post) return new Response("없는 글입니다.", { status: 404 });
    return page(
      post.title,
      `<a class="back" href="/cr">← ${esc(category.title)}</a>
       <h1 style="margin-top:1rem">${esc(post.title)}</h1>
       <p class="sub">${esc(post.summary)}</p>
       <article>${renderMarkdown(post.body)}</article>`,
      `window.__stamp=${JSON.stringify(stamp)};${POLL}`,
    );
  }

  return new Response("not found", { status: 404 });
}
