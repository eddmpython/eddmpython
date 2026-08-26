/**
 * 감시가 잡은 값으로 글 본문을 고친다.
 *
 * 글마다 `track.json` 의 감시에 `update` 를 달면 그 감시가 움직였을 때 본문의 정해진 문자열을
 * 새 값으로 바꾼다.
 *
 * ```json
 * "update": {
 *   "find": "Polars 1.44.1",
 *   "replace": "Polars {version}",
 *   "mode": "pr"
 * }
 * ```
 *
 * **정규식이 아니라 정확 문자열이다.** 정규식을 허용하면 글 한 편을 고치려다 다른 문장을
 * 조용히 망가뜨릴 수 있고, 그 사고는 발행된 뒤에야 보인다. 찾을 문자열이 본문에 정확히 없으면
 * 아무것도 바꾸지 않고 실패로 보고한다.
 *
 * **고치면 같이 낡는 것이 둘 있다.** 이 파일이 그 둘을 함께 갱신하지 않으면 다음 회차가
 * 망가진다.
 *
 * 1. `update.find` 자체. `Polars 1.44.1` 을 `Polars 1.45.0` 으로 바꿔 놓고 `find` 를 그대로
 *    두면 다음에는 찾을 문자열이 본문에 없다.
 * 2. 같은 감시의 `anchor`. 본문 문장을 가리키는 포인터라 그 문장이 바뀌면 끊긴다.
 *    `check:blog` 가 끊긴 anchor 를 막으므로 갱신하지 않으면 그 다음 커밋이 게이트에 걸린다.
 *
 * **mode 는 둘이다.** `pr` 은 사람이 읽고 머지한다. `commit` 은 바로 커밋한다. 기본은 `pr` 이다.
 * 숫자 한 줄만 바뀌는 글이면 `commit` 이 편하지만, 그 글의 다른 수치가 그 버전으로 잰 것이라면
 * 사람이 다시 재야 하므로 `pr` 이 맞다. 무엇이 맞는지는 글이 안다. 그래서 글이 고른다.
 */

/** update 계약이 성립하는지 본다. check:blog 와 실행 양쪽이 쓴다. */
export function validateUpdate(update) {
  if (!update || typeof update !== "object") return "update 가 객체가 아닙니다";
  const find = String(update.find ?? "");
  const replace = String(update.replace ?? "");
  if (!find.trim()) return "update.find 가 비었습니다";
  if (!replace.trim()) return "update.replace 가 비었습니다";
  if (!replace.includes("{version}")) {
    return "update.replace 에 {version} 이 없습니다. 새 값이 들어갈 자리가 필요합니다";
  }
  const mode = update.mode ?? "pr";
  if (mode !== "pr" && mode !== "commit") {
    return `update.mode 는 pr 또는 commit 입니다: ${mode}`;
  }
  return null;
}

/**
 * 본문에 한 감시의 갱신을 적용한다.
 *
 * 바꾼 본문과, 함께 갱신해야 할 `find` 와 `anchor` 의 새 값을 돌려준다. 파일을 쓰지는 않는다.
 * 여러 감시가 같은 글을 고칠 수 있어서, 부르는 쪽이 결과를 이어 붙인 뒤 한 번에 쓴다.
 */
export function applyUpdate(body, watch, newValue) {
  const problem = validateUpdate(watch.update);
  if (problem) return { ok: false, reason: problem };

  const find = String(watch.update.find);
  const replace = String(watch.update.replace).replaceAll("{version}", String(newValue));

  if (!body.includes(find)) {
    return { ok: false, reason: `본문에서 찾지 못했습니다: ${find.slice(0, 60)}` };
  }
  if (find === replace) {
    return { ok: false, reason: "바꿀 것이 없습니다. find 와 replace 결과가 같습니다" };
  }

  const count = body.split(find).length - 1;
  const nextBody = body.replaceAll(find, replace);

  /* 다음 회차가 찾을 수 있도록 find 를 새 문자열로 옮긴다. */
  const nextFind = replace;

  /* anchor 가 바뀐 문장을 가리키고 있으면 함께 옮긴다. 안 그러면 check:blog 가 막는다. */
  const anchor = String(watch.anchor ?? "");
  const nextAnchor = anchor && anchor.includes(find) ? anchor.replaceAll(find, replace) : null;

  return { ok: true, body: nextBody, count, from: find, to: replace, nextFind, nextAnchor };
}

/** 사람이 읽을 PR 본문. 무엇을 바꿨는지가 아니라 왜 다시 봐야 하는지를 앞에 둔다. */
export function renderPullBody(applied) {
  const lines = [];
  lines.push("## 감시가 잡은 값으로 본문을 고쳤습니다", "");
  for (const item of applied) {
    lines.push(`### ${item.post}`, "");
    lines.push(`- **${item.label}**: \`${item.before}\` -> \`${item.now}\``);
    lines.push(`- 본문에서 바꾼 것: \`${item.from}\` -> \`${item.to}\` (${item.count}곳)`);
    lines.push(`- 흔들리는 것: ${item.why}`, "");
  }
  lines.push("---", "");
  lines.push("**바뀐 것은 위에 적힌 문자열뿐입니다.** 그 값으로 잰 다른 수치는 그대로입니다.");
  lines.push("글의 주장이 그 값에 기대고 있다면 다시 재고 본문을 함께 고쳐야 합니다.");
  lines.push("");
  lines.push("이 PR 은 감시 계획의 `update` 가 만든 것입니다. 계획은 각 글 폴더의 `track.json` 에 있습니다.");
  return lines.join("\n");
}
