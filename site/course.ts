/**
 * 교안 묶음.
 *
 * **이 저장소에는 교안 글자가 한 자도 없다.** 예전에는 빌드 때 교안 폴더를 읽어 Worker
 * 번들에 구웠다. 그러면 교안을 한 줄 고칠 때마다 공개 사이트를 통째로 배포해야 했고,
 * 공개 저장소 옆에 파는 물건을 두고 훅과 누출 검사로 지켜야 했다.
 *
 * 이제 교안은 비공개 저장소가 KV 로 따로 발행한다. 사이트 배포와 교안 발행이 서로를
 * 기다리지 않는다.
 *
 * 운영장과 강의방이 같은 묶음을 읽는다. 운영장은 어느 카테고리를 열지 고르려고 읽고
 * 강의방은 열린 카테고리의 본문을 그리려고 읽는다.
 */
import type { Cells, CourseScene } from "./classroom-render";
import type { Env } from "./env";

export type CoursePost = { id: string; title: string; summary: string; body: string; scenes?: CourseScene[] };
export type CourseCategory = {
  slug: string;
  order: number;
  title: string;
  /** 이 카테고리를 덮을 때 독자의 일 하나가 무엇이 되는지. schema 2 부터 온다 */
  goal?: string;
  /** 실행 칸 예제. schema 3 부터 온다. 교안이 링크로 부르고 렌더러가 칸으로 그린다 */
  cells?: Cells;
  posts: CoursePost[];
};
type CourseBundle = { schema: number; sceneContract?: number; categories: CourseCategory[] };

/**
 * 묶음의 모양은 eddmpython-course 와의 계약이다. 바꾸면 양쪽을 같은 날 같이 고친다.
 *
 * **두 판을 같이 받는다.** 하나만 받으면 발행과 배포 사이에 강의장이 빈 목록을 낸다.
 * 어느 쪽을 먼저 하든 그 틈이 생기고, 하필 강의 직전이면 그것이 사고다.
 * 2 는 카테고리 성과(goal)가 붙은 판이고 1 은 그 전 판이다.
 */
const COURSE_SCHEMA = new Set([1, 2, 3, 4]);
const COURSE_SCENE_CONTRACTS = new Set([1, 2]);

export type CourseState = { ok: boolean; categories: CourseCategory[] };

const isPost = (p: unknown): p is CoursePost =>
  !!p &&
  typeof (p as CoursePost).id === "string" &&
  typeof (p as CoursePost).title === "string" &&
  typeof (p as CoursePost).body === "string";

const sceneRoles = new Set(["open", "explain", "invert", "close"]);
const sceneLayouts = new Set(["stage", "sequence", "compare", "code", "demo"]);
const sceneEffects = new Set(["enter", "replace", "focus", "compare", "annotate", "run", "simulate"]);
const sceneEffectRules = {
  enter: { count: 1, requiresVisible: false, visibility: "append" },
  replace: { count: 1, requiresVisible: false, visibility: "replace" },
  focus: { count: 1, requiresVisible: true, visibility: "keep" },
  compare: { count: 2, requiresVisible: false, visibility: "replace" },
  annotate: { count: 1, requiresVisible: true, visibility: "keep" },
  run: { count: 1, requiresVisible: true, visibility: "keep" },
  simulate: { count: 1, requiresVisible: true, visibility: "keep" },
} as const;
const isScene = (value: unknown): value is CourseScene => {
  if (!value || typeof value !== "object") return false;
  const scene = value as CourseScene;
  const shapeOk = (
    typeof scene.id === "string" &&
    sceneRoles.has(scene.role) &&
    sceneLayouts.has(scene.layout) &&
    Number.isInteger(scene.visualCount) &&
    scene.visualCount > 0 &&
    Array.isArray(scene.beats) &&
    scene.beats.every(
      (beat) =>
        beat &&
        sceneEffects.has(beat.effect) &&
        Array.isArray(beat.targets) &&
        beat.targets.length > 0 &&
        beat.targets.every((target) => Number.isInteger(target) && target > 0 && target <= scene.visualCount) &&
        (beat.note === undefined || typeof beat.note === "string") &&
        (beat.effect === "annotate" ? Boolean(beat.note?.trim()) : beat.note === undefined),
    )
  );
  if (!shapeOk || !["enter", "replace"].includes(scene.beats[0]?.effect)) return false;
  const visible = new Set<number>();
  for (const beat of scene.beats) {
    const rule = sceneEffectRules[beat.effect];
    if (beat.targets.length !== rule.count) return false;
    if (rule.requiresVisible && beat.targets.some((target) => !visible.has(target))) return false;
    if (rule.visibility === "replace") visible.clear();
    if (rule.visibility !== "keep") beat.targets.forEach((target) => visible.add(target));
  }
  return true;
};

