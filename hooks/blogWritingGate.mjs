// 블로그 본문은 전역 $blog-writing 을 연 세션에서만 쓴다.
// 그리고 본문을 고쳤으면 그 글의 평가 기록이 같이 바뀌어야 턴이 끝난다.
//
// 왜 있는가. 2026-08-27 에 운영자가 004 를 읽고 지적했다. 첫 문단이
// `매출 CSV 한 장을 받았습니다. 5백만 줄에 160MB입니다. 물어볼 것은 한 줄짜리입니다.`
// 로 시작하는데 누가 준 무슨 매출인지도 없고 `한 줄짜리` 가 무슨 뜻인지도 없다.
// 전역 스킬의 `여러 명이 따로 읽고 다시 고치기` 를 돌렸으면 첫 독자가 반드시 집는 자리다.
// 규칙은 CLAUDE.md 와 .claude/skills/blog-writer 포인터에 이미 있었다.
// 아무도 강제하지 않았을 뿐이다.
//
// 무엇을 막는가.
//   pre   전역 SKILL.md 를 열지 않은 세션이 blog/posts/*/index.md 를 쓰는 것
//   stop  이 세션이 본문을 고쳐 놓고 그 글의 review.json 을 안 만진 채 턴을 끝내는 것
//
// stop 은 세션 시작 때 떠 둔 내용 해시 스냅샷과 지금을 비교한다. 처음에는 세션 시작
// 커밋 기준 diff 를 썼는데, 이전 세션이 커밋 없이 남긴 잔여까지 이 세션의 변경으로
// 오인해서 글쓰기와 무관한 세션이 남의 잔여에 막혔다 (2026-08-27 실측). 물려받은
// 잔여는 이 세션이 막을 일이 아니다. 스냅샷이 없으면 예전처럼 남은 변경 전체를 보되
// 이 세션의 변경인지 가리지 못했다는 사실을 차단 메시지에 밝힌다.
//
// 무엇을 못 막는가. 스킬을 열고도 안 지키는 것과 기록을 형식적으로 채우는 것이다.
// 기록의 내용은 site/scripts/check-blog.mjs 가 구조로 본다. 거기서 앞선 라운드가 집은
// 인용문이 본문에 그대로 남아 있으면 실패한다. 지적하고 안 고친 것을 그렇게 잡는다.
//
// 평가자의 수와 역할 이름을 이 파일에 적지 않는다. 그것은 전역 스킬이 정하고
// 여기에 복사하면 한쪽을 고칠 때 다른 쪽이 조용히 어긋난다.
//
// 모드는 argv 로 받는다. payload 의 이벤트 필드 이름에 기대지 않는다.
//   start  세션이 시작했다. 열람 표시를 지운다
//   post   도구가 끝났다. 스킬을 열었으면 표시를 남긴다
//   pre    도구가 돌기 전이다. 본문을 쓰려 하면 표시를 확인한다
//   stop   턴을 끝내려 한다. 본문과 평가 기록이 같이 바뀌었는지 본다
//
// 판정 규칙은 순수 함수로 빼 두었다. hooks/tests/checkBlogWritingGate.mjs 가 그것을 직접 부른다.
// 훅이 오작동하면 블로그 작업이 통째로 막히므로 검사기 자신을 검사할 수 있어야 한다.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

