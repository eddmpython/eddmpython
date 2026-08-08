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
 */

/** 심볼 단독. 몸통과 머리와 혀는 currentColor 를 따르고 눈만 고정 색이다. */
export function LogoSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox={SYMBOL.viewBox} className={className} aria-hidden="true">
      <path d={SYMBOL.shape} fill="currentColor" fillRule="evenodd" />
      <ellipse
        cx={SYMBOL.eye.cx}
        cy={SYMBOL.eye.cy}
        rx={SYMBOL.eye.rx}
        ry={SYMBOL.eye.ry}
        fill={BRAND.eye}
      />
    </svg>
  );
}

/** 워드마크 단독. 글자만이다. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`tracking-tight ${className ?? "text-[15px]"}`}>
      <span className="font-bold">eddm</span>
      <span className="font-normal text-ivory/80">python</span>
    </span>
  );
}

/** 로고. 심볼 + 워드마크 락업. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* 심볼이 정사각에 가깝다. 높이를 글자에 맞추고 폭은 비율대로 둔다. */}
      <LogoSymbol className="h-[21px] w-auto text-ivory" />
      <Wordmark />
    </span>
  );
}
