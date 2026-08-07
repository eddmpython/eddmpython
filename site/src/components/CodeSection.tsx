import { useState } from "react";
import { SectionHead } from "./SectionHead";
import { useReveal } from "../useReveal";

type Line = Array<{ t: string; c?: string }>;
type Tab = { key: string; label: string; lines: Line[] };

const K = "text-[#c78ee0]"; // keyword
const S = "text-[#9ecf8a]"; // string
const C = "text-ivory/35"; // comment
const F = "text-[#d8be91]"; // callable

/* dartlab 공개 계약만 쓴다. 존재하지 않는 API 를 지어내지 않는다. */
const TABS: Tab[] = [
  {
    key: "company",
    label: "기업 하나 읽기",
    lines: [
      [{ t: "import ", c: K }, { t: "dartlab" }],
      [],
      [{ t: "c = dartlab." }, { t: "Company", c: F }, { t: "(" }, { t: '"005930"', c: S }, { t: ")" }],
      [{ t: "c." }, { t: "story", c: F }, { t: "()" }, { t: "        # 기업 전체 이야기", c: C }],
      [{ t: "c.panel" }, { t: "            # 재무 시계열 격자", c: C }],
      [{ t: "c.select" }, { t: "           # 원하는 항목만", c: C }],
    ],
  },
  {
    key: "search",
    label: "공시 본문 찾기",
    lines: [
      [{ t: "import ", c: K }, { t: "dartlab" }],
      [],
      [{ t: "dartlab." }, { t: "search", c: F }, { t: "(" }, { t: '"무상증자"', c: S }, { t: ")" }],
      [{ t: "# 공시 본문을 횡단 검색한다", c: C }],
    ],
  },
  {
    key: "edgar",
    label: "미국 기업 대칭",
    lines: [
      [{ t: "import ", c: K }, { t: "dartlab" }],
      [],
      [{ t: "# 한국 DART 와 미국 SEC EDGAR 를 같은 문법으로", c: C }],
      [{ t: "kr = dartlab." }, { t: "Company", c: F }, { t: "(" }, { t: '"005930"', c: S }, { t: ")" }],
      [{ t: "us = dartlab." }, { t: "Company", c: F }, { t: "(" }, { t: '"AAPL"', c: S }, { t: ")" }],
    ],
  },
];

export function CodeSection() {
  const [tab, setTab] = useState(0);
  const ref = useReveal<HTMLDivElement>();
  const lines = TABS[tab].lines;

  return (
    <section id="code" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-20 md:py-24">
        <SectionHead
          title="한 줄로 부른다"
          description="DartLab 은 공시 데이터를 계층이 아니라 하나의 인터페이스로 노출합니다. 종목코드만 있으면 재무, 비율, 신용위험, 산업 위치까지 같은 문법으로 이어집니다."
        />

        <div ref={ref} className="reveal mt-10">
          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map((t, i) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={i === tab}
                onClick={() => setTab(i)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  i === tab
                    ? "border-white/25 bg-white/10 text-ivory"
                    : "border-white/10 text-ivory/55 hover:border-white/20 hover:text-ivory"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] px-5 py-5 md:px-6">
            <pre className="min-h-[9.5rem] font-mono text-[13px] leading-7 md:text-sm">
              {lines.map((line, i) => (
                <div key={i}>
                  {line.length === 0 ? (
                    <>&nbsp;</>
                  ) : (
                    line.map((seg, j) => (
                      <span key={j} className={seg.c ?? "text-ivory/90"}>
                        {seg.t}
                      </span>
                    ))
                  )}
                </div>
              ))}
            </pre>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <code className="rounded-lg border border-white/10 bg-carbon px-3.5 py-2 font-mono text-[13px] text-ivory/80">
              <span className="select-none text-sand/70">$ </span>pip install dartlab
            </code>
            <a
              href="https://eddmpython.github.io/dartlab/"
              target="_blank"
              rel="noreferrer"
              className="text-ivory/70 transition-colors hover:text-ivory"
            >
              전체 문서 보기 →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
