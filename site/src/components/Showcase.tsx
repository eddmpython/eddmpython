import { useEffect, useRef, useState } from "react";
import { PRODUCTS } from "../products";

const ROTATE_MS = 5000;

/** 제품 실화면을 무대 배경 위 한 프레임에서 넘겨 보는 뷰어 (paseo 히어로 구도). */
export function Showcase() {
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!pausedRef.current) {
        setActive((i) => (i + 1) % PRODUCTS.length);
      }
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const current = PRODUCTS[active];

  return (
    <div
      className="stage-bg relative overflow-hidden rounded-3xl border border-white/10 px-4 pt-6 sm:px-8 md:px-14 md:pt-9"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 md:mb-8">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActive(i);
              pausedRef.current = true;
            }}
            aria-pressed={i === active}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm backdrop-blur transition-colors ${
              i === active
                ? "border-white/25 bg-white/10 text-ivory"
                : "border-white/10 bg-carbon/40 text-ivory/60 hover:border-white/20 hover:text-ivory"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
            {p.name}
          </button>
        ))}
      </div>

      <figure className="mx-auto max-w-4xl overflow-hidden rounded-t-xl border border-b-0 border-white/15 bg-carbon shadow-[0_-8px_60px_-12px_rgba(0,0,0,0.6),0_24px_80px_-24px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 font-mono text-xs text-ivory/55">
            {current.name.toLowerCase()}
          </span>
          <span className="ml-auto hidden font-mono text-xs text-ivory/35 sm:block">
            {current.tagline}
          </span>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden bg-carbon">
          {PRODUCTS.map((p, i) => (
            <img
              key={p.id}
              src={p.shot}
              alt={p.shotAlt}
              width={1800}
              height={1125}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              } ${p.heroShotClass ?? ""}`}
            />
          ))}
        </div>
      </figure>
    </div>
  );
}
