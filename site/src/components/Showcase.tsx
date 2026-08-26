import { useEffect, useRef, useState } from "react";
import { SLIDES } from "../slides";

const ROTATE_MS = 5500;

type Props = {
  active: number;
  onActiveChange: (index: number) => void;
  onRotate: () => void;
};

/** 라이브 제품 화면을 넘겨 보는 히어로 뷰어. */
export function Showcase({ active, onActiveChange, onRotate }: Props) {
  const [stopped, setStopped] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!pausedRef.current && !stopped) onRotate();
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [stopped, onRotate]);

  const current = SLIDES[active];

  return (
    <div
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocusCapture={() => (pausedRef.current = true)}
      onBlurCapture={() => (pausedRef.current = false)}
    >
      {/* 위·옆·아래 같은 패딩. 납작한 어두운 면 위에 얇은 프레임만 둔다. */}
      <a
        href={current.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${current.product} ${current.label} 페이지 열기`}
        data-hero-product-link
        className="group block cursor-pointer overflow-hidden rounded-2xl bg-ink p-4 ring-1 ring-white/[0.08] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-white/20 sm:p-5"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-carbon">
          {SLIDES.map((s, i) => (
            <img
              key={s.id}
              src={s.shot}
              alt={s.alt}
              width={1800}
              height={1125}
              loading={i === 0 ? "eager" : "lazy"}
              aria-hidden={i !== active}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-carbon/85 px-3 py-1.5 text-xs font-medium text-ivory shadow-lg backdrop-blur-sm transition-colors group-hover:bg-ivory group-hover:text-carbon sm:right-4 sm:bottom-4 sm:text-sm">
            {current.product} 열기
            <span aria-hidden="true">↗</span>
          </span>
        </div>
      </a>

      <div className="mt-5 flex min-h-6 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-2 text-center text-sm">
        <span className="flex items-center gap-2.5">
          <span className={`h-1.5 w-1.5 rounded-full ${current.dotClass}`} />
          <span className="font-medium">{current.product}</span>
        </span>
        <span aria-hidden="true" className="hidden text-ivory/55 sm:inline">
          ·
        </span>
        <span className="text-ivory/60">{current.caption}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onActiveChange(i)}
            aria-label={`${s.product} ${s.label} 보기`}
            aria-pressed={i === active}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[13px] transition-colors ${
              i === active
                ? "border-[var(--eddm-accent-line)] bg-[var(--eddm-accent-bg)] text-[var(--eddm-accent)]"
                : "border-white/10 text-ivory/50 hover:border-white/20 hover:text-ivory"
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStopped((v) => !v)}
          aria-pressed={stopped}
          className="cursor-pointer rounded-full border border-white/10 px-3 py-1 text-[13px] text-ivory/55 transition-colors hover:border-white/20 hover:text-ivory"
        >
          {stopped ? "자동 넘김 켜기" : "자동 넘김 멈춤"}
        </button>
      </div>
    </div>
  );
}
