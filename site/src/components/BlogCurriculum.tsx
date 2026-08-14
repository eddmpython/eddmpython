import curriculum from "../../../blog/curriculum.json";

type CurriculumModule = {
  order: number;
  id: string;
  title: string;
  outcome: string;
};

type DeliveryProfile = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  durationMinutes: number;
  stageIds: string[];
};

type CurriculumStage = {
  order: number;
  moduleId: string;
  id: string;
  title: string;
  question: string;
  lessonType: string;
  studyMinutes: number;
  artifact: string;
  postSlug?: string;
  status: "published" | "planned";
};

const modules = curriculum.modules as CurriculumModule[];
const profiles = curriculum.deliveryProfiles as DeliveryProfile[];
const stages = curriculum.stages as CurriculumStage[];
const publishedCount = stages.filter((stage) => stage.status === "published").length;

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}시간` : `${Math.floor(hours)}시간 ${minutes % 60}분`;
}

export function BlogCurriculum() {
  return (
    <section aria-labelledby="curriculum-title" className="mt-14">
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-7">
        <p className="font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase">
          Learning path
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="curriculum-title" className="text-xl font-medium tracking-tight md:text-2xl">
              {curriculum.title}
            </h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ivory/55">
              {curriculum.promise}
            </p>
          </div>
          <p className="shrink-0 font-mono text-[11px] text-ivory/42">
            공개 {publishedCount} / 전체 {stages.length}
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-black/10 p-4">
            <p className="text-[11px] tracking-wide text-ivory/35">누가 배우나요</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ivory/62">{curriculum.audience}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/10 p-4">
            <p className="text-[11px] tracking-wide text-ivory/35">무엇을 남기나요</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ivory/62">
              {curriculum.completionOutcome}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profiles.map((profile) => (
            <article
              key={profile.id}
              data-curriculum-profile={profile.id}
              className="rounded-xl border border-white/8 p-4"
            >
              <p className="font-mono text-[10px] text-ivory/35">
                {durationLabel(profile.durationMinutes)} · {profile.stageIds.length}개 차시
              </p>
              <h3 className="mt-2 text-[14px] font-medium text-ivory/78">{profile.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-ivory/42">
                {profile.description}
              </p>
              <p className="mt-3 border-t border-white/8 pt-3 text-[11px] leading-relaxed text-ivory/52">
                완료: {profile.outcome}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 space-y-9">
          {modules.map((module) => {
            const moduleStages = stages.filter((stage) => stage.moduleId === module.id);
            return (
              <section key={module.id} data-curriculum-module={module.id}>
                <div className="border-b border-white/10 pb-3">
                  <p className="font-mono text-[10px] text-ivory/30">
                    MODULE {String(module.order).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-[17px] font-medium text-ivory/82">{module.title}</h3>
                  <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ivory/45">
                    {module.outcome}
                  </p>
                </div>

                <ol className="grid gap-x-8 md:grid-cols-2">
                  {moduleStages.map((stage) => {
                    const content = (
                      <>
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[11px] text-ivory/32">
                            {String(stage.order).padStart(2, "0")}
                          </span>
                          <span className="font-mono text-[10px] text-ivory/28">
                            {stage.studyMinutes}분
                          </span>
                        </span>
                        <span className="mt-1 block text-[15px] font-medium text-ivory/82">
                          {stage.title}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-ivory/42">
                          {stage.question}
                        </span>
                        <span className="mt-2 block text-[11px] leading-relaxed text-ivory/30">
                          결과물: {stage.artifact}
                        </span>
                      </>
                    );

                    return (
                      <li key={stage.id} className="border-b border-white/8 py-4">
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
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
