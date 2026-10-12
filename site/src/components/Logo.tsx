import { SYMBOL, BRAND, ICON_FINISHES, ICON_TILE, symbolMarkup, type IconFinish } from "../brand";

/**
 * 브랜드 표기 4종. 넷을 섞어 쓰지 않는다.
 *
 * - LogoSymbol   심볼 단독. 이름을 적을 자리가 없는 곳에 쓴다 (파비콘, 아바타).
 *                옆에 "eddmpython" 이 이미 적혀 있어도 심볼만 쓴다.
 * - Wordmark     워드마크 단독. 글자만이다. 심볼을 붙이면 로고가 되므로 붙이지 않는다.
 * - Logo         로고 가로 락업. 심볼 + 워드마크다. 브랜드를 처음 밝히는 자리에 쓴다
 *                (헤더, 푸터, og 이미지).
 * - LogoStacked  로고 세로 락업. 가로가 좁고 세로가 남는 자리에만 쓴다.
 * - AppIcon      정사각 칩. 다른 앱 아이콘 사이에 놓이는 자리에만 쓴다.
 *
 * 심볼 형태 정본은 src/brand.ts 다. 여기서 좌표를 다시 적지 않는다.
 *
 * 워드마크는 `eddm.py` 다. 도메인과 문서 본문에서 부르는 이름은 `eddmpython` 그대로이고,
 * 워드마크만 짧은 표기를 쓴다. 본문의 브랜드 이름을 이 표기로 바꾸지 않는다.
 */

/** 심볼 단독. 두 도형이 함께 currentColor를 따른다. */
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

/** 워드마크 단독. 글자만이다. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className ?? "text-[15px]"}`}>
      <span>eddm</span>
      <span style={{ color: BRAND.accent }}>.py</span>
    </span>
  );
}

/**
 * 락업의 두 크기.
 *
 * 심볼과 글자의 비율은 어느 크기에서도 같아야 한다. 쓰는 쪽이 높이를 따로 정하게 두면
 * 화면마다 심볼이 글자보다 크거나 작아진다. 그래서 크기를 두 이름으로 고정한다.
 * `nav` 는 머리띠와 푸터, `display` 는 브랜드 화면처럼 락업 자체를 보여 주는 자리다.
 */
const LOCKUP = {
  nav: { symbol: "h-[21px]", word: "text-[15px]", gap: "gap-2" },
  display: { symbol: "h-[34px]", word: "text-[25px]", gap: "gap-3" },
} as const;

export type LockupSize = keyof typeof LOCKUP;

/** 로고 가로 락업. 현재 사용하는 eddm.py 글자 표기를 유지한다. */
export function Logo({ size = "nav" }: { size?: LockupSize } = {}) {
  const s = LOCKUP[size];
  return (
    <span className={`flex items-center ${s.gap}`}>
      <LogoSymbol className={`${s.symbol} w-auto text-ivory`} />
      <Wordmark className={s.word} />
    </span>
  );
}

/** 로고 세로 락업. 가로가 좁고 세로가 남는 자리에만 쓴다. */
export function LogoStacked({ size = "display" }: { size?: LockupSize } = {}) {
  const s = LOCKUP[size];
  return (
    <span className="inline-flex flex-col items-center gap-2">
      <LogoSymbol className={`${s.symbol} w-auto text-ivory`} />
      <Wordmark className={s.word} />
    </span>
  );
}

/**
 * 정사각 앱 아이콘 칩.
 *
 * 마감 네 가지는 `ICON_FINISHES`, 칩의 여백과 모서리는 `ICON_TILE` 이 정본이다. 여기서
 * 색도 여백도 다시 적지 않는다. 한때 이 컴포넌트가 여백과 모서리를 자기 숫자로 들고 있었고,
 * 그래서 화면의 칩과 내려받는 `icon-*.svg` 가 서로 다른 변환행렬을 냈다.
 */
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
