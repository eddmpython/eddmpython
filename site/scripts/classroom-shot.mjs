/**
 * 강의장 화면을 찍고 실제로 도는지 본다. 로컬 wrangler dev 가 떠 있어야 한다.
 *
 * 사용: node scripts/classroom-shot.mjs [baseUrl]
 * 출력: ../../eddmpython.out/classroom-shots/
 *
 * 강의장은 sitemap 에 없고 비밀번호 뒤에 있어서 verify:visual 이 못 본다. 그래서 따로 찍는다.
 * 그림만 보고 넘어가지 않는다. 확대와 실시간 동기화는 인라인 스크립트라서 CSP 가 막으면
 * 화면은 멀쩡한데 기능이 죽는다. 그래서 스크립트가 실제로 돌았는지도 같이 확인한다.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
/** Runtime.evaluate 응답은 CDP 결과를 한 겹 더 감싸고 있다. 값만 꺼낸다. */
const value = (res) => res?.output?.result?.result?.value;

const OUT = resolve(SITE_ROOT, "../../eddmpython.out/classroom-shots");
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");

const ROOM = "shot";
const PASSWORD = "shot-room-1234";

const config = JSON.parse(await readFile(join(SITE_ROOT, ".classroom-admin.json"), "utf8"));
const token = config.targets.find((t) => t.id === "local")?.token;
if (!token) throw new Error(".classroom-admin.json 의 로컬 토큰이 없다");

async function admin(body) {
  const res = await fetch(`${base}/cr/api/admin`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`admin ${body.action} 실패: ${JSON.stringify(data)}`);
  return data;
}

// 찍을 방을 그 자리에서 만든다. 배포도 secret 도 없이 주소가 살아나는지 이걸로 확인한다.
await admin({ action: "remove", slug: ROOM }).catch(() => {});
const made = await admin({ action: "create", slug: ROOM, title: "검수용 강의장", password: PASSWORD });
const category = made.categories[0];
if (!category) {
  throw new Error(
    "교안 카테고리가 없다. ../eddmpython-course 에서 npm run publish:local 을 먼저 돌려라",
  );
}
await admin({ action: "toggle", slug: ROOM, category: category.slug });
const listed = await admin({ action: "list" });
const posts = listed.categories.find((c) => c.slug === category.slug);
console.log(`  검수용 강의장 ${base}/cr/${ROOM}  카테고리 ${category.slug} (${posts.posts}편)`);

