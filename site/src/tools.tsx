import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * 글이 품는 도구의 등록부.
 *
 * **등록 파일이 없다.** 글 폴더 안에 `tool/index.tsx` 를 두면 그것이 등록이다. 이름은 그
 * 폴더 이름에서 발행 순번을 뗀 것이라 따로 적을 곳이 없고, 적는 곳이 없으니 어긋날 곳도 없다.
 *
 * ```
 * blog/posts/003-python-qr/tool/index.tsx  ->  https://eddmpython.com/tool/python-qr
 * ```
 *
 * 2026-08-24 전에는 `blog/embeds/tools.json` 이 id 와 제목을 들고 있고 이 파일이 id 를 다시
 * 컴포넌트에 이어 붙였다. 같은 사실이 세 곳에 있었고 도구 소스는 또 다른 곳에 있었다.
 *
 * 도구는 첫 화면 번들에 굽지 않는다. 글을 열 때만 내려받게 lazy 로 나눈다.
 */
const modules = import.meta.glob("../../blog/posts/*/tool/index.tsx") as Record<
  string,
  () => Promise<{ default: ComponentType }>
>;

/** 폴더 이름에서 발행 순번을 뗀 것이 도구 이름이다. posts.ts 의 toolIdOf 와 같은 규칙이다. */
function toolIdFromPath(path: string): string {
  const segments = path.split("/");
  const folder = segments[segments.length - 3] ?? "";
  return folder.replace(/^\d{3}-/, "");
}

export const TOOLS: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [toolIdFromPath(path), lazy(load)]),
);
