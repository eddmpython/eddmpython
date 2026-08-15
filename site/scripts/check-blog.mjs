import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { lintBlogStyle } from "./blog-style.mjs";
import {
  h2Sections,
  lintDepthContract,
  lintImageBrief,
  lintImagePolicy,
  lintSectionPackages,
  lintSeoPackage,
  parseSectionPackage,
} from "./blog-package.mjs";

const blogDir = resolve(process.cwd(), "../blog");
const codaroEmbedsPath = resolve(blogDir, "embeds/codaro-cells.json");
const blogOrderPath = resolve(blogDir, "order.json");
const postName = /^(\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const requiredMeta = [
  "title",
  "slug",
  "author",
  "section",
  "summary",
  "readerQuestion",
  "readerTakeaway",
  "readerLevel",
  "readerStartingPoint",
  "primaryKeyword",
  "searchIntent",
];
const readerLevels = new Set(["beginner", "working", "advanced"]);
const allowedDocs = new Set(["PIPELINE.md", "product-marketing.md"]);
const publicSlug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const mediaSuffixes = new Set([
  ".svg",
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".avif",
  ".bmp",
  ".ico",
  ".heic",
  ".tif",
  ".tiff",
]);
const assetId = /^(\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const sha256 = /^[0-9a-f]{64}$/;
const mimeBySuffix = new Map([
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".gif", "image/gif"],
]);
const imageRef = /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const codaroEmbedRef =
  /^https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function parseFrontmatter(file, raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) fail(file, "frontmatter가 없거나 형식이 잘못됐습니다");

  const meta = new Map();
  for (const [index, line] of match[1].split(/\r?\n/).entries()) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!field) fail(file, `frontmatter ${index + 2}번째 줄을 읽을 수 없습니다`);
    if (meta.has(field[1])) fail(file, `${field[1]} 필드가 중복됐습니다`);
    meta.set(field[1], field[2].trim());
  }

  for (const key of requiredMeta) {
    if (!meta.get(key)) fail(file, `${key} 필드가 비었습니다`);
  }
  return { meta, body: match[2].trim() };
}

