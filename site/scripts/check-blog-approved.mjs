/*
 * 배포 직전 관문이다. 운영자가 통과시킨 판본만 나간다.
 *
 * npm run deploy 가 부른다. 통과 안 한 글이나 통과 뒤에 바뀐 글이 하나라도 있으면
 * 배포를 세운다. 이 검사는 글의 좋고 나쁨을 보지 않는다. 사람이 그 판본을 실제로 봤는지만 본다.
 *
 * 통과는 blog/approved.json 에 남고 그 파일은 approve-blog.mjs 만 쓴다. 그리고 그 스크립트는
 * 사람이 붙어 있는 터미널에서만 돈다. 자세한 것은 blog-approval.mjs 의 머리말에 있다.
 */
import { articleTitle, pendingPosts } from "./blog-approval.mjs";

const pending = pendingPosts();
if (!pending.length) {
  console.log("blog approval: 모든 글이 승인된 판본입니다");
  process.exit(0);
}

console.error("배포를 세웁니다. 운영자가 통과시키지 않은 글이 있습니다.");
console.error("");
for (const item of pending) {
  const label = item.state === "new" ? "한 번도 통과한 적 없음" : "통과 뒤에 본문이 바뀜";
  console.error(`  ${item.post}  ${label}`);
  console.error(`    ${articleTitle(item.post)}`);
  if (item.state === "changed") {
    console.error(`    통과한 판본 ${item.was.sha256.slice(0, 12)} (${item.was.at})`);
    console.error(`    지금 판본   ${item.now.slice(0, 12)}`);
  }
}
console.error("");
console.error("운영자가 직접 터미널을 열고 글을 읽은 뒤 통과시킵니다.");
console.error("  cd site");
console.error("  npm run approve:blog");
console.error("");
console.error("이 관문은 AI 가 넘을 수 없습니다. 승인은 TTY 가 있는 터미널에서만 만들어집니다.");
process.exit(1);
