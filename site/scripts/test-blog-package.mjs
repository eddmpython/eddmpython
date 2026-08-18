import assert from "node:assert/strict";
import {
  h2Sections,
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


const codeSupport = h2Sections(`${body}\n\n#### 코드\n\n\`\`\`text\nnpm test\n\`\`\``);
assert.deepEqual(lintSectionPackages(codeSupport), []);

const explainedCodeSupport = h2Sections(`${body}\n\n#### 예시 코드: 저장소 검사 명령 실행하기\n\n이 명령은 현재 저장소의 자동 검사를 시작합니다. 입력은 작업 폴더의 파일이고, 출력은 터미널에 표시되는 통과 또는 실패 결과입니다. 실패하면 첫 오류가 난 파일과 줄을 먼저 확인합니다. 명령을 바꾸지 않고 다시 실행했을 때 같은 결과가 나오는지도 살펴봅니다.\n\n\`\`\`text\nnpm test\n\`\`\``);
assert.deepEqual(lintSectionPackages(explainedCodeSupport, { requireCodeLabels: true }), []);
assert.ok(
  lintSectionPackages(codeSupport, { requireCodeLabels: true }).some((value) =>
    value.message.includes("자료 역할과 설명할 개념"),
  ),
);

const unexplainedCodeSupport = h2Sections(`${body}\n\n#### 예시 코드: 저장소 검사 명령 실행하기\n\n\`\`\`text\nnpm test\n\`\`\``);
assert.ok(
  lintSectionPackages(unexplainedCodeSupport, { requireCodeLabels: true }).some((value) =>
    value.message.includes("80자 이상 설명"),
  ),
);

const linkPile = h2Sections(`${body}\n\n#### 관련 링크\n\nhttps://example.com`);
assert.ok(lintSectionPackages(linkPile).some((value) => value.message.includes("보조자료 H4")));

// 절당 H3 부제와 이미지를 강제하지 않는다. 그 강제가 40편 278개 절을 같은 네 줄 머리로 만들었다.
const leanSection = `## 5행이 맞는데 90,000원이 없습니다

원본은 세 파일입니다. 손으로 더하면 390,000원인데 프로그램이 만든 결과 파일의 합계는 300,000원이었습니다. 행 수는 5행 그대로라 화면만 보면 성공으로 보입니다.`;
const leanSections = h2Sections(leanSection);
assert.ok(
  lintSectionPackages(leanSections).some((value) => value.message.includes("H3 한 줄 부제")),
);
assert.deepEqual(lintSectionPackages(leanSections, { strictLead: false }), []);

// 한 편 검사에서는 H4 라벨 어휘를 닫지 않는다. 역할과 설명을 나눈 형태만 요구한다.
const freeLabel = h2Sections(
  `${leanSection}\n\n#### 검산 절차: 원본 합계와 결과 합계 맞춰 보기\n\n- 원본에서 금액을 직접 더합니다.\n- 결과 파일의 합계와 나란히 찍어 봅니다.`,
);
assert.ok(lintSectionPackages(freeLabel, { requireCodeLabels: true }).length);
assert.deepEqual(lintSectionPackages(freeLabel, { strictLead: false, openLabels: true }), []);

const vagueRole = h2Sections(`${leanSection}\n\n#### 코드: 병합 실행\n\n\`\`\`text\npython merge.py\n\`\`\``);
assert.ok(
  lintSectionPackages(vagueRole, { strictLead: false, openLabels: true }).some((value) =>
    value.message.includes("역할어"),
  ),
);


// 도입 두 문단 핵심어 강제를 뺐다. 제목과 요약에만 있으면 통과한다.
assert.deepEqual(
  lintSeoPackage(meta, "장면부터 씁니다.\n\n두 번째 문단입니다.\n\n## 저장소 규칙을 파일에 적습니다", sections),
  [],
);

console.log("blog package fixtures: 22 cases");
