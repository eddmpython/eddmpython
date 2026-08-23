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
 * 실행 칸 주소. 교안이 링크 하나짜리 문단으로 적는다.
 *
 * **모양은 공개 블로그의 `src/components/Markdown.tsx` 의 `CODARO_CELL` 과 같아야 한다.**
 * 한쪽을 고치면 다른 쪽도 같은 날 고친다.
 */
const CODARO =
  /^https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export type CourseSceneBeat = {
  effect: "enter" | "replace" | "focus" | "compare" | "annotate" | "run" | "simulate";
  targets: number[];
  note?: string;
};
export type CourseScene = {
  id: string;
  role: "open" | "explain" | "invert" | "close";
  layout: "stage" | "sequence" | "compare" | "code" | "demo";
  visualCount: number;
  beats: CourseSceneBeat[];
};

export const COURSE_SCENE_RUNTIME = 3;

export type CourseSceneFrame = {
  effect: CourseSceneBeat["effect"];
  targets: number[];
  visible: number[];
  focus: number[];
  compare: number[];
  annotation: string;
  annotationTargets: number[];
  interaction: number[];
  cue: string;
};

const COURSE_SCENE_CUES: Record<CourseSceneBeat["effect"], string> = {
  enter: "살펴보기",
  replace: "다음 화면",
  focus: "핵심",
  compare: "비교",
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
  const visible = new Set<number>();
  let focus: number[] = [];
  let compare: number[] = [];
  let annotation = "";
  let annotationTargets: number[] = [];
  let interaction: number[] = [];
  const frames: CourseSceneFrame[] = [];

  for (const beat of scene.beats) {
    const changesVisibility = beat.effect === "enter" || beat.effect === "replace" || beat.effect === "compare";
    if (changesVisibility) {
      focus = [];
      annotation = "";
      annotationTargets = [];
      interaction = [];
      compare = [];
    }
    if (beat.effect === "replace" || beat.effect === "compare") visible.clear();
    if (changesVisibility) beat.targets.forEach((target) => visible.add(target));
    if (beat.effect === "focus") focus = [...beat.targets];
    if (beat.effect === "compare") compare = [...beat.targets];
    if (beat.effect === "annotate") {
      annotation = beat.note ?? "";
      annotationTargets = [...beat.targets];
    }
    if (beat.effect === "run" || beat.effect === "simulate") interaction = [...beat.targets];

    frames.push({
      effect: beat.effect,
      targets: [...beat.targets],
      visible: [...visible],
      focus: [...focus],
      compare: [...compare],
      annotation,
      annotationTargets: [...annotationTargets],
      interaction: [...interaction],
      cue: COURSE_SCENE_CUES[beat.effect],
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

/**
 * 실행 칸을 그린다.
 *
 * 2026-08-20 까지 이 자리가 없었다. 렌더러가 codaro 주소를 못 알아봐서 생 주소가 그대로
 * 보이는 링크로 나갔고, 003 과 004 가 `값을 바꿔 실행해 보세요` 라고 말하는데 수강생
 * 화면에는 바꿀 칸도 코드도 없었다. 여덟 곳이 그랬다.
 */
function cellCard(id: string, cell: CourseCell): string {
  const rows = Math.max(6, cell.code.split("\n").length + 1);
  return `<div class="cell" data-cell="${esc(id)}">
<div class="cell-h"><span class="cell-dot"></span><span class="cell-k">실습</span><span class="cell-s" data-state aria-live="polite">실행 준비됨</span></div>
${cell.title ? `<p class="cell-t">${esc(cell.title)}</p>` : ""}
${cell.description ? `<p class="cell-d">${esc(cell.description)}</p>` : ""}
<textarea class="cell-c" data-code spellcheck="false" wrap="off" rows="${rows}" aria-label="Python 코드">${esc(cell.code)}</textarea>
<div class="cell-b"><button type="button" data-run>실행</button><button type="button" data-reset>처음으로</button><span class="cell-hint">${esc(cell.hint ?? "브라우저 안에서 실행됩니다")}</span></div>
<pre class="cell-o" data-out>실행을 누르면 결과가 여기에 나옵니다</pre>
</div>`;
}

/**
 * 셀 이름은 있는데 묶음에 그 셀이 없을 때.
 *
 * 조용히 링크로 흘려보내면 2026-08-20 의 결함이 그대로 재발한다. 화면에 드러내야
 * 발행한 사람이 안다.
 */
function missingCell(id: string): string {
  return `<div class="cell cell-miss"><b>실행 칸을 묶음에서 찾지 못했습니다</b><i>${esc(id)}</i></div>`;
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

function pendingMedia(key: string, alt: string, caption: string): string {
  return `<div class="pending"><b>시각물 준비 중</b><span>${esc(alt)}</span>${
    caption ? `<i>${esc(caption)}</i>` : ""
  }<i>${esc(key)}</i></div>`;
}

type RenderState = { visual: number };

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
      out.push(images.length > 1 ? `<div class="slider">${images.join("")}</div>` : images[0]);
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
      // 영상도 시각 자산이다. 확장자로 갈라 태그를 바꾼다.
      //
      // 캡션(img[3])을 반드시 같이 그린다. 2026-08-21 까지 정규식은 캡션을 잡아 놓고
      // 여기서 버렸다. 교안 캡션 45개가 수강생 화면에 하나도 안 나갔다. 캡션은 그 장면을
      // 어떻게 읽을지 말하는 자리라 그게 없으면 도식만 덩그러니 뜬다.
      const caption = img[3] ? `<figcaption>${esc(img[3])}</figcaption>` : "";
      if (VIDEO.test(img[2])) {
        flush();
        out.push(visual(
          `<figure class="media"><video src="${esc(img[2])}" controls playsinline preload="metadata"></video>${caption}</figure>`,
          state,
        ));
      } else {
        images.push(
          visual(`<figure class="media"><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy">${caption}</figure>`, state),
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
    else if (table) out.push(visual(table, state));
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
export function renderMarkdown(
  body: string,
  headings: string[] = [],
  cells: Cells = {},
  state: RenderState = { visual: 0 },
): string {
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
): { html: string; headings: string[]; hasCells: boolean; visuals: number } {
  const headings: string[] = [];
  const state = { visual: 0 };
  const html = renderMarkdown(body, headings, cells, state);
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
): { html: string; hasCells: boolean; ok: boolean } {
  const sections = splitCourseSections(body);
  if (!scenes.length || sections.length !== scenes.length) return { html: "", hasCells: false, ok: false };
  let hasCells = false;
  const rendered: string[] = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const section = sections[index];
    const state = { visual: 0 };
    const html = renderMarkdown(section.content, [], cells, state);
    if (state.visual !== scene.visualCount) return { html: "", hasCells: false, ok: false };
    hasCells ||= html.includes('data-cell="');
    const timeline = compileSceneTimeline(scene);
    const titleId = `lecture-${scene.id}-title`;
    rendered.push(`<section class="lecture-scene" data-scene-runtime="${COURSE_SCENE_RUNTIME}" data-scene="${esc(scene.id)}" data-role="${esc(
      scene.role,
    )}" data-layout="${esc(scene.layout)}" data-beats="${esc(JSON.stringify(scene.beats))}" data-timeline="${esc(JSON.stringify(timeline))}" role="group" aria-roledescription="슬라이드" aria-labelledby="${esc(titleId)}" aria-hidden="true" inert>
  <header class="scene-head"><div class="scene-meta"><span class="scene-index">${String(index + 1).padStart(2, "0")}</span><span class="scene-cue" data-scene-cue></span></div><div><h2 id="${esc(titleId)}" tabindex="-1">${esc(
    section.title,
  )}</h2><p>${esc(section.subtitle)}</p></div></header>
  <div class="scene-canvas">${html}</div>
  <p class="scene-callout" data-scene-callout aria-live="polite"></p>
</section>`);
  }
  return { html: rendered.join("\n"), hasCells, ok: true };
}
