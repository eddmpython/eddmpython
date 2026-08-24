/**
 * 글 목록의 정본.
 *
 * **글 하나가 파일 하나다.** 글에 관한 사실은 그 파일 안이나 파일이 놓인 경로에만 있다.
 * 예전에는 같은 사실을 세 곳에 적었다. 파일 이름의 순번, `order.json` 의 `posts[].order`,
 * `posts[].category` 였고 카테고리 순서는 폴더 번호와 `categories[].order` 두 곳에 있었다.
 * 글 한 편을 올리려면 손으로 세 자리를 맞춰야 했고 그중 카테고리 메타는 화면이 읽지도 않았다.
 * 2026-08-24 에 운영자 지시로 `order.json` 을 없애고 전부 파일에서 끌어온다.
 *
 * ```
 * blog/content/<NN-카테고리>/<NNN-slug>.md
 * ```
 *
 * | 사실 | 어디 |
 * |---|---|
 * | 발행 순번이자 미디어 키 | 파일 이름의 `NNN` |
 * | 카테고리와 그 순서 | 폴더 이름의 `NN-카테고리` |
 * | 공개 URL | frontmatter `slug` |
 * | 목록에서 뺄지 | frontmatter `archived` 와 `archivedNote` |
 *
 * 목록 순서는 최신 발행이 위다. 파일 순번 말고 따로 매기는 편집 순서는 두지 않는다.
 */

export type Post = {
  /** 파일 stem. media plan/catalog 키와 같다. */
  id: string;
  /** 발행 순번. 저장소 전체에서 001 부터 빈 번호 없이 이어진다. */
  sequence: number;
  /** 공개 URL 경로. /blog/{slug} */
  slug: string;
  /** 이 글이 놓인 폴더 이름. 파일을 묶는 단위다. */
  category: string;
  /** 목록에서 뺀 글. URL 과 sitemap 은 살아 있다. */
  archived: boolean;
  /** 왜 목록에서 뺐는지. archived 인 글만 갖는다. */
  archivedNote: string;
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

/* 글의 SSOT 는 blog/content/<카테고리>/NNN-kebab.md 다. 빌드 타임에 읽고 런타임 fetch 는 없다.
   content 아래만 굽는다. media, embeds, scripts 는 글이 아니라 기계다. */
const files = import.meta.glob("../../blog/content/*/???-*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const slugPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function parse(path: string, raw: string): Post {
  const segments = path.split("/");
  const id = segments[segments.length - 1].replace(/\.md$/, "");
  const category = segments[segments.length - 2] ?? "";
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`${id}: frontmatter 가 없거나 형식이 잘못됐습니다`);
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
    slug,
    category,
    archived: meta.archived === "true",
    archivedNote: meta.archivedNote ?? "",
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

/** 발행 순번 오름차순. 화면에서 최신을 위에 두려면 뒤집어 쓴다. */
export const POSTS: Post[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => a.sequence - b.sequence);

const slugs = new Set(POSTS.map((post) => post.slug));
if (slugs.size !== POSTS.length) {
  throw new Error("blog slug가 중복됐습니다");
}

/** `/blog` 목록에 나가는 글. 아카이브한 글은 URL 만 살고 목록에서는 빠진다. */
export const LISTED_POSTS: Post[] = POSTS.filter((post) => !post.archived);

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
