import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { scrollToHashTarget } from "./hashNavigation";
import { Routes } from "./routes";

/** 라우트가 바뀌면 맨 위로. 해시가 있으면 그 요소로. */
function ScrollBehavior() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() => scrollToHashTarget(hash));
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollBehavior />
      <Routes />
    </BrowserRouter>
  );
}
