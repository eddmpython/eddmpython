import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build, defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { BRAND_ASSETS } from "./src/brand";

// 빌드 산출물은 저장소 밖에 둔다 (CLAUDE.md 작업 산출물 규칙).
// site/ 기준 두 단계 위는 sideProject/ 이므로 저장소 형제 폴더에 떨어진다.
const OUT_DIR = "../../eddmpython.out/site-dist";
const SSR_DIR = "../../eddmpython.out/site-ssr";
const ORIGIN = "https://eddmpython.com";
const ADSENSE_CLIENT = "ca-pub-6438440376456212";
const ADSENSE_SCRIPT = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type PageMeta = {
  path: string;
  title: string;
  socialTitle: string;
  description: string;
  type: string;
  author?: string;
  section?: string;
  image: string;
  imageAlt: string;
  imageType: string;
  imageWidth: number;
  imageHeight: number;
  jsonLd: unknown[];
};

/**
 * 내려받을 수 있는 브랜드 자산을 src/brand.ts 에서 만든다.
 *
 * public/ 에 사본을 두면 심볼을 고칠 때 파비콘과 자산만 옛 형태로 남는다. 실제로
 * 그것을 막으려고 파일을 안 두는 것이지 게을러서가 아니다. 소스를 하나로 두고
 * dev 는 미들웨어로, build 는 dist 파일로 같은 문자열을 낸다.
 *
 * **목록은 `src/brand.ts` 의 `BRAND_ASSETS` 가 정본이다.** 여기에 다시 적지 않는다.
 * 한때 빌드가 내는 파일과 `/brand` 화면이 보여 주는 파일이 달랐고, 목록이 두 곳에
 * 있었기 때문이다.
 */
function brandAssets(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "eddm-brand-assets",
    configResolved(cfg) {
      root = cfg.root;
      outDir = cfg.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0]?.replace(/^\//, "") ?? "";
        const asset = BRAND_ASSETS.find((a) => a.file === path);
        if (!asset) return next();
        res.setHeader("Content-Type", "image/svg+xml");
        res.end(asset.svg());
      });
    },
    closeBundle() {
      const dist = resolve(root, outDir);
      for (const asset of BRAND_ASSETS) {
        const target = join(dist, asset.file);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, asset.svg(), "utf8");
      }
    },
  };
}

/**
 * 모든 경로를 빌드 타임에 HTML 로 뽑는다.
 *
 * SPA 로 두면 크롤러가 받는 본문이 0 자다. 검색과 공유 카드가 빈 껍데기를 읽는다.
 * 그래서 클라이언트 번들을 만든 뒤 서버 번들을 한 번 더 만들고, 각 경로를
 * renderToString 으로 그려 shell 에 넣는다. 브라우저에서는 main.tsx 가 hydrate 로
 * 이어받아 실행 셀이 그대로 동작한다.
 *
 * 페이지별 메타와 JSON-LD, sitemap, RSS 도 같은 목록에서 만든다.
 */
