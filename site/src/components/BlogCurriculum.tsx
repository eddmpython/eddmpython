import curriculum from "../../../blog/curriculum.json";

type CurriculumStage = {
  order: number;
  id: string;
  title: string;
  question: string;
  postSlug?: string;
  status: "published" | "planned";
};

const stages = curriculum.stages as CurriculumStage[];

export function BlogCurriculum() {
  return (
    <section aria-labelledby="curriculum-title" className="mt-14">
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-7">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase">
          Learning path
        </p>
        <h2 id="curriculum-title" className="mt-3 text-xl font-medium tracking-tight md:text-2xl">
          {curriculum.title}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ivory/55">
          {curriculum.promise}
        </p>

        <ol className="mt-7 grid gap-x-8 md:grid-cols-2">
          {stages.map((stage) => {
            const content = (
              <>
                <span className="font-mono text-[11px] text-ivory/32">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <span className="mt-1 block text-[15px] font-medium text-ivory/82">
                  {stage.title}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-ivory/42">
                  {stage.question}
                </span>
              </>
            );

            return (
              <li key={stage.id} className="border-t border-white/8 py-4">
                {stage.status === "published" && stage.postSlug ? (
                  <a
                    href={`/blog/${stage.postSlug}`}
                    className="group block transition-colors hover:text-white"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="opacity-55">
                    {content}
                    <span className="mt-2 inline-block rounded-full border border-white/10 px-2 py-0.5 text-[10px] tracking-wide text-ivory/40">
                      준비 중
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
