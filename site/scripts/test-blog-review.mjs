/*
 * check-blog-review.mjs 의 자기 검사.
 *
 * 이 검사기가 헐거우면 루프를 안 돌고도 통과하고, 빡빡하면 정직하게 돌린 기록이 막힌다.
 * 둘 다 조용히 일어나므로 통과해야 할 것과 막아야 할 것을 같은 수로 본다.
 */
import { reviewProblems } from "./check-blog-review.mjs";

const LEGACY = "004-dataframe-libraries";
const NEW = "006-some-new-post";

let failed = 0;

function pass(name, record, body, post = NEW) {
  const problems = reviewProblems(record, body, post);
  if (problems.length) {
    failed += 1;
    console.error(`  FAIL ${name}\n    통과해야 하는데 막았습니다: ${problems.join(" / ")}`);
  }
}

function block(name, record, body, hint, post = NEW) {
  const problems = reviewProblems(record, body, post);
  if (!problems.length) {
    failed += 1;
    console.error(`  FAIL ${name}\n    막아야 하는데 통과시켰습니다`);
    return;
  }
  if (hint && !problems.some((problem) => problem.includes(hint))) {
    failed += 1;
    console.error(`  FAIL ${name}\n    막긴 했는데 이유가 다릅니다\n    기대한 말 ${hint}\n    실제 ${problems.join(" / ")}`);
  }
}

/** 두 라운드를 돌고 끝난 정상 기록. 1 라운드가 집은 문장은 본문에서 사라졌다. */
const finished = () => ({
  version: 1,
  rounds: [
    {
      reviewers: [
        { role: "첫 독자", findings: [{ quote: "물어볼 것은 한 줄짜리입니다", why: "뜻이 안 잡힌다", fix: "무엇을 묻는지 그대로 쓴다" }] },
        { role: "구조 편집자", findings: [] },
      ],
    },
    {
      reviewers: [
        { role: "첫 독자", findings: [] },
        { role: "구조 편집자", findings: [] },
      ],
    },
  ],
});
const fixedBody = "서울 지역 수량이 전부 몇 개인지 묻습니다.";
const unfixedBody = "물어볼 것은 한 줄짜리입니다. 서울 지역 수량이 전부 몇 개일까요?";

/**
 * 두 평가자가 같은 자리를 집은 기록.
 *
 * 전역 스킬이 `두 명 이상이 같은 자리를 지적하면 먼저 고치고` 라고 한 그 경우다. 한 사람이
 * 한 번 집은 자리는 글쓴이가 고르지만 여럿이 짚은 자리를 그대로 두는 것은 막아야 한다.
 */
const agreed = () => ({
  version: 1,
  rounds: [
    {
      reviewers: [
        { role: "첫 독자", findings: [{ quote: "물어볼 것은 한 줄짜리입니다", why: "뜻이 안 잡힌다", fix: "무엇을 묻는지 그대로 쓴다" }] },
        { role: "구조 편집자", findings: [{ quote: "물어볼 것은 한 줄짜리입니다", why: "절을 여는 자리인데 무엇을 하는지 없다", fix: "무엇을 묻는지 그대로 쓴다" }] },
      ],
    },
    {
      reviewers: [
        { role: "첫 독자", findings: [] },
        { role: "구조 편집자", findings: [] },
      ],
    },
  ],
});

/* 통과해야 하는 것 */

