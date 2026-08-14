import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "https://eddmpython.com";
const repoRoot = resolve(process.cwd(), "..");
const blogRoot = resolve(repoRoot, "blog");
const distRoot = resolve(repoRoot, "../eddmpython.out/site-dist");
const postName = /^(20\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

function fail(scope, message) {
  throw new Error(`${scope}: ${message}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function one(html, pattern, scope, label) {
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) fail(scope, `${label} 항목이 ${matches.length}개입니다`);
  return matches[0][1];
}

function meta(html, kind, key, scope) {
  return decodeHtml(one(
    html,
    new RegExp(
      `<meta\\s+${kind}="${escapeRegExp(key)}"\\s+content="([^"]*)"\\s*/>`,
      "g",
    ),
    scope,
    `${kind}=${key}`,
  ));
}

function link(html, rel, scope) {
  return decodeHtml(one(
    html,
    new RegExp(`<link\\s+rel="${rel}"\\s+href="([^"]*)"\\s*/>`, "g"),
    scope,
    `link rel=${rel}`,
  ));
}

function parseFrontmatter(file, raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) fail(file, "frontmatter를 읽을 수 없습니다");
  const result = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (field) result.set(field[1], field[2].trim());
  }
  return result;
}

function jsonLd(html, scope) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        fail(scope, `JSON-LD를 읽을 수 없습니다: ${error.message}`);
      }
    },
  );
}

function nodesOfType(value, type, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) nodesOfType(item, type, found);
  } else if (value && typeof value === "object") {
    if (value["@type"] === type) found.push(value);
    for (const child of Object.values(value)) nodesOfType(child, type, found);
  }
  return found;
}

async function pageHtml(path) {
  const file = path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
  return readFile(resolve(distRoot, file), "utf8");
}

function checkShared(html, path) {
  const scope = path || "/";
  const expectedUrl = `${origin}${path}`;
  const title = one(html, /<title>([^<]+)<\/title>/g, scope, "title");
  const description = meta(html, "name", "description", scope);
  const canonical = link(html, "canonical", scope);
  const ogTitle = meta(html, "property", "og:title", scope);
  const ogDescription = meta(html, "property", "og:description", scope);
  const ogUrl = meta(html, "property", "og:url", scope);
  const ogImage = meta(html, "property", "og:image", scope);
  const ogSecureImage = meta(html, "property", "og:image:secure_url", scope);
  const ogImageType = meta(html, "property", "og:image:type", scope);
  const ogImageAlt = meta(html, "property", "og:image:alt", scope);
  const imageWidth = Number(meta(html, "property", "og:image:width", scope));
  const imageHeight = Number(meta(html, "property", "og:image:height", scope));
  const twitterTitle = meta(html, "name", "twitter:title", scope);
  const twitterDescription = meta(html, "name", "twitter:description", scope);
  const twitterImage = meta(html, "name", "twitter:image", scope);
  const twitterImageAlt = meta(html, "name", "twitter:image:alt", scope);
  const robots = meta(html, "name", "robots", scope);

  if (!title.trim() || !description.trim()) fail(scope, "title 또는 description이 비었습니다");
  if (canonical !== expectedUrl || ogUrl !== expectedUrl) {
    fail(scope, "canonical과 og:url이 현재 페이지 URL과 다릅니다");
  }
  if (ogDescription !== description || twitterDescription !== description) {
    fail(scope, "description, OG, Twitter 설명이 서로 다릅니다");
  }
  if (twitterTitle !== ogTitle || twitterImage !== ogImage || twitterImageAlt !== ogImageAlt) {
    fail(scope, "OG와 Twitter 공유 카드가 서로 다릅니다");
  }
  if (ogSecureImage !== ogImage || !ogImage.startsWith("https://")) {
    fail(scope, "대표 이미지가 하나의 HTTPS URL로 정규화되지 않았습니다");
  }
  if (!ogImageType.startsWith("image/") || imageWidth <= 0 || imageHeight <= 0) {
    fail(scope, "대표 이미지 MIME 또는 크기가 잘못됐습니다");
  }
  if (!ogImageAlt.trim()) fail(scope, "대표 이미지 대체 텍스트가 비었습니다");
  if (!robots.split(/,\s*/).includes("max-image-preview:large")) {
    fail(scope, "큰 검색 이미지 미리보기가 허용되지 않았습니다");
  }
  if (!html.includes('rel="alternate" type="application/rss+xml"')) {
    fail(scope, "RSS 자동 발견 링크가 없습니다");
  }
  if (html.includes("media://")) fail(scope, "미디어 자리표시자가 남았습니다");
  const structured = jsonLd(html, scope);
  if (!structured.length) fail(scope, "JSON-LD가 없습니다");
  if (nodesOfType(structured, "Organization").length !== 1) {
    fail(scope, "작성자 조직이 페이지 안에서 한 번 정의되지 않았습니다");
  }
  if (nodesOfType(structured, "WebSite").length !== 1) {
    fail(scope, "WebSite가 페이지 안에서 한 번 정의되지 않았습니다");
  }
  return { ogTitle, ogImage, ogImageAlt, imageWidth, imageHeight, structured };
}

