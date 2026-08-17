import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { decodeHashId } from "../hashNavigation";
import { CodaroCellEmbed } from "./CodaroCellEmbed";

const THREADS = /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[\w.]+\/post\/[\w-]+/;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
const VIDEO = /\.(mp4|webm)(\?.*)?$/i;
const CODARO_CELL =
  /^https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9]+(?:-[a-z0-9]+)*)$/;

function onlyUrl(children: ReactNode): string | null {
  const list = Array.isArray(children) ? children : [children];
  const items = list.filter((c) => c !== "\n" && c !== "");
  if (items.length !== 1) return null;
  const node = items[0] as { props?: { href?: string; children?: ReactNode } };
  const href = node?.props?.href;
  if (!href) return null;
  const label = node.props?.children;
  const text = typeof label === "string" ? label : "";
  // 라벨을 따로 붙인 링크는 그대로 링크로 둔다.
  if (text && text !== href) return null;
  return href;
}

function onlyImage(node: unknown): { src: string; alt: string; title: string } | null {
  const paragraph = node as {
    children?: Array<{
      type?: string;
      tagName?: string;
      value?: string;
      properties?: { src?: unknown; alt?: unknown; title?: unknown };
    }>;
  };
  const children = (paragraph.children ?? []).filter(
    (child) => child.type !== "text" || child.value?.trim(),
  );
  if (children.length !== 1 || children[0].tagName !== "img") return null;
  const properties = children[0].properties ?? {};
  if (typeof properties.src !== "string") return null;
  return {
    src: properties.src,
    alt: typeof properties.alt === "string" ? properties.alt : "",
    title: typeof properties.title === "string" ? properties.title : "",
  };
}

function ArticleVideo({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="my-7 overflow-hidden rounded-xl border border-white/10 bg-black/20">
      <video
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
        className="block w-full bg-black"
      >
        <source src={src} type="video/mp4" />
      </video>
      {caption && (
        <figcaption className="border-t border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm leading-relaxed text-ivory/48">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

type YouTubeVideo = { id: string; vertical: boolean };

function parseYouTube(url: string): YouTubeVideo | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{6,}$/.test(id) ? { id, vertical: false } : null;
    }
    if (host !== "youtube.com") return null;
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id && /^[\w-]{6,}$/.test(id) ? { id, vertical: false } : null;
    }
    const matched = parsed.pathname.match(/^\/(shorts|embed)\/([\w-]{6,})/);
    return matched ? { id: matched[2], vertical: matched[1] === "shorts" } : null;
  } catch {
    return null;
  }
}

function YouTube({ id, vertical }: YouTubeVideo) {
  const [playing, setPlaying] = useState(false);
  const watchUrl = `https://www.youtube.com/shorts/${id}`;
  return (
    <span
      data-youtube-player={id}
      className={`my-7 block overflow-hidden rounded-xl border border-white/10 ${
        vertical ? "mx-auto max-w-sm" : ""
      }`}
    >
      <span className={`block ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
            title="YouTube 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            aria-label="YouTube 영상 재생"
            onClick={() => setPlaying(true)}
            className="group flex h-full w-full items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/maxresdefault.jpg)` }}
          >
            <span className="flex size-16 items-center justify-center rounded-full border border-white/25 bg-black/75 shadow-xl transition-transform group-hover:scale-105">
              <span className="ml-1 block h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white" />
            </span>
          </button>
        )}
      </span>
      <span className="flex items-center justify-between gap-4 border-t border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-ivory/52">
        <span>파이썬 필수 기초 1분 영상</span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-ivory/72 underline decoration-white/20 underline-offset-4 hover:decoration-white/55"
        >
          YouTube에서 열기
        </a>
      </span>
    </span>
  );
}

type ArticleHeading = { id: string; text: string };

function headingText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

