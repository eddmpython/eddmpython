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
 * 운영 토큰은 비워 둔다. wrangler secret put CR_ADMIN_TOKEN 으로 넣은 값을 옮겨 적는다.
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
      data: { error: `${target.label} 토큰이 비어 있습니다. ${CONFIG} 에 채워 주세요` },
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
let target = TARGETS.find((t) => t.ready)?.id ?? TARGETS[0].id;
let rooms = [];
let categories = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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
    return '<div class="card' + (r.open ? " live" : "") + '">' +
      '<div class="head"><h2>' + esc(r.title) + "</h2>" +
      '<span class="state ' + (r.open ? "on" : "off") + '">' + (r.open ? "열림" : "닫힘") + "</span>" +
      '<a class="addr" href="' + url + '" target="_blank" rel="noreferrer">' + esc(url) + "</a></div>" +
      '<div class="row">' +
      '<button class="go" data-act="open" data-slug="' + r.slug + '" data-open="' + (r.open ? "0" : "1") + '">' +
      (r.open ? "강의장 닫기" : "강의장 열기") + "</button>" +
      '<button data-act="copy" data-url="' + url + '">주소 복사</button>' +
      '<input data-pw="' + r.slug + '" placeholder="새 비밀번호" style="flex:0 1 9rem">' +
      '<button data-act="password" data-slug="' + r.slug + '">바꾸기</button>' +
      '<button class="danger" data-act="remove" data-slug="' + r.slug + '">삭제</button></div>' +
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
      if (act === "password") {
        const input = $("rooms").querySelector('[data-pw="' + slug + '"]');
        if (!input.value) { $("err").textContent = "새 비밀번호를 적어 주세요"; return; }
        const done = await send({ action: "password", slug, password: input.value });
        if (done) $("err").textContent = "비밀번호를 바꿨습니다";
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
      // 이 화면이 바깥으로 무엇도 부르지 않게 한다
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'",
    });
    res.end(
      PAGE.replace("TARGETS_JSON", JSON.stringify(TARGETS)).replace("CR_KEY", JSON.stringify(KEY)),
    );
    return;
  }
  res.writeHead(404).end("not found");
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
  if (OPEN) spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
});
