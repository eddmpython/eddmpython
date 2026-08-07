import { useEffect, useRef, useState } from "react";
import { PRODUCTS } from "../products";

const ROTATE_MS = 6000;

/** 제품 실화면 뷰어. paseo 히어로 목업과 같은 이중 프레임 카드 + 하단 미니 전환. */
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

  return (
    <div
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="overflow-hidden rounded-xl bg-white/[0.06] p-2 ring-1 ring-white/10 sm:rounded-2xl sm:p-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-carbon sm:rounded-xl">
          {PRODUCTS.map((p, i) => (
            <img
              key={p.id}
              src={p.heroShot}
              alt={p.shotAlt}
              width={1800}
              height={1125}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActive(i);
              pausedRef.current = true;
            }}
            aria-pressed={i === active}
            className={`flex items-center gap-2 transition-colors ${
              i === active ? "text-ivory" : "text-ivory/45 hover:text-ivory/80"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full transition-opacity ${p.dotClass} ${
                i === active ? "opacity-100" : "opacity-40"
              }`}
            />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
