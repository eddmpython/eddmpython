import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { inspect } from "./check-workspace.mjs";

/*
 * 산출물 폴더 검사기의 우회로를 잡는다.
 *
 * 아래 넷은 첫 판이 전부 통과시켰던 것이고 fresh context 검증이 찾아냈다. 특히 세 번째는
 * 검사기가 정확히 반대로 작동한 경우다. 유일본 원본이 든 폴더를 보고 "지울 것이면 지우고"
 * 라고 안내했다. 게이트가 지키려던 바로 그것을 지우라고 시켰다.
 */

let failures = 0;
const cases = [];

function check(label, condition, detail = "") {
  cases.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures += 1;
}

const sha = (data) => createHash("sha256").update(data).digest("hex");

/** 임시 산출물 폴더 하나를 만들어 검사한다 */
async function run(build, { objects = {} } = {}) {
  const base = mkdtempSync(join(tmpdir(), "eddm-ws-"));
  const root = join(base, "out");
  const catalogPath = join(base, "catalog.json");
  mkdirSync(root, { recursive: true });
  writeFileSync(catalogPath, JSON.stringify({ objects }), "utf-8");
  build(root);
  try {
    return await inspect({ root, catalogPath, budgetMb: 2048 });
  } finally {
    rmSync(base, { recursive: true, force: true, maxRetries: 5 });
  }
}

const text = (result) => result.problems.map((p) => `${p.where} ${p.message}`).join("\n");

/* 1. 선언 안 된 폴더에 파일이 있으면 잡는다 */
{
  const r = await run((root) => {
    mkdirSync(join(root, "junk"));
    writeFileSync(join(root, "junk", "a.bin"), "x");
  });
  check("선언 안 된 폴더", r.problems.length === 1, text(r));
}

/* 2. 파일 없이 하위 폴더만 있는 트리도 잡는다. 첫 판은 files === 0 이라 통과시켰다 */
{
  const r = await run((root) => {
    mkdirSync(join(root, "junk", "deep", "deeper"), { recursive: true });
  });
  check("파일 없는 중첩 폴더", r.problems.length === 1, text(r));
}

/* 3. 진짜로 아무 항목도 없는 폴더는 봐준다. 핸들이 물고 있으면 이 모양이 된다 */
{
  const r = await run((root) => mkdirSync(join(root, "ghost")));
  check("항목이 0개인 폴더는 통과", r.problems.length === 0, text(r));
}

/* 4. blog-media 밖에 떨어진 원본을 찾아내고, 지우라고 말하지 않는다 */
{
  const r = await run((root) => {
    mkdirSync(join(root, "blog-media-003", "004-post"), { recursive: true });
    writeFileSync(join(root, "blog-media-003", "004-post", "hero.master.png"), "유일본");
  });
  const said = text(r);
  check("blog-media 밖 원본을 찾는다", said.includes("회색 원본이 여기에만"), said);
  check("그 폴더를 지우라고 하지 않는다", !said.includes("지울 것이면 지우고"), said);
  check("지우지 말라고 말한다", said.includes("지우지 마세요"), said);
}

/* 5. 발행된 원본은 통과시킨다 */
{
  const bytes = "발행된 원본";
  const r = await run(
    (root) => {
      mkdirSync(join(root, "blog-media", "003-post"), { recursive: true });
      writeFileSync(join(root, "blog-media", "003-post", "hero.master.png"), bytes);
    },
    { objects: { [sha(Buffer.from(bytes, "utf-8"))]: {} } },
  );
  check("발행된 원본은 통과", r.problems.length === 0, text(r));
}

/* 6. 선언된 폴더 안의 원본도 본다 */
{
  const r = await run((root) => {
    mkdirSync(join(root, "site-dist", "nested"), { recursive: true });
    writeFileSync(join(root, "site-dist", "nested", "x.master.png"), "숨은 유일본");
  });
  check("선언된 폴더 안의 원본도 본다", text(r).includes("회색 원본"), text(r));
}

/* 7. catalog 가 깨졌으면 통과시키지 않는다 */
for (const [label, body] of [
  ["깨진 JSON", "{"],
  ["objects 없음", "{}"],
  ["objects 가 배열", '{"objects":[]}'],
]) {
  const base = mkdtempSync(join(tmpdir(), "eddm-ws-"));
  const root = join(base, "out");
  mkdirSync(root, { recursive: true });
  const catalogPath = join(base, "catalog.json");
  writeFileSync(catalogPath, body, "utf-8");
  let threw = false;
  try {
    await inspect({ root, catalogPath, budgetMb: 2048 });
  } catch {
    threw = true;
  }
  rmSync(base, { recursive: true, force: true, maxRetries: 5 });
  check(`catalog ${label} 이면 죽는다`, threw);
}

