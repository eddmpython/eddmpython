import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { executionRoot } from "./executionWorkspace.mjs";

const shared = dirname(executionRoot());
const root = mkdtempSync(join(shared, "leakTest-"));
const site = join(root, "tmp", "repo", "site");
const course = join(root, "tmp", "eddmpython-course");
const dist = join(root, "site-dist");
const publicNames = "Codex와 Claude Code";
const privateExplanation = `${publicNames}를 비교하는 가상 실습의 비공개 설명입니다.`;
const sentences = Array.from({ length: 120 }, (_, index) =>
  `누출 검사만을 위해 만든 가상의 비공개 문장 ${index}번입니다.`);

function check(label, content, expected) {
  writeFileSync(join(dist, "index.html"), content);
  const result = spawnSync(process.execPath, ["scripts/check-leak.mjs"], {
    cwd: site,
    env: { ...process.env, EDDMPYTHON_RUN_DIR: root },
    encoding: "utf8",
  });
  assert.equal(result.status, expected, `${label}\n${result.stdout}\n${result.stderr}`);
  console.log(`통과: ${label}`);
}

try {
  for (const path of [join(site, "scripts"), join(course, "curriculum"), join(course, "_archive"), dist]) {
    mkdirSync(path, { recursive: true });
  }
  for (const name of ["check-leak.mjs", "executionWorkspace.mjs"]) {
    copyFileSync(new URL(name, import.meta.url), join(site, "scripts", name));
  }
  writeFileSync(join(course, "curriculum", "plan.json"), JSON.stringify({
    title: publicNames,
    explanation: privateExplanation,
    sentences,
  }));
  check("공개 제품 이름만 겹치면 통과", `${publicNames}가 이런 도구입니다.`, 0);
  check("제품 이름이 들어간 비공개 설명은 차단", privateExplanation, 1);
  check("문서 뒤쪽의 비공개 문장도 차단", sentences.at(-1), 1);
  writeFileSync(join(dist, "sitemap.xml"), "https://example.com/course/hidden");
  check("공개 색인의 비공개 주소는 차단", "공개 소개", 1);
} finally {
  const child = relative(shared, realpathSync(root));
  assert.ok(child.startsWith("leakTest-") && !child.includes(sep));
  rmSync(root, { recursive: true, force: true, maxRetries: 5 });
}
