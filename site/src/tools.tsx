import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import toolCatalog from "../../blog/embeds/tools.json";

/**
 * 글이 품는 도구의 레지스트리.
 *
 * 블로그 자체가 도구를 품은 글이다. 본문에 `https://eddmpython.com/tool/<id>` 한 줄을 두면
 * Markdown 렌더러가 그 자리를 아래 컴포넌트로 바꾼다. 코다로 실습 셀과 같은 방식이다.
 *
 * 유효한 id 의 정본은 blog/embeds/tools.json 이고 `check:blog` 가 본문 마커를 그 목록에
 * 대조한다. 여기에는 각 id 를 실제 컴포넌트에 잇는 매핑을 둔다. 무거운 도구를 첫 화면
 * 번들에 굽지 않도록 lazy 로 나눈다. id 가 목록에 있는데 아래 매핑이 없으면 ToolEmbed 가
 * 화면에 오류를 드러낸다. 조용히 사라지지 않는다.
 */
export type ToolMeta = { title: string; summary: string };

export const TOOL_META = (toolCatalog as { tools: Record<string, ToolMeta> }).tools;

export const TOOLS: Record<string, LazyExoticComponent<ComponentType>> = {
  qr: lazy(() => import("./components/QrTool").then((m) => ({ default: m.QrTool }))),
};
