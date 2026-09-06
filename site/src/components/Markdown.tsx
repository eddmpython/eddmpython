import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { decodeHashId } from "../hashNavigation";
import { CodaroCellEmbed } from "./CodaroCellEmbed";
import { ToolEmbed } from "./ToolEmbed";
import { ArticleFlow } from "./ArticleFlow";

const THREADS = /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[\w.]+\/post\/[\w-]+/;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
/** 아직 발행하지 않은 시각물 자리다. 교안은 본문에 이 자리를 먼저 넣고 나중에 채운다. */
const MEDIA_PENDING = /^media:\/\/([a-z0-9-]+)$/i;
const VIDEO = /\.(mp4|webm)(\?.*)?$/i;
const CODARO_CELL =
  /^https:\/\/eddmpython\.com\/codaro\/run\/\?example=([a-z0-9]+(?:-[a-z0-9]+)*)$/;
/** 글이 품는 도구 마커. 본문에 이 한 줄을 두면 그 자리가 작동하는 도구로 바뀐다. */
const TOOL_EMBED = /^https:\/\/eddmpython\.com\/tool\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

type ParagraphLink = { href: string; label: string; title: string };

/** 링크 하나로만 이루어진 문단을 집는다. 라벨과 title 은 캡션 후보로 함께 돌려준다. */
function onlyLink(children: ReactNode): ParagraphLink | null {
  const list = Array.isArray(children) ? children : [children];
  const items = list.filter((c) => c !== "\n" && c !== "");
  if (items.length !== 1) return null;
  const node = items[0] as {
    props?: { href?: string; title?: string; children?: ReactNode };
  };
  const href = node?.props?.href;
  if (!href) return null;
  const label = node.props?.children;
  return {
    href,
    label: typeof label === "string" ? label : "",
    title: typeof node.props?.title === "string" ? node.props.title : "",
  };
}

function onlyImage(node: unknown): { src: string; alt: string; title: string; href?: string } | null {
  type ImageNode = { type?: string; tagName?: string; value?: string; properties?: { src?: unknown; alt?: unknown; title?: unknown; href?: unknown }; children?: ImageNode[] };
  const paragraph = node as ImageNode;
  const children = (paragraph.children ?? []).filter(
    (child) => child.type !== "text" || child.value?.trim(),
  );
  if (children.length !== 1) return null;
  const linked = children[0].tagName === "a" ? children[0] : null;
  const picture = linked?.children?.length === 1 ? linked.children[0] : children[0];
  if (picture.tagName !== "img") return null;
  const properties = picture.properties ?? {};
  if (typeof properties.src !== "string") return null;
  return {
    src: properties.src,
    alt: typeof properties.alt === "string" ? properties.alt : "",
    title: typeof properties.title === "string" ? properties.title : "",
    href: typeof linked?.properties?.href === "string" ? linked.properties.href : undefined,
  };
}

/** 발행 전 자리표시자. 빈 src 로 두면 브라우저가 페이지 전체를 다시 내려받는다. */
function PendingMedia({
  assetKey,
  alt,
  caption,
}: {
  assetKey: string;
  alt: string;
  caption: string;
}) {
  return (
    <span className="my-7 block overflow-hidden rounded-xl border border-dashed border-[var(--eddm-line-strong)] bg-[var(--eddm-raise)]">
      <span className="flex aspect-video w-full flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase">
          시각물 준비 중
        </span>
        <span className="text-sm leading-relaxed text-ivory/50">{alt}</span>
        <span className="font-mono text-[11px] text-ivory/28">{assetKey}</span>
      </span>
      {caption && (
        <span className="block border-t border-[var(--eddm-line)] px-4 py-3 text-left text-sm leading-relaxed text-ivory/48">
          {caption}
        </span>
      )}
    </span>
  );
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
    <figure data-article-visual="video" className="my-7 overflow-hidden rounded-xl border border-[var(--eddm-line-base)] bg-[var(--eddm-media)]">
      <video
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
        className="block aspect-video w-full object-contain bg-[var(--eddm-media)]"
      >
        <source src={src} type="video/mp4" />
      </video>
      {caption && (
        <MediaCaption>{caption}</MediaCaption>
      )}
    </figure>
  );
}

