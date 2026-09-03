/**
 * 강의장 교안 렌더. 아주 작은 마크다운만 다룬다.
 *
 * classroom.ts 에서 떼어 낸 이유는 검사할 수 있게 하려는 것이다. 이 파일은 아무것도
 * import 하지 않으므로 교안 번들 없이도 테스트가 돈다.
 *
 * 다루는 것은 교안이 실제로 쓰는 것뿐이다. h2, h4, 문단, 목록, 표, 링크, 코드, 이미지, 영상.
 * 연속된 이미지는 슬라이더가 되고 영상은 재생기가 된다. 바깥 영상은 유튜브 자리가 되고
 * 아직 발행하지 않은 시각물은 준비 중 자리가 된다.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const IMAGE = /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/;
const VIDEO = /\.(mp4|webm|mov)$/i;
/** 링크 하나로만 이루어진 문단. 라벨을 캡션으로 쓴다. */
const SOLO_LINK = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;
/** 굵은 글씨 한 줄만 있는 문단. 섹션 안에서 사례를 가르는 라벨이다. */
const LABEL = /^\*\*[^*\n]+\*\*$/;
const TABLE_DIVIDER = /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/;

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** 교안에서 쓰는 GFM 표. 셀 안의 코드와 링크도 문단과 같은 규칙으로 안전하게 그린다. */
function markdownTable(block: string): string | null {
  const lines = block.split("\n").map((line) => line.trim());
  if (lines.length < 2 || !TABLE_DIVIDER.test(lines[1])) return null;
  const head = tableCells(lines[0]);
  const divider = tableCells(lines[1]);
  if (head.length < 2 || divider.length !== head.length) return null;
  const rows = lines.slice(2).map(tableCells);
  if (rows.some((row) => row.length !== head.length)) return null;
  return `<div class="table-wrap"><table><thead><tr>${head
    .map((cell) => `<th scope="col">${inline(cell)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

/**
 * 섹션을 닫는 질문에 표시를 남긴다.
 *
 * 교안은 설명글 끝에 다음 섹션을 여는 질문을 붙인다. 그 한 문장이 본문에 묻혀 있으면
 * 섹션이 어디서 끝나는지 눈에 안 보인다. **문단을 쪼개지 않는다.** 설명은 한 문단이라는
 * 작성 규칙을 지키면서 마지막 질문 문장만 감싼다.
 *
 * 앞 문장이 있어야 감싼다. 문단 전체가 질문 하나면 그건 이음말이 아니라 도입 질문이다.
 */
function leadOut(html: string): string {
  if (!html.endsWith("?")) return html;
  const m = html.match(/^(.*[.!?]["'”]?\s+)([^.!?]{4,80}\?)$/s);
  if (!m) return html;
  return `${m[1]}<em class="q">${m[2]}</em>`;
}
/** 아직 발행하지 않은 시각물 자리. 그대로 두면 깨진 그림이 강의 화면에 뜬다. */
const PENDING = /^media:\/\/([a-z0-9-]+)$/i;

/**
 * 비공개 시각물.
 *
 * `room://<sha256>.<ext>` 는 교안 KV 네임스페이스의 `media/<sha256>.<ext>` 를 가리킨다. 강사
 * 사진과 연락처가 든 장표처럼 공개 데이터셋(Hugging Face)에 올리면 안 되는 것이 여기로 온다
 * (2026-09-02 운영자 결정). Worker 는 방 세션이 있는 요청에만 준다. 교안은 방 이름을 모르므로
 * 렌더러가 `/room/<방>/media/<이름>` 으로 바꿔 그린다. 주소는 내용 해시라 추측할 수 없다.
 *
 * **`eddmpython-course/scripts/roomMediaCatalog.mjs` 의 `ROOM_MEDIA` 와 같아야 한다.**
 * 한쪽을 고치면 다른 쪽도 같은 날 고친다.
 */
export const ROOM_MEDIA = /^room:\/\/([a-f0-9]{64}\.(?:png|webp|jpg|gif|mp4|webm))$/;
/** Worker 가 경로에서 받는 객체 이름. `..` 같은 것은 여기서 걸러진다. */
export const ROOM_MEDIA_KEY = /^[a-f0-9]{64}\.(?:png|webp|jpg|gif|mp4|webm)$/;
const MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

export function mediaContentType(key: string): string {
  return MEDIA_TYPES[key.slice(key.lastIndexOf(".") + 1)] ?? "application/octet-stream";
}

export function mediaSrc(base: string, key: string): string {
  return `${base}/${key}`;
}

/**
 * 실행 칸 주소. 교안이 링크 하나짜리 문단으로 적는다.
 *
 * **모양은 공개 블로그의 `src/components/Markdown.tsx` 의 `CODARO_CELL` 과 같아야 한다.**
 * 한쪽을 고치면 다른 쪽도 같은 날 고친다.
 */
const CODARO =
  /^https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export type CourseSceneBeat = {
  effect: "enter" | "replace" | "focus" | "compare" | "compose" | "annotate" | "run" | "simulate";
  targets: number[];
  note?: string;
};
export type CourseScene = {
  id: string;
  role: "open" | "explain" | "invert" | "close";
  layout: "stage" | "sequence" | "compare" | "pair" | "lead" | "code" | "demo";
  fit?: "contain" | "cover" | "cover-top";
  visualCount: number;
  beats: CourseSceneBeat[];
};

/**
 * 5 는 서로 다른 시각자산 둘의 학습 관계를 기록한다. 6은 모든 관계를 같은 좌표의
 * 단일 시각자료 장표로 펼친다. 7 은 표를 시각물에서 빼고, 8 은 모든 무대를 16:9로 고정한다. 교안 정본
 * (`eddmpython-course/scripts/course-scene.mjs`) 과 같은 날 같이 움직인다.
 *
 * 표를 시각물로 세던 계약 6 이하의 묶음은 장면의 시각물 수가 어긋나 강의 모드가 닫히므로,
 * 이 런타임을 배포한 직후 교안을 다시 발행한다.
 */
export const COURSE_SCENE_RUNTIME = 9;

export type CourseSceneFrame = {
  effect: CourseSceneBeat["effect"];
  targets: number[];
  visible: number[];
  focus: number[];
  compare: number[];
  composition: number[];
  annotation: string;
  annotationTargets: number[];
  interaction: number[];
  cue: string;
  sequenceIndex: number;
  sequenceTotal: number;
};

const COURSE_SCENE_CUES: Record<CourseSceneBeat["effect"], string> = {
  enter: "살펴보기",
  replace: "다음 화면",
  focus: "핵심",
  compare: "비교",
  compose: "함께 보기",
  annotate: "판단 기준",
  run: "실행",
  simulate: "직접 조작",
};

/**
 * 선언된 beat를 클릭별 완성 프레임으로 한 번만 계산한다.
 *
 * 브라우저가 클릭할 때마다 첫 beat부터 다시 재생하면 시각물 수와 beat 수를 곱한 만큼 DOM을
 * 반복해서 지우고 붙이게 된다. 주석과 강조가 다음 화면에 남는 문제도 같은 재생 루프에서 생긴다.
 * 렌더러가 상태를 확정하고 브라우저는 현재 프레임 하나만 투영한다.
 */
export function compileSceneTimeline(scene: CourseScene): CourseSceneFrame[] {
  const frames: CourseSceneFrame[] = [];

  for (const beat of scene.beats) {
    /**
     * 계약 6부터 장표 한 장에는 시각자료 하나만 둔다. 예전 계약의 다중 대상 beat는
     * 교안을 다시 쓰게 하지 않고 같은 무대의 연속 프레임으로 펼친다. 비교와 조합의 뜻은
     * cue에 남지만 두 자료를 축소해 한 화면에 놓지 않는다.
     */
    beat.targets.forEach((target, index) => {
      const focused = beat.effect === "focus" ? [target] : [];
      const compared = beat.effect === "compare" ? [target] : [];
      const composed = beat.effect === "compose" ? [target] : [];
      const interacting = beat.effect === "run" || beat.effect === "simulate" ? [target] : [];
      frames.push({
        effect: beat.effect,
        targets: [target],
        visible: [target],
        focus: focused,
        compare: compared,
        composition: composed,
        annotation: beat.note || "",
        annotationTargets: beat.note ? [target] : [],
        interaction: interacting,
        cue: COURSE_SCENE_CUES[beat.effect],
        sequenceIndex: index + 1,
        sequenceTotal: beat.targets.length,
      });
    });
  }
  return frames;
}

export type CourseCell = {
  title?: string;
  description?: string;
  code: string;
  hint?: string;
};
export type Cells = Record<string, CourseCell>;

/** 용어와 한 줄 정의. 묶음 최상위 glossary 추가 필드가 그대로 온다. */
export type Glossary = Record<string, string>;

/**
 * 본문의 용어 자리를 `[용어](term://용어)` 마커로 감싼다. **감싸는 자리의 정본은 여기다.**
 *
 * 발행 시점이 아니라 렌더 시점에 감싸는 이유는 배포 독립성이다. 발행이 마커를 심으면
 * 그 마커를 모르는 배포본이 깨진 링크를 그리고, 교안 발행이 강의장 배포 순서에 묶인다.
 * 운영자가 2026-08-31 에 그 연관을 끊으라고 못박았다. 묶음은 데이터(glossary)만 싣고,
 * 옛 배포본은 그 필드를 조용히 무시한다.
 *
 * 매칭 규칙은 넷이고, 교안 저장소의 죽은 용어 검사
 * (`eddmpython-course/scripts/glossary.mjs`) 와 **같아야 한다.** 한쪽을 고치면 다른 쪽도
 * 같은 날 고친다.
 *   1. 산문 문단과 목록 줄에서만 감싼다. 코드, 제목, 표, 이미지, 링크 문단은 건드리지 않는다
 *   2. 용어 앞이 한글, 영문, 숫자면 감싸지 않는다. 종속변수 안의 변수를 잡지 않는다.
 *      뒤는 제한하지 않는다. 한국어 조사는 뒤에 붙는다 (변수를, 변수가)
 *   3. 긴 용어가 먼저다. "가상 환경" 이 "환경" 보다 먼저 잡힌다
 *   4. 글마다 용어당 한 번만 감싼다. 용어집이 늘어도 점선 밑줄이 본문을 덮지 않게 한다
 */
const TERM_SKIP_LINE = [
  /^#{1,6}\s/, // 제목은 목차와 장면 머리다
  /^!\[/, // 이미지 블록
  /^\|/, // 표. 좁은 칸에 툴팁을 겹치지 않는다
  /^https?:\/\/\S+$/, // 실행 칸과 영상 주소
  /^\[[^\]]+\]\([^)]+\)$/, // 링크 하나짜리 문단은 영상 캡션이다
  /^\*\*[^*\n]+\*\*$/, // 사례 라벨
];
/** 인라인 코드와 기존 링크를 보호 구간으로 갈라 낸다. 홀수 인덱스가 보호 구간이다. */
const TERM_PROTECTED = /(`[^`]*`|\[[^\]]*\]\([^)]*\))/;

function markTermFree(text: string, sortedTerms: string[], marked: Set<string>): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    let hit: string | null = null;
    for (const term of sortedTerms) {
      if (!text.startsWith(term, i)) continue;
      const before = i > 0 ? text[i - 1] : "";
      if (before && /[A-Za-z0-9가-힣]/.test(before)) continue;
      hit = term;
      break;
    }
    if (hit) {
      if (marked.has(hit)) {
        out += hit;
      } else {
        marked.add(hit);
        out += `[${hit}](term://${hit})`;
      }
      i += hit.length;
    } else {
      out += text[i];
      i += 1;
    }
  }
  return out;
}

export function markGlossaryTerms(body: string, glossary: Glossary): string {
  const sortedTerms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  if (!sortedTerms.length) return body;
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let fenced = false;
  const marked = new Set<string>();
  return lines
    .map((line) => {
      if (/^```/.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      const trimmed = line.trim();
      if (!trimmed || TERM_SKIP_LINE.some((rule) => rule.test(trimmed))) return line;
      return line
        .split(TERM_PROTECTED)
        .map((part, index) => (index % 2 === 1 ? part : markTermFree(part, sortedTerms, marked)))
        .join("");
    })
    .join("\n");
}

/**
 * markGlossaryTerms 가 심은 마커를 툴팁으로 바꾼다.
 *
 * 마커가 inline() 을 거쳐 만들어 낸 `<a href="term://...">` 앵커만 찾아 바꾼다.
 * 정의가 묶음에 없으면 앵커를 벗겨 맨글자로 되돌린다. term:// 는 브라우저가 열 수 있는
 * 주소가 아니라서 링크로 남기면 누르는 순간 깨진다.
 */
export function applyGlossary(html: string, glossary: Glossary, prefix: string): string {
  let n = 0;
  return html.replace(/<a href="term:\/\/([^"]*)">([^<]*)<\/a>/g, (_, rawTerm: string, label: string) => {
    // href 는 esc() 를 거쳐 왔다. &amp; 같은 escape 를 되돌려야 묶음의 키와 맞는다.
    const term = rawTerm
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const def = glossary[term];
    if (!def) return label;
    n += 1;
    const id = `${prefix}-${n}`;
    return `<span class="term" tabindex="0" aria-describedby="${id}">${label}<span class="term-pop" id="${id}" role="tooltip">${esc(def)}</span></span>`;
  });
}

/**
 * 실행 칸을 그린다.
 *
 * 2026-08-20 까지 이 자리가 없었다. 렌더러가 codaro 주소를 못 알아봐서 생 주소가 그대로
 * 보이는 링크로 나갔고, 003 과 004 가 `값을 바꿔 실행해 보세요` 라고 말하는데 수강생
 * 화면에는 바꿀 칸도 코드도 없었다. 여덟 곳이 그랬다.
 */
function cellCard(id: string, cell: CourseCell): string {
  /**
   * 모양은 codaro 의 학습 셀을 따른다. 제목 줄 오른쪽에 실행 하나, 그 아래 설명과 할 일,
   * 내용만큼 자라는 코드 칸, 실행한 뒤에만 나타나는 출력 상자다. 상태 글자, 자리 표시
   * 문장, 크기 조절 손잡이처럼 실행 전에는 뜻이 없는 것은 두지 않는다.
   *
   * rows 는 스크립트가 붙기 전의 첫 높이다. 줄 수와 같게 두면 스크립트가 맞춘 높이와
   * 같아서 페이지가 열릴 때 칸이 출렁이지 않는다.
   */
  const rows = Math.max(2, cell.code.split("\n").length);
  // 빈 제목도 없는 제목이다. 그때는 셀 이름이 곧 `실습` 이라 접근성 이름에 겹말을 만들지 않는다.
  const title = cell.title?.trim() || "";
  const label = title ? `${title} 실습` : "실습";
  return `<section class="cell" data-cell="${esc(id)}" aria-label="${esc(label)}">
<div class="cell-h"><span class="cell-t">${esc(title || "실습")}</span><button type="button" class="cell-reset" data-reset hidden>처음으로</button><button type="button" class="cell-run" data-run><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg><span>실행</span></button></div>
${cell.description ? `<p class="cell-d">${esc(cell.description)}</p>` : ""}
${cell.hint ? `<p class="cell-hint">${esc(cell.hint)}</p>` : ""}
<div class="cell-f"><textarea class="cell-c" data-code spellcheck="false" wrap="off" rows="${rows}" aria-label="Python 코드">${esc(cell.code)}</textarea></div>
<div class="cell-out" data-output hidden><div class="cell-out-h"><span>출력</span><span class="cell-s" data-state aria-live="polite"></span></div><pre class="cell-o" data-out></pre></div>
</section>`;
}

/**
 * 셀 이름은 있는데 묶음에 그 셀이 없을 때.
 *
 * 조용히 링크로 흘려보내면 2026-08-20 의 결함이 그대로 재발한다. 화면에 드러내야
 * 발행한 사람이 안다.
 */
function missingCell(id: string): string {
  return `<section class="cell cell-miss"><b>실행 칸을 묶음에서 찾지 못했습니다</b><i>${esc(id)}</i></section>`;
}
const YOUTUBE =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)([\w-]{6,})|youtube\.com\/shorts\/([\w-]{6,})|youtu\.be\/([\w-]{6,}))(?:[&?#]\S*)?$/;

/** `&t=150s` 또는 `?start=150` 에서 시작 초를 집는다. `1m30s` 꼴도 받는다. */
function startSeconds(url: string): number {
  const m = url.match(/[&?](?:t|start)=([^&#]+)/);
  if (!m) return 0;
  const raw = m[1];
  if (/^\d+$/.test(raw)) return Number(raw);
  const hms = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (!hms || (!hms[1] && !hms[2] && !hms[3])) return 0;
  return Number(hms[1] ?? 0) * 3600 + Number(hms[2] ?? 0) * 60 + Number(hms[3] ?? 0);
}

/**
 * 유튜브 주소 하나를 집는다. shorts 는 세로 영상이라 틀도 세로로 잡는다.
 *
 * **시작 초를 버리지 않는다.** 바깥 사례 영상은 앞부분이 인사와 얼굴인 경우가 많아서
 * 시연 구간을 초로 지목해 건다. 그것을 떨어뜨리면 강의 화면에 도입부가 먼저 뜬다.
 */
export function youtube(url: string): { id: string; tall: boolean; start: number } | null {
  const m = url.match(YOUTUBE);
  if (!m) return null;
  return { id: m[1] ?? m[2] ?? m[3], tall: Boolean(m[2]), start: startSeconds(url) };
}

/** 초를 사람이 읽는 시각으로. 90 이면 `1분 30초`, 45 면 `45초` 다. */
function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return `${s}초`;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

/**
 * 썸네일만 깔고 누를 때 유튜브를 부른다. 미리 부르면 강의 화면에 검은 칸이 먼저 뜨고
 * 열지도 않은 영상 때문에 바깥 요청이 나간다. 썸네일은 img 가 아니라 배경으로 넣는다.
 * article 안의 img 는 누르면 확대가 열리므로 그 자리와 겹치면 안 된다.
 */
function youtubeFigure(
  video: { id: string; tall: boolean; start: number },
  label: string,
): string {
  const base = video.tall
    ? `https://www.youtube.com/shorts/${video.id}`
    : `https://www.youtube.com/watch?v=${video.id}`;
  // 새 탭으로 여는 주소에도 시작 초를 남긴다. 눌러서 나가는 사람도 같은 자리에서 봐야 한다.
  const watch = video.start ? `${base}${video.tall ? "?" : "&"}t=${video.start}` : base;
  const thumb = `url(https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg), url(https://i.ytimg.com/vi/${video.id}/hqdefault.jpg)`;
  return `<figure class="yt${video.tall ? " tall" : ""}"><div class="frame"><button type="button" class="ytplay" style="background-image:${esc(
    thumb,
  )}" data-yt="${esc(video.id)}"${
    video.start ? ` data-start="${video.start}"` : ""
  } data-label="${esc(label)}" aria-label="${esc(
    label || "YouTube 영상",
  )} 재생"><span></span></button></div><figcaption><span>${esc(label)}${
    // 어디서 시작하는지 미리 알려 준다. 긴 영상은 앞이 인사와 얼굴이라 시연 자리로 보낸다.
    video.start ? `<i class="at">${esc(clock(video.start))}부터</i>` : ""
  }</span><a href="${esc(
    watch,
  )}" target="_blank" rel="noreferrer">YouTube에서 열기</a></figcaption></figure>`;
}

function pendingMedia(key: string, alt: string, caption: string, label = "시각물 준비 중"): string {
  return `<div class="pending"><b>${esc(label)}</b><span>${esc(alt)}</span>${
    caption ? `<i>${esc(caption)}</i>` : ""
  }<i>${esc(key)}</i></div>`;
}

/** `mediaBase` 는 비공개 시각물이 붙을 방 경로다. 방 밖(검사, 감사)에서는 없다. */
type RenderState = { visual: number; mediaBase?: string };

function visual(html: string, state: RenderState): string {
  state.visual += 1;
  return html.replace(/^<([a-z]+)(\s|>)/, `<$1 data-visual="${state.visual}"$2`);
}

/** 외부 HTML 렌더러와 시뮬레이션은 임의 HTML 대신 격리된 https 문서로 받는다. */
function courseEmbed(raw: string): string | null {
  const values: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^(src|title|ratio):\s*(.+?)\s*$/);
    if (!match || values[match[1]]) return null;
    values[match[1]] = match[2];
  }
  if (!/^https:\/\/[^\s]+$/.test(values.src ?? "") || !values.title) return null;
  const ratio = /^\d{1,2}\/\d{1,2}$/.test(values.ratio ?? "") ? values.ratio : "16/9";
  return `<figure class="course-embed" style="--course-embed-ratio:${esc(ratio)}"><iframe src="${esc(
    values.src,
  )}" title="${esc(values.title)}" sandbox="allow-scripts allow-forms" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><figcaption>${esc(
    values.title,
  )}</figcaption></figure>`;
}

/** 코드가 아닌 구간을 빈 줄로 갈라 블록마다 태그를 붙인다. */
function blocks(text: string, headings: string[], cells: Cells, state: RenderState): string[] {
  const out: string[] = [];
  let images: string[] = [];
  const flush = () => {
    if (!images.length) return;
    out.push(...images);
    images = [];
  };
  for (const raw of text.split(/\n{2,}/)) {
    const b = raw.trim();
    if (!b) continue;
    const img = b.match(IMAGE);
    if (img) {
      const waiting = img[2].match(PENDING);
      if (waiting) {
        images.push(visual(pendingMedia(waiting[1], img[1], img[3] ?? ""), state));
        continue;
      }
      let src = img[2];
      if (/^room:\/\//i.test(src)) {
        // 비공개 시각물. 방 경로를 모르는 자리(검사, 감사)에서는 자리만 보이고, 주소 모양이
        // 틀리면 깨진 그림 대신 그 사실을 드러낸다. 조용히 링크로 흘리면 발행한 사람이 모른다.
        const priv = src.match(ROOM_MEDIA);
        if (!priv || !state.mediaBase) {
          images.push(
            visual(pendingMedia(src, img[1], img[3] ?? "", priv ? "비공개 시각물" : "비공개 시각물 주소 오류"), state),
          );
          continue;
        }
        src = mediaSrc(state.mediaBase, priv[1]);
      }
      // 영상도 시각 자산이다. 확장자로 갈라 태그를 바꾼다.
      //
      // 캡션(img[3])을 반드시 같이 그린다. 2026-08-21 까지 정규식은 캡션을 잡아 놓고
      // 여기서 버렸다. 교안 캡션 45개가 수강생 화면에 하나도 안 나갔다. 캡션은 그 장면을
      // 어떻게 읽을지 말하는 자리라 그게 없으면 도식만 덩그러니 뜬다.
      const caption = img[3] ? `<figcaption>${esc(img[3])}</figcaption>` : "";
      if (VIDEO.test(src)) {
        flush();
        out.push(visual(
          `<figure class="media"><video src="${esc(src)}" controls playsinline preload="metadata"></video>${caption}</figure>`,
          state,
        ));
      } else {
        images.push(
          visual(`<figure class="media"><img src="${esc(src)}" alt="${esc(img[1])}" loading="lazy">${caption}</figure>`, state),
        );
      }
      continue;
    }
    flush();
    const table = markdownTable(b);
    if (b.startsWith("## ")) {
      // 목차가 여기로 뛴다. 번호로 거는 이유는 제목이 한글이라 slug 를 만들면 깨지기 때문이다.
      const title = b.slice(3);
      headings.push(title);
      const n = String(headings.length).padStart(2, "0");
      // 번호는 목차의 번호와 같다. 지금 몇 번째를 보는지 세지 않고 알 수 있다.
      out.push(
        `<h2 id="s${headings.length}"><span class="sn" aria-hidden="true">${n}</span>${esc(title)}</h2>`,
      );
    } else if (b.startsWith("### ")) out.push(`<h3>${esc(b.slice(4))}</h3>`);
    else if (b.startsWith("#### ")) out.push(`<h4>${esc(b.slice(5))}</h4>`);
    // 표는 읽기 본문이지 강의 시각물이 아니다 (계약 7, 2026-09-02 운영자 지시). data-visual 을
    // 붙이지 않으므로 강의 무대 CSS 가 문단처럼 숨기고 시각물 수에도 들지 않는다.
    else if (table) out.push(table);
    else if (/^[-*]\s/m.test(b)) {
      const items = b.split("\n").filter((l) => /^[-*]\s/.test(l.trim()));
      out.push(`<ul>${items.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join("")}</ul>`);
    } else if (/^https?:\/\/\S+$/.test(b)) {
      // 실행 칸이 먼저다. 못 알아보면 생 주소가 그대로 강의 화면에 찍힌다.
      const run = b.match(CODARO);
      if (run) {
        const cell = cells[run[1]];
        out.push(visual(cell && typeof cell.code === "string" ? cellCard(run[1], cell) : missingCell(run[1]), state));
        continue;
      }
      const video = youtube(b);
      out.push(video ? visual(youtubeFigure(video, ""), state) : `<p><a href="${esc(b)}">${esc(b)}</a></p>`);
    } else {
      const solo = b.match(SOLO_LINK);
      const video = solo ? youtube(solo[2]) : null;
      if (video) {
        out.push(visual(youtubeFigure(video, solo![1]), state));
      } else if (LABEL.test(b)) {
        // 한 섹션에 화면이 여럿일 때 어느 화면 이야기인지 짚는 라벨이다.
        // 굵은 글씨만으로는 본문과 안 갈려서 자기 태그를 준다.
        out.push(`<p class="lb">${inline(b)}</p>`);
      } else {
        out.push(`<p>${leadOut(inline(b))}</p>`);
      }
    }
  }
  flush();
  return out;
}

/**
 * 코드 펜스를 **먼저** 떼어 낸다.
 *
 * 빈 줄로 먼저 자르면 코드 안의 빈 줄에서 코드가 갈라진다. 앞 조각만 pre 가 되고 나머지는
 * 문단이 되어 수강생 화면에 코드가 부서져 나온다. 강의장에서 그대로 따라 치는 것이라
 * 부서지면 그 시간이 통째로 날아간다.
 */
function renderMarkdownParts(
  body: string,
  headings: string[] = [],
  cells: Cells = {},
  state: RenderState = { visual: 0 },
): string[] {
  const text = body.replace(/\r\n/g, "\n");
  const out: string[] = [];
  const fence = /^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    out.push(...blocks(text.slice(at, m.index), headings, cells, state));
    const language = m[1].trim().toLowerCase();
    const content = m[2].replace(/\n$/, "");
    if (language === "course-embed") {
      const embed = courseEmbed(content);
      out.push(embed ? visual(embed, state) : `<div class="pending"><b>embed 계약 오류</b></div>`);
    } else if (language !== "course-scene") {
      out.push(visual(`<pre>${esc(content)}</pre>`, state));
    }
    at = m.index + m[0].length;
  }
  out.push(...blocks(text.slice(at), headings, cells, state));
  return out;
}

export function renderMarkdown(
  body: string,
  headings: string[] = [],
  cells: Cells = {},
  state: RenderState = { visual: 0 },
): string {
  return renderMarkdownParts(body, headings, cells, state).join("\n");
}

const TOP_VISUAL = /^<([a-z]+)\s+(data-visual="\d+")/;
/**
 * 실행 칸은 읽기 모드에서 16:9 무대에 들어가지 않는다. 2026-09-03 운영자 지시다.
 *
 * 코드 실습은 비율을 지킬 이유가 없다. 무대에 가두면 내용은 안쪽에서 스크롤되고 남는 자리는
 * 비어서 이상한 스크롤만 생겼다. 읽기 모드의 실행 칸은 codaro 셀처럼 본문 흐름에 놓이고
 * 내용만큼 자란다. 강의 모드는 장표 한 장이 무대 하나라 그대로 무대 항목으로 둔다.
 */
const CELL_VISUAL = /^<section\s+data-visual="\d+"\s+class="cell[\s"]/;

