import { PRODUCTS } from "../products";

const TERMINAL_LINES: Array<{ prompt: string; text: string }> = [
  { prompt: "$", text: "pip install dartlab" },
  { prompt: "$", text: "python" },
  { prompt: ">>>", text: "import dartlab as dl" },
  { prompt: ">>>", text: 'samsung = dl.Company("005930")' },
  { prompt: ">>>", text: "samsung.story()" },
];

export function Hero() {
  return (
    <section className="hero-glow">
      <div className="mx-auto w-full max-w-5xl px-6 pt-24 pb-20 md:pt-32">
        <h1
          className="fade-up max-w-3xl text-4xl leading-[1.15] font-semibold tracking-tight md:text-6xl"
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

        <div
          className="fade-up mt-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-3 font-mono text-xs text-ivory/40">terminal</span>
          </div>
          <div className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-7 md:text-sm">
            {TERMINAL_LINES.map((line, i) => (
              <div key={i} className="whitespace-pre">
                <span className="select-none text-sand/70">{line.prompt} </span>
                <span className="text-ivory/90">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
