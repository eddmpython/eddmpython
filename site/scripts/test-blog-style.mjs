import assert from "node:assert/strict";
import { lintBlogStyle } from "./blog-style.mjs";

const concrete = lintBlogStyle({
  fields: {
    summary: "설정 파일에 테스트 명령을 적고 새 세션에서 같은 명령이 실행되는지 확인합니다.",
  },
  body: "## 같은 명령을 실행합니다\n\n`CLAUDE.md`에 `npm test`를 적습니다. 새 세션에서 명령을 실행해 통과하는지 확인합니다.",
  sections: [
    {
      heading: "같은 명령을 실행합니다",
      content: "`CLAUDE.md`에 `npm test`를 적습니다. 새 세션에서 명령을 실행해 통과하는지 확인합니다.",
    },
  ],
});
assert.deepEqual(concrete, []);

const filler = lintBlogStyle({
  body: "이를 통해 새로운 가능성을 만들 수 있습니다.",
});
assert.ok(filler.some((issue) => issue.message.includes("빈 관용구")));

const abstract = lintBlogStyle({
  body: "환경과 구조와 흐름은 판단의 기반이 됩니다.",
});
assert.ok(abstract.some((issue) => issue.message.includes("추상어")));

const vagueSection = lintBlogStyle({
  body: "## 핵심 구조\n\n좋은 환경은 더 나은 경험을 만듭니다.",
  sections: [{ heading: "핵심 구조", content: "좋은 환경은 더 나은 경험을 만듭니다." }],
});
assert.ok(vagueSection.some((issue) => issue.location === "H2 핵심 구조"));
assert.ok(vagueSection.some((issue) => issue.message.includes("실제 예")));

const metaphor = lintBlogStyle({
  body: "작업장은 갈림길을 지나 새로운 길을 엽니다.",
});
assert.ok(metaphor.some((issue) => issue.message.includes("비유")));

const codeExample = lintBlogStyle({
  body: "```text\n이를 통해 새로운 가능성을 만듭니다.\n```",
});
assert.deepEqual(codeExample, []);

console.log("blog style fixtures: 6 cases");
