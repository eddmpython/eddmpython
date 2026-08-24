/**
 * 강의장 운영 화면. 운영자 노트북에서만 돈다.
 *
 * 공개 서버에는 운영자 페이지가 없다. 이 서버가 로컬호스트에서 화면을 그리고, 토큰을 얹어
 * 대상 Worker 의 /cr/api/admin 하나만 두드린다. 토큰은 브라우저로 내려가지 않는다.
 *
 * 방을 만들면 그 자리에서 /cr/<이름> 주소가 살아난다. 배포도 secret 설정도 필요 없다.
 * 비밀번호도 여기서 건다.
 *
 * 사용: node scripts/classroom-admin.mjs [--port 8799] [--open]
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
// 브랜드 값은 랜딩과 같은 정본을 읽는다. 여기서 색을 다시 적지 않는다.
import { TOKENS, cssVars } from "../src/brand.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, "..");
const CONFIG = join(SITE, ".classroom-admin.json");
const DEV_VARS = join(SITE, ".dev.vars");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const PORT = Number(flag("--port", "8799"));
const OPEN = argv.includes("--open");

// 글꼴 출처는 브랜드 정본에서 뽑는다. 정본이 CDN 을 옮기면 아래 CSP 도 같이 따라간다.
// 손으로 적어 두면 글꼴 주소만 바뀌고 정책이 남아 링크가 조용히 죽는다. 실제로 그랬다.
const FONT_ORIGIN = new URL(TOKENS.fontHref).origin;

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 설정이 없으면 만든다. 로컬 토큰은 여기서 뽑아 .dev.vars 와 맞춰 둔다.
 * 운영 토큰은 비워 둔다. --link-production 이 Worker secret 과 이 설정을 한 번에 맞춘다.
 */
async function loadConfig() {
  if (!(await exists(CONFIG))) {
    const localToken = randomBytes(24).toString("hex");
    const made = {
      targets: [
        { id: "local", label: "로컬", base: "http://localhost:8787", token: localToken },
        { id: "production", label: "운영", base: "https://eddmpython.com", token: "" },
      ],
    };
    await writeFile(CONFIG, `${JSON.stringify(made, null, 2)}\n`, "utf8");
    console.log(`  설정을 만들었습니다: ${CONFIG}`);
  }
  const config = JSON.parse(await readFile(CONFIG, "utf8"));

  // 로컬 wrangler dev 가 같은 토큰을 보게 맞춘다. 안 맞으면 로컬 조종이 401 로 막힌다.
  const local = config.targets.find((t) => t.id === "local");
  if (local?.token) {
    const current = (await exists(DEV_VARS)) ? await readFile(DEV_VARS, "utf8") : "";
    if (!current.includes(`CR_ADMIN_TOKEN=${local.token}`)) {
      const kept = current
        .split(/\r?\n/)
        .filter((l) => l.trim() && !/^CR_ADMIN_TOKEN=/.test(l))
        .join("\n");
      await writeFile(DEV_VARS, `${kept ? `${kept}\n` : ""}CR_ADMIN_TOKEN=${local.token}\n`, "utf8");
      console.log("  .dev.vars 의 CR_ADMIN_TOKEN 을 설정과 맞췄습니다");
    }
  }
  return config;
}

const config = await loadConfig();

// 설정과 .dev.vars 만 맞추고 끝낸다. wrangler dev 를 띄우기 전에 부른다.
if (argv.includes("--sync-only")) {
  console.log("  강의장 설정 준비 완료");
  process.exit(0);
}

/**
 * 운영 토큰을 새로 뽑아 Worker secret 과 이 설정에 같이 넣는다.
 *
 * 손으로 옮겨 적게 두면 언젠가 한 글자가 어긋나고, 그것을 강의장에 가서 401 로 만난다.
 * 두 곳을 한 번에 바꾸는 것이 이 명령이 있는 이유다.
 */
