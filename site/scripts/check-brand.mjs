/**
 * 브랜드 토큰이 한 곳에서만 정의되는지 본다.
 *
 * 정본은 `src/brand.ts` 의 TOKENS 다. 랜딩은 Tailwind 를 쓰느라 styles.css 의 `:root` 에
 * 같은 값을 들고 있어야 하는데, 그 둘이 갈라지면 화면을 옮길 때 배경색이 미묘하게 달라진다.
 * 실제로 강의장(#101514)과 운영 화면(#0d1211)이 그렇게 갈라져 있었다.
 *
 * 두 가지를 본다.
 * 1. styles.css 의 --eddm-* 값이 TOKENS 와 같은가
 * 2. 브랜드 색을 쓰는 파일이 hex 를 직접 적고 있지 않은가 (정본과 생성물만 예외)
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TOKENS } from "../src/brand.ts";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const add = (where, msg) => problems.push(`${where}: ${msg}`);

// 1. styles.css 의 :root 가 정본과 같은 값인가
const css = await readFile(join(SITE, "src/styles.css"), "utf8");
const expected = {
  "--eddm-carbon": TOKENS.color.carbon,
  "--eddm-ink": TOKENS.color.ink,
  "--eddm-ivory": TOKENS.color.ivory,
  "--eddm-sand": TOKENS.color.sand,
  "--eddm-dartlab": TOKENS.color.dartlab,
  "--eddm-codaro": TOKENS.color.codaro,
  "--eddm-xlpod": TOKENS.color.xlpod,
  "--eddm-pyproc": TOKENS.color.pyproc,
};
for (const [name, want] of Object.entries(expected)) {
  const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!m) add("src/styles.css", `${name} 이 없습니다. brand.ts 의 TOKENS 와 맞춥니다`);
  else if (m[1].trim() !== want) {
    add("src/styles.css", `${name} 이 ${m[1].trim()} 인데 brand.ts 는 ${want} 입니다`);
  }
}

// 폰트 스택도 한 벌이어야 한다. 다르면 자간이 달라져 같은 헤더가 아니게 된다.
if (!css.includes("Pretendard Variable")) {
  add("src/styles.css", "--font-sans 에 Pretendard 가 없습니다");
}

/**
 * 2. 브랜드 hex 를 직접 적은 곳.
 *
 * 정본(brand.ts)과 브랜드 문서는 당연히 값을 담는다. styles.css 는 위에서 이미 대조했다.
 * 그 밖의 파일이 브랜드 색을 직접 적으면 정본이 둘이 된다.
 */
const BRAND_HEX = [
  TOKENS.color.carbon,
  TOKENS.color.ink,
  TOKENS.color.ivory,
  TOKENS.color.sand,
  TOKENS.color.alert,
];
const EXEMPT = new Set(["src/brand.ts", "src/styles.css", "scripts/check-brand.mjs"]);
const SCAN = ["classroom.ts", "worker.ts", "scripts/classroom-admin.mjs", "classroom-render.ts"];

for (const rel of SCAN) {
  if (EXEMPT.has(rel)) continue;
  let text;
  try {
    text = await readFile(join(SITE, rel), "utf8");
  } catch {
    continue;
  }
  for (const hex of BRAND_HEX) {
    // 대소문자와 8자리 알파 표기(#f5f3ee8c)까지 잡는다
    const re = new RegExp(hex.replace("#", "#") + "([0-9a-f]{2})?", "gi");
    const hits = text.match(re);
    if (hits) {
      add(rel, `브랜드 색 ${hex} 를 직접 적었습니다 (${hits.length}곳). brand.ts 의 TOKENS 를 씁니다`);
    }
  }
}

/**
 * 3. hex 를 변수로 바꾸다 알파가 밖에 남은 자리.
 *
 * `#d8be9166` 을 `var(--eddm-sand)` 로 바꾸면 `var(--eddm-sand)66` 이 된다. CSS 는 그 선언을
 * 통째로 버리므로 테두리가 조용히 사라진다. 실제로 다섯 곳이 그렇게 됐다.
 */
for (const rel of [...SCAN, "src/styles.css"]) {
  let text;
  try {
    text = await readFile(join(SITE, rel), "utf8");
  } catch {
    continue;
  }
  const broken = text.match(/var\(--eddm-[a-z-]+\)[0-9a-f]{2}(?![0-9a-z])/gi);
  if (broken) {
    add(rel, `변수 뒤에 알파가 남았습니다: ${[...new Set(broken)].join(", ")}`);
  }
}

if (problems.length) {
  console.error("브랜드 토큰이 갈라졌습니다.\n");
  for (const p of problems) console.error("  " + p);
  console.error("\n정본은 src/brand.ts 의 TOKENS 입니다.");
  process.exit(1);
}

console.log(`brand ok: 토큰 ${Object.keys(expected).length}개, 표면 ${SCAN.length}곳`);
