/*
 * 블로그 글은 운영자가 통과시킨 판본만 배포된다.
 *
 * 왜 있는가. 2026-08-27 에 004 가 첫 문단이 안 읽히는 상태로 공개됐다. 검사기는 파일 계약만
 * 보고 통과시켰고 사람이 읽는 단계가 배포 경로 어디에도 없었다.
 *
 * 승인의 길은 둘이다 (approve-blog.mjs).
 *   1. 대화형: 사람이 붙어 있는 터미널에서 글을 하나씩 보고 y 를 받는다 (isTTY 필수)
 *   2. 대화 승인 기록: 운영자가 AI 와의 대화에서 명시적으로 승인하면 AI 가 그 문구를
 *      `--from-chat` 으로 그대로 실어 기록한다. 2026-08-31 운영자 결정으로 열었다.
 *      처음(2026-08-27)에는 TTY 하나로 좁혔지만, 운영자가 대화에서 승인해도 터미널로
 *      한 번 더 가야 하는 왕복이 실익 없이 남아서 걷어냈다
 *
 * 2번 길의 강제는 기계가 아니라 규칙이다. AI 는 운영자가 이번 대화에서 실제로 승인을 말한
 * 경우에만, 그 문구를 원문 그대로 실어 돌린다. 추정 승인과 앞선 세션 승인의 재사용은 금지다.
 * 문구가 approved.json 에 남으므로 통과 근거를 항상 되짚을 수 있다.
 *
 * approved.json 을 쓰기 도구로 직접 적는 것은 여전히 hooks/blogWritingGate.mjs 가 막는다.
 * 이 파일을 쓰는 코드는 approve-blog.mjs 하나다.
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