pass("루프를 돌고 끝난 기록", finished(), fixedBody);
pass("루프 이전에 발행된 글", { version: 1, loop: "not-run", why: "강제 이전에 나갔다" }, unfixedBody, LEGACY);
pass("세 라운드까지는 허용", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "가", why: "나", fix: "다" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "라", why: "마", fix: "바" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, "고친 본문");
pass("고치지 않기로 하고 이유를 남김", {
  ...agreed(),
  kept: [{ quote: "물어볼 것은 한 줄짜리입니다", why: "다음 절의 말장난이 이 문장에 걸려 있어 그대로 둔다" }],
}, unfixedBody);
// 무엇을 고칠지 고르는 것은 글쓴이의 일이다. 한 사람이 한 번 집은 자리까지 강제하면
// kept 는 판단의 기록이 아니라 통과용 목록이 된다.
pass("한 사람만 집은 자리는 글쓴이가 고른다", finished(), unfixedBody);
pass("한 평가자가 여러 건을 집음", {
  version: 1,
  rounds: [
    {
      reviewers: [
        {
          role: "첫 독자",
          findings: [
            { quote: "가", why: "나", fix: "다" },
            { quote: "라", why: "마", fix: "바" },
          ],
        },
      ],
    },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, "전부 고쳤다");

/* 막아야 하는 것 */

block("기록이 객체가 아님", [], fixedBody, "JSON 객체가 아닙니다");
block("version 이 다름", { ...finished(), version: 2 }, fixedBody, "version");
block("rounds 가 없음", { version: 1 }, fixedBody, "rounds 배열이 없습니다");
block("rounds 가 비어 있음", { version: 1, rounds: [] }, fixedBody, "rounds 배열이 없습니다");
block(
  "한 라운드만 돌고 끝냄",
  { version: 1, rounds: [{ reviewers: [{ role: "첫 독자", findings: [] }] }] },
  fixedBody,
  "같은 수의 평가자가 다시 읽습니다",
);
// 수정 세 번 뒤에 확인 라운드가 한 번 더 붙으므로 평가 라운드 넷은 정상이다.
pass("세 번 고치고 네 번째로 확인함", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "가", why: "나", fix: "다" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "라", why: "마", fix: "바" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "사", why: "아", fix: "자" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, "고친 본문");
block("다섯 라운드까지 가면 통과시키지 않는다", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "가", why: "나", fix: "다" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "라", why: "마", fix: "바" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "사", why: "아", fix: "자" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "차", why: "카", fix: "타" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, "고친 본문", "억지로 통과시키지 말고");
block("두 번째 라운드에 평가자가 줄어듦", {
  version: 1,
  rounds: [
    {
      reviewers: [
        { role: "첫 독자", findings: [] },
        { role: "구조 편집자", findings: [] },
      ],
    },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, fixedBody, "같은 수의 평가자가 다시 읽습니다");
block("마지막 라운드에 지적이 남음", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자", findings: [] }] },
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "가", why: "나", fix: "다" }] }] },
  ],
}, "본문", "새 지적을 내지 못할 때 끝냅니다");

/*
 * 끝까지 돌렸는데 수렴하지 않은 기록.
 *
 * 전역 스킬이 정한 세 번째 종료다. 그 자리가 없으면 정직한 기록이 막히고 findings 를 빈 배열로
 * 적는 거짓만 남는다. 그렇다고 아무 때나 쓰면 도피처가 되므로 끝까지 가 본 기록만 받는다.
 */
