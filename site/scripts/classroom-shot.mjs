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
  { id: "desktop", width: 1440, height: 1000, isMobile: false, hasTouch: false },
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

  const save = async (sessionRef, name) => {
    await hydrate(sessionRef);
    const captured = await client.act(
      sessionRef,
      [{ kind: "screenshot", format: "jpeg", fullPage: true, expectedRisk: "read" }],
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

    // 강의장 모든 상태에서 같은 선택기를 쓰고, 선택한 테마를 html과 브라우저 기본 UI에 같이 건다.
    const lightTheme = value(
      await evaluate(
        session,
        `(async () => {
          const button = document.querySelector('[data-theme-choice="light"]');
          if (!button) return null;
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            buttons: document.querySelectorAll('.theme-btn[data-theme-choice]').length,
            choice: document.documentElement.dataset.themeChoice,
            theme: document.documentElement.dataset.theme,
            pressed: button.getAttribute('aria-pressed'),
            scheme: getComputedStyle(document.documentElement).colorScheme,
          };
        })()`,
      ),
    );
    record(
      `${viewport.id} 라이트 테마`,
      lightTheme?.buttons === 3 &&
        lightTheme?.choice === "light" &&
        lightTheme?.theme === "light" &&
        lightTheme?.pressed === "true" &&
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
          pressed: document.querySelector('.theme-btn[data-theme-choice="light"]')?.getAttribute('aria-pressed'),
        }))()`,
      ),
    );
    record(
      `${viewport.id} 라이트 테마 새로고침 유지`,
      persistedTheme?.choice === "light" &&
        persistedTheme?.theme === "light" &&
        persistedTheme?.pressed === "true",
      JSON.stringify(persistedTheme),
    );
    await save(session, "03-theme-light");

    const darkTheme = value(
      await evaluate(
        session,
        `(async () => {
          const button = document.querySelector('[data-theme-choice="dark"]');
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            choice: document.documentElement.dataset.themeChoice,
            theme: document.documentElement.dataset.theme,
            pressed: button.getAttribute('aria-pressed'),
            scheme: getComputedStyle(document.documentElement).colorScheme,
          };
        })()`,
      ),
    );
    record(
      `${viewport.id} 다크 테마`,
      darkTheme?.choice === "dark" &&
        darkTheme?.theme === "dark" &&
        darkTheme?.pressed === "true" &&
        darkTheme?.scheme === "dark",
      JSON.stringify(darkTheme),
    );
    await save(session, "03-theme-dark");

    const systemTheme = value(
      await evaluate(
        session,
        `(() => {
          const system = document.querySelector('[data-theme-choice="system"]');
          const dark = document.querySelector('[data-theme-choice="dark"]');
          system.click();
          const selected = {
            choice: document.documentElement.dataset.themeChoice,
            pressed: system.getAttribute('aria-pressed'),
          };
          dark.click();
          return selected;
        })()`,
      ),
    );
    record(
      `${viewport.id} 시스템 테마`,
      systemTheme?.choice === "system" && systemTheme?.pressed === "true",
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
      await save(session, "05-cell");
    } else if (cells > 0) {
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
