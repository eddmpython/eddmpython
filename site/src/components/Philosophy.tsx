export function Philosophy() {
  return (
    <section id="philosophy" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <figure className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-14 text-center md:py-16">
          <blockquote className="mx-auto max-w-2xl text-2xl leading-snug font-semibold tracking-tight md:text-3xl">
            AI는 판단하고,
            <br className="md:hidden" /> 자동화는 반복합니다.
          </blockquote>
          <figcaption className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ivory/60">
            반복 작업은 안정적인 코드와 흐름으로 처리하고, 예외와 판단이 필요한
            순간에만 AI를 사용합니다.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
