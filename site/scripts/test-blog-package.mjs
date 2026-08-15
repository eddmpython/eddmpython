import assert from "node:assert/strict";
import {
  h2Sections,
  lintDepthContract,
  lintImageBrief,
  lintImagePolicy,
  lintSectionPackages,
  lintSeoPackage,
  parseSectionPackage,
} from "./blog-package.mjs";

const image =
  '![설정 파일과 테스트 명령이 같은 화면에 보이는 모습](https://example.com/a.webp "규칙 파일과 실제 명령을 함께 확인합니다")';
const body = `AI 저장소 규칙을 어디에 적어야 할지 모르면 새 대화마다 테스트 명령을 다시 설명하게 됩니다.

이 글은 AI 저장소 규칙을 파일에 적고 같은 명령이 실행되는지 확인하는 방법을 보여 줍니다.

## 저장소 규칙을 파일에 적습니다

### CLAUDE.md에 테스트 명령을 적으면 다음 대화도 같은 명령을 실행합니다

${image}

\`CLAUDE.md\`에 \`npm test\`를 적습니다. 새 AI 대화를 열고 같은 명령을 실행하는지 확인합니다. 터미널에 통과 결과가 나오면 규칙이 적용된 것입니다.`;
const sections = h2Sections(body);
const meta = {
  title: "AI 저장소 규칙이 대화마다 달라지는 이유",
  summary: "AI 저장소 규칙을 CLAUDE.md에 적고 새 대화에서 같은 테스트 명령을 실행하는지 확인하는 방법을 설명합니다.",
  primaryKeyword: "AI 저장소 규칙",
  searchIntent: "explanation",
};

assert.equal(sections.length, 1);
assert.deepEqual(lintSeoPackage(meta, body, sections), []);
assert.deepEqual(lintSectionPackages(sections), []);

const parsed = parseSectionPackage(sections[0]);
assert.ok(parsed);
assert.deepEqual(
  lintImageBrief(
    {
      sectionSubtitle: parsed.subtitle,
      contentAnchor: "새 AI 대화를 열고 같은 명령을 실행하는지 확인합니다.",
      visualSubject: "CLAUDE.md 설정 파일과 npm test 명령이 보이는 터미널 화면",
      visualRelationship: "파일에 적은 명령과 다음 대화에서 실행한 명령이 같다",
    },
    sections[0],
    parsed,
  ),
  [],
);

const noHook = lintSeoPackage({ ...meta, title: "AI 저장소 규칙 정리" }, body, sections);
assert.ok(noHook.some((value) => value.location === "title"));

const noSubtitle = h2Sections(body.replace(/^### .+\r?\n\r?\n/m, ""));
assert.ok(lintSectionPackages(noSubtitle).some((value) => value.message.includes("H3 한 줄 부제")));

const listFirst = h2Sections(body.replace(
  "`CLAUDE.md`에 `npm test`를 적습니다. 새 AI 대화를 열고 같은 명령을 실행하는지 확인합니다. 터미널에 통과 결과가 나오면 규칙이 적용된 것입니다.",
  "- CLAUDE.md를 엽니다.\n- npm test를 적습니다.",
));
assert.ok(lintSectionPackages(listFirst).some((value) => value.message.includes("서술형 설명")));

const detachedBrief = lintImageBrief(
  {
    sectionSubtitle: parsed.subtitle,
    contentAnchor: "본문에 없는 주장입니다.",
    visualSubject: "멋진 미래",
    visualRelationship: "좋은 느낌을 준다",
  },
  sections[0],
  parsed,
);
assert.ok(detachedBrief.some((value) => value.message.includes("실제 설명 문단")));
assert.ok(detachedBrief.some((value) => value.message.includes("실제로 그릴 대상")));

assert.deepEqual(
  lintImagePolicy({
    sourceKind: "imagegen",
    visualProfile: "eddmpython-dark-v2",
    palettePolicy: "eddmpython-carbon-ivory-sand-v1",
    prompt: "Tactile graphite objects on a carbon background with one sand accent.",
  }),
  [],
);
assert.ok(
  lintImagePolicy({
    sourceKind: "imagegen",
    visualProfile: "eddmpython-dark-v2",
    palettePolicy: "wrong",
    prompt: "Use blue connectors and green checks.",
  }).some((value) => value.location === "palettePolicy"),
);
assert.ok(
  lintImagePolicy({
    sourceKind: "imagegen",
    visualProfile: "eddmpython-dark-v2",
    palettePolicy: "eddmpython-carbon-ivory-sand-v1",
    prompt: "Use blue connectors and green checks.",
  }).some((value) => value.location === "prompt"),
);

const deepBody = Array.from(
  { length: 6 },
  (_, index) => `## 질문 ${index + 1}\n\n${"독립 원문을 설명하는 쉬운 문장".repeat(80)}`,
).join("\n\n");
const deepSections = h2Sections(deepBody);
assert.deepEqual(
  lintDepthContract({ depthContract: "standalone-deep-v1" }, deepBody, deepSections),
  [],
);
assert.ok(
  lintDepthContract({}, deepBody, deepSections, { required: true }).some(
    (value) => value.location === "depthContract",
  ),
);
assert.ok(
  lintDepthContract(
    { depthContract: "standalone-project-v1" },
    deepBody,
    deepSections,
  ).some((value) => value.location === "H2"),
);

const codeSupport = h2Sections(`${body}\n\n#### 코드\n\n\`\`\`text\nnpm test\n\`\`\``);
assert.deepEqual(lintSectionPackages(codeSupport), []);

const linkPile = h2Sections(`${body}\n\n#### 관련 링크\n\nhttps://example.com`);
assert.ok(lintSectionPackages(linkPile).some((value) => value.message.includes("보조자료 H4")));

console.log("blog package fixtures: 14 cases");
