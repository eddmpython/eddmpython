import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  allowedFor,
  ALLOWED,
  MASTER_SUFFIX,
  OUTPUT_ROOT,
  STAGING_DIR,
  TOTAL_BUDGET_MB,
} from "./workspace-contract.mjs";

/*
 * 저장소 밖 산출물 폴더를 검사한다.
 *
 * 저장소 안은 `git status` 가 본다. 저장소 밖은 아무도 안 봤고, 그래서 9.2GB 가 쌓이고
 * 회색 원본이 거기에만 남아 있었다. 이 검사기가 그 사각지대를 맡는다.
 *
 * 세 가지를 본다.
 *   1. 선언 안 된 것이 있나            (`workspace-contract.mjs` 의 ALLOWED)
 *   2. 여기에만 있는 원본 바이트가 있나  (catalog 에 sha256 이 없는 .master.png)
 *   3. 아무도 안 보는 사이에 커졌나      (총합 예산)
 */

const CATALOG = new URL("../../blog/media/catalog.json", import.meta.url);
const problems = [];

function fail(where, message) {
  problems.push({ where, message });
}

/** 폴더 하나의 파일 수와 바이트를 센다 */
async function measure(path) {
  const entry = await stat(path);
  if (!entry.isDirectory()) return { files: 1, bytes: entry.size };
  let files = 0;
  let bytes = 0;
  const walk = async (dir) => {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) await walk(full);
      else if (item.isFile()) {
        files += 1;
        bytes += (await stat(full)).size;
      }
    }
  };
  await walk(path);
  return { files, bytes };
}

/** 스테이징에 남은 회색 원본 중 허깅페이스에 없는 것을 찾는다 */
async function unbackedMasters() {
  const staging = join(OUTPUT_ROOT, STAGING_DIR);
  if (!existsSync(staging)) return [];
  let published = new Set();
  if (existsSync(CATALOG)) {
    const catalog = JSON.parse(await readFile(CATALOG, "utf-8"));
    published = new Set(Object.keys(catalog.objects ?? {}));
  }
  const found = [];
  const walk = async (dir) => {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) await walk(full);
      else if (item.isFile() && item.name.endsWith(MASTER_SUFFIX)) {
        const sha = createHash("sha256").update(await readFile(full)).digest("hex");
        if (!published.has(sha)) found.push(relative(OUTPUT_ROOT, full));
      }
    }
  };
  await walk(staging);
  return found;
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);

if (!existsSync(OUTPUT_ROOT)) {
  console.log("산출물 폴더가 아직 없습니다. 빌드하면 생깁니다");
  process.exit(0);
}

const entries = await readdir(OUTPUT_ROOT, { withFileTypes: true });
const sizes = [];
let total = 0;

for (const entry of entries) {
  const known = allowedFor(entry.name);
  const { files, bytes } = await measure(join(OUTPUT_ROOT, entry.name));
  total += bytes;
  sizes.push({ name: entry.name, files, bytes, known: Boolean(known) });

  if (!known) {
    /* 핸들이 물고 있어 이름만 남은 빈 폴더는 재부팅이면 사라진다. 이것으로 커밋을 막지 않는다 */
    if (entry.isDirectory() && files === 0) continue;
    fail(
      entry.name,
      `산출물 폴더에 선언 안 된 것이 있습니다 (파일 ${files.toLocaleString()}개, ${mb(bytes)}MB).\n` +
        `    지울 것이면 지우고, 계속 쓸 것이면 site/scripts/workspace-contract.mjs 의 ALLOWED 에 더하세요.\n` +
        `    더할 때 rebuild 를 못 적겠다면 그것은 다시 만들 수 없는 것입니다. 여기 두지 말고 발행하세요`,
    );
  }
}

for (const path of await unbackedMasters()) {
  fail(
    path,
    "회색 원본이 여기에만 있습니다. 이 바이트를 잃으면 같은 이미지를 다시 못 만듭니다.\n" +
      "    python -X utf8 blog/scripts/publish_media.py --post <글> 로 허깅페이스에 올리세요",
  );
}

if (total > TOTAL_BUDGET_MB * 1048576) {
  const top = sizes
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 3)
    .map((s) => `${s.name} ${mb(s.bytes)}MB`)
    .join(", ");
  fail(
    "합계",
    `산출물 폴더가 ${mb(total)}MB 입니다. 예산은 ${TOTAL_BUDGET_MB}MB 입니다.\n` +
      `    큰 것부터: ${top}\n` +
      "    선언된 항목이라도 이만큼 쌓였다면 아무도 안 보는 사이에 커진 것입니다",
  );
}

if (problems.length > 0) {
  console.error(`산출물 폴더 문제 ${problems.length}건\n`);
  for (const { where, message } of problems) console.error(`  ${where}\n    ${message}\n`);
  process.exit(1);
}

const irreplaceable = ALLOWED.filter((entry) => !entry.rebuild).map((entry) => entry.name);
console.log(
  `산출물 폴더 정상: 최상위 ${entries.length}개, ${mb(total)}MB / ${TOTAL_BUDGET_MB}MB\n` +
    `  다시 만들 수 없는 것: ${irreplaceable.join(", ") || "없음"}`,
);
