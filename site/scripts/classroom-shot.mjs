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

const config = JSON.parse(await readFile(join(SITE_ROOT, ".classroom-admin.json"), "utf8"));
// 주소는 인자로 받으면서 토큰은 늘 로컬 것을 쓰고 있었다. 그래서 운영 화면은 검수가 막혔다.
// 대상은 주소로 고른다. 루프백이 아니면 운영이다.
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
const targetId = local ? "local" : "production";
const token = config.targets.find((t) => t.id === targetId)?.token;
if (!token) throw new Error(`.classroom-admin.json 의 ${targetId} 토큰이 없다`);
if (!local) console.log(`운영(${base}) 에 검수용 방을 만들고 끝나면 지운다`);

async function admin(body) {
  const res = await fetch(`${base}/cr/api/admin`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`admin ${body.action} 실패: ${JSON.stringify(data)}`);
  return data;
}

// 찍을 방을 만들고 제품 운영과 같은 주소 이동을 거친다. 비밀번호 원문 없이 방을 옮길 수 있어야 한다.
await admin({ action: "remove", slug: SOURCE_ROOM }).catch(() => {});
await admin({ action: "remove", slug: ROOM }).catch(() => {});
const made = await admin({ action: "create", slug: SOURCE_ROOM, title: "검수용 강의장", password: PASSWORD });
const category = made.categories[0];
if (!category) {
  throw new Error(
    "교안 카테고리가 없다. ../eddmpython-course 에서 npm run publish:local 을 먼저 돌려라",
  );
}
await admin({ action: "toggle", slug: SOURCE_ROOM, category: category.slug });
await admin({ action: "rename", slug: SOURCE_ROOM, nextSlug: ROOM, title: "강의장 화면 검수" });
const oldAddress = await fetch(`${base}/cr/${SOURCE_ROOM}`, { redirect: "manual" });
if (oldAddress.status !== 404) throw new Error(`주소 이동 뒤 옛 주소가 남았다: ${oldAddress.status}`);
const listed = await admin({ action: "list" });
const posts = listed.categories.find((c) => c.slug === category.slug);
console.log(`  검수용 강의장 ${base}/cr/${ROOM}  카테고리 ${category.slug} (${posts.posts}편)`);

const first = process.argv[3] ?? null;

