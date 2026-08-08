/**
 * skills/specs/**\/*.md 의 frontmatter 와 링크를 검사한다.
 *
 * 이 저장소의 실제 실패 방식은 문서가 실물보다 낡는 것이다. 규격을 기계로 잡아
 * 최소한 id, 경로, 링크가 어긋나는 것은 막는다. 내용의 진실성은 검사하지 못한다.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SKILLS = join(REPO, "skills");
const SPECS = join(SKILLS, "specs");

const REQUIRED = ["id", "title", "category", "purpose", "whenToUse"];
const CATEGORIES = new Set(["start", "operation"]);
const BANNED = [
  { re: /—/, why: "em dash (U+2014)" },
  { re: /–/, why: "en dash (U+2013)" },
  { re: /(세요|십시오|ㅂ시다|해라|하자)\.(?=\s|$)/, why: "명령형·청유형 뒤 마침표" },
];

const errors = [];
const seen = new Map();

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** 얕은 YAML 파서. 문자열과 문자열 배열만 다룬다. */
function frontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) {
    errors.push(`${file}: frontmatter 가 없다`);
    return null;
  }
  const data = {};
  let key = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const item = raw.match(/^\s+-\s+(.*)$/);
    if (item && key) {
      (data[key] ||= []).push(item[1].trim());
      continue;
    }
    const kv = raw.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      data[key] = kv[2].trim() === "" ? [] : kv[2].trim();
    }
  }
  return data;
}

if (!existsSync(SPECS)) {
  console.error("skills/specs 가 없다");
  process.exit(1);
}

const files = [join(SKILLS, "README.md"), ...walk(SPECS)];

for (const file of files) {
  const rel = relative(REPO, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");

  for (const { re, why } of BANNED) {
    if (re.test(text)) errors.push(`${rel}: ${why}`);
  }

  const fm = frontmatter(text, rel);
  if (!fm) continue;

  for (const field of REQUIRED) {
    const v = fm[field];
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
      errors.push(`${rel}: frontmatter 에 ${field} 가 비어 있다`);
    }
  }

  if (fm.category && !CATEGORIES.has(fm.category)) {
    errors.push(`${rel}: category 가 ${[...CATEGORIES].join(" 또는 ")} 가 아니다`);
  }

  // 경로에서 유도한 id 와 일치해야 한다.
  if (rel !== "skills/README.md") {
    const parts = rel.replace(/^skills\/specs\//, "").replace(/\.md$/, "").split("/");
    const expected = parts.join(".");
    if (fm.id !== expected) {
      errors.push(`${rel}: id 가 경로와 다르다. 기대 ${expected}, 실제 ${fm.id}`);
    }
    if (fm.category && parts[0] !== fm.category) {
      errors.push(`${rel}: category 가 디렉터리와 다르다`);
    }
  }

  if (fm.id) {
    if (seen.has(fm.id)) errors.push(`${rel}: id 중복 (${seen.get(fm.id)})`);
    else seen.set(fm.id, rel);
  }

  // 저장소 안 상대 링크가 실제 파일을 가리키는지 확인한다.
  const body = text.slice(text.indexOf("---", 3) + 3);
  for (const [, target] of body.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split("#")[0];
    if (!clean) continue;
    if (!existsSync(resolve(dirname(file), clean))) {
      errors.push(`${rel}: 깨진 링크 ${target}`);
    }
  }
}

if (errors.length) {
  console.error(`skills 검사 실패 ${errors.length} 건`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}

console.log(`skills ok: ${files.length} 문서, id ${seen.size} 개`);
