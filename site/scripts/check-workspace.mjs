import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import {
  allowedFor,
  ALLOWED,
  MASTER_SUFFIX,
  OUTPUT_ROOT,
  TOTAL_BUDGET_MB,
} from "./workspace-contract.mjs";

/*
 * 저장소 밖 산출물 폴더를 검사한다.
 *
 * 저장소 안은 `git status` 가 본다. 저장소 밖은 아무도 안 봤고, 그래서 9.2GB 가 쌓이고
 * 회색 원본이 거기에만 남아 있었다. 이 검사기가 그 사각지대를 맡는다.
 *
 * **원본 찾기가 선언 검사보다 먼저다.** 첫 판은 원본을 `blog-media` 안에서만 찾았다.
 * 그런데 이 검사기가 막겠다는 사고 중 하나가 상대 경로 실수로 엉뚱한 이름의 폴더가 생기는
 * 것이다. 그러면 원본이 `blog-media` 밖으로 떨어지고, 검사기는 그것을 선언 안 된 폴더로만
 * 보고 첫 줄에 "지울 것이면 지우고" 를 찍었다. 유일본이 든 폴더를 지우라고 안내한 것이다.
 * 이제 폴더 전체를 훑고, 원본이 든 항목은 지우라고 말하지 않는다.
 *
 * 링크는 어디에 있든 실패로 본다. junction 과 symlink 뒤의 바이트는 크기 집계에도,
 * 원본 찾기에도 안 잡힌다. 즉 링크 하나로 이 검사기 전체가 눈을 감는다. 산출물 폴더에
 * 링크를 둘 이유가 없으므로 발견하면 막는다.
 */

const CATALOG = new URL("../../blog/media/catalog.json", import.meta.url);
const mb = (bytes) => (bytes / 1048576).toFixed(1);

/** 한 항목을 훑어 파일 수, 바이트, 원본 후보, 링크를 모은다. 링크는 따라 들어가지 않는다 */
async function survey(root) {
  const found = { files: 0, bytes: 0, entries: 0, masters: [], links: [] };
  const one = await stat(root).catch(() => null);
  if (one && !one.isDirectory()) {
    found.files = 1;
    found.bytes = one.size;
    if (root.endsWith(MASTER_SUFFIX)) found.masters.push(root);
    return found;
  }
  const walk = async (dir) => {
    const items = await readdir(dir, { withFileTypes: true });
    found.entries += items.length;
    for (const item of items) {
      const full = join(dir, item.name);
      /* 정규 파일도 디렉터리도 아니면 링크이거나 그에 준하는 것이다. 따라가지 않고 신고한다 */
      if (!item.isFile() && !item.isDirectory()) {
        found.links.push(full);
        continue;
      }
      if (item.isDirectory()) {
        await walk(full);
        continue;
      }
      found.files += 1;
      found.bytes += (await stat(full)).size;
      if (item.name.endsWith(MASTER_SUFFIX)) found.masters.push(full);
    }
  };
  await walk(root);
  return found;
}

/** catalog 가 아는 객체 sha 전부. 못 읽으면 통과시키지 않는다 */
async function publishedSha(catalogPath) {
  if (!existsSync(catalogPath)) return null;
  const catalog = JSON.parse(await readFile(catalogPath, "utf-8"));
  const objects = catalog.objects;
  if (!objects || typeof objects !== "object" || Array.isArray(objects)) {
    throw new Error("catalog.json 의 objects 가 계약과 다릅니다");
  }
  return new Set(Object.keys(objects));
}

/**
 * 산출물 폴더 하나를 검사해 문제 목록을 돌려준다.
 *
 * 실행부와 나눠 둔 이유는 시험 때문이다. 실제 폴더를 건드리지 않고 임시 폴더로 이 함수를
 * 부를 수 있어야 우회로를 부정 대조로 잡는다. 검사기에 시험용 환경변수 뒷문을 두면
 * 그 뒷문이 곧 우회로가 된다.
 */