function headingBase(text: string): string {
  return (
    text
      .normalize("NFKC")
      .toLocaleLowerCase("ko")
      .replace(/[^0-9a-z가-힣]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function articleHeadings(markdown: string): ArticleHeading[] {
  const counts = new Map<string, number>();
  const headings: ArticleHeading[] = [];
  let fenced = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = line.match(/^##[ \t]+([^#].*?)\s*$/);
    if (!match) continue;
    const text = headingText(match[1]);
    const base = headingBase(text);
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    headings.push({ id: count === 1 ? base : `${base}-${count}`, text });
  }
  return headings;
}

function ArticleToc({ headings }: { headings: ArticleHeading[] }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const hashId = decodeHashId(window.location.hash);
    setActiveId(headings.some((heading) => heading.id === hashId) ? hashId! : (headings[0]?.id ?? ""));
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -75% 0px", threshold: [0, 1] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;
  return (
    <nav
      aria-label="글 목차"
      className="fixed top-32 left-[calc(50%+26rem)] hidden max-h-[calc(100vh-10rem)] w-52 overflow-y-auto xl:block"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase">
        이 글의 순서
      </p>
      <ol className="mt-4 space-y-3 border-l border-white/10 pl-4">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={() => setActiveId(heading.id)}
              aria-current={activeId === heading.id ? "location" : undefined}
              className={`block text-[13px] leading-relaxed transition-colors ${
                activeId === heading.id ? "text-ivory" : "text-ivory/42 hover:text-ivory/72"
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

let threadsScript: Promise<void> | null = null;
function loadThreads(): Promise<void> {
  if (!threadsScript) {
    threadsScript = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://www.threads.com/embed.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.body.appendChild(s);
    });
  }
  return threadsScript;
}

function Threads({ url }: { url: string }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let alive = true;
    loadThreads().then(() => {
      if (!alive) return;
      const w = window as unknown as { process?: { instgrm?: () => void } };
      w.process?.instgrm?.();
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <span className="my-7 block">
      <blockquote
        ref={ref as never}
        className="text-post-media block rounded-xl border border-white/10 bg-white/[0.03] p-5"
        data-text-post-permalink={url}
        data-text-post-version="0"
      >
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ivory/70 underline-offset-4 hover:underline"
        >
          Threads 에서 보기
        </a>
      </blockquote>
    </span>
  );
}

/** 단독 URL 문단을 임베드로 바꾼다. 그 외에는 표준 마크다운. */
export function Markdown({ children }: { children: string }) {
  const headings = useMemo(() => articleHeadings(children), [children]);
  let h2Index = 0;
  return (
    <>
      <ArticleToc headings={headings} />
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p({ children: kids, node }) {
          const picture = onlyImage(node);
          if (picture) {
            if (VIDEO.test(picture.src)) {
              return (
                <ArticleVideo src={picture.src} alt={picture.alt} caption={picture.title} />
              );
            }
            return (
              <figure className="my-7 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <img
                  src={picture.src}
                  alt={picture.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[3/2] w-full object-cover saturate-[0.72]"
                />
                {picture.title && (
                  <figcaption className="border-t border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm leading-relaxed text-ivory/48">
                    {picture.title}
                  </figcaption>
                )}
              </figure>
            );
          }
          const url = onlyUrl(kids);
          if (url) {
            const codaroCell = url.match(CODARO_CELL);
            if (codaroCell) {
              return <CodaroCellEmbed exampleId={codaroCell[1]} />;
            }
            const youtube = parseYouTube(url);
            if (youtube) return <YouTube {...youtube} />;
            if (THREADS.test(url)) return <Threads url={url} />;
            if (IMAGE.test(url)) {
              return (
                <span className="my-7 block overflow-hidden rounded-xl border border-white/10">
                  <img src={url} alt="" loading="lazy" className="block w-full" />
                </span>
              );
            }
            if (VIDEO.test(url)) {
              return <ArticleVideo src={url} alt="본문 영상" caption="" />;
            }
          }
          return <p className="my-5 leading-[1.85] text-ivory/75">{kids}</p>;
        },
        h2: ({ children: k }) => {
          const heading = headings[h2Index++];
          return (
            <h2
              id={heading?.id}
              className="mt-12 mb-2 scroll-mt-24 text-xl font-medium tracking-tight md:text-2xl"
            >
              {k}
            </h2>
          );
        },
        h3: ({ children: k }) => (
          <h3 className="mt-0 mb-5 text-[15px] leading-relaxed font-normal text-ivory/55 md:text-base">
            {k}
          </h3>
        ),
        ul: ({ children: k }) => (
          <ul className="my-5 space-y-2 pl-5 text-ivory/75 [&>li]:list-disc">{k}</ul>
        ),
        ol: ({ children: k }) => (
          <ol className="my-5 space-y-2 pl-5 text-ivory/75 [&>li]:list-decimal">{k}</ol>
        ),
        li: ({ children: k }) => <li className="leading-[1.8] pl-1">{k}</li>,
        a: ({ href, children: k }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noreferrer" : undefined}
            className="text-ivory underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/60"
          >
            {k}
          </a>
        ),
        blockquote: ({ children: k }) => (
          <blockquote className="my-6 border-l-2 border-white/15 pl-5 text-ivory/60">
            {k}
          </blockquote>
        ),
        code: ({ children: k, className }) =>
          className ? (
            <code className="font-mono text-[13px]">{k}</code>
          ) : (
            <code className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.9em]">
              {k}
            </code>
          ),
        pre: ({ children: k }) => (
          <pre className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-carbon px-5 py-4 leading-6 text-ivory/85">
            {k}
          </pre>
        ),
        img: ({ src, alt, title }) =>
          typeof src === "string" && VIDEO.test(src) ? (
            <ArticleVideo src={src} alt={alt ?? ""} caption={typeof title === "string" ? title : ""} />
          ) : (
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              className="my-7 block w-full rounded-xl border border-white/10"
            />
          ),
        hr: () => <hr className="my-10 border-white/10" />,
        table: ({ children: k }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{k}</table>
          </div>
        ),
        th: ({ children: k }) => (
          <th className="border-b border-white/15 px-3 py-2 text-left font-medium">
            {k}
          </th>
        ),
        td: ({ children: k }) => (
          <td className="border-b border-white/8 px-3 py-2 text-ivory/70">{k}</td>
        ),
      }}
      >
        {children}
      </ReactMarkdown>
    </>
  );
}
