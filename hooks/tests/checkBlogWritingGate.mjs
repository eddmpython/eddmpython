// blogWritingGate.mjs 의 자기 검사.
//
// 이 훅이 오작동하면 블로그 작업이 통째로 막히거나 반대로 아무것도 안 막는다.
// 둘 다 조용히 일어나므로 양방향으로 검사한다. 막아야 할 것을 막는지와
// 막지 말아야 할 것을 통과시키는지를 같은 수로 본다.
//
// 판정 규칙은 순수 함수로 직접 부르고, 네 모드는 임시 저장소에서 실제로 실행한다.
// 임시 저장소는 공통 실행 공간에 만들고 끝나면 지운다.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { articleOf, missingReviews, skillOpenedBy } from "../blogWritingGate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = resolve(HERE, "..", "blogWritingGate.mjs");
const WORKSPACE = process.env.DEV_WORKSPACE || "C:/Users/MSI/AppData/Local/dev-workspace";
const SANDBOX = join(existsSync(WORKSPACE) ? WORKSPACE : tmpdir(), "blogWritingGate-selftest");

let failed = 0;
function check(name, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    failed += 1;
    console.error(`  FAIL ${name}\n    기대 ${JSON.stringify(expected)}\n    실제 ${JSON.stringify(actual)}`);
  }
}

/* 1. 스킬을 실제로 열었는가 */

// 여는 것으로 보는 것
check("절대경로 슬래시", skillOpenedBy({ file_path: `${WORKSPACE}/../.claude/skills/blog-writing/SKILL.md` }), true);
check("역슬래시 경로", skillOpenedBy({ file_path: "C:\\Users\\MSI\\.claude\\skills\\blog-writing\\SKILL.md" }), true);
check("셸로 읽기", skillOpenedBy({ command: "cat ~/.claude/skills/blog-writing/SKILL.md" }), true);
check("Skill 도구 전역", skillOpenedBy({ skill: "blog-writing" }), true);
check("Skill 도구 포인터", skillOpenedBy({ skill: "blog-writer" }), true);

// 열지 않은 것으로 보는 것
check("포인터 파일만 읽기", skillOpenedBy({ file_path: ".claude/skills/blog-writer/SKILL.md" }), false);
check("참고 자료만 읽기", skillOpenedBy({ file_path: ".claude/skills/blog-writing/references/course-writing.md" }), false);
check("본문 읽기", skillOpenedBy({ file_path: "blog/posts/004-dataframe-libraries/index.md" }), false);
check("무관한 명령", skillOpenedBy({ command: "npm test" }), false);
check("빈 입력", skillOpenedBy({}), false);
check("이름만 비슷한 스킬", skillOpenedBy({ skill: "blog-media" }), false);

/* 2. 이 경로가 블로그 본문인가 */

check("본문 상대경로", articleOf("blog/posts/004-dataframe-libraries/index.md"), "004-dataframe-libraries");
check("본문 절대경로", articleOf("c:/x/y/blog/posts/003-python-qr/index.md"), "003-python-qr");
check("본문 역슬래시", articleOf("blog\\posts\\005-python-history\\index.md"), "005-python-history");

check("이미지 계획", articleOf("blog/posts/004-dataframe-libraries/media.json"), null);
check("글이 품은 도구", articleOf("blog/posts/003-python-qr/tool/index.tsx"), null);
check("사이트 소스", articleOf("site/src/design.ts"), null);
check("순번이 두 자리", articleOf("blog/posts/04-x/index.md"), null);
check("교안 본문", articleOf("../eddmpython-course/curriculum/01-x/index.md"), null);

/* 3. 본문만 바뀌고 기록이 안 바뀐 글 */

check("본문만 바뀜", missingReviews(["blog/posts/004-x/index.md"]), ["004-x"]);
check("둘 다 바뀜", missingReviews(["blog/posts/004-x/index.md", "blog/posts/004-x/review.json"]), []);
check("기록만 바뀜", missingReviews(["blog/posts/004-x/review.json"]), []);
check(
  "여러 글 중 하나만 빠짐",
  missingReviews(["blog/posts/003-a/index.md", "blog/posts/005-b/index.md", "blog/posts/003-a/review.json"]),
  ["005-b"],
);
check("다른 글의 기록", missingReviews(["blog/posts/004-x/index.md", "blog/posts/003-a/review.json"]), ["004-x"]);
check("블로그 밖 변경", missingReviews(["site/src/x.ts", "CLAUDE.md"]), []);
check("변경 없음", missingReviews([]), []);

/* 4. 네 모드를 임시 저장소에서 실제로 실행한다 */

