import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root")!;
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

// 빌드가 HTML 을 미리 넣어 두면 붙이고, 비어 있으면 새로 그린다.
if (root.firstChild) hydrateRoot(root, tree);
else createRoot(root).render(tree);
