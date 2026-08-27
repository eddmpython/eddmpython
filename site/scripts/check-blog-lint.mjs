/*
 * 글마다 hanlint 가 세는 결함이 없는지 본다.
 *
 * 왜 있는가. 전역 규칙과 전역 $blog-writing 은 한국어 산문을 발행이나 평가 앞에서 hanlint error 0
 * 으로 만들라고 정해 두었다. 그런데 이 저장소의 기계는 그것을 아무도 보지 않았다. 스킬을 열지
 * 않고 본문을 쓰는 것은 hooks/blogWritingGate.mjs 가 막고, 평가 기록 없이 나가는 것은
 * check-blog-review.mjs 가 막는데, 정작 세어서 잡히는 결함은 손으로 돌릴 때만 걸렸다.
 *
 * 2026-08-27 에 001 과 003 과 005 를 다듬으면서 그 값이 실측으로 드러났다. 003 에 error 7 건,
 * 005 에 5 건이 있었고 그중에는 `핵심은 아래 세 줄` 처럼 코드가 위에 있는데 아래라고 가리키는
 * 위치 오류도 있었다. 더 중요한 것은 고치는 동안이다. 평가자 지적을 반영하다 문단을 나누고
 * 지시어를 바꾸고 문장을 이어 붙이면서 새 error 를 네 번 만들었고 매번 hanlint 가 잡았다.
 * 사람의 평가는 라운드마다 다른 것을 보지만 이 검사는 같은 글에 같은 답을 낸다.
 *
 * 판정은 hanlint 가 하고 이 파일은 어느 글을 넣을지와 무엇을 실패로 볼지만 정한다. 규칙과 임계는
 * 그 저장소가 소유하므로 여기에 복사하지 않는다. 버전은 package.json 에 정확히 고정한다.
 * 새 판이 새 규칙을 들고 오면 그 판으로 올리는 작업에서 글을 함께 고친다.
 *
 * 순수 함수 lintProblems 를 test-blog-lint.mjs 가 직접 부른다.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintText, version } from "hanlint";

const here = dirname(fileURLToPath(import.meta.url));
const postsDir = join(here, "..", "..", "blog", "posts");

/** 글 하나가 폴더 하나이고 본문 이름은 index.md 로 고정이다. */
export const bodyName = "index.md";

/**
 * 본문 하나를 검사해 문제를 배열로 준다. 빈 배열이면 통과다.
 *
 * notice 는 판단이 필요한 자리라 게이트가 강제하지 않는다. 전역 스킬이 정한 것도 error 0 이고,
 * notice 는 글쓴이가 마지막에 읽고 고를 몫이다. 여기서 notice 까지 막으면 글을 규칙에 맞추려고
 * 사실과 실행 단계를 자르게 된다.
 *
 * @param {string} body   글 본문
 * @param {string} label  실패 메시지에 쓸 이름
 */
export function lintProblems(body, label) {
  return lintText(body)
    .filter((finding) => finding.severity === "error")
    .map((finding) => `${label}:${finding.line} [${finding.rule}] ${finding.why}`);
}

async function main() {
  const entries = await readdir(postsDir, { withFileTypes: true });
  const posts = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const problems = [];
  for (const post of posts) {
    const path = join(postsDir, post, bodyName);
    let body;
    try {
      body = await readFile(path, "utf8");
    } catch {
      continue;
    }
    problems.push(...lintProblems(body, `blog/posts/${post}/${bodyName}`));
  }
  if (problems.length) {
    console.error(`hanlint ${version} 이 error ${problems.length} 건을 집었습니다.\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      "\n고치는 법은 npx hanlint <글> 로 인용과 함께 보고, 규칙이 왜 있는지는 npx hanlint explain <규칙> 이 답합니다." +
        "\n규칙이 맞지만 그 자리만 예외면 hanlint-disable 주석을 쓰고 왜 예외인지 함께 남깁니다.",
    );
    process.exit(1);
  }
  console.log(`hanlint ${version}: 글 ${posts.length} 편 error 0`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  await main();
}
