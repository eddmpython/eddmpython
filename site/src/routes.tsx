import { Route, Routes as RouterRoutes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Blog } from "./pages/Blog";
import { Post } from "./pages/Post";
import { NotFound } from "./pages/NotFound";

/** 서버 렌더와 클라이언트가 같은 라우트 표를 쓴다. */
export function Routes() {
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-ivory focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-carbon"
      >
        본문으로 건너뛰기
      </a>
      <RouterRoutes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<Post />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
    </>
  );
}
