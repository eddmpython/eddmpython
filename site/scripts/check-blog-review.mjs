/*
 * 글마다 평가 기록이 있는지, 그 기록이 실제로 돈 루프인지 본다.
 *
 * 왜 있는가. 2026-08-27 에 운영자가 004 를 읽고 첫 문단이 안 읽힌다고 지적했다.
 * `매출 CSV 한 장을 받았습니다` 는 누가 준 무슨 매출인지가 없고 `물어볼 것은 한 줄짜리입니다`
 * 는 뜻이 안 잡힌다. 전역 $blog-writing 의 `여러 명이 따로 읽고 다시 고치기` 를 돌렸으면
 * 첫 독자가 반드시 집는 자리인데 그 루프가 돌지 않았다. 규칙은 있었고 강제가 없었다.
 *
 * 이 검사기가 확정할 수 있는 것과 없는 것.
 *   할 수 있다  루프가 돌았는가. 수정본을 다시 읽었는가. 집은 자리를 실제로 고쳤는가
 *   할 수 없다  평가가 정직했는가. 기록을 형식적으로 채우지 않았는가
 * 8 번 규칙이 마지막 방어다. 앞선 라운드가 집은 문장이 본문에 그대로 남아 있으면 실패한다.
 * 지적해 놓고 안 고친 것을 그렇게 잡는다.
 *
 * 평가자의 수와 역할 이름을 여기에 적지 않는다. 그것은 전역 $blog-writing 이 정하고,
 * 그 스킬 자신이 `평가자의 수, 역할 이름, 단계 수처럼 바뀌는 값을 여러 곳에 적어 두면
 * 하나를 고칠 때 나머지가 조용히 어긋난다` 고 금지했다. 이 파일은 라운드 사이에 평가자
 * 수가 같은지만 보고 그 수가 몇인지는 묻지 않는다.
 */

/** 이 글의 평가 기록 파일 이름. 글 폴더 하나가 글 하나를 소유한다는 규칙을 따른다. */
export const reviewName = "review.json";

/**
 * 평가자 루프를 강제하기 전에 이미 발행된 글.
 *
 * 면제 목록을 코드에 숨기지 않고 여기 못 박는다. 이 세 편만 `loop: not-run` 을 쓸 수 있고
 * 006 부터는 그 상태 자체가 불가능하다. 면제가 새 글로 번지지 않고, 검증 안 된 글이
 * 공개 기록으로 남는다. 이 목록에 글을 더하지 않는다.
 */
export const legacyPosts = new Set([
  "001-ai-needs-an-environment",
  "002-ai-writing-tells",
  "003-python-qr",
  "004-dataframe-libraries",
  "005-python-history",
]);

/**
 * 라운드 수의 위아래.
 *
 * 전역 스킬은 `세 차례를 고쳐도 의견이 남으면 억지로 통과시키지 말고` 라고 한다.
 * 그 셋은 **수정 횟수**이지 평가 횟수가 아니다. 수정을 세 번 하면 그것을 확인하는
 * 라운드가 한 번 더 붙으므로 평가 라운드는 최대 넷이다.
 *
 * 2026-08-27 에 이 값을 3 으로 박아 두었다가 004 를 세 번 고친 뒤 확인 라운드에서 막혔다.
 * 스킬의 수를 옮겨 적으면서 한 칸 줄인 것이고, 스킬이 경고한 그 사고를 이 파일이 그대로 냈다.
 */
const minRounds = 2;
const maxRounds = 4;

const squeeze = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const filled = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * 평가 기록 하나를 검사해 문제를 배열로 준다. 빈 배열이면 통과다.
 *
 * @param {unknown} record  review.json 을 파싱한 것
 * @param {string} body     지금 글 본문
 * @param {string} postId   글 폴더 이름
 */
