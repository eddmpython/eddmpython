/**
 * 운영장 눈검수.
 *
 * `check-brand.mjs` 는 hex 를 직접 적었는지, 공용 크롬을 import 했는지까지만 본다. 그것만으로는
 * 레이아웃이 무너진 화면도 통과한다. 운영장은 강의 직전에 여는 화면이라 그때 깨져 있으면
 * 고칠 시간이 없다.
 *
 * 로그인 화면과 조종 화면을 다크와 라이트 양쪽으로 찍는다. 사람이 그림을 본다.
 *
 * 사용: node scripts/admin-shot.mjs [주소]
 *   기본은 http://localhost:8787 이다. 운영 주소를 주면 검수용 방을 만들고 끝나면 지운다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { adminPassword, signIn } from "./admin-client.mjs";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(SITE, "../../eddmpython.out/admin-shot");
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
/**
 * 검수용 방 이름과 비밀번호.
 *
 * 2026-08-20 에 검수 스크립트에 적어 둔 방 이름과 비밀번호로 운영의 유료 교안이 통째로
 * 열렸다. 이름은 검수용임이 드러나게 짓고 비밀번호는 매번 새로 뽑으며 끝나면 지운다.
 */
const ROOM = "admin-shot-check";
const PASSWORD = randomBytes(12).toString("base64url");

await mkdir(OUT, { recursive: true });
const drive = await signIn(base);
if (!local) console.log(`운영(${base}) 에 검수용 방을 만들고 끝나면 지운다`);

async function cleanup() {
  await drive({ action: "remove", slug: ROOM }).catch(() => {});
}

await cleanup();
const made = await drive({ action: "create", slug: ROOM, title: "운영장 화면 검수용 방", password: PASSWORD });
if (made.categories.length) {
  // 카테고리 칩이 열림과 잠김 두 상태로 다 보여야 화면을 제대로 본 것이다.
  await drive({ action: "toggle", slug: ROOM, category: made.categories[0].slug });
}
console.log(`  검수용 방 ${ROOM}  카테고리 ${made.categories.length}개`);

const manifestPath = join(OUT, "pyproc-control.json");
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      // 브라우저만 쓰지만 pyproc 은 엔진 항목을 요구한다. 강의장 검수와 같은 판을 고정한다.
      engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
      timeoutMs: 300000,
      browser: {
        enabled: true,
        provider: "nativeCdp",
        allowedOrigins: [new URL(base).origin],
        maxRisk: "externalEffect",
        actions: ["snapshot", "screenshot", "waitFor", "navigate", "click"],
        methods: ["Runtime.evaluate"],
        viewport: { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false, touch: false },
        externalEffects: "acknowledged",
        purpose: "eddmpython 운영장 브랜딩 검수",
        artifacts: { maxArtifactBytes: 33554432, maxTotalBytes: 268435456, maxArtifacts: 64, inlineMaxBytes: 4194304, ttlMs: 900000 },
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const checks = [];
const record = (label, ok, detail) => {
  checks.push(ok);
  console.log(`  ${ok ? "통과" : "실패"}  ${label}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
};

const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE, timeoutMs: 30000 });
if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
const client = await PyProcControlClient.start(manifestPath, {
  cwd: SITE,
  startupTimeoutMs: 300000,
  shutdownTimeoutMs: 30000,
});

try {
  const opened = await client.openTarget(`${base}/admin`, {
    expectedRisk: "externalEffect",
    waitUntil: "load",
    timeoutMs: 60000,
  });
  const session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

  const ev = async (expression) => {
    const r = await client.command(
      session,
      "Runtime.evaluate",
      { expression, awaitPromise: false, returnByValue: true },
      { expectedRisk: "externalEffect", timeoutMs: 120000 },
    );
    return r?.output?.result?.result?.value;
  };

  const save = async (name) => {
    const shot = await client.act(
      session,
      [{ kind: "screenshot", format: "jpeg", fullPage: true, expectedRisk: "read" }],
      { timeoutMs: 120000 },
    );
    const image = shot.attachments.find((a) => a.mimeType === "image/jpeg");
    if (!image) throw new Error(`screenshot 없음: ${name}`);
    const file = join(OUT, `${name}.jpg`);
    await writeFile(file, image.bytes);
    console.log(`  ${file}`);
    const ref = shot.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
  };

  const gate = await ev(
    `(() => ({ logo: !!document.querySelector(".hd-logo"), form: !!document.querySelector('input[name=password]'), bg: getComputedStyle(document.body).backgroundColor, font: getComputedStyle(document.body).fontFamily.split(",")[0] }))()`,
  );
  record("로그인 화면에 브랜드 머리띠가 있다", Boolean(gate?.logo));
  record("로그인 화면에 비밀번호 칸이 있다", Boolean(gate?.form));
  record("브랜드 글꼴이 걸렸다", String(gate?.font ?? "").includes("Pretendard"), gate?.font);
  await save("admin-login");

  const password = await adminPassword();
  await ev(
    `(() => { const i = document.querySelector('input[name=password]'); i.value = ${JSON.stringify(password)}; i.form.submit(); return true; })()`,
  );
  await new Promise((r) => setTimeout(r, 3500));

  const console_ = await ev(
    `(() => ({ path: location.pathname, cards: document.querySelectorAll(".card").length, cats: document.querySelectorAll(".cat").length, toggle: !!document.querySelector("[data-theme-toggle]"), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, bg: getComputedStyle(document.body).backgroundColor }))()`,
  );
  record("로그인하면 조종 화면이 뜬다", console_?.path === "/admin", console_?.path);
  record("만든 방이 카드로 보인다", (console_?.cards ?? 0) >= 1, String(console_?.cards));
  record("카테고리 줄이 보인다", (console_?.cats ?? 0) >= 1, String(console_?.cats));
  record("테마 토글이 있다", Boolean(console_?.toggle));
  // 가로 스크롤이 생기면 강의 직전에 단추를 찾다가 시간을 버린다.
  record("가로로 넘치지 않는다", console_?.overflow === false);
  await save("admin-console");

  await ev(`(() => { document.querySelector("[data-theme-toggle]").click(); return true; })()`);
  await new Promise((r) => setTimeout(r, 800));
  const light = await ev(
    `(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }))()`,
  );
  record("라이트 테마로 바뀐다", light?.theme === "light", light?.theme);
  record("라이트에서 배경이 달라진다", light?.bg !== console_?.bg, `${console_?.bg} -> ${light?.bg}`);
  await save("admin-console-light");
} finally {
  await client.stop?.({ timeoutMs: 30000 });
  await cleanup();
  console.log("  검수용 방을 지웠다");
}

const failed = checks.filter((ok) => !ok).length;
console.log(`\n운영장 검수: ${checks.length}건 중 ${failed}건 실패. 그림은 ${OUT}`);
if (failed) process.exit(1);
