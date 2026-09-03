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
  /** 화면에 보일 과정 번호. 하위 과정이면 04-01처럼 발행 묶음이 정한 값을 쓴다 */
  displayNumber?: string;
  title: string;
  /** 이 카테고리를 덮을 때 독자의 일 하나가 무엇이 되는지. schema 2 부터 온다 */
  goal?: string;
  /** 실행 칸 예제. schema 3 부터 온다. 교안이 링크로 부르고 렌더러가 칸으로 그린다 */
  cells?: Cells;
  posts: CoursePost[];
};
type CourseBundle = {
  schema: number;
  sceneContract?: number;
  /**
   * 용어와 한 줄 정의. 2026-08-31 부터 실리는 **추가 필드**이고 schema 와 무관하다.
   * schema 를 올리지 않은 이유가 이 기능의 핵심이다. 추가 필드는 옛 배포본이 조용히
   * 무시하므로 교안 발행이 강의장 배포를 기다리지 않는다. 운영자가 교안 발행과 사이트
   * 배포를 연관짓지 말라고 못박았다.
   */
  glossary?: Record<string, string>;
  categories: CourseCategory[];
};

/**
 * 묶음의 모양은 eddmpython-course 와의 계약이다. 바꾸면 양쪽을 같은 날 같이 고친다.
 *
 * **두 판을 같이 받는다.** 하나만 받으면 발행과 배포 사이에 강의장이 빈 목록을 낸다.
 * 어느 쪽을 먼저 하든 그 틈이 생기고, 하필 강의 직전이면 그것이 사고다.
 * 숫자는 옛 배포본이 그대로 그리면 깨지는 변경에만 올린다. 조용히 무시되는 추가
 * 필드(glossary)는 숫자를 올리지 않는다.
 */
const COURSE_SCHEMA = new Set([1, 2, 3, 4]);
/**
 * 3 은 첫 beat 자동 재생, enter/replace 다중 대상(셋까지), compare 개막을 더한 판이다.
 * 4 는 단독 annotate 를 없애고 판단 문장을 아무 beat 의 note 로 실은 판이다. 5 는 서로 다른
 * 시각자산 둘을 연결하는 compose 와 pair, lead 레이아웃을 더했다. 6은 다중 대상을 같은
 * 좌표의 단일 시각자료 장표로 펼친다. 7은 표를 무대에서 빼고, 8은 시각물을 16:9로
 * 고정한다. 9는 H2 안의 모든 시각물을 읽기와 강의 양쪽에서 같은 16:9 캐러셀로 표시한다.
 * 읽기 본문은 원래 순서를 유지하고 강의 모드는 현재 시각물 캡션을 가로줄 아래의 보조설명으로
 * 쓴다. 10은 실행 칸을 시각물에서 빼고 강의 무대에 시각물만 올린다. 11은 절의 뼈대를 제목,
 * 부제, 시각물, 서술형 설명으로 고정한다. 11이 좁힌 것은 저작 규칙이고 장면이 싣는 값의
 * 모양은 10과 같으므로 이 런타임이 그대로 읽는다. 이전 장면도 함께 받는다.
 */
const COURSE_SCENE_CONTRACTS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

export type CourseState = { ok: boolean; categories: CourseCategory[]; glossary: Record<string, string> };

const isPost = (p: unknown): p is CoursePost =>
  !!p &&
  typeof (p as CoursePost).id === "string" &&
  typeof (p as CoursePost).title === "string" &&
  typeof (p as CoursePost).body === "string";