export function reviewProblems(record, body, postId) {
  const problems = [];
  const say = (message) => problems.push(message);

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return ["JSON 객체가 아닙니다"];
  }
  if (record.version !== 1) say("version 은 1 로 적습니다");

  // 루프를 돌리기 전에 나간 글. 그 사실 자체를 기록으로 남긴다.
  if (record.loop === "not-run") {
    if (!legacyPosts.has(postId)) {
      say(
        "loop: not-run 은 평가자 루프 강제 이전에 발행된 글만 쓸 수 있습니다. " +
          "이 글은 전역 $blog-writing 의 `여러 명이 따로 읽고 다시 고치기` 를 돌리고 rounds 를 적습니다",
      );
    }
    if (!filled(record.why)) say("why 에 루프를 돌리지 않은 채로 나간 경위를 적습니다");
    return problems;
  }

  /*
   * 끝까지 돌렸는데 평가자가 계속 새 지적을 내는 상태.
   *
   * 전역 스킬은 이 경우를 알고 길을 열어 두었다. `세 차례를 고쳐도 의견이 남으면 억지로
   * 통과시키지 않는다. 그 루프는 실패한 것이므로 해결하지 못한 문장과 의견 차이를 그대로
   * 보고한다. 이 보고는 종료가 아니라 사람이 판단할 일이 생겼다는 알림이다.`
   *
   * 그런데 이 파일에는 그 상태를 적을 자리가 없었다. `not-run` 은 안 돌린 것이고 rounds 는
   * 수렴한 것이라, 끝까지 돌렸는데 안 끝난 기록은 어느 쪽으로도 못 적었다. 남는 길은 마지막
   * 라운드의 findings 를 빈 배열로 적는 거짓이거나 `not-run` 으로 도망가는 것뿐이다.
   * 도달 불가능한 기준은 조작을 부른다.
   *
   * 2026-08-27 실측이 근거다. 001 과 003 과 005 를 다섯 역할로 네 라운드 돌렸더니 지적이
   * 113, 101, 114, 113 으로 줄지 않았다. 마지막 라운드가 새로 집은 자리 가운데는 앞 세 라운드가
   * 통과시킨 원문 문장이 있었다 (`link.png 를 더블클릭해서 컴퓨터 화면에 띄웁니다`). 글이
   * 나빠서가 아니라 평가자가 매번 다른 자리를 본다. 004 도 마지막 라운드에 16 건이 남아 있다.
   *
   * 도피처가 되지 않게 조건을 건다. 라운드를 끝까지 돌리고, 경위를 적고, 나머지 형식 검사는
   * 그대로 받는다. 한두 라운드 만에 이 값을 쓰면 아래에서 막힌다.
   */
  const unresolved = record.loop === "unresolved";
  if (unresolved && !filled(record.why)) {
    say("why 에 루프가 수렴하지 않은 경위와 사람이 판단할 자리를 적습니다");
  }
  if ("loop" in record && !unresolved) say('loop 에 쓸 수 있는 값은 "not-run" 과 "unresolved" 뿐입니다');

  const rounds = record.rounds;
  if (!Array.isArray(rounds) || rounds.length === 0) {
    say("rounds 배열이 없습니다. 전역 $blog-writing 의 `여러 명이 따로 읽고 다시 고치기` 결과를 적습니다");
    return problems;
  }
  if (rounds.length < minRounds) {
    say(
      `rounds 가 ${rounds.length} 회입니다. 수정본은 앞 의견을 보지 않은 같은 수의 평가자가 다시 읽습니다`,
    );
  }
  if (rounds.length > maxRounds) {
    say(
      `rounds 가 ${rounds.length} 회입니다. 세 차례를 고쳐도 의견이 남으면 억지로 통과시키지 말고 ` +
        "해결하지 못한 문장과 의견 차이를 보고합니다",
    );
  }
  // 실패 선언은 끝까지 가 본 사람만 할 수 있다. 두 라운드 만에 손을 들면 여기서 막힌다.
  if (unresolved && rounds.length !== maxRounds) {
    say(
      `loop: unresolved 는 rounds 를 ${maxRounds} 회까지 돌린 뒤에만 씁니다 (지금 ${rounds.length} 회). ` +
        "세 차례 고치고 다시 읽혔는데도 의견이 남았을 때의 기록입니다",
    );
  }

  // 라운드마다 평가자가 몇 명인지는 스킬이 정한다. 여기서는 라운드 사이에 같은지만 본다.
  let headcount = null;
  /** 인용문 하나가 몇 번째 라운드들에서 집혔는가. 같은 자리를 다시 집었는지 보려고 모은다. */
  const quotedIn = new Map();
  /** 그 인용문을 몇 사람이 집었는가. 라운드가 달라도 사람 수로 센다. */
  const quoteHits = new Map();
  const lastIndex = rounds.length - 1;

  rounds.forEach((round, index) => {
    const at = `rounds[${index}]`;
    const reviewers = round?.reviewers;
    if (!Array.isArray(reviewers) || reviewers.length === 0) {
      say(`${at}.reviewers 배열이 없습니다`);
      return;
    }
    if (headcount === null) headcount = reviewers.length;
    else if (reviewers.length !== headcount) {
      say(
        `${at} 의 평가자가 ${reviewers.length} 명입니다. 수정본은 같은 수의 평가자가 다시 읽습니다 (앞은 ${headcount} 명)`,
      );
    }

    const roles = new Set();
    reviewers.forEach((reviewer, slot) => {
      const seat = `${at}.reviewers[${slot}]`;
      if (!filled(reviewer?.role)) say(`${seat}.role 에 이 평가자가 맡은 역할을 적습니다`);
      else if (roles.has(reviewer.role)) say(`${seat}.role 이 같은 라운드에서 겹칩니다: ${reviewer.role}`);
      else roles.add(reviewer.role);

      const findings = reviewer?.findings;
      if (!Array.isArray(findings)) {
        say(`${seat}.findings 배열이 없습니다. 집을 것이 없으면 빈 배열로 둡니다`);
        return;
      }
      // unresolved 는 이 자리에 지적이 남아 있다는 것을 이미 선언한 기록이라 여기서 막지 않는다.
      if (index === lastIndex && findings.length > 0 && !unresolved) {
        say(
          `${seat} 가 마지막 라운드에서 아직 ${findings.length} 건을 집었습니다. ` +
            "다시 읽은 평가자 전원이 새 지적을 내지 못할 때 끝냅니다. " +
            '끝까지 돌렸는데도 의견이 남았다면 loop 를 "unresolved" 로 적고 why 에 경위를 남깁니다',
        );
      }
      findings.forEach((finding, n) => {
        const spot = `${seat}.findings[${n}]`;
        if (!filled(finding?.quote)) say(`${spot}.quote 에 이상한 문장을 그대로 인용합니다`);
        if (!filled(finding?.why)) say(`${spot}.why 에 왜 읽히지 않는지 적습니다`);
        if (!filled(finding?.fix)) say(`${spot}.fix 에 최소한으로 고친 문장을 적습니다`);
        if (filled(finding?.quote)) {
          const quote = squeeze(finding.quote);
          if (!quotedIn.has(quote)) quotedIn.set(quote, new Set());
          quotedIn.get(quote).add(index);
          quoteHits.set(quote, (quoteHits.get(quote) ?? 0) + 1);
        }
      });
    });
  });

  // 고치지 않기로 한 지적은 이유와 함께 남긴다. 다만 다음 평가자가 같은 자리를 다시 집으면
  // 그 판단이 틀린 것으로 본다.
  const kept = new Map();
  if (record.kept !== undefined) {
    if (!Array.isArray(record.kept)) say("kept 는 배열로 적습니다");
    else {
      record.kept.forEach((item, n) => {
        if (!filled(item?.quote)) say(`kept[${n}].quote 에 고치지 않기로 한 문장을 인용합니다`);
        if (!filled(item?.why)) say(`kept[${n}].why 에 고치지 않기로 한 이유를 적습니다`);
        if (filled(item?.quote)) kept.set(squeeze(item.quote), n);
      });
    }
  }

  /*
   * 여기가 이 검사기의 핵심이다. 집어 놓고 안 고친 문장은 본문에 그대로 남아 있다.
   * 기록을 지어내는 것까지는 못 막아도, 루프를 돌린 척하고 본문을 안 고친 것은 여기서 걸린다.
   *
   * 다만 한 사람이 한 번 집은 자리까지 강제하지는 않는다. 전역 스킬이 그렇게 정했다.
   * `규칙 밖 지적은 두 명 이상이 같은 자리를 지적하면 먼저 고치고, 한 명만 찾았더라도 뜻이
   * 틀렸거나 독자가 멈추는 문제면 고친다.` 즉 무엇을 고칠지 고르는 것은 글쓴이의 일이고
   * 이 검사기가 잡아야 할 것은 여럿이 같은 자리를 짚었는데도 그대로 둔 경우다.
   *
   * 2026-08-27 에 이 자리를 사람 수로 세지 않아서 004 가 10 건, 001 과 003 과 005 가 176 건
   * 걸렸다. 전부 한 사람이 한 번 집은 자리였다. 평가자를 다섯 역할로 네 라운드 돌리면 글의
   * 거의 모든 문장이 한 번씩은 지적되므로, 그 기준으로는 글 전체를 kept 에 옮겨 적어야 한다.
   * 그러면 kept 는 판단의 기록이 아니라 통과용 목록이 된다.
   */
  const flat = squeeze(body);
  for (const [quote, roundSet] of quotedIn) {
    if (kept.has(quote)) continue;
    if (!flat.includes(quote)) continue;
    if ((quoteHits.get(quote) ?? 0) < 2) continue;
    const first = Math.min(...roundSet);
    const hits = quoteHits.get(quote);
    say(
      `rounds[${first}] 부터 ${hits} 명이 집은 문장이 본문에 그대로 남아 있습니다: "${quote.slice(0, 60)}"` +
        " 고치거나, 고치지 않기로 했으면 kept 에 이유와 함께 적습니다",
    );
  }

  // 고치지 않기로 한 자리를 다음 평가자가 또 집었다면 그 판단이 틀린 것이다.
  // 한 라운드에만 나오는 것은 정상이다. kept 는 원래 어느 라운드에서 나온 지적이다.
  for (const [quote, n] of kept) {
    const roundSet = quotedIn.get(quote);
    if (!roundSet) {
      say(`kept[${n}] 의 문장이 어느 라운드에도 없습니다: "${quote.slice(0, 60)}"`);
      continue;
    }
    if (roundSet.size > 1) {
      say(
        `kept[${n}] 로 남긴 문장을 다음 평가자가 다시 집었습니다: "${quote.slice(0, 60)}"` +
          " 그 판단이 틀린 것으로 보고 고칩니다",
      );
    }
  }

  return problems;
}