function carouselItem(html: string, index: number): string {
  return html.replace(TOP_VISUAL, `<$1 data-carousel-item="${index}" $2`);
}

function stripVisualCaption(visual: string): string {
  return visual.replace(/<figcaption>[\s\S]*?<\/figcaption>/, "");
}

type ReadingCarouselGroup = {
  label: string;
  visual: string;
  explanation: string[];
};

function carouselBand(items: string[], className: string): string {
  if (!items.some((item) => item.trim())) return "";
  const content = items.map((item, index) => {
    const active = index === 0;
    return `<div data-carousel-description="${index + 1}"${active ? ' data-carousel-description-active="true"' : ' hidden aria-hidden="true"'}>${item}</div>`;
  }).join("");
  return `<div class="${className}" data-carousel-support>${content}</div>`;
}

function visualCarousel(
  visuals: string[],
  fit: CourseScene["fit"] = "contain",
  label = "시각물",
  readingGroups: ReadingCarouselGroup[] | null = null,
): string {
  if (!visuals.length) return "";
  const items = visuals.map((item, index) => carouselItem(
    readingGroups ? stripVisualCaption(item) : item,
    index + 1,
  )).join("");
  const controls = visuals.length > 1
    ? `<div class="visual-carousel-controls"><button type="button" data-carousel-prev aria-label="이전 시각물">←</button><span data-carousel-status aria-live="polite">1 / ${visuals.length}</span><button type="button" data-carousel-next aria-label="다음 시각물">→</button></div>`
    : "";
  const readingLabel = readingGroups
    ? carouselBand(readingGroups.map((group) => group.label), "visual-carousel-label")
    : "";
  const support = readingGroups ? visualSupport(visuals, "visual-carousel-caption") : "";
  const explanation = readingGroups
    ? carouselBand(readingGroups.map((group) => group.explanation.join("\n")), "visual-carousel-explanation")
    : "";
  return `<div class="visual-carousel" data-visual-carousel data-carousel-count="${visuals.length}" data-fit="${esc(
    fit || "contain",
  )}" aria-label="${esc(label)} 캐러셀">${readingLabel}<div class="visual-carousel-frame"><div class="visual-carousel-track">${items}</div>${controls}</div>${support}${explanation}</div>`;
}

