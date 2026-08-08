import { PRODUCTS } from "./products";
import { POSTS, type Post } from "./posts";

export const ORIGIN = "https://eddmpython.com";

/** 검색 결과, 공유 카드, sitemap, RSS가 함께 쓰는 페이지 계약. */
export type PageMeta = {
  path: string;
  title: string;
  socialTitle: string;
  description: string;
  type: "website" | "article";
  published?: string;
  modified?: string;
  author?: string;
  section?: string;
  image: string;
  imageAlt: string;
  imageType: string;
  imageWidth: number;
  imageHeight: number;
  jsonLd: unknown[];
};

const ORG_ID = `${ORIGIN}/#org`;
const SITE_ID = `${ORIGIN}/#site`;
const BLOG_ID = `${ORIGIN}/blog#blog`;
const DEFAULT_IMAGE = `${ORIGIN}/og.png`;

const ORG = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "eddmpython",
  url: ORIGIN,
  logo: `${ORIGIN}/favicon.svg`,
  image: DEFAULT_IMAGE,
  email: "eddmpython@gmail.com",
  description:
    "Python 과 AI 로 재무, 데이터, 반복 업무를 분석하고 다시 실행할 수 있는 도구로 만듭니다.",
  sameAs: [
    "https://github.com/eddmpython",
    "https://www.threads.com/@eddmpython",
    "https://www.youtube.com/@eddmpython",
    "https://huggingface.co/eddmpython",
  ],
};

const SITE = {
  "@type": "WebSite",
  "@id": SITE_ID,
  url: ORIGIN,
  name: "eddmpython",
  inLanguage: "ko-KR",
  publisher: { "@id": ORG_ID },
};

const BLOG = {
  "@type": "Blog",
  "@id": BLOG_ID,
  url: `${ORIGIN}/blog`,
  name: "eddmpython 블로그",
  description:
    "제품을 만들면서 확인한 실패, 결정, 작업 방식을 독자가 다시 쓸 수 있는 판단 기준으로 설명합니다.",
  inLanguage: "ko-KR",
  isPartOf: { "@id": SITE_ID },
  publisher: { "@id": ORG_ID },
};

const APPS = PRODUCTS.map((product, index) => ({
  "@type": "ListItem",
  position: index + 1,
  item: {
    "@type": "SoftwareApplication",
    name: product.name,
    description: `${product.tagline} ${product.description}`,
    url: product.primary.href,
    applicationCategory: "DeveloperApplication",
    operatingSystem: product.install?.startsWith("pip")
      ? "Windows, macOS, Linux"
      : "Web",
    author: { "@id": ORG_ID },
  },
}));

function graph(...items: unknown[]) {
  return { "@context": "https://schema.org", "@graph": items };
}

function breadcrumbs(
  id: string,
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function postImage(post: Post, url: string) {
  return {
    "@type": "ImageObject",
    "@id": `${url}#primaryimage`,
    url: post.ogImage ?? DEFAULT_IMAGE,
    contentUrl: post.ogImage ?? DEFAULT_IMAGE,
    width: post.ogImageWidth ?? 1200,
    height: post.ogImageHeight ?? 630,
    caption: post.ogImageAlt ?? post.title,
  };
}

export function homeMeta(): PageMeta {
  const title = "eddmpython · 복잡한 업무를, 실제로 작동하는 자동화로";
  return {
    path: "/",
    title,
    socialTitle: title,
    description:
      "공시 데이터, Python 학습, 스프레드시트 자동화, 브라우저 Python 런타임. DartLab, Codaro, xlpod, pyproc 을 만듭니다. 설치 없이 브라우저에서 바로 실행해 볼 수 있습니다.",
    type: "website",
    image: DEFAULT_IMAGE,
    imageAlt: "eddmpython 로고와 DartLab, Codaro, xlpod, pyproc 제품 이름",
    imageType: "image/png",
    imageWidth: 1200,
    imageHeight: 630,
    jsonLd: [
      graph(ORG, SITE),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "eddmpython 제품",
        itemListElement: APPS,
      },
    ],
  };
}

