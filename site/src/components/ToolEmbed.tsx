import { Suspense } from "react";
import { TOOLS, TOOL_META } from "../tools";

/**
 * 본문의 도구 마커 한 줄을 실제 도구로 바꾼다.
 *
 * 등록 안 된 id 를 조용히 지우지 않는다. `check:blog` 가 발행 전에 막지만 그것은 첫 번째
 * 층이고, 여기서 null 을 돌려주면 어쩌다 통과한 경우에 화면에서 흔적 없이 사라진다.
 * 코다로 실습 셀이 2026-08-21 에 정확히 그렇게 조용히 죽었다. 그래서 오류를 드러낸다.
 */
export function ToolEmbed({ toolId }: { toolId: string }) {
  const Tool = TOOLS[toolId];
  const meta = TOOL_META[toolId];
  if (!Tool) {
    return (
      <aside className="my-8 rounded-2xl border border-[#e0908a]/40 bg-white/[0.025] px-4 py-4 text-sm text-[#e0908a]">
        도구를 찾지 못했습니다
        <span className="mt-1 block font-mono text-xs text-ivory/45">{toolId}</span>
      </aside>
    );
  }
  return (
    <Suspense
      fallback={
        <div
          aria-label={meta ? `${meta.title} 불러오는 중` : "도구 불러오는 중"}
          className="my-8 flex h-48 items-center justify-center rounded-2xl border border-white/11 bg-white/[0.02] font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase"
        >
          도구 불러오는 중
        </div>
      }
    >
      <Tool />
    </Suspense>
  );
}