/* 8. 예산을 넘으면 잡는다 */
{
  const base = mkdtempSync(join(tmpdir(), "eddm-ws-"));
  const root = join(base, "out");
  mkdirSync(join(root, "site-dist"), { recursive: true });
  writeFileSync(join(base, "catalog.json"), '{"objects":{}}', "utf-8");
  writeFileSync(join(root, "site-dist", "big.bin"), Buffer.alloc(2 * 1048576));
  const r = await inspect({ root, catalogPath: join(base, "catalog.json"), budgetMb: 1 });
  rmSync(base, { recursive: true, force: true, maxRetries: 5 });
  check("예산 초과를 잡는다", text(r).includes("예산은 1MB"), text(r));
}

/* 9. 폴더가 없으면 통과한다 */
{
  const r = await inspect({
    root: join(tmpdir(), "eddm-ws-absent-" + process.pid),
    catalogPath: join(tmpdir(), "nope.json"),
    budgetMb: 2048,
  });
  check("폴더가 없으면 통과", r.missing === true && r.problems.length === 0);
}

/* 10. 링크는 잡는다. 만들 권한이 없는 기계에서는 건너뛴다 */
{
  const base = mkdtempSync(join(tmpdir(), "eddm-ws-"));
  const root = join(base, "out");
  const target = join(base, "target");
  mkdirSync(join(root, "site-dist"), { recursive: true });
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "hidden.master.png"), "링크 뒤에 숨은 유일본");
  writeFileSync(join(base, "catalog.json"), '{"objects":{}}', "utf-8");
  let made = true;
  try {
    execFileSync("cmd", ["/c", "mklink", "/J", join(root, "site-dist", "link"), target], {
      stdio: "pipe",
    });
  } catch {
    made = false;
  }
  if (made) {
    const r = await inspect({ root, catalogPath: join(base, "catalog.json"), budgetMb: 2048 });
    check("링크를 잡는다", text(r).includes("링크입니다"), text(r));
  } else {
    cases.push({ label: "링크를 잡는다 (건너뜀: 링크를 못 만드는 기계)", ok: true, detail: "" });
  }
  rmSync(base, { recursive: true, force: true, maxRetries: 5 });
}

/* 11. 경로와 이름이 파이썬 정본과 갈라지지 않는다.
 *
 * 값만 상수와 비교하면 JS 쪽에 손으로 박아 둔 것을 못 잡는다. 정본 파일을 직접 읽어 견준다.
 * 한쪽이 바뀌면 검사기는 실패하지 않고 조용히 아무것도 안 보게 되므로 이 시험이 그 자리를 막는다. */
{
  const contract = await import("./workspace-contract.mjs");
  const source = readFileSync(
    new URL("../../blog/scripts/media_paths.py", import.meta.url),
    "utf-8",
  );
  for (const [name, actual] of [
    ["MASTER_SUFFIX", contract.MASTER_SUFFIX],
    ["STAGING_DIR", contract.STAGING_DIR],
  ]) {
    const found = source.match(new RegExp(`^${name} = "([^"]*)"$`, "m"));
    check(
      `${name} 이 파이썬 정본과 같다`,
      found !== null && found[1] === actual,
      `정본 ${found ? found[1] : "(못 읽음)"} / 계약 ${actual}`,
    );
  }
  const outputDir = source.match(/^OUTPUT_DIR = "([^"]*)"$/m);
  check(
    "OUTPUT_ROOT 이 파이썬 정본의 이름으로 끝난다",
    outputDir !== null && contract.OUTPUT_ROOT.endsWith(outputDir[1]),
    `${contract.OUTPUT_ROOT}`,
  );
}

/* 12. 이름이 조금 어긋난 원본도 원본으로 본다.
 *
 * 정확한 이름 대조만 하면 hero.Master.png 와 hero.master.png.bak 이 원본이 아닌 것이 되고,
 * 검사기는 그 항목을 그냥 선언 안 된 폴더로 보고 "지울 것이면 지우고" 를 찍는다.
 * 유일본을 지우라고 안내하는 그 모양으로 되돌아간다. */
for (const name of ["hero.Master.png", "hero.MASTER.PNG", "hero.master.png.bak"]) {
  const r = await run((root) => {
    mkdirSync(join(root, "blog-media-backup", "003-post"), { recursive: true });
    writeFileSync(join(root, "blog-media-backup", "003-post", name), "유일본");
  });
  const said = text(r);
  check(`${name} 도 원본으로 본다`, said.includes("회색 원본이 여기에만"), said);
  check(`${name} 이 든 폴더를 지우라고 하지 않는다`, !said.includes("지울 것이면 지우고"), said);
}