function visualSupport(visuals: string[], className = "scene-support"): string {
  const descriptions = visuals.map((visual) => visual.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1]?.trim() || "");
  if (!descriptions.some(Boolean)) return "";
  const items = descriptions.map((description, index) => {
    const active = index === 0;
    return `<p data-carousel-description="${index + 1}"${active ? ' data-carousel-description-active="true"' : ' hidden aria-hidden="true"'}>${description}</p>`;
  }).join("");
  return `<div class="${className}" data-carousel-support>${items}</div>`;
}

function groupReadingCarousels(parts: string[], scenes: CourseScene[]): string {
  const out: string[] = [];
  let section: string[] = [];
  let sceneIndex = -1;
  const flush = () => {
    if (!section.length) return;
    if (sceneIndex < 0) {
      out.push(...section);
      section = [];
      return;
    }
    const visualPositions = section
      .map((part, index) => TOP_VISUAL.test(part) ? index : -1)
      .filter((index) => index >= 0);
    if (!visualPositions.length) {
      out.push(...section);
      section = [];
      return;
    }
    const labelPositions = visualPositions.map((position) => (
      position > 0 && section[position - 1].startsWith('<p class="lb">') ? position - 1 : -1
    ));
    const groups = visualPositions.map((position, index): ReadingCarouselGroup => {
      const nextPosition = visualPositions[index + 1] ?? section.length;
      const nextLabelPosition = labelPositions[index + 1];
      const explanationEnd = nextLabelPosition >= 0 ? nextLabelPosition : nextPosition;
      return {
        label: labelPositions[index] >= 0 ? section[labelPositions[index]] : "",
        visual: section[position],
        explanation: section.slice(position + 1, explanationEnd),
      };
    });
    const firstGroupAt = labelPositions[0] >= 0 ? labelPositions[0] : visualPositions[0];
    const title = section.find((part) => part.startsWith("<h2 "))?.replace(/<[^>]+>/g, "") || "시각물";
    out.push(...section.slice(0, firstGroupAt));
    // 실행 칸 앞뒤의 시각물끼리만 캐러셀로 묶는다. 실행 칸은 라벨과 설명을 데리고 제자리에 남는다.
    let run: ReadingCarouselGroup[] = [];
    const flushRun = () => {
      if (!run.length) return;
      out.push(visualCarousel(run.map((group) => group.visual), scenes[sceneIndex]?.fit, title, run));
      run = [];
    };
    for (const group of groups) {
      if (!CELL_VISUAL.test(group.visual)) {
        run.push(group);
        continue;
      }
      flushRun();
      if (group.label) out.push(group.label);
      out.push(group.visual, ...group.explanation);
    }
    flushRun();
    section = [];
  };
  for (const part of parts) {
    if (part.startsWith("<h2 ")) {
      flush();
      sceneIndex += 1;
    }
    section.push(part);
  }
  flush();
  return out.join("\n");
}

