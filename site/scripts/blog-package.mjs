const SEARCH_INTENTS = new Set(["explanation", "how-to", "troubleshooting", "comparison"]);
const INTENT_HOOK = {
  explanation: /(?:왜|이유|무엇|달라지는|알아야)/u,
  "how-to": /(?:방법|하는 법|없이|부터|순서)/u,
  troubleshooting: /(?:문제|실패|나빠|망치|고칠|해결|틀리|안 될)/u,
  comparison: /(?:차이|비교|선택|어느|보다)/u,
};
const SECTION_LEAD =
  /^###[ \t]+([^\r\n]+)\r?\n\r?\n!\[([^\]]+)\]\(\s*<?([^\s)>]+)>?\s+["']([^"']+)["']\s*\)\s*(?:\r?\n|$)/u;
const SUBTITLE_LEAD = /^###[ \t]+([^\r\n]+)\r?\n\r?\n/u;
const IMAGE_LEAD =
  /^!\[([^\]]+)\]\(\s*<?([^\s)>]+)>?\s+["']([^"']+)["']\s*\)\s*(?:\r?\n|$)/u;
const CONCRETE_VISUAL =
  /(?:화면|버튼|메뉴|코드|파일|폴더|문서|명령|터미널|브라우저|표|목록|셀|결과|오류|로그|숫자|링크|설정|검사)/u;
const VAGUE_SUBTITLE = /^(?:핵심 내용|자세한 설명|알아둘 점|중요한 이야기|이 절의 내용)$/u;
const IMAGEGEN_V2 = "eddmpython-dark-v2";
const IMAGEGEN_PALETTE = "eddmpython-carbon-ivory-sand-v1";
const BANNED_IMAGEGEN_COLORS = /\b(?:blue|cyan|green|purple|pink|red|gold|amber|rainbow|neon)\b/iu;
const LEGACY_SUPPORT_LABEL = /^(?:코드|예시|확인 목록|설명 목록|참고 자료)$/u;
const DEEP_SUPPORT_LABEL =
  /^(?:예시 코드|실행 명령|예상 결과|입력 예시|출력 예시|실패 예시|복구 코드|개념 확인|확인 목록|설명 목록|참고 자료):[ \t]+\S.+$/u;
const DEEP_CODE_LABEL =
  /^(?:예시 코드|실행 명령|예상 결과|입력 예시|출력 예시|실패 예시|복구 코드|개념 확인):/u;
// 한 편 검사는 라벨 어휘를 닫지 않는다. 역할과 설명을 콜론으로 나눈 형태만 요구하고,
// 무엇을 배우는지 알 수 없는 역할어만 막는다.
const OPEN_SUPPORT_LABEL = /^([^\s:]{2,12}(?:[ \t][^\s:]{1,12})?):[ \t]+\S.+$/u;
const VAGUE_SUPPORT_ROLE = /^(?:코드|예시|참고|내용|정리|설명|기타|자료)$/u;
const OPEN_CODE_ROLE = /(?:코드|명령|결과|출력|입력|예시|실행|로그|오류)/u;

function issue(location, message, excerpt = "") {
  return { location, message, excerpt };
}

