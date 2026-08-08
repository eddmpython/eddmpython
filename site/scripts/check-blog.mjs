import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const blogDir = resolve(process.cwd(), "../blog");
const postName = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const requiredMeta = [
  "title",
  "date",
  "summary",
  "readerQuestion",
  "readerTakeaway",
];
const allowedDocs = new Set(["PIPELINE.md"]);

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

const names = await readdir(blogDir);
const markdown = names.filter((name) => name.endsWith(".md"));
const unknown = markdown.filter((name) => !postName.test(name) && !allowedDocs.has(name));
if (unknown.length) {
  fail("blog", `발행 글이나 운영 문서로 분류되지 않은 파일: ${unknown.join(", ")}`);
}

const posts = markdown.filter((name) => postName.test(name)).sort();
if (!posts.length) fail("blog", "발행 글이 한 편도 없습니다");

const titles = new Map();
for (const file of posts) {
  const raw = await readFile(resolve(blogDir, file), "utf8");
  const { meta, body } = parseFrontmatter(file, raw);
  const fileDate = file.match(postName)[1];

  if (!validDate(meta.get("date"))) fail(file, "date가 유효한 YYYY-MM-DD 형식이 아닙니다");
  if (meta.get("date") !== fileDate) fail(file, "파일명 날짜와 date가 다릅니다");
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
}

console.log(`blog check: ${posts.length} post${posts.length === 1 ? "" : "s"}`);
