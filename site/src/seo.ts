import { PRODUCTS } from "./products";
import { POSTS, type Post } from "./posts";

export const ORIGIN = "https://eddmpython.com";

/** 검색 결과와 공유 카드에 나가는 문구. 페이지마다 다르게 준다. */
export type PageMeta = {
  path: string;
  title: string;
  description: string;
  type: "website" | "article";
  published?: string;
  image: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  jsonLd: unknown[];
};

const ORG = {
  "@type": "Organization",
  "@id": `${ORIGIN}/#org`,
  name: "eddmpython",
  url: ORIGIN,
  logo: `${ORIGIN}/favicon.svg`,
  image: `${ORIGIN}/og.png`,
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
  "@id": `${ORIGIN}/#site`,
  url: ORIGIN,
  name: "eddmpython",
  inLanguage: "ko-KR",
  publisher: { "@id": `${ORIGIN}/#org` },
};

/* 제품은 SoftwareApplication 으로 노출한다. 실제 배포 채널만 적는다. */
const APPS = PRODUCTS.map((p, i) => ({
  "@type": "ListItem",
  position: i + 1,
  item: {
    "@type": "SoftwareApplication",
    name: p.name,
    description: `${p.tagline} ${p.description}`,
    url: p.primary.href,
    applicationCategory: "DeveloperApplication",
    operatingSystem: p.install?.startsWith("pip")
      ? "Windows, macOS, Linux"
      : "Web",
    author: { "@id": `${ORIGIN}/#org` },
  },
}));

export function homeMeta(): PageMeta {
  return {
    path: "/",
    title: "eddmpython · 복잡한 업무를, 실제로 작동하는 자동화로",
    description:
      "공시 데이터, Python 학습, 스프레드시트 자동화, 브라우저 Python 런타임. DartLab, Codaro, xlpod, pyproc 을 만듭니다. 설치 없이 브라우저에서 바로 실행해 볼 수 있습니다.",
    type: "website",
    image: `${ORIGIN}/og.png`,
    imageAlt: "eddmpython 로고와 DartLab, Codaro, xlpod, pyproc 제품 이름",
    imageWidth: 1200,
    imageHeight: 630,
    jsonLd: [
      { "@context": "https://schema.org", "@graph": [ORG, SITE] },
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
  return {
    path: "/blog",
    title: "블로그 · eddmpython",
    description:
      "eddmpython 제품을 만들면서 알게 된 것들을 적어 둡니다. 사용법, 만든 이유, 실패에서 배운 것.",
    type: "website",
    image: `${ORIGIN}/og.png`,
    imageAlt: "eddmpython 블로그",
    imageWidth: 1200,
    imageHeight: 630,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": `${ORIGIN}/blog#blog`,
        url: `${ORIGIN}/blog`,
        name: "eddmpython 블로그",
        inLanguage: "ko-KR",
        publisher: { "@id": `${ORIGIN}/#org` },
        blogPost: POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: `${ORIGIN}/blog/${p.slug}`,
          datePublished: p.date,
        })),
      },
    ],
  };
}

export function postMeta(post: Post): PageMeta {
  const url = `${ORIGIN}/blog/${post.slug}`;
  return {
    path: `/blog/${post.slug}`,
    title: `${post.title} · eddmpython`,
    description: post.summary,
    type: "article",
    published: post.date,
    image: post.ogImage ?? `${ORIGIN}/og.png`,
    imageAlt: post.title,
    imageWidth: post.ogImage ? undefined : 1200,
    imageHeight: post.ogImage ? undefined : 630,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.summary,
        url,
        mainEntityOfPage: url,
        datePublished: post.date,
        dateModified: post.date,
        inLanguage: "ko-KR",
        image: post.ogImage ?? `${ORIGIN}/og.png`,
        author: { "@id": `${ORIGIN}/#org` },
        publisher: { "@id": `${ORIGIN}/#org` },
      },
    ],
  };
}

export function allPages(): PageMeta[] {
  return [homeMeta(), blogMeta(), ...POSTS.map(postMeta)];
}
