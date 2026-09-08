import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const imageStyle = JSON.parse(readFileSync(new URL("../../blog/media/imageStyle.json", import.meta.url), "utf8"));

export function imageBriefIssues(entry) {
  if (entry.visualProfile !== imageStyle.visualProfile) return [];
  const issues = [];
  if (entry.sourceKind !== "imagegen") issues.push("신규 설명 이미지는 ImageGen으로 제작합니다");
  if (entry.palettePolicy !== imageStyle.palettePolicy) issues.push("신규 이미지의 palettePolicy가 공통 기준과 다릅니다");
  if (!imageStyle.visualModes.includes(entry.visualMode)) issues.push("visualMode가 필요합니다");
  if (entry.visualMode === "screen" && (!String(entry.sourceUrl ?? "").trim() || !String(entry.captureState ?? "").trim())) {
    issues.push("화면 묘사에는 실제 sourceUrl과 captureState가 필요합니다");
  }
  if (entry.visualMode === "diagram" && !String(entry.diagramEvidence ?? "").trim()) issues.push("도식에는 관계와 수치를 확인한 diagramEvidence가 필요합니다");
  return issues;
}

export function composeImagePrompt(entry, palette) {
  const issues = imageBriefIssues(entry);
  if (entry.visualProfile !== imageStyle.visualProfile) issues.push("신규 이미지 프로필의 계획이 필요합니다");
  for (const field of ["contentAnchor", "visualSubject", "visualRelationship", "prompt"]) {
    if (!String(entry[field] ?? "").trim()) issues.push(`${field}가 비었습니다`);
  }
  if (issues.length) throw new Error(issues.join("\n"));
  const colors = Object.entries(imageStyle.paletteTokens).map(([role, token]) => {
    if (!palette[token]) throw new Error(`디자인 토큰이 없습니다: ${token}`);
    return `${role}: ${palette[token]}`;
  });
  return [
    `Mode: ${entry.visualMode}. Preferred generator: ${imageStyle.generator}. Fallback: ${imageStyle.fallback.generator}, only when ${imageStyle.fallback.condition}.`,
    `Article claim (context, not image text): ${entry.contentAnchor}`,
    `Subject: ${entry.visualSubject}`,
    `Relationship: ${entry.visualRelationship}`,
    `Scene direction: ${entry.prompt}`,
    ...(entry.referenceImages?.length ? [`Reference inventory (attach the inspected images separately): ${JSON.stringify(entry.referenceImages)}`] : []),
    ...(entry.requiredText?.length ? [`Required text, verbatim: ${JSON.stringify(entry.requiredText)}`] : []),
    ...(entry.sourceUrl ? [`Content source: ${entry.sourceUrl}. Fetch and inspect the actual image before using it as a reference; a URL alone is not an attached reference.`] : []),
    ...(entry.captureState ? [`Verified screen state: ${entry.captureState}`] : []),
    ...(entry.diagramEvidence ? [`Verified diagram evidence: ${entry.diagramEvidence}`] : []),
    "Shared style instructions override conflicting decorative directions, but never source facts:",
    ...imageStyle.instructions,
    `Postprocessing palette from DESIGN, do not render these hues into the master: ${colors.join(", ")}.`,
    `Canvas: ${imageStyle.aspectRatio}. Keep essential content inside a ${imageStyle.safeMarginPercent}% safe margin.`,
  ].join("\n");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { DESIGN } = await import("../src/design.ts");
  const args = process.argv.slice(2);
  const [post, asset, flag, planPath] = args;
  if (!args.length) {
    console.log(JSON.stringify({ ...imageStyle, palette: Object.fromEntries(Object.entries(imageStyle.paletteTokens).map(([role, token]) => [role, DESIGN.palette[token]])) }, null, 2));
  } else {
    if (!/^\d{2,3}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post ?? "") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset ?? "")) throw new Error("글과 자산 키 형식이 잘못됐습니다");
    if (args.length !== 2 && !(args.length === 4 && flag === "--plan" && planPath)) throw new Error("사용: imagePrompt.mjs <post-id> <asset-key> [--plan <path>]");
    const root = fileURLToPath(new URL("../../blog/posts/", import.meta.url));
    const plan = JSON.parse(readFileSync(planPath ? resolve(planPath) : resolve(root, post, "media.json"), "utf8"));
    const entry = plan.assets?.[`${post}/${asset}`] ?? plan.assets?.[asset];
    if (!entry || (entry.post && entry.post !== post)) throw new Error(`이미지 계획이 없습니다: ${post}/${asset}`);
    console.log(composeImagePrompt(entry, DESIGN.palette));
  }
}
