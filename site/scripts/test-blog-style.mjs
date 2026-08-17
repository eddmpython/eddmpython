import assert from "node:assert/strict";
import { lintBlogStyle, lintProseTexture } from "./blog-style.mjs";

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

const serialLink = lintBlogStyle({
  body: "다음 글에서는 파일 경로를 설명합니다.",
});
assert.ok(serialLink.some((issue) => issue.message.includes("한 편만 읽어도")));

// v2 계약은 숫자 하나를 구체 앵커로 인정하지 않는다. 이 면제 때문에 추상어 검사가
// 발행 40편 1,751개 블록에서 한 번도 발동하지 않았다.
const digitOnlyAnchor = "환경과 구조와 흐름은 3가지 관점으로 나뉩니다.";
assert.deepEqual(lintBlogStyle({ body: digitOnlyAnchor }), []);
assert.ok(
  lintBlogStyle({ body: digitOnlyAnchor, strictAnchor: true }).some((issue) =>
    issue.message.includes("추상어"),
  ),
);

const uniformRhythm = Array.from(
  { length: 8 },
  (_, index) =>
    `${index + 1}번 파일을 읽고 금액 열을 숫자로 바꾼 뒤 결과를 저장하면 행 수는 그대로 유지되고 합계만 달라집니다.`,
).join("\n\n");
assert.ok(
  lintProseTexture(uniformRhythm).some((issue) => issue.message.includes("문단 길이가 너무 고릅니다")),
);

const variedRhythm = [
  "합계만 390,000원에서 300,000원이 되어 있었습니다.",
  "사라진 90,000원은 관리팀 파일의 셀 하나였습니다. 금액 열에 90,000원이라고 적혀 있었고 그것은 숫자가 아니라 글자였습니다. 프로그램은 숫자로 바꾸지 못한 값을 0으로 채웠고 오류 메시지는 나오지 않았습니다.",
  "3과 5. 둘 다 맞습니다.",
  "여기서 멈추면 자동화가 끝난 것처럼 보입니다. 행 수는 몇 개를 읽었는지만 알려 주고 각 행이 무엇을 담고 있는지는 알려 주지 않기 때문입니다.",
  "그래서 검사를 하나 더 붙입니다.",
  "원본 파일에서 금액을 직접 더한 값과 결과 파일의 합계를 나란히 찍어 보면 90,000원 차이가 어느 파일의 어느 행에서 났는지까지 한 번에 나옵니다. 검사 한 줄이 늘었을 뿐인데 결과 파일을 믿을 수 있는지가 달라집니다.",
  "확인필요가 3행에서 2행으로 바뀌었습니다.",
].join("\n\n");
assert.deepEqual(lintProseTexture(variedRhythm), []);

// 용어집 순회로 쓴 글의 뚜렷한 신호는 문단이 정의로 열리는 비율이다.
const glossary = [
  "합계만 390,000원에서 300,000원이 되어 있었습니다.",
  "입력은 업무를 시작할 때 컴퓨터가 받는 자료입니다. 어느 폴더의 몇 개 파일인지 함께 적어야 합니다.",
  "처리는 자료의 모양을 바꾸는 순서입니다. 열을 고르고 표를 위아래로 이어 붙이는 동작이 여기 들어갑니다.",
  "판단은 값에 따라 결과를 나누는 규칙입니다.",
  "원본 파일에서 금액을 직접 더한 값과 결과 파일의 합계를 나란히 찍어 보면 차이가 어느 파일의 어느 행에서 났는지까지 한 번에 나옵니다.",
  "확인필요가 3행에서 2행으로 바뀌었습니다.",
].join("\n\n");
assert.ok(lintProseTexture(glossary).some((issue) => issue.message.includes("정의로 여는 문단")));

console.log("blog style fixtures: 12 cases");
