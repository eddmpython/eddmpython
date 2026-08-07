import { Showcase } from "./Showcase";
import { Nav } from "./Nav";

export function Hero() {
  return (
    <section className="relative">
      {/* nav 는 별도 헤더 바가 아니라 히어로 컨테이너 안에 들어간다 (paseo 구조). */}
      <div className="relative mx-auto w-full max-w-7xl px-6 pt-10 pb-10 md:px-32 md:pt-20 md:pb-12">
        <Nav />

        <h1
          className="fade-up text-[2rem] leading-tight font-medium tracking-tight sm:text-4xl md:text-5xl"
          style={{ animationDelay: "0.05s" }}
        >
          복잡한 업무를,
          <br />
          실제로 작동하는 자동화로.
        </h1>
        <p
          className="fade-up mt-6 max-w-lg text-base leading-relaxed text-ivory/70 sm:text-lg"
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
            className="rounded-lg bg-ivory px-4 py-2.5 text-sm font-medium text-carbon transition-colors hover:bg-white"
          >
            제품 보기
          </a>
          <a
            href="https://github.com/eddmpython"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-ivory transition-colors hover:bg-white/5"
          >
            GitHub
          </a>
        </div>

        <div
          className="fade-up mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ivory/50"
          style={{ animationDelay: "0.35s" }}
        >
          <span>다루는 것</span>
          <span>DART · SEC EDGAR</span>
          <span>Excel · Google Sheets</span>
          <span>브라우저 Python</span>
        </div>
      </div>

      {/* 실제 제품 화면 뷰어. 아래 이름을 눌러 넘기고 자동 순환한다. */}
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 md:px-8 md:pb-20">
        <div className="fade-up" style={{ animationDelay: "0.45s" }}>
          <Showcase />
        </div>
      </div>
    </section>
  );
}
