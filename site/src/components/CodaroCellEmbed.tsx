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
      <aside className="my-8 rounded-2xl border border-[var(--eddm-danger-line)] bg-[var(--eddm-raise)] px-4 py-4 text-sm text-[var(--eddm-danger)]">
        실행 칸을 찾지 못했습니다
        <span className="mt-1 block font-mono text-xs text-ivory/45">{exampleId}</span>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`실습 셀: ${example.title}`}
      className="my-10 min-w-0"
    >
        <PyCell
          key={exampleId}
          code={code}
          onCodeChange={setCode}
          title={example.title}
          description={example.description}
          packages={example.packages ?? []}
          hint={example.hint}
          minRows={2}
        />
      <footer className="flex flex-wrap items-baseline justify-between gap-2 text-xs leading-relaxed text-ivory/48">
        <span>설치 없이 이 브라우저에서 실행합니다. 수정한 코드는 새로고침하면 초기화됩니다.</span>
        <a
          href={example.fullUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-ivory underline decoration-[var(--eddm-accent-line)] underline-offset-4 transition-colors hover:decoration-[var(--eddm-accent)]"
        >
          전체 화면 열기
        </a>
      </footer>
    </aside>
  );
}
