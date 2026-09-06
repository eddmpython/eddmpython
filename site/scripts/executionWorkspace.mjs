import { existsSync, lstatSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** 한 작업에서 만든 공통 실행 공간만 받는다. 경로를 추측하거나 생성하지 않는다. */
export function executionRoot(value = process.env.EDDMPYTHON_RUN_DIR) {
  const shared = process.platform === "win32"
    ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "dev-workspace")
    : join(homedir(), ".local", "share", "dev-workspace");
  if (!value || !isAbsolute(value)) {
    throw new Error("EDDMPYTHON_RUN_DIR에 dev-workspace 아래 새 작업 폴더의 절대 경로를 지정하세요 (operation.workspace)");
  }
  const root = resolve(value);
  const child = relative(resolve(shared), root);
  if (!child || child.startsWith("..") || child.includes(sep) || isAbsolute(child)
      || !/-[a-z0-9]{6,}$/i.test(child) || child.toLowerCase().endsWith(".out")) {
    throw new Error("실행 공간은 dev-workspace 바로 아래 고유 접미사가 붙은 작업 폴더여야 합니다");
  }
  if (!existsSync(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()
      || realpathSync(root).toLowerCase() !== root.toLowerCase()
      || lstatSync(dirname(root)).isSymbolicLink()) {
    throw new Error("실행 공간은 미리 만든 실제 디렉터리여야 합니다. 링크는 허용하지 않습니다");
  }
  return root;
}
