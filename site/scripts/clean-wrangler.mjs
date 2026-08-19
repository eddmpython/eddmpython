/**
 * wrangler 가 저장소 안에 만든 site/.wrangler 를 지운다.
 *
 * `--persist-to` 는 스토리지만 옮긴다. 번들과 임시 파일은 여전히 설정 파일 옆에 생기고
 * wrangler 는 그 경로를 바꾸는 방법을 주지 않는다. 이 저장소는 임시 디렉터리를 안에 두지
 * 않으므로 명령이 끝난 자리에서 지운다. `.gitignore` 에 있다는 것은 면제 사유가 아니다.
 */
import { rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), ".wrangler");

try {
  await stat(DIR);
} catch {
  process.exit(0);
}

try {
  await rm(DIR, { recursive: true, force: true });
  console.log("  site/.wrangler 를 지웠습니다");
} catch (err) {
  // 아직 돌고 있는 wrangler 가 파일을 잡고 있으면 지워지지 않는다. 그것은 실패가 아니다.
  console.log(`  site/.wrangler 를 아직 못 지웁니다 (${err.code ?? err.message})`);
}
