import { SYMBOL, BRAND } from "../brand";

/**
 * 브랜드 표기 3종. 셋을 섞어 쓰지 않는다.
 *
 * - LogoSymbol  심볼 단독. 이름을 적을 자리가 없는 곳에 쓴다 (파비콘, 앱 아이콘,
 *               아바타). 옆에 "eddmpython" 이 이미 적혀 있어도 심볼만 쓴다.
 * - Wordmark    워드마크 단독. 글자만이다. 심볼을 붙이면 로고가 되므로 붙이지 않는다.
 * - Logo        로고. 심볼 + 워드마크 락업이다. 브랜드를 처음 밝히는 자리에 쓴다
 *               (헤더, 푸터, og 이미지).
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
      <path d={SYMBOL.shape} fill="currentColor" fillRule="evenodd" />
      <rect
        x={SYMBOL.dot.x}
        y={SYMBOL.dot.y}
        width={SYMBOL.dot.width}
        height={SYMBOL.dot.height}
        rx={SYMBOL.dot.rx}
        fill={BRAND.dot}
      />
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

/** 로고. 심볼 + 워드마크 락업. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* 심볼이 점 때문에 가로로 조금 길다. 높이를 글자에 맞추고 폭은 비율대로 둔다. */}
      <LogoSymbol className="h-[19px] w-auto text-ivory" />
      <Wordmark />
    </span>
  );
}
