import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/*
 * 글이 지목한 외부 사실이 아직 그대로인지 본다.
 *
 * **왜 만들었나.** 글은 발행하는 순간부터 낡는다. 저장소 안에서 확인되는 낡음은 게이트가
 * 잡는다. 본문을 고치고 이미지 계획의 contentAnchor 를 안 고치면 check:blog 가 막는다.
 * 저장소 밖에서만 확인되는 낡음은 아무도 안 잡았다. 004 가 pandas 3.0.5 로 잰 4.0초와
 * 560MB 를 표로 실었는데 pandas 가 메이저를 올리면 그 표 전체가 근거 없는 주장이 된다.
 * 방문자만 알고 글쓴이는 모른다.
 *
 * **무엇을 하지 않나.** 본문을 고치지 않는다. 이 저장소는 발행일과 수정일을 일부러
 * 내보내지 않는다. check:seo 가 article:published_time 을 막는다. 그래서 본문에 적힌
 * "이 글에서 쓴 버전은 pandas 3.0.5" 한 줄이 독자가 검증 시점을 아는 유일한 단서다.
 * 기계가 그 줄만 최신으로 칠하면 뒤에 있는 숫자 스무 개는 그대로인 채 재현 조건만 새것인
 * 글이 된다. 낡음의 흔적을 지우면서 낡음은 남기는 것이라 순 마이너스다. 그래서 이 도구는
 * 사람에게 알리는 데서 멈춘다. 다시 재고 다시 쓰는 것은 사람이 한다.
 *
 * **계획과 상태를 가른다.** 무엇을 볼지는 글 폴더의 track.json 이 소유하고 사람이 쓴다.
 * 마지막으로 본 값은 blog/track-state.json 이 소유하고 이 스크립트만 쓴다. 봇 커밋이
 * 사람의 글 폴더를 건드리지 않고, git diff 하나로 무엇이 실제로 변했는지 다 보인다.
 *
 * ```
 * node scripts/track.mjs            확인만 한다. 변화가 있으면 종료 코드 1
 * node scripts/track.mjs --write    본 값을 상태 파일에 적는다
 * node scripts/track.mjs --report   변화를 GitHub Issue 본문 형식으로 낸다
 * ```
 */

const blogDir = resolve(process.cwd(), "../blog");
const postsDir = resolve(blogDir, "posts");
const statePath = resolve(blogDir, "track-state.json");
const trackName = "track.json";

/*
 * 감시 종류마다 어디서 무엇을 읽는지.
 *
 * observe 는 지금 값을 문자열 하나로 돌려준다. 그 문자열이 상태 파일에 적힌 것과 다르면
 * 변화다. 값을 문자열로 좁힌 이유는 비교가 한 줄이어야 상태 파일의 diff 가 읽히기 때문이다.
 */
export const KINDS = {
  /*
   * PyPI. 글이 pip install 로 설치하라고 적은 것.
   *
   * info.version 이 최신 정식 버전이다. releases 키를 정렬해 고르면 안 된다. 문자열
   * 정렬이라 1.9 가 1.44 보다 뒤로 간다.
   */
  pypi: {
    required: ["package"],
    label: (w) => `PyPI ${w.package}`,
    source: (w) => `https://pypi.org/project/${w.package}/`,
    async observe(w) {
      const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(w.package)}/json`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`PyPI ${w.package}: HTTP ${res.status}`);
      const body = await res.json();
      const version = body?.info?.version;
      if (!version) throw new Error(`PyPI ${w.package}: info.version 이 없습니다`);
      return String(version);
    },
  },

  /*
   * 파이썬 자체.
   *
   * python.org 의 /api/v2/downloads/release/ 는 쓰지 않는다. 2026-08-26 에 직접 찍어
   * 보니 ordering 도 is_latest 필터도 무시하고 268 건을 통째로 준다. 그 안에 is_latest 가
   * 참인 항목이 세 개이고 (2.7.18, 3.14.7, 그리고 Python install manager) 파이썬이 아닌
   * 설치 관리자까지 섞여 있다. 필터가 먹는 줄 알고 첫 항목을 집으면 Python 2.0.1 을
   * 최신이라고 적게 된다.
   *
   * endoflife.date 는 17 개 계열만 주고 계열마다 latest 와 eol 이 붙어 있다. 글이 특정
   * 계열을 전제하면 series 로 그 계열만 본다.
   */
  python: {
    required: [],
    label: (w) => (w.series ? `Python ${w.series} 계열` : "Python 최신"),
    source: () => "https://endoflife.date/python",
    async observe(w) {
      const res = await fetch("https://endoflife.date/api/python.json", {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`endoflife.date: HTTP ${res.status}`);
      const cycles = await res.json();
      if (!Array.isArray(cycles) || !cycles.length) {
        throw new Error("endoflife.date: 계열 목록이 비었습니다");
      }
      if (w.series) {
        const found = cycles.find((c) => c.cycle === w.series);
        if (!found) throw new Error(`endoflife.date: ${w.series} 계열이 목록에 없습니다`);
        return String(found.latest);
      }
      return String(cycles[0].latest);
    },
  },

  /*
   * GitHub 릴리스. PyPI 에 안 올라오는 것과 도구 자체를 본다.
   *
   * /releases/latest 는 draft 와 prerelease 를 건너뛴 것을 준다. 토큰이 있으면 쓴다.
   * 공개 저장소는 토큰 없이도 되지만 시간당 60 회라 러너에서는 금방 막힌다.
   */
  "github-release": {
    required: ["repo"],
    label: (w) => `${w.repo} 릴리스`,
    source: (w) => `https://github.com/${w.repo}/releases`,
    async observe(w) {
      if (!/^[\w.-]+\/[\w.-]+$/.test(w.repo)) {
        throw new Error(`github-release: repo 형식이 owner/name 이 아닙니다: ${w.repo}`);
      }
      const headers = { accept: "application/vnd.github+json" };
      const token = process.env.GITHUB_TOKEN;
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await fetch(`https://api.github.com/repos/${w.repo}/releases/latest`, { headers });
      if (!res.ok) throw new Error(`github-release ${w.repo}: HTTP ${res.status}`);
      const body = await res.json();
      const tag = body?.tag_name;
      if (!tag) throw new Error(`github-release ${w.repo}: tag_name 이 없습니다`);
      return String(tag);
    },
  },
};

