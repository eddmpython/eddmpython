const EMPTY_PHRASES = [
  { pattern: /이를 통해/u, label: "이를 통해" },
  { pattern: /이러한 (?:과정|구조|방식|환경|접근|흐름)/u, label: "이러한 + 추상어" },
  { pattern: /(?:단순히|단순한) [^.?!\n]{0,50}(?:넘어|넘어서)/u, label: "단순히 무엇을 넘어" },
  {
    pattern: /(?:혁신적|효율적|체계적|유연한|강력한) (?:방식|환경|흐름|경험|기반|구조)/u,
    label: "근거 없는 수식어",
  },
  { pattern: /(?:새로운 가능성|가치를 제공|시너지를)/u, label: "내용 없는 홍보 표현" },
];

const SERIAL_PHRASES = [
  { pattern: /(?:지난|이전)\s*편/u, label: "지난편 또는 이전편" },
  { pattern: /다음\s*편/u, label: "다음편" },
  { pattern: /(?:이전|다음)\s*글/u, label: "이전 글 또는 다음 글" },
];

const ABSTRACT_TERMS = [
  "환경",
  "구조",
  "흐름",
  "경계",
  "맥락",
  "관점",
  "과정",
  "방식",
  "역할",
  "가치",
  "기반",
  "가능성",
  "본질",
  "체계",
  "전략",
  "경험",
  "판단",
  "규칙",
];

const METAPHOR_TERMS = ["작업장", "갈림길", "낭떠러지", "주사위", "유리벽", "공구함", "여정"];
const GENERIC_HEADING = /^(?:핵심|핵심 구조|새로운 흐름|더 나은 방식|확장 가능한 구조|마무리|결론|시작하기)$/u;
const MARKUP_ANCHOR = /`[^`]+`|\[[^\]]+\]\([^)]+\)|\d|["“][^"”]+["”]/u;
// 숫자 하나만 있어도 추상어 검사가 면제되던 탓에 발행 40편 1,751개 블록에서 이 검사가
// 한 번도 발동하지 않았다. v2는 숫자를 앵커로 인정하지 않는다.
const STRICT_MARKUP_ANCHOR = /`[^`]+`|\[[^\]]+\]\([^)]+\)/u;
// 문단이 "X는 ...입니다" 정의로 열리는 비율. 용어집 순회로 쓴 글에서 뚜렷하게 높다.
const DEFINITION_OPENER =
  /^\S{2,12}(?:은|는)\s[^.]{0,45}(?:입니다|말입니다|일입니다|뜻입니다|성질입니다|규칙입니다|순서입니다)\./u;
const DEFINITION_RATIO_MAX = 0.1;
const LENGTH_VARIATION_MIN = 0.25;
const CONCRETE_OBJECT =
  /(?:화면|버튼|메뉴|명령|코드|파일|폴더|URL|링크|오류|에러|로그|테스트|값|숫자|터미널|브라우저|표|줄)/u;
const OBSERVABLE_ACTION =
  /(?:열|누르|입력|실행|저장|삭제|바꾸|고치|확인|보이|나오|실패|통과|비교|읽|쓰|찾|선택|복사|붙여|설치|다운로드|업로드)/u;

function occurrences(text, term) {
  return text.split(term).length - 1;
}

function countTerms(text, terms) {
  return terms.reduce((count, term) => count + occurrences(text, term), 0);
}

function excerpt(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact;
}

function withoutMedia(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^!\[[^\]]*\]\([^\n]+\)\s*$/gm, " ")
    .replace(/<[^>]+>/g, " ");
}