if (argv.includes("--link-production")) {
  const target = config.targets.find((t) => t.id === "production");
  if (!target) throw new Error("설정에 production 대상이 없다");
  const token = randomBytes(32).toString("hex");
  console.log(`  ${target.base} 에 새 운영 토큰을 넣습니다`);
  const put = spawn("npx", ["wrangler", "secret", "put", "CR_ADMIN_TOKEN"], {
    cwd: SITE,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  });
  put.stdin.end(`${token}\n`);
  const code = await new Promise((resolve) => put.on("close", resolve));
  if (code !== 0) {
    console.error("  wrangler 가 실패했습니다. 설정은 건드리지 않았습니다");
    process.exit(1);
  }
  target.token = token;
  await writeFile(CONFIG, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log("  Worker secret 과 설정을 같은 값으로 맞췄습니다");
  process.exit(0);
}

/** 대상 Worker 를 두드린다. 토큰은 이 프로세스 밖으로 나가지 않는다. */
async function drive(targetId, body) {
  const target = config.targets.find((t) => t.id === targetId);
  if (!target) return { status: 400, data: { error: "모르는 대상입니다" } };
  if (!target.token) {
    return {
      status: 400,
      data: {
        error: `${target.label} 토큰이 비어 있습니다. node scripts/classroom-admin.mjs --link-production 을 실행해 주세요`,
      },
    };
  }
  try {
    const res = await fetch(`${target.base.replace(/\/$/, "")}/cr/api/admin`, {
      method: "POST",
      headers: { authorization: `Bearer ${target.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: `응답을 못 읽었습니다 (${res.status})` };
    }
    return { status: res.status, data };
  } catch (err) {
    return { status: 502, data: { error: `${target.label} 에 닿지 않습니다: ${err.message}` } };
  }
}

const TARGETS = config.targets.map((t) => ({
  id: t.id,
  label: t.label,
  base: t.base.replace(/\/$/, ""),
  ready: Boolean(t.token),
}));

const PAGE = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>강의장 운영</title>
<link rel="stylesheet" href="${TOKENS.fontHref}">
<style>
${cssVars()}
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:var(--eddm-carbon); color:var(--eddm-ivory); line-height:1.6;
  word-break:keep-all; font-family:${TOKENS.font.sans}; }
.wrap { max-width:64rem; margin:0 auto; padding:1.75rem 1.25rem 6rem; }
h1 { font-size:1.35rem; margin:0 0 1.25rem; }
.targets { display:flex; gap:.5rem; margin-bottom:1.75rem; flex-wrap:wrap; }
.targets button { flex:0 0 auto; }
.warn { display:flex; align-items:center; gap:.6rem; padding:.75rem 1rem; margin:0 0 1.5rem;
  border-radius:.7rem; background:rgba(224,85,45,.1); border:1px solid rgba(224,85,45,.3);
  font-size:.88rem; color:var(--eddm-text); }
/* display 를 주는 규칙이 [hidden] 을 이긴다. 이 한 줄이 없으면 경고가 늘 떠 있고,
   늘 떠 있는 경고는 아무도 안 읽는다. 로컬인데 운영이라고 말하는 화면이 그 꼴이었다. */
.warn[hidden] { display:none; }
.warn svg { flex:0 0 auto; color:var(--eddm-alert); }
.warn b { color:var(--eddm-alert); font-weight:600; }
.t-on[data-id="production"] { background:var(--eddm-alert); border-color:var(--eddm-alert); color:#fff; }
.t-on[data-id="local"] { background:var(--eddm-sand); border-color:var(--eddm-sand); color:#161a19; }
button { padding:.55rem .95rem; border-radius:.55rem; border:1px solid var(--eddm-line-strong);
  background:var(--eddm-hover); color:var(--eddm-ivory); font-size:.92rem; cursor:pointer; font-family:inherit; }
button:hover { background:var(--eddm-line-base); }
button.go { border-color:var(--eddm-accent-line); color:var(--eddm-sand); }
button.danger { border-color:rgba(224,85,45,.45); color:#f0a58c; }
input { padding:.55rem .7rem; border-radius:.55rem; border:1px solid var(--eddm-line-strong);
  background:var(--eddm-raise); color:inherit; font-size:.92rem; font-family:inherit; min-width:0; }
.card { border:1px solid var(--eddm-line-base); border-radius:.85rem; padding:1.1rem 1.25rem; margin:0 0 1rem; }
.card.live { border-color:var(--eddm-accent-line); }
.head { display:flex; align-items:baseline; gap:.6rem; flex-wrap:wrap; }
.head h2 { margin:0; font-size:1.05rem; }
.addr { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.85rem; color:var(--eddm-sand);
  text-decoration:none; }
.addr:hover { text-decoration:underline; }
.state { font-size:.75rem; letter-spacing:.06em; padding:.1rem .5rem; border-radius:99px; }
.state.on { background:var(--eddm-accent-bg); color:var(--eddm-sand); }
.state.off { background:var(--eddm-line); color:var(--eddm-text-dim); }
.state.lock { background:rgba(224,85,45,.14); color:var(--eddm-alert); }
.made { font-size:.78rem; color:var(--eddm-text-faint); }
.row { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; margin-top:.9rem; }
.cats { display:flex; flex-direction:column; gap:.4rem; margin-top:1rem;
  border-top:1px solid var(--eddm-line); padding-top:.9rem; }
.cat { display:flex; gap:.7rem; align-items:center; justify-content:space-between; }
.cat span { font-size:.92rem; }
.cat .right { display:flex; gap:.6rem; align-items:center; flex:0 0 auto; }
.cat .num { color:var(--eddm-text-muted); font-size:.8rem; }
.note { color:var(--eddm-text-dim); font-size:.86rem; margin:.35rem 0 0; }
.err { color:#f0a58c; font-size:.9rem; min-height:1.4em; margin:0 0 1rem; }
.new { border:1px dashed var(--eddm-line-strong); border-radius:.85rem; padding:1.1rem 1.25rem; margin-top:2rem; }
.new .row { margin-top:0; }
h3 { font-size:.95rem; margin:0 0 .8rem; color:var(--eddm-text); }
</style></head><body><div class="wrap">
<h1>강의장 운영</h1>
<div class="targets" id="targets"></div>
<div class="warn" id="warn" hidden>
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
  <span>지금 조종하는 곳은 <b>운영</b>입니다. 여기서 만든 방은 수강생에게 바로 열립니다</span>
</div>
<div class="warn" id="cwarn" hidden>
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M2 3h20v5H2z"/><path d="M10 12h4"/></svg>
  <span><b>교안 묶음을 읽지 못했습니다.</b> 방 조종은 그대로 됩니다. eddmpython-course 에서 npm run publish:course 를 다시 해 주세요</span>
</div>
<p class="err" id="err"></p>
<div id="rooms"></div>
<div class="new">
  <h3>강의장 만들기</h3>
  <div class="row">
    <input id="n-slug" placeholder="주소 이름 (예: 0820)" style="flex:0 1 12rem">
    <input id="n-title" placeholder="강의장 이름" style="flex:1 1 14rem">
    <input id="n-pw" placeholder="비밀번호" style="flex:0 1 10rem">
    <button class="go" id="n-go">만들기</button>
  </div>
  <p class="note">만드는 즉시 주소가 살아납니다. 배포하지 않습니다</p>
</div>
</div><script>
const TARGETS = TARGETS_JSON;
const KEY = CR_KEY;
// 강의장은 배포된 Worker 에서 돈다. 로컬 wrangler dev 는 개발할 때만 쓴다.
// 먼저 준비된 것을 고르면 목록 순서 때문에 늘 로컬이 잡혔고, 강의 직전에 이 화면을 연
// 운영자가 실제 강의장이 아니라 자기 노트북을 조종하고 있게 된다.
let target = TARGETS.find((t) => t.id === "production" && t.ready)?.id
  ?? TARGETS.find((t) => t.ready)?.id
  ?? TARGETS[0].id;
let rooms = [];
let categories = [];
// 서버가 교안을 못 읽어도 방 조종은 계속된다. 그 사실을 운영자에게 말해 주는 값이다.
let courseOk = true;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const day = (ms) => { const d = new Date(ms); return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; };

async function send(body) {
  $("err").textContent = "";
  const res = await fetch("/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-cr-key": KEY },
    body: JSON.stringify({ target, ...body }),
  });
  const data = await res.json();
  if (!res.ok) { $("err").textContent = data.error ?? "실패했습니다"; return null; }
  rooms = data.rooms ?? [];
  categories = data.categories ?? [];
  courseOk = data.courseOk !== false;
  draw();
  return data;
}

function drawTargets() {
  $("targets").innerHTML = TARGETS.map((t) =>
    '<button data-id="' + t.id + '" class="' + (t.id === target ? "t-on" : "") + '">' +
    esc(t.label) + (t.ready ? "" : " (토큰 없음)") + "</button>").join("");
  [...$("targets").children].forEach((b) => {
    b.onclick = () => { target = b.dataset.id; send({ action: "list" }); };
  });
  // 운영과 로컬을 헷갈리면 수강생 화면이 강의 중에 바뀐다. 버튼 색만으로는 놓친다.
  $("warn").hidden = target !== "production";
  // 교안을 못 읽으면 카테고리가 빈 목록으로 온다. 아무 말이 없으면 아직 안 만든 것처럼 보인다.
  $("cwarn").hidden = courseOk;
}

function drawRooms() {
  if (!rooms.length) {
    $("rooms").innerHTML = '<p class="note">아직 강의장이 없습니다. 아래에서 만드세요</p>';
    return;
  }
  const base = TARGETS.find((t) => t.id === target).base;
  $("rooms").innerHTML = rooms.map((r) => {
    const url = base + "/cr/" + r.slug;
    const cats = categories.map((c) => {
      const on = r.unlocked.includes(c.slug);
      // 단추 글자는 할 일이고 칩은 지금 상태다. 강의 중에 둘을 헷갈리면 안 열 것을 연다.
      return '<div class="cat"><span>' + esc(c.title) +
        ' <span class="num">' + c.posts + "편</span></span>" +
        '<span class="right"><span class="state ' + (on ? "on" : "off") + '">' +
        (on ? "수강생에게 보임" : "잠김") + "</span>" +
        '<button data-act="toggle" data-slug="' + r.slug + '" data-cat="' + c.slug + '">' +
        (on ? "닫기" : "열기") + "</button></span></div>";
    }).join("");
    // 여덟 번 틀리면 5분 막힌다. 수강생은 "안 들어가져요" 라고만 말하고 이유를 모른다.
    // 이 칩이 없으면 운영자도 모르고, 결국 비밀번호를 바꿔서 강의실 전체를 튕기게 된다.
    const left = r.lockedUntil > Date.now() ? Math.ceil((r.lockedUntil - Date.now()) / 60000) : 0;
    return '<div class="card' + (r.open ? " live" : "") + '">' +
      '<div class="head"><h2>' + esc(r.title) + "</h2>" +
      '<span class="state ' + (r.open ? "on" : "off") + '">' + (r.open ? "열림" : "닫힘") + "</span>" +
      (left ? '<span class="state lock">로그인 잠김 · ' + left + "분 남음</span>" : "") +
      '<a class="addr" href="' + url + '" target="_blank" rel="noreferrer">' + esc(url) + "</a>" +
      '<span class="made">' + day(r.created) + " 만듦</span></div>" +
      '<div class="row">' +
      '<button class="go" data-act="open" data-slug="' + r.slug + '" data-open="' + (r.open ? "0" : "1") + '">' +
      (r.open ? "강의장 닫기" : "강의장 열기") + "</button>" +
      (left ? '<button data-act="unlock" data-slug="' + r.slug + '">잠김 풀기</button>' : "") +
      '<button data-act="copy" data-url="' + url + '">주소 복사</button>' +
      '<input data-pw="' + r.slug + '" placeholder="새 비밀번호" style="flex:0 1 9rem">' +
      '<button data-act="password" data-slug="' + r.slug + '">바꾸기</button>' +
      '<button class="danger" data-act="remove" data-slug="' + r.slug + '">삭제</button></div>' +
      '<div class="row">' +
      '<input data-next-slug="' + r.slug + '" value="' + esc(r.slug) + '" aria-label="새 주소 이름" style="flex:0 1 12rem">' +
      '<input data-next-title="' + r.slug + '" value="' + esc(r.title) + '" aria-label="새 강의장 이름" style="flex:1 1 14rem">' +
      '<button data-act="rename" data-slug="' + r.slug + '">주소와 이름 적용</button></div>' +
      (r.open ? '<div class="cats">' + (cats || '<p class="note">교안 카테고리가 없습니다</p>') + "</div>"
              : '<p class="note">닫으면 열어 둔 카테고리도 처음으로 돌아갑니다</p>') +
      "</div>";
  }).join("");

  $("rooms").querySelectorAll("[data-act]").forEach((b) => {
    b.onclick = async () => {
      const { act, slug } = b.dataset;
      if (act === "copy") { await navigator.clipboard.writeText(b.dataset.url); b.textContent = "복사함"; return; }
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
        const done = await send({ action: "password", slug, password: input.value });
        if (done) $("err").textContent = "비밀번호를 바꿨습니다";
        return;
      }
      if (act === "rename") {
        const nextSlug = $("rooms").querySelector('[data-next-slug="' + slug + '"]').value.trim();
        const title = $("rooms").querySelector('[data-next-title="' + slug + '"]').value.trim();
        if (!nextSlug || !title) { $("err").textContent = "새 주소와 강의장 이름을 모두 적어 주세요"; return; }
        if (nextSlug !== slug && !confirm(slug + " 주소를 " + nextSlug + " 주소로 옮깁니다. 예전 주소는 사라집니다")) return;
        const done = await send({ action: "rename", slug, nextSlug, title });
        if (done) $("err").textContent = "주소와 이름을 적용했습니다";
        return;
      }
      if (act === "remove") {
        if (!confirm(slug + " 강의장을 지웁니다. 주소가 사라집니다")) return;
        return send({ action: "remove", slug });
      }
    };
  });
}

function draw() { drawTargets(); drawRooms(); }

$("n-go").onclick = async () => {
  const slug = $("n-slug").value.trim();
  const title = $("n-title").value.trim() || slug;
  const password = $("n-pw").value;
  if (!slug || !password) { $("err").textContent = "주소 이름과 비밀번호가 있어야 합니다"; return; }
  const done = await send({ action: "create", slug, title, password });
  if (done) { $("n-slug").value = ""; $("n-title").value = ""; $("n-pw").value = ""; }
};

draw();
send({ action: "list" });
// 다른 창에서 바꾼 것도 따라온다. 강의 중에 화면이 실물과 어긋나지 않게 한다.
setInterval(() => { if (!document.hidden) send({ action: "list" }); }, 5000);
</script></body></html>`;

/**
 * 이 프로세스가 운영 토큰을 들고 있다. 루프백에 묶는 것만으로는 부족하다.
 *
 * 운영자가 이 화면을 띄워 둔 채 아무 웹페이지나 열면, 그 페이지가 폼 하나로
 * `127.0.0.1` 에 POST 를 보낼 수 있다. 브라우저는 그것을 막지 않는다. 토큰은 우리가
 * 알아서 얹어 주므로 남의 페이지가 강의장을 만들고 지우고 비밀번호를 바꾼다.
 *
 * 그래서 네 겹으로 막는다. 하나만으로는 안 된다.
 *   1. 이 프로세스가 뽑은 한 회용 열쇠를 헤더로 요구한다. 폼은 헤더를 못 붙이고
 *      fetch 로 붙이려면 preflight 가 뜨는데 우리는 그것을 허락하지 않는다
 *   2. content-type 이 JSON 이어야 한다. 폼이 낼 수 있는 세 가지에 JSON 은 없다
 *   3. Origin 이 있으면 우리 것이어야 한다
 *   4. Host 가 루프백이어야 한다. 남의 도메인을 127.0.0.1 로 돌려놓는 수법을 막는다
 */
const KEY = randomBytes(24).toString("hex");
const SELF = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

function refuse(req) {
  if (!HOSTS.has(req.headers.host ?? "")) return "이 주소로는 받지 않습니다";
  const origin = req.headers.origin;
  if (origin && !SELF.has(origin)) return "다른 곳에서 온 요청입니다";
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
    return "JSON 요청만 받습니다";
  }
  if (req.headers["x-cr-key"] !== KEY) return "운영 화면에서 온 요청이 아닙니다";
  return null;
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api") {
    const bad = refuse(req);
    if (bad) {
      res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: bad }));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "요청을 못 읽었습니다" }));
      return;
    }
    const { target, ...rest } = body;
    const { status, data } = await drive(target, rest);
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
    return;
  }
  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
    if (!HOSTS.has(req.headers.host ?? "")) {
      res.writeHead(403).end("이 주소로는 받지 않습니다");
      return;
    }
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // 이 화면이 바깥으로 부르는 것은 브랜드 글꼴 하나뿐이다. 랜딩이 이미 같은 출처를
      // style-src 와 font-src 에 두고 있으므로 새로 트는 신뢰가 아니다.
      // 조종은 connect-src 'self' 안에서만 돈다. 폼도 프레임도 막힌 채다.
      "content-security-policy": [
        "default-src 'none'",
        `style-src 'unsafe-inline' ${FONT_ORIGIN}`,
        `font-src ${FONT_ORIGIN}`,
        "script-src 'unsafe-inline'",
        "connect-src 'self'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join("; "),
    });
    res.end(
      PAGE.replace("TARGETS_JSON", JSON.stringify(TARGETS)).replace("CR_KEY", JSON.stringify(KEY)),
    );
    return;
  }
  res.writeHead(404).end("not found");
});

