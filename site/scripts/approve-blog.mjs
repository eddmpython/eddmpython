/*
 * 운영자가 글을 통과시킨다. 승인의 길은 둘이고 결과는 같은 blog/approved.json 이다.
 *
 * 1. 대화형 (기본): 사람이 붙어 있는 터미널에서 글을 하나씩 보고 y 를 받는다.
 *      cd site && npm run approve:blog
 * 2. 대화 승인 기록: 운영자가 AI 와의 대화에서 명시적으로 승인했을 때, AI 가 그 문구를
 *    그대로 실어 기록을 남긴다. 2026-08-31 운영자 결정이다 ("내가 승인하면 그냥 하는걸로").
 *      npm run approve:blog -- --from-chat "운영자 승인 문구 원문"
 *
 * --from-chat 은 운영자가 이번 대화에서 실제로 승인을 말한 경우에만 쓴다. AI 가 승인을
 * 추정하거나 앞선 세션의 승인을 재사용하는 것은 금지다. 문구가 기록에 그대로 남으므로
 * 무엇을 근거로 통과시켰는지 blog/approved.json 에서 항상 되짚을 수 있다.
 *
 * 통과 뒤 본문이 한 글자라도 바뀌면 그 글은 다시 pending 이 된다.
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

const fromChatAt = process.argv.indexOf("--from-chat");
const fromChat = fromChatAt >= 0 ? (process.argv[fromChatAt + 1] ?? "").trim() : null;
if (fromChatAt >= 0 && !fromChat) {
  console.error("--from-chat 에는 운영자의 승인 문구 원문이 필요합니다.");
  console.error('  npm run approve:blog -- --from-chat "승인한다"');
  process.exit(1);
}

if (fromChat === null && (!process.stdin.isTTY || !process.stdout.isTTY)) {
  console.error("대화형 승인은 사람이 붙어 있는 터미널에서만 받습니다.");
  console.error("");
  console.error("운영자가 직접 터미널에서 실행하거나,");
  console.error("  cd site");
  console.error("  npm run approve:blog");
  console.error("");
  console.error("운영자가 대화에서 승인을 말했다면 그 문구를 그대로 실어 기록합니다.");
  console.error('  npm run approve:blog -- --from-chat "운영자 승인 문구 원문"');
  process.exit(1);
}

const pending = pendingPosts();
if (!pending.length) {
  console.log("통과시킬 글이 없습니다. 지금 있는 글은 전부 승인된 판본입니다.");
  process.exit(0);
}

if (fromChat !== null) {
  const approvals = readApprovals();
  const at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  for (const item of pending) {
    approvals.posts[item.post] = {
      sha256: item.now,
      at,
      title: articleTitle(item.post),
      via: "chat",
      quote: fromChat,
    };
    console.log(`  통과  ${item.post}  ${articleTitle(item.post)}`);
  }
  const ordered = Object.fromEntries(Object.entries(approvals.posts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(approvalPath, `${JSON.stringify({ version: 1, posts: ordered }, null, 2)}\n`, "utf8");
  console.log("");
  console.log(`${pending.length} 편을 대화 승인으로 통과시켰습니다. ${approvalLabel} 에 승인 문구까지 적었습니다.`);
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
