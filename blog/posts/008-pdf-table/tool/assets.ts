import { createReadStream, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "../../../../site/node_modules/vite/dist/node/index.d.ts";
import { runtimeBase } from "./runtimePaths";
import { unpackFont } from "./sampleFont";

const require = createRequire(new URL("../../../../site/package.json", import.meta.url));

export function pdfAssets(): Plugin {
  const entries = new Map<string, string>();
  const pdfRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  for (const dir of ["cmaps", "standard_fonts", "wasm"]) {
    for (const name of readdirSync(join(pdfRoot, dir))) entries.set(`pdf/${dir}/${name}`, join(pdfRoot, dir, name));
  }
  const coreRoot = dirname(require.resolve("tesseract.js-core/package.json"));
  for (const name of readdirSync(coreRoot).filter(name => /\.wasm(?:\.js)?$/.test(name))) entries.set(`ocr/${name}`, join(coreRoot, name));
  entries.set("ocr/worker.min.js", require.resolve("tesseract.js/dist/worker.min.js"));
  for (const lang of ["kor", "eng"]) entries.set(`ocr/${lang}.traineddata.gz`, join(dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`)), "4.0.0_best_int", `${lang}.traineddata.gz`));
  const fontRoot = dirname(require.resolve("@fontsource/nanum-gothic/package.json"));
  entries.set("licenses/nanum-gothic.txt", join(fontRoot, "LICENSE"));
  entries.set("licenses/pdfjs.txt", join(pdfRoot, "LICENSE"));
  // tessdata의 언어 데이터도 Apache-2.0이며 패키지 메타데이터의 MIT와 구분한다.
  // https://github.com/naptha/tessdata/blob/gh-pages/LICENSE
  entries.set("licenses/tessdata.txt", join(pdfRoot, "LICENSE"));
  entries.set("licenses/pdf-lib.txt", join(dirname(require.resolve("pdf-lib/package.json")), "LICENSE.md"));
  const fontkitRoot = dirname(require.resolve("@pdf-lib/fontkit/package.json"));
  entries.set("licenses/fontkit-package.json", join(fontkitRoot, "package.json"));
  entries.set("licenses/fontkit-readme.txt", join(fontkitRoot, "README.md"));
  entries.set("licenses/tesseract-core.txt", join(coreRoot, "LICENSE"));
  entries.set("licenses/tesseract-js.txt", join(dirname(require.resolve("tesseract.js/package.json")), "LICENSE.md"));
  const sampleFont = unpackFont(readFileSync(join(fontRoot, "files", "nanum-gothic-korean-400-normal.woff")));
  const mime = (name: string) => name.endsWith(".js") ? "text/javascript" : name.endsWith(".wasm") ? "application/wasm" : "application/octet-stream";
  return {
    name: "pdf-table-local-runtime",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith(runtimeBase)) return next();
        const key = url.slice(runtimeBase.length), file = entries.get(key);
        if (key === "sample.ttf") { res.setHeader("Content-Type", "font/ttf"); res.end(sampleFont); return; }
        if (!file) return next();
        res.setHeader("Content-Type", mime(key));
        createReadStream(file).on("error", () => { res.statusCode = 500; res.end(); }).pipe(res);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: `${runtimeBase.slice(1)}sample.ttf`, source: sampleFont });
      for (const [name, file] of entries) this.emitFile({ type: "asset", fileName: `${runtimeBase.slice(1)}${name}`, source: readFileSync(file) });
    },
  };
}
