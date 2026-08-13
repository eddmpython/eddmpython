import { PRODUCT_MARKS, type ProductKey } from "../productMarks";

type Props = {
  active: ProductKey;
  onSelect: (key: ProductKey) => void;
};

/** 히어로 '다루는 것' 옆 제품 마크. 화면이 돌면 활성 제품이 살아난다. */
export function ProductRail({ active, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-4">
      <span className="text-sm text-ivory/50">다루는 것</span>
      <ul className="flex items-center gap-2.5 sm:gap-4">
        {PRODUCT_MARKS.map((mark) => {
          const on = mark.key === active;
          return (
            <li key={mark.key}>
              <button
                type="button"
                onClick={() => onSelect(mark.key)}
                aria-label={`${mark.name} 화면 보기`}
                aria-pressed={on}
                data-product-key={mark.key}
                className="group flex cursor-pointer items-center gap-1.5 rounded-full outline-none sm:gap-2"
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--eddm-carbon)_55%,black)] ring-2 transition-[box-shadow,opacity] duration-500 sm:h-10 sm:w-10 ${
                    on
                      ? `${mark.ringClass} product-mark-live opacity-100`
                      : "ring-white/10 opacity-55 hover:opacity-85 hover:ring-white/25"
                  }`}
                  style={on ? { boxShadow: `0 0 0 4px ${mark.glow}` } : undefined}
                >
                  <img
                    src={mark.src}
                    alt=""
                    width={40}
                    height={40}
                    className={`h-full w-full ${
                      mark.fit === "contain" ? "object-contain p-1.5" : "object-cover"
                    }`}
                  />
                </span>
                <span
                  className={`hidden text-sm transition-colors duration-500 sm:inline ${
                    on ? "text-ivory" : "text-ivory/45 group-hover:text-ivory/70"
                  }`}
                >
                  {mark.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
