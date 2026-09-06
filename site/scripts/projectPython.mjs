import { spawn } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const environment = resolve(repo, ".venv");
const python = join(environment, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
if (!existsSync(python) || lstatSync(environment).isSymbolicLink()
    || realpathSync(environment).toLowerCase() !== environment.toLowerCase()) {
  throw new Error("저장소 루트에 uv venv .venv로 Python 환경을 준비하세요");
}
const child = spawn(python, ["-B", "-X", "utf8", ...process.argv.slice(2)], { stdio: "inherit" });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
