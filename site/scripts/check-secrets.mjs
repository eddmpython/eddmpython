/**
 * 공개 소스에 강의장 문을 여는 값이 글자로 적혀 있는지 본다.
 *
 * 왜 check-leak 과 따로 있나. 그쪽은 **빌드 산출물**에 교안 문장이 섞였는지를 본다.
 * 2026-08-20 에 유료 교안이 샌 경로는 산출물이 아니었다. `scripts/classroom-shot.mjs` 에
 * `shot-room-1234` 가 적혀 있었고, 같은 스크립트가 운영에 그 비밀번호로 방을 만든 뒤
 * 지우지 않았다. 이 저장소는 공개다. 방 이름도 비밀번호도 GitHub 에서 그대로 읽혔고
 * `eddmpython.com/cr/shot` 은 유료 교안 네 편을 통째로 내주고 있었다.
 *
 * check-leak 은 이것을 구조적으로 못 본다. 새어 나간 것이 번들 안의 문자열이 아니라
 * **살아 있는 문**이었기 때문이다. 그래서 검사를 따로 둔다.
 *
 * 이 검사는 산출물도 형제 저장소도 필요 없다. 그래서 deploy 가 아니라 npm test 에 붙는다.
 * 문이 열리는 시점은 배포할 때가 아니라 스크립트를 돌릴 때다.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";

const SITE = resolve(process.cwd());
const SKIP = new Set(["node_modules", ".wrangler", "dist", ".git", "public"]);
const CODE_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".jsx", ".json", ".jsonc"]);

/**
 * 잡을 모양.
 *
 * 값이 **글자로 박혀 있는 경우만** 잡는다. `password: PASSWORD` 처럼 변수로 받거나
 * `password: String(body.password ?? "")` 처럼 요청에서 꺼내는 것은 정상이다.
 * 빈 문자열도 통과시킨다. 설정 틀에서 자리만 잡아 두는 쓰임이 있다.
 */
const RULES = [
  {
    id: "박힌 비밀번호",
    re: /\b(?:PASSWORD|password|PASSWD|pw)\s*[:=]\s*(["'`])(?!\s*\1)[^"'`\n]{1,}\1/g,
    why: "강의장 비밀번호를 소스에 적으면 공개 저장소를 읽은 사람이 그대로 들어온다",
  },
  {
    id: "박힌 운영 토큰",
    re: /\b(?:CR_ADMIN_TOKEN|adminToken|token)\s*[:=]\s*(["'`])[0-9a-f]{24,}\1/g,
    why: "운영 토큰은 .classroom-admin.json 과 wrangler secret 에만 둔다",
  },
];

/** 검사 자신의 설명과 규칙 줄은 대상이 아니다. 그것까지 잡으면 검사가 자기를 문다. */
const SELF = resolve(SITE, "scripts", "check-secrets.mjs");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const files = walk(SITE).filter(
  (path) => CODE_EXT.has(extname(path).toLowerCase()) && path !== SELF,
);

const found = [];
for (const path of files) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.re)) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      found.push({
        where: `${relative(SITE, path).replace(/\\/g, "/")}:${line}`,
        rule: rule.id,
        why: rule.why,
        text: (lines[line - 1] ?? "").trim().slice(0, 90),
      });
    }
  }
}

/**
 * 검사기가 실제로 무는지 자기 검사를 한다.
 *
 * 규칙이 아무것도 못 잡는 상태의 초록불은 증거가 아니다. 2026-08-20 에 이 저장소가
 * 정확히 그 꼴이었다. 통과하고 있었고 문은 열려 있었다.
 */
const BITE = [
  ['const PASSWORD = "shot-room-1234";', true],
  ["const PASSWORD = randomBytes(12).toString('base64url');", false],
  ['password: String(body.password ?? "")', false],
  ['{ action: "password", slug, password: input.value }', false],
  ['<input type="password" name="password">', false],
  ['token: "a3f9c1d0b4e7a2f5c8d1e4b7a0f3c6d9"', true],
];
for (const [sample, shouldBite] of BITE) {
  const bit = RULES.some((r) => {
    r.re.lastIndex = 0;
    return r.re.test(sample);
  });
  if (bit !== shouldBite) {
    console.error(`검사기 자기 검사 실패: ${shouldBite ? "물어야" : "안 물어야"} 하는데 아니다`);
    console.error(`  ${sample}`);
    process.exit(1);
  }
}

// 운영 화면 설정은 실제 토큰을 들고 있다. 저장소에 추적되면 안 된다.
const CONFIG = join(SITE, ".classroom-admin.json");
if (existsSync(CONFIG)) {
  const ignored = readFileSync(resolve(SITE, "..", ".gitignore"), "utf8");
  if (!/(^|\n)[^\n#]*\.classroom-admin\.json/.test(ignored)) {
    found.push({
      where: ".gitignore",
      rule: "추적되는 운영 설정",
      why: ".classroom-admin.json 에 운영 토큰이 들어 있다. 커밋되면 안 된다",
      text: "(목록에 없음)",
    });
  }
}

if (found.length) {
  console.error(`공개 소스에 문을 여는 값이 ${found.length}건 있습니다.\n`);
  for (const one of found) {
    console.error(`  ${one.where}  [${one.rule}]`);
    console.error(`    ${one.text}`);
    console.error(`    ${one.why}\n`);
  }
  process.exit(1);
}

console.log(`secrets ok: 공개 소스 ${files.length}개, 박힌 비밀번호와 토큰 없음`);