/**
 * 본문과 목차를 같이 낸다.
 *
 * 강의장은 강사가 화면을 띄워 놓고 "이제 OCR 부분 봅시다" 하고 건너뛰는 자리다.
 * 절이 스물 몇 개인 글에서 목차 없이 스크롤로 찾으면 그 시간이 통째로 버려진다.
 */
export function renderPost(
  body: string,
  cells: Cells = {},
  glossary: Glossary = {},
  options: { mediaBase?: string; scenes?: CourseScene[] } = {},
): { html: string; headings: string[]; hasCells: boolean; visuals: number } {
  const headings: string[] = [];
  const state: RenderState = { visual: 0, mediaBase: options.mediaBase };
  const marked = markGlossaryTerms(body, glossary);
  const parts = renderMarkdownParts(marked, headings, cells, state);
  const html = applyGlossary(groupReadingCarousels(parts, options.scenes ?? []), glossary, "term-r");
  // 실행 칸이 없는 글에는 파이썬 런타임 스크립트를 붙이지 않는다.
  return { html, headings, hasCells: html.includes('data-cell="'), visuals: state.visual };
}

export type CourseSection = { title: string; subtitle: string; content: string };

/** 코드 펜스 안의 ##을 건드리지 않고 읽기 본문을 H2 장면으로 나눈다. */
export function splitCourseSections(body: string): CourseSection[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const starts: number[] = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^```/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && /^##\s+/.test(lines[i])) starts.push(i);
  }
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? lines.length;
    const title = lines[start].replace(/^##\s+/, "").trim();
    let subtitle = "";
    let subtitleLine = -1;
    fenced = false;
    for (let i = start + 1; i < end; i += 1) {
      if (/^```/.test(lines[i])) {
        fenced = !fenced;
        continue;
      }
      if (!fenced && /^###\s+/.test(lines[i])) {
        subtitle = lines[i].replace(/^###\s+/, "").trim();
        subtitleLine = i;
        break;
      }
    }
    const content = lines.slice(subtitleLine >= 0 ? subtitleLine + 1 : start + 1, end).join("\n").trim();
    return { title, subtitle, content };
  });
}

