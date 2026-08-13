import { useReveal } from "../useReveal";
import { SOCIAL } from "../social";

const STATS = [
  { value: "339 GB", label: "공개 데이터 전체 규모" },
  { value: "약 2,700사", label: "한국 상장사" },
  { value: "약 1,000사", label: "미국 주요 상장사" },
  { value: "매일", label: "증분 업데이트" },
] as const;

export function DartLabData() {
  const ref = useReveal<HTMLElement>();

  return (
    <section id="data" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
        <article
          ref={ref}
          aria-labelledby="dartlab-data-title"
          className="reveal overflow-hidden rounded-3xl border border-dartlab/25 bg-ink"
        >
          <div className="grid md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-7 sm:p-10 md:p-12">
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-dartlab uppercase">
                <span className="h-2 w-2 rounded-full bg-dartlab" />
                DartLab Data
              </div>
              <h2
                id="dartlab-data-title"
                className="mt-5 max-w-xl text-3xl leading-tight font-medium tracking-tight md:text-4xl"
              >
                분석의 바탕이 되는
                <br />
                339 GB 공시 데이터
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ivory/65 md:text-base">
                한국 DART와 미국 SEC EDGAR 공시를 Parquet으로 구조화해
                공개합니다. 재무제표, 사업보고서 본문, 구조화 공시, 시세와
                거시지표를 한 저장소에서 받고 매일 새 데이터로 이어갑니다.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={SOCIAL.dartlabData}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ivory px-4 py-2.5 text-sm font-medium text-carbon transition-colors hover:bg-white"
                >
                  Hugging Face 데이터셋 열기
                  <span aria-hidden="true">↗</span>
                </a>
                <span className="text-xs text-ivory/45">CC BY 4.0</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 border-t border-white/10 md:border-t-0 md:border-l">
              {STATS.map((stat) => (
                <div
                  key={stat.value}
                  className="border-white/10 p-6 odd:border-r [&:nth-child(-n+2)]:border-b md:p-7"
                >
                  <dt className="text-xs leading-relaxed text-ivory/45">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 text-xl font-medium tracking-tight text-ivory md:text-2xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      </div>
    </section>
  );
}