export function blogMeta(): PageMeta {
  const path = "/blog";
  const url = `${ORIGIN}${path}`;
  const breadcrumbId = `${url}#breadcrumb`;
  const latestModified = POSTS.map((post) => post.modified).sort().at(-1);
  const blogPosts = POSTS.map((post) => ({
    "@type": "BlogPosting",
    "@id": `${ORIGIN}/blog/${post.slug}#article`,
    headline: post.title,
    url: `${ORIGIN}/blog/${post.slug}`,
    datePublished: post.date,
    dateModified: post.modified,
    author: { "@id": ORG_ID },
  }));

  return {
    path,
    title: "블로그 · eddmpython",
    socialTitle: "eddmpython 블로그",
    description:
      "제품을 만들면서 확인한 실패, 결정, 작업 방식을 독자가 다시 쓸 수 있는 판단 기준으로 설명합니다.",
    type: "website",
    modified: latestModified,
    image: DEFAULT_IMAGE,
    imageAlt: "eddmpython 블로그",
    imageType: "image/png",
    imageWidth: 1200,
    imageHeight: 630,
    jsonLd: [
      graph(
        ORG,
        SITE,
        { ...BLOG, blogPost: blogPosts },
        {
          "@type": "CollectionPage",
          "@id": url,
          url,
          name: "eddmpython 블로그",
          description:
            "제품을 만들면서 확인한 실패, 결정, 작업 방식을 독자가 다시 쓸 수 있는 판단 기준으로 설명합니다.",
          inLanguage: "ko-KR",
          isPartOf: { "@id": SITE_ID },
          breadcrumb: { "@id": breadcrumbId },
          mainEntity: { "@id": BLOG_ID },
        },
        breadcrumbs(breadcrumbId, [
          { name: "eddmpython", url: ORIGIN },
          { name: "블로그", url },
        ]),
      ),
    ],
  };
}

export function postMeta(post: Post): PageMeta {
  const path = `/blog/${post.slug}`;
  const url = `${ORIGIN}${path}`;
  const breadcrumbId = `${url}#breadcrumb`;
  const articleId = `${url}#article`;
  const image = postImage(post, url);

  return {
    path,
    title: `${post.title} · eddmpython`,
    socialTitle: post.title,
    description: post.summary,
    type: "article",
    published: post.date,
    modified: post.modified,
    author: post.author,
    section: post.section,
    image: post.ogImage ?? DEFAULT_IMAGE,
    imageAlt: post.ogImageAlt ?? post.title,
    imageType: post.ogImageType ?? "image/png",
    imageWidth: post.ogImageWidth ?? 1200,
    imageHeight: post.ogImageHeight ?? 630,
    jsonLd: [
      graph(
        ORG,
        SITE,
        BLOG,
        image,
        {
          "@type": "WebPage",
          "@id": url,
          url,
          name: post.title,
          description: post.summary,
          inLanguage: "ko-KR",
          isPartOf: { "@id": SITE_ID },
          breadcrumb: { "@id": breadcrumbId },
          primaryImageOfPage: { "@id": image["@id"] },
          mainEntity: { "@id": articleId },
          datePublished: post.date,
          dateModified: post.modified,
        },
        {
          "@type": "BlogPosting",
          "@id": articleId,
          url,
          headline: post.title,
          description: post.summary,
          mainEntityOfPage: { "@id": url },
          isPartOf: { "@id": BLOG_ID },
          datePublished: post.date,
          dateModified: post.modified,
          inLanguage: "ko-KR",
          articleSection: post.section,
          image: { "@id": image["@id"] },
          thumbnailUrl: image.contentUrl,
          author: { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          isAccessibleForFree: true,
        },
        breadcrumbs(breadcrumbId, [
          { name: "eddmpython", url: ORIGIN },
          { name: "블로그", url: `${ORIGIN}/blog` },
          { name: post.title, url },
        ]),
      ),
    ],
  };
}

export function allPages(): PageMeta[] {
  return [homeMeta(), blogMeta(), ...POSTS.map(postMeta)];
}
