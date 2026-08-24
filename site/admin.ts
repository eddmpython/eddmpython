/**
 * 운영장. eddmpython.com/admin.
 *
 * 모든 강의를 여기서 배선한다. 강의방을 만들고, 이름과 주소를 옮기고, 비밀번호를 걸고,
 * 어느 카테고리를 수강생에게 열지 고르고, 다 끝난 방을 지운다.
 *
 * **운영장이 위고 강의방은 그 아래 하나다.** 한때 이 코드가 강의장 파일 안에 있었고 주소도
 * 그 아래였다. 그러면 강의방이 하나뿐인 것을 전제한 배선이 되고, 다음 고객의 강의를 앞
 * 고객의 주소 아래에 넣게 된다.
 *
 * 한때 이 화면이 운영자 노트북에서만 돌았다. 토큰을 브라우저에 안 내리려는 설계였는데,
 * 대가로 운영자가 노트북 앞에 앉아 콘솔을 띄워야 강의장을 열 수 있었다. 이제 화면은 서버에
 * 있고 비밀번호로 들어온다. 토큰은 여전히 브라우저로 내려가지 않는다. 내려가는 것은 이
 * 경로에서만 쓰이는 서명된 세션 쿠키다.
 */
import { call } from "./rooms";
import { course } from "./course";
import { checkToken, clearCookie, cookie, hmac, issueToken, readCookie, safeEqual } from "./auth";
import { header, page } from "./shell";
import { TOKENS } from "./src/brand";
import type { Env } from "./env";

/** 운영자 쿠키. 수강생 쿠키와 이름도 경로도 겹치지 않는다. */
const ADMIN_COOKIE = "eddm_admin";
const ADMIN_PATH = "/admin";
/** 세션 토큰이 자기가 어디에 쓰이는지 밝히는 값. 방 세션은 방 이름을 쓴다. */
const SUBJECT = "admin";

/**
 * 운영장이 저장소에 넘길 수 있는 동작. 여기 없는 것은 로그인해도 안 넘긴다.
 *
 * 예전에는 받은 몸통을 그대로 넘겼다. 그래서 `signKey` 도 넘어갔다. 그 열쇠가 나가면
 * **모든 방의 세션 쿠키를 조용히 위조**할 수 있고, 열쇠는 한 번 만들면 바뀌지 않으므로
 * 비밀번호를 아무리 바꿔도 소용이 없다. 방을 만들고 지우는 것은 화면에 보이지만 이것은
 * 안 보인다. 새는 날을 전제로 좁혀 둔다.
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
  "adminRotate",
]);

/**
 * 운영장 화면 CSS.
 *
 * 색을 여기서 적지 않는다. `src/brand.ts` 의 TOKENS 가 정본이고 shell.ts 가 변수를 깔아
 * 두었다. `scripts/check-brand.mjs` 가 이 파일에 hex 가 나타나면 배포를 막는다.
 */
