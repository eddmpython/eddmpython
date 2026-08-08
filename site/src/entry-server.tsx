import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { Routes } from "./routes";

/** 빌드 타임에 각 경로를 HTML 로 뽑는다. 브라우저 API 는 여기서 실행되지 않는다. */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <Routes />
      </StaticRouter>
    </StrictMode>,
  );
}

export { allPages } from "./seo";
