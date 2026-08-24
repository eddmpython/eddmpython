/**
 * 글 목록의 정본.
 *
 * **글 하나가 폴더 하나다.** 그 글에 딸린 것은 전부 그 폴더 안에 있다. 본문, 이미지 계획,
 * 글이 품는 도구의 소스와 그 도구의 게이트까지다.
 *
 * ```
 * blog/posts/003-python-qr/
 *   index.md      글
 *   media.json    이 글의 이미지 계획
 *   tool/         이 글이 품는 도구
 * ```
 *
 * 2026-08-24 에 운영자 지시로 이렇게 바꿨다. 그전에는 한 글에 딸린 것이 일곱 군데에 흩어져
 * 있었다. 본문은 카테고리 폴더에, 이미지 계획은 `blog/media/plan.json` 에, 도구 등록은
 * `blog/embeds/tools.json` 에, 도구 소스는 `site/src/components` 에, 도구 코어는
 * `site/src` 에, 도구 게이트는 `site/scripts` 에 있었다. 글 하나를 고치려면 그 일곱 군데를
 * 다 찾아다녀야 했고 하나를 빠뜨리면 조용히 어긋났다.
 *
 * **카테고리는 없다.** 폴더 이름 앞의 세 자리가 발행 순번이자 미디어 키이고, 목록은 그
 * 역순이다. 공개 URL 은 frontmatter 의 `slug` 하나뿐이다.
 */

export type Post = {
  /** 폴더 이름. media 키와 같다. 예: 003-python-qr */
  id: string;
  /** 발행 순번. 저장소 전체에서 001 부터 빈 번호 없이 이어진다. */
  sequence: number;
  /** 공개 URL 경로. /blog/{slug} */
  slug: string;
  /** 이 글이 품는 도구의 이름. 폴더 이름에서 순번을 뗀 것이다. 도구가 없으면 빈 문자열. */
  toolId: string;
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

/* 글의 SSOT 는 blog/posts/<NNN-slug>/index.md 다. 빌드 타임에 읽고 런타임 fetch 는 없다. */
const files = import.meta.glob("../../blog/posts/*/index.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const slugPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** 폴더 이름에서 발행 순번을 뗀 나머지. 그 글이 품는 도구의 이름이 된다. */
export function toolIdOf(postId: string): string {
  return postId.replace(/^\d{3}-/, "");
}

function parse(path: string, raw: string): Post {
  const segments = path.split("/");
  const id = segments[segments.length - 2] ?? "";
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
    toolId: toolIdOf(id),
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
