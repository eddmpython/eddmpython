/** eddmpython 스네이크 e 마크. currentColor 로 그려서 문맥 색을 따른다. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path
        d="M 56.2 24.7 A 30 30 0 1 0 74.6 71.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
      />
      <path d="M 82.9 59.2 L 80.9 78.3 L 65.3 67.4 Z" />
      <path
        fillRule="evenodd"
        d="M 61 18 m -10.5 0 a 10.5 10.5 0 1 0 21 0 a 10.5 10.5 0 1 0 -21 0 M 62.5 14.5 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0"
      />
      <path d="M 53.5 22 Q 54.5 38 43 49.5 Q 59 43 65 25 Q 60 20.5 53.5 22 Z" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-6 w-6 text-ivory" />
      <span className="text-[15px] tracking-tight">
        <span className="font-bold">eddm</span>
        <span className="font-normal text-ivory/80">python</span>
      </span>
    </span>
  );
}