function openBrowser(url, thenExit) {
  if (!thenExit) {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  // 브라우저를 띄우자마자 부모가 죽으면 윈도우에서 자식이 뜨기 전에 사라질 수 있다.
  // spawn 이 실제로 일어난 것을 보고 나간다.
  const child = spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
  child.unref();
  child.on("spawn", () => process.exit(0));
  child.on("error", () => process.exit(0));
}

/**
 * 8799 가 이미 잡혀 있으면 그 자리에 있는 것이 우리 운영 화면인지 보고 브라우저만 연다.
 *
 * 바탕화면 바로가기를 강의 직전에 두 번 누르는 일은 실제로 일어난다. 그때 두 번째 프로세스가
 * EADDRINUSE 로 죽는데, 바로가기가 창을 최소화해서 띄우므로 운영자에게는 아무 일도 안 일어난
 * 것처럼 보인다. 그 상태로 강의를 시작하는 것이 제일 나쁘다.
 */
async function alreadyOpen() {
  const url = `http://127.0.0.1:${PORT}`;
  let mine = false;
  try {
    const res = await fetch(url);
    mine = res.ok && (await res.text()).includes("<title>강의장 운영</title>");
  } catch {
    mine = false;
  }
  if (!mine) {
    console.error("");
    console.error(`  ${PORT} 을 다른 프로그램이 쓰고 있어 운영 화면을 못 띄웠습니다`);
    console.error("  그 프로그램을 끄고 다시 실행해 주세요");
    console.error("");
    process.exit(1);
  }
  console.log("");
  console.log(`  운영 화면이 이미 떠 있습니다  ${url}`);
  console.log("");
  if (OPEN) openBrowser(url, true);
  else process.exit(0);
}

server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  alreadyOpen().catch((e) => {
    console.error(e);
    process.exit(1);
  });
});

// 루프백에만 묶는다. 이 프로세스가 운영 토큰을 들고 있으므로 강의장 와이파이에 노출하지 않는다.
server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log("");
  console.log(`  강의장 운영 화면  ${url}`);
  for (const t of TARGETS) {
    console.log(`    ${t.label}  ${t.base}${t.ready ? "" : "  (토큰 없음)"}`);
  }
  console.log("");
  if (OPEN) openBrowser(url, false);
});