/**
 * 교안을 KV 에서 읽는다.
 *
 * **이 저장소에는 교안 글자가 한 자도 없다.** 예전에는 빌드 때 교안 폴더를 읽어 Worker
 * 번들에 구웠다. 그러면 교안을 한 줄 고칠 때마다 공개 사이트를 통째로 배포해야 했고,
 * 공개 저장소 옆에 파는 물건을 두고 훅과 누출 검사로 지켜야 했다.
 *
 * 이제 교안은 비공개 저장소가 KV 로 따로 발행한다. 사이트 배포와 교안 발행이 서로를
 * 기다리지 않는다.
 *
 * **무슨 일이 있어도 던지지 않는다.** 묶음이 깨졌을 때 던지면 강의장만이 아니라 운영
 * 화면까지 같이 죽는다. 그러면 강의 중에 운영자가 방 목록조차 못 본다.
 */
export async function course(env: Env): Promise<CourseState> {
  let bundle: CourseBundle | null = null;
  try {
    const raw = await env.COURSE.get("bundle", { cacheTtl: 60 });
    if (raw === null) return { ok: true, categories: [] };
    bundle = JSON.parse(raw) as CourseBundle;
  } catch {
    // 묶음이 깨졌으면 교안이 없는 것으로 본다. 여기서 던지면 강의장만이 아니라 운영 화면도
    // 같이 죽는다. 강의 중에 운영자가 방 목록조차 못 보게 되는 것이 제일 나쁜 결과다.
    return { ok: false, categories: [] };
  }
  if (!bundle || !COURSE_SCHEMA.has(bundle.schema) || !Array.isArray(bundle.categories)) {
    return { ok: false, categories: [] };
  }
  if (bundle.schema === 4 && !COURSE_SCENE_CONTRACTS.has(bundle.sceneContract ?? 0)) {
    return { ok: false, categories: [] };
  }
  const categories = bundle.categories
    .filter((c) => c && typeof c.slug === "string" && Array.isArray(c.posts))
    .map((c) => ({
      ...c,
      order: Number(c.order) || 0,
      posts: c.posts.filter(isPost).map((post) => ({
        ...post,
        scenes: Array.isArray(post.scenes) ? post.scenes.filter(isScene) : undefined,
      })),
    }))
    .sort((a, b) => a.order - b.order);
  return { ok: true, categories };
}

/**
 * 교안의 판 번호. 발행할 때마다 바뀐다.
 *
 * 상태 지문에 이것을 넣지 않으면 교안을 다시 발행해도 **이미 화면을 열고 있는 수강생이
 * 모른다.** 새로 들어오는 사람만 새 내용을 본다. 예전에는 교안이 Worker 번들에 있어서
 * 재배포가 강제 새로고침 노릇을 했는데 KV 로 옮기면서 그 효과가 사라졌다.
 */
export async function courseVersion(env: Env): Promise<string> {
  try {
    return (await env.COURSE.get("version", { cacheTtl: 60 })) ?? "";
  } catch {
    return "";
  }
}
