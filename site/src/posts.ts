export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string;
};

/* 글의 SSOT 는 저장소 루트 blog/ 다. 빌드 타임에 읽고 런타임 fetch 는 없다. */
const files = import.meta.glob("../../blog/20??-??-??-*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parse(path: string, raw: string): Post {
  const slug = path.replace(/^.*\//, "").replace(/\.md$/, "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { slug, title: slug, date: "", summary: "", body: raw.trim() };
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return {
    slug,
    title: meta.title ?? slug,
    date: meta.date ?? "",
    summary: meta.summary ?? "",
    body: match[2].trim(),
  };
}

export const POSTS: Post[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}. ${m[2]}. ${m[3]}` : iso;
}
