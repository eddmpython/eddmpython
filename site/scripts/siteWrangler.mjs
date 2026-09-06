import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { executionRoot } from "./executionWorkspace.mjs";

const root = executionRoot();
const [command, ...args] = process.argv.slice(2);
if (!["dev", "deploy", "types"].includes(command)) throw new Error("dev, deploy, types 중 하나를 지정하세요");
if (args.some(arg => /^(--assets|--persist-to|--outdir)(=|$)/.test(arg))) {
  throw new Error("산출물 경로는 EDDMPYTHON_RUN_DIR에서만 정합니다");
}
const temp = join(root, "tmp");
mkdirSync(temp, { recursive: true });
const outputArgs = command === "dev"
  ? ["--assets", join(root, "site-dist"), "--persist-to", join(root, "wrangler-state")]
  : command === "deploy" ? ["--assets", join(root, "site-dist"), "--outdir", join(root, "wrangler-bundle")] : [];
const child = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)), command, ...outputArgs, ...args], {
  stdio: "inherit",
  env: { ...process.env, TMP: temp, TEMP: temp, TMPDIR: temp, WRANGLER_LOG_PATH: join(root, "wrangler-logs") },
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