const VIEWPORTS = [
  { id: "desktop", width: 1920, height: 900, isMobile: false, hasTouch: false },
  { id: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

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
  const gone = await fetch(`${base}/cr/${ROOM}`, { redirect: "manual" }).catch(() => null);
  const status = gone ? gone.status : "확인 못 함";
  console.log(`  운영의 검수용 방을 지웠다 (밖에서 본 status ${status})`);
  if (status !== 404) console.error("  경고: 아직 살아 있다. 운영 화면에서 직접 지워라");
}

try {
for (const viewport of VIEWPORTS) {
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
            deviceScaleFactor: 1,
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
    let opened = await client.openTarget(`${base}/cr/${ROOM}`, {
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
      sectionTitle?.size === (viewport.id === "desktop" ? "24px" : "22px") &&
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
          runtime: deck?.dataset.lectureRuntime,
          sceneRuntime: scene?.dataset.sceneRuntime,
          phase: deck?.dataset.scenePhase,
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
          lectureStart?.centerGap <= (viewport.id === "desktop" ? 24 : 14) &&
          lectureStart?.symbolWidth >= 20 &&
          lectureStart?.themeButtons === 2 &&
          lectureStart?.lectureThemeButtons === 1 &&
          lectureStart?.runtime === "2" &&
          lectureStart?.sceneRuntime === "2" &&
          lectureStart?.phase === "ready" &&
          lectureStart?.titleSize >= (viewport.id === "desktop" ? 72 : 44) &&
          lectureStart?.progressValue === "0" &&
          /· 0 \/ \d+$/.test(lectureStart?.progress ?? ""),
        JSON.stringify(lectureStart),
      );
      await save(session, "06-lecture-title", false);

      const lectureLight = value(await evaluate(session, `(async () => {
        const root = document.documentElement;
        const button = document.querySelector('[data-lecture-deck] [data-theme-toggle]');
        if (root.dataset.theme !== 'light') button.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          choice: root.dataset.themeChoice,
          theme: root.dataset.theme,
          labels: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.getAttribute('aria-label')),
          nextThemes: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.dataset.nextTheme),
          scheme: getComputedStyle(root).colorScheme,
          meta: document.querySelector('meta[name="theme-color"]')?.content,
        };
      })()`));
      record(
        `${viewport.id} 강의 셸 라이트 테마`,
        lectureLight?.choice === "light" &&
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
          choice: root.dataset.themeChoice,
          theme: root.dataset.theme,
          labels: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.getAttribute('aria-label')),
          nextThemes: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.dataset.nextTheme),
          scheme: getComputedStyle(root).colorScheme,
          meta: document.querySelector('meta[name="theme-color"]')?.content,
        };
      })()`));
      record(
        `${viewport.id} 강의 셸 다크 테마`,
        lectureDark?.choice === "dark" &&
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
          subtitleBottom: subtitleRect ? Math.round(subtitleRect.bottom) : null,
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
          firstBeat?.width >= (viewport.id === "desktop" ? 700 : 320) &&
          firstBeat?.frameBorder === "1px" &&
          firstBeat?.frameRadius >= 6 &&
          firstBeat?.frameRadius <= 10 &&
          firstBeat?.captionBackground === "rgba(0, 0, 0, 0)" &&
          firstBeat?.labelTop >= firstBeat?.subtitleBottom + 8 &&
          Number(firstBeat?.progressValue) > 0 &&
          /· 1 \/ \d+$/.test(firstBeat?.progress ?? "") &&
          /^#lecture=s1\.1$/.test(firstBeat?.hash ?? ""),
        JSON.stringify(firstBeat),
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

      const lecturePerf = value(await evaluate(session, `(async () => {
        const deck = document.querySelector('[data-lecture-deck]');
        const durations = [];
        const shifts = [];
        const longTasks = [];
        const observers = [];
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
        for (let i = 0; i < 12; i += 1) {
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
          phase: deck.dataset.scenePhase,
        };
      })()`));
      record(
        `${viewport.id} 비트 전환 성능`,
        lecturePerf?.samples === 12 &&
          lecturePerf?.p95 <= 90 &&
          lecturePerf?.max <= 140 &&
          lecturePerf?.layoutShift <= 0.01 &&
          lecturePerf?.longTasks === 0 &&
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
          noteState?.next?.length > 10 &&
          noteState?.rect?.height > 120 &&
          noteState?.rect?.bottom <= noteState?.stage?.bottom + 1 &&
          (viewport.id === "desktop"
            ? noteState?.scene?.right <= noteState?.rect?.left + 1
            : noteState?.rect?.width >= viewport.width - 2),
        JSON.stringify(noteState),
      );
      await save(session, "08-lecture-notes", false);

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
            choice: document.documentElement.dataset.themeChoice,
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
        lightTheme?.choice === "light" &&
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
          choice: document.documentElement.dataset.themeChoice,
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
      persistedTheme?.choice === "light" &&
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
            choice: document.documentElement.dataset.themeChoice,
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
      darkTheme?.choice === "dark" &&
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
        choice: document.documentElement.dataset.themeChoice,
        theme: document.documentElement.dataset.theme,
        labels: [...document.querySelectorAll('[data-theme-toggle]')].map((item) => item.getAttribute('aria-label')),
      };
    })()`));
    record(
      `${viewport.id} 다른 탭 테마 동기화`,
      storageTheme?.choice === "light" &&
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
    const systemTheme = value(await evaluate(session, `(() => ({
      choice: document.documentElement.dataset.themeChoice,
      theme: document.documentElement.dataset.theme,
      expected: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
      buttons: document.querySelectorAll('[data-theme-toggle]').length,
    }))()`));
    record(
      `${viewport.id} 시스템 기본 테마`,
      systemTheme?.choice === "system" &&
        systemTheme?.theme === systemTheme?.expected &&
        systemTheme?.buttons === 2,
      JSON.stringify(systemTheme),
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
          .find((link) => link.getAttribute('href')?.endsWith('/002-what-is-python'))
          ?.getAttribute('href') ?? null)()`,
      ),
    );
    if (!comparePost) throw new Error("002 비교 장면 글 링크를 못 찾았다");
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
        (viewport.id === "desktop"
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
        compareLayout?.columns === (viewport.id === "desktop" ? 2 : 1) &&
        (viewport.id === "desktop"
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
          .find((link) => link.getAttribute('href')?.endsWith('/005-run-python-in-vscode'))
          ?.getAttribute('href') ?? null)()`,
      ),
    );
    if (!focusPost) throw new Error("005 focus 장면 글 링크를 못 찾았다");
    await evaluate(session, `location.href = ${JSON.stringify(`${base}${focusPost}#lecture=s6.2`)}`, false);
    await client.act(
      session,
      [{ kind: "waitFor", selector: '[data-lecture-deck][data-scene-phase="ready"] .lecture-scene.on [data-scene-focus="true"]', timeoutMs: 15000, expectedRisk: "read" }],
      { timeoutMs: 30000 },
    );
    const focusState = value(await evaluate(session, `(() => {
      const scene = document.querySelector('.lecture-scene.on');
      const visual = scene?.querySelector('[data-scene-focus="true"]');
      const title = scene?.querySelector('.scene-head > div:last-child');
      const callout = scene?.querySelector('[data-scene-callout]');
      return {
        effect: scene?.dataset.sceneEffect,
        cue: scene?.querySelector('[data-scene-cue]')?.textContent.trim(),
        visible: scene?.querySelectorAll('[data-scene-visible="true"]').length,
        focused: scene?.querySelectorAll('[data-scene-focus="true"]').length,
        filter: visual ? getComputedStyle(visual).filter : null,
        titleOpacity: title ? Number(getComputedStyle(title).opacity) : null,
        callout: callout?.textContent.trim(),
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
        focusState?.callout === "",
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
          const target = links.find((link) => link.getAttribute('href')?.endsWith('/003-python-basic-syntax'));
          return target?.getAttribute('href') ?? null;
        })()`,
      ),
    );
    if (!cellPost) throw new Error("003 실행 칸 글 링크를 못 찾았다");
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

    if (viewport.id === "desktop") {
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
    if (cells > 0 && viewport.id === "desktop") {
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
if (local) console.log(`로컬 검수용 강의장은 남겨 둔다. 비밀번호 ${PASSWORD}`);
// 브라우저를 붙들고 있는 핸들이 남아 프로세스가 안 끝나는 일이 있다. 명시적으로 끝낸다.
process.exit(checks.every(Boolean) ? 0 : 1);
