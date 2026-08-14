import { useEffect, useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodaroCellEmbed } from "./CodaroCellEmbed";

const YOUTUBE =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([\w-]{6,})|youtu\.be\/([\w-]{6,}))/;
const THREADS = /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[\w.]+\/post\/[\w-]+/;
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
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

function YouTube({ id }: { id: string }) {
  return (
    <span className="my-7 block overflow-hidden rounded-xl border border-white/10">
      <span className="block aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="YouTube"
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </span>
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
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p({ children: kids, node }) {
          const picture = onlyImage(node);
          if (picture) {
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
            const yt = url.match(YOUTUBE);
            if (yt) return <YouTube id={yt[1] ?? yt[2]} />;
            if (THREADS.test(url)) return <Threads url={url} />;
            if (IMAGE.test(url)) {
              return (
                <span className="my-7 block overflow-hidden rounded-xl border border-white/10">
                  <img src={url} alt="" loading="lazy" className="block w-full" />
                </span>
              );
            }
          }
          return <p className="my-5 leading-[1.85] text-ivory/75">{kids}</p>;
        },
        h2: ({ children: k }) => (
          <h2 className="mt-12 mb-2 text-xl font-medium tracking-tight md:text-2xl">
            {k}
          </h2>
        ),
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
        img: ({ src, alt }) => (
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
  );
}