function MediaCaption({ children }: { children: ReactNode }) {
  return (
    <figcaption className="flex items-baseline gap-2 border-t border-[var(--eddm-line)] bg-[var(--eddm-raise)] px-4 py-3 text-left text-sm leading-relaxed text-ivory/55">
      <span aria-hidden="true" className="shrink-0 text-[9px] text-accent">
        ◆
      </span>
      <span>{children}</span>
    </figcaption>
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

function YouTube({
  id,
  vertical,
  caption,
}: YouTubeVideo & { caption: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  );
  const watchUrl = vertical
    ? `https://www.youtube.com/shorts/${id}`
    : `https://www.youtube.com/watch?v=${id}`;
  return (
    <span
      data-youtube-player={id}
      data-article-visual="video"
      className={`my-7 block overflow-hidden rounded-xl border border-[var(--eddm-line-base)] ${
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
            className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--eddm-media)]"
          >
            <img
              src={thumb}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={() => setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="relative flex size-16 items-center justify-center rounded-full border border-[var(--eddm-line-strong)] bg-[var(--eddm-overlay)] shadow-xl transition-transform group-hover:scale-105">
              <span className="ml-1 block h-0 w-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-[var(--eddm-foreground)]" />
            </span>
          </button>
        )}
      </span>
      <span className="flex items-center justify-between gap-4 border-t border-[var(--eddm-line)] bg-[var(--eddm-raise)] px-4 py-3 text-sm text-ivory/52">
        <span className="text-left leading-relaxed">{caption}</span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-ivory/72 underline decoration-[var(--eddm-accent-line)] underline-offset-4 hover:decoration-[var(--eddm-accent)]"
        >
          YouTube에서 열기
        </a>
      </span>
    </span>
  );
}

type ArticleHeading = { id: string; text: string; line: number };

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

  for (const [lineIndex, line] of markdown.split(/\r?\n/).entries()) {
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
    headings.push({ id: count === 1 ? base : `${base}-${count}`, text, line: lineIndex + 1 });
  }
  return headings;
}

function ArticleToc({ headings }: { headings: ArticleHeading[] }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const mobileToc = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const hashId = decodeHashId(window.location.hash);
    setActiveId(headings.some((heading) => heading.id === hashId) ? hashId! : (headings[0]?.id ?? ""));
    if (!headings.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const elements = headings
        .map((heading) => document.getElementById(heading.id))
        .filter((element): element is HTMLElement => Boolean(element));
      if (!elements.length) return;
      let current = elements[0];
      for (const element of elements) {
        if (element.getBoundingClientRect().top > 160) break;
        current = element;
      }
      setActiveId(current.id);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  if (headings.length < 2) return null;
  const links = (mobile: boolean) => (
    <ol
      className={
        mobile
          ? "mt-3 space-y-1 border-t border-[var(--eddm-line)] pt-3"
          : "mt-4 space-y-3 border-l border-[var(--eddm-line-base)] pl-4"
      }
    >
      {headings.map((heading, index) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            onClick={() => {
              setActiveId(heading.id);
              if (mobile) mobileToc.current?.removeAttribute("open");
            }}
            aria-current={activeId === heading.id ? "location" : undefined}
            className={`flex gap-3 py-1.5 text-[13px] leading-relaxed transition-colors ${
              activeId === heading.id ? "text-ivory" : "text-ivory/48 hover:text-ivory/75"
            }`}
          >
            <span
              aria-hidden="true"
              className={`shrink-0 font-mono text-[11px] ${
                activeId === heading.id ? "text-accent" : "text-ivory/32"
              }`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{heading.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <nav
      aria-label="글 목차"
      className="my-10 xl:fixed xl:top-32 xl:left-[calc(50%+26rem)] xl:my-0 xl:max-h-[calc(100vh-10rem)] xl:w-52 xl:overflow-y-auto"
    >
      <details
        ref={mobileToc}
        data-blog-toc-mobile
        className="rounded-xl border border-[var(--eddm-line-base)] bg-[var(--eddm-raise)] px-4 py-3 xl:hidden"
      >
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 text-sm text-ivory/70 [&::-webkit-details-marker]:hidden">
          <span>이 글의 순서</span>
          <span className="font-mono text-[11px] text-accent">
            {String(headings.length).padStart(2, "0")}개 절
          </span>
        </summary>
        {links(true)}
      </details>
      <div data-blog-toc-desktop className="hidden xl:block">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase">
          이 글의 순서
        </p>
        {links(false)}
      </div>
    </nav>
  );
}

function ArticleProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const article = document.getElementById("content");
      if (!article) return;
      const top = article.getBoundingClientRect().top + window.scrollY;
      const distance = Math.max(article.offsetHeight - window.innerHeight, 1);
      setProgress(Math.min(1, Math.max(0, (window.scrollY - top) / distance)));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span
      data-blog-progress
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <span
        className="block h-full origin-left bg-accent/70"
        style={{ transform: `scaleX(${progress})` }}
      />
    </span>
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
        className="text-post-media block rounded-xl border border-[var(--eddm-line-base)] bg-[var(--eddm-raise)] p-5"
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
  return (
    <>
      <ArticleProgress />
      <ArticleToc headings={headings} />
      <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) =>
        MEDIA_PENDING.test(url) ? url : defaultUrlTransform(url)
      }
      components={{
        p({ children: kids, node }) {
          const picture = onlyImage(node);
          if (picture) {
            const pending = picture.src.match(MEDIA_PENDING);
            if (pending) {
              return (
                <PendingMedia
                  assetKey={pending[1]}
                  alt={picture.alt}
                  caption={picture.title}
                />
              );
            }
            if (VIDEO.test(picture.src)) {
              return (
                <ArticleVideo src={picture.src} alt={picture.alt} caption={picture.title} />
              );
            }
            return (
              <figure data-article-visual="image" className="my-7 overflow-hidden rounded-xl border border-[var(--eddm-line-base)] bg-[var(--eddm-media)]">
                <a href={picture.href ?? picture.src} target="_blank" rel="noreferrer" className="block aspect-video" aria-label={picture.href ? `${picture.alt}, 연결된 페이지 열기` : `${picture.alt}, 원본 이미지 열기`}>
                <img
                  src={picture.src}
                  alt={picture.alt}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-contain"
                />
                </a>
                {picture.title && (
                  <MediaCaption>{picture.title}</MediaCaption>
                )}
              </figure>
            );
          }
          const link = onlyLink(kids);
          if (link) {
            const youtube = parseYouTube(link.href);
            if (youtube) {
              const caption =
                link.title || (link.label !== link.href ? link.label : "");
              return <YouTube {...youtube} caption={caption} />;
            }
            // 라벨을 따로 붙인 링크는 그대로 링크로 둔다.
            if (!link.label || link.label === link.href) {
              const url = link.href;
              const codaroCell = url.match(CODARO_CELL);
              if (codaroCell) {
                return <CodaroCellEmbed exampleId={codaroCell[1]} />;
              }
              const tool = url.match(TOOL_EMBED);
              if (tool) {
                return <ToolEmbed toolId={tool[1]} />;
              }
              if (THREADS.test(url)) return <Threads url={url} />;
              if (IMAGE.test(url)) {
                return (
                  <span className="my-7 block overflow-hidden rounded-xl border border-[var(--eddm-line-base)]">
                    <img src={url} alt="" loading="lazy" className="block w-full" />
                  </span>
                );
              }
              if (VIDEO.test(url)) {
                return <ArticleVideo src={url} alt="본문 영상" caption="" />;
              }
            }
          }
          return <p className="my-5 leading-[1.85] text-ivory/75">{kids}</p>;
        },
        h2: ({ children: k, node }) => {
          // 렌더 호출 횟수가 아닌 원문의 위치로 번호와 목차 연결을 고정한다.
          const index = headings.findIndex((heading) => heading.line === node?.position?.start.line);
          const heading = headings[index];
          return (
            <h2
              id={heading?.id}
              className="eddm-section-title mt-20 mb-3 flex scroll-mt-28 items-baseline gap-4 border-t border-[var(--eddm-line-strong)] pt-9 text-ivory md:mt-24 md:gap-5 md:pt-10"
            >
              <span
                aria-hidden="true"
                className="w-8 shrink-0 font-mono text-[11px] font-medium tracking-[0.08em] text-accent/70 md:w-9 md:text-xs"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{k}</span>
            </h2>
          );
        },
        h3: ({ children: k }) => (
          <h3 className="mt-0 mb-7 text-[15px] leading-relaxed font-normal text-ivory/55 md:text-base">
            {k}
          </h3>
        ),
        ul: ({ children: k }) => (
          <ul className="my-5 space-y-2 pl-5 text-ivory/75 [&>li]:list-disc">{k}</ul>
        ),
        ol: ({ children: k }) => (
          <ol
            data-step-list
            className="my-6 space-y-2 rounded-xl border border-[var(--eddm-line-base)] bg-[var(--eddm-raise)] py-4 pr-5 pl-10 text-ivory/75 [&>li]:list-decimal [&>li::marker]:text-[var(--eddm-accent-dim)]"
          >
            {k}
          </ol>
        ),
        li: ({ children: k }) => <li className="leading-[1.8] pl-1">{k}</li>,
        a: ({ href, children: k }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noreferrer" : undefined}
            className="text-ivory underline decoration-[var(--eddm-accent-line)] underline-offset-4 transition-colors hover:decoration-[var(--eddm-accent)]"
          >
            {k}
          </a>
        ),
        blockquote: ({ children: k }) => (
          <blockquote className="my-6 border-l-2 border-[var(--eddm-line-strong)] pl-5 text-ivory/60">
            {k}
          </blockquote>
        ),
        code: ({ children: k, className }) =>
          className ? (
            <code className="font-mono text-[13px]">{k}</code>
          ) : (
            <code className="rounded border border-[var(--eddm-line-base)] bg-[var(--eddm-hover)] px-1.5 py-0.5 font-mono text-[0.9em] [overflow-wrap:anywhere]">
              {k}
            </code>
          ),
        pre: ({ children: k, node }) => {
          const code = node?.children[0];
          if (code?.type === "element" && code.tagName === "code" && Array.isArray(code.properties.className) && code.properties.className.includes("language-flow")) {
            return <ArticleFlow text={code.children.map((child) => child.type === "text" ? child.value : "").join("")} />;
          }
          return <pre data-article-visual="code" className="my-6 overflow-x-auto rounded-xl border border-[var(--eddm-line-base)] bg-carbon px-5 py-4 leading-6 text-ivory/85">{k}</pre>;
        },
        img: ({ src, alt, title }) =>
          typeof src === "string" && MEDIA_PENDING.test(src) ? (
            <PendingMedia
              assetKey={src.replace("media://", "")}
              alt={alt ?? ""}
              caption={typeof title === "string" ? title : ""}
            />
          ) : typeof src === "string" && VIDEO.test(src) ? (
            <ArticleVideo src={src} alt={alt ?? ""} caption={typeof title === "string" ? title : ""} />
          ) : (
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              className="my-7 block w-full rounded-xl border border-[var(--eddm-line-base)]"
            />
          ),
        hr: () => <hr className="my-10 border-[var(--eddm-line-base)]" />,
        table: ({ children: k }) => (
          <div className="my-6 overflow-x-auto rounded-xl border border-[var(--eddm-line-base)]">
            <table data-article-visual="table" className="w-full border-collapse text-sm">{k}</table>
          </div>
        ),
        th: ({ children: k }) => (
          <th className="border-b border-[var(--eddm-line-strong)] bg-[var(--eddm-hover)] px-3 py-2 text-left font-medium">
            {k}
          </th>
        ),
        td: ({ children: k }) => (
          <td className="border-b border-[var(--eddm-line)] px-3 py-2 text-ivory/70">{k}</td>
        ),
      }}
      >
        {children}
      </ReactMarkdown>
    </>
  );
}