function run(mode, payload) {
  try {
    execFileSync(process.execPath, [GATE, mode], {
      cwd: SANDBOX,
      input: JSON.stringify(payload ?? {}),
      stdio: ["pipe", "pipe", "pipe"],
    });
    return 0;
  } catch (error) {
    return error.status ?? -1;
  }
}

const sh = (command) => execSync(command, { cwd: SANDBOX, stdio: ["ignore", "pipe", "ignore"] });
const article = "blog/posts/004-dataframe-libraries/index.md";
const review = "blog/posts/004-dataframe-libraries/review.json";

rmSync(SANDBOX, { recursive: true, force: true });
mkdirSync(join(SANDBOX, "blog/posts/004-dataframe-libraries"), { recursive: true });
try {
  sh("git init -q");
  sh('git config user.email selftest@local && git config user.name selftest');
  writeFileSync(join(SANDBOX, article), "처음 본문\n", "utf8");
  writeFileSync(join(SANDBOX, review), "{}\n", "utf8");
  sh("git add -A && git commit -q -m base");

  const gitDir = join(SANDBOX, ".git");
  const marker = join(gitDir, "claude-blogwriting-open");
  writeFileSync(join(gitDir, "claude-session-base"), sh("git rev-parse HEAD").toString().trim(), "utf8");

  // 세션이 시작하면 열람 표시가 없다.
  check("start 는 통과한다", run("start"), 0);
  check("start 뒤 표시 없음", existsSync(marker), false);

  // 스킬 없이 본문을 쓰면 막힌다.
  check("스킬 없이 본문 쓰기", run("pre", { tool_input: { file_path: article } }), 2);
  check("스킬 없이 다른 파일 쓰기", run("pre", { tool_input: { file_path: "site/src/x.ts" } }), 0);
  check("스킬 없이 이미지 계획 쓰기", run("pre", { tool_input: { file_path: "blog/posts/004-dataframe-libraries/media.json" } }), 0);

  // 스킬을 열면 표시가 남고 통행이 열린다.
  check("무관한 읽기는 표시 안 남김", run("post", { tool_input: { file_path: "README.md" } }), 0);
  check("무관한 읽기 뒤 여전히 막힘", run("pre", { tool_input: { file_path: article } }), 2);
  check("스킬 읽기", run("post", { tool_input: { file_path: "/c/Users/MSI/.claude/skills/blog-writing/SKILL.md" } }), 0);
  check("스킬 읽은 뒤 표시 남음", existsSync(marker), true);
  check("스킬 읽은 뒤 본문 쓰기", run("pre", { tool_input: { file_path: article } }), 0);

  // 승인 파일은 스킬을 열었든 아니든 쓰기 도구로 못 건드린다.
  check("승인 파일 직접 쓰기", run("pre", { tool_input: { file_path: "blog/approved.json" } }), 2);
  check(
    "승인 파일 절대경로",
    run("pre", { tool_input: { file_path: `${SANDBOX}/blog/approved.json` } }),
    2,
  );
  check("이름만 비슷한 파일", run("pre", { tool_input: { file_path: "blog/approved.json.bak" } }), 0);

  // 다음 세션이 시작하면 표시가 지워진다.
  check("다시 start", run("start"), 0);
  check("start 가 표시를 지움", existsSync(marker), false);
  check("새 세션은 다시 막힘", run("pre", { tool_input: { file_path: article } }), 2);

  // 턴을 끝낼 때 본문과 기록이 같이 바뀌었는지 본다.
  check("변경이 없으면 통과", run("stop", {}), 0);

  writeFileSync(join(SANDBOX, article), "고친 본문\n", "utf8");
  check("본문만 고치고 끝내려 하면 막힘", run("stop", {}), 2);
  check("이미 한 번 막았으면 통과", run("stop", { stop_hook_active: true }), 0);

  writeFileSync(join(SANDBOX, review), '{"version":1}\n', "utf8");
  check("기록도 고치면 통과", run("stop", {}), 0);

  // 새로 만든 글은 아직 추적되지 않는다.
  mkdirSync(join(SANDBOX, "blog/posts/006-new-post"), { recursive: true });
  writeFileSync(join(SANDBOX, "blog/posts/006-new-post/index.md"), "새 글\n", "utf8");
  check("추적 안 된 새 글도 잡힘", run("stop", {}), 2);
  writeFileSync(join(SANDBOX, "blog/posts/006-new-post/review.json"), '{"version":1}\n', "utf8");
  check("새 글도 기록이 있으면 통과", run("stop", {}), 0);
} finally {
  rmSync(SANDBOX, { recursive: true, force: true });
}

if (failed) {
  console.error(`\nblogWritingGate 자기 검사 ${failed}건 실패`);
  process.exit(1);
}
console.log("blogWritingGate 자기 검사 통과");