function prerender(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "eddm-prerender",
    apply: "build",
    enforce: "post",
    configResolved(cfg) {
      root = cfg.root;
      outDir = cfg.build.outDir;
    },
    async closeBundle() {
      // SSR 빌드가 이 플러그인을 다시 부르지 않게 막는다.
      if (process.env.EDDM_SSR === "1") return;

      const dist = resolve(root, outDir);
      const ssrOut = resolve(root, SSR_DIR);

      process.env.EDDM_SSR = "1";
      try {
        await build({
          root,
          logLevel: "warn",
          plugins: [react(), tailwindcss()],
          // 산출물이 저장소 밖이라 node_modules 를 못 찾는다. 전부 번들에 넣는다.
          ssr: { noExternal: true },
          build: {
            ssr: resolve(root, "src/entry-server.tsx"),
            outDir: SSR_DIR,
            emptyOutDir: true,
            rollupOptions: { output: { entryFileNames: "entry-server.js" } },
          },
        });
      } finally {
        delete process.env.EDDM_SSR;
      }

      const mod = (await import(
        pathToFileURL(join(ssrOut, "entry-server.js")).href
      )) as {
        render: (url: string) => string;
        allPages: () => PageMeta[];
      };

      const shell = readFileSync(join(dist, "index.html"), "utf8");
      const pages = mod.allPages();
      const sizes: number[] = [];

      for (const meta of pages) {
        const body = mod.render(meta.path);
        sizes.push(body.length);
        const adsense = meta.type === "article" ? ADSENSE_SCRIPT : "";
        const ld = meta.jsonLd
          .map(
            (o) =>
              `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`,
          )
          .join("");
        const article = meta.type === "article"
          ? [
              `<meta property="article:author" content="${ORIGIN}" />`,
              `<meta property="article:section" content="${escape(meta.section ?? "블로그")}" />`,
            ].join("")
          : "";

        const html = shell
          .replace(
            /<title>[\s\S]*?<\/title>/,
            `<title>${escape(meta.title)}</title>`,
          )
          .replace(
            /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
            `<meta name="description" content="${escape(meta.description)}" />`,
          )
          .replace(
            /<meta name="author" content="[\s\S]*?"\s*\/>/,
            `<meta name="author" content="${escape(meta.author ?? "eddmpython")}" />`,
          )
          .replace(
            /<meta property="og:title" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:title" content="${escape(meta.socialTitle)}" />`,
          )
          .replace(
            /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
            `<meta property="og:description" content="${escape(meta.description)}" />`,
          )
          .replace(
            /<meta property="og:url" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:url" content="${ORIGIN}${meta.path}" />`,
          )
          .replace(
            /<meta property="og:type" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:type" content="${meta.type}" />`,
          )
          .replace(
            /<meta property="og:image" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image" content="${escape(meta.image)}" />`,
          )
          .replace(
            /<meta property="og:image:secure_url" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image:secure_url" content="${escape(meta.image)}" />`,
          )
          .replace(
            /<meta property="og:image:type" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image:type" content="${escape(meta.imageType)}" />`,
          )
          .replace(
            /<meta property="og:image:alt" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image:alt" content="${escape(meta.imageAlt)}" />`,
          )
          .replace(
            /<meta property="og:image:width" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image:width" content="${meta.imageWidth}" />`,
          )
          .replace(
            /<meta property="og:image:height" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:image:height" content="${meta.imageHeight}" />`,
          )
          .replace(
            /<meta name="twitter:title" content="[\s\S]*?"\s*\/>/,
            `<meta name="twitter:title" content="${escape(meta.socialTitle)}" />`,
          )
          .replace(
            /<meta name="twitter:description" content="[\s\S]*?"\s*\/>/,
            `<meta name="twitter:description" content="${escape(meta.description)}" />`,
          )
          .replace(
            /<meta name="twitter:image" content="[\s\S]*?"\s*\/>/,
            `<meta name="twitter:image" content="${escape(meta.image)}" />`,
          )
          .replace(
            /<meta name="twitter:image:alt" content="[\s\S]*?"\s*\/>/,
            `<meta name="twitter:image:alt" content="${escape(meta.imageAlt)}" />`,
          )
          .replace(
            /<link rel="canonical" href="[\s\S]*?"\s*\/>/,
            `<link rel="canonical" href="${ORIGIN}${meta.path}" />`,
          )
          .replace("</head>", `${article}${ld}${adsense}</head>`)
          .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

        const dirPath =
          meta.path === "/" ? dist : join(dist, meta.path.replace(/^\//, ""));
        mkdirSync(dirPath, { recursive: true });
        writeFileSync(join(dirPath, "index.html"), html, "utf8");
      }

      writeFileSync(
        join(dist, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
          .map(
            (p) =>
              `  <url>\n    <loc>${ORIGIN}${p.path}</loc>\n  </url>`,
          )
          .join("\n")}\n</urlset>\n`,
        "utf8",
      );

      const posts = pages.filter((p) => p.type === "article");
      writeFileSync(
        join(dist, "rss.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>eddmpython 블로그</title>\n    <link>${ORIGIN}/blog</link>\n    <atom:link href="${ORIGIN}/rss.xml" rel="self" type="application/rss+xml" />\n    <description>제품을 만들면서 확인한 실패, 결정, 작업 방식을 독자가 다시 쓸 수 있는 판단 기준으로 설명합니다.</description>\n    <language>ko-KR</language>\n${posts
          .map(
            (p) =>
              `    <item>\n      <title>${escape(p.socialTitle)}</title>\n      <link>${ORIGIN}${p.path}</link>\n      <guid isPermaLink="true">${ORIGIN}${p.path}</guid>${p.section ? `\n      <category>${escape(p.section)}</category>` : ""}\n      <description>${escape(p.description)}</description>\n    </item>`,
          )
          .join("\n")}\n  </channel>\n</rss>\n`,
        "utf8",
      );

      this.warn?.(
        `prerendered ${pages.length} pages, body ${Math.min(...sizes)}~${Math.max(...sizes)} bytes`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandAssets(), prerender()],
  // 글은 blog/posts/<글 폴더>/ 에 있다. dev 서버가 site/ 밖을 읽게 허용한다.
  server: { fs: { allow: [".."] } },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
});