const ADMIN_STYLE = `
.adm-top { display:flex; align-items:baseline; gap:1rem; flex-wrap:wrap; margin:0 0 2rem; }
.adm-top h1 { flex:1 1 auto; margin:0; }
.adm-top form { margin:0; }
.adm-top button { padding:.4rem .8rem; font-size:.85rem; border-color:var(--eddm-line-base);
  background:var(--eddm-raise); color:var(--eddm-text-muted); }
.adm-top button:hover { background:var(--eddm-hover); color:var(--eddm-ivory); }
.adm input, .adm select { padding:.6rem .8rem; border-radius:.55rem; border:1px solid var(--eddm-line-strong);
  background:var(--eddm-raise); color:inherit; font-size:.92rem; font-family:inherit; min-width:0; }
.adm input::placeholder { color:var(--eddm-text-faint); }
.row { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; margin-top:.85rem; }
.row button { padding:.55rem .9rem; font-size:.88rem; }
.row .go { border-color:var(--eddm-accent-line); background:var(--eddm-accent-bg); color:var(--eddm-sand); }
.row .danger { border-color:var(--eddm-danger-line); background:transparent; color:var(--eddm-danger); }
.row .danger:hover { background:var(--eddm-danger-line); }
.note { color:var(--eddm-text-dim); font-size:.85rem; margin:.4rem 0 0; }
.err { color:var(--eddm-danger); font-size:.9rem; min-height:1.4em; margin:1rem 0 0; }
.warn { display:flex; align-items:center; gap:.6rem; padding:.75rem 1rem; margin:1.25rem 0 0;
  border:1px solid var(--eddm-danger-line); border-radius:.7rem; background:var(--eddm-raise);
  font-size:.9rem; color:var(--eddm-text); }
.warn[hidden] { display:none; }
.warn svg { flex:0 0 auto; color:var(--eddm-danger); }
.warn b { color:var(--eddm-danger); font-weight:600; }
.card { border:1px solid var(--eddm-line-base); border-radius:.85rem; padding:1.3rem 1.4rem;
  margin:1.25rem 0 0; background:var(--eddm-raise); }
.card.live { border-color:var(--eddm-accent-line); }
.head { display:flex; align-items:baseline; gap:.75rem; flex-wrap:wrap; }
.head h2 { margin:0; font-size:1.08rem; font-weight:500; letter-spacing:-.01em; }
.state { flex:0 0 auto; font-size:.7rem; letter-spacing:.06em; padding:.15rem .6rem; border-radius:99px;
  border:1px solid var(--eddm-line-base); color:var(--eddm-text-dim); }
.state.on { background:var(--eddm-accent-bg); border-color:var(--eddm-accent-line); color:var(--eddm-sand); }
.state.lock { border-color:var(--eddm-danger-line); color:var(--eddm-danger); }
.addr { flex:1 1 auto; font-family:${TOKENS.font.mono}; font-size:.82rem; color:var(--eddm-text-muted);
  text-decoration:none; overflow-wrap:anywhere; }
.addr:hover { color:var(--eddm-sand); }
.made { font-size:.78rem; color:var(--eddm-text-faint); }
.cats { margin-top:1rem; border-top:1px solid var(--eddm-line); padding-top:.5rem; }
.cat { display:flex; align-items:center; gap:.75rem; padding:.55rem 0; flex-wrap:wrap;
  border-bottom:1px solid var(--eddm-line); }
.cat:last-child { border-bottom:0; }
.cat > span:first-child { flex:1 1 12rem; font-size:.92rem; }
.cat .num { color:var(--eddm-text-faint); font-size:.8rem; font-variant-numeric:tabular-nums; }
.cat .right { display:flex; align-items:center; gap:.6rem; flex:0 0 auto; }
.cat button { padding:.35rem .75rem; font-size:.82rem; }
.new { border:1px dashed var(--eddm-line-strong); border-radius:.85rem; padding:1.2rem 1.4rem; margin-top:2rem; }
.new h3 { font-size:.95rem; margin:0 0 .2rem; color:var(--eddm-text); font-weight:500; }
.new .row { margin-top:.8rem; }
.sessions { margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--eddm-line); }
`;