const postFiles = (await readdir(blogRoot)).filter((name) => postName.test(name)).sort();
const postRoutes = [];
for (const file of postFiles) {
  const frontmatter = parseFrontmatter(
    file,
    await readFile(resolve(blogRoot, file), "utf8"),
  );
  const slug = frontmatter.get("slug");
  if (!slug) fail(file, "slug frontmatter가 없습니다");
  postRoutes.push({ file, slug, path: `/blog/${slug}` });
}
const pages = ["/", "/blog", ...postRoutes.map((post) => post.path)];
for (const path of pages) checkShared(await pageHtml(path), path);

const defaultImage = await readFile(resolve(distRoot, "og.png"));
if (
  !defaultImage.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
  defaultImage.readUInt32BE(16) !== 1200 ||
  defaultImage.readUInt32BE(20) !== 630
) {
  fail("og.png", "기본 공유 이미지가 선언한 1200x630 PNG와 다릅니다");
}

const blogHtml = await pageHtml("/blog");
const blogStructured = jsonLd(blogHtml, "/blog");
if (nodesOfType(blogStructured, "Blog").length !== 1) fail("/blog", "Blog 정의가 없습니다");
if (nodesOfType(blogStructured, "BreadcrumbList").length !== 1) {
  fail("/blog", "탐색 경로 구조화 데이터가 없습니다");
}

for (const { file, slug, path } of postRoutes) {
  const raw = await readFile(resolve(blogRoot, file), "utf8");
  const frontmatter = parseFrontmatter(file, raw);
  const html = await pageHtml(path);
  const card = checkShared(html, path);
  const article = nodesOfType(card.structured, "BlogPosting");
  const images = nodesOfType(card.structured, "ImageObject");
  const crumbs = nodesOfType(card.structured, "BreadcrumbList");
  if (article.length !== 1) fail(file, `BlogPosting이 ${article.length}개입니다`);
  if (images.length !== 1) fail(file, `ImageObject가 ${images.length}개입니다`);
  if (crumbs.length !== 1 || crumbs[0].itemListElement?.length !== 3) {
    fail(file, "홈, 블로그, 글로 이어지는 탐색 경로가 없습니다");
  }
  const posting = article[0];
  if (
    posting.headline !== frontmatter.get("title") ||
    posting.description !== frontmatter.get("summary") ||
    posting.datePublished !== frontmatter.get("date") ||
    posting.dateModified !== frontmatter.get("modified") ||
    posting.articleSection !== frontmatter.get("section")
  ) {
    fail(file, "BlogPosting이 frontmatter와 다릅니다");
  }
  if (card.ogTitle !== frontmatter.get("title")) {
    fail(file, "공유 카드 제목이 글 제목과 다릅니다");
  }
  if (
    card.ogImage !== frontmatter.get("ogImage") ||
    card.ogImageAlt !== frontmatter.get("ogImageAlt") ||
    card.imageWidth !== Number(frontmatter.get("ogImageWidth")) ||
    card.imageHeight !== Number(frontmatter.get("ogImageHeight"))
  ) {
    fail(file, "공유 카드 이미지가 frontmatter와 다릅니다");
  }
  if (
    meta(html, "property", "article:published_time", file) !== frontmatter.get("date") ||
    meta(html, "property", "article:modified_time", file) !== frontmatter.get("modified") ||
    meta(html, "property", "article:section", file) !== frontmatter.get("section") ||
    meta(html, "name", "author", file) !== frontmatter.get("author")
  ) {
    fail(file, "Article 메타가 frontmatter와 다릅니다");
  }
}

const sitemap = await readFile(resolve(distRoot, "sitemap.xml"), "utf8");
if ((sitemap.match(/<loc>/g) ?? []).length !== pages.length) {
  fail("sitemap.xml", "페이지 수와 URL 수가 다릅니다");
}
if (/<loc>https:\/\/eddmpython\.com\/<\/loc>\s*<lastmod>/.test(sitemap)) {
  fail("sitemap.xml", "홈에 빌드 날짜를 수정일처럼 넣었습니다");
}
for (const { file, path } of postRoutes) {
  const frontmatter = parseFrontmatter(file, await readFile(resolve(blogRoot, file), "utf8"));
  const url = `${origin}${path}`;
  if (!sitemap.includes(`<loc>${url}</loc>\n    <lastmod>${frontmatter.get("modified")}</lastmod>`)) {
    fail("sitemap.xml", `${file}의 실제 수정일이 없습니다`);
  }
}

const rss = await readFile(resolve(distRoot, "rss.xml"), "utf8");
if (!rss.includes(`atom:link href="${origin}/rss.xml" rel="self"`)) {
  fail("rss.xml", "자기 자신을 가리키는 Atom 링크가 없습니다");
}
if ((rss.match(/<item>/g) ?? []).length !== postFiles.length) {
  fail("rss.xml", "글 수와 item 수가 다릅니다");
}

const robots = await readFile(resolve(distRoot, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) {
  fail("robots.txt", "sitemap 위치가 없습니다");
}

console.log(`seo check: ${pages.length} pages, ${postFiles.length} article`);
