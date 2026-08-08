import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const blogDir = resolve(process.cwd(), "../blog");
const postName = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const requiredMeta = [
  "title",
  "date",
  "modified",
  "author",
  "section",
  "summary",
  "readerQuestion",
  "readerTakeaway",
];
const allowedDocs = new Set(["PIPELINE.md"]);
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
const assetId = /^(20\d{2}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const sha256 = /^[0-9a-f]{64}$/;
const mimeBySuffix = new Map([
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".gif", "image/gif"],
]);
const imageRef = /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

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

function validDate(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
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
if (plan.version !== 1 || !plan.assets || typeof plan.assets !== "object") {
  fail("blog/media/plan.json", "version 또는 assets 계약이 잘못됐습니다");
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

for (const [id, entry] of Object.entries(plan.assets)) {
  const match = id.match(assetId);
  if (!match || !entry || typeof entry !== "object") {
    fail("blog/media/plan.json", `올바르지 않은 asset id: ${id}`);
  }
  const required = [
    "post",
    "assetKey",
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
  if (entry.sourcePolicy !== "auto") fail("blog/media/plan.json", `${id}의 sourcePolicy는 auto여야 합니다`);
  if (!["imagegen", "official", "licensed"].includes(entry.sourceKind)) {
    fail("blog/media/plan.json", `${id}의 sourceKind를 지원하지 않습니다`);
  }
  if (entry.sourceKind === "imagegen" && !String(entry.prompt ?? "").trim()) {
    fail("blog/media/plan.json", `${id}의 ImageGen prompt가 비었습니다`);
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

const titles = new Map();
const referencedMedia = new Set();
for (const file of posts) {
  const raw = await readFile(resolve(blogDir, file), "utf8");
  const { meta, body } = parseFrontmatter(file, raw);
  const fileDate = file.match(postName)[1];

  if (!validDate(meta.get("date"))) fail(file, "date가 유효한 YYYY-MM-DD 형식이 아닙니다");
  if (!validDate(meta.get("modified"))) {
    fail(file, "modified가 유효한 YYYY-MM-DD 형식이 아닙니다");
  }
  if (meta.get("date") !== fileDate) fail(file, "파일명 날짜와 date가 다릅니다");
  if (meta.get("modified") < meta.get("date")) {
    fail(file, "modified가 최초 발행일보다 빠릅니다");
  }
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
  if (titles.has(meta.get("title"))) {
    fail(file, `${titles.get(meta.get("title"))}와 제목이 같습니다`);
  }
  titles.set(meta.get("title"), file);

  if (!body) fail(file, "본문이 비었습니다");
  if (/^[ \t]*# /m.test(body)) fail(file, "본문 H1은 쓰지 않습니다. 제목은 frontmatter가 맡습니다");
  if ((body.match(/^## /gm) ?? []).length < 3) fail(file, "독자 흐름을 나누는 H2가 3개보다 적습니다");
  if ((body.match(/^```/gm) ?? []).length % 2 !== 0) fail(file, "코드 펜스가 닫히지 않았습니다");
  if (/[\u2013\u2014]/u.test(raw)) fail(file, "em dash 또는 en dash가 있습니다");
  if (/\b(?:TODO|TBD)\b/.test(raw)) fail(file, "미완성 표식이 남았습니다");

  const slug = file.replace(/\.md$/, "");
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
  const allowedUrls = urlsByPost.get(slug) ?? new Set();
  for (const { url: ref, alt, body: isBodyImage } of refs) {
    if (ref.startsWith("media://")) fail(file, `발행 전 이미지 자리표시자가 남았습니다: ${ref}`);
    if (!ref.startsWith(`https://huggingface.co/datasets/${catalog.repo}/resolve/main/${catalog.objectPrefix}/`)) {
      fail(file, `Hugging Face 콘텐츠 주소가 아닌 이미지 참조: ${ref}`);
    }
    if (!allowedUrls.has(ref)) fail(file, `catalog.json의 글 매핑 밖 이미지 참조: ${ref}`);
    if (isBodyImage && alt !== altByPostUrl.get(`${slug}|${ref}`)) {
      fail(file, `본문 대체 텍스트가 plan.json과 다릅니다: ${ref}`);
    }
    if (!isBodyImage) {
      const object = objectByPostUrl.get(`${slug}|${ref}`);
      if (!object) fail(file, `ogImage의 객체 메타를 찾을 수 없습니다: ${ref}`);
      if (meta.get("ogImageAlt") !== altByPostUrl.get(`${slug}|${ref}`)) {
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

const postSlugs = new Set(posts.map((file) => file.replace(/\.md$/, "")));
for (const [id, entry] of Object.entries(plan.assets)) {
  if (!postSlugs.has(entry.post)) fail("blog/media/plan.json", `${id}의 글 파일이 없습니다`);
}

for (const [id, url] of assetUrlById) {
  if (!referencedMedia.has(url)) fail("blog/media/catalog.json", `${id}가 글 본문이나 ogImage에서 쓰이지 않습니다`);
}

console.log(`blog check: ${posts.length} post${posts.length === 1 ? "" : "s"}`);
