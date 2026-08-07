import { PRODUCTS } from "../products";
import { Showcase } from "./Showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* 히어로 전체를 덮는 분위기 배경. 하단은 카본으로 수렴해 다음 섹션과 이어진다. */}
      <img
        src="/shots/hero-bg.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative mx-auto w-full max-w-5xl px-6 pt-24 md:pt-32">
        <h1
          className="fade-up max-w-3xl bg-gradient-to-b from-ivory via-ivory to-ivory/60 bg-clip-text text-4xl leading-[1.15] font-semibold tracking-tight text-transparent md:text-6xl"
          style={{ animationDelay: "0.05s" }}
        >
          복잡한 업무를,
          <br />
          실제로 작동하는 자동화로.
        </h1>
        <p
          className="fade-up mt-6 max-w-xl text-base leading-relaxed text-ivory/65 md:text-lg"
          style={{ animationDelay: "0.15s" }}
        >
          Python과 AI로 재무·데이터·반복 업무를 분석하고, 다시 실행할 수 있는
          도구와 시스템으로 만듭니다.
        </p>

        <div
          className="fade-up mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "0.25s" }}
        >
          <a
            href="#products"
            className="rounded-lg bg-ivory px-4 py-2 text-sm font-medium text-carbon transition-colors hover:bg-white"
          >
            제품 보기
          </a>
          <a
            href="https://github.com/eddmpython"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-ivory transition-colors hover:bg-white/5"
          >
            GitHub
          </a>
        </div>

        <div
          className="fade-up mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ivory/50"
          style={{ animationDelay: "0.35s" }}
        >
          <span>Products</span>
          {PRODUCTS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="flex items-center gap-2 transition-colors hover:text-ivory"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
              {p.name}
            </a>
          ))}
        </div>
      </div>

      {/* 실제 제품 화면 뷰어. 아래 이름을 눌러 넘기고 자동 순환한다. */}
      <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-16 md:pb-20">
        <div className="fade-up" style={{ animationDelay: "0.45s" }}>
          <Showcase />
        </div>
      </div>
    </section>
  );
}
