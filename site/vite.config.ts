import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 빌드 산출물은 저장소 밖에 둔다 (CLAUDE.md 작업 산출물 규칙).
// site/ 기준 두 단계 위는 sideProject/ 이므로 저장소 형제 폴더에 떨어진다.
const OUT_DIR = "../../eddmpython.out/site-dist";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
});
