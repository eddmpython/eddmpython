import { MARK } from "../brand";

/**
 * eddmpython 스네이크 e 마크. 형태 정본은 src/brand.ts 에 있다.
 * currentColor 로 그려서 문맥 색을 따른다. 눈은 evenodd 구멍이라 배경이 비친다.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK.viewBox} className={className} aria-hidden="true">
      <path
        d={MARK.body}
        fill="none"
        stroke="currentColor"
        strokeWidth={MARK.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={MARK.head} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      {/* 마크가 가로로 넓다. 높이를 텍스트에 맞추고 폭은 비율대로 둔다. */}
      <LogoMark className="h-[19px] w-auto text-ivory" />
      <span className="text-[15px] tracking-tight">
        <span className="font-bold">eddm</span>
        <span className="font-normal text-ivory/80">python</span>
      </span>
    </span>
  );
}
