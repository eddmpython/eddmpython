import blogOrder from "../../blog/order.json";

export type Post = {
  /** 파일 stem. media plan/catalog 키와 같다. */
  id: string;
  /** 파일과 미디어를 연결하는 고정 순번. */
  sequence: number;
  /** /blog 목록에서만 사용하는 공개 읽기 순서. */
  readingOrder: number;
  /** 공개 URL 경로. /blog/{slug} */
  slug: string;
  title: string;
  author: string;
  section: string;
  summary: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageType?: string;
  body: string;
};

/* 글의 SSOT 는 저장소 루트 blog/ 다. 빌드 타임에 읽고 런타임 fetch 는 없다. */
const files = import.meta.glob("../../blog/???-*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const slugPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const readingOrderBySlug = new Map(blogOrder.posts.map((entry) => [entry.slug, entry.order]));

function parse(path: string, raw: string): Post {
  const id = path.replace(/^.*\//, "").replace(/\.md$/, "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      id,
      sequence: Number(id.slice(0, 3)),
      readingOrder: Number.MAX_SAFE_INTEGER,
      slug: id,
      title: id,
      author: "",
      section: "",
      summary: "",
      body: raw.trim(),
    };
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  const slug = meta.slug ?? "";
  if (!slugPattern.test(slug)) {
    throw new Error(`${id}: slug frontmatter가 없거나 공개 URL 규칙에 맞지 않습니다`);
  }
  return {
    id,
    sequence: Number(id.slice(0, 3)),
    readingOrder: readingOrderBySlug.get(slug) ?? Number.MAX_SAFE_INTEGER,
    slug,
    title: meta.title ?? id,
    author: meta.author ?? "eddmpython",
    section: meta.section ?? "블로그",
    summary: meta.summary ?? "",
    ogImage: meta.ogImage || undefined,
    ogImageAlt: meta.ogImageAlt || undefined,
    ogImageWidth: meta.ogImageWidth ? Number(meta.ogImageWidth) : undefined,
    ogImageHeight: meta.ogImageHeight ? Number(meta.ogImageHeight) : undefined,
    ogImageType: meta.ogImageType || undefined,
    body: match[2].trim(),
  };
}

export const POSTS: Post[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => a.readingOrder - b.readingOrder || a.sequence - b.sequence);

const slugs = new Set(POSTS.map((post) => post.slug));
if (slugs.size !== POSTS.length) {
  throw new Error("blog slug가 중복됐습니다");
}

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
