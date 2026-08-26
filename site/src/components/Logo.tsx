import { SYMBOL, BRAND, ICON_FINISHES, type IconFinish } from "../brand";

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

/** 심볼 단독. 획은 currentColor 를 따르고 점만 고정 색이다. */
export function LogoSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox={SYMBOL.viewBox} className={className} aria-hidden="true">
      <path d={SYMBOL.shape} fill="currentColor" />
      <circle cx={SYMBOL.dot.cx} cy={SYMBOL.dot.cy} r={SYMBOL.dot.r} fill={BRAND.dot} />
    </svg>
  );
}

/** 워드마크 단독. 글자만이다. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className ?? "text-[15px]"}`}>
      <span>eddm</span>
      <span style={{ color: BRAND.dot }}>.py</span>
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

/**
 * 로고 가로 락업.
 *
 * 심볼의 점이 오른쪽 위로 나가 있어서 심볼의 시각 중심은 잉크 상자의 가운데보다
 * 왼쪽 아래다. 워드마크를 잉크 상자에 그대로 맞추면 글자가 오른쪽으로 밀려 보인다.
 * 그래서 간격을 조금 좁게 잡는다.
 */
export function Logo({ size = "nav" }: { size?: LockupSize } = {}) {
  const s = LOCKUP[size];
  return (
    <span className={`flex items-center ${s.gap}`}>
      {/* 심볼이 가로로 1.27:1 이다. 높이를 글자에 맞추고 폭은 비율대로 둔다. */}
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
 * 마감 네 가지는 brand.ts 의 `ICON_FINISHES` 가 정본이다. 여기서 색을 다시 적지 않는다.
 */
export function AppIcon({
  finish = "dark",
  className,
}: {
  finish?: IconFinish;
  className?: string;
}) {
  const f = ICON_FINISHES[finish];
  const pad = 12;
  const box = 100 - pad * 2;
  const scale = Math.min(box / SYMBOL.width, box / SYMBOL.height);
  const x = (100 - SYMBOL.width * scale) / 2;
  const y = (100 - SYMBOL.height * scale) / 2;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="22" fill={f.tile} />
      {f.outlined ? (
        <rect
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="20.5"
          fill="none"
          stroke={f.ink}
          strokeOpacity=".22"
          strokeWidth="3"
        />
      ) : null}
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d={SYMBOL.shape} fill={f.ink} />
        <circle cx={SYMBOL.dot.cx} cy={SYMBOL.dot.cy} r={SYMBOL.dot.r} fill={f.dot} />
      </g>
    </svg>
  );
}
