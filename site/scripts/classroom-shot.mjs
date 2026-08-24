/**
 * 강의장 화면을 찍고 실제로 도는지 본다. 로컬 wrangler dev 가 떠 있어야 한다.
 *
 * 사용: node scripts/classroom-shot.mjs [baseUrl]
 * 출력: ../../eddmpython.out/classroom-shots/
 *
 * 강의장은 sitemap 에 없고 비밀번호 뒤에 있어서 verify:visual 이 못 본다. 그래서 따로 찍는다.
 * 그림만 보고 넘어가지 않는다. 확대와 실시간 동기화는 인라인 스크립트라서 CSP 가 막으면
 * 화면은 멀쩡한데 기능이 죽는다. 그래서 스크립트가 실제로 돌았는지도 같이 확인한다.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { signIn } from "./admin-client.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
/** Runtime.evaluate 응답은 CDP 결과를 한 겹 더 감싸고 있다. 값만 꺼낸다. */
const value = (res) => res?.output?.result?.result?.value;

const OUT = resolve(SITE_ROOT, "../../eddmpython.out/classroom-shots");
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");

const SOURCE_ROOM = "shot-source";
const ROOM = "shot";
/**
 * 비밀번호를 소스에 적지 않는다. 매번 새로 뽑는다.
 *
 * 2026-08-20 에 여기 적혀 있던 `shot-room-1234` 로 **운영의 유료 교안이 통째로 열렸다.**
 * 이 파일은 공개 저장소에 있다. 방 이름도 비밀번호도 GitHub 에서 그대로 읽혔고,
 * 아래 정리 코드가 없어서 방은 계속 살아 있었다. 저장소를 둘로 가른 이유가 이것이다.
 */
const PASSWORD = randomBytes(12).toString("base64url");
const SOAK_STEPS = 240;

// 대상은 주소로 고른다. 루프백이 아니면 운영이다.
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
if (!local) console.log(`운영(${base}) 에 검수용 방을 만들고 끝나면 지운다`);
// 사람이 들어가는 문으로 같이 들어간다. 기계용 문을 따로 내지 않는다.
const admin = await signIn(base);

// 찍을 방을 만들고 제품 운영과 같은 주소 이동을 거친다. 비밀번호 원문 없이 방을 옮길 수 있어야 한다.
await admin({ action: "remove", slug: SOURCE_ROOM }).catch(() => {});
await admin({ action: "remove", slug: ROOM }).catch(() => {});
const made = await admin({ action: "create", slug: SOURCE_ROOM, title: "검수용 강의방", password: PASSWORD });
const category = made.categories[0];
if (!category) {
  throw new Error(
    "교안 카테고리가 없다. ../eddmpython-course 에서 npm run publish:local 을 먼저 돌려라",
  );
}
await admin({ action: "toggle", slug: SOURCE_ROOM, category: category.slug });
await admin({ action: "rename", slug: SOURCE_ROOM, nextSlug: ROOM, title: "강의방 화면 검수" });
await admin({ action: "open", slug: ROOM, open: true });
const oldAddress = await fetch(`${base}/room/${SOURCE_ROOM}`, { redirect: "manual" });
if (oldAddress.status !== 404) throw new Error(`주소 이동 뒤 옛 주소가 남았다: ${oldAddress.status}`);
const listed = await admin({ action: "list" });
const posts = listed.categories.find((c) => c.slug === category.slug);
console.log(`  검수용 강의방 ${base}/room/${ROOM}  카테고리 ${category.slug} (${posts.posts}편)`);

const first = process.argv[3] ?? null;