function proseBlocks(body) {
  return withoutMedia(body)
    .split(/(?:\r?\n){2,}/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .filter((line) => !/^\s*(?:#{1,6}\s|https?:\/\/)/.test(line))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function hasConcreteAnchor(text, strict = false) {
  const withoutListNumbers = text.replace(/^\s*\d+[.)]\s+/gm, "");
  const markup = strict ? STRICT_MARKUP_ANCHOR : MARKUP_ANCHOR;
  return (
    markup.test(withoutListNumbers) ||
    (CONCRETE_OBJECT.test(withoutListNumbers) && OBSERVABLE_ACTION.test(withoutListNumbers))
  );
}

// 서술 문단만 남긴다. 표, 목록, 이미지, 코드, 제목은 리듬 계산에서 뺀다.
function narrativeParagraphs(body) {
  return proseBlocks(body).filter(
    (block) => !/^(?:####|\||[-*+]\s|\d+[.)]\s|```)/u.test(block),
  );
}

// 글자 수 하한이 만들던 균질한 카드를 대신 막는 검사다. 두 지표 모두 발행 40편과
// 교정 전후 원고에 직접 돌려 판별력을 확인한 뒤에 넣었다.
export function lintProseTexture(body) {
  const issues = [];
  const paragraphs = narrativeParagraphs(body);
  if (paragraphs.length < 6) return issues;

  const lengths = paragraphs.map((paragraph) => paragraph.replace(/\s/g, "").length);
  const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
  const deviation = Math.sqrt(
    lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / lengths.length,
  );
  const variation = mean ? deviation / mean : 0;
  if (variation < LENGTH_VARIATION_MIN) {
    issues.push({
      location: "본문 리듬",
      message: `문단 길이가 너무 고릅니다. 길이 변동계수 ${variation.toFixed(3)}이 ${LENGTH_VARIATION_MIN} 미만입니다`,
      excerpt: `문단 ${lengths.length}개, 최단 ${Math.min(...lengths)}자, 최장 ${Math.max(...lengths)}자`,
    });
  }

  const definitions = paragraphs.filter((paragraph) => DEFINITION_OPENER.test(paragraph));
  const ratio = definitions.length / paragraphs.length;
  if (ratio > DEFINITION_RATIO_MAX) {
    issues.push({
      location: "본문 진입",
      message: `정의로 여는 문단이 ${(ratio * 100).toFixed(0)}퍼센트입니다. 용어를 풀기 전에 장면을 먼저 씁니다`,
      excerpt: excerpt(definitions[0] ?? ""),
    });
  }
  return issues;
}

function phraseIssues(location, text) {
  return [
    ...EMPTY_PHRASES.filter(({ pattern }) => pattern.test(text)).map(({ label }) => ({
      location,
      message: `빈 관용구를 실제 동작으로 바꿉니다: ${label}`,
      excerpt: excerpt(text),
    })),
    ...SERIAL_PHRASES.filter(({ pattern }) => pattern.test(text)).map(({ label }) => ({
      location,
      message: `한 편만 읽어도 끝나는 글로 씁니다: ${label}`,
      excerpt: excerpt(text),
    })),
  ];
}

export function lintBlogStyle({ fields = {}, body, sections = [], strictAnchor = false }) {
  const issues = [];
  const abstractLimit = strictAnchor ? 3 : 4;

  for (const [name, value] of Object.entries(fields)) {
    issues.push(...phraseIssues(name, String(value ?? "")));
  }
  issues.push(...phraseIssues("본문", withoutMedia(body)));

  for (const [index, block] of proseBlocks(body).entries()) {
    const abstractCount = countTerms(block, ABSTRACT_TERMS);
    const metaphorCount = countTerms(block, METAPHOR_TERMS);
    const anchored = hasConcreteAnchor(block, strictAnchor);
    if (abstractCount >= abstractLimit && !anchored) {
      issues.push({
        location: `본문 문단 ${index + 1}`,
        message: "추상어가 이어집니다. 파일, 화면, 명령, 값, 오류 중 하나로 설명합니다",
        excerpt: excerpt(block),
      });
    } else if (metaphorCount >= 2 && !anchored) {
      issues.push({
        location: `본문 문단 ${index + 1}`,
        message: "비유가 실제 설명을 대신합니다. 사실을 먼저 쓰고 비유는 한 문장만 남깁니다",
        excerpt: excerpt(block),
      });
    }
  }

  for (const section of sections) {
    if (GENERIC_HEADING.test(section.heading)) {
      issues.push({
        location: `H2 ${section.heading}`,
        message: "본문을 열어야 뜻을 아는 제목입니다. 질문이나 실제 행동으로 바꿉니다",
        excerpt: section.heading,
      });
    }
    if (!hasConcreteAnchor(withoutMedia(section.content), strictAnchor)) {
      issues.push({
        location: `H2 ${section.heading}`,
        message: "실제 예가 없습니다. 파일, 화면, 버튼, 명령, 값, 오류 중 하나를 넣습니다",
        excerpt: section.heading,
      });
    }
  }

  return issues;
}