const ADMIN_SCRIPT = `
(() => {
  let rooms = [];
  let categories = [];
  // 서버가 교안을 못 읽어도 방 조종은 계속된다. 그 사실을 운영자에게 말해 주는 값이다.
  let courseOk = true;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = (ms) => { const d = new Date(ms); return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; };
  const origin = location.origin;

  async function send(body) {
    $("err").textContent = "";
    let res;
    try {
      res = await fetch("/admin/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      $("err").textContent = "서버에 닿지 않습니다";
      return null;
    }
    // 세션이 끝나면 조종이 아니라 로그인 화면으로 가야 한다. 조용히 실패하면 운영자는
    // 눌렀는데 아무 일도 안 일어난다고 생각하고 강의 직전에 그것을 붙들고 있게 된다.
    if (res.status === 401) { location.reload(); return null; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $("err").textContent = data.error ?? "실패했습니다"; return null; }
    rooms = data.rooms ?? [];
    categories = data.categories ?? [];
    courseOk = data.courseOk !== false;
    draw();
    return data;
  }

  function draw() {
    $("cwarn").hidden = courseOk;
    if (!rooms.length) {
      $("rooms").innerHTML = '<p class="note">아직 강의방이 없습니다. 아래에서 만드세요</p>';
      return;
    }
    $("rooms").innerHTML = rooms.map((r) => {
      const url = origin + "/room/" + r.slug;
      const cats = categories.map((c) => {
        const on = r.unlocked.includes(c.slug);
        // 단추 글자는 할 일이고 칩은 지금 상태다. 강의 중에 둘을 헷갈리면 안 열 것을 연다.
        return '<div class="cat"><span>' + esc(c.title) +
          ' <span class="num">' + c.posts + "편</span></span>" +
          '<span class="right"><span class="state ' + (on ? "on" : "") + '">' +
          (on ? "수강생에게 보임" : "잠김") + "</span>" +
          '<button data-act="toggle" data-slug="' + r.slug + '" data-cat="' + c.slug + '">' +
          (on ? "닫기" : "열기") + "</button></span></div>";
      }).join("");
      // 여덟 번 틀리면 5분 막힌다. 수강생은 "안 들어가져요" 라고만 말하고 이유를 모른다.
      // 이 칩이 없으면 운영자도 모르고, 결국 비밀번호를 바꿔서 강의실 전체를 튕기게 된다.
      const left = r.lockedUntil > Date.now() ? Math.ceil((r.lockedUntil - Date.now()) / 60000) : 0;
      return '<div class="card' + (r.open ? " live" : "") + '">' +
        '<div class="head"><h2>' + esc(r.title) + "</h2>" +
        '<span class="state ' + (r.open ? "on" : "") + '">' + (r.open ? "열림" : "닫힘") + "</span>" +
        (left ? '<span class="state lock">로그인 잠김 · ' + left + "분 남음</span>" : "") +
        '<a class="addr" href="' + url + '" target="_blank" rel="noreferrer">' + esc(url) + "</a>" +
        '<span class="made">' + day(r.created) + " 만듦</span></div>" +
        '<div class="row">' +
        '<button class="go" data-act="open" data-slug="' + r.slug + '" data-open="' + (r.open ? "0" : "1") + '">' +
        (r.open ? "강의방 닫기" : "강의방 열기") + "</button>" +
        (left ? '<button data-act="unlock" data-slug="' + r.slug + '">잠김 풀기</button>' : "") +
        '<button data-act="copy" data-url="' + url + '">주소 복사</button>' +
        '<input type="password" data-pw="' + r.slug + '" placeholder="새 비밀번호" aria-label="새 비밀번호" style="flex:0 1 9rem">' +
        '<button data-act="password" data-slug="' + r.slug + '">바꾸기</button>' +
        '<button class="danger" data-act="remove" data-slug="' + r.slug + '">삭제</button></div>' +
        '<div class="row">' +
        '<input data-next-slug="' + r.slug + '" value="' + esc(r.slug) + '" aria-label="새 주소 이름" style="flex:0 1 12rem">' +
        '<input data-next-title="' + r.slug + '" value="' + esc(r.title) + '" aria-label="새 강의방 이름" style="flex:1 1 14rem">' +
        '<button data-act="rename" data-slug="' + r.slug + '">주소와 이름 적용</button></div>' +
        (r.open ? '<div class="cats">' + (cats || '<p class="note">교안 카테고리가 없습니다</p>') + "</div>"
                : '<p class="note">닫으면 열어 둔 카테고리도 처음으로 돌아갑니다</p>') +
        "</div>";
    }).join("");

    $("rooms").querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = async () => {
        const act = b.dataset.act;
        const slug = b.dataset.slug;
        if (act === "copy") {
          try { await navigator.clipboard.writeText(b.dataset.url); b.textContent = "복사함"; }
          catch { $("err").textContent = "주소를 복사하지 못했습니다. 주소를 직접 눌러 확인하세요"; }
          return;
        }
        if (act === "open") return send({ action: "open", slug, open: b.dataset.open === "1" });
        if (act === "toggle") return send({ action: "toggle", slug, category: b.dataset.cat });
        if (act === "unlock") {
          const done = await send({ action: "unlock", slug });
          if (done) $("err").textContent = "잠김을 풀었습니다. 다시 비밀번호를 넣어 보라고 하세요";
          return;
        }
        if (act === "password") {
          const input = $("rooms").querySelector('[data-pw="' + slug + '"]');
          if (!input.value) { $("err").textContent = "새 비밀번호를 적어 주세요"; return; }
          if (!confirm(slug + " 방의 비밀번호를 바꿉니다. 이미 들어와 있는 수강생이 전부 나갑니다")) return;
          const done = await send({ action: "password", slug, password: input.value });
          if (done) $("err").textContent = "비밀번호를 바꿨습니다. 수강생에게 새 비밀번호를 알려 주세요";
          return;
        }
        if (act === "rename") {
          const nextSlug = $("rooms").querySelector('[data-next-slug="' + slug + '"]').value.trim();
          const title = $("rooms").querySelector('[data-next-title="' + slug + '"]').value.trim();
          if (!nextSlug || !title) { $("err").textContent = "새 주소와 강의방 이름을 모두 적어 주세요"; return; }
          if (nextSlug !== slug && !confirm(slug + " 주소를 " + nextSlug + " 주소로 옮깁니다. 예전 주소는 사라집니다")) return;
          const done = await send({ action: "rename", slug, nextSlug, title });
          if (done) $("err").textContent = "주소와 이름을 적용했습니다";
          return;
        }
        if (act === "remove") {
          if (!confirm(slug + " 강의방을 지웁니다. 주소가 사라지고 되돌릴 수 없습니다")) return;
          return send({ action: "remove", slug });
        }
      };
    });
  }

  $("n-go").onclick = async () => {
    const slug = $("n-slug").value.trim();
    const title = $("n-title").value.trim() || slug;
    const password = $("n-pw").value;
    if (!slug || !password) { $("err").textContent = "주소 이름과 비밀번호가 있어야 합니다"; return; }
    const done = await send({ action: "create", slug, title, password });
    if (done) { $("n-slug").value = ""; $("n-title").value = ""; $("n-pw").value = ""; }
  };

  $("rotate").onclick = async () => {
    if (!confirm("모든 운영 세션을 끊습니다. 이 창도 로그인 화면으로 돌아갑니다")) return;
    await send({ action: "adminRotate" });
    location.reload();
  };

  send({ action: "list" });
  // 다른 창이나 다른 기기에서 바꾼 것도 따라온다. 강의 중에 화면이 실물과 어긋나지 않게 한다.
  setInterval(() => { if (!document.hidden) send({ action: "list" }); }, 5000);
})();
`;

