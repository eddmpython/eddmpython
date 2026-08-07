import { useEffect, useRef, useState } from "react";
import { SLIDES } from "../slides";

const ROTATE_MS = 5500;

/** 라이브 제품 화면을 넘겨 보는 히어로 뷰어. */
export function Showcase() {
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!pausedRef.current) setActive((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const current = SLIDES[active];

  return (
    <div
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="overflow-hidden rounded-xl bg-white/[0.06] p-2 ring-1 ring-white/10 sm:rounded-2xl sm:p-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-carbon sm:rounded-xl">
          {SLIDES.map((s, i) => (
            <img
              key={s.id}
              src={s.shot}
              alt={s.alt}
              width={1800}
              height={1125}
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex min-h-6 items-center justify-center gap-2.5 text-sm">
        <span className={`h-1.5 w-1.5 rounded-full ${current.dotClass}`} />
        <span className="font-medium">{current.product}</span>
        <span className="text-ivory/30">·</span>
        <span className="text-ivory/60">{current.caption}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActive(i);
              pausedRef.current = true;
            }}
            aria-label={`${s.product} ${s.label} 보기`}
            aria-pressed={i === active}
            className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
              i === active
                ? "border-white/25 bg-white/10 text-ivory"
                : "border-white/10 text-ivory/50 hover:border-white/20 hover:text-ivory"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