function proseParagraphs(body) {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .split(/(?:\r?\n){2,}/)
    .map((block) => block.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(
      (block) =>
        block &&
        !/^(?:#{1,6}\s|!\[|(?:\d+\.|[-*+])\s|>|\||https?:\/\/)/.test(block) &&
        !block.split("|").every((part) => /^:?-+:?$/.test(part.trim())),
    )
    .map((block) =>
      block
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim(),
    );
}

async function filesUnder(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

async function loadJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(label, `JSON을 읽을 수 없습니다: ${error.message}`);
  }
}

const allBlogFiles = await filesUnder(blogDir);
const localMedia = allBlogFiles.filter((path) => {
  const dot = path.lastIndexOf(".");
  return dot >= 0 && mediaSuffixes.has(path.slice(dot).toLowerCase());
});
if (localMedia.length) {
  fail(
    "blog",
    `Git 저장소 안의 블로그 이미지 금지: ${localMedia.map((path) => relative(blogDir, path)).join(", ")}`,
  );
}

const plan = await loadJson(resolve(blogDir, "media/plan.json"), "blog/media/plan.json");
const catalog = await loadJson(resolve(blogDir, "media/catalog.json"), "blog/media/catalog.json");
const codaroEmbeds = await loadJson(codaroEmbedsPath, "blog/embeds/codaro-cells.json");
const blogOrder = await loadJson(blogOrderPath, "blog/order.json");
if (
  plan.version !== 2 ||
  plan.promptContract !== "section-grounded-v2" ||
  !plan.assets ||
  typeof plan.assets !== "object"
) {
  fail("blog/media/plan.json", "version, promptContract 또는 assets 계약이 잘못됐습니다");
}
if (
  catalog.version !== 1 ||
  typeof catalog.repo !== "string" ||
  catalog.objectPrefix !== "objects/sha256" ||
  !catalog.objects ||
  typeof catalog.objects !== "object" ||
  !catalog.assets ||
  typeof catalog.assets !== "object"
) {
  fail("blog/media/catalog.json", "미디어 카탈로그 계약이 잘못됐습니다");
}
if (
  codaroEmbeds.version !== 1 ||
  !codaroEmbeds.examples ||
  typeof codaroEmbeds.examples !== "object"
) {
  fail("blog/embeds/codaro-cells.json", "version 또는 examples 계약이 잘못됐습니다");
}
if (blogOrder.version !== 1 || !Array.isArray(blogOrder.posts) || !blogOrder.posts.length) {
  fail("blog/order.json", "version 또는 posts 계약이 잘못됐습니다");
}

const orderedSlugs = new Set();
let previousReadingOrder = 0;
for (const entry of blogOrder.posts) {
  const order = Number(entry?.order);
  const slug = String(entry?.slug ?? "");
  if (!Number.isInteger(order) || order !== previousReadingOrder + 1) {
    fail("blog/order.json", `order가 1부터 빈 번호 없이 이어지지 않습니다: ${order}`);
  }
  if (!publicSlug.test(slug)) fail("blog/order.json", `올바르지 않은 slug: ${slug}`);
  if (orderedSlugs.has(slug)) fail("blog/order.json", `slug가 중복됐습니다: ${slug}`);
  orderedSlugs.add(slug);
  previousReadingOrder = order;
}
for (const [id, example] of Object.entries(codaroEmbeds.examples)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !example || typeof example !== "object") {
    fail("blog/embeds/codaro-cells.json", `올바르지 않은 example id: ${id}`);
  }
  const required = ["title", "description", "code", "hint", "fullUrl"];
  const missing = required.filter((key) => !String(example[key] ?? "").trim());
  if (missing.length) {
    fail("blog/embeds/codaro-cells.json", `${id} 필드가 비었습니다: ${missing.join(", ")}`);
  }
  if (!String(example.fullUrl).startsWith("https://eddmpython.com/codaro/run/")) {
    fail("blog/embeds/codaro-cells.json", `${id}의 fullUrl이 Codaro Web Run이 아닙니다`);
  }
}

for (const [id, entry] of Object.entries(plan.assets)) {
  const match = id.match(assetId);
  if (!match || !entry || typeof entry !== "object") {
    fail("blog/media/plan.json", `올바르지 않은 asset id: ${id}`);
  }
  const required = [
    "post",
    "assetKey",
    "role",
    "visualProfile",
    "alt",
    "placement",
    "narrativeUse",
    "sourcePolicy",
    "sourceKind",
  ];
  const missing = required.filter((key) => !String(entry[key] ?? "").trim());
  if (missing.length) fail("blog/media/plan.json", `${id} 필드가 비었습니다: ${missing.join(", ")}`);
  if (entry.post !== match[1] || entry.assetKey !== match[2]) {
    fail("blog/media/plan.json", `${id}의 post 또는 assetKey가 id와 다릅니다`);
  }
  if (entry.role === "section" && entry.placement !== "H3 부제 바로 뒤") {
    fail("blog/media/plan.json", `${id}의 placement는 H3 부제 바로 뒤여야 합니다`);
  }
  if (entry.sourcePolicy !== "auto") fail("blog/media/plan.json", `${id}의 sourcePolicy는 auto여야 합니다`);
  if (!["hero", "section", "support"].includes(entry.role)) {
    fail("blog/media/plan.json", `${id}의 role을 지원하지 않습니다`);
  }
  if (entry.role === "section" && !String(entry.sectionHeading ?? "").trim()) {
    fail("blog/media/plan.json", `${id}의 sectionHeading이 비었습니다`);
  }
  if (!["imagegen", "screenshot", "official", "licensed"].includes(entry.sourceKind)) {
    fail("blog/media/plan.json", `${id}의 sourceKind를 지원하지 않습니다`);
  }
  const expectedProfiles =
    entry.sourceKind === "imagegen"
      ? new Set(["dark-editorial-v1", "eddmpython-dark-v2"])
      : entry.sourceKind === "screenshot"
        ? new Set(["product-screen-v1"])
        : new Set(["source-original-v1"]);
  if (!expectedProfiles.has(entry.visualProfile)) {
    fail("blog/media/plan.json", `${id}의 visualProfile을 지원하지 않습니다`);
  }
  if (entry.sourceKind === "imagegen" && !String(entry.prompt ?? "").trim()) {
    fail("blog/media/plan.json", `${id}의 ImageGen prompt가 비었습니다`);
  }
  const imagePolicyIssues = lintImagePolicy(entry);
  if (imagePolicyIssues.length) {
    fail(
      "blog/media/plan.json",
      `${id}의 생성 이미지 색상 정책 위반 ${imagePolicyIssues.length}건\n${imagePolicyIssues
        .map((issue) => `  - ${issue.location}: ${issue.message} (${issue.excerpt})`)
        .join("\n")}`,
    );
  }
  if (entry.sourceKind === "screenshot") {
    if (!String(entry.sourceUrl ?? "").trim() || !String(entry.captureState ?? "").trim()) {
      fail("blog/media/plan.json", `${id}의 screenshot sourceUrl 또는 captureState가 비었습니다`);
    }
  }
  if (["official", "licensed"].includes(entry.sourceKind)) {
    if (!String(entry.sourceUrl ?? "").trim() || !String(entry.credit ?? "").trim()) {
      fail("blog/media/plan.json", `${id}의 sourceUrl 또는 credit이 비었습니다`);
    }
  }
  if (entry.sourceKind === "licensed" && !String(entry.license ?? "").trim()) {
    fail("blog/media/plan.json", `${id}의 license가 비었습니다`);
  }
}