/** 글 폴더에서 track.json 을 가진 것만 모은다. 파일이 없으면 그 글은 추적하지 않는다. */
export async function loadWatches(dir = postsDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const watches = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const file = join(dir, entry.name, trackName);
    if (!existsSync(file)) continue;
    const label = `blog/posts/${entry.name}/${trackName}`;
    const plan = JSON.parse(await readFile(file, "utf8"));
    if (plan.version !== 1 || !plan.watch || typeof plan.watch !== "object") {
      throw new Error(`${label}: version 또는 watch 계약이 잘못됐습니다`);
    }
    for (const [id, watch] of Object.entries(plan.watch)) {
      watches.push({ post: entry.name, id, key: `${entry.name}/${id}`, label, ...watch });
    }
  }
  return watches;
}

async function loadState() {
  if (!existsSync(statePath)) return { version: 1, seen: {} };
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (state.version !== 1 || !state.seen || typeof state.seen !== "object") {
    throw new Error("blog/track-state.json: version 또는 seen 계약이 잘못됐습니다");
  }
  return state;
}

/** GitHub Issue 본문. 무엇이 변했는지가 아니라 그것이 이 글의 무엇을 흔드는지를 앞에 둔다. */
export function renderReport(changed, broken) {
  const lines = [];
  if (changed.length) {
    lines.push("## 다시 봐야 할 글", "");
    for (const item of changed) {
      const kind = KINDS[item.watch.kind];
      lines.push(`### ${item.watch.post}`, "");
      lines.push(`- **${kind.label(item.watch)}**: \`${item.before}\` -> \`${item.now}\``);
      lines.push(`- 마지막으로 같았던 날: ${item.since}`);
      lines.push(`- 흔들리는 것: ${item.watch.why}`);
      if (item.watch.anchor) lines.push(`- 본문: "${item.watch.anchor}"`);
      lines.push(`- 출처: ${kind.source(item.watch)}`, "");
    }
  }
  if (broken.length) {
    lines.push("## 확인하지 못한 감시", "");
    for (const item of broken) {
      lines.push(`- \`${item.watch.key}\`: ${item.error}`);
    }
    lines.push("");
  }
  lines.push("---", "");
  lines.push("본문은 고치지 않았다. 다시 재고 다시 쓰는 것은 사람이 한다.");
  lines.push("이 감시의 계획은 각 글 폴더의 track.json 에 있다.");
  return lines.join("\n");
}

async function main() {
  const write = process.argv.includes("--write");
  const report = process.argv.includes("--report");

  const watches = await loadWatches();
  if (!watches.length) {
    console.log("track: 추적하는 글이 없습니다");
    return 0;
  }
  const state = await loadState();
  const today = new Date().toISOString().slice(0, 10);

  const changed = [];
  const broken = [];
  const baseline = [];

  for (const watch of watches) {
    const kind = KINDS[watch.kind];
    if (!kind) {
      broken.push({ watch, error: `모르는 kind: ${watch.kind}` });
      continue;
    }
    let now;
    try {
      now = await kind.observe(watch);
    } catch (error) {
      /*
       * 소스가 죽는 것도 소식이다. 공공 API 와 패키지 색인은 조용히 망가진다. 여기서
       * 조용히 넘어가면 다음 변화도 영영 못 잡는다.
       */
      broken.push({ watch, error: String(error.message ?? error) });
      continue;
    }
    const before = state.seen[watch.key];
    if (!before) {
      // 처음 보는 감시. 지금 값을 기준선으로 잡고 알리지 않는다.
      state.seen[watch.key] = { value: now, at: today };
      baseline.push({ watch, now });
      continue;
    }
    if (before.value === now) continue;
    changed.push({ watch, before: before.value, now, since: before.at });
    state.seen[watch.key] = { value: now, at: today };
  }

  /* 지운 글의 감시가 상태에 남지 않게 한다. */
  const live = new Set(watches.map((w) => w.key));
  for (const key of Object.keys(state.seen)) {
    if (!live.has(key)) delete state.seen[key];
  }

  if (write) {
    const sorted = { version: 1, seen: {} };
    for (const key of Object.keys(state.seen).sort()) sorted.seen[key] = state.seen[key];
    await writeFile(statePath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  }

  if (report) {
    console.log(renderReport(changed, broken));
    return changed.length || broken.length ? 1 : 0;
  }

  console.log(
    `track: 감시 ${watches.length} 개, 변화 ${changed.length} 개, 실패 ${broken.length} 개`,
  );
  for (const item of changed) {
    console.log(`  변화 ${KINDS[item.watch.kind].label(item.watch)}: ${item.before} -> ${item.now}`);
  }
  for (const item of broken) {
    console.log(`  실패 ${item.watch.key}: ${item.error}`);
  }
  for (const item of baseline) {
    console.log(`  기준선 ${item.watch.key}: ${item.now}`);
  }
  return changed.length || broken.length ? 1 : 0;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(String(error.stack ?? error));
      process.exit(2);
    });
}
