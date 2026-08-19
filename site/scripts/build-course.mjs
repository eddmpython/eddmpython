/**
 * course/curriculum 을 Worker 번들 전용 모듈로 굽는다.
 *
 * 교안은 유료 자료다. 클라이언트 번들(site-dist/assets/*.js)에 들어가면 강의장에 비밀번호를
 * 걸어도 본문이 이미 공개된 상태가 된다. Worker 코드는 브라우저로 내려가지 않으므로 여기에만
 * 넣는다. 인증을 통과한 요청에만 Worker 가 본문을 돌려준다.
 *
 * 산출물은 추적하지 않는다. course/ 가 없는 체크아웃에서는 빈 모듈을 쓴다.
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, "..");
const REPO = resolve(SITE, "..");
const CURRICULUM = join(REPO, "course", "curriculum");
const OUT = join(SITE, "course-content.generated.ts");

const postName = /^(\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const categoryName = /^(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const f = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (f) meta[f[1]] = f[2].trim();
  }
  return { meta, body: m[2].trim() };
}

const categories = [];

if (await exists(CURRICULUM)) {
  const entries = await readdir(CURRICULUM, { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!categoryName.test(entry.name)) continue;
    const dir = join(CURRICULUM, entry.name);
    const files = (await readdir(dir)).filter((n) => postName.test(n)).sort();
    const posts = [];
    for (const name of files) {
      const raw = await readFile(join(dir, name), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      posts.push({
        id: name.replace(/\.md$/, ""),
        title: meta.title ?? name,
        summary: meta.summary ?? "",
        body,
      });
    }
    // 카테고리 제목은 README 의 첫 H1 을 쓴다. 없으면 폴더 이름을 쓴다.
    let title = entry.name;
    const readme = join(dir, "README.md");
    if (await exists(readme)) {
      const first = (await readFile(readme, "utf8")).match(/^#\s+(.+)$/m);
      if (first) title = first[1].trim();
    }
    categories.push({ slug: entry.name, order: Number(entry.name.slice(0, 2)), title, posts });
  }
}

const header = `/* 자동 생성물. 고치지 마라. site/scripts/build-course.mjs 가 만든다.
   교안 본문이 들어 있다. Worker 번들에만 넣고 클라이언트 번들에 import 하지 마라. */\n`;
const types = `export type CoursePost = { id: string; title: string; summary: string; body: string };
export type CourseCategory = { slug: string; order: number; title: string; posts: CoursePost[] };\n`;
const data = `export const COURSE: CourseCategory[] = ${JSON.stringify(categories, null, 2)};\n`;

await writeFile(OUT, header + types + data, "utf8");

const postCount = categories.reduce((n, c) => n + c.posts.length, 0);
console.log(`course build: 카테고리 ${categories.length}개, 글 ${postCount}편 -> course-content.generated.ts`);
if (!categories.length) {
  console.log("  course/curriculum 이 없거나 비었다. 빈 모듈을 썼다.");
}
