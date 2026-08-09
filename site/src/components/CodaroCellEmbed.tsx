import { useState } from "react";
import codaroCells from "../../../blog/embeds/codaro-cells.json";
import { PyCell } from "./PyCell";

type CodaroExample = {
  title: string;
  description: string;
  code: string;
  hint: string;
  fullUrl: string;
};

const examples = codaroCells.examples as Record<string, CodaroExample>;

export function CodaroCellEmbed({ exampleId }: { exampleId: string }) {
  const example = examples[exampleId];
  const [code, setCode] = useState(example?.code ?? "");

  if (!example) return null;

  return (
    <aside
      aria-label={`Codaro 실습 셀: ${example.title}`}
      className="my-8 overflow-hidden rounded-2xl border border-codaro/25 bg-white/[0.025]"
    >
      <header className="border-b border-white/10 px-4 py-4 md:px-5">
        <p className="font-mono text-[11px] tracking-[0.14em] text-codaro uppercase">
          Codaro 실습 셀
        </p>
        <h3 className="mt-2 text-base font-medium text-ivory md:text-lg">
          {example.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ivory/58">
          {example.description}
        </p>
      </header>
      <div className="p-3 md:p-4">
        <PyCell
          code={code}
          onCodeChange={setCode}
          hint={example.hint}
          minRows={10}
        />
      </div>
      <footer className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-ivory/48 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <span>이 셀은 입문 예제 실행용이며 강검증과 진도 저장은 전체 Web Run에서 이어집니다</span>
        <a
          href={example.fullUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-ivory underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/60"
        >
          전체 화면 열기
        </a>
      </footer>
    </aside>
  );
}