const urlsByPost = new Map();
const assetUrlById = new Map();
const assetIdByPostUrl = new Map();
const altByPostUrl = new Map();
const objectByPostUrl = new Map();
for (const [id, record] of Object.entries(catalog.assets)) {
  const match = id.match(assetId);
  if (!match || !record || typeof record !== "object") {
    fail("blog/media/catalog.json", `올바르지 않은 asset id: ${id}`);
  }
  if (!plan.assets[id]) fail("blog/media/catalog.json", `${id}의 이미지 계획이 없습니다`);
  if (record.post !== match[1] || record.assetKey !== match[2] || !sha256.test(record.sha256)) {
    fail("blog/media/catalog.json", `${id}의 post, assetKey 또는 SHA-256이 잘못됐습니다`);
  }
  const suffix = String(record.path ?? "").match(/(\.[a-z0-9]+)$/)?.[1] ?? "";
  const expectedPath = `${catalog.objectPrefix}/${record.sha256.slice(0, 2)}/${record.sha256}${suffix}`;
  if (![".webp", ".png", ".jpg", ".gif"].includes(suffix) || record.path !== expectedPath) {
    fail("blog/media/catalog.json", `${id}가 콘텐츠 주소 경로를 쓰지 않습니다`);
  }
  const object = catalog.objects[record.sha256];
  if (
    !object ||
    object.path !== record.path ||
    !Number.isInteger(object.bytes) ||
    object.bytes <= 0 ||
    !Number.isInteger(object.width) ||
    object.width <= 0 ||
    !Number.isInteger(object.height) ||
    object.height <= 0 ||
    object.mime !== mimeBySuffix.get(suffix)
  ) {
    fail("blog/media/catalog.json", `${id}의 objects 레코드가 없거나 잘못됐습니다`);
  }
  const url = `https://huggingface.co/datasets/${catalog.repo}/resolve/main/${record.path}`;
  assetUrlById.set(id, url);
  assetIdByPostUrl.set(`${record.post}|${url}`, id);
  altByPostUrl.set(`${record.post}|${url}`, String(plan.assets[id].alt));
  objectByPostUrl.set(`${record.post}|${url}`, object);
  if (!urlsByPost.has(record.post)) urlsByPost.set(record.post, new Set());
  urlsByPost.get(record.post).add(url);
}

for (const id of Object.keys(plan.assets)) {
  if (!catalog.assets[id]) fail("blog/media/plan.json", `${id}가 아직 Hugging Face에 발행되지 않았습니다`);
}

