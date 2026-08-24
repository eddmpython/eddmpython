import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { lintBlogStyle, lintProseTexture, lintSourceWrapping } from "./blog-style.mjs";
import {
  h2Sections,
  lintImageBrief,
  lintImagePolicy,
  lintSectionPackages,
  lintSeoPackage,
  parseSectionParts,
} from "./blog-package.mjs";

// 인자로 파일을 주면 그 한 편만 검사한다. 글을 쓰는 동안 도는 게이트다.
// 인자가 없으면 전편을 검사한다. STRICT 로 꺼지는 다섯 개만 빠지고 문장 품질도 함께 잰다.
// 경로를 통째로 받아도 되게 슬래시와 역슬래시 둘 다 자른다. PowerShell 이 역슬래시를 준다.
const targetPost = process.argv[2] ? process.argv[2].split(/[\\/]/).pop() : null;
const STRICT = Boolean(targetPost);

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
  // 썸네일은 모든 글에 반드시 있다. 공유 카드, 구글 Article 이미지, /blog 목록 썸네일이
  // 전부 여기서 나온다. 이미지가 있는 글에만 걸던 조건부 규칙을 전 글 필수로 올렸다.
  "ogImage",
  "ogImageAlt",
  "ogImageWidth",
  "ogImageHeight",
  "ogImageType",
];
const readerLevels = new Set(["beginner", "working", "advanced"]);
// 글과 카테고리 문서는 blog/content 아래에만 있다. 나머지는 기계라 걷지 않는다.
const contentDirName = "content";
const rootDocs = new Set(["README.md"]);
const categoryDocs = new Set(["README.md"]);
// 공개 작업 환경 템플릿은 01-ai-workflow 카테고리가 소유한다. 이 세 파일은 글도 카테고리
// 문서도 아니지만 발행 글이 설명하는 산출물이라 카테고리 폴더 안에 둔다. 정확히 이 이름만 연다.
const templateDirName = "agent-template";
const templateDocs = new Set(["README.md", "AGENTS.md", "CLAUDE.md"]);
const publicSlug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/**
 * 카테고리는 앞에 두 자리 번호를 붙인다.
 *
 * 폴더 이름이 곧 카테고리 slug 라서 번호가 없으면 `content/` 아래에서 읽는 순서가 안 보인다.
 * 교안은 `curriculum/01-...` 으로 이미 번호를 쓰고 있었고 블로그만 빠져 있었다.
 * 이 slug 는 공개 주소에 나오지 않는다. 글 주소는 `/blog/<글 slug>` 하나뿐이고
 * 카테고리는 `/blog` 목록에서 묶는 데만 쓰인다. 그래서 번호를 붙여도 주소가 바뀌지 않는다.
 */
