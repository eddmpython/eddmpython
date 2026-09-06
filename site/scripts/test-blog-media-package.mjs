import assert from "node:assert/strict";
import { imageStyle, composeImagePrompt } from "./imagePrompt.mjs";
import {
  h2Sections,
  isCourseAssetId,
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
const linked = parseSectionParts(h2Sections(body.replace(
  '![설정 파일과 테스트 명령이 같은 화면에 보이는 모습](https://example.com/a.webp "규칙 파일과 실제 명령을 함께 확인합니다")',
  '[![설정 파일과 테스트 명령이 같은 화면에 보이는 모습](https://example.com/a.webp "규칙 파일과 실제 명령을 함께 확인합니다")](https://example.com/tool)',
))[0]);
assert.equal(linked.image.url, parsed.image.url);
assert.equal(linked.image.href, "https://example.com/tool");
assert.equal(linked.remainder, parsed.remainder);
assert.equal(parseSectionParts({ content: "### 부제\n\n| A | B |\n|---|---|\n| 1 | 2 |" }).image, null);
assert.equal(parseSectionParts({ content: "### 부제\n\n```python\nprint(1)\n```" }).image, null);
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

assert.equal(isCourseAssetId("01-ai-agent-scenes/agent-common-ability"), true);
const direct = {
  sourceKind: "imagegen",
  visualProfile: imageStyle.visualProfile,
  palettePolicy: imageStyle.palettePolicy,
  visualMode: "screen",
  sourceUrl: "https://example.com/product",
  captureState: "파일을 열고 code 열의 0012를 확인한 상태",
  contentAnchor: "문자열로 읽으면 0012가 남습니다.",
  visualSubject: "실제 파일 화면과 code 열",
  visualRelationship: "파일의 문자와 문자열로 읽은 값이 같다",
  prompt: "확인한 화면에서 code 열을 확대한다",
};
assert.deepEqual(lintImagePolicy(direct), []);
assert.ok(lintImagePolicy({ ...direct, palettePolicy: "wrong" }).length);
assert.ok(lintImagePolicy({ ...direct, captureState: "" }).length);
assert.ok(lintImagePolicy({ ...direct, visualMode: "diagram" }).length);
assert.deepEqual(lintImagePolicy({ ...direct, visualMode: "diagram", diagramEvidence: "측정 파일의 열 관계" }), []);
const palette = { carbon: "background-token", ivory: "surface-token", brand: "accent-token" };
const prompt = composeImagePrompt(direct, palette);
assert.ok(prompt.includes(direct.captureState));
assert.ok(prompt.includes("background-token"));
assert.ok(prompt.includes("Product and screenshot source colors take precedence"));
assert.ok(prompt.includes("ImageGen only"));
assert.throws(() => composeImagePrompt({ ...direct, sourceUrl: "" }, palette));
assert.throws(() => composeImagePrompt({ ...direct, visualProfile: "eddmpython-dark-v2" }, palette));
assert.equal(isCourseAssetId("001-ai-needs-an-environment/missing-plan"), false);
assert.equal(isCourseAssetId("01-invalid/../escape"), false);
assert.equal(isCourseAssetId("1-no-owner/hero"), false);

console.log("blog media package: parsing, ownership and image contracts passed");