const first = process.argv[3] ?? null;

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 1000, isMobile: false, hasTouch: false },
  { id: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

await mkdir(OUT, { recursive: true });
const checks = [];
const record = (label, ok, detail) => {
  checks.push(ok);
  console.log(`  ${ok ? "통과" : "실패"}  ${label}${detail && !ok ? ` (${detail})` : ""}`);
};

for (const viewport of VIEWPORTS) {
  const manifestPath = join(OUT, `pyproc-control.${viewport.id}.json`);
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
        timeoutMs: 180000,
        browser: {
          enabled: true,
          provider: "nativeCdp",
          allowedOrigins: [new URL(base).origin],
          maxRisk: "externalEffect",
          actions: ["snapshot", "screenshot", "waitFor", "navigate", "click"],
          methods: ["Runtime.evaluate"],
          viewport: {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: 1,
            mobile: viewport.isMobile,
            touch: viewport.hasTouch,
          },
          externalEffects: "acknowledged",
          purpose: "eddmpython 강의장 화면 검수",
          artifacts: {
            maxArtifactBytes: 33554432,
            maxTotalBytes: 134217728,
            maxArtifacts: 64,
            inlineMaxBytes: 4194304,
            ttlMs: 900000,
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE_ROOT, timeoutMs: 30000 });
  if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
  const client = await PyProcControlClient.start(manifestPath, {
    cwd: SITE_ROOT,
    startupTimeoutMs: 180000,
    shutdownTimeoutMs: 30000,
  });

  const evaluate = async (sessionRef, expression, awaitPromise = true) =>
    client.command(
      sessionRef,
      "Runtime.evaluate",
      { expression, awaitPromise, returnByValue: true },
      { expectedRisk: "externalEffect", timeoutMs: 120000 },
    );

  /** lazy 이미지를 강제로 로드하고 다 뜰 때까지 기다린다. 안 하면 빈 자리로 찍힌다. */
  const hydrate = async (sessionRef) => {
    await evaluate(
      sessionRef,
      `(async () => {
        const imgs = [...document.images];
        imgs.forEach((i) => { i.loading = 'eager'; if (i.dataset.src) i.src = i.dataset.src; });
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
        window.scrollTo(0, 0);
        await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => {
          i.addEventListener('load', r, { once: true });
          i.addEventListener('error', r, { once: true });
        })));
        return true;
      })()`,
    );
  };

  const save = async (sessionRef, name) => {
    await hydrate(sessionRef);
    const captured = await client.act(
      sessionRef,
      [{ kind: "screenshot", format: "jpeg", fullPage: true, expectedRisk: "read" }],
      { timeoutMs: 60000 },
    );
    const image = captured.attachments.find((i) => i.mimeType === "image/jpeg");
    if (!image) throw new Error(`screenshot 없음: ${name}`);
    const file = join(OUT, `${name}.${viewport.id}.jpg`);
    await writeFile(file, image.bytes);
    console.log(`  ${file}`);
    const ref = captured.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
  };

  try {
    // 1) 비밀번호 화면
    let opened = await client.openTarget(`${base}/cr/${ROOM}`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    let session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    await save(session, "01-login");

    // 2) 비밀번호를 넣고 들어간 목록. type 액션이 없으므로 값을 직접 넣고 제출한다.
    await evaluate(
      session,
      `(() => {
        const i = document.querySelector('input[name="password"]');
        i.value = ${JSON.stringify(PASSWORD)};
        document.querySelector('form').submit();
      })()`,
      false,
    );
    await client.act(
      session,
      [{ kind: "waitFor", selector: ".cat h2", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    await save(session, "02-room");

    // 폴링 스크립트가 실제로 돌았는지 본다. CSP 가 막으면 여기서 undefined 가 나온다.
    const stamped = await evaluate(session, `typeof window.__stamp`);
    record(`${viewport.id} 실시간 동기화 스크립트`, value(stamped) === "string");

    // 3) 열린 글 한 편
    const href = value(await evaluate(session, `document.querySelector('a.post').getAttribute('href')`));
    if (!href) throw new Error('열린 글 링크를 못 찾았다');
    opened = await client.openTarget(`${base}${first ?? href}`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    await save(session, "03-post");

    // 확대가 실제로 열리는지 본다. 강의 중에 화면에 띄우는 기능이라 그림만으로는 못 믿는다.
    const zoomed = await evaluate(
      session,
      `(async () => {
        const img = document.querySelector('article img');
        if (!img) return 'no-image';
        img.click();
        await new Promise((r) => setTimeout(r, 150));
        return document.getElementById('zoom').classList.contains('on') ? 'on' : 'off';
      })()`,
    );
    const zoomState = value(zoomed);
    record(`${viewport.id} 시각 자산 확대`, zoomState === "on", zoomState);
    if (zoomState === "on") await save(session, "04-zoom");
  } finally {
    await client.stop?.({ timeoutMs: 30000 });
  }
}

console.log(`
강의장 화면, ${OUT}`);
console.log(`검수용 강의장은 남겨 둔다. 지우려면 운영 화면에서 ${ROOM} 을 삭제한다`);
// 브라우저를 붙들고 있는 핸들이 남아 프로세스가 안 끝나는 일이 있다. 명시적으로 끝낸다.
process.exit(checks.every(Boolean) ? 0 : 1);
