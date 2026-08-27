/*
 * check-blog-lint.mjs 의 자기 검사.
 *
 * 이 게이트가 헐거우면 세어서 잡히는 결함이 그대로 발행되고, 빡빡하면 판단이 필요한 자리까지
 * 막아 글쓴이가 사실과 실행 단계를 자르게 된다. 통과해야 할 것과 막아야 할 것을 함께 본다.
 *
 * 규칙 자체의 이빨은 hanlint 저장소의 fixture 가 증명한다. 여기서 보는 것은 이 게이트가
 * error 와 notice 를 가르는가, 그리고 실제 문장에 물리는가 둘이다.
 */
import { lintProblems } from "./check-blog-lint.mjs";

let failed = 0;

function pass(name, body) {
  const problems = lintProblems(body, "글.md");
  if (problems.length) {
    failed += 1;
    console.error(`  FAIL ${name}\n    통과해야 하는데 막았습니다: ${problems.join(" / ")}`);
  }
}

function block(name, body, hint) {
  const problems = lintProblems(body, "글.md");
  if (!problems.length) {
    failed += 1;
    console.error(`  FAIL ${name}\n    막아야 하는데 통과시켰습니다`);
    return;
  }
  if (hint && !problems.some((problem) => problem.includes(hint))) {
    failed += 1;
    console.error(
      `  FAIL ${name}\n    막긴 했는데 이유가 다릅니다\n    기대한 규칙 ${hint}\n    실제 ${problems.join(" / ")}`,
    );
  }
}

/* 통과해야 하는 것 */

pass("결함 없는 글", "## 파일 열기\n\n엑셀 파일을 엽니다. 그러면 표가 어디에 생길까요? 작업 폴더에 `report.csv` 로 생깁니다.\n");
// notice 는 판단이 필요한 자리라 막지 않는다. 세 문장에 인과 표지가 없으면 factListParagraph 가 notice 로 나온다.
pass(
  "notice 만 있는 글",
  "## 값 넣기\n\n첫 칸에 100을 넣습니다. 둘째 칸에 200을 넣습니다. 셋째 칸에 300을 넣습니다.\n",
);

/* 막아야 하는 것 */

block("상투어", "## 절\n\n핵심은 속도입니다. 파일이 빨리 열립니다.\n", "cliche");
block(
  "번역투",
  "## 절\n\n모든 분야에 있어서 기준이 필요합니다. 그래서 먼저 정합니다.\n",
  "translationese",
);
block(
  "앞 문장에 없는 지시어",
  "## 절\n\n```python\nx = 1\n```\n\n이것을 실행하면 값이 찍힙니다. 그래서 확인합니다.\n",
  "danglingDeixis",
);
// 이 저장소가 실제로 겪은 자리다. 003 의 절 제목 다섯 중 넷이 기 로 끝나 목차가 나열로 읽혔다.
block(
  "절 제목이 한 어미로 끝남",
  "## 파일 열기\n\n가.\n\n## 값 넣기\n\n나.\n\n## 결과 보기\n\n다.\n\n## 저장하기\n\n라.\n",
  "headingUniform",
);

if (failed) {
  console.error(`\nblog lint 자기 검사 ${failed}건 실패`);
  process.exit(1);
}
console.log("blog lint 자기 검사 통과");
