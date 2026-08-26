import assert from "node:assert/strict";
import {
  h2Sections,
  lintImageBrief,
  lintImagePolicy,
  parseSectionParts,
} from "./blog-media-package.mjs";

const body = `## 저장소 규칙을 파일에 적습니다

### CLAUDE.md에 테스트 명령을 적습니다

![설정 파일과 테스트 명령이 같은 화면에 보이는 모습](https://example.com/a.webp "규칙 파일과 실제 명령을 함께 확인합니다")

\`CLAUDE.md\`에 \`npm test\`를 적고 새 대화에서 같은 명령을 실행하는지 확인합니다.`;
const sections = h2Sections(body);
const parsed = parseSectionParts(sections[0]);

assert.equal(sections.length, 1);
assert.equal(parsed.subtitle, "CLAUDE.md에 테스트 명령을 적습니다");
assert.equal(parsed.image.url, "https://example.com/a.webp");
assert.deepEqual(
  lintImageBrief(
    {
      sectionSubtitle: parsed.subtitle,
      contentAnchor: "새 대화에서 같은 명령을 실행하는지 확인합니다.",
      visualSubject: "CLAUDE.md 파일과 npm test 명령이 보이는 터미널 화면",
      visualRelationship: "파일에 적은 명령과 새 대화에서 실행한 명령이 같다",
    },
    sections[0],
    parsed,
  ),
  [],
);
assert.ok(
  lintImageBrief(
    {
      sectionSubtitle: parsed.subtitle,
      contentAnchor: "본문에 없는 문장입니다.",
      visualSubject: "멋진 미래",
      visualRelationship: "좋은 느낌을 준다",
    },
    sections[0],
    parsed,
  ).length >= 1,
);
assert.deepEqual(
  lintImagePolicy({
    sourceKind: "imagegen",
    visualProfile: "eddmpython-dark-v2",
    palettePolicy: "eddmpython-gray-master-v1",
    prompt: "Tactile graphite objects on a carbon background with one sand accent.",
  }),
  [],
);

console.log("blog media package: parsing and image contracts passed");
