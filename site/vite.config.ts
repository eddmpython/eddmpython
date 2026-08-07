import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { faviconSvg } from "./src/brand";

// 빌드 산출물은 저장소 밖에 둔다 (CLAUDE.md 작업 산출물 규칙).
// site/ 기준 두 단계 위는 sideProject/ 이므로 저장소 형제 폴더에 떨어진다.
const OUT_DIR = "../../eddmpython.out/site-dist";
const ORIGIN = "https://eddmpython.com";

type PostMeta = { slug: string; title: string; date: string; summary: string };

function readPosts(root: string): PostMeta[] {
  const dir = join(root, "..", "blog");
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((f: string) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return names
    .map((name) => {
      const raw = readFileSync(join(dir, name), "utf8");
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const meta: Record<string, string> = {};
      if (m) {
        for (const line of m[1].split(/\r?\n/)) {
          const kv = line.match(/^(\w+):\s*(.*)$/);
          if (kv) meta[kv[1]] = kv[2].trim();
        }
      }
      const slug = name.replace(/\.md$/, "");
      return {
        slug,
        title: meta.title ?? slug,
        date: meta.date ?? "",
        summary: meta.summary ?? "",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * 블로그 경로를 실제 HTML 파일로 뽑는다.
 * SPA fallback 없이 200 이 나오고, 글마다 제목과 OG 메타가 맞는다.
 * sitemap.xml 과 RSS 도 같은 목록에서 만든다.
 */
function blogPages(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "eddm-blog-pages",
    apply: "build",
    configResolved(cfg) {
      root = cfg.root;
      outDir = cfg.build.outDir;
    },
    closeBundle() {
      const dist = resolve(root, outDir);
      const shell = readFileSync(join(dist, "index.html"), "utf8");
      const posts = readPosts(root);

      const page = (path: string, title: string, description: string) => {
        let html = shell
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
          .replace(
            /<meta name="description" content="[\s\S]*?"\s*\/>/,
            `<meta name="description" content="${escape(description)}" />`,
          )
          .replace(
            /<meta property="og:title" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:title" content="${escape(title)}" />`,
          )
          .replace(
            /<meta property="og:description" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:description" content="${escape(description)}" />`,
          )
          .replace(
            /<meta property="og:url" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:url" content="${ORIGIN}${path}" />`,
          )
          .replace(
            /<link rel="canonical" href="[\s\S]*?"\s*\/>/,
            `<link rel="canonical" href="${ORIGIN}${path}" />`,
          );
        if (path !== "/") {
          html = html.replace(
            /<meta property="og:type" content="[\s\S]*?"\s*\/>/,
            `<meta property="og:type" content="article" />`,
          );
        }
        const dirPath = join(dist, path.replace(/^\//, ""));
        mkdirSync(dirPath, { recursive: true });
        writeFileSync(join(dirPath, "index.html"), html, "utf8");
      };

      page("/blog", "블로그 · eddmpython", "만들면서 알게 된 것들을 적어 둡니다.");
      for (const p of posts) {
        page(`/blog/${p.slug}`, `${p.title} · eddmpython`, p.summary);
      }

      const urls = ["/", "/blog", ...posts.map((p) => `/blog/${p.slug}`)];
      writeFileSync(
        join(dist, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n  </url>`)
          .join("\n")}\n</urlset>\n`,
        "utf8",
      );

      writeFileSync(
        join(dist, "rss.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>eddmpython</title>\n    <link>${ORIGIN}/blog</link>\n    <description>복잡한 업무를, 실제로 작동하는 자동화로.</description>\n    <language>ko</language>\n${posts
          .map(
            (p) =>
              `    <item>\n      <title>${escape(p.title)}</title>\n      <link>${ORIGIN}/blog/${p.slug}</link>\n      <guid>${ORIGIN}/blog/${p.slug}</guid>\n      <description>${escape(p.summary)}</description>\n    </item>`,
          )
          .join("\n")}\n  </channel>\n</rss>\n`,
        "utf8",
      );

      this.warn?.(`blog pages: ${posts.length + 1}, sitemap urls: ${urls.length}`);
    },
  };
}

/**
 * favicon.svg 를 src/brand.ts 에서 만든다.
 *
 * public/ 에 사본을 두면 랜딩 마크를 고칠 때 파비콘만 옛 형태로 남는다.
 * 소스를 하나로 두고 dev 는 미들웨어로, build 는 dist 파일로 같은 문자열을 낸다.
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
        if (req.url?.split("?")[0] !== "/favicon.svg") return next();
        res.setHeader("Content-Type", "image/svg+xml");
        res.end(faviconSvg());
      });
    },
    closeBundle() {
      writeFileSync(
        join(resolve(root, outDir), "favicon.svg"),
        faviconSvg(),
        "utf8",
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandAssets(), blogPages()],
  // 글은 저장소 루트 blog/ 에 있다. dev 서버가 site/ 밖을 읽게 허용한다.
  server: { fs: { allow: [".."] } },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
});