/** 같은 본문을 강의 장면으로 투영한다. 본문 글자를 묶음에 두 번 싣지 않는다. */
export function renderLecture(
  body: string,
  scenes: CourseScene[],
  cells: Cells = {},
  glossary: Glossary = {},
  options: { mediaBase?: string } = {},
): { html: string; hasCells: boolean; ok: boolean } {
  const sections = splitCourseSections(markGlossaryTerms(body, glossary));
  if (!scenes.length || sections.length !== scenes.length) return { html: "", hasCells: false, ok: false };
  let hasCells = false;
  const rendered: string[] = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const section = sections[index];
    const state: RenderState = { visual: 0, mediaBase: options.mediaBase };
    const parts = renderMarkdownParts(section.content, [], cells, state);
    if (state.visual !== scene.visualCount) return { html: "", hasCells: false, ok: false };
    const visuals = parts.filter((part) => TOP_VISUAL.test(part));
    const content = parts.filter((part) => !TOP_VISUAL.test(part));
    const support = visualSupport(visuals);
    const html = [visualCarousel(visuals, scene.fit, section.title), ...content].join("\n");
    hasCells ||= html.includes('data-cell="');
    const timeline = compileSceneTimeline(scene).slice(0, 1);
    const titleId = `lecture-${scene.id}-title`;
    rendered.push(`<section class="lecture-scene" data-scene-runtime="${COURSE_SCENE_RUNTIME}" data-scene="${esc(scene.id)}" data-role="${esc(
      scene.role,
    )}" data-layout="${esc(scene.layout)}" data-fit="${esc(scene.fit || "contain")}" data-timeline="${esc(JSON.stringify(timeline))}" role="group" aria-roledescription="슬라이드" aria-labelledby="${esc(titleId)}" aria-hidden="true" inert>
  <header class="scene-head"><div class="scene-meta"><span class="scene-index">${String(index + 1).padStart(2, "0")}</span><span class="scene-cue" data-scene-cue></span></div><div class="scene-copy"><h2 id="${esc(titleId)}" tabindex="-1">${esc(
    section.title,
  )}</h2><p class="scene-subtitle">${esc(section.subtitle)}</p></div>${support}</header>
  <div class="scene-canvas">${html}</div>
</section>`);
  }
  // 읽기 화면(term-r)과 id 가 겹치지 않게 접두어를 다르게 둔다. 같은 페이지에 둘 다 있다.
  return { html: applyGlossary(rendered.join("\n"), glossary, "term-l"), hasCells, ok: true };
}