/* 세션 ------------------------------------------------------------------ */

async function session(env: Env): Promise<{ key: string; gen: string }> {
  const { data } = await call(env, { action: "adminSession" });
  return { key: String(data.key ?? ""), gen: String(data.gen ?? "") };
}

async function signedIn(env: Env, request: Request): Promise<boolean> {
  const { key, gen } = await session(env);
  if (!key || !gen) return false;
  return checkToken(key, readCookie(request, ADMIN_COOKIE), SUBJECT, gen);
}

/* 화면 ------------------------------------------------------------------ */

function loginPage(message = "", status = 200): Response {
  return page({
    title: "운영장",
    style: ADMIN_STYLE,
    status,
    inner: `${header()}<section class="gate adm">
       <p class="eyebrow">eddmpython admin</p>
       <h1>운영장</h1>
       <form method="post" action="/admin/login">
         <input type="password" name="password" placeholder="운영자 비밀번호" aria-label="운영자 비밀번호" autofocus autocomplete="current-password">
         <button type="submit">들어가기</button>
       </form>${message ? `<p class="err">${message}</p>` : ""}
     </section>`,
  });
}

function consolePage(): Response {
  return page({
    title: "운영장",
    style: ADMIN_STYLE,
    script: ADMIN_SCRIPT,
    inner: `${header()}<div class="adm">
  <div class="adm-top">
    <h1>운영장</h1>
    <form method="post" action="/admin/logout"><button type="submit">나가기</button></form>
  </div>

  <div class="warn" id="cwarn" hidden>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M2 3h20v5H2z"/><path d="M10 12h4"/></svg>
    <span><b>교안 묶음을 읽지 못했습니다.</b> 방 조종은 그대로 됩니다. eddmpython-course 에서 npm run publish:course 를 다시 해 주세요</span>
  </div>

  <p class="err" id="err"></p>
  <div id="rooms"></div>

  <div class="new">
    <h3>강의방 만들기</h3>
    <div class="row">
      <input id="n-slug" placeholder="주소 이름 (예: 0820)" aria-label="주소 이름" style="flex:0 1 12rem">
      <input id="n-title" placeholder="강의방 이름" aria-label="강의방 이름" style="flex:1 1 14rem">
      <input type="password" id="n-pw" placeholder="수강 비밀번호" aria-label="수강 비밀번호" style="flex:0 1 10rem">
      <button class="go" id="n-go">만들기</button>
    </div>
  </div>

  <div class="sessions">
    <h3>운영 세션</h3>
    <p class="note">노트북을 잃어버렸거나 비밀번호가 샜다고 생각되면 지금 열려 있는 운영 세션을 전부 끊습니다</p>
    <div class="row"><button class="danger" id="rotate">모든 운영 세션 끊기</button></div>
  </div>
</div>`,
  });
}

