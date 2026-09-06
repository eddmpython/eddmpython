/** 본문의 flow 블록을 읽는 순서가 보이는 도식으로 렌더한다. */
export function ArticleFlow({ text }: { text: string }) {
  const steps = text.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf(" | ");
    return separator < 0
      ? { label: line, detail: "" }
      : { label: line.slice(0, separator), detail: line.slice(separator + 3) };
  });

  return (
    <figure data-article-visual="flow" className="my-7 rounded-xl border border-[var(--eddm-line-base)] bg-[var(--eddm-raise)] p-5 md:p-6">
      <ol className="flex flex-col gap-3 md:flex-row md:items-stretch">
        {steps.map((step, index) => (
          <li key={index} className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row">
            {index > 0 && <span aria-hidden="true" className="self-center text-lg text-accent"><span className="md:hidden">↓</span><span className="hidden md:inline">→</span></span>}
            <div className="min-w-0 flex-1 rounded-lg border border-[var(--eddm-line)] bg-[var(--eddm-canvas)] px-4 py-4">
              <span className="mb-3 block font-mono text-[11px] text-accent">{String(index + 1).padStart(2, "0")}</span>
              <strong className="block break-words text-base font-medium leading-relaxed text-ivory">{step.label}</strong>
              {step.detail && <span className="mt-2 block break-words text-sm leading-relaxed text-ivory/60">{step.detail}</span>}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