/** 글 하나가 폴더 하나이고 본문 이름은 index.md 로 고정이다. */
export const ARTICLE = /blog\/posts\/(\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\/index\.md$/;
/** 그 글의 평가 기록. 본문을 만졌으면 이것도 같이 바뀐다. */
export const REVIEW = /blog\/posts\/(\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\/review\.json$/;
/** 운영자가 통과시킨 판본. 이 파일은 사람이 붙어 있는 터미널에서만 만들어진다. */
export const APPROVAL = /blog\/approved\.json$/;
/** 글쓰기 규칙의 유일한 정본. 이 파일을 실제로 연 세션만 본문을 쓴다. */
const SKILL_FILE = /blog-writing[\\/]+SKILL\.md/i;
/** Skill 도구로 부른 것도 연 것으로 본다. blog-writer 는 전역을 가리키는 포인터다. */
const SKILL_NAMES = new Set(["blog-writing", "blog-writer"]);
/** 전역 스킬의 실제 위치. 차단 메시지에서 갈 곳을 정확히 알려 준다. */
export const SKILL_PATH = "C:/Users/MSI/.claude/skills/blog-writing/SKILL.md";

const slash = (value) => String(value ?? "").replace(/\\/g, "/");

/** 이 도구 호출이 전역 스킬을 실제로 열었는가. */
export function skillOpenedBy(toolInput = {}) {
  const texts = [
    toolInput.file_path,
    toolInput.notebook_path,
    toolInput.command,
    toolInput.pattern,
    toolInput.path,
  ].map(slash);
  if (texts.some((text) => SKILL_FILE.test(text))) return true;
  return SKILL_NAMES.has(String(toolInput.skill ?? "").trim());
}

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
  const marker = `${gitDir}/claude-blogwriting-open`;

  // 세션 시작은 stdin 을 기다리지 않는다.
  if (mode === "start") {
    try {
      rmSync(marker, { force: true });
    } catch {
      /* 없으면 지울 것도 없다 */
    }
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

  if (mode === "post") {
    if (skillOpenedBy(toolInput)) {
      try {
        writeFileSync(marker, `${SKILL_PATH}\n`, "utf8");
      } catch {
        // 표시를 못 남기면 다음 쓰기에서 다시 막힌다. 그것이 안전한 쪽이다.
      }
    }
    process.exit(0);
  }

  if (mode === "pre") {
    const target = slash(toolInput.file_path || toolInput.notebook_path);

    // 승인은 사람이 붙어 있는 터미널에서만 만들어진다. 그 결과를 손으로 적으면 문이 아니다.
    if (APPROVAL.test(target)) {
      process.stderr.write(
        "BLOCK: 운영자 승인 파일을 직접 쓰려 한다\n\n" +
          `  ${target}\n\n` +
          "이 파일은 운영자가 글을 읽고 통과시킨 판본의 정본이다.\n" +
          "site/scripts/approve-blog.mjs 만 이 파일을 쓰고, 그 스크립트는\n" +
          "process.stdin.isTTY 가 참일 때만 승인을 받는다. 여기서 값을 적는 것은\n" +
          "그 문을 우회하는 것이고, 우회하면 이 저장소에 승인이라는 것이 없어진다.\n\n" +
          "운영자에게 이렇게 알린다.\n" +
          "  cd site\n" +
          "  npm run approve:blog\n",
      );
      process.exit(2);
    }

    if (!articleOf(target)) process.exit(0);
    if (existsSync(marker)) process.exit(0);
    process.stderr.write(
      "BLOCK: 전역 $blog-writing 을 열지 않고 블로그 본문을 쓰려 한다\n\n" +
        `  ${target}\n\n` +
        "글쓰기 규칙의 정본은 하나다.\n" +
        `  ${SKILL_PATH}\n\n` +
        "그 파일을 끝까지 읽고 다시 쓴다. 절을 세우는 순서, 설명을 푸는 법,\n" +
        "무엇을 빼는지, 그리고 `여러 명이 따로 읽고 다시 고치기` 의 역할과\n" +
        "종료 조건이 전부 거기 있다. 읽고 나면 이 세션 동안 이 차단은 풀린다.\n\n" +
        "2026-08-27 에 004 가 이 차단 없이 나갔다. 첫 문단이 무슨 매출인지도\n" +
        "`한 줄짜리` 가 무슨 뜻인지도 없는 상태로 공개됐다.\n",
    );
    process.exit(2);
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
        "전역 $blog-writing 의 `여러 명이 따로 읽고 다시 고치기` 를 돌리고\n" +
        "그 결과를 같은 폴더의 review.json 에 남긴다. 검사 규칙은\n" +
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