/* 조종 ------------------------------------------------------------------ */

async function login(request: Request, env: Env, url: URL): Promise<Response> {
  const form = await request.formData();
  const given = String(form.get("password") ?? "");

  /**
   * 비밀번호 비교는 여기서 하고 잠금은 저장소가 맨다.
   *
   * 배포 비밀값이 없으면 아무도 못 들어온다. 빈 문자열끼리 맞아떨어져 누구나 들어오는
   * 상태가 되는 것이 최악이라 먼저 막는다.
   */
  const expected = env.ADMIN_PASSWORD ?? "";
  const ok = expected.length > 0 && safeEqual(given, expected);

  const { key } = await session(env);
  // 통하는 비밀번호의 지문. 배포 비밀값이 바뀌면 저장소가 이것으로 알아채고 세대를 돌린다.
  const fingerprint = ok ? (await hmac(key, `admin:${given}`)).slice(0, 32) : "";
  const { data } = await call(env, { action: "adminLogin", ok, fingerprint });

  if (!data.ok) {
    return loginPage(
      data.retryAfter
        ? `너무 여러 번 틀렸습니다. ${Math.ceil(Number(data.retryAfter) / 60)}분 뒤에 다시 해 주세요.`
        : "비밀번호가 맞지 않습니다.",
      401,
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      location: ADMIN_PATH,
      "set-cookie": cookie(
        ADMIN_COOKIE,
        await issueToken(key, SUBJECT, String(data.gen)),
        ADMIN_PATH,
        url,
      ),
    },
  });
}

async function api(request: Request, env: Env): Promise<Response> {
  if (!(await signedIn(env, request))) {
    return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !ADMIN_ACTIONS.has(String(body.action ?? ""))) {
    return Response.json({ error: "운영장이 부르지 않는 동작입니다" }, { status: 400 });
  }

  const { status, data } = await call(env, body);
  if (status >= 400) return Response.json(data, { status });

  // 무엇을 했든 전체 상태를 돌려준다. 운영장이 늘 실물을 그린다.
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

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || ADMIN_PATH;

  if (path === "/admin/login") {
    if (request.method !== "POST") return new Response(null, { status: 303, headers: { location: ADMIN_PATH } });
    return login(request, env, url);
  }

  if (path === "/admin/logout") {
    if (request.method !== "POST") return new Response("not found", { status: 404 });
    return new Response(null, {
      status: 303,
      headers: { location: ADMIN_PATH, "set-cookie": clearCookie(ADMIN_COOKIE, ADMIN_PATH, url) },
    });
  }

  if (path === "/admin/api") {
    if (request.method !== "POST") return new Response("not found", { status: 404 });
    return api(request, env);
  }

  if (path !== ADMIN_PATH) return new Response("not found", { status: 404 });

  return (await signedIn(env, request)) ? consolePage() : loginPage();
}
