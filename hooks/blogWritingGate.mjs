// 본문 변경의 검토 기록과 운영자 승인 파일을 보호한다.
// 글쓰기 스킬 열람 요구는 운영자 지시로 제거했다.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** 글 하나가 폴더 하나이고 본문 이름은 index.md 로 고정이다. */
export const ARTICLE = /blog\/posts\/(\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\/index\.md$/;
/** 그 글의 평가 기록. 본문을 만졌으면 이것도 같이 바뀐다. */
export const REVIEW = /blog\/posts\/(\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\/review\.json$/;
/** 운영자가 통과시킨 판본. 이 파일은 사람이 붙어 있는 터미널에서만 만들어진다. */
export const APPROVAL = /blog\/approved\.json$/;
const slash = (value) => String(value ?? "").replace(/\\/g, "/");

/** 이 경로가 블로그 본문이면 글 폴더 이름을, 아니면 null 을 준다. */
export function articleOf(path) {
  return slash(path).match(ARTICLE)?.[1] ?? null;
}

/** 본문은 바뀌었는데 평가 기록이 안 바뀐 글을 고른다. */
export function missingReviews(changedFiles = []) {
  const touched = new Set();
  const reviewed = new Set();
  for (const raw of changedFiles) {
    const file = slash(raw);
    const article = file.match(ARTICLE);
    if (article) {
      touched.add(article[1]);
      continue;
    }
    const review = file.match(REVIEW);
    if (review) reviewed.add(review[1]);
  }
  return [...touched].filter((post) => !reviewed.has(post)).sort();
}

function git(args) {
  try {
    return execSync(`git -c core.quotepath=false ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 40 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

/** 세션 시작 때 뜬 본문과 기록의 내용 해시. stop 이 이것과 지금을 비교한다. */
const SNAPSHOT = "claude-blogwriting-session-files";

/** 지금 작업 트리에 실제로 있는 본문과 평가 기록 경로. 추적 여부는 가리지 않는다. */
function articleAndReviewFiles() {
  return git(
    'ls-files --cached --others --exclude-standard -- "blog/posts/*/index.md" "blog/posts/*/review.json"',
  )
    .split("\n")
    .map((line) => slash(line.trim().replace(/^"|"$/g, "")))
    .filter(Boolean)
    .filter((file) => existsSync(file));
}

/** 파일들의 git 내용 해시. 목록이 비면 빈 객체다. */
function contentHashes(files) {
  if (!files.length) return {};
  const lines = git(`hash-object -- ${files.map((file) => `"${file}"`).join(" ")}`)
    .split("\n")
    .filter(Boolean);
  const hashes = {};
  files.forEach((file, index) => {
    if (lines[index]) hashes[file] = lines[index];
  });
  return hashes;
}

/** 스냅샷과 견주어 이 세션 동안 내용이 실제로 바뀐 파일. 스냅샷에 없던 새 파일도 바뀐 것이다. */
export function changedByHashes(base = {}, current = {}) {
  return Object.keys(current)
    .filter((file) => base[file] !== current[file])
    .sort();
}

/** 세션 시작 지점부터 지금 작업 트리까지 바뀐 파일. 스냅샷이 없을 때만 쓰는 예전 방식이다. */
function changedSinceSessionStart(gitDir) {
  const baseFile = `${gitDir}/claude-session-base`;
  const base = existsSync(baseFile) ? readFileSync(baseFile, "utf8").trim() : "";
  return [
    ...git(base ? `diff --name-only ${base}` : "diff --name-only HEAD").split("\n"),
    // 새로 만든 글은 아직 추적되지 않는다.
    ...git("ls-files --others --exclude-standard").split("\n"),
  ]
    .map((line) => slash(line.trim().replace(/^"|"$/g, "")))
    .filter(Boolean);
}

function readPayload() {
  return new Promise((resolve) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(input || "{}"));
      } catch {
        // 입력을 못 읽으면 막지 않는다. 이것은 검사기가 아니라 통행로다.
        resolve({});
      }
    });
  });
}

async function main(mode) {
  const gitDir = git("rev-parse --absolute-git-dir").trim();
  // 이 저장소가 아니면 아무것도 하지 않는다.
  if (!gitDir) process.exit(0);

  // 세션 시작은 stdin 을 기다리지 않는다.
  if (mode === "start") {
    // 이 시점의 본문과 기록 내용을 떠 둔다. 이전 세션이 남긴 잔여와 이 세션의
    // 변경을 stop 에서 가르는 기준이다.
    try {
      writeFileSync(
        `${gitDir}/${SNAPSHOT}`,
        JSON.stringify(contentHashes(articleAndReviewFiles())),
        "utf8",
      );
    } catch {
      /* 스냅샷을 못 뜨면 stop 이 남은 변경 전체를 본다. 그쪽이 안전한 쪽이다. */
    }
    process.exit(0);
  }

  const payload = await readPayload();
  const toolInput = payload.tool_input || {};

  if (mode === "pre") {
    const target = slash(toolInput.file_path || toolInput.notebook_path);

    // 승인 기록은 approve-blog.mjs 만 쓴다. 그 결과를 손으로 적으면 승인이라는 것이 없어진다.
    if (APPROVAL.test(target)) {
      process.stderr.write(
        "BLOCK: 운영자 승인 파일을 직접 쓰려 한다\n\n" +
          `  ${target}\n\n` +
          "이 파일은 운영자가 통과시킨 판본의 정본이고 site/scripts/approve-blog.mjs 만 쓴다.\n" +
          "운영자가 터미널에서 직접 승인하거나 (cd site && npm run approve:blog),\n" +
          "운영자가 이번 대화에서 명시적으로 승인했다면 그 문구를 그대로 실어 기록한다.\n" +
          '  npm run approve:blog -- --from-chat "운영자 승인 문구 원문"\n\n' +
          "여기서 값을 직접 적는 것은 어느 길도 아니다.\n",
      );
      process.exit(2);
    }

    process.exit(0);
  }

  if (mode === "stop") {
    // 한 번 막았으면 통과시킨다. 같은 이유로 무한히 붙잡지 않는다.
    if (payload.stop_hook_active) process.exit(0);
    const snapshotFile = `${gitDir}/${SNAPSHOT}`;
    let base = null;
    if (existsSync(snapshotFile)) {
      try {
        base = JSON.parse(readFileSync(snapshotFile, "utf8"));
      } catch {
        base = null;
      }
    }
    const changed = base
      ? changedByHashes(base, contentHashes(articleAndReviewFiles()))
      : changedSinceSessionStart(gitDir);
    const missing = missingReviews(changed);
    if (!missing.length) process.exit(0);
    const head = base
      ? "BLOCK: 이 세션에서 본문을 고쳐 놓고 평가 기록을 안 남기고 끝내려 한다\n\n"
      : "BLOCK: 작업 트리에 평가 기록 없는 본문 변경이 남아 있다\n" +
        "(세션 시작 스냅샷이 없어 이 세션의 변경인지 가리지 못했다. 이전 세션이 남긴 잔여일 수 있다)\n\n";
    process.stderr.write(
      head +
        missing
          .map((post) => `  blog/posts/${post}/index.md 가 바뀌었는데 review.json 이 그대로다`)
          .join("\n") +
        "\n\n" +
        "변경 내용을 검토하고 같은 폴더의 review.json 에 남긴다. 검사 규칙은\n" +
        "site/scripts/check-blog.mjs 에 있고 형식은 이렇다.\n\n" +
        '  { "version": 1, "rounds": [ { "reviewers": [\n' +
        '      { "role": "<역할>", "findings": [ { "quote": "", "why": "", "fix": "" } ] }\n' +
        "  ] } ] }\n\n" +
        "오타 하나를 고친 것이라면 라운드를 더하지 말고 edits 에 무엇을 고쳤는지 적는다.\n" +
        "본문을 만졌으면 기록이 남는다는 것이 이 차단의 전부다.\n",
    );
    process.exit(2);
  }

  process.exit(0);
}

const MODE = process.argv[2] || "";
// import 로 불린 경우에는 아무것도 실행하지 않는다. 자기 검사가 순수 함수만 가져간다.
if (MODE) await main(MODE);
