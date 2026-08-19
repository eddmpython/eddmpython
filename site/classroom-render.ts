/**
 * 강의장 교안 렌더. 아주 작은 마크다운만 다룬다.
 *
 * classroom.ts 에서 떼어 낸 이유는 검사할 수 있게 하려는 것이다. 이 파일은 아무것도
 * import 하지 않으므로 교안 번들 없이도 테스트가 돈다.
 *
 * 다루는 것은 교안이 실제로 쓰는 것뿐이다. h2, h4, 문단, 목록, 링크, 코드, 이미지, 영상.
 * 연속된 이미지는 슬라이더가 되고 영상은 재생기가 된다.
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

/** 코드가 아닌 구간을 빈 줄로 갈라 블록마다 태그를 붙인다. */
function blocks(text: string): string[] {
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
    if (b.startsWith("## ")) out.push(`<h2>${esc(b.slice(3))}</h2>`);
    else if (b.startsWith("### ")) out.push(`<h3>${esc(b.slice(4))}</h3>`);
    else if (b.startsWith("#### ")) out.push(`<h4>${esc(b.slice(5))}</h4>`);
    else if (/^[-*]\s/m.test(b)) {
      const items = b.split("\n").filter((l) => /^[-*]\s/.test(l.trim()));
      out.push(`<ul>${items.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join("")}</ul>`);
    } else if (/^https?:\/\/\S+$/.test(b)) out.push(`<p><a href="${esc(b)}">${esc(b)}</a></p>`);
    else out.push(`<p>${inline(b)}</p>`);
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
export function renderMarkdown(body: string): string {
  const text = body.replace(/\r\n/g, "\n");
  const out: string[] = [];
  const fence = /^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    out.push(...blocks(text.slice(at, m.index)));
    out.push(`<pre>${esc(m[1].replace(/\n$/, ""))}</pre>`);
    at = m.index + m[0].length;
  }
  out.push(...blocks(text.slice(at)));
  return out.join("\n");
}
