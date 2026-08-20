/**
 * 강의장 교안 렌더. 아주 작은 마크다운만 다룬다.
 *
 * classroom.ts 에서 떼어 낸 이유는 검사할 수 있게 하려는 것이다. 이 파일은 아무것도
 * import 하지 않으므로 교안 번들 없이도 테스트가 돈다.
 *
 * 다루는 것은 교안이 실제로 쓰는 것뿐이다. h2, h4, 문단, 목록, 링크, 코드, 이미지, 영상.
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

/** 코드가 아닌 구간을 빈 줄로 갈라 블록마다 태그를 붙인다. */
function blocks(text: string, headings: string[], cells: Cells): string[] {
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
        images.push(pendingMedia(waiting[1], img[1], img[3] ?? ""));
        continue;
      }
      // 영상도 시각 자산이다. 확장자로 갈라 태그를 바꾼다.
      if (VIDEO.test(img[2])) {
        flush();
        out.push(`<video src="${esc(img[2])}" controls playsinline preload="metadata"></video>`);
      } else {
        images.push(`<img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy">`);
      }
      continue;
    }
    flush();
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
    else if (/^[-*]\s/m.test(b)) {
      const items = b.split("\n").filter((l) => /^[-*]\s/.test(l.trim()));
      out.push(`<ul>${items.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join("")}</ul>`);
    } else if (/^https?:\/\/\S+$/.test(b)) {
      // 실행 칸이 먼저다. 못 알아보면 생 주소가 그대로 강의 화면에 찍힌다.
      const run = b.match(CODARO);
      if (run) {
        const cell = cells[run[1]];
        out.push(cell && typeof cell.code === "string" ? cellCard(run[1], cell) : missingCell(run[1]));
        continue;
      }
      const video = youtube(b);
      out.push(video ? youtubeFigure(video, "") : `<p><a href="${esc(b)}">${esc(b)}</a></p>`);
    } else {
      const solo = b.match(SOLO_LINK);
      const video = solo ? youtube(solo[2]) : null;
      if (video) {
        out.push(youtubeFigure(video, solo![1]));
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
): string {
  const text = body.replace(/\r\n/g, "\n");
  const out: string[] = [];
  const fence = /^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    out.push(...blocks(text.slice(at, m.index), headings, cells));
    out.push(`<pre>${esc(m[1].replace(/\n$/, ""))}</pre>`);
    at = m.index + m[0].length;
  }
  out.push(...blocks(text.slice(at), headings, cells));
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
): { html: string; headings: string[]; hasCells: boolean } {
  const headings: string[] = [];
  const html = renderMarkdown(body, headings, cells);
  // 실행 칸이 없는 글에는 파이썬 런타임 스크립트를 붙이지 않는다.
  return { html, headings, hasCells: html.includes('data-cell="') };
}
