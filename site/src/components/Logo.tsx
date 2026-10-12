import {
  SYMBOL, WORDMARK, LOGO, ICON_FINISHES, ICON_TILE,
  symbolMarkup, wordmarkMarkup, logoMarkup, type IconFinish,
} from "../brand";

/** 심볼 단독. 이름이 함께 표시되거나 글자를 넣을 공간이 없는 자리에 쓴다. */
export function LogoSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox={SYMBOL.viewBox}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: symbolMarkup() }}
    />
  );
}

/** EDDM 워드마크. 승인된 글자 윤곽선을 그대로 쓴다. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={WORDMARK.viewBox}
      className={`block w-auto ${className ?? "h-[22px]"}`}
      role="img"
      aria-label="EDDM"
      dangerouslySetInnerHTML={{ __html: wordmarkMarkup() }}
    />
  );
}

const logoSizes = { nav: "h-8", display: "h-[72px]" } as const;
export type LockupSize = keyof typeof logoSizes;

/** 크기와 무관하게 심볼, 글자, 간격은 승인된 가로 조합 비율을 유지한다. */
export function Logo({ size = "nav", className }: { size?: LockupSize; className?: string } = {}) {
  return (
    <svg
      viewBox={LOGO.viewBox}
      className={`block w-auto shrink-0 ${logoSizes[size]} ${className ?? "text-ivory"}`}
      role="img"
      aria-label="EDDM"
      dangerouslySetInnerHTML={{ __html: logoMarkup() }}
    />
  );
}

/** 칩의 마감과 배치는 brand.ts의 ICON_FINISHES, ICON_TILE을 소비한다. */
export function AppIcon({
  finish = "dark",
  className,
}: {
  finish?: IconFinish;
  className?: string;
}) {
  const f = ICON_FINISHES[finish];
  const t = ICON_TILE;
  const inner = t.size - t.edge.inset * 2;
  return (
    <svg viewBox={`0 0 ${t.size} ${t.size}`} className={className} aria-hidden="true">
      <rect width={t.size} height={t.size} rx={t.radius} fill={f.tile} />
      {f.outlined ? (
        <rect
          x={t.edge.inset}
          y={t.edge.inset}
          width={inner}
          height={inner}
          rx={t.edge.radius}
          fill="none"
          stroke={f.ink}
          strokeOpacity={t.edge.opacity}
          strokeWidth={t.edge.width}
        />
      ) : null}
      <g
        transform={t.transform}
        dangerouslySetInnerHTML={{ __html: symbolMarkup({ ink: f.ink }) }}
      />
    </svg>
  );
}
