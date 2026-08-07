import { useReveal } from "../useReveal";

export function SectionHead({
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="reveal">
      <h2
        id={id}
        className="text-2xl font-medium tracking-tight md:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ivory/60 md:text-base">
        {description}
      </p>
    </div>
  );
}