const sceneRoles = new Set(["open", "explain", "invert", "close"]);
const sceneLayouts = new Set(["stage", "sequence", "compare", "pair", "lead", "code", "demo"]);
const sceneEffects = new Set(["enter", "replace", "focus", "compare", "compose", "annotate", "run", "simulate"]);
const sceneEffectRules = {
  enter: { min: 1, max: 3, requiresVisible: false, visibility: "carousel" },
  replace: { min: 1, max: 3, requiresVisible: false, visibility: "carousel" },
  focus: { min: 1, max: 1, requiresVisible: true, visibility: "keep" },
  compare: { min: 2, max: 2, requiresVisible: false, visibility: "carousel" },
  compose: { min: 2, max: 2, requiresVisible: false, visibility: "carousel" },
  annotate: { min: 1, max: 1, requiresVisible: true, visibility: "keep" },
  run: { min: 1, max: 1, requiresVisible: true, visibility: "keep" },
  simulate: { min: 1, max: 1, requiresVisible: true, visibility: "keep" },
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
        // 계약 4: 판단 문장은 아무 beat 에나 note 로 탄다. annotate(계약 3 이하)는 note 필수다.
        (beat.effect === "annotate"
          ? Boolean(typeof beat.note === "string" && beat.note.trim())
          : beat.note === undefined || Boolean(typeof beat.note === "string" && beat.note.trim())),
    )
  );
  // 첫 beat 는 장면을 여는 화면이다. 여러 target 은 같은 좌표의 캐러셀 항목으로 펼쳐진다.
  if (!shapeOk || !["enter", "replace", "compare", "compose"].includes(scene.beats[0]?.effect)) return false;
  const isCompositionLayout = scene.layout === "pair" || scene.layout === "lead";
  if (isCompositionLayout && (scene.visualCount !== 2 || scene.beats[0]?.effect !== "compose")) return false;
  if (!isCompositionLayout && scene.beats.some((beat) => beat.effect === "compose")) return false;
  const introduced = new Set<number>();
  for (const beat of scene.beats) {
    const rule = sceneEffectRules[beat.effect];
    if (beat.targets.length < rule.min || beat.targets.length > rule.max) return false;
    if (rule.requiresVisible && beat.targets.some((target) => !introduced.has(target))) return false;
    if (rule.visibility !== "keep") beat.targets.forEach((target) => introduced.add(target));
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
    if (raw === null) return { ok: true, categories: [], glossary: {} };
    bundle = JSON.parse(raw) as CourseBundle;
  } catch {
    // 묶음이 깨졌으면 교안이 없는 것으로 본다. 여기서 던지면 강의장만이 아니라 운영 화면도
    // 같이 죽는다. 강의 중에 운영자가 방 목록조차 못 보게 되는 것이 제일 나쁜 결과다.
    return { ok: false, categories: [], glossary: {} };
  }
  if (!bundle || !COURSE_SCHEMA.has(bundle.schema) || !Array.isArray(bundle.categories)) {
    return { ok: false, categories: [], glossary: {} };
  }
  if (bundle.schema === 4 && !COURSE_SCENE_CONTRACTS.has(bundle.sceneContract ?? 0)) {
    return { ok: false, categories: [], glossary: {} };
  }
  // 문자열 쌍만 받는다. 묶음의 다른 부분이 멀쩡한데 용어집만 깨졌으면 툴팁 없이 그린다.
  const glossary: Record<string, string> = {};
  if (bundle.glossary && typeof bundle.glossary === "object" && !Array.isArray(bundle.glossary)) {
    for (const [term, def] of Object.entries(bundle.glossary)) {
      if (typeof def === "string" && term && def) glossary[term] = def;
    }
  }
  const categories = bundle.categories
    .filter((c) => c && typeof c.slug === "string" && Array.isArray(c.posts))
    .map((c) => ({
      ...c,
      order: Number(c.order) || 0,
      displayNumber:
        typeof c.displayNumber === "string" && /^\d{2}(?:-\d{2})?$/.test(c.displayNumber)
          ? c.displayNumber
          : undefined,
      posts: c.posts.filter(isPost).map((post) => ({
        ...post,
        scenes: Array.isArray(post.scenes) ? post.scenes.filter(isScene) : undefined,
      })),
    }))
    .sort((a, b) => a.order - b.order);
  return { ok: true, categories, glossary };
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
