const SUBTITLE_LEAD = /^###[ \t]+([^\r\n]+)\r?\n\r?\n/u;
const IMAGE_LEAD =
  /^!\[([^\]]+)\]\(\s*<?([^\s)>]+)>?\s+["']([^"']+)["']\s*\)\s*(?:\r?\n|$)/u;
const IMAGEGEN_V2 = "eddmpython-dark-v2";
const IMAGEGEN_PALETTE = "eddmpython-gray-master-v1";
/**
 * 옛 값. 이미지 모델에게 강조색을 직접 그리게 하던 시절의 자산이 이 값을 들고 있다.
 * 그 이미지의 픽셀에는 지금 금지된 색이 굳어 있어서 새 정책 이름을 붙이면 데이터가
 * 픽셀과 어긋난다. 새 작업에는 고르지 않고 옛 자산을 알아보기 위해서만 받는다.
 */
const LEGACY_IMAGEGEN_PALETTES = new Set(["eddmpython-carbon-ivory-sand-v1"]);
const BANNED_IMAGEGEN_COLORS = /\b(?:blue|cyan|green|purple|pink|red|gold|amber|rainbow|neon)\b/iu;

function issue(location, message, excerpt = "") {
  return { location, message, excerpt };
}

function fencedRanges(body) {
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

  return { subtitle, image, remainder: rest.trimStart() };
}

export function lintImageBrief(entry, section, parsed) {
  const issues = [];
  for (const key of ["contentAnchor", "visualSubject", "visualRelationship"]) {
    if (!String(entry[key] ?? "").trim()) {
      issues.push(issue(section.heading, `이미지 계획의 ${key}가 비었습니다`));
    }
  }
  if (parsed?.subtitle && entry.sectionSubtitle !== parsed.subtitle) {
    issues.push(
      issue(
        section.heading,
        "이미지 계획의 sectionSubtitle이 본문 부제와 다릅니다",
        String(entry.sectionSubtitle ?? ""),
      ),
    );
  }
  if (parsed && !parsed.remainder.includes(String(entry.contentAnchor ?? ""))) {
    issues.push(
      issue(
        section.heading,
        "이미지 계획의 contentAnchor가 실제 설명 문단에 없습니다",
        String(entry.contentAnchor ?? ""),
      ),
    );
  }
  return issues;
}

export function lintImagePolicy(entry) {
  const issues = [];
  if (entry.sourceKind !== "imagegen" || entry.visualProfile !== IMAGEGEN_V2) return issues;
  if (entry.palettePolicy !== IMAGEGEN_PALETTE && !LEGACY_IMAGEGEN_PALETTES.has(String(entry.palettePolicy))) {
    issues.push(
      issue(
        "palettePolicy",
        `${IMAGEGEN_V2}는 ${IMAGEGEN_PALETTE}를 사용합니다`,
        String(entry.palettePolicy ?? ""),
      ),
    );
  }
  const banned = String(entry.prompt ?? "").match(BANNED_IMAGEGEN_COLORS)?.[0];
  if (banned) issues.push(issue("prompt", "v2 생성 프롬프트에 브랜드 밖 색상 지시가 있습니다", banned));
  return issues;
}
