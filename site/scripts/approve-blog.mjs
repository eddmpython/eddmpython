/*
 * 운영자가 글을 읽고 통과시킨다. 사람이 붙어 있는 터미널에서만 돈다.
 *
 * 쓰는 법
 *   cd site
 *   npm run approve:blog
 *
 * 통과시킬 글을 하나씩 보여 주고 y 를 받는다. 그 자리에서 통과한 판본의 해시가
 * blog/approved.json 에 남고, 배포는 그 판본만 내보낸다. 통과 뒤에 본문이 한 글자라도
 * 바뀌면 다시 물어본다.
 *
 * 왜 AI 가 이것을 대신 못 하는가. 아래 isTTY 검사 하나 때문이다. AI 의 셸 도구는 stdin 이
 * null device 라 TTY 가 없다. 이 스크립트는 그 자리에서 멈추고 승인을 만들지 않는다.
 */
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import {
  approvalLabel,
  approvalPath,
  articleTitle,
  pendingPosts,
  readApprovals,
} from "./blog-approval.mjs";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("승인은 사람이 붙어 있는 터미널에서만 받습니다.");
  console.error("");
  console.error("지금 stdin 이나 stdout 에 TTY 가 없습니다. 스크립트나 CI 나 에이전트의 셸에서는");
  console.error("승인이 만들어지지 않습니다. 그것이 이 문의 목적입니다.");
  console.error("");
  console.error("운영자가 직접 터미널을 열고 아래를 실행합니다.");
  console.error("  cd site");
  console.error("  npm run approve:blog");
  process.exit(1);
}

const pending = pendingPosts();
if (!pending.length) {
  console.log("통과시킬 글이 없습니다. 지금 있는 글은 전부 승인된 판본입니다.");
  process.exit(0);
}

console.log(`통과를 기다리는 글 ${pending.length} 편`);
console.log("");
console.log("읽고 나서 통과시킵니다. 화면으로 보려면 다른 터미널에서 이렇게 봅니다.");
console.log("  cd site && npm run dev          로컬에서 열기");
console.log("  cd site && npm run blog:shot    데스크톱과 모바일 폭으로 렌더");
console.log("");

const approvals = readApprovals();
const rl = createInterface({ input: process.stdin, output: process.stdout });
let approved = 0;

try {
  for (const item of pending) {
    const label = item.state === "new" ? "새 글" : "통과 뒤에 바뀐 글";
    console.log(`  [${label}] ${item.post}`);
    console.log(`  ${articleTitle(item.post)}`);
    console.log(`  blog/posts/${item.post}/index.md`);
    if (item.state === "changed") {
      console.log(`  앞서 통과한 판본 ${item.was.sha256.slice(0, 12)} (${item.was.at})`);
      console.log(`  cd site && git diff -- ../blog/posts/${item.post}/index.md`);
    }
    const answer = (await rl.question("  이 판본을 배포해도 됩니까? [y/N] ")).trim().toLowerCase();
    console.log("");
    if (answer !== "y" && answer !== "yes") continue;
    approvals.posts[item.post] = {
      sha256: item.now,
      at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      title: articleTitle(item.post),
    };
    approved += 1;
  }
} finally {
  rl.close();
}

if (!approved) {
  console.log("통과시킨 글이 없습니다. blog/approved.json 은 그대로입니다.");
  process.exit(0);
}

const ordered = Object.fromEntries(Object.entries(approvals.posts).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(approvalPath, `${JSON.stringify({ version: 1, posts: ordered }, null, 2)}\n`, "utf8");
console.log(`${approved} 편을 통과시켰습니다. ${approvalLabel} 에 적었습니다.`);
console.log("이 파일을 커밋하면 그 판본이 배포됩니다.");