const VIEWPORTS = [
  { id: "desktop", width: 1920, height: 900, dpr: 1, isMobile: false, hasTouch: false,
    sectionTitle: "24px", centerGap: 24, titleMin: 72, visualMin: 700, presenterColumns: 2,
    compareColumns: 2, wideComposition: true, lowHeightSide: false, runPython: true },
  { id: "projector", width: 1366, height: 768, dpr: 1, isMobile: false, hasTouch: false,
    sectionTitle: "24px", centerGap: 24, titleMin: 72, visualMin: 620, presenterColumns: 2,
    compareColumns: 2, wideComposition: true, lowHeightSide: false, runPython: false },
  // 1366x768 화면을 브라우저 125%로 쓸 때의 유효 CSS viewport다.
  { id: "projector-125", width: 1093, height: 614, dpr: 1.25, isMobile: false, hasTouch: false,
    sectionTitle: "24px", centerGap: 24, titleMin: 64, visualMin: 480, presenterColumns: 2,
    compareColumns: 2, wideComposition: true, lowHeightSide: true, runPython: false },
  { id: "tablet-landscape", width: 1180, height: 820, dpr: 1, isMobile: true, hasTouch: true,
    sectionTitle: "24px", centerGap: 20, titleMin: 68, visualMin: 540, presenterColumns: 2,
    compareColumns: 2, wideComposition: true, lowHeightSide: false, runPython: false },
  { id: "tablet-portrait", width: 820, height: 1180, dpr: 1, isMobile: true, hasTouch: true,
    sectionTitle: "24px", centerGap: 24, titleMin: 52, visualMin: 620, presenterColumns: 1,
    compareColumns: 2, wideComposition: false, lowHeightSide: false, runPython: false },
  { id: "mobile", width: 390, height: 844, dpr: 1, isMobile: true, hasTouch: true,
    sectionTitle: "22px", centerGap: 14, titleMin: 44, visualMin: 320, presenterColumns: 1,
    compareColumns: 1, wideComposition: false, lowHeightSide: false, runPython: false },
];
const requestedViewports = new Set(
  String(process.env.CR_VIEWPORTS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
);
const activeViewports = requestedViewports.size
  ? VIEWPORTS.filter((viewport) => requestedViewports.has(viewport.id))
  : VIEWPORTS;
if (!activeViewports.length) throw new Error(`알 수 없는 CR_VIEWPORTS: ${[...requestedViewports].join(", ")}`);

await mkdir(OUT, { recursive: true });
const checks = [];
const record = (label, ok, detail) => {
  checks.push(ok);
  console.log(`  ${ok ? "통과" : "실패"}  ${label}${detail && !ok ? ` (${detail})` : ""}`);
};

/**
 * 운영에는 검수용 방을 남기지 않는다. 도중에 터져도 지운다.
 *
 * 로컬은 남겨 둔다. 루프백이라 아무도 못 열고, 다시 찍을 때 그대로 쓴다.
 * 지웠다는 말로 끝내지 않고 밖에서 주소를 두드려 죽었는지 확인한다.
 */
async function cleanup() {
  if (local) return;
  await admin({ action: "remove", slug: SOURCE_ROOM }).catch(() => {});
  await admin({ action: "remove", slug: ROOM }).catch(() => {});
  const gone = await fetch(`${base}/room/${ROOM}`, { redirect: "manual" }).catch(() => null);
  const status = gone ? gone.status : "확인 못 함";
  console.log(`  운영의 검수용 방을 지웠다 (밖에서 본 status ${status})`);
  if (status !== 404) console.error("  경고: 아직 살아 있다. 운영 화면에서 직접 지워라");
}

try {
for (const viewport of activeViewports) {
  const manifestPath = join(OUT, `pyproc-control.${viewport.id}.json`);
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
        timeoutMs: 180000,
        browser: {
          enabled: true,
          provider: "nativeCdp",
          allowedOrigins: [new URL(base).origin],
          maxRisk: "externalEffect",
          actions: ["snapshot", "screenshot", "waitFor", "navigate", "click"],
          methods: ["Runtime.evaluate"],
          viewport: {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: viewport.dpr,
            mobile: viewport.isMobile,
            touch: viewport.hasTouch,
          },
          externalEffects: "acknowledged",
          purpose: "eddmpython 강의장 화면 검수",
          artifacts: {
            maxArtifactBytes: 33554432,
            maxTotalBytes: 134217728,
            maxArtifacts: 64,
            inlineMaxBytes: 4194304,
            ttlMs: 900000,
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE_ROOT, timeoutMs: 30000 });
  if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
  const client = await PyProcControlClient.start(manifestPath, {
    cwd: SITE_ROOT,
    startupTimeoutMs: 180000,
    shutdownTimeoutMs: 30000,
  });

  const evaluate = async (sessionRef, expression, awaitPromise = true) =>
    client.command(
      sessionRef,
      "Runtime.evaluate",
      { expression, awaitPromise, returnByValue: true },
      { expectedRisk: "externalEffect", timeoutMs: 120000 },
    );

  /** lazy 이미지를 강제로 로드하고 다 뜰 때까지 기다린다. 안 하면 빈 자리로 찍힌다. */
  const hydrate = async (sessionRef) => {
    await evaluate(
      sessionRef,
      `(async () => {
        const imgs = [...document.images];
        imgs.forEach((i) => { i.loading = 'eager'; if (i.dataset.src) i.src = i.dataset.src; });
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
        window.scrollTo(0, 0);
        await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => {
          i.addEventListener('load', r, { once: true });
          i.addEventListener('error', r, { once: true });
        })));
        return true;
      })()`,
    );
  };

  const save = async (sessionRef, name, fullPage = true) => {
    await hydrate(sessionRef);
    const captured = await client.act(
      sessionRef,
      [{ kind: "screenshot", format: "jpeg", fullPage, expectedRisk: "read" }],
      { timeoutMs: 60000 },
    );
    const image = captured.attachments.find((i) => i.mimeType === "image/jpeg");
    if (!image) throw new Error(`screenshot 없음: ${name}`);
    const file = join(OUT, `${name}.${viewport.id}.jpg`);
    await writeFile(file, image.bytes);
    console.log(`  ${file}`);
    const ref = captured.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
  };

  try {
    // 1) 비밀번호 화면
    let opened = await client.openTarget(`${base}/room/${ROOM}`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    let session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    await save(session, "01-login");
    const branded = value(
      await evaluate(
        session,
        `(() => ({
          logo: Boolean(document.querySelector('.hd-logo .hd-symbol')),
          gate: document.querySelector('.gate .eyebrow')?.textContent.trim(),
          title: document.title,
          icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
        }))()`,
      ),
    );
    record(
      `${viewport.id} 로그인 화면 브랜드`,
      branded?.logo === true &&
        branded?.gate === "eddmpython course" &&
        branded?.title.endsWith(" | eddmpython") &&
        branded?.icon === "/favicon.svg",
      JSON.stringify(branded),
    );

    // 2) 비밀번호를 넣고 들어간 목록. type 액션이 없으므로 값을 직접 넣고 제출한다.
    await evaluate(
      session,
      `(() => {
        const i = document.querySelector('input[name="password"]');
        i.value = ${JSON.stringify(PASSWORD)};
        document.querySelector('form').submit();
      })()`,
      false,
    );
    await client.act(
      session,
      [{ kind: "waitFor", selector: ".cat h2", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    await save(session, "02-room");

    // 폴링 스크립트가 실제로 돌았는지 본다. CSP 가 막으면 여기서 undefined 가 나온다.
    const stamped = await evaluate(session, `typeof window.__stamp`);
    record(`${viewport.id} 실시간 동기화 스크립트`, value(stamped) === "string");

    // 3) 열린 글 한 편
    const href = value(await evaluate(session, `document.querySelector('a.post').getAttribute('href')`));
    if (!href) throw new Error('열린 글 링크를 못 찾았다');
    opened = await client.openTarget(`${base}${first ?? href}`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    await save(session, "03-post");

    const sectionTitle = value(await evaluate(session, `(() => {
      const heading = document.querySelector('article h2');
      if (!heading) return null;
      const style = getComputedStyle(heading);
      return { size: style.fontSize, weight: style.fontWeight };
    })()`));
    record(
      `${viewport.id} 섹션 제목 공용 위계`,
      sectionTitle?.size === viewport.sectionTitle &&
        sectionTitle?.weight === "600",
      JSON.stringify(sectionTitle),
    );

    const visualGroup = value(await evaluate(session, `(() => {
      const label = document.querySelector('article .lb');
      const visual = label?.nextElementSibling;
      if (!label || !visual) return null;
      const labelBox = label.getBoundingClientRect();
      const visualBox = visual.getBoundingClientRect();
      return {
        gap: Math.round((visualBox.top - labelBox.bottom) * 100) / 100,
        visual: visual.className || visual.tagName.toLowerCase(),
        background: getComputedStyle(label).backgroundColor,
        border: getComputedStyle(label).borderLeftWidth,
      };
    })()`));
    record(
      `${viewport.id} 소제목과 시각물 묶음`,
      visualGroup !== null &&
        visualGroup.gap >= 0 &&
        visualGroup.gap <= 12 &&
        visualGroup.background !== "rgba(0, 0, 0, 0)" &&
        visualGroup.border === "2px",
      JSON.stringify(visualGroup),
    );

    // 읽기 본문과 같은 H2가 전체화면 장면이 되고 클릭마다 beat가 진행되는지 본다.
    const lectureButton = Number(
      value(await evaluate(session, `document.querySelectorAll('[data-lecture-open]').length`)),
    );
    record(`${viewport.id} 강의 모드 버튼`, lectureButton === 1, String(lectureButton));
    if (lectureButton === 1) {
      await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-open]", expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      const afterLectureClick = value(await evaluate(session, `(() => ({
        hidden: document.querySelector('[data-lecture-deck]')?.hidden,
        active: document.querySelectorAll('.lecture-scene.on').length,
        hash: location.hash,
      }))()`));
      if (afterLectureClick?.hidden !== false || afterLectureClick?.active !== 1) {
        const lectureInit = value(await evaluate(session, `(() => {
          const source = [...document.scripts].at(-1)?.textContent || '';
          const at = source.lastIndexOf('(() => {\\n  const deck = document.querySelector("[data-lecture-deck]")');
          if (at < 0) return '강의 스크립트가 응답에 없다';
          try { new Function(source.slice(at))(); return '수동 실행 성공'; }
          catch (error) { return error?.stack || String(error); }
        })()`));
        throw new Error(`강의 모드 클릭 뒤 장면이 열리지 않았다: ${JSON.stringify(afterLectureClick)} :: ${lectureInit}`);
      }
      await client.act(
        session,
        [{ kind: "waitFor", selector: ".lecture-scene.on", timeoutMs: 15000, expectedRisk: "read" }],
        { timeoutMs: 30000 },
      );
      await client.act(
        session,
        [{ kind: "waitFor", selector: '[data-lecture-deck][data-scene-phase="ready"]', timeoutMs: 15000, expectedRisk: "read" }],
        { timeoutMs: 30000 },
      );
      const lectureStart = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const scene = deck?.querySelector('.lecture-scene.on');
        const stage = deck?.querySelector('.lecture-stage');
        const head = scene?.querySelector('.scene-head');
        const stageBox = stage?.getBoundingClientRect();
        const headBox = head?.getBoundingClientRect();
        return {
          hidden: deck?.hidden,
          body: document.body.classList.contains('lecture-on'),
          scenes: deck?.querySelectorAll('.lecture-scene').length,
          title: scene?.querySelector('.scene-head h2')?.textContent.trim(),
          titleSize: parseFloat(getComputedStyle(scene?.querySelector('.scene-head h2')).fontSize),
          visible: scene?.querySelectorAll('[data-scene-visible="true"]').length,
          sceneEmpty: scene?.dataset.sceneEmpty,
          centerGap: stageBox && headBox ? Math.abs((headBox.top + headBox.height / 2) - (stageBox.top + stageBox.height / 2)) : null,
          symbolWidth: deck?.querySelector('.lecture-symbol')?.getBoundingClientRect().width,
          themeButtons: document.querySelectorAll('[data-theme-toggle]').length,
          lectureThemeButtons: deck?.querySelectorAll('[data-theme-toggle]').length,
          presenterButtons: deck?.querySelectorAll('[data-lecture-presenter]').length,
          fullscreenButtons: deck?.querySelectorAll('[data-lecture-fullscreen]').length,
          runtime: deck?.dataset.lectureRuntime,
          sceneRuntime: scene?.dataset.sceneRuntime,
          phase: deck?.dataset.scenePhase,
          activeInert: scene?.hasAttribute('inert'),
          inactiveInert: [...(deck?.querySelectorAll('.lecture-scene:not(.on)') ?? [])].every((item) => item.hasAttribute('inert')),
          prevDisabled: deck?.querySelector('[data-lecture-prev]')?.disabled,
          nextDisabled: deck?.querySelector('[data-lecture-next]')?.disabled,
          status: deck?.querySelector('[data-lecture-status]')?.textContent.trim(),
          deckHeight: Math.round(deck?.getBoundingClientRect().height ?? -1),
          viewportHeight: innerHeight,
          progressValue: deck?.querySelector('[data-lecture-progress]')?.getAttribute('aria-valuenow'),
          progress: deck?.querySelector('[data-lecture-progress]')?.textContent.trim(),
        };
      })()`));
      record(
        `${viewport.id} 강의 모드 첫 장면`,
        lectureStart?.hidden === false &&
          lectureStart?.body === true &&
          lectureStart?.scenes > 0 &&
          lectureStart?.title === "마우스와 키보드 자동화" &&
          lectureStart?.visible === 0 &&
          lectureStart?.sceneEmpty === "true" &&
          lectureStart?.centerGap <= viewport.centerGap &&
          lectureStart?.symbolWidth >= 20 &&
          lectureStart?.themeButtons === 2 &&
          lectureStart?.lectureThemeButtons === 1 &&
          lectureStart?.presenterButtons === 1 &&
          lectureStart?.fullscreenButtons === 1 &&
          lectureStart?.runtime === "3" &&
          lectureStart?.sceneRuntime === "3" &&
          lectureStart?.phase === "ready" &&
          lectureStart?.activeInert === false &&
          lectureStart?.inactiveInert === true &&
          lectureStart?.prevDisabled === true &&
          lectureStart?.nextDisabled === false &&
          lectureStart?.status?.includes("제목 화면") &&
          lectureStart?.deckHeight === lectureStart?.viewportHeight &&
          lectureStart?.titleSize >= viewport.titleMin &&
          lectureStart?.progressValue === "0" &&
          /· 0 \/ \d+$/.test(lectureStart?.progress ?? ""),
        JSON.stringify(lectureStart),
      );
      await save(session, "06-lecture-title", false);

      await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-map-toggle]", expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      const mapState = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const map = deck?.querySelector('[data-lecture-map]');
        const items = [...(map?.querySelectorAll('[data-lecture-map-scene]') ?? [])];
        return {
          hidden:map?.hidden,
          expanded:deck?.querySelector('[data-lecture-map-toggle]')?.getAttribute('aria-expanded'),
          items:items.length,
          current:items.filter((item) => item.getAttribute('aria-current') === 'step').length,
          currentTitle:items.find((item) => item.getAttribute('aria-current') === 'step')?.querySelector('b')?.textContent.trim(),
          stageInert:deck?.querySelector('.lecture-stage')?.hasAttribute('inert'),
          barInert:deck?.querySelector('.lecture-bar')?.hasAttribute('inert'),
          footInert:deck?.querySelector('.lecture-foot')?.hasAttribute('inert'),
          audienceHelp:deck?.querySelector('.lecture-help')?.textContent.trim(),
        };
      })()`));
      record(
        `${viewport.id} 장면 지도와 관객 집중 화면`,
        mapState?.hidden === false &&
          mapState?.expanded === "true" &&
          mapState?.items === 12 &&
          mapState?.current === 1 &&
          mapState?.currentTitle === "마우스와 키보드 자동화" &&
          mapState?.stageInert === true &&
          mapState?.barInert === true &&
          mapState?.footInert === true &&
          mapState?.audienceHelp === "",
        JSON.stringify(mapState),
      );
      await save(session, "15-lecture-map", false);
      const mapNavigation = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
        const closed = {
          hidden:deck.querySelector('[data-lecture-map]').hidden,
          expanded:deck.querySelector('[data-lecture-map-toggle]').getAttribute('aria-expanded'),
          deckHidden:deck.hidden,
          stageInert:deck.querySelector('.lecture-stage').hasAttribute('inert'),
        };
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'m', bubbles:true }));
        await new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          deck.querySelector('[data-lecture-map-scene="1"]').click();
        });
        const jumped = {
          mapHidden:deck.querySelector('[data-lecture-map]').hidden,
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
          title:deck.querySelector('.lecture-scene.on h2')?.textContent.trim(),
        };
        await new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'Home', bubbles:true }));
        });
        return { closed, jumped };
      })()`));
      record(
        `${viewport.id} 장면 지도 키보드와 즉시 이동`,
        mapNavigation?.closed?.hidden === true &&
          mapNavigation?.closed?.expanded === "false" &&
          mapNavigation?.closed?.deckHidden === false &&
          mapNavigation?.closed?.stageInert === false &&
          mapNavigation?.jumped?.mapHidden === true &&
          /^02 \/ 12 · 0 \/ \d+$/.test(mapNavigation?.jumped?.progress ?? "") &&
          mapNavigation?.jumped?.title === "브라우저 자동화",
        JSON.stringify(mapNavigation),
      );
      const blankState = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const progress = deck.querySelector('[data-lecture-progress]').textContent.trim();
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'b', bubbles:true }));
        const covered = {
          blanked:deck.dataset.audienceBlanked,
          hidden:deck.querySelector('[data-lecture-break]').hidden,
          stageInert:deck.querySelector('.lecture-stage').hasAttribute('inert'),
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
        };
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'b', bubbles:true }));
        const restored = {
          blanked:deck.dataset.audienceBlanked,
          hidden:deck.querySelector('[data-lecture-break]').hidden,
          stageInert:deck.querySelector('.lecture-stage').hasAttribute('inert'),
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
        };
        return { progress, covered, restored };
      })()`));
      record(
        `${viewport.id} 관객 화면 가리기와 복구`,
        blankState?.covered?.blanked === "true" &&
          blankState?.covered?.hidden === false &&
          blankState?.covered?.stageInert === true &&
          blankState?.covered?.progress === blankState?.progress &&
          blankState?.restored?.blanked === "false" &&
          blankState?.restored?.hidden === true &&
          blankState?.restored?.stageInert === false &&
          blankState?.restored?.progress === blankState?.progress,
        JSON.stringify(blankState),
      );

      const fullscreenExit = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const button = deck?.querySelector('[data-lecture-fullscreen]');
        const supported = Boolean(deck?.requestFullscreen);
        if (document.fullscreenElement === deck) await document.exitFullscreen();
        await new Promise((resolve) => setTimeout(resolve, 80));
        return {
          supported,
          hidden: button?.hidden,
          pressed: button?.getAttribute('aria-pressed'),
          label: button?.getAttribute('aria-label'),
          active: document.fullscreenElement === deck,
        };
      })()`));
      let fullscreenRestore = null;
      if (fullscreenExit?.supported) {
        await client.act(
          session,
          [{ kind: "click", selector: "[data-lecture-fullscreen]", expectedRisk: "externalEffect" }],
          { timeoutMs: 30000 },
        );
        fullscreenRestore = value(await evaluate(session, `(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const deck = document.querySelector('[data-lecture-deck]');
          const button = deck?.querySelector('[data-lecture-fullscreen]');
          return {
            pressed: button?.getAttribute('aria-pressed'),
            label: button?.getAttribute('aria-label'),
            active: document.fullscreenElement === deck,
          };
        })()`));
      }
      record(
        `${viewport.id} 전체화면 복구 조작`,
        fullscreenExit?.supported
          ? fullscreenExit?.hidden === false &&
            fullscreenExit?.pressed === "false" &&
            fullscreenExit?.label === "전체화면 시작" &&
            fullscreenExit?.active === false &&
            fullscreenRestore?.pressed === "true" &&
            fullscreenRestore?.label === "전체화면 종료" &&
            fullscreenRestore?.active === true
          : fullscreenExit?.hidden === true,
        JSON.stringify({ exit: fullscreenExit, restore: fullscreenRestore }),
      );

      const lectureLight = value(await evaluate(session, `(async () => {
        const root = document.documentElement;
        const button = document.querySelector('[data-lecture-deck] [data-theme-toggle]');
        if (root.dataset.theme !== 'light') button.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          theme: root.dataset.theme,
          labels: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.getAttribute('aria-label')),
          nextThemes: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.dataset.nextTheme),
          scheme: getComputedStyle(root).colorScheme,
          meta: document.querySelector('meta[name="theme-color"]')?.content,
        };
      })()`));
      record(
        `${viewport.id} 강의 셸 라이트 테마`,
          lectureLight?.theme === "light" &&
          lectureLight?.labels?.length === 2 &&
          lectureLight?.labels?.every((label) => label === "다크 테마로 변경") &&
          lectureLight?.nextThemes?.every((theme) => theme === "dark") &&
          lectureLight?.scheme === "light" &&
          Boolean(lectureLight?.meta),
        JSON.stringify(lectureLight),
      );
      await save(session, "06-lecture-title-light", false);

      const lectureDark = value(await evaluate(session, `(async () => {
        const root = document.documentElement;
        document.querySelector('[data-lecture-deck] [data-theme-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          theme: root.dataset.theme,
          labels: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.getAttribute('aria-label')),
          nextThemes: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.dataset.nextTheme),
          scheme: getComputedStyle(root).colorScheme,
          meta: document.querySelector('meta[name="theme-color"]')?.content,
        };
      })()`));
      record(
        `${viewport.id} 강의 셸 다크 테마`,
          lectureDark?.theme === "dark" &&
          lectureDark?.labels?.length === 2 &&
          lectureDark?.labels?.every((label) => label === "라이트 테마로 변경") &&
          lectureDark?.nextThemes?.every((theme) => theme === "light") &&
          lectureDark?.scheme === "dark" &&
          Boolean(lectureDark?.meta),
        JSON.stringify(lectureDark),
      );
      await save(session, "06-lecture-title-dark", false);

      await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-next]", expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      await evaluate(session, `new Promise((resolve) => setTimeout(resolve, 350))`);
      const firstBeat = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const scene = deck.querySelector('.lecture-scene.on');
        const visual = scene.querySelector('[data-scene-visible="true"]');
        const frame = visual?.querySelector('img, video, iframe, pre') ?? visual;
        const caption = visual?.querySelector('figcaption');
        const label = scene.querySelector('[data-scene-label-visible="true"]');
        const subtitle = scene.querySelector('.scene-head p');
        const labelRect = label?.getBoundingClientRect();
        const subtitleRect = subtitle?.getBoundingClientRect();
        return {
          visible: scene.querySelectorAll('[data-scene-visible="true"]').length,
          effect: visual?.dataset.sceneEffect,
          sceneEffect: scene?.dataset.sceneEffect,
          cue: scene?.querySelector('[data-scene-cue]')?.textContent.trim(),
          phase: deck?.dataset.scenePhase,
          sceneEmpty: scene.dataset.sceneEmpty,
          width: visual ? Math.round(visual.getBoundingClientRect().width) : 0,
          frameBorder: frame ? getComputedStyle(frame).borderTopWidth : null,
          frameRadius: frame ? parseFloat(getComputedStyle(frame).borderTopLeftRadius) : null,
          captionBackground: caption ? getComputedStyle(caption).backgroundColor : null,
          labelTop: labelRect ? Math.round(labelRect.top) : null,
          labelLeft: labelRect ? Math.round(labelRect.left) : null,
          subtitleBottom: subtitleRect ? Math.round(subtitleRect.bottom) : null,
          subtitleRight: subtitleRect ? Math.round(subtitleRect.right) : null,
          progressValue: deck.querySelector('[data-lecture-progress]').getAttribute('aria-valuenow'),
          progress: deck.querySelector('[data-lecture-progress]').textContent.trim(),
          hash: location.hash,
        };
      })()`));
      record(
        `${viewport.id} 첫 클릭 enter 효과`,
        firstBeat?.visible === 1 &&
          firstBeat?.effect === "enter" &&
          firstBeat?.sceneEffect === "enter" &&
          firstBeat?.cue === "살펴보기" &&
          firstBeat?.phase === "ready" &&
          firstBeat?.sceneEmpty === "false" &&
          firstBeat?.width >= viewport.visualMin &&
          firstBeat?.frameBorder === "1px" &&
          firstBeat?.frameRadius >= 6 &&
          firstBeat?.frameRadius <= 10 &&
          firstBeat?.captionBackground === "rgba(0, 0, 0, 0)" &&
          (viewport.lowHeightSide
            ? firstBeat?.labelLeft >= firstBeat?.subtitleRight + 8
            : firstBeat?.labelTop >= firstBeat?.subtitleBottom + 8) &&
          Number(firstBeat?.progressValue) > 0 &&
          /· 1 \/ \d+$/.test(firstBeat?.progress ?? "") &&
          /^#lecture=s1\.1$/.test(firstBeat?.hash ?? ""),
        JSON.stringify(firstBeat),
      );

      const mediaFailure = value(await evaluate(session, `(() => {
        const scene = document.querySelector('.lecture-scene.on');
        const media = scene?.querySelector('[data-scene-visible="true"] img, [data-scene-visible="true"] video, [data-scene-visible="true"] .course-embed > iframe');
        media?.dispatchEvent(new Event('error'));
        const host = media?.closest('[data-media-host]');
        const status = host?.querySelector('[data-media-status]');
        return {
          state: host?.dataset.mediaState,
          message: status?.textContent.trim(),
          statusDisplay: status ? getComputedStyle(status).display : null,
          mediaDisplay: media ? getComputedStyle(media).display : null,
          retry: status?.querySelector('button')?.textContent.trim(),
        };
      })()`));
      await save(session, "12-lecture-media-error", false);
      const mediaRecovered = value(await evaluate(session, `(() => {
        const scene = document.querySelector('.lecture-scene.on');
        const media = scene?.querySelector('[data-scene-visible="true"] img, [data-scene-visible="true"] video, [data-scene-visible="true"] .course-embed > iframe');
        media?.dispatchEvent(new Event(media?.matches('video') ? 'loadeddata' : 'load'));
        const host = media?.closest('[data-media-host]');
        const status = host?.querySelector('[data-media-status]');
        return {
          state: host?.dataset.mediaState,
          statusDisplay: status ? getComputedStyle(status).display : null,
          mediaDisplay: media ? getComputedStyle(media).display : null,
        };
      })()`));
      record(
        `${viewport.id} 미디어 실패와 복구`,
        mediaFailure?.state === "error" &&
          mediaFailure?.message?.includes("불러오지 못했습니다") &&
          mediaFailure?.statusDisplay === "grid" &&
          mediaFailure?.mediaDisplay === "none" &&
          mediaFailure?.retry === "다시 불러오기" &&
          mediaRecovered?.state === "ready" &&
          mediaRecovered?.statusDisplay === "none" &&
          mediaRecovered?.mediaDisplay !== "none",
        JSON.stringify({ failure: mediaFailure, recovered: mediaRecovered }),
      );

      await evaluate(session, `document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }))`);
      const keyboardBeat = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const visual = deck.querySelector('.lecture-scene.on [data-scene-visible="true"]');
        const video = visual?.querySelector('video');
        return {
          effect: visual?.dataset.sceneEffect,
          sceneEffect: deck.querySelector('.lecture-scene.on')?.dataset.sceneEffect,
          cue: deck.querySelector('.lecture-scene.on [data-scene-cue]')?.textContent.trim(),
          live: visual?.dataset.sceneLive,
          playing: video ? !video.paused : null,
          progress: deck.querySelector('[data-lecture-progress]').textContent.trim(),
          hash: location.hash,
        };
      })()`));
      record(
        `${viewport.id} 키보드 재생 비트`,
        keyboardBeat?.effect === "run" &&
          keyboardBeat?.sceneEffect === "run" &&
          keyboardBeat?.cue === "실행" &&
          keyboardBeat?.live === "true" &&
          keyboardBeat?.playing === true &&
          /· 2 \/ 11$/.test(keyboardBeat?.progress ?? "") &&
          keyboardBeat?.hash === "#lecture=s1.2",
        JSON.stringify(keyboardBeat),
      );
      await save(session, "07-lecture-beat", false);

      const annotationState = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const waitFrame = (key) => new Promise((resolve) => {
          const done = () => resolve(true);
          deck.addEventListener('lectureframe', done, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true }));
        });
        await waitFrame('ArrowRight');
        const scene = deck.querySelector('.lecture-scene.on');
        const callout = scene.querySelector('[data-scene-callout]');
        const state = {
          effect: scene.dataset.sceneEffect,
          cue: scene.querySelector('[data-scene-cue]')?.textContent.trim(),
          callout: callout?.textContent.trim(),
          calloutVisible: callout?.classList.contains('on'),
          visible: scene.querySelectorAll('[data-scene-visible="true"]').length,
          hash: location.hash,
        };
        return state;
      })()`));
      await save(session, "07-lecture-annotation", false);
      annotationState.clearedAfterBack = Boolean(value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        await new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowLeft', bubbles:true }));
        });
        const callout = document.querySelector('.lecture-scene.on [data-scene-callout]');
        return !callout.classList.contains('on') && callout.textContent === '';
      })()`)));
      record(
        `${viewport.id} annotate 판단 문장`,
        annotationState?.effect === "annotate" &&
          annotationState?.cue === "판단 기준" &&
          annotationState?.calloutVisible === true &&
          annotationState?.callout?.includes("마우스를 잡은 사람이 없어도") &&
          annotationState?.visible === 1 &&
          annotationState?.hash === "#lecture=s1.3" &&
          annotationState?.clearedAfterBack === true,
        JSON.stringify(annotationState),
      );

      if (viewport.hasTouch) {
        const swipeState = value(await evaluate(session, `(async () => {
          const deck = document.querySelector('[data-lecture-deck]');
          const stage = deck.querySelector('.lecture-stage');
          const before = deck.querySelector('[data-lecture-progress]').textContent.trim();
          await new Promise((resolve) => {
            deck.addEventListener('lectureframe', resolve, { once:true });
            stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, isPrimary:true, clientX:330, clientY:400 }));
            stage.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, isPrimary:true, clientX:40, clientY:405 }));
          });
          const after = deck.querySelector('[data-lecture-progress]').textContent.trim();
          const hash = location.hash;
          await new Promise((resolve) => {
            deck.addEventListener('lectureframe', resolve, { once:true });
            document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowLeft', bubbles:true }));
          });
          return { before, after, hash, restored:location.hash };
        })()`));
        record(
          `${viewport.id} 좌우 스와이프 이동`,
          /· 2 \/ 11$/.test(swipeState?.before ?? "") &&
            /· 3 \/ 11$/.test(swipeState?.after ?? "") &&
            swipeState?.hash === "#lecture=s1.3" &&
            swipeState?.restored === "#lecture=s1.2",
          JSON.stringify(swipeState),
        );
      }

      const lecturePerf = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const durations = [];
        const shifts = [];
        const longTasks = [];
        const observers = [];
        const domBefore = document.querySelectorAll('*').length;
        if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
          const observer = new PerformanceObserver((list) => list.getEntries().forEach((entry) => shifts.push(entry.value)));
          observer.observe({ type:'layout-shift', buffered:false });
          observers.push(observer);
        }
        if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
          const observer = new PerformanceObserver((list) => list.getEntries().forEach((entry) => longTasks.push(entry.duration)));
          observer.observe({ type:'longtask', buffered:false });
          observers.push(observer);
        }
        const step = (key) => new Promise((resolve) => {
          const started = performance.now();
          deck.addEventListener('lectureframe', () => {
            durations.push(performance.now() - started);
            resolve(true);
          }, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true }));
        });
        for (let i = 0; i < ${SOAK_STEPS}; i += 1) {
          await step(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
        }
        observers.forEach((observer) => observer.disconnect());
        const sorted = [...durations].sort((a, b) => a - b);
        const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)] || 0;
        return {
          samples: durations.length,
          p95: Math.round(p95 * 10) / 10,
          max: Math.round(Math.max(...durations) * 10) / 10,
          layoutShift: Math.round(shifts.reduce((sum, value) => sum + value, 0) * 10000) / 10000,
          longTasks: longTasks.length,
          domBefore,
          domAfter: document.querySelectorAll('*').length,
          phase: deck.dataset.scenePhase,
        };
      })()`));
      record(
        `${viewport.id} ${SOAK_STEPS}회 지속 전환 성능`,
        lecturePerf?.samples === SOAK_STEPS &&
          lecturePerf?.p95 <= 90 &&
          lecturePerf?.max <= 140 &&
          lecturePerf?.layoutShift <= 0.01 &&
          lecturePerf?.longTasks === 0 &&
          lecturePerf?.domBefore === lecturePerf?.domAfter &&
          lecturePerf?.phase === "ready",
        JSON.stringify(lecturePerf),
      );
      console.log(`    ${viewport.id} p95 ${lecturePerf?.p95}ms, max ${lecturePerf?.max}ms, layout shift ${lecturePerf?.layoutShift}, long task ${lecturePerf?.longTasks}`);

      await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-notes-toggle]", expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      const noteState = value(await evaluate(session, `(() => {
        const note = document.querySelector('[data-lecture-notes]');
        const stage = document.querySelector('.lecture-stage')?.getBoundingClientRect();
        const scene = document.querySelector('.lecture-scene.on')?.getBoundingClientRect();
        const rect = note?.getBoundingClientRect();
        return {
          hidden: note?.hidden,
          length: note?.textContent.trim().length ?? 0,
          docked: document.querySelector('[data-lecture-deck]')?.classList.contains('notes-on'),
          meta: note?.querySelector('[data-lecture-notes-meta]')?.textContent.trim(),
          elapsed: note?.querySelector('[data-lecture-elapsed]')?.textContent.trim(),
          timerRunning: document.querySelector('[data-lecture-deck]')?.dataset.timerRunning,
          nextLabel: note?.querySelector('[data-lecture-notes-next-label]')?.textContent.trim(),
          next: note?.querySelector('[data-lecture-notes-next]')?.textContent.trim(),
          rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
          stage: stage ? { left: stage.left, top: stage.top, right: stage.right, bottom: stage.bottom } : null,
          scene: scene ? { left: scene.left, top: scene.top, right: scene.right, bottom: scene.bottom } : null,
        };
      })()`));
      record(
        `${viewport.id} 비트별 발표자 노트`,
        noteState?.hidden === false &&
          noteState?.length > 40 &&
          noteState?.docked === true &&
          /^장면 01 \/ 12 · 클릭 2 \/ 11$/.test(noteState?.meta ?? "") &&
          /^(?:\d{2}:)?\d{2}:\d{2}$/.test(noteState?.elapsed ?? "") &&
          noteState?.timerRunning === "true" &&
          noteState?.nextLabel === "다음 클릭" &&
          noteState?.next?.length > 10 &&
          noteState?.rect?.height > 120 &&
          noteState?.rect?.bottom <= noteState?.stage?.bottom + 1 &&
          (viewport.presenterColumns === 2
            ? noteState?.scene?.right <= noteState?.rect?.left + 1
            : noteState?.rect?.width >= viewport.width - 2),
        JSON.stringify(noteState),
      );
      await save(session, "08-lecture-notes", false);

      if (viewport.id === "desktop") {
        const timerControl = value(await evaluate(session, `(async () => {
          const deck = document.querySelector('[data-lecture-deck]');
          const parse = (text) => text.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
          deck.querySelector('[data-lecture-timer-toggle]').click();
          const pausedAt = parse(deck.querySelector('[data-lecture-elapsed]').textContent.trim());
          await new Promise((resolve) => setTimeout(resolve, 1100));
          const pausedAfter = parse(deck.querySelector('[data-lecture-elapsed]').textContent.trim());
          const pausedRunning = deck.dataset.timerRunning;
          deck.querySelector('[data-lecture-timer-reset]').click();
          await new Promise((resolve) => setTimeout(resolve, 120));
          const resetAt = parse(deck.querySelector('[data-lecture-elapsed]').textContent.trim());
          return { pausedAt, pausedAfter, pausedRunning, resetAt, resetRunning:deck.dataset.timerRunning };
        })()`));
        record(
          "desktop 발표 시간 일시정지와 초기화",
          timerControl?.pausedAfter === timerControl?.pausedAt &&
            timerControl?.pausedRunning === "false" &&
            timerControl?.resetAt <= 1 &&
            timerControl?.resetRunning === "true",
          JSON.stringify(timerControl),
        );
        const nextScenePreview = value(await evaluate(session, `(async () => {
          const deck = document.querySelector('[data-lecture-deck]');
          const move = (key) => new Promise((resolve) => {
            deck.addEventListener('lectureframe', resolve, { once:true });
            document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true }));
          });
          for (let index = 0; index < 9; index += 1) await move('ArrowRight');
          const state = {
            label:deck.querySelector('[data-lecture-notes-next-label]')?.textContent.trim(),
            next:deck.querySelector('[data-lecture-notes-next]')?.textContent.trim(),
            progress:deck.querySelector('[data-lecture-progress]')?.textContent.trim(),
          };
          await move('Home');
          await move('ArrowRight');
          await move('ArrowRight');
          return state;
        })()`));
        record(
          "desktop 다음 장면 제목 예고",
          nextScenePreview?.label === "다음 장면" &&
            nextScenePreview?.next === "02. 브라우저 자동화" &&
            nextScenePreview?.progress === "01 / 12 · 11 / 11",
          JSON.stringify(nextScenePreview),
        );
      }

      await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-notes-toggle]", expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      const audienceBefore = value(await evaluate(session, `(() => {
        const scene = document.querySelector('.lecture-scene.on')?.getBoundingClientRect();
        return {
          scene:scene ? { left:scene.left, top:scene.top, width:scene.width, height:scene.height } : null,
          notesHidden:document.querySelector('[data-lecture-notes]')?.hidden,
          progress:document.querySelector('[data-lecture-progress]')?.textContent.trim(),
        };
      })()`));
      const popupBlocked = value(await evaluate(session, `(() => {
        const original = window.open;
        window.open = () => null;
        document.querySelector('[data-lecture-presenter]').click();
        window.open = original;
        const alert = document.querySelector('[data-lecture-alert]');
        const state = {
          hidden:alert?.hidden,
          message:alert?.textContent.trim(),
          pressed:document.querySelector('[data-lecture-presenter]')?.getAttribute('aria-pressed'),
        };
        alert.hidden = true;
        return state;
      })()`));
      record(
        `${viewport.id} 팝업 차단 화면 안내`,
        popupBlocked?.hidden === false &&
          popupBlocked?.message === "팝업을 허용한 뒤 발표자 창을 다시 열어 주세요" &&
          popupBlocked?.pressed === "false",
        JSON.stringify(popupBlocked),
      );
      const popupClick = await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-presenter]", popup: true, timeoutMs: 15000, expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      const popup = popupClick.output?.actions?.[0]?.result?.popup;
      const presenterUrl = popup?.url ?? "";
      const parsedPresenter = presenterUrl ? new URL(presenterUrl) : null;
      record(
        `${viewport.id} 실제 발표자 팝업 진입`,
        Boolean(popup?.targetRef) &&
          parsedPresenter?.searchParams.get("presenter") === "1" &&
          parsedPresenter?.hash === "#lecture=s1.2" &&
          parsedPresenter?.origin === new URL(base).origin,
        JSON.stringify(popup),
      );
      if (popup?.targetRef) {
        const presenterSession = (await client.attachSession(popup.targetRef, { timeoutMs: 30000 })).output;
        await client.act(
          presenterSession,
          [{ kind: "waitFor", selector: '[data-lecture-deck][data-presenter-window="true"][data-scene-phase="ready"]', timeoutMs: 15000, expectedRisk: "read" }],
          { timeoutMs: 30000 },
        );
        const presenterState = value(await evaluate(presenterSession, `(() => {
          const deck = document.querySelector('[data-lecture-deck]');
          const notes = deck?.querySelector('[data-lecture-notes]');
          const stage = deck?.querySelector('.lecture-stage');
          const hidden = (selector) => getComputedStyle(deck.querySelector(selector)).display === 'none';
          return {
            mode: deck?.dataset.presenterWindow,
            notesHidden: notes?.hidden,
            notesLength: notes?.textContent.trim().length,
            progress: deck?.querySelector('[data-lecture-progress]')?.textContent.trim(),
            width: innerWidth,
            columns: getComputedStyle(stage).gridTemplateColumns.split(' ').filter(Boolean).length,
            rows: getComputedStyle(stage).gridTemplateRows.split(' ').filter(Boolean).length,
            mapItems: deck?.querySelectorAll('[data-lecture-map-scene]').length,
            elapsed: deck?.querySelector('[data-lecture-elapsed]')?.textContent.trim(),
            timerRunning: deck?.dataset.timerRunning,
            nextLabel: deck?.querySelector('[data-lecture-notes-next-label]')?.textContent.trim(),
            presenterHidden: hidden('[data-lecture-presenter]'),
            fullscreenHidden: hidden('[data-lecture-fullscreen]'),
            noteButtonHidden: hidden('[data-lecture-notes-toggle]'),
            activeInert: deck?.querySelector('.lecture-scene.on')?.hasAttribute('inert'),
          };
        })()`));
        const audienceDuring = value(await evaluate(session, `(() => {
          const scene = document.querySelector('.lecture-scene.on')?.getBoundingClientRect();
          return {
            scene:scene ? { left:scene.left, top:scene.top, width:scene.width, height:scene.height } : null,
            notesHidden:document.querySelector('[data-lecture-notes]')?.hidden,
            presenterPressed:document.querySelector('[data-lecture-presenter]')?.getAttribute('aria-pressed'),
          };
        })()`));
        const audienceStable = audienceBefore?.notesHidden === true &&
          audienceDuring?.notesHidden === true &&
          audienceDuring?.presenterPressed === "true" &&
          ["left", "top", "width", "height"].every((key) =>
            Math.abs((audienceBefore?.scene?.[key] ?? 0) - (audienceDuring?.scene?.[key] ?? 0)) <= 1
          );
        record(
          `${viewport.id} 분리 발표자 보기와 관객 무대 고정`,
          presenterState?.mode === "true" &&
            presenterState?.notesHidden === false &&
            presenterState?.notesLength > 40 &&
            /· 2 \/ 11$/.test(presenterState?.progress ?? "") &&
            presenterState?.columns === (presenterState?.width > 980 ? 2 : 1) &&
            presenterState?.rows === (presenterState?.width > 980 ? 1 : 2) &&
            presenterState?.mapItems === 12 &&
            /^(?:\d{2}:)?\d{2}:\d{2}$/.test(presenterState?.elapsed ?? "") &&
            presenterState?.timerRunning === "true" &&
            presenterState?.nextLabel === "다음 클릭" &&
            presenterState?.presenterHidden === true &&
            presenterState?.fullscreenHidden === true &&
            presenterState?.noteButtonHidden === true &&
            presenterState?.activeInert === false &&
            audienceStable,
          JSON.stringify({ presenterState, audienceBefore, audienceDuring }),
        );
        await save(presenterSession, "13-presenter-window", false);
        await save(session, "13-audience-with-presenter", false);

        const waitPresenter = evaluate(presenterSession, `new Promise((resolve) => {
          const deck = document.querySelector('[data-lecture-deck]');
          const timer = setTimeout(() => resolve(false), 3000);
          deck.addEventListener('lectureframe', () => { clearTimeout(timer); resolve(true); }, { once:true });
        })()`);
        await evaluate(session, `document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }))`);
        await waitPresenter;
        const syncedForward = value(await evaluate(presenterSession, `(() => ({
          progress:document.querySelector('[data-lecture-progress]')?.textContent.trim(),
          hash:location.hash,
          effect:document.querySelector('.lecture-scene.on')?.dataset.sceneEffect,
        }))()`));
        const waitAudience = evaluate(session, `new Promise((resolve) => {
          const deck = document.querySelector('[data-lecture-deck]');
          const timer = setTimeout(() => resolve(false), 3000);
          deck.addEventListener('lectureframe', () => { clearTimeout(timer); resolve(true); }, { once:true });
        })()`);
        await evaluate(presenterSession, `document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowLeft', bubbles:true }))`);
        await waitAudience;
        const syncedBack = value(await evaluate(session, `(() => ({
          progress:document.querySelector('[data-lecture-progress]')?.textContent.trim(),
          hash:location.hash,
          effect:document.querySelector('.lecture-scene.on')?.dataset.sceneEffect,
        }))()`));
        record(
          `${viewport.id} 실제 두 창 양방향 동기화`,
          /· 3 \/ 11$/.test(syncedForward?.progress ?? "") &&
            syncedForward?.hash === "#lecture=s1.3" &&
            syncedForward?.effect === "annotate" &&
            /· 2 \/ 11$/.test(syncedBack?.progress ?? "") &&
            syncedBack?.hash === "#lecture=s1.2" &&
            syncedBack?.effect === "run",
          JSON.stringify({ forward:syncedForward, back:syncedBack }),
        );

        const waitMapAudience = evaluate(session, `new Promise((resolve) => {
          const deck = document.querySelector('[data-lecture-deck]');
          const timer = setTimeout(() => resolve(false), 3000);
          deck.addEventListener('lectureframe', () => { clearTimeout(timer); resolve(true); }, { once:true });
        })()`);
        await evaluate(presenterSession, `(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'m', bubbles:true }));
          document.querySelector('[data-lecture-map-scene="1"]').click();
        })()`);
        await waitMapAudience;
        const mapSynced = {
          audience: value(await evaluate(session, `(() => ({
            progress:document.querySelector('[data-lecture-progress]')?.textContent.trim(),
            title:document.querySelector('.lecture-scene.on h2')?.textContent.trim(),
          }))()`)),
          presenter: value(await evaluate(presenterSession, `(() => ({
            progress:document.querySelector('[data-lecture-progress]')?.textContent.trim(),
            title:document.querySelector('.lecture-scene.on h2')?.textContent.trim(),
            mapHidden:document.querySelector('[data-lecture-map]')?.hidden,
          }))()`)),
        };
        record(
          `${viewport.id} 발표자 장면 지도 즉시 이동`,
          /^02 \/ 12 · 0 \/ \d+$/.test(mapSynced.audience?.progress ?? "") &&
            mapSynced.audience?.title === "브라우저 자동화" &&
            mapSynced.presenter?.progress === mapSynced.audience?.progress &&
            mapSynced.presenter?.title === mapSynced.audience?.title &&
            mapSynced.presenter?.mapHidden === true,
          JSON.stringify(mapSynced),
        );
        for (const key of ["Home", "ArrowRight", "ArrowRight"]) {
          const waitRestore = evaluate(session, `new Promise((resolve) => {
            const deck = document.querySelector('[data-lecture-deck]');
            const timer = setTimeout(() => resolve(false), 3000);
            deck.addEventListener('lectureframe', () => { clearTimeout(timer); resolve(true); }, { once:true });
          })()`);
          await evaluate(presenterSession, `document.dispatchEvent(new KeyboardEvent('keydown', { key:${JSON.stringify(key)}, bubbles:true }))`);
          await waitRestore;
        }

        await evaluate(presenterSession, `document.dispatchEvent(new KeyboardEvent('keydown', { key:'b', bubbles:true }))`);
        await evaluate(session, `new Promise((resolve) => setTimeout(resolve, 220))`);
        const blankSynced = {
          audience: value(await evaluate(session, `(() => ({
            blanked:document.querySelector('[data-lecture-deck]')?.dataset.audienceBlanked,
            hidden:document.querySelector('[data-lecture-break]')?.hidden,
            stageInert:document.querySelector('.lecture-stage')?.hasAttribute('inert'),
          }))()`)),
          presenter: value(await evaluate(presenterSession, `(() => ({
            blanked:document.querySelector('[data-lecture-deck]')?.dataset.audienceBlanked,
            hidden:document.querySelector('[data-lecture-break]')?.hidden,
            stageInert:document.querySelector('.lecture-stage')?.hasAttribute('inert'),
          }))()`)),
        };
        await evaluate(presenterSession, `document.dispatchEvent(new KeyboardEvent('keydown', { key:'b', bubbles:true }))`);
        await evaluate(session, `new Promise((resolve) => setTimeout(resolve, 220))`);
        const blankRestored = value(await evaluate(session, `(() => ({
          blanked:document.querySelector('[data-lecture-deck]')?.dataset.audienceBlanked,
          hidden:document.querySelector('[data-lecture-break]')?.hidden,
          stageInert:document.querySelector('.lecture-stage')?.hasAttribute('inert'),
        }))()`));
        record(
          `${viewport.id} 발표자 관객 집중 화면 동기화`,
          blankSynced.audience?.blanked === "true" &&
            blankSynced.audience?.hidden === false &&
            blankSynced.audience?.stageInert === true &&
            blankSynced.presenter?.blanked === "true" &&
            blankSynced.presenter?.hidden === true &&
            blankSynced.presenter?.stageInert === false &&
            blankRestored?.blanked === "false" &&
            blankRestored?.hidden === true &&
            blankRestored?.stageInert === false,
          JSON.stringify({ blankSynced, blankRestored }),
        );

        await evaluate(presenterSession, `document.querySelector('[data-lecture-timer-toggle]').click()`);
        await evaluate(session, `new Promise((resolve) => setTimeout(resolve, 620))`);
        const timerPaused = {
          audience: value(await evaluate(session, `(() => ({
            running:document.querySelector('[data-lecture-deck]')?.dataset.timerRunning,
            elapsed:document.querySelector('[data-lecture-elapsed]')?.textContent.trim(),
          }))()`)),
          presenter: value(await evaluate(presenterSession, `(() => ({
            running:document.querySelector('[data-lecture-deck]')?.dataset.timerRunning,
            elapsed:document.querySelector('[data-lecture-elapsed]')?.textContent.trim(),
          }))()`)),
        };
        await evaluate(presenterSession, `document.querySelector('[data-lecture-timer-toggle]').click()`);
        await evaluate(session, `new Promise((resolve) => setTimeout(resolve, 220))`);
        const timerResumed = value(await evaluate(session, `document.querySelector('[data-lecture-deck]')?.dataset.timerRunning`));
        record(
          `${viewport.id} 발표 시간 두 창 동기화`,
          timerPaused.audience?.running === "false" &&
            timerPaused.presenter?.running === "false" &&
            timerPaused.audience?.elapsed === timerPaused.presenter?.elapsed &&
            timerResumed === "true",
          JSON.stringify({ timerPaused, timerResumed }),
        );

        await evaluate(presenterSession, `location.hash = '#lecture=s1.1'; location.reload()`, false);
        await client.act(
          presenterSession,
          [{ kind: "waitFor", selector: '[data-lecture-deck][data-presenter-window="true"][data-scene-phase="ready"]', timeoutMs: 15000, expectedRisk: "read" }],
          { timeoutMs: 30000 },
        );
        await evaluate(presenterSession, `new Promise((resolve) => setTimeout(resolve, 600))`);
        const presenterRecovered = value(await evaluate(presenterSession, `(() => ({
          progress:document.querySelector('[data-lecture-progress]')?.textContent.trim(),
          hash:location.hash,
          effect:document.querySelector('.lecture-scene.on')?.dataset.sceneEffect,
        }))()`));
        record(
          `${viewport.id} 발표자 창 새로고침 복구`,
          /· 2 \/ 11$/.test(presenterRecovered?.progress ?? "") &&
            presenterRecovered?.hash === "#lecture=s1.2" &&
            presenterRecovered?.effect === "run",
          JSON.stringify(presenterRecovered),
        );
        await evaluate(presenterSession, `window.close()`, false).catch(() => {});
        await client.act(
          session,
          [{ kind: "waitFor", selector: '[data-lecture-presenter][aria-pressed="false"]', timeoutMs: 5000, expectedRisk: "read" }],
          { timeoutMs: 10000 },
        );
        const presenterClosed = value(await evaluate(session, `(() => ({
          pressed:document.querySelector('[data-lecture-presenter]')?.getAttribute('aria-pressed'),
          label:document.querySelector('[data-lecture-presenter]')?.getAttribute('aria-label'),
        }))()`));
        record(
          `${viewport.id} 발표자 창 종료 복구`,
          presenterClosed?.pressed === "false" && presenterClosed?.label === "발표자 창 열기",
          JSON.stringify(presenterClosed),
        );
        await evaluate(session, `location.href = ${JSON.stringify(presenterUrl)}`, false);
        await client.act(
          session,
          [{ kind: "waitFor", selector: '[data-lecture-deck][data-presenter-window="true"][data-scene-phase="ready"]', timeoutMs: 15000, expectedRisk: "read" }],
          { timeoutMs: 30000 },
        );
        const responsivePresenter = value(await evaluate(session, `(() => {
          const deck = document.querySelector('[data-lecture-deck]');
          const stage = deck?.querySelector('.lecture-stage');
          const notes = deck?.querySelector('[data-lecture-notes]');
          const scene = deck?.querySelector('.lecture-scene.on');
          const noteRect = notes?.getBoundingClientRect();
          const sceneRect = scene?.getBoundingClientRect();
          return {
            width:innerWidth,
            height:innerHeight,
            columns:getComputedStyle(stage).gridTemplateColumns.split(' ').filter(Boolean).length,
            rows:getComputedStyle(stage).gridTemplateRows.split(' ').filter(Boolean).length,
            notesHidden:notes?.hidden,
            noteRect:noteRect ? { top:noteRect.top, bottom:noteRect.bottom, width:noteRect.width, height:noteRect.height } : null,
            sceneRect:sceneRect ? { top:sceneRect.top, bottom:sceneRect.bottom, width:sceneRect.width, height:sceneRect.height } : null,
          };
        })()`));
        record(
          `${viewport.id} 현장 규격 발표자 배치`,
          responsivePresenter?.width === viewport.width &&
            responsivePresenter?.height === viewport.height &&
            responsivePresenter?.columns === viewport.presenterColumns &&
            responsivePresenter?.rows === (viewport.presenterColumns === 1 ? 2 : 1) &&
            responsivePresenter?.notesHidden === false &&
            responsivePresenter?.noteRect?.height >= 160 &&
            responsivePresenter?.sceneRect?.height >= 160 &&
            responsivePresenter?.noteRect?.bottom <= responsivePresenter?.height + 1 &&
            (viewport.presenterColumns === 1
              ? responsivePresenter?.sceneRect?.bottom <= responsivePresenter?.noteRect?.top + 1
              : responsivePresenter?.sceneRect?.width + responsivePresenter?.noteRect?.width <= viewport.width + 1),
          JSON.stringify(responsivePresenter),
        );
        await save(session, "14-presenter-responsive", false);
        const audienceUrl = new URL(presenterUrl);
        audienceUrl.searchParams.delete("presenter");
        audienceUrl.hash = "#lecture=s1.2";
        await evaluate(session, `location.href = ${JSON.stringify(audienceUrl.toString())}`, false);
        await client.act(
          session,
          [{ kind: "waitFor", selector: '[data-lecture-deck]:not([data-presenter-window])[data-scene-phase="ready"]', timeoutMs: 15000, expectedRisk: "read" }],
          { timeoutMs: 30000 },
        );
      }

      const boundaryState = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const waitKey = (key) => new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true }));
        });
        await waitKey('End');
        const end = {
          prev:deck.querySelector('[data-lecture-prev]').disabled,
          next:deck.querySelector('[data-lecture-next]').disabled,
          status:deck.querySelector('[data-lecture-status]').textContent.trim(),
        };
        await waitKey('Home');
        const start = {
          prev:deck.querySelector('[data-lecture-prev]').disabled,
          next:deck.querySelector('[data-lecture-next]').disabled,
          status:deck.querySelector('[data-lecture-status]').textContent.trim(),
        };
        return { end, start };
      })()`));
      record(
        `${viewport.id} 시작과 끝 조작 상태`,
        boundaryState?.end?.prev === false &&
          boundaryState?.end?.next === true &&
          /장면 12 \/ 12/.test(boundaryState?.end?.status ?? "") &&
          boundaryState?.start?.prev === true &&
          boundaryState?.start?.next === false &&
          boundaryState?.start?.status?.includes("제목 화면"),
        JSON.stringify(boundaryState),
      );

      await client.act(
        session,
        [{ kind: "click", selector: "[data-lecture-close]", expectedRisk: "externalEffect" }],
        { timeoutMs: 30000 },
      );
      const lectureClosed = value(await evaluate(session, `(() => ({
        hidden: document.querySelector('[data-lecture-deck]')?.hidden,
        body: document.body.classList.contains('lecture-on'),
      }))()`));
      record(`${viewport.id} 강의 모드 종료`, lectureClosed?.hidden === true && lectureClosed?.body === false, JSON.stringify(lectureClosed));
    }

    // 강의장 모든 상태에서 같은 아이콘 토글을 쓰고, 선택한 테마를 html과 브라우저 기본 UI에 같이 건다.
    const lightTheme = value(
      await evaluate(
        session,
        `(async () => {
          const button = document.querySelector('[data-theme-toggle]');
          if (!button) return null;
          if (document.documentElement.dataset.theme !== 'dark') button.click();
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            buttons: document.querySelectorAll('[data-theme-toggle]').length,
            visibleButtons: [...document.querySelectorAll('[data-theme-toggle]')].filter((item) => item.getClientRects().length > 0).length,
            theme: document.documentElement.dataset.theme,
            next: button.dataset.nextTheme,
            label: button.getAttribute('aria-label'),
            scheme: getComputedStyle(document.documentElement).colorScheme,
          };
        })()`,
      ),
    );
    record(
      `${viewport.id} 라이트 테마`,
      lightTheme?.buttons === 2 &&
        lightTheme?.visibleButtons === 1 &&
        lightTheme?.theme === "light" &&
        lightTheme?.next === "dark" &&
        lightTheme?.label === "다크 테마로 변경" &&
        lightTheme?.scheme === "light",
      JSON.stringify(lightTheme),
    );
    await evaluate(session, `location.reload()`, false);
    await client.act(
      session,
      [{ kind: "waitFor", selector: ".body h1", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    const persistedTheme = value(
      await evaluate(
        session,
        `(() => ({
          theme: document.documentElement.dataset.theme,
          buttons: document.querySelectorAll('[data-theme-toggle]').length,
          visibleButtons: [...document.querySelectorAll('[data-theme-toggle]')].filter((item) => item.getClientRects().length > 0).length,
          next: document.querySelector('[data-theme-toggle]')?.dataset.nextTheme,
          label: document.querySelector('[data-theme-toggle]')?.getAttribute('aria-label'),
        }))()`,
      ),
    );
    record(
      `${viewport.id} 라이트 테마 새로고침 유지`,
        persistedTheme?.theme === "light" &&
        persistedTheme?.buttons === 2 &&
        persistedTheme?.visibleButtons === 1 &&
        persistedTheme?.next === "dark" &&
        persistedTheme?.label === "다크 테마로 변경",
      JSON.stringify(persistedTheme),
    );
    await save(session, "03-theme-light");

    const darkTheme = value(
      await evaluate(
        session,
        `(async () => {
          const button = document.querySelector('[data-theme-toggle]');
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            theme: document.documentElement.dataset.theme,
            buttons: document.querySelectorAll('[data-theme-toggle]').length,
            visibleButtons: [...document.querySelectorAll('[data-theme-toggle]')].filter((item) => item.getClientRects().length > 0).length,
            next: button.dataset.nextTheme,
            label: button.getAttribute('aria-label'),
            scheme: getComputedStyle(document.documentElement).colorScheme,
          };
        })()`,
      ),
    );
    record(
      `${viewport.id} 다크 테마`,
        darkTheme?.theme === "dark" &&
        darkTheme?.buttons === 2 &&
        darkTheme?.visibleButtons === 1 &&
        darkTheme?.next === "light" &&
        darkTheme?.label === "라이트 테마로 변경" &&
        darkTheme?.scheme === "dark",
      JSON.stringify(darkTheme),
    );
    await save(session, "03-theme-dark");

    const storageTheme = value(await evaluate(session, `(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'eddmpython-classroom-theme',
        newValue: 'light',
      }));
      return {
        theme: document.documentElement.dataset.theme,
        labels: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.getAttribute('aria-label')),
      };
    })()`));
    record(
      `${viewport.id} 다른 탭 테마 동기화`,
        storageTheme?.theme === "light" &&
        storageTheme?.labels?.length === 2 &&
        storageTheme?.labels?.every((label) => label === "다크 테마로 변경"),
      JSON.stringify(storageTheme),
    );

    await evaluate(session, `localStorage.removeItem('eddmpython-classroom-theme'); location.reload()`, false);
    await client.act(
      session,
      [{ kind: "waitFor", selector: ".body h1", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    // 고른 적이 없으면 라이트다. 보는 사람의 OS 설정을 따라가지 않는다.
    const defaultTheme = value(await evaluate(session, `(() => ({
      theme: document.documentElement.dataset.theme,
      scheme: getComputedStyle(document.documentElement).colorScheme,
      system: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      buttons: document.querySelectorAll('[data-theme-toggle]').length,
    }))()`));
    record(
      `${viewport.id} 기본 라이트 테마`,
      defaultTheme?.theme === "light" &&
        defaultTheme?.scheme === "light" &&
        defaultTheme?.buttons === 2,
      JSON.stringify(defaultTheme),
    );

    // 확대가 실제로 열리는지 본다. 강의 중에 화면에 띄우는 기능이라 그림만으로는 못 믿는다.
    const zoomed = await evaluate(
      session,
      `(async () => {
        const img = document.querySelector('article img');
        if (!img) return 'no-image';
        img.click();
        await new Promise((r) => setTimeout(r, 150));
        return document.getElementById('zoom').classList.contains('on') ? 'on' : 'off';
      })()`,
    );
    const zoomState = value(zoomed);
    record(`${viewport.id} 시각 자산 확대`, zoomState === "on", zoomState);
    if (zoomState === "on") await save(session, "04-zoom");

    // 가로가 넓고 세로가 낮은 강의 화면에서도 시각물은 본문 폭의 왼쪽이 아니라 무대 중앙에 놓여야 한다.
    const comparePost = value(
      await evaluate(
        session,
        `(() => [...document.querySelectorAll('a.nav-post')]
          .find((link) => link.getAttribute('href')?.endsWith('-what-is-python'))
          ?.getAttribute('href') ?? null)()`,
      ),
    );
    if (!comparePost) throw new Error("what-is-python 비교 장면 글 링크를 못 찾았다");
    await evaluate(
      session,
      `localStorage.setItem('eddmpython-classroom-theme', 'light'); location.href = ${JSON.stringify(`${base}${comparePost}#lecture=s2.1`)}`,
      false,
    );
    await client.act(
      session,
      [{ kind: "waitFor", selector: ".lecture-scene.on [data-scene-visible=\"true\"]", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    await hydrate(session);
    const balancedStage = value(await evaluate(session, `(() => {
      const deck = document.querySelector('[data-lecture-deck]');
      const stage = deck?.querySelector('.lecture-stage');
      const scene = deck?.querySelector('.lecture-scene.on');
      const visual = scene?.querySelector('[data-scene-visible="true"]');
      const media = visual?.querySelector('img, video, iframe') ?? visual;
      const brand = deck?.querySelector('.lecture-brand');
      const box = (node) => {
        const rect = node?.getBoundingClientRect();
        return rect ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
          center: rect.left + rect.width / 2,
        } : null;
      };
      const mediaBox = box(media);
      return {
        viewport: innerWidth,
        viewportHeight: innerHeight,
        deck: box(deck),
        stage: box(stage),
        footer: box(deck?.querySelector('.lecture-foot')),
        head: box(scene?.querySelector('.scene-head')),
        canvas: box(scene?.querySelector('.scene-canvas')),
        visual: box(visual),
        media: mediaBox,
        centerGap: mediaBox ? Math.abs(mediaBox.center - innerWidth / 2) : null,
        visualStyle: visual ? {
          display: getComputedStyle(visual).display,
          width: getComputedStyle(visual).width,
          justifySelf: getComputedStyle(visual).justifySelf,
        } : null,
        mediaStyle: media ? {
          width: getComputedStyle(media).width,
          marginLeft: getComputedStyle(media).marginLeft,
          justifySelf: getComputedStyle(media).justifySelf,
        } : null,
        brandLeft: box(brand)?.left,
        brandClipped: brand ? brand.scrollWidth > brand.clientWidth : null,
      };
    })()`));
    record(
      `${viewport.id} 레이아웃별 강의 무대`,
      balancedStage?.deck?.left === 0 &&
        balancedStage?.deck?.top === 0 &&
        balancedStage?.deck?.width === balancedStage?.viewport &&
        balancedStage?.deck?.height === balancedStage?.viewportHeight &&
        balancedStage?.stage?.left === 0 &&
        balancedStage?.stage?.width === balancedStage?.viewport &&
        Math.abs(balancedStage?.footer?.bottom - balancedStage?.viewportHeight) <= 1 &&
        (viewport.wideComposition
          ? balancedStage?.head?.right < balancedStage?.canvas?.left &&
            balancedStage?.media?.center > balancedStage?.viewport / 2 + 120 &&
            balancedStage?.brandLeft >= 16 &&
            balancedStage?.brandClipped === false
          : balancedStage?.centerGap <= 4),
      JSON.stringify(balancedStage),
    );
    await save(session, "09-lecture-balanced", false);
    await evaluate(session, `(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
    })()`);
    const compareLayout = value(await evaluate(session, `(() => {
      const scene = document.querySelector('.lecture-scene.on');
      const canvas = scene?.querySelector('.scene-canvas');
      const visuals = [...(scene?.querySelectorAll('[data-scene-visible="true"]') ?? [])]
        .map((visual) => {
          const rect = visual.getBoundingClientRect();
          const style = getComputedStyle(visual);
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            center: rect.left + rect.width / 2,
            height: rect.height,
            background: style.backgroundColor,
            radius: parseFloat(style.borderTopLeftRadius),
            whiteSpace: style.whiteSpace,
          };
        });
      const labels = [...(scene?.querySelectorAll('[data-scene-label-visible="true"]') ?? [])]
        .map((label) => {
          const style = getComputedStyle(label);
          return { background: style.backgroundColor, border: style.borderBottomWidth };
        });
      return {
        activeLayout: scene?.dataset.activeLayout,
        effect: scene?.dataset.sceneEffect,
        cue: scene?.querySelector('[data-scene-cue]')?.textContent.trim(),
        columns: getComputedStyle(canvas).gridTemplateColumns.split(' ').filter(Boolean).length,
        visuals,
        labels,
      };
    })()`));
    record(
      `${viewport.id} compare 순간 열 분할`,
        compareLayout?.activeLayout === "compare" &&
        compareLayout?.effect === "compare" &&
        compareLayout?.cue === "비교" &&
        compareLayout?.visuals?.length === 2 &&
        compareLayout?.labels?.length === 2 &&
        compareLayout.labels.every((label) => label.background === "rgba(0, 0, 0, 0)" && label.border === "1px") &&
        compareLayout.visuals.every((visual) =>
          visual.background !== "rgba(0, 0, 0, 0)" &&
          visual.radius >= 6 &&
          visual.radius <= 10 &&
          visual.whiteSpace === "pre-wrap"
        ) &&
        Math.abs(compareLayout.visuals[0].height - compareLayout.visuals[1].height) <= 4 &&
        compareLayout?.columns === viewport.compareColumns &&
        (viewport.compareColumns === 2
          ? compareLayout.visuals[0].center < viewport.width / 2 &&
            compareLayout.visuals[1].center > viewport.width / 2 &&
            Math.abs(compareLayout.visuals[0].top - compareLayout.visuals[1].top) <= 4
          : compareLayout.visuals[0].bottom < compareLayout.visuals[1].top),
      JSON.stringify(compareLayout),
    );
    await save(session, "10-lecture-compare", false);

    const focusPost = value(
      await evaluate(
        session,
        `(() => [...document.querySelectorAll('a.nav-post')]
          .find((link) => link.getAttribute('href')?.endsWith('-run-python-in-vscode'))
          ?.getAttribute('href') ?? null)()`,
      ),
    );
    if (!focusPost) throw new Error("run-python-in-vscode focus 장면 글 링크를 못 찾았다");
    await evaluate(session, `location.href = ${JSON.stringify(`${base}${focusPost}#lecture=s6.2`)}`, false);
    await client.act(
      session,
      [{ kind: "waitFor", selector: '[data-lecture-deck][data-scene-phase="ready"] .lecture-scene.on [data-scene-focus="true"]', timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    const focusState = value(await evaluate(session, `(() => {
      const deck = document.querySelector('[data-lecture-deck]');
      const bar = deck?.querySelector('.lecture-bar');
      const foot = deck?.querySelector('.lecture-foot');
      const scene = document.querySelector('.lecture-scene.on');
      const visual = scene?.querySelector('[data-scene-focus="true"]');
      const title = scene?.querySelector('.scene-head > div:last-child');
      const callout = scene?.querySelector('[data-scene-callout]');
      const deckRect = deck?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      const footRect = foot?.getBoundingClientRect();
      return {
        effect: scene?.dataset.sceneEffect,
        cue: scene?.querySelector('[data-scene-cue]')?.textContent.trim(),
        visible: scene?.querySelectorAll('[data-scene-visible="true"]').length,
        focused: scene?.querySelectorAll('[data-scene-focus="true"]').length,
        filter: visual ? getComputedStyle(visual).filter : null,
        titleOpacity: title ? Number(getComputedStyle(title).opacity) : null,
        callout: callout?.textContent.trim(),
        shell: {
          scrollX: window.scrollX,
          deckTop: Math.round(deckRect?.top ?? -1),
          deckLeft: Math.round(deckRect?.left ?? -1),
          deckWidth: Math.round(deckRect?.width ?? -1),
          deckHeight: Math.round(deckRect?.height ?? -1),
          barTop: Math.round(barRect?.top ?? -1),
          barLeft: Math.round(barRect?.left ?? -1),
          barWidth: Math.round(barRect?.width ?? -1),
          footBottom: Math.round(footRect?.bottom ?? -1),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      };
    })()`));
    record(
      `${viewport.id} focus 핵심 강조`,
      focusState?.effect === "focus" &&
        focusState?.cue === "핵심" &&
        focusState?.visible === 1 &&
        focusState?.focused === 1 &&
        focusState?.filter !== "none" &&
        focusState?.titleOpacity <= 0.5 &&
        focusState?.callout === "" &&
        focusState?.shell?.scrollX === 0 &&
        focusState?.shell?.deckTop === 0 &&
        focusState?.shell?.deckLeft === 0 &&
        focusState?.shell?.deckWidth === focusState?.shell?.viewportWidth &&
        focusState?.shell?.deckHeight === focusState?.shell?.viewportHeight &&
        focusState?.shell?.barTop === 0 &&
        focusState?.shell?.barLeft === 0 &&
        focusState?.shell?.barWidth === focusState?.shell?.viewportWidth &&
        focusState?.shell?.footBottom === focusState?.shell?.viewportHeight,
      JSON.stringify(focusState),
    );
    await save(session, "11-lecture-focus", false);

    /*
     * 5) 실행 칸.
     *
     * 003 이 `값을 바꾸고 실행해 보시기 바랍니다` 라고 말하는 자리다.
     * **2026-08-20 까지 여기가 생 주소가 그대로 보이는 링크였다.** 렌더러가 codaro 주소를
     * 못 알아봤고, 교안 검사도 공개 저장소 검사도 그것을 볼 자리가 없어서 아무도 몰랐다.
     * 그림만 찍고 넘어가면 같은 일이 또 난다. 그래서 눌러서 파이썬을 돌려 본다.
     */
    const cellPost = value(
      await evaluate(
        session,
        `(() => {
          const links = [...document.querySelectorAll('a.nav-post')];
          const target = links.find((link) => link.getAttribute('href')?.endsWith('-python-basic-syntax'));
          return target?.getAttribute('href') ?? null;
        })()`,
      ),
    );
    if (!cellPost) throw new Error("python-basic-syntax 실행 칸 글 링크를 못 찾았다");
    opened = await client.openTarget(`${base}${cellPost}`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

    // URL로 장면과 beat를 복구하고, 실행 칸에 simulate와 run 효과가 실제로 이어지는지 본다.
    await evaluate(session, `location.hash = '#lecture=s2.2'; location.reload()`, false);
    await client.act(
      session,
      [{ kind: "waitFor", selector: ".lecture-scene.on", timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    const restoredLecture = value(await evaluate(session, `(() => {
      const deck = document.querySelector('[data-lecture-deck]');
      const scene = deck?.querySelector('.lecture-scene.on');
      return {
        hidden: deck?.hidden,
        scene: scene?.dataset.scene,
        progress: deck?.querySelector('[data-lecture-progress]')?.textContent.trim(),
        visual: scene?.querySelector('[data-scene-visible="true"]')?.dataset.visual,
      };
    })()`));
    record(
      `${viewport.id} 강의 위치 URL 복구`,
      restoredLecture?.hidden === false &&
        restoredLecture?.scene === "s2" &&
        /02 \/ 08 · 2 \/ 4/.test(restoredLecture?.progress ?? "") &&
        restoredLecture?.visual === "2",
      JSON.stringify(restoredLecture),
    );

    await evaluate(session, `document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }))`);
    const simulated = value(await evaluate(session, `(() => {
      const scene = document.querySelector('.lecture-scene.on');
      const visual = scene?.querySelector('[data-scene-visible="true"]');
      return {
        live: visual?.dataset.sceneLive,
        effect: scene?.dataset.sceneEffect,
        cue: scene?.querySelector('[data-scene-cue]')?.textContent.trim(),
        progress: document.querySelector('[data-lecture-progress]')?.textContent.trim(),
      };
    })()`));
    record(
      `${viewport.id} simulate 효과`,
      simulated?.live === "true" &&
        simulated?.effect === "simulate" &&
        simulated?.cue === "직접 조작" &&
        /· 3 \/ 4/.test(simulated?.progress ?? ""),
      JSON.stringify(simulated),
    );

    if (viewport.runPython) {
      const lectureRun = String(value(await evaluate(session, `(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
        const cell = document.querySelector('.lecture-scene.on [data-cell]');
        const st = cell.querySelector('[data-state]');
        const out = cell.querySelector('[data-out]');
        for (let i = 0; i < 200; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (st.textContent === '완료' || st.textContent === '오류') break;
        }
        return st.textContent + ' :: ' + out.textContent.slice(0, 120);
      })()`)));
      record(`${viewport.id} run 효과`, lectureRun.startsWith("완료"), lectureRun);
    }

    await client.act(
      session,
      [{ kind: "click", selector: "[data-lecture-close]", expectedRisk: "externalEffect" }],
      { timeoutMs: 30000 },
    );

    const cells = Number(
      value(await evaluate(session, `document.querySelectorAll('[data-cell]').length`)),
    );
    record(`${viewport.id} 실행 칸이 그려짐`, cells > 0, String(cells));

    const rawLink = value(
      await evaluate(session, `document.body.innerHTML.includes('codaro/run')`),
    );
    record(`${viewport.id} 생 주소가 화면에 안 보임`, rawLink === false, String(rawLink));

    // 파이썬을 실제로 돌리는 것은 데스크톱에서 한 번이면 된다. 뷰포트와 무관한 검사다.
    if (cells > 0 && viewport.runPython) {
      const ran = String(
        value(
          await evaluate(
            session,
            `(async () => {
              const cell = document.querySelector('[data-cell]');
              cell.querySelector('[data-run]').click();
              const st = cell.querySelector('[data-state]');
              const out = cell.querySelector('[data-out]');
              for (let i = 0; i < 200; i++) {
                await new Promise((r) => setTimeout(r, 500));
                const s = st.textContent;
                if (s === '완료' || s === '오류') break;
              }
              return st.textContent + ' :: ' + out.textContent.slice(0, 160);
            })()`,
          ),
        ),
      );
      record(`${viewport.id} 실행 칸이 실제로 파이썬을 돌림`, ran.startsWith("완료"), ran);
    }
    if (cells > 0) {
      const lightCell = value(await evaluate(session, `(() => {
        const root = document.documentElement;
        const button = document.querySelector('.hd [data-theme-toggle]');
        if (root.dataset.theme !== 'light') button.click();
        const code = document.querySelector('.cell-c');
        return {
          theme: root.dataset.theme,
          background: getComputedStyle(code).backgroundColor,
          foreground: getComputedStyle(code).color,
        };
      })()`));
      record(
        `${viewport.id} 라이트 실행 표면`,
        lightCell?.theme === "light" &&
          lightCell?.background !== "rgba(0, 0, 0, 0)" &&
          lightCell?.background !== lightCell?.foreground,
        JSON.stringify(lightCell),
      );
      await save(session, "05-cell-light");

      const darkCell = value(await evaluate(session, `(() => {
        const root = document.documentElement;
        document.querySelector('.hd [data-theme-toggle]').click();
        const code = document.querySelector('.cell-c');
        return {
          theme: root.dataset.theme,
          background: getComputedStyle(code).backgroundColor,
          foreground: getComputedStyle(code).color,
        };
      })()`));
      record(
        `${viewport.id} 다크 실행 표면`,
        darkCell?.theme === "dark" &&
          darkCell?.background !== "rgba(0, 0, 0, 0)" &&
          darkCell?.background !== lightCell?.background &&
          darkCell?.foreground !== lightCell?.foreground,
        JSON.stringify({ light: lightCell, dark: darkCell }),
      );
      await save(session, "05-cell-dark");
      await save(session, "05-cell");
    }
  } finally {
    await client.stop?.({ timeoutMs: 30000 });
  }
}

} finally {
  await cleanup();
}

console.log(`
강의장 화면, ${OUT}`);
if (local) console.log(`로컬 검수용 강의방은 남겨 둔다. 비밀번호 ${PASSWORD}`);
// 브라우저를 붙들고 있는 핸들이 남아 프로세스가 안 끝나는 일이 있다. 명시적으로 끝낸다.
process.exit(checks.every(Boolean) ? 0 : 1);
