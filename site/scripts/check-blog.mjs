import { existsSync } from "node:fs";
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

/*
 * 글 하나가 폴더 하나다.
 *
 * ```
 * blog/posts/003-python-qr/
 *   index.md      글
 *   media.json    이 글의 이미지 계획
 *   tool/         이 글이 품는 도구
 *   cells.json    이 글의 실습 칸 (선택)
 * ```
 *
 * 그 글에 딸린 것은 전부 그 폴더 안에 있다. 그래서 이 검사기도 전역 목록 파일을 읽지 않고
 * 폴더를 훑는다. 2026-08-24 전에는 이미지 계획이 `blog/media/plan.json`, 도구 등록이
 * `blog/embeds/tools.json`, 실습 칸이 `blog/embeds/codaro-cells.json` 에 따로 있었다.
 */
// 인자로 폴더 이름이나 파일 경로를 주면 그 한 편만 검사한다. 글을 쓰는 동안 도는 게이트다.
// 인자가 없으면 전편을 검사한다. STRICT 로 꺼지는 다섯 개만 빠지고 문장 품질도 함께 잰다.
// 경로를 통째로 받아도 되게 슬래시와 역슬래시 둘 다 자른다. PowerShell 이 역슬래시를 준다.
const rawTarget = process.argv[2]
  ? process.argv[2].split(/[\\/]/).filter((part) => part && part !== "index.md").pop()
  : null;
const targetPost = rawTarget ? rawTarget.replace(/\.md$/, "") : null;
const STRICT = Boolean(targetPost);