/* 13. 선언된 폴더 안의 대문자 원본도 본다. 이것을 놓치면 문제 0건으로 완전한 초록불이 뜬다 */
{
  const r = await run((root) => {
    mkdirSync(join(root, "blog-media", "003-post"), { recursive: true });
    writeFileSync(join(root, "blog-media", "003-post", "hero.Master.png"), "유일본");
  });
  check("선언된 폴더 안의 대문자 원본", text(r).includes("회색 원본"), text(r));
}

/* 14. 정본에 같은 대입이 둘이면 값을 고르지 않고 죽는다.
 *
 * 파이썬은 마지막 대입을 쓰고 정규식은 첫 일치를 읽는다. 둘이 갈라지면 검사기는
 * 실패하지 않고 조용히 아무것도 안 보게 된다. 애매하면 죽는 것이 맞다. */
{
  const { readAssignment } = await import("./workspace-contract.mjs");
  const one = 'MASTER_SUFFIX = ".master.png"';
  const two = 'MASTER_SUFFIX = ".master.tiff"';
  check("하나면 그 값을 읽는다", readAssignment(one, "MASTER_SUFFIX") === ".master.png");
  for (const [label, source] of [
    ["아래에 덧붙임", `${one}
${two}`],
    ["위에 덧붙임", `${two}
${one}`],
    ["사이에 다른 줄", `${one}
STAGING_DIR = "x"
${two}`],
  ]) {
    let threw = false;
    try {
      readAssignment(source, "MASTER_SUFFIX");
    } catch {
      threw = true;
    }
    check(`정본에 대입이 둘이면 죽는다 (${label})`, threw, source.split(String.fromCharCode(10)).join(" / "));
  }
  let missing = false;
  try {
    readAssignment("NOTHING = \"x\"", "MASTER_SUFFIX");
  } catch {
    missing = true;
  }
  check("정본에 없으면 죽는다", missing);
}

/* 15. 산출물을 쓰는 곳들이 전부 게이트가 보는 폴더 안에 있다.
 *
 * 이것이 갈라지면 게이트는 실패하지 않는다. 아무도 안 쓰는 폴더를 보며
 * "산출물 폴더가 아직 없습니다" 를 찍고 exit 0 으로 통과한다. 검사기가 눈을 감은 채
 * 초록불을 띄우는 것이라 가장 알아채기 어렵다. */
{
  const { OUTPUT_ROOT } = await import("./workspace-contract.mjs");
  const SITE = fileURLToPath(new URL("..", import.meta.url));
  const REPO = resolve(SITE, "..");
  const writers = [
    ["vite 클라이언트", "vite.config.ts", /const OUT_DIR = "([^"]+)"/, SITE],
    ["vite SSR", "vite.config.ts", /const SSR_DIR = "([^"]+)"/, SITE],
    ["wrangler 자산", "wrangler.jsonc", /"directory": "([^"]+)"/, SITE],
    ["시각 검증", "scripts/visual-api.mjs", /OUTPUT_ROOT = resolve\(SITE_ROOT, "([^"]+)"\)/, SITE],
  ];
  for (const [label, file, pattern, base] of writers) {
    const source = readFileSync(join(SITE, file), "utf-8");
    const found = source.match(pattern);
    const target = found ? resolve(base, found[1]) : "";
    check(
      `${label} 이 게이트가 보는 폴더 안이다`,
      found !== null && (target === OUTPUT_ROOT || target.startsWith(OUTPUT_ROOT + sep)),
      `${found ? found[1] : "(패턴 못 찾음)"} -> ${target}`,
    );
  }
  const leak = readFileSync(join(SITE, "scripts/check-leak.mjs"), "utf-8");
  const leakPath = leak.match(/resolve\(REPO, "\.\.", "([^"]+)", "([^"]+)"\)/);
  const leakTarget = leakPath ? resolve(REPO, "..", leakPath[1], leakPath[2]) : "";
  check(
    "누출 검사가 게이트가 보는 폴더 안이다",
    leakPath !== null && leakTarget.startsWith(OUTPUT_ROOT + sep),
    leakTarget,
  );
}

for (const { label, ok, detail } of cases) {
  console.log(`  ${ok ? "통과" : "실패"}  ${label}`);
  if (!ok && detail) console.log(`        ${detail.split("\n").join("\n        ")}`);
}
if (failures > 0) {
  console.error(`산출물 폴더 게이트 시험 ${failures}건 실패`);
  process.exit(1);
}
console.log("산출물 폴더 게이트 계약 통과");
