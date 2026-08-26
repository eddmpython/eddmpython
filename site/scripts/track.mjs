import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  addComment,
  createDiscussion,
  createIssue,
  findDiscussion,
  renderComment,
  sendMail,
} from "./track-notify.mjs";
import { applyUpdate, renderPullBody, validateUpdate } from "./track-update.mjs";

/*
 * 글이 지목한 외부 사실이 아직 그대로인지 본다.
 *
 * **왜 만들었나.** 글은 발행하는 순간부터 낡는다. 저장소 안에서 확인되는 낡음은 게이트가
 * 잡는다. 본문을 고치고 이미지 계획의 contentAnchor 를 안 고치면 check:blog 가 막는다.
 * 저장소 밖에서만 확인되는 낡음은 아무도 안 잡았다. 004 가 pandas 3.0.5 로 잰 4.0초와
 * 560MB 를 표로 실었는데 pandas 가 메이저를 올리면 그 표 전체가 근거 없는 주장이 된다.
 * 방문자만 알고 글쓴이는 모른다.
 *
 * **계획과 상태를 가른다.** 무엇을 볼지는 글 폴더의 track.json 이 소유하고 사람이 쓴다.
 * 마지막으로 본 값은 blog/track-state.json 이 소유하고 이 스크립트만 쓴다. 봇 커밋이
 * 사람의 글 폴더를 건드리지 않고, git diff 하나로 무엇이 실제로 변했는지 다 보인다.
 *
 * **무엇을 할지는 글이 고른다.** 감시마다 notify 로 알림 채널을 고르고 update 로 본문을
 * 고칠지 정한다. 한 글이 버전 한 줄만 갈아 끼우면 되는 동안 다른 글은 독자에게 댓글로
 * 알려야 할 수 있다. 채널과 갱신 규칙은 track-notify.mjs 와 track-update.mjs 가 소유한다.
 *
 * **본문 갱신은 기본이 아니다.** update 를 단 감시만 본문을 고친다. 이 저장소는 발행일과
 * 수정일을 일부러 내보내지 않아서 (check:seo 가 article:published_time 을 막는다) 본문에
 * 적힌 버전 한 줄이 독자가 검증 시점을 아는 단서다. 그 줄만 기계가 최신으로 칠하면 그 값으로
 * 잰 다른 수치는 그대로인 채 재현 조건만 새것인 글이 된다. 그래서 mode 의 기본은 pr 이고,
 * 사람이 diff 를 읽고 머지한다. 무엇이 맞는지는 글이 알기 때문에 글이 고른다.
 *
 * ```
 * node scripts/track.mjs                 확인만 한다. 변화가 있으면 종료 코드 1
 * node scripts/track.mjs --write         본 값을 상태 파일에 적는다
 * node scripts/track.mjs --report        이슈 본문 형식으로 낸다
 * node scripts/track.mjs --notify        고른 채널로 실제로 알린다 (GITHUB_TOKEN 필요)
 * node scripts/track.mjs --apply-update  update 가 달린 감시의 본문을 고친다
 * node scripts/track.mjs --json          결과를 기계 판독 형식으로 낸다
 * ```
 */

const blogDir = resolve(process.cwd(), "../blog");
const postsDir = resolve(blogDir, "posts");
const statePath = resolve(blogDir, "track-state.json");
const configPath = resolve(blogDir, "discussions.json");
const trackName = "track.json";
const articleName = "index.md";

/** 아는 알림 채널. track.json 의 notify 가 이 중에서 고른다. */
export const CHANNELS = ["issue", "comment", "mail"];

/**
 * 이 감시가 고른 알림 채널.
 *
 * 안 고르면 글쓴이에게만 간다. 독자가 보는 표면에 봇이 글을 남기는 것은 되돌리기 어려우므로
 * 기본값이 될 수 없다. comment 를 적은 글만 댓글이 달린다.
 */
