import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const origin = "https://eddmpython.com";
const repoRoot = resolve(process.cwd(), "..");
const blogRoot = resolve(repoRoot, "blog");
const contentRoot = resolve(blogRoot, "posts");
const distRoot = resolve(repoRoot, "../eddmpython.out/site-dist");
/** 글 폴더 이름. 앞의 세 자리가 발행 순번이다. */
const postName = /^(\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*)$/;
// 글은 blog/posts/<글 폴더>/index.md 다. 폴더가 곧 글이다.
const adsenseClient = "ca-pub-6438440376456212";
const adsenseScript = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

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

/** 글 하나가 폴더 하나다. blog/posts/<글 폴더>/index.md 가 본문이다. */
async function collectPosts(dir) {
  const posts = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !postName.test(entry.name)) continue;
    posts.push({
      file: `${entry.name}/index.md`,
      abs: join(dir, entry.name, "index.md"),
      name: entry.name,
    });
  }
  return posts.sort((a, b) => a.name.localeCompare(b.name));
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

const postFiles = await collectPosts(contentRoot);
const postRoutes = [];
for (const post of postFiles) {
  const frontmatter = parseFrontmatter(post.file, await readFile(post.abs, "utf8"));
  const slug = frontmatter.get("slug");
  if (!slug) fail(post.file, "slug frontmatter가 없습니다");
  postRoutes.push({ file: post.file, abs: post.abs, slug, path: `/blog/${slug}` });
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
for (const [path, html] of [["/", await pageHtml("/")], ["/blog", blogHtml]]) {
  if (html.includes(adsenseScript) || html.includes(adsenseClient)) {
    fail(path, "글 상세 밖에 AdSense 코드가 있습니다");
  }
}
if (nodesOfType(blogStructured, "Blog").length !== 1) fail("/blog", "Blog 정의가 없습니다");
if (nodesOfType(blogStructured, "BreadcrumbList").length !== 1) {
  fail("/blog", "탐색 경로 구조화 데이터가 없습니다");
}

for (const { file, abs, slug, path } of postRoutes) {
  const raw = await readFile(abs, "utf8");
  const frontmatter = parseFrontmatter(file, raw);
  const html = await pageHtml(path);
  const adScripts = [...html.matchAll(/<script async src="([^"]+)" crossorigin="anonymous"><\/script>/g)]
    .map((match) => match[1])
    .filter((src) => src.startsWith(adsenseScript));
  if (adScripts.length !== 1 || new URL(adScripts[0]).searchParams.get("client") !== adsenseClient) {
    fail(file, "승인된 AdSense 코드가 글 상세 head에 한 번 들어 있지 않습니다");
  }
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
    posting.articleSection !== frontmatter.get("section")
  ) {
    fail(file, "BlogPosting이 frontmatter와 다릅니다");
  }
  if ("datePublished" in posting || "dateModified" in posting) {
    fail(file, "BlogPosting에 날짜가 남아 있습니다");
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
    meta(html, "property", "article:section", file) !== frontmatter.get("section") ||
    meta(html, "name", "author", file) !== frontmatter.get("author")
  ) {
    fail(file, "Article 메타가 frontmatter와 다릅니다");
  }
  if (html.includes("article:published_time") || html.includes("article:modified_time")) {
    fail(file, "Article 메타에 날짜가 남아 있습니다");
  }
}

const sitemap = await readFile(resolve(distRoot, "sitemap.xml"), "utf8");
if ((sitemap.match(/<loc>/g) ?? []).length !== pages.length) {
  fail("sitemap.xml", "페이지 수와 URL 수가 다릅니다");
}
if (sitemap.includes("<lastmod>")) {
  fail("sitemap.xml", "날짜가 남아 있습니다");
}

const rss = await readFile(resolve(distRoot, "rss.xml"), "utf8");
if (!rss.includes(`atom:link href="${origin}/rss.xml" rel="self"`)) {
  fail("rss.xml", "자기 자신을 가리키는 Atom 링크가 없습니다");
}
if ((rss.match(/<item>/g) ?? []).length !== postFiles.length) {
  fail("rss.xml", "글 수와 item 수가 다릅니다");
}
if (rss.includes("<pubDate>") || rss.includes("<lastBuildDate>")) {
  fail("rss.xml", "날짜가 남아 있습니다");
}

const robots = await readFile(resolve(distRoot, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) {
  fail("robots.txt", "sitemap 위치가 없습니다");
}

const ads = await readFile(resolve(distRoot, "ads.txt"), "utf8");
if (ads.trim() !== "google.com, pub-6438440376456212, DIRECT, f08c47fec0942fa0") {
  fail("ads.txt", "승인된 Google 판매자 선언과 다릅니다");
}

console.log(`seo check: ${pages.length} pages, ${postFiles.length} article`);
