/*
 * 블로그 글은 운영자가 직접 읽고 통과시킨 판본만 배포된다.
 *
 * 왜 있는가. 2026-08-27 에 004 가 첫 문단이 안 읽히는 상태로 공개됐다. 검사기는 파일 계약만
 * 보고 통과시켰고 사람이 읽는 단계가 배포 경로 어디에도 없었다.
 *
 * 왜 이 모양인가. 승인을 파일의 `approved: true` 같은 값으로 두면 AI 가 그 값을 적으면 그만이라
 * 강제가 아니다. 그래서 승인의 문을 하나로 좁혔다. **사람이 붙어 있는 터미널** 이다.
 * approve-blog.mjs 는 process.stdin.isTTY 가 참일 때만 승인을 받는다. AI 의 셸 도구는 stdin 이
 * null device 라 TTY 가 없고, 그래서 그 스크립트를 아무리 돌려도 승인이 만들어지지 않는다.
 *
 * 남는 구멍은 하나다. approved.json 을 손으로 쓰는 것이다. hooks/blogWritingGate.mjs 가
 * 그 파일을 쓰기 도구로 건드리는 것을 막는다. 그것까지 우회하려면 의도적으로 우회해야 한다.
 * 무의식적으로 미끄러지는 것과 작정하고 뚫는 것을 가르는 것이 이 설계의 목표다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

export const postsDir = join(REPO, "blog", "posts");
/** 운영자가 통과시킨 판본의 정본. 이 파일은 approve-blog.mjs 만 쓴다. */
export const approvalPath = join(REPO, "blog", "approved.json");
export const approvalLabel = "blog/approved.json";
const articleName = "index.md";
const postFolder = /^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 지금 저장소에 있는 글 폴더. 폴더 하나가 글 하나다. */
export function listPosts() {
  if (!existsSync(postsDir)) return [];
  return readdirSync(postsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && postFolder.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(postsDir, name, articleName)))
    .sort();
}

/** 이 글 본문의 지금 내용. 줄바꿈을 맞춰 윈도우와 리눅스에서 같은 값이 나오게 한다. */
export function articleHash(post) {
  const raw = readFileSync(join(postsDir, post, articleName), "utf8").replace(/\r\n/g, "\n");
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** 글 제목. 승인 화면에서 무엇을 통과시키는지 보여 준다. */
export function articleTitle(post) {
  const raw = readFileSync(join(postsDir, post, articleName), "utf8");
  return raw.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? post;
}

export function readApprovals() {
  if (!existsSync(approvalPath)) return { version: 1, posts: {} };
  try {
    const parsed = JSON.parse(readFileSync(approvalPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.posts !== "object") {
      return { version: 1, posts: {} };
    }
    return { version: 1, posts: parsed.posts };
  } catch {
    return { version: 1, posts: {} };
  }
}

/**
 * 지금 배포하면 안 되는 글을 고른다.
 *
 * new      한 번도 통과한 적 없는 글
 * changed  통과한 뒤 본문이 바뀐 글
 */
export function pendingPosts() {
  const approvals = readApprovals().posts;
  const pending = [];
  for (const post of listPosts()) {
    const now = articleHash(post);
    const seen = approvals[post];
    if (!seen) pending.push({ post, state: "new", now });
    else if (seen.sha256 !== now) pending.push({ post, state: "changed", now, was: seen });
  }
  return pending;
}
