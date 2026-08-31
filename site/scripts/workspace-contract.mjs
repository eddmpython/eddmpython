import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * 저장소 밖 산출물 폴더에 무엇이 있어도 되는지의 정본이다.
 *
 * 2026-08-26 에 이 폴더가 9.2GB, 최상위 67개, 파일 20,554개까지 자랐다. 그 안에는 3GB
 * 중첩 사본과 비공개 교안 저장소의 통째 클론이 있었고, 회색 원본 7개는 여기에만 있었다.
 * 아무 검사기도 이 폴더를 본 적이 없었기 때문이다.
 *
 * 여기 없는 것이 생기면 `check:workspace` 가 막는다. 새로 만든 산출물을 통과시키려면
 * 이 목록에 줄을 더해야 하고, 그때 `rebuild` 를 반드시 적어야 한다.
 *
 * **`rebuild` 를 못 적겠다면 그것이 신호다.** 다시 만드는 법이 없는 것을 검사받지 않는
 * 폴더에 두고 있다는 뜻이다. 그러면 여기 등록할 게 아니라 발행 대상으로 만들어야 한다.
 * 회색 원본이 정확히 그랬고, 허깅페이스로 올려서 해결했다.
 */

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const REPO = resolve(HERE, "../..");

/*
 * 경로와 이름은 `blog/scripts/media_paths.py` 가 소유한다. 여기에 값을 복사하지 않고 읽는다.
 *
 * 복사하면 한쪽이 바뀔 때 이 검사기가 실패하지 않고 **조용히 아무것도 안 보게 된다.**
 * 원본 접미사가 갈라지면 원본을 하나도 못 찾은 채 초록불을 띄운다. 그것이 가장 나쁜 실패다.
 * 읽어서 못 찾으면 여기서 죽는다.
 */
/**
 * 파이썬 정본에서 `이름 = "값"` 한 줄을 읽는다. 시험이 실제 파일을 안 고치고 부를 수 있게
 * 소스 문자열을 받는다. 파일을 읽는 쪽은 아래 `fromPython` 이다.
 */
export function readAssignment(source, name) {
  const found = [...source.matchAll(new RegExp(`^${name} = "([^"]*)"$`, "gm"))];
  if (found.length === 0) {
    throw new Error(
      `blog/scripts/media_paths.py 에서 ${name} 을 못 읽었습니다. ` +
        "그 파일이 경로와 이름의 정본입니다. 값을 여기에 복사하지 말고 그쪽 모양을 지키세요",
    );
  }
  /*
   * 첫 일치를 읽으면 안 된다. 파이썬은 **마지막** 대입을 쓰므로 줄 하나만 덧붙이면
   * 두 언어가 다른 값을 보게 되고, 그때 검사기는 실패하지 않고 조용히 아무것도 안 본다.
   * 병합 충돌을 양쪽 다 남기고 풀거나 값을 바꾸려고 아래에 새 줄을 덧붙이면 그 모양이 된다.
   * 애매하면 고르지 않고 죽는다.
   */
  if (found.length > 1) {
    throw new Error(
      `blog/scripts/media_paths.py 에 ${name} 대입이 ${found.length}개 있습니다 ` +
        `(${found.map((m) => JSON.stringify(m[1])).join(", ")}). ` +
        "파이썬은 마지막 것을 쓰고 여기는 어느 것인지 정할 수 없습니다. 한 줄만 남기세요",
    );
  }
  return found[0][1];
}

function fromPython(name) {
  return readAssignment(
    readFileSync(resolve(REPO, "blog/scripts/media_paths.py"), "utf-8"),
    name,
  );
}

/** 발행 전 회색 원본의 접미사 */
export const MASTER_SUFFIX = fromPython("MASTER_SUFFIX");

/** 이미지 스테이징 폴더 이름 */
export const STAGING_DIR = fromPython("STAGING_DIR");

/** 저장소 밖 산출물 폴더. `site/vite.config.ts` 와 `site/wrangler.jsonc` 가 같은 곳을 가리킨다 */
export const OUTPUT_ROOT = resolve(REPO, "..", fromPython("OUTPUT_DIR"));

/** 이 폴더 전체가 이보다 커지면 아무도 안 보는 사이에 쌓인 것이다 */
export const TOTAL_BUDGET_MB = 2048;

/**
 * 허용되는 최상위 항목.
 *
 * - `name`  정확한 이름, 또는 `*` 하나를 쓴 글롭
 * - `what`  무엇인가
 * - `rebuild` 잃었을 때 다시 만드는 명령. 없으면 등록하지 않는다
 */
export const ALLOWED = [
  {
    name: "site-dist",
    what: "클라이언트 빌드. wrangler 가 여기서 올린다",
    rebuild: "cd site && npm run build",
  },
  {
    name: "site-ssr",
    what: "프리렌더가 쓰는 SSR 번들",
    rebuild: "cd site && npm run build",
  },
  {
    name: "visual",
    what: "시각 검증 증거와 승인 기록. approval.json 이 없으면 배포가 막힌다",
    rebuild: "cd site && npm run verify:visual 뒤 approve:visual",
  },
  {
    name: STAGING_DIR,
    what: "이미지 발행 스테이징. 발행하면 비워진다",
    rebuild: "blog/scripts/paint_media.py (원본은 허깅페이스에서 받아온다)",
  },
  {
    name: "wrangler-state",
    what: "로컬 wrangler dev 의 KV 와 D1 상태",
    rebuild: "지우고 wrangler dev 를 다시 띄운다",
  },
  {
    name: "admin-shot",
    what: "운영장 레이아웃 스크린샷",
    rebuild: "cd site && npm run admin:shot",
  },
  {
    name: "blog-shot",
    what: "블로그 화면 스크린샷",
    rebuild: "cd site && node scripts/blog-shot.mjs",
  },
  {
    name: "classroom-shots",
    what: "강의장 스크린샷",
    rebuild: "cd site && node scripts/classroom-shot.mjs",
  },
  {
    name: "classroom-audit",
    what: "강의장 점검 산출물",
    rebuild: "cd site && node scripts/classroom-audit.mjs",
  },
  {
    name: "course",
    what: "교안 발행 묶음. 비공개 저장소가 KV 로 올리기 전에 여기 굽는다",
    rebuild: "cd ../eddmpython-course && npm run publish:dry",
  },
  {
    /*
     * 갈아엎기 전 이력이다. 블로그 이전 시대의 다른 앱이고 커밋 251개이며
     * `refs/tags/v1.0-full` 과 `refs/codex/root-rewrite-candidate` 를 담는다.
     * 지금 저장소 이력에 없으므로 이것만은 다시 만들 수 없다. 지우지 않는다.
     */
    name: "legacy-history-*.bundle",
    what: "2026-08-08 갈아엎기 전 이력 번들",
    rebuild: null,
  },
];

/** 이름이 허용 목록의 어느 줄에 해당하나. 없으면 null */
export function allowedFor(name) {
  return (
    ALLOWED.find((entry) => {
      const star = entry.name.indexOf("*");
      if (star < 0) return entry.name === name;
      const head = entry.name.slice(0, star);
      const tail = entry.name.slice(star + 1);
      return name.length >= head.length + tail.length && name.startsWith(head) && name.endsWith(tail);
    }) ?? null
  );
}