const categorySlug = /^\d{2}-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
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
  ".mp4",
  ".webm",
  ".mov",
]);
// 두 자리와 세 자리를 모두 받는다. catalog 는 공개 블로그와 교안이 함께 쓴다.
// 블로그 글은 전체에서 이어지는 세 자리, 교안 글은 카테고리마다 다시 세는 두 자리다.
const assetId = /^(\d{2,3}-[a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const sha256 = /^[0-9a-f]{64}$/;
const mimeBySuffix = new Map([
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".gif", "image/gif"],
  [".mp4", "video/mp4"],
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

async function collectMarkdownDocs(dir, rel = "") {
  const docs = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!rel && entry.name !== contentDirName) continue;
      docs.push(...(await collectMarkdownDocs(abs, relPath)));
      continue;
    }
    if (entry.name.endsWith(".md")) docs.push({ name: entry.name, relPath, abs });
  }
  return docs;
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

/**
 * 교안 카테고리의 이미지 계획.
 *
 * catalog 는 공개 블로그와 비공개 교안이 함께 쓴다. 교안 계획은 형제 저장소에 있어서 이 검사가
 * 못 보는데, 그러면 교안이 발행한 자산이 전부 "계획이 없습니다" 로 걸린다. 형제 저장소가 없는
 * 환경(CI, 새 클론)에서는 그냥 비워 두고 catalog 대조에서 그 항목을 건너뛴다.
 */
const coursePlans = {};
{
  const courseRoot = resolve(blogDir, "../../eddmpython-course/curriculum");
  try {
    for (const entry of await readdir(courseRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try {
        const one = JSON.parse(await readFile(join(courseRoot, entry.name, "plan.json"), "utf8"));
        Object.assign(coursePlans, one.assets ?? {});
      } catch {
        /* 그 카테고리에 계획이 없다 */
      }
    }
  } catch {
    /* 형제 저장소가 없는 환경이다 */
  }
}
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
// 글이 하나도 없는 상태를 허용한다. 2026-08-19 에 커리큘럼을 유료 강의로 옮기면서
// 블로그가 비었다. 블로그는 이제 그때그때 올리는 단편이라 빈 구간이 정상이다.
if (
  blogOrder.version !== 3 ||
  !Array.isArray(blogOrder.categories) ||
  !Array.isArray(blogOrder.posts) ||
  !Array.isArray(blogOrder.archived)
) {
  fail("blog/order.json", "version 또는 categories 또는 posts 또는 archived 계약이 잘못됐습니다");
}

// 카테고리 하나가 강의 한 묶음이다. 공개 URL 은 /blog/{slug} 그대로이며 카테고리는
// 목록에서 묶는 데만 쓴다. 발행한 slug 는 바꾸지 않는다.
const categorySlugs = new Set();
let previousCategoryOrder = 0;
for (const entry of blogOrder.categories) {
  const slug = String(entry?.slug ?? "");
  const order = Number(entry?.order);
  if (!categorySlug.test(slug)) fail("blog/order.json", `카테고리 slug 는 두 자리 번호로 시작합니다: ${slug}`);
  if (categorySlugs.has(slug)) fail("blog/order.json", `카테고리 slug가 중복됐습니다: ${slug}`);
  if (!Number.isInteger(order) || order !== previousCategoryOrder + 1) {
    fail("blog/order.json", `카테고리 order가 1부터 빈 번호 없이 이어지지 않습니다: ${order}`);
  }
  if (!String(entry?.title ?? "").trim()) fail("blog/order.json", `${slug}의 title이 비었습니다`);
  const summary = String(entry?.summary ?? "").trim();
  if (summary.length < 20 || summary.length > 200) {
    fail("blog/order.json", `${slug}의 summary는 20자 이상 200자 이하로 씁니다`);
  }
  categorySlugs.add(slug);
  previousCategoryOrder = order;
}

// 아카이브한 글은 /blog 목록에서만 빠진다. URL 과 sitemap 은 그대로 둔다.
const archivedSlugs = new Set();
for (const entry of blogOrder.archived) {
  const slug = String(entry?.slug ?? "");
  if (!publicSlug.test(slug)) fail("blog/order.json", `올바르지 않은 archived slug: ${slug}`);
  if (archivedSlugs.has(slug)) fail("blog/order.json", `archived slug가 중복됐습니다: ${slug}`);
  if (!String(entry?.note ?? "").trim()) {
    fail("blog/order.json", `${slug}를 왜 목록에서 뺐는지 note에 적습니다`);
  }
  archivedSlugs.add(slug);
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
  if (archivedSlugs.has(slug)) fail("blog/order.json", `${slug}가 목록과 archived에 동시에 있습니다`);
  if (!categorySlugs.has(String(entry?.category ?? ""))) {
    fail("blog/order.json", `${slug}의 category가 categories에 없습니다: ${entry?.category}`);
  }
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
  if (
    entry.role === "section" &&
    !["H3 부제 바로 뒤", "H2 제목 바로 뒤"].includes(entry.placement)
  ) {
    fail("blog/media/plan.json", `${id}의 placement는 H3 부제 바로 뒤 또는 H2 제목 바로 뒤여야 합니다`);
  }
  if (entry.sourcePolicy !== "auto") fail("blog/media/plan.json", `${id}의 sourcePolicy는 auto여야 합니다`);
  if (!["hero", "section", "support"].includes(entry.role)) {
    fail("blog/media/plan.json", `${id}의 role을 지원하지 않습니다`);
  }
  if (entry.role === "section" && !String(entry.sectionHeading ?? "").trim()) {
    fail("blog/media/plan.json", `${id}의 sectionHeading이 비었습니다`);
  }
  if (!["imagegen", "screenshot", "official", "licensed", "recording"].includes(entry.sourceKind)) {
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
  if (entry.sourceKind === "recording") {
    if (!String(entry.captureState ?? "").trim() || !String(entry.credit ?? "").trim()) {
      fail("blog/media/plan.json", `${id}의 recording captureState 또는 credit이 비었습니다`);
    }
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
  if (!plan.assets[id] && !coursePlans[id]) {
    fail("blog/media/catalog.json", `${id}의 이미지 계획이 없습니다`);
  }
  if (record.post !== match[1] || record.assetKey !== match[2] || !sha256.test(record.sha256)) {
    fail("blog/media/catalog.json", `${id}의 post, assetKey 또는 SHA-256이 잘못됐습니다`);
  }
  const suffix = String(record.path ?? "").match(/(\.[a-z0-9]+)$/)?.[1] ?? "";
  const expectedPath = `${catalog.objectPrefix}/${record.sha256.slice(0, 2)}/${record.sha256}${suffix}`;
  if (![".webp", ".png", ".jpg", ".gif", ".mp4"].includes(suffix) || record.path !== expectedPath) {
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
  altByPostUrl.set(`${record.post}|${url}`, String((plan.assets[id] ?? coursePlans[id]).alt));
  objectByPostUrl.set(`${record.post}|${url}`, object);
  if (!urlsByPost.has(record.post)) urlsByPost.set(record.post, new Set());
  urlsByPost.get(record.post).add(url);
}

for (const id of Object.keys(plan.assets)) {
  if (!catalog.assets[id]) fail("blog/media/plan.json", `${id}가 아직 Hugging Face에 발행되지 않았습니다`);
}

const markdownDocs = await collectMarkdownDocs(blogDir);
for (const doc of markdownDocs) {
  if (postName.test(doc.name)) continue;
  const segments = doc.relPath.split("/");
  const depth = segments.length;
  // blog/README.md 는 depth 1, blog/content/<카테고리>/README.md 는 depth 3 이다.
  // 템플릿은 content/<카테고리>/agent-template/<파일> 로 depth 4 이며 이름을 정확히 맞춘다.
  const isTemplateDoc =
    depth === 4 &&
    segments[0] === contentDirName &&
    segments[2] === templateDirName &&
    templateDocs.has(doc.name);
  const allowed =
    depth === 1
      ? rootDocs.has(doc.name)
      : (depth === 3 && categoryDocs.has(doc.name)) || isTemplateDoc;
  if (!allowed) {
    fail(doc.relPath, "발행 글이나 운영 문서로 분류되지 않은 파일입니다");
  }
}

const posts = markdownDocs
  .filter((doc) => postName.test(doc.name))
  .map((doc) => ({
    ...doc,
    sequence: Number(doc.name.match(postName)[1]),
    id: doc.name.replace(/\.md$/, ""),
  }))
  .sort((a, b) => a.sequence - b.sequence);
// 빈 블로그를 허용한다. 단편을 그때그때 올리는 구조라 글이 없는 구간이 정상이다.
if (targetPost && !posts.length) fail("blog", `${targetPost} 를 찾지 못했습니다`);
for (const [index, post] of posts.entries()) {
  if (post.sequence !== index + 1) {
    fail(post.relPath, `파일 순번은 001부터 빈 번호 없이 이어져야 합니다: ${post.sequence}`);
  }
}

const listedCategoryBySlug = new Map(blogOrder.posts.map((entry) => [entry.slug, entry.category]));
const titles = new Map();
const slugs = new Map();
const referencedMedia = new Set();
const referencedCodaroEmbeds = new Set();
const targetPosts = targetPost ? posts.filter((entry) => entry.name === targetPost) : posts;
if (targetPost && targetPosts.length === 0) {
  console.error(`post check: ${targetPost} 라는 글 파일이 없습니다`);
  console.error(`  있는 글: ${posts.map((entry) => entry.name).join(", ")}`);
  process.exit(1);
}
for (const post of targetPosts) {
  const file = post.relPath;
  const raw = await readFile(post.abs, "utf8");
  const { meta, body } = parseFrontmatter(file, raw);
  const postId = post.id;
  const slug = meta.get("slug");
  // relPath 는 content/<카테고리>/NNN-kebab.md 다. 카테고리는 두 번째 조각이다.
  const segments = file.split("/");
  if (segments.length !== 3 || segments[0] !== contentDirName) {
    fail(file, `발행 글은 ${contentDirName}/<카테고리>/ 안에 둡니다`);
  }
  const folder = segments[1];
  const listedCategory = listedCategoryBySlug.get(slug);
  if (listedCategory && folder !== listedCategory) {
    fail(file, `글 폴더 ${folder}와 category ${listedCategory}가 다릅니다`);
  }

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
  const metaObject = Object.fromEntries(meta);
  if ((body.match(/^```/gm) ?? []).length % 2 !== 0) fail(file, "코드 펜스가 닫히지 않았습니다");
  if (/[\u2013\u2014]/u.test(raw)) fail(file, "em dash 또는 en dash가 있습니다");
  if (/(?:세요|십시오|ㅂ시다|해라|하자)\.(?=\s|$)/u.test(raw)) {
    fail(file, "명령형 또는 권유형 문장 뒤에 마침표가 있습니다");
  }
  if (/\b(?:TODO|TBD)\b/.test(raw)) fail(file, "미완성 표식이 남았습니다");

  const packageIssues = [
    ...lintSeoPackage(metaObject, body, sections),
    ...lintSectionPackages(sections, {
      requireCodeLabels: STRICT,
      strictLead: false,
      openLabels: STRICT,
      checkLabels: STRICT,
    }),
  ];
  if (packageIssues.length) {
    fail(
      file,
      `글 패키지 검사 실패 ${packageIssues.length}건\n${packageIssues
        .map((issue) => `  - ${issue.location}: ${issue.message} (${issue.excerpt})`)
        .join("\n")}`,
    );
  }

  const styleIssues = [
    ...lintBlogStyle({
      fields: {
        summary: meta.get("summary"),
        readerTakeaway: meta.get("readerTakeaway"),
      },
      body,
      sections,
      strictAnchor: STRICT,
    }),
    ...(STRICT ? lintProseTexture(body) : []),
    ...lintSourceWrapping(body),
  ];
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
    const parsed = parseSectionParts(section);
    if (parsed.image) {
      const { alt, url, caption } = parsed.image;
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
      const briefIssues = lintImageBrief(entry, section, parsed, { requireSubtitle: false });
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
    }

    const prose = parsed.remainder
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#*_`>|\[\]-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (prose.length < 120) {
      fail(file, `섹션의 설명이 120자보다 짧습니다: ${section.heading}`);
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
      if (!String(object.mime).startsWith("image/")) {
        fail(file, "ogImage는 이미지여야 합니다");
      }
    }
    referencedMedia.add(ref);
  }
}

// 여기부터는 여러 글 사이의 관계다. 한 편만 검사할 때는 건너뛴다.
if (!targetPost) {
  for (const slug of orderedSlugs) {
    if (!slugs.has(slug)) fail("blog/order.json", `목록의 글을 찾지 못했습니다: ${slug}`);
  }
  for (const slug of slugs.keys()) {
    if (!orderedSlugs.has(slug) && !archivedSlugs.has(slug)) {
      fail("blog/order.json", `${slug} 글이 목록에도 archived에도 없습니다`);
    }
  }
  for (const slug of archivedSlugs) {
    if (!slugs.has(slug)) fail("blog/order.json", `archived에 없는 글이 있습니다: ${slug}`);
  }

  const postSlugs = new Set(posts.map((post) => post.id));
  for (const [id, entry] of Object.entries(plan.assets)) {
    if (!postSlugs.has(entry.post)) fail("blog/media/plan.json", `${id}의 글 파일이 없습니다`);
  }

  for (const [id, url] of assetUrlById) {
    // 교안 자산은 형제 비공개 저장소의 교안이 쓴다. 그쪽 게이트가 자기 자산을 본다.
    if (coursePlans[id]) continue;
    if (!referencedMedia.has(url)) {
      fail("blog/media/catalog.json", `${id}가 글 본문이나 ogImage에서 쓰이지 않습니다`);
    }
  }

  // 안 쓰는 실행 칸을 남겨 둔다. 미디어 객체와 같은 이유다. 글을 갈아엎어도 예제는 다시 쓴다.
  // 반대로 글이 없는 예제를 가리키는 것은 여전히 막는다.
  for (const id of []) {
    if (!referencedCodaroEmbeds.has(id)) {
      fail("blog/embeds/codaro-cells.json", `${id}가 어떤 글에서도 쓰이지 않습니다`);
    }
  }
}

console.log(
  targetPost ? `post check: ${targetPost}` : `blog check: ${posts.length} posts`,
);
