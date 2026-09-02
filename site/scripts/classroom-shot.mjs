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
 * 화면 계약 표본은 영상, 이미지, 비교 장면, 실행 칸을 모두 가진 카테고리로 고정한다.
 *
 * 첫 카테고리를 고르면 00 과정 안내처럼 표 중심의 카테고리가 앞에 추가될 때 확대, 재생,
 * 비교 검사가 전부 거짓 실패한다. 아래 검사는 이미 `what-is-python` 등 이 카테고리의 글을
 * 명시적으로 찾으므로 시작점도 같은 계약으로 고른다. 전체 카테고리 도달 여부는
 * classroom-audit.mjs가 별도로 검사한다.
 */
const PROBE_CATEGORY = process.env.CR_CATEGORY ?? "01-automation-start";
const PREVIEW_ONLY = process.env.CR_PREVIEW_ONLY === "1";
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
const category = made.categories.find((candidate) => candidate.slug === PROBE_CATEGORY);
if (!category) {
  throw new Error(
    `${PROBE_CATEGORY} 카테고리가 없다. ../eddmpython-course 에서 npm run publish:local 을 먼저 돌려라`,
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

/**
 * titleMin과 visualMin은 위쪽 정보와 아래쪽 단일 시각자료 무대의 실제 렌더 하한이다.
 */
const VIEWPORTS = [
  { id: "desktop", width: 1920, height: 900, dpr: 1, isMobile: false, hasTouch: false,
    sectionTitle: "24px", titleMin: 56, visualMin: 700, runPython: true },
  { id: "projector", width: 1366, height: 768, dpr: 1, isMobile: false, hasTouch: false,
    sectionTitle: "24px", titleMin: 42, visualMin: 620, runPython: false },
  // 1366x768 화면을 브라우저 125%로 쓸 때의 유효 CSS viewport다.
  // visualMin 440: 현재 개막 비교 장면의 첫 이미지는 441px 로 그려진다.
  { id: "projector-125", width: 1093, height: 614, dpr: 1.25, isMobile: false, hasTouch: false,
    sectionTitle: "24px", titleMin: 28, visualMin: 440, runPython: false },
  { id: "tablet-landscape", width: 1180, height: 820, dpr: 1, isMobile: true, hasTouch: true,
    sectionTitle: "24px", titleMin: 36, visualMin: 540, runPython: false },
  { id: "tablet-portrait", width: 820, height: 1180, dpr: 1, isMobile: true, hasTouch: true,
    sectionTitle: "24px", titleMin: 30, visualMin: 620, runPython: false },
  { id: "mobile", width: 390, height: 844, dpr: 1, isMobile: true, hasTouch: true,
    sectionTitle: "22px", titleMin: 22, visualMin: 290, runPython: false },
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
      PREVIEW_ONLY || visualGroup !== null &&
        visualGroup.gap >= 0 &&
        visualGroup.gap <= 12 &&
        visualGroup.background !== "rgba(0, 0, 0, 0)" &&
        visualGroup.border === "2px",
      JSON.stringify(visualGroup),
    );

    // 읽기 본문과 같은 H2가 전체화면 장면이 되고 한 장표에 시각자료 하나만 보이는지 본다.
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
        const head = scene?.querySelector('.scene-head');
        const canvas = scene?.querySelector('.scene-canvas');
        const headBox = head?.getBoundingClientRect();
        const canvasBox = canvas?.getBoundingClientRect();
        const railBox = deck?.querySelector('.lecture-rail')?.getBoundingClientRect();
        const railItems = [...(deck?.querySelectorAll('[data-lecture-map-scene]') ?? [])];
        const thumbBoxes = railItems.map((item) => item.querySelector('.lecture-map-thumb')?.getBoundingClientRect());
        const slideTotal = deck?.querySelectorAll('.lecture-scene').length ?? 0;
        return {
          hidden: deck?.hidden,
          body: document.body.classList.contains('lecture-on'),
          scenes: deck?.querySelectorAll('.lecture-scene').length,
          title: scene?.querySelector('.scene-head h2')?.textContent.trim(),
          titleSize: parseFloat(getComputedStyle(scene?.querySelector('.scene-head h2')).fontSize),
          visible: scene?.querySelectorAll('[data-scene-visible="true"]').length,
          headBeforeCanvas: headBox && canvasBox ? headBox.bottom <= canvasBox.top + 1 : null,
          railFullHeight: railBox ? Math.abs(railBox.top) <= 1 && Math.abs(railBox.bottom - innerHeight) <= 1 : null,
          railItems: railItems.length,
          railThumbs: deck?.querySelectorAll('.lecture-map-thumb').length,
          slideTotal,
          railThumbsSized: thumbBoxes.every((box) => box && box.width > 60 && box.height > 34),
          railThumbsOrdered: thumbBoxes.every((box, index) => index === 0 || thumbBoxes[index - 1].bottom <= box.top + 1),
          railCurrent: deck?.querySelectorAll('[data-lecture-map-scene][aria-current="step"]').length,
          symbolWidth: deck?.querySelector('.lecture-symbol')?.getBoundingClientRect().width,
          themeButtons: document.querySelectorAll('[data-theme-toggle]').length,
          lectureThemeButtons: deck?.querySelectorAll('[data-theme-toggle]').length,
          presenterButtons: deck?.querySelectorAll('[data-lecture-presenter]').length,
          noteButtons: deck?.querySelectorAll('[data-lecture-notes-toggle]').length,
          fullscreenButtons: deck?.querySelectorAll('[data-lecture-fullscreen]').length,
          runtime: deck?.dataset.lectureRuntime,
          sceneRuntime: scene?.dataset.sceneRuntime,
          phase: deck?.dataset.scenePhase,
          activeInert: scene?.hasAttribute('inert'),
          inactiveInert: [...(deck?.querySelectorAll('.lecture-scene:not(.on)') ?? [])].every((item) => item.hasAttribute('inert')),
          removedControls: deck?.querySelectorAll('[data-lecture-prev], [data-lecture-next], [data-lecture-blank-toggle], [data-lecture-close], [data-lecture-break]').length,
          status: deck?.querySelector('[data-lecture-status]')?.textContent.trim(),
          deckHeight: Math.round(deck?.getBoundingClientRect().height ?? -1),
          viewportHeight: innerHeight,
          hash: location.hash,
          progressValue: deck?.querySelector('[data-lecture-progress]')?.getAttribute('aria-valuenow'),
          progress: deck?.querySelector('[data-lecture-progress]')?.textContent.trim(),
        };
      })()`));
      // 왼쪽 화면 축소판과 세로 정보 흐름, 단일 시각자료 화면으로 열리고 상하 크롬은 없다.
      record(
        `${viewport.id} 강의 모드 첫 장면`,
        lectureStart?.hidden === false &&
          lectureStart?.body === true &&
          lectureStart?.scenes > 0 &&
          Boolean(lectureStart?.title) &&
          lectureStart?.visible === 1 &&
          lectureStart?.headBeforeCanvas === true &&
          lectureStart?.railFullHeight === true &&
          lectureStart?.railItems === lectureStart?.slideTotal &&
          lectureStart?.railThumbs === lectureStart?.slideTotal &&
          lectureStart?.railThumbsSized === true &&
          lectureStart?.railThumbsOrdered === true &&
          lectureStart?.railCurrent === 1 &&
          lectureStart?.symbolWidth >= 20 &&
          lectureStart?.themeButtons === 2 &&
          lectureStart?.lectureThemeButtons === 1 &&
          lectureStart?.presenterButtons === 0 &&
          lectureStart?.noteButtons === 0 &&
          lectureStart?.fullscreenButtons === 1 &&
          lectureStart?.runtime === lectureStart?.sceneRuntime &&
          lectureStart?.phase === "ready" &&
          lectureStart?.activeInert === false &&
          lectureStart?.inactiveInert === true &&
          lectureStart?.removedControls === 0 &&
          /화면 1 \/ \d+/.test(lectureStart?.status ?? "") &&
          lectureStart?.deckHeight === lectureStart?.viewportHeight &&
          lectureStart?.titleSize >= viewport.titleMin &&
          lectureStart?.progressValue === "0" &&
          /^#lecture=s1\.1$/.test(lectureStart?.hash ?? "") &&
          /^01 \/ \d+$/.test(lectureStart?.progress ?? ""),
        JSON.stringify(lectureStart),
      );
      await save(session, "06-lecture-title", false);

      const railState = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const rail = deck?.querySelector('.lecture-rail');
        const stageBox = deck?.querySelector('.lecture-stage')?.getBoundingClientRect();
        const items = [...(rail?.querySelectorAll('[data-lecture-map-scene]') ?? [])];
        const currentItem = items.find((item) => item.getAttribute('aria-current') === 'step');
        const currentNumber = currentItem?.querySelector('span');
        const rect = rail?.getBoundingClientRect();
        const thumbs = items.map((item) => item.querySelector('.lecture-map-thumb'));
        return {
          items:items.length,
          thumbs:thumbs.filter(Boolean).length,
          thumbsPopulated:thumbs.every((thumb) => {
            const visual = thumb?.querySelector('.lecture-map-thumb-visual');
            return Boolean(visual?.firstElementChild || visual?.dataset.kind);
          }),
          thumbsRatio:thumbs.every((thumb) => {
            const box = thumb?.getBoundingClientRect();
            return box && stageBox && Math.abs(box.width / box.height - stageBox.width / stageBox.height) < .03;
          }),
          framesRatio:thumbs.every((thumb) => {
            const box = thumb?.querySelector('.lecture-map-thumb-frame')?.getBoundingClientRect();
            return box && Math.abs(box.width / box.height - 16 / 9) < .03;
          }),
          frameBoxes:thumbs.map((thumb) => {
            const box = thumb?.querySelector('.lecture-map-thumb-frame')?.getBoundingClientRect();
            return box ? { width:Math.round(box.width), height:Math.round(box.height) } : null;
          }),
          visualBoxes:thumbs.map((thumb) => {
            const box = thumb?.querySelector('.lecture-map-thumb-visual')?.getBoundingClientRect();
            return box ? { width:Math.round(box.width), height:Math.round(box.height) } : null;
          }),
          previewMedia:thumbs.map((thumb) => {
            const media = thumb?.querySelector('img, video');
            const box = media?.getBoundingClientRect();
            const style = media ? getComputedStyle(media) : null;
            return media ? {
              tag:media.tagName,
              complete:media.matches('img') ? media.complete : media.readyState,
              naturalWidth:media.matches('img') ? media.naturalWidth : media.videoWidth,
              width:Math.round(box?.width ?? 0),
              height:Math.round(box?.height ?? 0),
              display:style.display,
              visibility:style.visibility,
              opacity:style.opacity,
              objectFit:style.objectFit,
              transform:style.transform,
            } : null;
          }),
          previewMediaReady:thumbs.every((thumb) => {
            const media = thumb?.querySelector('img, video');
            const frame = thumb?.querySelector('.lecture-map-thumb-frame');
            if (!media) return Boolean(frame?.firstElementChild || frame?.dataset.kind);
            const box = media?.getBoundingClientRect();
            if (!box || box.width <= 0 || box.height <= 0) return false;
            return media.matches('img') ? media.complete && media.naturalWidth > 0 : media.readyState >= 1 && media.videoWidth > 0;
          }),
          copyAligned:thumbs.every((thumb) => {
            const copyBox = thumb?.querySelector('.lecture-map-thumb-copy')?.getBoundingClientRect();
            const frameBox = thumb?.querySelector('.lecture-map-thumb-frame')?.getBoundingClientRect();
            return copyBox && frameBox && Math.abs(copyBox.width - frameBox.width) <= 2;
          }),
          current:items.filter((item) => item.getAttribute('aria-current') === 'step').length,
          currentTitle:currentItem?.querySelector('b')?.textContent.trim(),
          currentNumber:currentNumber?.textContent.trim(),
          currentNumberVisible:Boolean(currentNumber?.getClientRects().length),
          fullHeight:rect ? Math.abs(rect.top) <= 1 && Math.abs(rect.bottom - innerHeight) <= 1 : false,
          topBars:deck?.querySelectorAll('.lecture-bar').length,
          bottomBars:deck?.querySelectorAll('.lecture-foot').length,
        };
      })()`));
      record(
        `${viewport.id} 상시 화면 축소판과 무크롬 무대`,
        railState?.items === lectureStart?.slideTotal &&
          railState?.thumbs === railState?.items &&
          railState?.thumbsPopulated === true &&
          railState?.thumbsRatio === true &&
          railState?.framesRatio === true &&
          railState?.copyAligned === true &&
          railState?.previewMediaReady === true &&
          railState?.current === 1 &&
          railState?.currentTitle === lectureStart?.title &&
          railState?.currentNumber === "01" &&
          railState?.currentNumberVisible === true &&
          railState?.fullHeight === true &&
          railState?.topBars === 0 &&
          railState?.bottomBars === 0,
        JSON.stringify(railState),
      );
      await save(session, "15-lecture-rail", false);
      const railNavigation = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const target = [...deck.querySelectorAll('[data-lecture-map-scene]')][1];
        const targetScene = target?.dataset.lectureMapScene;
        const sceneId = deck.querySelectorAll('.lecture-scene')[Number(targetScene)]?.dataset.scene;
        await new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          target.click();
        });
        const jumped = {
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
          title:deck.querySelector('.lecture-scene.on h2')?.textContent.trim(),
          currentScene:deck.querySelector('[data-lecture-map-scene][aria-current="step"]')?.dataset.lectureMapScene,
          hash:location.hash,
        };
        return { targetScene, expectedHash:'#lecture=' + sceneId + '.1', jumped };
      })()`));
      await save(session, "16-lecture-second", false);
      const restored = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        await new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'Home', bubbles:true }));
        });
        return location.hash;
      })()`));
      record(
        `${viewport.id} 화면 축소판 즉시 이동`,
        /^02 \/ \d+$/.test(railNavigation?.jumped?.progress ?? "") &&
          Boolean(railNavigation?.jumped?.title) &&
          railNavigation?.jumped?.currentScene === railNavigation?.targetScene &&
          railNavigation?.jumped?.hash === railNavigation?.expectedHash &&
          restored === "#lecture=s1.1",
        JSON.stringify({ ...railNavigation, restored }),
      );
      if (PREVIEW_ONLY) {
        const remainingSlides = [];
        for (let index = 2; index < lectureStart.slideTotal; index += 1) {
          const slide = value(await evaluate(session, `(async () => {
            const deck = document.querySelector('[data-lecture-deck]');
            await new Promise((resolve) => {
              deck.addEventListener('lectureframe', resolve, { once:true });
              deck.querySelectorAll('[data-lecture-map-scene]')[${index}].click();
            });
            const scene = deck.querySelector('.lecture-scene.on');
            const visual = scene?.querySelector('[data-scene-visible="true"]');
            const box = visual?.getBoundingClientRect();
            return {
              index:${index},
              title:scene?.querySelector('h2')?.textContent.trim(),
              ratio:box ? box.width / box.height : 0,
              fit:scene?.dataset.fit,
            };
          })()`));
          remainingSlides.push(slide);
          if (index === 2) await save(session, "17-lecture-third", false);
          if (index === 3) await save(session, "18-lecture-fourth", false);
        }
        record(
          `${viewport.id} 나머지 16대9 장표`,
          remainingSlides?.length === Math.max(0, lectureStart.slideTotal - 2) &&
            remainingSlides?.every((slide) => Math.abs(slide.ratio - 16 / 9) < .03 && slide.fit === "cover"),
          JSON.stringify(remainingSlides),
        );
        await evaluate(session, `(async () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
          await new Promise((resolve) => setTimeout(resolve, 80));
        })()`);
        const lectureClosed = value(await evaluate(session, `(() => ({
          hidden: document.querySelector('[data-lecture-deck]')?.hidden,
          body: document.body.classList.contains('lecture-on'),
        }))()`));
        record(`${viewport.id} 강의 모드 종료`, lectureClosed?.hidden === true && lectureClosed?.body === false, JSON.stringify(lectureClosed));
        continue;
      }

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

      // 장면은 첫 시각물이 자동으로 열린다. 제목 아래의 캡션 보조설명과 16:9 프레임을 검사한다.
      await evaluate(session, `new Promise((resolve) => setTimeout(resolve, 350))`);
      const firstBeat = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const scene = deck.querySelector('.lecture-scene.on');
        const visual = scene.querySelector('[data-scene-visible="true"]');
        const frame = visual?.querySelector('img, video, iframe, pre') ?? visual;
        const caption = visual?.querySelector('figcaption');
        const support = scene.querySelector('[data-carousel-support]');
        const supportActive = support?.querySelector('[data-carousel-description-active="true"]');
        const carouselFrame = scene.querySelector('.visual-carousel-frame');
        const label = scene.querySelector('[data-scene-label-visible="true"]');
        const subtitle = scene.querySelector('.scene-subtitle');
        const head = scene.querySelector('.scene-head');
        const labelRect = label?.getBoundingClientRect();
        const subtitleRect = subtitle?.getBoundingClientRect();
        const visualRect = visual?.getBoundingClientRect();
        const headRect = head?.getBoundingClientRect();
        const supportRect = support?.getBoundingClientRect();
        return {
          visible: scene.querySelectorAll('[data-scene-visible="true"]').length,
          effect: visual?.dataset.sceneEffect,
          sceneEffect: scene?.dataset.sceneEffect,
          cue: scene?.querySelector('[data-scene-cue]')?.textContent.trim(),
          phase: deck?.dataset.scenePhase,
          width: visual ? Math.round(visual.getBoundingClientRect().width) : 0,
          ratio: visualRect ? visualRect.width / visualRect.height : 0,
          headAligned: headRect && visualRect ? Math.abs(headRect.width - visualRect.width) <= 2 : false,
          frameFit: frame ? getComputedStyle(frame).objectFit : null,
          framePosition: frame ? getComputedStyle(frame).objectPosition : null,
          frameBorder: carouselFrame ? getComputedStyle(carouselFrame).borderTopWidth : null,
          frameRadius: carouselFrame ? parseFloat(getComputedStyle(carouselFrame).borderTopLeftRadius) : null,
          captionDisplay: caption ? getComputedStyle(caption).display : null,
          extraText: scene.querySelectorAll('.scene-support, [data-scene-visual-note], [data-scene-callout]').length,
          supportText: supportActive?.textContent.trim() || '',
          supportTop: supportRect ? Math.round(supportRect.top) : null,
          supportBottom: supportRect ? Math.round(supportRect.bottom) : null,
          visualTop: visualRect ? Math.round(visualRect.top) : null,
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
        `${viewport.id} 개막 enter 화면`,
        firstBeat?.visible === 1 &&
          ["enter", "replace", "compare", "compose"].includes(firstBeat?.effect) &&
          firstBeat?.sceneEffect === firstBeat?.effect &&
          Boolean(firstBeat?.cue) &&
          firstBeat?.phase === "ready" &&
          firstBeat?.width >= viewport.visualMin &&
          Math.abs(firstBeat?.ratio - 16 / 9) < .03 &&
          firstBeat?.headAligned === true &&
          ["contain", "cover"].includes(firstBeat?.frameFit) &&
          Boolean(firstBeat?.framePosition) &&
          firstBeat?.frameBorder === "1px" &&
          firstBeat?.frameRadius >= 6 &&
          firstBeat?.frameRadius <= 10 &&
          (firstBeat?.captionDisplay === null || firstBeat?.captionDisplay === "none") &&
          firstBeat?.extraText === 1 &&
          Boolean(firstBeat?.supportText) &&
          firstBeat?.supportTop >= firstBeat?.subtitleBottom &&
          firstBeat?.visualTop >= firstBeat?.supportBottom &&
          (firstBeat?.labelTop === null || firstBeat?.labelTop >= firstBeat?.subtitleBottom + 8) &&
          Number(firstBeat?.progressValue) >= 0 &&
          /^01 \/ \d+$/.test(firstBeat?.progress ?? "") &&
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

      const keyboardBeat = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const before = deck.querySelector('[data-lecture-progress]').textContent.trim();
        await new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
        });
        const visual = deck.querySelector('.lecture-scene.on [data-scene-visible="true"]');
        return {
          before,
          effect: visual?.dataset.sceneEffect,
          sceneEffect: deck.querySelector('.lecture-scene.on')?.dataset.sceneEffect,
          cue: deck.querySelector('.lecture-scene.on [data-scene-cue]')?.textContent.trim(),
          visible: deck.querySelectorAll('.lecture-scene.on [data-scene-visible="true"]').length,
          progress: deck.querySelector('[data-lecture-progress]').textContent.trim(),
          hash: location.hash,
        };
      })()`));
      record(
        `${viewport.id} 키보드 다음 장표`,
        ["enter", "replace", "compare", "compose", "focus", "annotate", "run", "simulate"].includes(keyboardBeat?.effect) &&
          keyboardBeat?.sceneEffect === keyboardBeat?.effect &&
          Boolean(keyboardBeat?.cue) &&
          keyboardBeat?.visible === 1 &&
          Number.parseInt(keyboardBeat?.progress ?? "", 10) === Number.parseInt(keyboardBeat?.before ?? "", 10) + 1 &&
          /^#lecture=s\d+\.\d+$/.test(keyboardBeat?.hash ?? ""),
        JSON.stringify(keyboardBeat),
      );
      await save(session, "07-lecture-frame", false);

      const conciseSlide = value(await evaluate(session, `(() => {
        const deck = document.querySelector('[data-lecture-deck]');
        const scene = deck.querySelector('.lecture-scene.on');
        const title = scene?.querySelector('.scene-head h2');
        const subtitle = scene?.querySelector('.scene-subtitle');
        const visual = scene?.querySelector('[data-scene-visible="true"]');
        const caption = visual?.querySelector('figcaption');
        const support = scene?.querySelector('[data-carousel-support]');
        const supportActive = support?.querySelector('[data-carousel-description-active="true"]');
        const titleRect = title?.getBoundingClientRect();
        const subtitleRect = subtitle?.getBoundingClientRect();
        const supportRect = support?.getBoundingClientRect();
        const visualRect = visual?.getBoundingClientRect();
        return {
          title: title?.textContent.trim(),
          subtitle: subtitle?.textContent.trim(),
          visible: scene.querySelectorAll('[data-scene-visible="true"]').length,
          extraText: scene.querySelectorAll('.scene-support, [data-scene-visual-note], [data-scene-callout]').length,
          supportText: supportActive?.textContent.trim() || '',
          captionDisplay: caption ? getComputedStyle(caption).display : null,
          titleBeforeSubtitle: titleRect && subtitleRect ? titleRect.bottom <= subtitleRect.top + 1 : false,
          subtitleBeforeSupport: subtitleRect && supportRect ? subtitleRect.bottom <= supportRect.top + 1 : false,
          supportBeforeVisual: supportRect && visualRect ? supportRect.bottom <= visualRect.top + 1 : false,
        };
      })()`));
      await save(session, "07-lecture-visual", false);
      record(
        `${viewport.id} 제목 부제 캡션 시각물 장표`,
        Boolean(conciseSlide?.title) &&
          Boolean(conciseSlide?.subtitle) &&
          conciseSlide?.visible === 1 &&
          conciseSlide?.extraText === 1 &&
          Boolean(conciseSlide?.supportText) &&
          (conciseSlide?.captionDisplay === null || conciseSlide?.captionDisplay === "none") &&
          conciseSlide?.titleBeforeSubtitle === true &&
          conciseSlide?.subtitleBeforeSupport === true &&
          conciseSlide?.supportBeforeVisual === true,
        JSON.stringify(conciseSlide),
      );

      if (viewport.hasTouch) {
        const swipeState = value(await evaluate(session, `(async () => {
          const deck = document.querySelector('[data-lecture-deck]');
          const stage = deck.querySelector('.lecture-stage');
          await new Promise((resolve) => {
            deck.addEventListener('lectureframe', resolve, { once:true });
            document.dispatchEvent(new KeyboardEvent('keydown', { key:'Home', bubbles:true }));
          });
          const before = deck.querySelector('[data-lecture-progress]').textContent.trim();
          await new Promise((resolve) => {
            deck.addEventListener('lectureframe', resolve, { once:true });
            stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, isPrimary:true, clientX:330, clientY:400 }));
            stage.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, isPrimary:true, clientX:40, clientY:405 }));
          });
          const after = deck.querySelector('[data-lecture-progress]').textContent.trim();
          const hash = location.hash;
          const hashMatchesFrame = /^#lecture=s\\d+\\.\\d+$/.test(hash);
          await new Promise((resolve) => {
            deck.addEventListener('lectureframe', resolve, { once:true });
            document.dispatchEvent(new KeyboardEvent('keydown', { key:'ArrowLeft', bubbles:true }));
          });
          return { before, after, hash, hashMatchesFrame, restored:location.hash };
        })()`));
        record(
          `${viewport.id} 좌우 스와이프 이동`,
          Number.parseInt(swipeState?.after ?? "", 10) === Number.parseInt(swipeState?.before ?? "", 10) + 1 &&
            swipeState?.hashMatchesFrame === true &&
            swipeState?.hash !== swipeState?.restored &&
            swipeState?.restored === "#lecture=s1.1",
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
          lecturePerf?.domAfter <= lecturePerf?.domBefore &&
          lecturePerf?.domAfter >= lecturePerf?.domBefore - 2 &&
          lecturePerf?.phase === "ready",
        JSON.stringify(lecturePerf),
      );
      console.log(`    ${viewport.id} p95 ${lecturePerf?.p95}ms, max ${lecturePerf?.max}ms, layout shift ${lecturePerf?.layoutShift}, long task ${lecturePerf?.longTasks}`);

      const boundaryState = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const waitKey = (key) => new Promise((resolve) => {
          deck.addEventListener('lectureframe', resolve, { once:true });
          document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true }));
        });
        await waitKey('End');
        const end = {
          current:deck.querySelector('[data-lecture-map-scene][aria-current="step"] .lecture-map-no')?.textContent.trim(),
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
          status:deck.querySelector('[data-lecture-status]').textContent.trim(),
        };
        await waitKey('Home');
        const start = {
          current:deck.querySelector('[data-lecture-map-scene][aria-current="step"] .lecture-map-no')?.textContent.trim(),
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
          status:deck.querySelector('[data-lecture-status]').textContent.trim(),
        };
        return { end, start };
      })()`));
      record(
        `${viewport.id} 시작과 끝 화면 축소판 상태`,
        /^\d+ \/ \d+$/.test(boundaryState?.end?.progress ?? "") &&
          boundaryState?.end?.progress?.split(" / ")[0] === boundaryState?.end?.progress?.split(" / ")[1] &&
          boundaryState?.end?.current === boundaryState?.end?.progress?.split(" / ")[0] &&
          /화면 (\d+) \/ \1/.test(boundaryState?.end?.status ?? "") &&
          boundaryState?.start?.current === "01" &&
          /^01 \/ \d+$/.test(boundaryState?.start?.progress ?? "") &&
          /화면 1 \/ \d+/.test(boundaryState?.start?.status ?? ""),
        JSON.stringify(boundaryState),
      );

      await evaluate(session, `(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      })()`);
      const lectureClosed = value(await evaluate(session, `(() => ({
        hidden: document.querySelector('[data-lecture-deck]')?.hidden,
        body: document.body.classList.contains('lecture-on'),
      }))()`));
      record(`${viewport.id} 강의 모드 종료`, lectureClosed?.hidden === true && lectureClosed?.body === false, JSON.stringify(lectureClosed));
    }

    if (PREVIEW_ONLY) continue;

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

    // 가로가 넓고 세로가 낮은 강의 화면에서도 시각물은 부제 아래의 전체 무대를 써야 한다.
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
      const rail = deck?.querySelector('.lecture-rail');
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
        rail: box(rail),
        stage: box(stage),
        head: box(scene?.querySelector('.scene-head')),
        title: box(scene?.querySelector('.scene-head h2')),
        subtitle: box(scene?.querySelector('.scene-subtitle')),
        canvas: box(scene?.querySelector('.scene-canvas')),
        visual: box(visual),
        media: mediaBox,
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
        topBars: deck?.querySelectorAll('.lecture-bar').length,
        bottomBars: deck?.querySelectorAll('.lecture-foot').length,
      };
    })()`));
    // PPT 구도. 왼쪽 인덱스 옆에서 제목, 부제, 단일 시각자료가 세로로 이어진다.
    record(
      `${viewport.id} 레이아웃별 강의 무대`,
      balancedStage?.deck?.left === 0 &&
        balancedStage?.deck?.top === 0 &&
        balancedStage?.deck?.width === balancedStage?.viewport &&
        balancedStage?.deck?.height === balancedStage?.viewportHeight &&
        balancedStage?.rail?.left === 0 &&
        balancedStage?.rail?.top === 0 &&
        Math.abs(balancedStage?.rail?.bottom - balancedStage?.viewportHeight) <= 1 &&
        Math.abs(balancedStage?.stage?.left - balancedStage?.rail?.right) <= 1 &&
        Math.abs(balancedStage?.stage?.right - balancedStage?.viewport) <= 1 &&
        balancedStage?.title?.bottom <= balancedStage?.subtitle?.top + 1 &&
        balancedStage?.subtitle?.bottom <= balancedStage?.canvas?.top + 1 &&
        balancedStage?.head?.bottom <= balancedStage?.canvas?.top + 1 &&
        balancedStage?.visual?.left >= balancedStage?.canvas?.left - 1 &&
        balancedStage?.visual?.right <= balancedStage?.canvas?.right + 1 &&
        balancedStage?.visual?.top >= balancedStage?.canvas?.top - 1 &&
        balancedStage?.visual?.bottom <= balancedStage?.canvas?.bottom + 1 &&
        balancedStage?.canvas?.width >= balancedStage?.stage?.width * 0.85 &&
        balancedStage?.canvas?.height >= balancedStage?.stage?.height * 0.45 &&
        balancedStage?.topBars === 0 && balancedStage?.bottomBars === 0,
      JSON.stringify(balancedStage),
    );
    await save(session, "09-lecture-balanced", false);
    // 같은 H2의 여러 시각물은 새 장표가 아니라 동일한 16:9 무대의 캐러셀 항목이다.
    const carouselState = value(await evaluate(session, `(async () => {
      const deck = document.querySelector('[data-lecture-deck]');
      const scenes = [...deck.querySelectorAll('.lecture-scene')];
      const targetIndex = scenes.findIndex((scene) => scene.querySelectorAll('[data-carousel-item]').length > 1);
      if (targetIndex < 0) return null;
      await new Promise((resolve) => {
        deck.addEventListener('lectureframe', resolve, { once:true });
        deck.querySelector('[data-lecture-map-scene="' + targetIndex + '"]').click();
      });
      const scene = scenes[targetIndex];
      const carousel = scene.querySelector('[data-visual-carousel]');
      const read = () => {
        const frame = carousel.querySelector('.visual-carousel-frame')?.getBoundingClientRect();
        const visual = carousel.querySelector('[data-carousel-active="true"]');
        const visualBox = visual?.getBoundingClientRect();
        return {
          scene:scene.dataset.scene,
          at:Number(carousel.dataset.carouselAt),
          count:Number(carousel.dataset.carouselCount),
          visual:visual?.dataset.visual,
          support:scene.querySelector('[data-carousel-description-active="true"]')?.textContent.trim() || '',
          supportVisible:scene.querySelector('[data-carousel-support]') ? getComputedStyle(scene.querySelector('[data-carousel-support]')).display !== 'none' : false,
          frame:frame ? { left:frame.left, top:frame.top, right:frame.right, bottom:frame.bottom } : null,
          visualBox:visualBox ? { left:visualBox.left, top:visualBox.top, right:visualBox.right, bottom:visualBox.bottom } : null,
          hash:location.hash,
          progress:deck.querySelector('[data-lecture-progress]').textContent.trim(),
        };
      };
      const first = read();
      await new Promise((resolve) => {
        deck.addEventListener('lectureframe', resolve, { once:true });
        carousel.querySelector('[data-carousel-next]').click();
      });
      return { first, second:read() };
    })()`));
    const sameCarouselBox = (a, b) => a && b && ["left", "top", "right", "bottom"]
      .every((key) => Math.abs(a[key] - b[key]) <= 2);
    record(
      `${viewport.id} H2 내부 16대9 캐러셀`,
      carouselState?.first?.scene === carouselState?.second?.scene &&
        carouselState?.first?.count >= 2 &&
        carouselState?.first?.at === 0 &&
        carouselState?.second?.at === 1 &&
        carouselState?.first?.visual !== carouselState?.second?.visual &&
        carouselState?.first?.supportVisible === true &&
        carouselState?.second?.supportVisible === true &&
        Boolean(carouselState?.first?.support) &&
        sameCarouselBox(carouselState?.first?.frame, carouselState?.second?.frame) &&
        Math.abs((carouselState?.first?.frame?.right - carouselState?.first?.frame?.left) /
          (carouselState?.first?.frame?.bottom - carouselState?.first?.frame?.top) - 16 / 9) < .03 &&
        carouselState?.first?.progress === carouselState?.second?.progress &&
        /\.1$/.test(carouselState?.first?.hash ?? "") &&
        /\.2$/.test(carouselState?.second?.hash ?? ""),
      JSON.stringify(carouselState),
    );
    await save(session, "10-lecture-carousel", false);


    const readingCellPost = value(
      await evaluate(
        session,
        `(() => [...document.querySelectorAll('a.nav-post')]
          .find((link) => link.getAttribute('href')?.endsWith('-python-basic-syntax'))
          ?.getAttribute('href') ?? null)()`,
      ),
    );
    if (!readingCellPost) throw new Error("python-basic-syntax 실행 칸 글 링크를 못 찾았다");
    opened = await client.openTarget(`${base}${readingCellPost}`, {
      expectedRisk: "externalEffect",
      waitUntil: "load",
      timeoutMs: 30000,
    });
    session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

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