function normalize(text) {
  return String(text ?? "")
    .toLocaleLowerCase("ko")
    .replace(/[^0-9a-z가-힣]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordTokens(keyword) {
  return normalize(keyword)
    .split(" ")
    .filter((token) => token.length >= 2);
}

export function fencedRanges(body) {
  const ranges = [];
  let open = null;
  for (const match of body.matchAll(/^```.*$/gm)) {
    if (open === null) open = match.index;
    else {
      ranges.push([open, match.index + match[0].length]);
      open = null;
    }
  }
  if (open !== null) ranges.push([open, body.length]);
  return ranges;
}

export function h2Sections(body) {
  const ranges = fencedRanges(body);
  const insideFence = (index) => ranges.some(([start, end]) => index >= start && index < end);
  const headings = [...body.matchAll(/^##[ \t]+(.+?)\s*$/gm)].filter(
    (heading) => !insideFence(heading.index),
  );
  return headings.map((heading, index) => ({
    heading: heading[1].trim(),
    content: body
      .slice(heading.index + heading[0].length, headings[index + 1]?.index ?? body.length)
      .trimStart(),
  }));
}

export function parseSectionPackage(section) {
  const lead = section.content.match(SECTION_LEAD);
  if (!lead) return null;
  const remainder = section.content.slice(lead[0].length).trimStart();
  const firstBlock = remainder.split(/(?:\r?\n){2,}/, 1)[0]?.trim() ?? "";
  return {
    subtitle: lead[1].trim(),
    alt: lead[2].trim(),
    url: lead[3].trim(),
    caption: lead[4].trim(),
    lead,
    remainder,
    firstBlock,
  };
}

// 관대한 파서다. 부제와 이미지는 있으면 검사하고 없으면 넘어간다.
// H2마다 부제와 고유 이미지를 강제하던 규칙이 40편 278개 절을 같은 카드로 만들었다.
export function parseSectionParts(section) {
  let rest = section.content;
  let subtitle = null;
  let image = null;

  const subtitleMatch = rest.match(SUBTITLE_LEAD);
  if (subtitleMatch) {
    subtitle = subtitleMatch[1].trim();
    rest = rest.slice(subtitleMatch[0].length);
  }
  const imageMatch = rest.match(IMAGE_LEAD);
  if (imageMatch) {
    image = {
      alt: imageMatch[1].trim(),
      url: imageMatch[2].trim(),
      caption: imageMatch[3].trim(),
    };
    rest = rest.slice(imageMatch[0].length);
  }

  const remainder = rest.trimStart();
  const firstBlock = remainder.split(/(?:\r?\n){2,}/, 1)[0]?.trim() ?? "";
  return { subtitle, image, remainder, firstBlock };
}

export function lintSeoPackage(meta, body, sections) {
  const issues = [];
  const title = String(meta.title ?? "");
  const summary = String(meta.summary ?? "");
  const keyword = String(meta.primaryKeyword ?? "");
  const intent = String(meta.searchIntent ?? "");
  const tokens = keywordTokens(keyword);

  if (title.length < 15 || title.length > 60) {
    issues.push(issue("title", "검색 제목은 15자 이상 60자 이하로 씁니다", title));
  }
  if (!SEARCH_INTENTS.has(intent)) {
    issues.push(issue("searchIntent", "검색 의도를 explanation, how-to, troubleshooting, comparison 중 하나로 적습니다", intent));
  } else if (!INTENT_HOOK[intent].test(title)) {
    issues.push(issue("title", `${intent} 검색 의도에 맞는 문제, 질문, 결과 후크가 없습니다`, title));
  }
  if (tokens.length < 2) {
    issues.push(issue("primaryKeyword", "독자가 검색할 두 단어 이상의 핵심어를 적습니다", keyword));
  }
  // 도입 두 문단에도 핵심어를 강제하던 규칙은 뺐다. 그 규칙이 발행 40편 중 29편의
  // 첫 문장을 `핵심어 + 을/를`로 시작하게 만들었다. 제목과 요약과 H2로 충분하다.
  for (const [location, text] of [
    ["title", title],
    ["summary", summary],
  ]) {
    const haystack = normalize(text);
    const missing = tokens.filter((token) => !haystack.includes(token));
    if (missing.length) {
      issues.push(issue(location, `핵심 검색어가 빠졌습니다: ${missing.join(", ")}`, text));
    }
  }
  if (tokens.length && !sections.some((section) => tokens.some((token) => normalize(section.heading).includes(token)))) {
    issues.push(issue("H2", "H2 하나 이상에 핵심 검색어의 주요 단어를 넣습니다", keyword));
  }
  return issues;
}

export function lintSectionPackages(
  sections,
  { requireCodeLabels = false, strictLead = true, openLabels = false, checkLabels = true } = {},
) {
  const issues = [];
  for (const section of sections) {
    let parsed;
    if (strictLead) {
      const strict = parseSectionPackage(section);
      if (!strict) {
        issues.push(
          issue(
            `H2 ${section.heading}`,
            "섹션은 H2 제목, H3 한 줄 부제, 캡션이 있는 이미지 순서로 시작합니다",
            section.heading,
          ),
        );
        continue;
      }
      parsed = strict;
    } else {
      parsed = parseSectionParts(section);
    }
    if (
      parsed.subtitle !== null &&
      parsed.subtitle !== undefined &&
      (parsed.subtitle.length < 15 || parsed.subtitle.length > 80 || VAGUE_SUBTITLE.test(parsed.subtitle))
    ) {
      issues.push(issue(`H2 ${section.heading}`, "부제는 15자 이상 80자 이하의 구체적인 한 문장으로 씁니다", parsed.subtitle));
    }
    if (/^(?:```|#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/u.test(parsed.firstBlock)) {
      issues.push(issue(`H2 ${section.heading}`, "이미지 다음에는 코드나 목록보다 쉬운 서술형 설명을 먼저 씁니다", parsed.firstBlock));
    } else if (parsed.firstBlock.length < 60) {
      issues.push(issue(`H2 ${section.heading}`, "첫 설명 문단은 독자가 장면을 이해할 수 있게 60자 이상 씁니다", parsed.firstBlock));
    }
    // 보조자료 검사는 그 한 편을 쓰는 동안만 돈다. 전체 검사는 여러 글 사이의 계약만 본다.
    const supports = checkLabels
      ? [...parsed.remainder.matchAll(/^####[ \t]+(.+?)\s*$([\s\S]*?)(?=^####[ \t]+|(?![\s\S]))/gm)]
      : [];
    for (const match of supports) {
      const label = match[1].trim();
      const support = match[2].trimStart();
      const codeBlocks = [...support.matchAll(/```[\s\S]*?```/g)];
      if (!checkLabels) {
        // 전체 검사는 여러 글 사이의 계약만 본다. H4 라벨은 글을 쓰는 동안 그 한 편에서 본다.
      } else if (openLabels) {
        const open = label.match(OPEN_SUPPORT_LABEL);
        const role = open?.[1]?.trim() ?? "";
        if (!open) {
          issues.push(issue(`H2 ${section.heading}`, "보조자료 H4는 `역할: 설명` 형태로 씁니다", label));
        } else if (VAGUE_SUPPORT_ROLE.test(role)) {
          issues.push(issue(`H2 ${section.heading}`, "무엇을 배우는지 알 수 없는 역할어입니다", label));
        } else if (codeBlocks.length && !OPEN_CODE_ROLE.test(role)) {
          issues.push(
            issue(`H2 ${section.heading}`, "코드 블록 H4의 역할에는 자료의 성격을 씁니다", label),
          );
        }
      } else {
        const allowedLabel = requireCodeLabels ? DEEP_SUPPORT_LABEL : LEGACY_SUPPORT_LABEL;
        if (!allowedLabel.test(label)) {
          issues.push(
            issue(
              `H2 ${section.heading}`,
              requireCodeLabels
                ? "깊이 계약 글의 H4는 자료 역할과 설명할 개념을 함께 씁니다"
                : "보조자료 H4는 코드, 예시, 확인 목록, 설명 목록, 참고 자료만 씁니다",
              label,
            ),
          );
        }
        if (requireCodeLabels && codeBlocks.length && !DEEP_CODE_LABEL.test(label)) {
          issues.push(issue(`H2 ${section.heading}`, "코드 블록 H4에는 예시 코드, 실행 명령, 예상 결과처럼 역할을 씁니다", label));
        }
      }
      if (requireCodeLabels && codeBlocks.length) {
        const explanationLength = support
          .replace(/```[\s\S]*?```/g, " ")
          .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
          .replace(/\s+/g, "")
          .length;
        if (explanationLength < 80) {
          issues.push(
            issue(
              `H2 ${section.heading}`,
              "코드 앞뒤에 입력, 핵심 줄, 예상 결과를 합쳐 80자 이상 설명합니다",
              label,
            ),
          );
        }
      } else if (!/^(?:```|[-*+]\s|\d+[.)]\s|\|[^\n]+\|)/u.test(support)) {
        issues.push(issue(`H2 ${section.heading}`, "보조자료는 코드, 실제 예시, 설명용 목록이나 표로 구성합니다", label));
      }
    }
    if (requireCodeLabels) {
      for (const fence of parsed.remainder.matchAll(/^```/gm)) {
        const prefix = parsed.remainder.slice(0, fence.index);
        const headings = [...prefix.matchAll(/^####[ \t]+(.+?)\s*$/gm)];
        const label = headings.at(-1)?.[1]?.trim() ?? "";
        if (!DEEP_CODE_LABEL.test(label)) {
          issues.push(issue(`H2 ${section.heading}`, "모든 코드 블록 바로 앞 범위에 역할과 개념이 보이는 H4를 둡니다", label));
        }
      }
    }
  }
  return issues;
}

export function lintImageBrief(entry, section, parsed, { requireSubtitle = true } = {}) {
  const issues = [];
  const required = requireSubtitle
    ? ["sectionSubtitle", "contentAnchor", "visualSubject", "visualRelationship"]
    : ["contentAnchor", "visualSubject", "visualRelationship"];
  for (const key of required) {
    if (!String(entry[key] ?? "").trim()) issues.push(issue(section.heading, `이미지 계획의 ${key}가 비었습니다`));
  }
  if (parsed?.subtitle && entry.sectionSubtitle !== parsed.subtitle) {
    issues.push(issue(section.heading, "이미지 계획의 sectionSubtitle이 본문 부제와 다릅니다", String(entry.sectionSubtitle ?? "")));
  }
  if (parsed && !parsed.remainder.includes(String(entry.contentAnchor ?? ""))) {
    issues.push(issue(section.heading, "이미지 계획의 contentAnchor가 실제 설명 문단에 없습니다", String(entry.contentAnchor ?? "")));
  }
  if (!CONCRETE_VISUAL.test(String(entry.visualSubject ?? ""))) {
    issues.push(issue(section.heading, "visualSubject에는 화면, 코드, 파일, 명령, 결과처럼 실제로 그릴 대상을 적습니다", String(entry.visualSubject ?? "")));
  }
  return issues;
}

export function lintImagePolicy(entry) {
  const issues = [];
  if (entry.sourceKind !== "imagegen" || entry.visualProfile !== IMAGEGEN_V2) return issues;
  if (entry.palettePolicy !== IMAGEGEN_PALETTE) {
    issues.push(issue("palettePolicy", `${IMAGEGEN_V2}는 ${IMAGEGEN_PALETTE}를 사용합니다`, String(entry.palettePolicy ?? "")));
  }
  const prompt = String(entry.prompt ?? "");
  const banned = prompt.match(BANNED_IMAGEGEN_COLORS)?.[0];
  if (banned) {
    issues.push(issue("prompt", "v2 생성 프롬프트에 브랜드 밖 색상 지시가 있습니다", banned));
  }
  return issues;
}