export function channelsOf(watch) {
  const raw = watch.notify;
  if (!Array.isArray(raw) || !raw.length) return ["issue"];
  return raw.filter((c) => CHANNELS.includes(c));
}

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

  /*
   * PEP 의 상태 목록. 파이썬 자체가 무엇을 받아들였는지 본다.
   *
   * 버전 감시는 이미 나온 것만 잡는다. `PEP 828 이 Accepted 됐다` 는 버전이 오르기 한참
   * 전에 일어나고, 파이썬이 앞으로 어떻게 바뀌는지를 다루는 글은 그 시점에 낡는다.
   *
   * **번호가 가장 큰 것을 고르면 안 된다.** 거버넌스 PEP 가 8000 번대를 쓴다. 2026-08-26 에
   * Accepted 열한 건 중 번호가 가장 큰 것이 `PEP 8016 The Steering Council Model` 이었고
   * 2018 년부터 그 자리에 있다. 그것을 집으면 감시가 영원히 같은 값을 돌려준다.
   *
   * 그래서 **번호 하나가 아니라 목록 전체**를 값으로 삼는다. 제안이 받아들여질 때도 바뀌고
   * 실제로 나가면서 Final 로 옮겨갈 때도 바뀐다. 둘 다 이 글에게는 소식이다. 2026-08-26 에
   * Standards Track 이면서 Accepted 인 것이 아홉 건이라 값이 짧게 유지된다.
   */
  "pep-status": {
    required: ["status"],
    label: (w) => `${w.type ?? "Standards Track"} 중 ${w.status} 인 PEP`,
    source: (w) => `https://peps.python.org/topic/#${String(w.status).toLowerCase()}`,
    async observe(w) {
      const res = await fetch("https://peps.python.org/api/peps.json", {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`peps.python.org: HTTP ${res.status}`);
      const all = await res.json();
      if (!all || typeof all !== "object" || !Object.keys(all).length) {
        throw new Error("peps.python.org: PEP 목록이 비었습니다");
      }
      const type = w.type ?? "Standards Track";
      const numbers = Object.entries(all)
        .filter(([, pep]) => pep?.status === w.status && pep?.type === type)
        .map(([number]) => Number(number))
        .filter((n) => Number.isInteger(n))
        .sort((a, b) => a - b);
      // 하나도 없으면 status 나 type 을 잘못 적은 것이다. 빈 문자열을 값으로 삼으면 오타가
      // `변화 없음` 으로 위장해 영영 안 잡힌다.
      if (!numbers.length) {
        throw new Error(`peps.python.org: ${type} 이면서 ${w.status} 인 PEP 가 없습니다`);
      }
      return numbers.join(",");
    },
  },

  /*
   * RSS 나 Atom 피드의 맨 위 글.
   *
   * 값은 제목이 아니라 **링크**다. 제목은 발행 뒤에도 고쳐지므로 그것을 값으로 삼으면 새 글이
   * 없는데도 변화로 잡힌다. 링크는 그 글의 신원이다.
   *
   * RSS 2.0 은 `<item><link>`, Atom 은 `<entry><id>` 를 쓴다. Python Insider 는 확장자와
   * content-type 만 보면 Atom 같지만 실제로는 RSS 2.0 이다. 2026-08-26 에 Atom 으로 읽으려다
   * 항목을 0 개로 셌다. 그래서 둘 다 받는다.
   *
   * 의존성을 늘리지 않으려고 정규식으로 읽는다. 워크플로가 `npm ci` 를 돌리지 않기 때문이다.
   * 맨 위 항목 하나만 필요하고 그 모양이 고정이라 파서를 들일 값이 없다. 모양이 달라지면
   * 조용히 틀리는 대신 throw 한다.
   */
  feed: {
    required: ["url"],
    label: (w) => `${w.title ?? w.url} 최신 글`,
    source: (w) => w.home ?? w.url,
    async observe(w) {
      const res = await fetch(w.url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml" } });
      if (!res.ok) throw new Error(`feed ${w.url}: HTTP ${res.status}`);
      const xml = await res.text();
      const item = xml.match(/<item\b[\s\S]*?<\/item>/i)?.[0];
      const entry = xml.match(/<entry\b[\s\S]*?<\/entry>/i)?.[0];
      const first = item ?? entry;
      if (!first) throw new Error(`feed ${w.url}: item 도 entry 도 없습니다`);
      const link =
        first.match(/<link\b[^>]*>([^<]+)<\/link>/i)?.[1] ??
        first.match(/<link\b[^>]*\shref=["']([^"']+)["']/i)?.[1] ??
        first.match(/<id>([^<]+)<\/id>/i)?.[1];
      if (!link) throw new Error(`feed ${w.url}: 맨 위 항목에 링크가 없습니다`);
      return link.trim();
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
      lines.push(`- 알린 곳: ${channelsOf(item.watch).join(", ")}`);
      if (item.watch.update) {
        lines.push(`- 본문 갱신: ${item.watch.update.mode ?? "pr"} 로 \`${item.watch.update.find}\` 를 옮긴다`);
      }
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
  lines.push("update 를 단 감시만 본문이 바뀐다. 그 값으로 잰 다른 수치는 그대로이므로 다시 재는 것은 사람이 한다.");
  lines.push("이 감시의 계획은 각 글 폴더의 track.json 에 있다.");
  return lines.join("\n");
}

/**
 * 채널별로 실제로 알린다.
 *
 * 한 채널이 실패해도 다른 채널을 막지 않는다. 댓글 권한이 없다고 이슈까지 안 열리면 그날의
 * 변화를 통째로 놓친다.
 */
async function notifyAll(changed, broken, config, log) {
  const results = [];

  const forIssue = changed.filter((c) => channelsOf(c.watch).includes("issue"));
  if (forIssue.length || broken.length) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const issue = await createIssue(
        config.repo,
        `글이 지켜보던 것이 움직였습니다 (${today})`,
        renderReport(forIssue, broken),
      );
      results.push({ channel: "issue", ok: true, url: issue.html_url });
      log(`  이슈 ${issue.html_url}`);
    } catch (error) {
      results.push({ channel: "issue", ok: false, error: String(error.message ?? error) });
      log(`  이슈 실패: ${error.message ?? error}`);
    }
  }

  /*
   * 댓글은 글 단위로 묶는다. 한 글에서 넷이 움직였는데 댓글이 넷 달리면 사람 댓글 하나 없는
   * 스레드가 봇 글로 뒤덮인다.
   */
  const byPost = new Map();
  for (const item of changed) {
    if (!channelsOf(item.watch).includes("comment")) continue;
    if (!byPost.has(item.watch.post)) byPost.set(item.watch.post, []);
    byPost.get(item.watch.post).push(item);
  }
  for (const [post, items] of byPost) {
    try {
      let discussion = await findDiscussion(config.repo, config.category, post);
      if (!discussion) {
        discussion = await createDiscussion(config.repoId, config.categoryId, post, {});
        log(`  스레드 생성 ${discussion.url}`);
      }
      const comment = await addComment(
        discussion.id,
        renderComment(
          items.map((i) => ({
            label: KINDS[i.watch.kind].label(i.watch),
            before: i.before,
            now: i.now,
            why: i.watch.why,
            anchor: i.watch.anchor,
            source: KINDS[i.watch.kind].source(i.watch),
          })),
        ),
      );
      results.push({ channel: "comment", ok: true, post, url: comment.url });
      log(`  댓글 ${comment.url}`);
    } catch (error) {
      results.push({ channel: "comment", ok: false, post, error: String(error.message ?? error) });
      log(`  댓글 실패 (${post}): ${error.message ?? error}`);
    }
  }

  const forMail = changed.filter((c) => channelsOf(c.watch).includes("mail"));
  if (forMail.length) {
    const today = new Date().toISOString().slice(0, 10);
    const out = await sendMail(
      `글이 지켜보던 것이 움직였습니다 (${today})`,
      renderReport(forMail, []),
    );
    results.push({ channel: "mail", ...out });
    log(out.sent ? `  메일 보냄 (${out.id})` : `  메일 건너뜀: ${out.reason}`);
  }

  return results;
}

/**
 * update 가 달린 감시의 본문을 고친다.
 *
 * track.json 의 find 와 anchor 도 함께 옮긴다. 안 옮기면 다음 회차가 찾을 문자열을 잃고
 * anchor 가 끊겨 check:blog 가 막는다.
 */
async function applyUpdates(changed, log) {
  const applied = [];
  const failed = [];
  const touched = new Set();

  /* 같은 글을 여러 감시가 고칠 수 있어서 글 단위로 모아 한 번에 쓴다. */
  const byPost = new Map();
  for (const item of changed) {
    if (!item.watch.update) continue;
    if (!byPost.has(item.watch.post)) byPost.set(item.watch.post, []);
    byPost.get(item.watch.post).push(item);
  }

  for (const [post, items] of byPost) {
    const articlePath = join(postsDir, post, articleName);
    const planPath = join(postsDir, post, trackName);
    let body = await readFile(articlePath, "utf8");
    const plan = JSON.parse(await readFile(planPath, "utf8"));
    let changedAny = false;

    for (const item of items) {
      const out = applyUpdate(body, item.watch, item.now);
      if (!out.ok) {
        failed.push({ key: item.watch.key, reason: out.reason });
        log(`  갱신 실패 ${item.watch.key}: ${out.reason}`);
        continue;
      }
      body = out.body;
      changedAny = true;
      const entry = plan.watch[item.watch.id];
      entry.update.find = out.nextFind;
      if (out.nextAnchor) entry.anchor = out.nextAnchor;
      applied.push({
        post,
        key: item.watch.key,
        label: KINDS[item.watch.kind].label(item.watch),
        before: item.before,
        now: item.now,
        why: item.watch.why,
        from: out.from,
        to: out.to,
        count: out.count,
        mode: item.watch.update.mode ?? "pr",
      });
      log(`  갱신 ${item.watch.key}: ${out.from} -> ${out.to} (${out.count}곳)`);
    }

    if (!changedAny) continue;
    await writeFile(articlePath, body, "utf8");
    await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    touched.add(`blog/posts/${post}/${articleName}`);
    touched.add(`blog/posts/${post}/${trackName}`);
  }

  /* 하나라도 pr 이면 PR 로 낸다. 사람이 읽어야 할 변경이 섞여 있는데 바로 커밋하면 안 된다. */
  const mode = applied.some((a) => a.mode === "pr") ? "pr" : "commit";
  return { applied, failed, files: [...touched], mode, body: renderPullBody(applied) };
}

async function main() {
  const argv = process.argv.slice(2);
  const has = (flag) => argv.includes(flag);
  const write = has("--write");
  const report = has("--report");
  const notify = has("--notify");
  const doUpdate = has("--apply-update");
  const json = has("--json");
  /* --json 은 stdout 전체가 기계 판독 대상이라 사람용 줄을 섞지 않는다. */
  const log = json ? () => {} : (line) => console.log(line);

  const watches = await loadWatches();
  if (!watches.length) {
    if (json) console.log(JSON.stringify({ changed: [], broken: [], notified: [], update: null }));
    else console.log("track: 추적하는 글이 없습니다");
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

  let notified = [];
  let update = null;

  if (notify && (changed.length || broken.length)) {
    const config = JSON.parse(await readFile(configPath, "utf8"));
    log("알림:");
    notified = await notifyAll(changed, broken, config, log);
  }

  /*
   * 갱신은 알림 뒤에 한다. 본문을 고치면 anchor 와 find 가 새 값으로 옮겨 가는데, 알림에는
   * 사람이 무엇을 다시 봐야 하는지 알 수 있도록 옮기기 전 문장이 실려야 한다.
   */
  if (doUpdate && changed.length) {
    log("본문 갱신:");
    update = await applyUpdates(changed, log);
  }

  if (write) {
    const sorted = { version: 1, seen: {} };
    for (const key of Object.keys(state.seen).sort()) sorted.seen[key] = state.seen[key];
    await writeFile(statePath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          changed: changed.map((c) => ({
            key: c.watch.key,
            post: c.watch.post,
            label: KINDS[c.watch.kind].label(c.watch),
            before: c.before,
            now: c.now,
            channels: channelsOf(c.watch),
          })),
          broken: broken.map((b) => ({ key: b.watch.key, error: b.error })),
          baseline: baseline.map((b) => ({ key: b.watch.key, value: b.now })),
          notified,
          update,
        },
        null,
        2,
      ),
    );
    return changed.length || broken.length ? 1 : 0;
  }

  if (report) {
    console.log(renderReport(changed, broken));
    return changed.length || broken.length ? 1 : 0;
  }

  console.log(
    `track: 감시 ${watches.length} 개, 변화 ${changed.length} 개, 실패 ${broken.length} 개`,
  );
  for (const item of changed) {
    console.log(
      `  변화 ${KINDS[item.watch.kind].label(item.watch)}: ${item.before} -> ${item.now}` +
        `  [${channelsOf(item.watch).join(", ")}]`,
    );
  }
  for (const item of broken) {
    console.log(`  실패 ${item.watch.key}: ${item.error}`);
  }
  for (const item of baseline) {
    console.log(`  기준선 ${item.watch.key}: ${item.now}`);
  }
  return changed.length || broken.length ? 1 : 0;
}

export { renderPullBody, validateUpdate };

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(String(error.stack ?? error));
      process.exit(2);
    });
}
