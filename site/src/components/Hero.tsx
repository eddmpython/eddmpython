import { useCallback, useState } from "react";
import { Showcase } from "./Showcase";
import { Nav } from "./Nav";
import { ProductRail } from "./ProductRail";
import { SLIDES, firstSlideIndex } from "../slides";
import type { ProductKey } from "../productMarks";

export function Hero() {
  const [active, setActive] = useState(0);
  const rotate = useCallback(() => {
    setActive((index) => (index + 1) % SLIDES.length);
  }, []);
  const selectProduct = useCallback((key: ProductKey) => {
    setActive(firstSlideIndex(key));
  }, []);

  const activeProduct = SLIDES[active]?.productKey ?? "dartlab";

  return (
    <section className="relative bg-carbon">
      {/* 텍스트와 화면이 같은 가로 패딩을 쓴다. 한쪽만 넓게 빠지지 않게. */}
      <div className="relative mx-auto w-full max-w-7xl px-6 pt-10 md:px-12 md:pt-20 lg:px-16">
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

        <div className="fade-up mt-8" style={{ animationDelay: "0.35s" }}>
          <ProductRail active={activeProduct} onSelect={selectProduct} />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 pt-10 pb-16 md:px-12 md:pt-12 md:pb-20 lg:px-16">
        <div className="fade-up" style={{ animationDelay: "0.45s" }}>
          <Showcase
            active={active}
            onActiveChange={setActive}
            onRotate={rotate}
          />
        </div>
      </div>
    </section>
  );
}
