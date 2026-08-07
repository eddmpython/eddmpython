import { useState } from "react";
import { SectionHead } from "./SectionHead";
import { useReveal } from "../useReveal";
import { PyCell } from "./PyCell";

/* 전부 브라우저에서 실제로 도는 코드다. 실행 결과를 확인하고 넣었다. */
const PRESETS = [
  {
    key: "company",
    label: "기업 열기",
    code: `import dartlab

c = dartlab.Company("005930")
c`,
  },
  {
    key: "panel",
    label: "재무제표",
    code: `import dartlab

c = dartlab.Company("005930")
c.panel("IS")`,
  },
  {
    key: "ratios",
    label: "비율",
    code: `import dartlab

c = dartlab.Company("005930")
c.panel("ratios")`,
  },
  {
    key: "story",
    label: "전체 이야기",
    code: `import dartlab

c = dartlab.Company("005930")
c.story()`,
  },
];

export function CodeSection() {
  const [tab, setTab] = useState(0);
  const [code, setCode] = useState(PRESETS[0].code);
  const ref = useReveal<HTMLDivElement>();

  return (
    <section id="code" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
        <SectionHead
          title="여기서 바로 돌려 보세요"
          description="아래 셀은 그림이 아닙니다. pyproc 머신이 브라우저 안에 뜨고, DartLab 을 설치하고, 실제 공시 데이터를 가져옵니다. 종목코드를 바꿔도 됩니다."
        />

        <div ref={ref} className="reveal mt-10">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={i === tab}
                aria-controls="dartlab-cell"
                onClick={() => {
                  setTab(i);
                  setCode(p.code);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  i === tab
                    ? "border-white/25 bg-white/10 text-ivory"
                    : "border-white/10 text-ivory/55 hover:border-white/20 hover:text-ivory"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-5" id="dartlab-cell">
            <PyCell
              code={code}
              onCodeChange={setCode}
              packages={["dartlab"]}
              minRows={5}
              hint="첫 실행은 런타임과 패키지를 받느라 30초쯤 걸립니다. Chromium 계열 필요."
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <code className="rounded-lg border border-white/10 bg-carbon px-3.5 py-2 font-mono text-[13px] text-ivory/80">
              <span className="select-none text-sand/70">$ </span>pip install
              dartlab
            </code>
            <a
              href="https://eddmpython.github.io/dartlab/"
              target="_blank"
              rel="noreferrer"
              className="text-ivory/70 transition-colors hover:text-ivory"
            >
              전체 문서 보기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