const unresolvedRecord = () => ({
  version: 1,
  loop: "unresolved",
  why: "네 라운드를 돌렸고 지적이 줄지 않았다. 마지막 라운드가 앞 세 라운드가 통과시킨 문장을 새로 집었다",
  rounds: [
    {
      reviewers: [
        { role: "첫 독자", findings: [{ quote: "같은 자리", why: "나", fix: "다" }] },
        { role: "구조 편집자", findings: [{ quote: "같은 자리", why: "또 같은 곳", fix: "다" }] },
      ],
    },
    {
      reviewers: [
        { role: "첫 독자", findings: [{ quote: "라", why: "마", fix: "바" }] },
        { role: "구조 편집자", findings: [] },
      ],
    },
    {
      reviewers: [
        { role: "첫 독자", findings: [{ quote: "사", why: "아", fix: "자" }] },
        { role: "구조 편집자", findings: [] },
      ],
    },
    {
      reviewers: [
        { role: "첫 독자", findings: [{ quote: "차", why: "카", fix: "타" }] },
        { role: "구조 편집자", findings: [] },
      ],
    },
  ],
});
pass("끝까지 돌렸는데 의견이 남은 기록", unresolvedRecord(), "고친 본문");
block(
  "unresolved 인데 경위를 안 적음",
  { ...unresolvedRecord(), why: "" },
  "고친 본문",
  "why 에 루프가 수렴하지 않은 경위",
);
block(
  "두 라운드 만에 손을 듦",
  { ...unresolvedRecord(), rounds: unresolvedRecord().rounds.slice(0, 2) },
  "고친 본문",
  "회까지 돌린 뒤에만 씁니다",
);
block(
  "unresolved 라도 여럿이 집은 문장은 고쳐야 한다",
  unresolvedRecord(),
  "같은 자리 가 그대로 있는 본문",
  "본문에 그대로 남아 있습니다",
);
block("loop 에 모르는 값", { ...finished(), loop: "maybe" }, fixedBody, '"not-run" 과 "unresolved"');
block("같은 라운드에 역할이 겹침", {
  version: 1,
  rounds: [
    {
      reviewers: [
        { role: "첫 독자", findings: [] },
        { role: "첫 독자", findings: [] },
      ],
    },
    {
      reviewers: [
        { role: "첫 독자", findings: [] },
        { role: "구조 편집자", findings: [] },
      ],
    },
  ],
}, fixedBody, "겹칩니다");
block("역할 이름이 없음", {
  version: 1,
  rounds: [
    { reviewers: [{ findings: [] }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, fixedBody, "role");
block("findings 가 배열이 아님", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자" }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, fixedBody, "findings 배열이 없습니다");
block("인용 없이 지적함", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자", findings: [{ why: "이상하다", fix: "고쳤다" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, fixedBody, "quote");
block("고친 문장을 안 적음", {
  version: 1,
  rounds: [
    { reviewers: [{ role: "첫 독자", findings: [{ quote: "가", why: "나" }] }] },
    { reviewers: [{ role: "첫 독자", findings: [] }] },
  ],
}, "고친 본문", "fix");

// 이것이 이 검사기의 핵심이다. 여럿이 같은 자리를 짚었는데 그대로 두면 막는다.
block("여럿이 집은 자리를 안 고침", agreed(), unfixedBody, "본문에 그대로 남아 있습니다");
block(
  "남기기로 한 자리를 다음 평가자가 다시 집음",
  {
    version: 1,
    rounds: [
      { reviewers: [{ role: "첫 독자", findings: [{ quote: "같은 자리", why: "가", fix: "나" }] }] },
      { reviewers: [{ role: "첫 독자", findings: [{ quote: "같은 자리", why: "다", fix: "라" }] }] },
      { reviewers: [{ role: "첫 독자", findings: [] }] },
    ],
    kept: [{ quote: "같은 자리", why: "그대로 두기로 했다" }],
  },
  "같은 자리 가 본문에 있다",
  "다시 집었습니다",
);
block("kept 에 이유가 없음", {
  ...finished(),
  kept: [{ quote: "물어볼 것은 한 줄짜리입니다" }],
}, unfixedBody, "kept[0].why");
block("kept 가 어느 라운드에도 없는 문장", {
  ...finished(),
  kept: [{ quote: "아무도 집지 않은 문장", why: "그래도 남긴다" }],
}, fixedBody, "어느 라운드에도 없습니다");

// 면제는 이미 발행된 글에만 있고 새 글로 번지지 않는다.
block(
  "새 글이 면제를 흉내냄",
  { version: 1, loop: "not-run", why: "귀찮다" },
  unfixedBody,
  "평가자 루프 강제 이전에 발행된 글만",
);
block("면제인데 경위를 안 적음", { version: 1, loop: "not-run" }, unfixedBody, "why", LEGACY);
block("loop 에 이상한 값", { ...finished(), loop: "skipped" }, fixedBody, 'loop 에 쓸 수 있는 값은');

if (failed) {
  console.error(`\nblog review 자기 검사 ${failed}건 실패`);
  process.exit(1);
}
console.log("blog review 자기 검사 통과");
