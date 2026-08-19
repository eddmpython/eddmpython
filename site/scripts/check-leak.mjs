/**
 * 비공개 강의 자료가 공개 빌드 산출물에 섞였는지 검사한다.
 *
 * 이 검사가 필요한 이유는 확인된 사실 하나 때문이다. 이 사이트는 글 본문을 JS 번들로
 * 굽는다. `site-dist/assets/index-*.js` 안에 블로그 본문 문자열이 그대로 들어 있다.
 * 그래서 Cloudflare Access 로 `/course` 경로를 막아도, 강의 본문이 같은 빌드 파이프라인을
 * 타면 공개 JS 청크와 sitemap 으로 그대로 새어 나간다. Access 는 경로 요청만 막지
 * 번들 안의 문자열은 막지 못한다.
 *
 * 방법은 단순하다. 비공개 원본에서 특징적인 문장을 뽑아 공개 산출물에서 찾는다.
 * 하나라도 나오면 실패다.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";

const SITE = resolve(process.cwd());
const REPO = resolve(SITE, "..");
const DIST = resolve(REPO, "..", "eddmpython.out", "site-dist");

/** 비공개로 취급하는 원본 경로. 여기 있는 글은 공개 산출물에 나오면 안 된다. */
const PRIVATE_DIRS = [join(REPO, "course")];

/** 본문을 읽을 확장자. 이미지와 문서 바이너리는 문자열 비교 대상이 아니다. */
const TEXT_EXT = new Set([".md", ".txt", ".json", ".mdx", ".html"]);

/** 너무 흔해서 우연히 겹치는 문장은 제외한다. */
const MIN_PHRASE = 18;
const MAX_PHRASES_PER_FILE = 40;

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** 비공개 원본에서 검색할 만큼 긴 문장만 뽑는다. */
function phrasesFrom(text) {
  const found = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length < MIN_PHRASE) continue;
    if (/^[#>\-*|`{}\[\]"',:]/.test(line)) continue;
    // frontmatter 는 어느 글에나 같은 줄이 있다. author 나 ogImageWidth 같은 것이 공개 글에서
    // 발견되는 것은 누출이 아니라 같은 계약을 쓴다는 뜻이다. 본문만 센다.
    if (/^[A-Za-z][A-Za-z0-9]*:\s/.test(line)) continue;
    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      const phrase = sentence.trim();
      if (phrase.length >= MIN_PHRASE && /[가-힣A-Za-z]/.test(phrase)) found.push(phrase);
    }
  }
  return [...new Set(found)].slice(0, MAX_PHRASES_PER_FILE);
}

const privateFiles = PRIVATE_DIRS.flatMap(walk).filter((path) => TEXT_EXT.has(extname(path).toLowerCase()));
const phrases = new Map();
for (const path of privateFiles) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  for (const phrase of phrasesFrom(text)) {
    if (!phrases.has(phrase)) phrases.set(phrase, relative(REPO, path).replace(/\\/g, "/"));
  }
}

if (!existsSync(DIST)) {
  console.error(`빌드 산출물이 없습니다: ${DIST}`);
  console.error("npm run build 를 먼저 실행합니다");
  process.exit(1);
}

const distFiles = walk(DIST).filter((path) =>
  [".js", ".html", ".css", ".json", ".xml", ".txt"].includes(extname(path).toLowerCase()),
);

const leaks = [];

// 1. 비공개 원본의 문장이 공개 산출물에 있는가
for (const path of distFiles) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  for (const [phrase, source] of phrases) {
    if (text.includes(phrase)) {
      leaks.push({
        where: relative(DIST, path).replace(/\\/g, "/"),
        source,
        phrase: phrase.length > 60 ? `${phrase.slice(0, 60)}...` : phrase,
      });
    }
  }
}

// 2. 공개 색인에 비공개 경로가 올라갔는가
for (const name of ["sitemap.xml", "rss.xml", "robots.txt"]) {
  const path = join(DIST, name);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  for (const match of text.matchAll(/https?:\/\/[^\s<"']*\/(course|private)\/[^\s<"']*/g)) {
    leaks.push({ where: name, source: "공개 색인", phrase: match[0] });
  }
}

if (leaks.length) {
  console.error(`비공개 자료가 공개 산출물에 ${leaks.length}건 섞였습니다.\n`);
  for (const leak of leaks.slice(0, 20)) {
    console.error(`  ${leak.where}`);
    console.error(`    출처: ${leak.source}`);
    console.error(`    문장: ${leak.phrase}\n`);
  }
  if (leaks.length > 20) console.error(`  ...외 ${leaks.length - 20}건\n`);
  console.error("강의 본문을 공개 빌드에 넣지 않습니다. 별도 산출물로 분리합니다.");
  process.exit(1);
}

console.log(
  `leak check: 비공개 문장 ${phrases.size}개를 공개 산출물 ${distFiles.length}개에서 확인, 누출 없음`,
);
