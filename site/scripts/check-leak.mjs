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
 *
 * 교안은 2026-08-20 에 형제 비공개 저장소 `eddmpython-course` 로 옮겼다. 이 저장소는
 * 이제 교안을 빌드에 넣지 않으므로 새어 나갈 경로가 구조적으로 없다. 그래도 이 검사를
 * 남기는 이유는 **블로그가 교안 문장을 옮겨 적는 것**은 여전히 가능하기 때문이다.
 * 구조가 막는 것과 사람이 옮겨 적는 것은 다른 문제다.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";

const SITE = resolve(process.cwd());
const REPO = resolve(SITE, "..");
const DIST = resolve(REPO, "..", "eddmpython.out", "site-dist");

/**
 * 교안 체크아웃이 없으면 검사할 원본이 없다. 그때 조용히 통과하면 이 게이트는 초록불만
 * 찍는 장식이 된다. 배포는 형제 저장소가 있는 기계에서만 하므로 없으면 멈춘다.
 */
function requireCourseCheckout(path) {
  if (existsSync(path)) return;
  console.error("교안 체크아웃이 없어 누출을 검사할 수 없습니다.");
  console.error(`  기대한 곳: ${path}`);
  console.error("  git clone https://github.com/eddmpython/eddmpython-course ../../eddmpython-course");
  process.exit(1);
}

/** 비공개로 취급하는 원본 경로. 여기 있는 글은 공개 산출물에 나오면 안 된다. */
const COURSE_REPO = resolve(REPO, "..", "eddmpython-course");
// _archive 의 옛 강의 계획도 파는 물건의 일부다. 저장소 자기 문서는 넣지 않는다.
// 그것은 공개 사이트와 같은 낱말을 쓰므로 우연히 겹친다.
const PRIVATE_DIRS = [join(COURSE_REPO, "curriculum"), join(COURSE_REPO, "_archive")];

/** 본문을 읽을 확장자. 이미지와 문서 바이너리는 문자열 비교 대상이 아니다. */
const TEXT_EXT = new Set([".md", ".txt", ".json", ".mdx", ".html"]);

/** 너무 흔해서 우연히 겹치는 문장은 제외한다. */
const MIN_PHRASE = 18;

/**
 * 파일 하나에서 뽑을 문장 수의 상한.
 *
 * 예전에는 40 이었고 앞에서부터 40개만 잘라 썼다. 그래서 **긴 글의 뒷부분이 검사에서 통째로
 * 빠졌다.** 001 은 후보 60개 중 20개가, 004 는 51개 중 11개가 대상 밖이었다. 뒤쪽 문장을
 * 공개 산출물에 심어도 게이트가 초록불을 냈다.
 *
 * 상한을 크게 올리고, 그래도 넘치면 앞에서 자르지 않고 **고르게 솎는다.** 글의 어느 자리도
 * 구조적으로 안전지대가 되지 않게 하는 것이 요점이다.
 */
const MAX_PHRASES_PER_FILE = 400;

/** 검사할 원본이 있는데 문장이 이보다 적으면 뽑기가 고장 난 것이다. */
const MIN_TOTAL_PHRASES = 100;

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

/**
 * JSON 원본의 문자열 값을 줄로 펼친다.
 *
 * 안 하면 JSON 은 문장을 한 개도 못 낸다. 아래 줄머리 필터가 `{`, `[`, `"` 로 시작하는 줄을
 * 전부 걷어내기 때문이다. 실제로 `plan.json`, `codaro-cells.json` 을 비롯한 다섯 파일이
 * 0문장이었다. 확장자 목록에만 있고 실효가 없었다.
 */
function unpackJson(text) {
  const out = [];
  const walkValue = (value) => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walkValue);
    else if (value && typeof value === "object") Object.values(value).forEach(walkValue);
  };
  try {
    walkValue(JSON.parse(text));
  } catch {
    return text;
  }
  return out.join("\n");
}

/** 비공개 원본에서 검색할 만큼 긴 문장만 뽑는다. */
function phrasesFrom(text, isJson = false) {
  const found = [];
  for (const raw of (isJson ? unpackJson(text) : text).split(/\r?\n/)) {
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
  const unique = [...new Set(found)];
  if (unique.length <= MAX_PHRASES_PER_FILE) return unique;
  // 앞에서 자르면 글 뒷부분이 안전지대가 된다. 처음부터 끝까지 같은 간격으로 고른다.
  const step = unique.length / MAX_PHRASES_PER_FILE;
  return Array.from({ length: MAX_PHRASES_PER_FILE }, (_, i) => unique[Math.floor(i * step)]);
}

PRIVATE_DIRS.forEach(requireCourseCheckout);
const privateFiles = PRIVATE_DIRS.flatMap(walk).filter((path) => TEXT_EXT.has(extname(path).toLowerCase()));
const phrases = new Map();
for (const path of privateFiles) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  for (const phrase of phrasesFrom(text, extname(path).toLowerCase() === ".json")) {
    if (!phrases.has(phrase)) phrases.set(phrase, relative(REPO, path).replace(/\\/g, "/"));
  }
}

// 원본은 있는데 문장이 거의 없으면 뽑기가 고장 난 것이다. 그 상태의 초록불은 거짓이다.
if (phrases.size < MIN_TOTAL_PHRASES) {
  console.error(`비공개 문장이 ${phrases.size}개뿐입니다. 원본 ${privateFiles.length}개를 읽었습니다`);
  console.error("이렇게 적으면 통과는 증거가 아닙니다. 문장을 뽑는 규칙을 확인합니다");
  process.exit(1);
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
