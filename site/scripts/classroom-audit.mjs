/**
 * 강의장의 모든 글을 열어 교안이 약속한 것이 화면에 실제로 있는지 잰다.
 *
 * 사용: node scripts/classroom-audit.mjs [baseUrl]
 * 출력: ../../eddmpython.out/classroom-audit/
 *
 * classroom-shot.mjs 는 첫 글과 마지막 글만 찍고 기능이 도는지 본다. 이 검수는 다르다.
 * 글쓰기 정본으로 관리하는 전체 교안이 수강생 화면에 실제로 도착했는지를 하나하나 센다.
 * 캡션 수, 캐러셀 수, 준비 중 칸, 생 주소, 실행 칸과 그 출력, 섹션 수.
 * 그림만 찍고 넘어가지 않는다. 실행 칸은 눌러서 본문이 적어 둔 출력이 나오는지 본다.
 */
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { signIn } from "./admin-client.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
const value = (res) => res?.output?.result?.result?.value;

const OUT = resolve(SITE_ROOT, "../../eddmpython.out/classroom-audit");
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const ROOM = "audit";
const PASSWORD = randomBytes(12).toString("base64url");

const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
if (!local) console.log(`운영(${base}) 에 검수용 방을 만들고 끝나면 지운다`);
// 사람이 들어가는 문으로 같이 들어간다. 기계용 문을 따로 내지 않는다.
const admin = await signIn(base);

await admin({ action: "remove", slug: ROOM }).catch(() => {});
const made = await admin({ action: "create", slug: ROOM, title: "정본 검수 강의방", password: PASSWORD });
if (!made.categories.length) throw new Error("교안 카테고리가 없다");
for (const category of made.categories) {
  await admin({ action: "toggle", slug: ROOM, category: category.slug });
}
console.log(`  검수용 강의방 ${base}/room/${ROOM}  카테고리 ${made.categories.length}개`);