export async function inspect({ root, catalogPath, budgetMb }) {
  const problems = [];
  const fail = (where, message) => problems.push({ where, message });
  if (!existsSync(root)) return { problems, total: 0, top: 0, missing: true };

  const published = await publishedSha(catalogPath);
  const top = await readdir(root, { withFileTypes: true });
  const sizes = [];
  let total = 0;

  for (const entry of top) {
    if (!entry.isFile() && !entry.isDirectory()) {
      fail(entry.name, "산출물 폴더 최상위에 링크가 있습니다. 링크 뒤의 바이트는 아무 검사도 받지 않습니다");
      continue;
    }
    const path = join(root, entry.name);
    const seen = await survey(path);
    total += seen.bytes;
    sizes.push({ name: entry.name, bytes: seen.bytes });

    for (const link of seen.links) {
      fail(
        relative(root, link),
        "링크입니다. 그 뒤의 바이트는 크기 집계에도 원본 찾기에도 안 잡혀 검사기 전체가 눈을 감습니다",
      );
    }

    /* 원본을 먼저 본다. 이 항목을 지우라고 말해도 되는지가 여기서 갈린다 */
    const unbacked = [];
    for (const master of seen.masters) {
      const sha = createHash("sha256").update(await readFile(master)).digest("hex");
      if (published === null || !published.has(sha)) unbacked.push(relative(root, master));
    }
    for (const where of unbacked) {
      fail(
        where,
        `회색 원본이 여기에만 있습니다. 이 바이트를 잃으면 같은 이미지를 다시 못 만듭니다
    python -X utf8 blog/scripts/publish_media.py --post <글> 로 허깅페이스에 올리세요`,
      );
    }

    if (allowedFor(entry.name)) continue;

    /* 항목이 통째로 비어 있으면 이름만 남은 것이다. 핸들이 물고 있으면 이 모양이 된다.
     * 첫 판은 "파일 0개" 로 봐줬는데, 그러면 하위 폴더만 있는 트리가 통째로 통과했다.
     * 진짜로 아무 항목도 없을 때만 넘어간다. */
    if (entry.isDirectory() && seen.entries === 0) continue;

    if (unbacked.length > 0) {
      fail(
        entry.name,
        `선언 안 된 항목인데 안에 발행 안 된 회색 원본이 ${unbacked.length}개 있습니다
    **지우지 마세요.** 먼저 발행한 뒤에 이 항목을 어떻게 할지 정합니다`,
      );
      continue;
    }
    fail(
      entry.name,
      `산출물 폴더에 선언 안 된 것이 있습니다 (파일 ${seen.files.toLocaleString()}개, ${mb(seen.bytes)}MB)
    지울 것이면 지우고, 계속 쓸 것이면 site/scripts/workspace-contract.mjs 의 ALLOWED 에 더하세요
    더할 때 rebuild 를 못 적겠다면 그것은 다시 만들 수 없는 것입니다. 여기 두지 말고 발행하세요`,
    );
  }

  if (total > budgetMb * 1048576) {
    const big = sizes
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 3)
      .map((s) => `${s.name} ${mb(s.bytes)}MB`)
      .join(", ");
    fail(
      "합계",
      `산출물 폴더가 ${mb(total)}MB 입니다. 예산은 ${budgetMb}MB 입니다
    큰 것부터: ${big}
    선언된 항목이라도 이만큼 쌓였다면 아무도 안 보는 사이에 커진 것입니다`,
    );
  }
  return { problems, total, top: top.length, missing: false };
}

/* 직접 실행할 때만 진짜 폴더를 본다 */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await inspect({
    root: OUTPUT_ROOT,
    catalogPath: CATALOG,
    budgetMb: TOTAL_BUDGET_MB,
  });
  if (result.missing) {
    console.log("산출물 폴더가 아직 없습니다. 빌드하면 생깁니다");
    process.exit(0);
  }
  if (result.problems.length > 0) {
    console.error(`산출물 폴더 문제 ${result.problems.length}건`);
    console.error("");
    for (const { where, message } of result.problems) {
      console.error(`  ${where}`);
      console.error(`    ${message}`);
      console.error("");
    }
    process.exit(1);
  }
  const irreplaceable = ALLOWED.filter((entry) => !entry.rebuild).map((entry) => entry.name);
  console.log(
    `산출물 폴더 정상: 최상위 ${result.top}개, ${mb(result.total)}MB / ${TOTAL_BUDGET_MB}MB
  다시 만들 수 없는 것: ${irreplaceable.join(", ") || "없음"}`,
  );
}