const names = await readdir(blogDir);
const markdown = names.filter((name) => name.endsWith(".md"));
const unknown = markdown.filter((name) => !postName.test(name) && !allowedDocs.has(name));
if (unknown.length) {
  fail("blog", `발행 글이나 운영 문서로 분류되지 않은 파일: ${unknown.join(", ")}`);
}

const posts = markdown.filter((name) => postName.test(name)).sort();
if (!posts.length) fail("blog", "발행 글이 한 편도 없습니다");
for (const [index, file] of posts.entries()) {
  const sequence = Number(file.match(postName)[1]);
  if (sequence !== index + 1) {
    fail(file, `파일 순번은 001부터 빈 번호 없이 이어져야 합니다: ${sequence}`);
  }
}

const titles = new Map();
const slugs = new Map();
const referencedMedia = new Set();
const referencedCodaroEmbeds = new Set();
for (const file of posts) {
  const raw = await readFile(resolve(blogDir, file), "utf8");
  const { meta, body } = parseFrontmatter(file, raw);
  const postId = file.replace(/\.md$/, "");
  const slug = meta.get("slug");

  if (meta.has("date") || meta.has("modified")) {
    fail(file, "발행 날짜 대신 파일 순번과 blog/order.json의 순서만 사용합니다");
  }
  if (!publicSlug.test(slug)) {
    fail(file, "slug는 소문자·숫자·하이픈만 쓰고 날짜로 시작하지 않습니다");
  }
  if (slug.length < 4 || slug.length > 40) fail(file, "slug는 4자 이상 40자 이하로 씁니다");
  if (/^\d{4}-\d{2}-\d{2}/.test(slug)) fail(file, "공개 slug에 발행일을 넣지 않습니다");
  if (slugs.has(slug)) fail(file, `${slugs.get(slug)}와 slug가 같습니다`);
  slugs.set(slug, file);
  if (meta.get("title").length < 10 || meta.get("title").length > 70) {
    fail(file, "title은 10자 이상 70자 이하로 씁니다");
  }
  if (meta.get("author").length > 80) fail(file, "author가 80자를 넘습니다");
  if (meta.get("section").length > 50) fail(file, "section이 50자를 넘습니다");
  if (meta.get("summary").length < 40 || meta.get("summary").length > 180) {
    fail(file, "summary는 40자 이상 180자 이하로 씁니다");
  }
  if (!meta.get("readerQuestion").endsWith("?")) {
    fail(file, "readerQuestion은 물음표로 끝나는 질문이어야 합니다");
  }
  if (!readerLevels.has(meta.get("readerLevel"))) {
    fail(file, "readerLevel은 beginner, working, advanced 중 하나여야 합니다");
  }
  if (
    meta.get("readerStartingPoint").length < 20 ||
    meta.get("readerStartingPoint").length > 180
  ) {
    fail(file, "readerStartingPoint는 20자 이상 180자 이하로 씁니다");
  }
  if (titles.has(meta.get("title"))) {
    fail(file, `${titles.get(meta.get("title"))}와 제목이 같습니다`);
  }
  titles.set(meta.get("title"), file);

  if (!body) fail(file, "본문이 비었습니다");
  const bodyOutsideCode = body.replace(/```[\s\S]*?```/g, " ");
  if (/^[ \t]*# /m.test(bodyOutsideCode)) {
    fail(file, "본문 H1은 쓰지 않습니다. 제목은 frontmatter가 맡습니다");
  }
  const sections = h2Sections(body);
  if (sections.length < 3) fail(file, "독자 흐름을 나누는 H2가 3개보다 적습니다");
  const depthIssues = lintDepthContract(Object.fromEntries(meta), body, sections, {
    required: Number(file.slice(0, 3)) >= 41,
  });
  if (depthIssues.length) {
    fail(
      file,
      `독립 원문 깊이 계약 실패 ${depthIssues.length}건\n${depthIssues
        .map((issue) => `  - ${issue.location}: ${issue.message} (${issue.excerpt})`)
        .join("\n")}`,
    );
  }
  if ((body.match(/^```/gm) ?? []).length % 2 !== 0) fail(file, "코드 펜스가 닫히지 않았습니다");
  if (/[\u2013\u2014]/u.test(raw)) fail(file, "em dash 또는 en dash가 있습니다");
  if (/(?:세요|십시오|ㅂ시다|해라|하자)\.(?=\s|$)/u.test(raw)) {
    fail(file, "명령형 또는 권유형 문장 뒤에 마침표가 있습니다");
  }
  if (/\b(?:TODO|TBD)\b/.test(raw)) fail(file, "미완성 표식이 남았습니다");

  const packageIssues = [
    ...lintSeoPackage(Object.fromEntries(meta), body, sections),
    ...lintSectionPackages(sections, { requireCodeLabels: meta.has("depthContract") }),
  ];
  if (packageIssues.length) {
    fail(
      file,
      `글 패키지 검사 실패 ${packageIssues.length}건\n${packageIssues
        .map((issue) => `  - ${issue.location}: ${issue.message} (${issue.excerpt})`)
        .join("\n")}`,
    );
  }

  const styleIssues = lintBlogStyle({
    fields: {
      summary: meta.get("summary"),
      readerTakeaway: meta.get("readerTakeaway"),
    },
    body,
    sections,
  });
  if (styleIssues.length) {
    fail(
      file,
      `문장 품질 검사 실패 ${styleIssues.length}건\n${styleIssues
        .map((issue) => `  - ${issue.location}: ${issue.message} (${issue.excerpt})`)
        .join("\n")}`,
    );
  }

  if (meta.get("readerLevel") === "beginner") {
    for (const section of sections) {
      if (section.heading.length > 32) {
        fail(file, `beginner 글의 H2가 32자를 넘습니다: ${section.heading}`);
      }
    }
    for (const paragraph of proseParagraphs(body)) {
      if (paragraph.length > 220) {
        fail(file, `beginner 글의 문단이 220자를 넘습니다: ${paragraph.slice(0, 40)}...`);
      }
      const sentences = paragraph
        .split(/(?<=[.!?])\s+/u)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const longSentence = sentences.find((sentence) => sentence.length > 160);
      if (longSentence) {
        fail(file, `beginner 글의 문장이 160자를 넘습니다: ${longSentence.slice(0, 40)}...`);
      }
    }
  }

  for (const match of body.matchAll(codaroEmbedRef)) {
    const id = match[1];
    if (!codaroEmbeds.examples[id]) fail(file, `등록되지 않은 Codaro 실습 셀: ${id}`);
    referencedCodaroEmbeds.add(id);
  }
  if (/eddmpython\.com\/codaro\/run\/\?example=/.test(body) && !codaroEmbedRef.test(body)) {
    codaroEmbedRef.lastIndex = 0;
    fail(file, "Codaro 실습 셀 URL은 다른 내용 없는 한 줄로 둡니다");
  }
  codaroEmbedRef.lastIndex = 0;

  const sectionAssets = new Set();
  for (const section of sections) {
    const parsed = parseSectionPackage(section);
    if (!parsed) fail(file, `섹션 패키지를 읽을 수 없습니다: ${section.heading}`);
    const { alt, url, caption } = parsed;
    if (!caption.trim()) fail(file, `섹션 이미지 캡션이 비었습니다: ${section.heading}`);
    const id = assetIdByPostUrl.get(`${postId}|${url}`);
    if (!id) fail(file, `섹션 이미지가 catalog.json의 글 매핑에 없습니다: ${section.heading}`);
    const entry = plan.assets[id];
    if (entry.role !== "section" || entry.sectionHeading !== section.heading) {
      fail(file, `섹션 이미지 계획이 H2와 맞지 않습니다: ${section.heading}`);
    }
    if (alt.trim() !== entry.alt) {
      fail(file, `섹션 이미지 대체 텍스트가 plan.json과 다릅니다: ${section.heading}`);
    }
    const briefIssues = lintImageBrief(entry, section, parsed);
    if (briefIssues.length) {
      fail(
        file,
        `섹션 이미지 관련성 검사 실패 ${briefIssues.length}건: ${section.heading}\n${briefIssues
          .map((issue) => `  - ${issue.message} (${issue.excerpt})`)
          .join("\n")}`,
      );
    }
    if (sectionAssets.has(id)) fail(file, `서로 다른 H2가 같은 섹션 이미지를 재사용합니다: ${id}`);
    sectionAssets.add(id);

    const prose = parsed.remainder
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#*_`>|\[\]-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (prose.length < 120) {
      fail(file, `섹션 이미지 뒤 설명이 120자보다 짧습니다: ${section.heading}`);
    }
  }
  const refs = [];
  for (const match of body.matchAll(imageRef)) {
    if (!match[1].trim()) fail(file, "이미지 대체 텍스트가 비었습니다");
    refs.push({ url: match[2], alt: match[1].trim(), body: true });
  }
  if (meta.get("ogImage")) {
    const ogFields = ["ogImageAlt", "ogImageWidth", "ogImageHeight", "ogImageType"];
    const missingOg = ogFields.filter((key) => !meta.get(key));
    if (missingOg.length) fail(file, `ogImage 메타가 비었습니다: ${missingOg.join(", ")}`);
    refs.push({ url: meta.get("ogImage"), alt: "", body: false });
  }
  const allowedUrls = urlsByPost.get(postId) ?? new Set();
  for (const { url: ref, alt, body: isBodyImage } of refs) {
    if (ref.startsWith("media://")) fail(file, `발행 전 이미지 자리표시자가 남았습니다: ${ref}`);
    if (!ref.startsWith(`https://huggingface.co/datasets/${catalog.repo}/resolve/main/${catalog.objectPrefix}/`)) {
      fail(file, `Hugging Face 콘텐츠 주소가 아닌 이미지 참조: ${ref}`);
    }
    if (!allowedUrls.has(ref)) fail(file, `catalog.json의 글 매핑 밖 이미지 참조: ${ref}`);
    if (isBodyImage && alt !== altByPostUrl.get(`${postId}|${ref}`)) {
      fail(file, `본문 대체 텍스트가 plan.json과 다릅니다: ${ref}`);
    }
    if (!isBodyImage) {
      const object = objectByPostUrl.get(`${postId}|${ref}`);
      if (!object) fail(file, `ogImage의 객체 메타를 찾을 수 없습니다: ${ref}`);
      if (meta.get("ogImageAlt") !== altByPostUrl.get(`${postId}|${ref}`)) {
        fail(file, "ogImageAlt가 plan.json의 alt와 다릅니다");
      }
      if (
        Number(meta.get("ogImageWidth")) !== object.width ||
        Number(meta.get("ogImageHeight")) !== object.height ||
        meta.get("ogImageType") !== object.mime
      ) {
        fail(file, "ogImage 크기 또는 MIME이 catalog.json과 다릅니다");
      }
      if (object.width * object.height < 50000) {
        fail(file, "ogImage는 검색 대표 이미지로 쓰기에는 해상도가 너무 작습니다");
      }
    }
    referencedMedia.add(ref);
  }
}

for (const slug of orderedSlugs) {
  if (!slugs.has(slug)) fail("blog/order.json", `목록의 글을 찾지 못했습니다: ${slug}`);
}
for (const slug of slugs.keys()) {
  if (!orderedSlugs.has(slug)) fail("blog/order.json", `${slug} 글에 공개 읽기 순서가 없습니다`);
}

const postSlugs = new Set(posts.map((file) => file.replace(/\.md$/, "")));
for (const [id, entry] of Object.entries(plan.assets)) {
  if (!postSlugs.has(entry.post)) fail("blog/media/plan.json", `${id}의 글 파일이 없습니다`);
}

for (const [id, url] of assetUrlById) {
  if (!referencedMedia.has(url)) fail("blog/media/catalog.json", `${id}가 글 본문이나 ogImage에서 쓰이지 않습니다`);
}

for (const id of Object.keys(codaroEmbeds.examples)) {
  if (!referencedCodaroEmbeds.has(id)) {
    fail("blog/embeds/codaro-cells.json", `${id}가 어떤 글에서도 쓰이지 않습니다`);
  }
}

console.log(`blog check: ${posts.length} post${posts.length === 1 ? "" : "s"}`);