const blogDir = resolve(process.cwd(), "../blog");
const postsDirName = "posts";
const postsDir = resolve(blogDir, postsDirName);
/** 글 폴더 이름. 앞의 세 자리가 발행 순번이자 미디어 키다. */
const postFolder = /^(\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
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
/** 글 본문의 이름. 폴더가 글이므로 본문 파일 이름은 하나로 고정한다. */
const articleName = "index.md";
/** 이 글의 이미지 계획. 예전 blog/media/plan.json 의 이 글 몫이다. */
const mediaName = "media.json";
/** 이 글이 품는 도구. 이 파일이 있으면 등록된 것이다. */
const toolEntry = "tool/index.tsx";
/** 이 글의 실습 칸. 없어도 된다. */
const cellsName = "cells.json";
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
const toolRef = /^https:\/\/eddmpython\.com\/tool\/([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

/** 자산 계획이 적힌 자리. 이제 글마다 자기 폴더의 media.json 을 갖는다. */
function planLabel(id) {
  return planFileOf.get(id) ?? `blog/${postsDirName}/*/${mediaName}`;
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
      if (!rel && entry.name !== postsDirName) continue;
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

/*
 * 글 폴더를 훑어 이 저장소의 글을 찾는다.
 *
 * 폴더가 곧 글이라 등록부가 없다. 폴더 이름이 발행 순번이자 미디어 키이고, 그 안의 것들은
 * 전부 그 글의 소유다. 어느 폴더에 무엇이 있는지도 여기서 한 번에 모은다.
 */
const postDirs = [];
for (const entry of await readdir(postsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (!postFolder.test(entry.name)) {
    fail(`blog/${postsDirName}`, `글 폴더 이름은 세 자리 순번으로 시작합니다: ${entry.name}`);
  }
  const dir = join(postsDir, entry.name);
  const names = await readdir(dir);
  if (!names.includes(articleName)) {
    fail(`blog/${postsDirName}/${entry.name}`, `글 본문 ${articleName} 이 없습니다`);
  }
  if (!names.includes(mediaName)) {
    fail(`blog/${postsDirName}/${entry.name}`, `이미지 계획 ${mediaName} 이 없습니다`);
  }
  postDirs.push({
    id: entry.name,
    sequence: Number(entry.name.match(postFolder)[1]),
    dir,
    /** 폴더 이름에서 순번을 뗀 것이 이 글이 품는 도구의 이름이다. */
    toolId: entry.name.replace(/^\d{3}-/, ""),
    hasTool: existsSync(join(dir, "tool", "index.tsx")),
    hasCells: names.includes(cellsName),
  });
}
postDirs.sort((a, b) => a.sequence - b.sequence);
for (const [index, post] of postDirs.entries()) {
  if (post.sequence !== index + 1) {
    fail(`blog/${postsDirName}/${post.id}`, `폴더 순번은 001부터 빈 번호 없이 이어져야 합니다: ${post.sequence}`);
  }
}

/** 등록된 도구 이름. `tool/index.tsx` 를 둔 글 폴더가 곧 등록이다. */
const toolIds = new Set(postDirs.filter((post) => post.hasTool).map((post) => post.toolId));

/*
 * 이미지 계획을 글 폴더마다 읽어 하나로 모은다.
 *
 * 자산 id 는 `<글 폴더>/<키>` 이고 이 모양은 catalog 와 교안이 함께 쓰는 계약이라 그대로 둔다.
 * 달라진 것은 계획이 적힌 자리뿐이다. 전역 plan.json 하나가 아니라 각 글이 자기 것을 들고 있다.
 */
const plan = { version: 2, promptContract: "section-grounded-v2", assets: {} };
const planFileOf = new Map();
for (const post of postDirs) {
  const label = `blog/${postsDirName}/${post.id}/${mediaName}`;
  const media = await loadJson(join(post.dir, mediaName), label);
  if (media.version !== 1 || media.promptContract !== "section-grounded-v2" || !media.assets) {
    fail(label, "version 또는 promptContract 또는 assets 계약이 잘못됐습니다");
  }
  for (const [key, entry] of Object.entries(media.assets)) {
    plan.assets[`${post.id}/${key}`] = { ...entry, post: post.id, assetKey: key };
    planFileOf.set(`${post.id}/${key}`, label);
  }
}

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
/*
 * 실습 칸도 글 폴더가 소유한다.
 *
 * 예전에는 `blog/embeds/codaro-cells.json` 하나에 전부 모여 있었다. 어느 글의 칸인지 파일만
 * 봐서는 알 수 없었고, 글을 지워도 칸은 남았다. 이제 글 폴더의 `cells.json` 이고 사이트가
 * 그것들을 모아 읽는다. 이름은 글 사이에서 겹치면 안 되므로 여기서 함께 본다.
 */
const codaroEmbeds = { version: 1, examples: {} };
for (const post of postDirs) {
  if (!post.hasCells) continue;
  const label = `blog/${postsDirName}/${post.id}/${cellsName}`;
  const cells = await loadJson(join(post.dir, cellsName), label);
  if (cells.version !== 1 || !cells.examples || typeof cells.examples !== "object") {
    fail(label, "version 또는 examples 계약이 잘못됐습니다");
  }
  for (const [id, example] of Object.entries(cells.examples)) {
    if (codaroEmbeds.examples[id]) fail(label, `실습 칸 이름이 다른 글과 겹칩니다: ${id}`);
    codaroEmbeds.examples[id] = example;
  }
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
  fail(`blog/${postsDirName}/*/${cellsName}`, "version 또는 examples 계약이 잘못됐습니다");
}
for (const [id, example] of Object.entries(codaroEmbeds.examples)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !example || typeof example !== "object") {
    fail(`blog/${postsDirName}/*/${cellsName}`, `올바르지 않은 example id: ${id}`);
  }
  const required = ["title", "description", "code", "hint", "fullUrl"];
  const missing = required.filter((key) => !String(example[key] ?? "").trim());
  if (missing.length) {
    fail(`blog/${postsDirName}/*/${cellsName}`, `${id} 필드가 비었습니다: ${missing.join(", ")}`);
  }
  if (!String(example.fullUrl).startsWith("https://eddmpython.com/codaro/run/")) {
    fail(`blog/${postsDirName}/*/${cellsName}`, `${id}의 fullUrl이 Codaro Web Run이 아닙니다`);
  }
}

for (const [id, entry] of Object.entries(plan.assets)) {
  const match = id.match(assetId);
  if (!match || !entry || typeof entry !== "object") {
    fail(planLabel(id), `올바르지 않은 asset id: ${id}`);
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
  if (missing.length) fail(planLabel(id), `${id} 필드가 비었습니다: ${missing.join(", ")}`);
  if (entry.post !== match[1] || entry.assetKey !== match[2]) {
    fail(planLabel(id), `${id}의 post 또는 assetKey가 id와 다릅니다`);
  }
  if (
    entry.role === "section" &&
    !["H3 부제 바로 뒤", "H2 제목 바로 뒤"].includes(entry.placement)
  ) {
    fail(planLabel(id), `${id}의 placement는 H3 부제 바로 뒤 또는 H2 제목 바로 뒤여야 합니다`);
  }
  if (entry.sourcePolicy !== "auto") fail(planLabel(id), `${id}의 sourcePolicy는 auto여야 합니다`);
  if (!["hero", "section", "support"].includes(entry.role)) {
    fail(planLabel(id), `${id}의 role을 지원하지 않습니다`);
  }
  if (entry.role === "section" && !String(entry.sectionHeading ?? "").trim()) {
    fail(planLabel(id), `${id}의 sectionHeading이 비었습니다`);
  }
  if (!["imagegen", "screenshot", "official", "licensed", "recording"].includes(entry.sourceKind)) {
    fail(planLabel(id), `${id}의 sourceKind를 지원하지 않습니다`);
  }
  const expectedProfiles =
    entry.sourceKind === "imagegen"
      ? new Set(["dark-editorial-v1", "eddmpython-dark-v2"])
      : entry.sourceKind === "screenshot"
        ? new Set(["product-screen-v1"])
        : new Set(["source-original-v1"]);
  if (!expectedProfiles.has(entry.visualProfile)) {
    fail(planLabel(id), `${id}의 visualProfile을 지원하지 않습니다`);
  }
  if (entry.sourceKind === "imagegen" && !String(entry.prompt ?? "").trim()) {
    fail(planLabel(id), `${id}의 ImageGen prompt가 비었습니다`);
  }
  const imagePolicyIssues = lintImagePolicy(entry);
  if (imagePolicyIssues.length) {
    fail(
      planLabel(id),
      `${id}의 생성 이미지 색상 정책 위반 ${imagePolicyIssues.length}건\n${imagePolicyIssues
        .map((issue) => `  - ${issue.location}: ${issue.message} (${issue.excerpt})`)
        .join("\n")}`,
    );
  }
  if (entry.sourceKind === "screenshot") {
    if (!String(entry.sourceUrl ?? "").trim() || !String(entry.captureState ?? "").trim()) {
      fail(planLabel(id), `${id}의 screenshot sourceUrl 또는 captureState가 비었습니다`);
    }
  }
  if (["official", "licensed"].includes(entry.sourceKind)) {
    if (!String(entry.sourceUrl ?? "").trim() || !String(entry.credit ?? "").trim()) {
      fail(planLabel(id), `${id}의 sourceUrl 또는 credit이 비었습니다`);
    }
  }
  if (entry.sourceKind === "licensed" && !String(entry.license ?? "").trim()) {
    fail(planLabel(id), `${id}의 license가 비었습니다`);
  }
  if (entry.sourceKind === "recording") {
    if (!String(entry.captureState ?? "").trim() || !String(entry.credit ?? "").trim()) {
      fail(planLabel(id), `${id}의 recording captureState 또는 credit이 비었습니다`);
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
  if (!catalog.assets[id]) fail(planLabel(id), `${id}가 아직 Hugging Face에 발행되지 않았습니다`);
}

/*
 * 글은 폴더가 정본이라 여기서는 딸린 문서만 본다.
 *
 * 글 폴더 안의 다른 파일은 그 글의 소유라 막지 않는다. 도구 소스도 템플릿도 그 글의 것이다.
 * 막는 것은 어느 글에도 속하지 않는 떠도는 문서뿐이다.
 */
for (const doc of await collectMarkdownDocs(blogDir)) {
  const segments = doc.relPath.split("/");
  if (segments.length === 1) {
    if (doc.name !== "README.md") fail(doc.relPath, "블로그 루트에는 README.md 만 둡니다");
    continue;
  }
  if (segments[0] !== postsDirName) {
    fail(doc.relPath, `글과 딸린 문서는 ${postsDirName}/<글 폴더>/ 안에 둡니다`);
  }
}

const posts = postDirs.map((post) => ({
  ...post,
  name: post.id,
  relPath: `${postsDirName}/${post.id}/${articleName}`,
  abs: join(post.dir, articleName),
}));
// 빈 블로그를 허용한다. 단편을 그때그때 올리는 구조라 글이 없는 구간이 정상이다.
if (targetPost && !posts.length) fail("blog", `${targetPost} 를 찾지 못했습니다`);

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
  if (meta.has("date") || meta.has("modified")) {
    fail(file, "발행 날짜 대신 폴더 순번만 사용합니다");
  }

  /*
   * 이 글이 품는 도구는 이 글의 폴더에 있어야 한다.
   *
   * 마커 이름은 폴더 이름에서 순번을 뗀 것이라 남의 글 도구를 부를 수 없다. 부르려면 그
   * 도구를 자기 폴더로 가져오거나 공용으로 빼야 한다. 그래야 폴더 하나가 글 하나를 온전히
   * 소유한다는 말이 유지된다.
   */
  if (post.hasTool && !new RegExp(`/tool/${post.toolId}\s*$`, "m").test(body)) {
    fail(file, `${toolEntry} 를 두고 본문에서 부르지 않았습니다: /tool/${post.toolId}`);
  }

  /*
   * 아카이브는 글 파일이 스스로 들고 있는다.
   *
   * 예전에는 `order.json` 의 `archived` 배열에 slug 를 옮겨 적었다. 글과 그 상태가 서로 다른
   * 파일에 있어서 한쪽만 고치면 조용히 어긋났다. 지금은 frontmatter 한 줄이고, 왜 뺐는지를
   * 안 적으면 나중에 되돌릴 근거가 없으므로 함께 요구한다.
   */
  if (meta.has("archived")) {
    if (meta.get("archived") !== "true") {
      fail(file, "archived 는 목록에서 뺄 때만 true 로 적습니다. 아니면 줄을 지웁니다");
    }
    if (!String(meta.get("archivedNote") ?? "").trim()) {
      fail(file, "왜 목록에서 뺐는지 archivedNote 에 적습니다");
    }
  } else if (meta.has("archivedNote")) {
    fail(file, "archivedNote 는 archived 가 true 인 글에만 씁니다");
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

  /*
   * 실행 칸과 도구 마커는 나타난 자리를 전부 본다.
   *
   * 예전에는 줄 단독으로 쓴 것만 등록 목록과 대조하고, 그런 줄이 하나도 없을 때만 형식을
   * 나무랐다. 그래서 정상 마커가 한 줄이라도 있으면 문장 안에 섞인 미등록 id 는 검사도 형식
   * 지적도 받지 않고 그대로 나갔다. 사이트는 줄 단독일 때만 컴포넌트로 바꾸므로 섞여 들어간
   * 것은 화면에 생 주소로 찍힌다. 등록 여부와 줄 단독 여부를 따로 센다.
   */
  const embedKinds = [
    {
      label: "Codaro 실습 셀",
      any: /https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9-]*)/g,
      line: codaroEmbedRef,
      known: (id) => Boolean(codaroEmbeds.examples[id]),
      seen: referencedCodaroEmbeds,
    },
    {
      label: "도구",
      any: /https:\/\/eddmpython\.com\/tool\/([a-z0-9-]*)/g,
      line: toolRef,
      known: (id) => toolIds.has(id),
      seen: null,
    },
  ];
  for (const kind of embedKinds) {
    kind.any.lastIndex = 0;
    kind.line.lastIndex = 0;
    const all = [...body.matchAll(kind.any)];
    for (const match of all) {
      const id = match[1];
      if (!id || !kind.known(id)) fail(file, `등록되지 않은 ${kind.label}: ${id || "(빈 id)"}`);
      if (kind.seen) kind.seen.add(id);
    }
    const standalone = [...body.matchAll(kind.line)].length;
    kind.line.lastIndex = 0;
    if (all.length !== standalone) {
      fail(file, `${kind.label} URL은 다른 내용 없는 한 줄로 둡니다`);
    }
  }

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
  /*
   * hero 이미지의 계획이 본문과 붙어 있는지 본다.
   *
   * 섹션 이미지는 sectionHeading 과 contentAnchor 를 본문과 대조받는데 hero 는 절에 매이지
   * 않아서 그 검사를 하나도 안 받았다. 2026-08-24 에 003 의 본문 문장을 고치면서 계획의
   * contentAnchor 가 실제로 죽었고 게이트 아홉 개가 전부 초록불을 냈다. 계획이 본문을
   * 가리키지 못하면 다음에 이미지를 다시 만들 때 엉뚱한 장면이 나온다.
   */
  for (const [id, entry] of Object.entries(plan.assets)) {
    if (entry.post !== postId || entry.role !== "hero") continue;
    const anchor = String(entry.contentAnchor ?? "").trim();
    if (!anchor) fail(file, `${id} 의 hero 계획에 contentAnchor 가 비었습니다`);
    if (!body.includes(anchor)) {
      fail(file, `${id} 의 hero 계획 contentAnchor 가 본문에 없습니다: ${anchor.slice(0, 40)}`);
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
  const postSlugs = new Set(posts.map((post) => post.id));
  for (const [id, entry] of Object.entries(plan.assets)) {
    if (!postSlugs.has(entry.post)) fail(planLabel(id), `${id}의 글 파일이 없습니다`);
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
      fail(`blog/${postsDirName}/*/${cellsName}`, `${id}가 어떤 글에서도 쓰이지 않습니다`);
    }
  }
}

console.log(
  targetPost ? `post check: ${targetPost}` : `blog check: ${posts.length} posts`,
);