await mkdir(OUT, { recursive: true });
const checks = [];
const record = (label, ok, detail) => {
  checks.push(ok);
  console.log(`  ${ok ? "통과" : "실패"}  ${label}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
};

async function cleanup() {
  if (local) return;
  await admin({ action: "remove", slug: ROOM }).catch(() => {});
  const gone = await fetch(`${base}/room/${ROOM}`, { redirect: "manual" }).catch(() => null);
  const status = gone ? gone.status : "확인 못 함";
  console.log(`  운영의 검수용 방을 지웠다 (밖에서 본 status ${status})`);
  if (status !== 404) console.error("  경고: 아직 살아 있다. 운영 화면에서 직접 지워라");
}

/**
 * 실행 칸마다 기대하는 것. 본문이 독자에게 약속한 출력이다. 본문을 고쳤으면 여기도 고친다.
 * 키는 data-cell 의 이름이고 값은 결과 칸에 들어 있어야 하는 글자다.
 */
const EXPECT = {
  "expense-variables": ["영업팀: 120,000원, 기준 100,000원"],
  "expense-list-total": ["3건, 합계 250,000원"],
  "expense-column-map": ["사용금액 -> 금액"],
  "expense-condition": ["120,000원: 확인필요"],
  "expense-loop": ["50,000원: 정상", "120,000원: 확인필요", "80,000원: 정상"],
  "expense-function": ["정상", "확인필요"],
  "expense-syntax-together": ["합계 250,000원", "확인필요 1건", "관리팀: 120,000원, 확인필요"],
  "expense-sheet-classify": ["합계 250,000원", "확인필요 1건", "관리팀: 120,000원, 확인필요"],
};

/** 교안 실측. 자리표시자를 뺀 캡션 수와 섹션 수는 원본 md 에서 센다. 기대값을 손으로 적지 않는다. */
const COURSE = resolve(SITE_ROOT, "../../eddmpython-course/curriculum");
const postFiles = [];
for (const category of (await readdir(COURSE, { withFileTypes: true })).filter((entry) => entry.isDirectory())) {
  const categoryPath = join(COURSE, category.name);
  const files = (await readdir(categoryPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^\d{2}-[a-z0-9-]+\.md$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  // 글 번호는 카테고리마다 01 부터 다시 센다. 그래서 파일 이름만으로는 커리큘럼 전체에서
  // 유일하지 않다. 강의장 주소도 카테고리를 거치므로 여기서도 카테고리를 붙여 짝을 짓는다.
  files.forEach((file) =>
    postFiles.push({
      id: file.name.slice(0, -3),
      key: `${category.name}/${file.name.slice(0, -3)}`,
      path: join(categoryPath, file.name),
    }),
  );
}
if (!postFiles.length) {
  throw new Error(`${COURSE} 에서 교안을 한 편도 못 읽었다. 파일 이름 규칙이 바뀌었는지 본다`);
}
const posts = postFiles.map((post) => post.id);
const expected = {};
for (const post of postFiles) {
  const id = post.key;
  const md = await readFile(post.path, "utf8");
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const outside = body.replace(/```[\s\S]*?```/g, "");
  const captions = [...outside.matchAll(/^!\[[^\]]*\]\((\S+)\s+"[^"]*"\)$/gm)].filter((m) => !/^media:\/\//.test(m[1])).length;
  const sections = (outside.match(/^## /gm) ?? []).length;
  const cells = [...outside.matchAll(/^https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9-]+)$/gm)].map((m) => m[1]);
  const pending = (outside.match(/media:\/\//g) ?? []).length;
  const codeBlocks = [...body.matchAll(/^```([^\r\n]*)\r?\n[\s\S]*?^```\s*$/gm)].filter((match) => {
    const language = match[1].trim().split(/\s+/, 1)[0];
    return language !== "course-scene" && language !== "course-embed";
  }).length;
  const tables = (outside.match(/^\|(?:\s*:?-{3,}:?\s*\|){2,}/gm) ?? []).length;
  let imageRun = 0;
  let sliders = 0;
  for (const block of outside.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean)) {
    const image = block.match(/^!\[[^\]]*\]\((\S+)(?:\s+"[^"]*")?\)$/);
    if (image && !/\.(?:mp4|webm|mov)(?:\?.*)?$/i.test(image[1])) {
      imageRun += 1;
      continue;
    }
    if (imageRun > 1) sliders += 1;
    imageRun = 0;
  }
  if (imageRun > 1) sliders += 1;
  expected[id] = { captions, sections, cells, pending, codeBlocks, tables, sliders };
}

const manifestPath = join(OUT, "pyproc-control.json");
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
      timeoutMs: 300000,
      browser: {
        enabled: true,
        provider: "nativeCdp",
        allowedOrigins: [new URL(base).origin],
        maxRisk: "externalEffect",
        actions: ["snapshot", "screenshot", "waitFor", "navigate", "click"],
        methods: ["Runtime.evaluate"],
        viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, touch: false },
        externalEffects: "acknowledged",
        purpose: "eddmpython 강의장 교안 정본 검수",
        artifacts: { maxArtifactBytes: 33554432, maxTotalBytes: 268435456, maxArtifacts: 64, inlineMaxBytes: 4194304, ttlMs: 900000 },
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE_ROOT, timeoutMs: 30000 });
if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
const client = await PyProcControlClient.start(manifestPath, { cwd: SITE_ROOT, startupTimeoutMs: 180000, shutdownTimeoutMs: 30000 });

const evaluate = (sessionRef, expression, awaitPromise = true) =>
  client.command(sessionRef, "Runtime.evaluate", { expression, awaitPromise, returnByValue: true }, { expectedRisk: "externalEffect", timeoutMs: 240000 });

const save = async (sessionRef, name) => {
  await evaluate(
    sessionRef,
    `(async () => {
      const imgs = [...document.images];
      imgs.forEach((i) => { i.loading = 'eager'; });
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
      await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })));
      return true;
    })()`,
  );
  const captured = await client.act(sessionRef, [{ kind: "screenshot", format: "jpeg", fullPage: true, expectedRisk: "read" }], { timeoutMs: 120000 });
  const image = captured.attachments.find((i) => i.mimeType === "image/jpeg");
  if (!image) throw new Error(`screenshot 없음: ${name}`);
  // 글 이름에는 카테고리가 붙어 있어 슬래시가 들어 있다. 그대로 파일 이름에 쓰면 없는
  // 하위 폴더를 가리켜 쓰기가 ENOENT 로 죽는다. 이름은 여기서 파일에 쓸 수 있게 만든다.
  const file = join(OUT, `${name.replace(/[\/]/g, "__")}.jpg`);
  await writeFile(file, image.bytes);
  console.log(`  ${file}`);
  const ref = captured.output?.actions?.[0]?.result?.artifactRef;
  if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
};

try {
  // 들어간다
  let opened = await client.openTarget(`${base}/room/${ROOM}`, { expectedRisk: "externalEffect", waitUntil: "load", timeoutMs: 30000 });
  let session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
  await evaluate(session, `(() => { const i = document.querySelector('input[name="password"]'); i.value = ${JSON.stringify(PASSWORD)}; document.querySelector('form').submit(); })()`, false);
  await client.act(
    session,
    [{ kind: "waitFor", selector: `a.post[href$="/${posts[0]}"]`, timeoutMs: 15000, expectedRisk: "read" }],
    { timeoutMs: 30000 },
  );

  const hrefs = value(await evaluate(session, `[...document.querySelectorAll('a.post')].map(a => a.getAttribute('href'))`));
  record(
    `목록에 ${posts.length}편이 있다`,
    Array.isArray(hrefs) && hrefs.length === posts.length,
    String(hrefs?.length),
  );

  for (const href of hrefs ?? []) {
    const id = href.split("/").slice(-2).join("/");
    const exp = expected[id];
    if (!exp) { record(`${id} 가 교안 폴더에 있다`, false, "원본 md 없음"); continue; }
    opened = await client.openTarget(`${base}${href}`, { expectedRisk: "externalEffect", waitUntil: "load", timeoutMs: 30000 });
    session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

    // lazy 이미지는 화면에 들어오기 전엔 naturalWidth 가 0 이다. 먼저 전부 받게 한 뒤 잰다.
    await evaluate(
      session,
      `(async () => {
        const imgs = [...document.querySelectorAll('article img')];
        imgs.forEach((i) => { i.loading = 'eager'; });
        await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })));
        return imgs.length;
      })()`,
    );
    const m = value(
      await evaluate(
        session,
        `(() => ({
          h2: document.querySelectorAll('article h2').length,
          h3: document.querySelectorAll('article h3').length,
          captions: document.querySelectorAll('article figure.media figcaption').length,
          sliders: document.querySelectorAll('article .slider').length,
          pending: document.querySelectorAll('article .pending').length,
          rawCodaro: document.body.innerHTML.includes('codaro/run'),
          cells: [...document.querySelectorAll('article [data-cell]')].map(c => c.dataset.cell),
          missing: document.querySelectorAll('article .cell-miss').length,
          pre: document.querySelectorAll('article pre:not(.cell-o)').length,
          tables: document.querySelectorAll('article table').length,
          imgs: [...document.querySelectorAll('article img')].map(i => i.naturalWidth > 0).filter(Boolean).length,
          imgsAll: document.querySelectorAll('article img').length,
          lectureButtons: document.querySelectorAll('[data-lecture-open]').length,
          lectureDecks: document.querySelectorAll('[data-lecture-deck]').length,
          lectureScenes: document.querySelectorAll('[data-lecture-deck] .lecture-scene').length,
        }))()`,
      ),
    );

    record(`${id} 섹션 ${exp.sections}개`, m.h2 === exp.sections, `화면 ${m.h2}`);
    record(`${id} 부제가 섹션마다`, m.h3 === exp.sections, `h3 ${m.h3}`);
    record(`${id} 캡션 ${exp.captions}개 그려짐`, m.captions === exp.captions, `화면 ${m.captions}`);
    record(`${id} 캐러셀 ${exp.sliders}개 그려짐`, m.sliders === exp.sliders, `화면 ${m.sliders}`);
    record(`${id} 준비 중 칸 0`, m.pending === 0 && exp.pending === 0, `화면 ${m.pending}, 원본 ${exp.pending}`);
    record(`${id} 생 codaro 주소 없음`, m.rawCodaro === false, String(m.rawCodaro));
    record(`${id} 실행 칸 ${exp.cells.length}개`, m.cells.length === exp.cells.length && m.missing === 0 && exp.cells.every((c) => m.cells.includes(c)), `화면 ${m.cells.join(",")} 미발견 ${m.missing}`);
    record(`${id} 코드 블록 ${exp.codeBlocks}개`, m.pre === exp.codeBlocks, `화면 ${m.pre}`);
    record(`${id} 표 ${exp.tables}개`, m.tables === exp.tables, `화면 ${m.tables}`);
    record(`${id} 이미지가 전부 실제로 떴다`, m.imgs === m.imgsAll, `${m.imgs}/${m.imgsAll}`);
    record(`${id} 강의 모드 진입점 1개`, m.lectureButtons === 1 && m.lectureDecks === 1, `버튼 ${m.lectureButtons}, 덱 ${m.lectureDecks}`);
    record(`${id} 강의 장면 ${exp.sections}개`, m.lectureScenes === exp.sections, `화면 ${m.lectureScenes}`);

    // 실행 칸을 전부 눌러 본문이 약속한 출력을 본다
    for (const cell of m.cells) {
      const want = EXPECT[cell];
      if (!want) { record(`${id} 칸 ${cell} 기대값 등록됨`, false, "EXPECT 에 없음"); continue; }
      const ran = String(
        value(
          await evaluate(
            session,
            `(async () => {
              const cell = document.querySelector('article [data-cell="${cell}"]');
              cell.querySelector('[data-run]').click();
              const st = cell.querySelector('[data-state]');
              const out = cell.querySelector('[data-out]');
              for (let i = 0; i < 360; i++) {
                await new Promise((r) => setTimeout(r, 500));
                if (st.textContent === '완료' || st.textContent === '오류') break;
              }
              return st.textContent + ' :: ' + out.textContent;
            })()`,
          ),
        ),
      );
      const ok = ran.startsWith("완료") && want.every((w) => ran.includes(w));
      record(`${id} 칸 ${cell} 실행 결과`, ok, ran.slice(0, 120));
    }

    await save(session, id);
  }
} finally {
  await client.stop?.({ timeoutMs: 30000 });
  await cleanup();
}

const failed = checks.filter((c) => !c).length;
console.log(`\n강의장 정본 검수: ${checks.length}개 중 실패 ${failed}개, 화면은 ${OUT}`);
process.exit(failed ? 1 : 0);
