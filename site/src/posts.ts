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
  /** 이 글이 속한 카테고리 slug. 카테고리 하나가 강의 한 묶음이다. */
  category: string;
  /** 목록에서 뺀 글. URL 은 살아 있다. */
  archived: boolean;
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

/* 글의 SSOT 는 blog/content/<category-slug>/NNN-kebab.md 다. 빌드 타임에 읽고 런타임 fetch 는 없다.
   content 아래만 굽는다. media, embeds, scripts 는 글이 아니라 기계다. */
const files = import.meta.glob("../../blog/content/*/???-*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const slugPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/* order.json 의 배열은 비어 있을 수 있다. 블로그는 그때그때 올리는 단편이라 글이 없는
   구간이 정상이다. 비면 JSON import 가 never[] 로 추론되므로 원소 모양을 직접 적는다. */
const postEntries = blogOrder.posts as { order: number; slug: string; category: string }[];
const readingOrderBySlug = new Map(postEntries.map((entry) => [entry.slug, entry.order]));
const categoryBySlug = new Map(postEntries.map((entry) => [entry.slug, entry.category]));
/* 아카이브한 글은 /blog 목록에서만 빠진다. URL 과 sitemap 은 그대로 두어 검색 유입을 지킨다.
   비어 있으면 JSON import 가 never[] 로 추론되므로 원소 모양을 직접 적는다. */
const archivedEntries = blogOrder.archived as { slug: string; note?: string }[];
const archivedSlugs = new Set(archivedEntries.map((entry) => entry.slug));

export type Category = {
  slug: string;
  title: string;
  order: number;
  summary: string;
};

function parse(path: string, raw: string): Post {
  const id = path.replace(/^.*\//, "").replace(/\.md$/, "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      id,
      sequence: Number(id.slice(0, 3)),
      readingOrder: Number.MAX_SAFE_INTEGER,
      slug: id,
      category: "",
      archived: false,
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
    category: categoryBySlug.get(slug) ?? "",
    archived: archivedSlugs.has(slug),
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

/** 공개 목록 순서대로 정렬한 카테고리. 카테고리 하나가 강의 한 묶음이다. */
export const CATEGORIES: Category[] = [...(blogOrder.categories as Category[])].sort(
  (a, b) => a.order - b.order,
);

/** 카테고리별로 묶은 글. 목록 화면이 이 순서 그대로 렌더한다. */
export const POSTS_BY_CATEGORY: { category: Category; posts: Post[] }[] = CATEGORIES.map(
  (category) => ({
    category,
    posts: POSTS.filter((post) => post.category === category.slug && !post.archived),
  }),
).filter((group) => group.posts.length > 0);

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
