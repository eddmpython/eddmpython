import { useState } from "react";
/**
 * 실습 칸도 글 폴더가 소유한다.
 *
 * 글 폴더의 `cells.json` 을 전부 모아 읽는다. 예전에는 `blog/embeds/codaro-cells.json` 하나에
 * 몰려 있어서 어느 글의 칸인지 파일만 봐서는 알 수 없었다. 이름이 글 사이에서 겹치지 않는지는
 * `check:blog` 가 본다.
 */
const cellFiles = import.meta.glob("../../../blog/posts/*/cells.json", { eager: true }) as Record<
  string,
  { examples?: Record<string, CodaroExample> }
>;
import { PyCell } from "./PyCell";

type CodaroExample = {
  title: string;
  description: string;
  code: string;
  hint: string;
  fullUrl: string;
  /**
   * 이 셀이 micropip 으로 받아야 하는 PyPI 패키지.
   *
   * 없으면 파이썬 표준 라이브러리만 쓰는 셀이다. 한때 이 필드가 없어서 외부 패키지를 쓰는 글은
   * 실행 칸을 붙일 수 없었고, 코드 블록만 보여 주고 독자는 직접 설치해야 했다.
   */
  packages?: string[];
};

const examples: Record<string, CodaroExample> = Object.assign(
  {},
  ...Object.values(cellFiles).map((mod) => mod.examples ?? {}),
);

export function CodaroCellEmbed({ exampleId }: { exampleId: string }) {
  const example = examples[exampleId];
  const [code, setCode] = useState(example?.code ?? "");

  /*
   * 등록 안 된 셀을 조용히 지우지 않는다.
   *
   * `check:blog` 가 발행 전에 막지만 그것은 첫 번째 층이고, 여기서 null 을 돌려주면
   * 어쩌다 통과한 경우에 화면에서 흔적 없이 사라진다. 2026-08-21 에 강의장에서
   * 정확히 그 일이 났다. 실습 여덟 곳이 죽었는데 아무도 몰랐던 까닭이 조용해서였다.
   */
  if (!example) {
    return (
      <aside className="my-8 rounded-2xl border border-[#e0908a]/40 bg-white/[0.025] px-4 py-4 text-sm text-[#e0908a]">
        실행 칸을 찾지 못했습니다
        <span className="mt-1 block font-mono text-xs text-ivory/45">{exampleId}</span>
      </aside>
    );
  }

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
          packages={example.packages ?? []}
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
