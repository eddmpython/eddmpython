/**
 * 강의 관리 화면을 찍고 운영 순서가 실제로 지켜지는지 본다.
 *
 * 로그인 화면과 관리 화면을 데스크톱과 모바일에서 찍는다. 그림만 보지 않고 새 방의 기본 상태,
 * 커리큘럼 선택 유지, 화면 순서, 체크박스, 가로 넘침도 함께 검사한다.
 *
 * 사용: node scripts/admin-shot.mjs [주소]
 *   기본은 http://localhost:8787 이다. 운영 주소를 주면 검수용 방을 만들고 끝나면 지운다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { adminPassword, signIn } from "./admin-client.mjs";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(SITE, "../../eddmpython.out/admin-shot");
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
const ROOM = "admin-shot-check";
const PASSWORD = randomBytes(12).toString("base64url");
const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 1100, mobile: false, touch: false },
  { id: "mobile", width: 390, height: 844, mobile: true, touch: true },
];

await mkdir(OUT, { recursive: true });
const drive = await signIn(base);
if (!local) console.log(`운영(${base}) 에 검수용 방을 만들고 끝나면 지운다`);

const checks = [];
const record = (label, ok, detail) => {
  checks.push(ok);
  console.log(`  ${ok ? "통과" : "실패"}  ${label}${detail !== undefined && !ok ? ` (${detail})` : ""}`);
};

async function cleanup() {
  await drive({ action: "remove", slug: ROOM }).catch(() => {});
}

try {
  await cleanup();
  const made = await drive({ action: "create", slug: ROOM, title: "강의 관리 화면 검수용 방", password: PASSWORD });
  const created = made.rooms.find((room) => room.slug === ROOM);
  record("새 강의방은 수강생 입장이 닫혀 있다", created?.open === false, String(created?.open));

  const category = made.categories[0];
  record("검수할 커리큘럼이 있다", Boolean(category), String(made.categories.length));
  if (category) {
    const selected = await drive({ action: "toggle", slug: ROOM, category: category.slug });
    const selectedRoom = selected.rooms.find((room) => room.slug === ROOM);
    record("닫힌 방에서도 커리큘럼을 선택할 수 있다", selectedRoom?.unlocked.includes(category.slug) === true);
  }
  console.log(`  검수용 방 ${ROOM}  커리큘럼 ${made.categories.length}개`);

  for (const viewport of VIEWPORTS) {
    const manifestPath = join(OUT, `pyproc-control.${viewport.id}.json`);
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
          timeoutMs: 300000,
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
              mobile: viewport.mobile,
              touch: viewport.touch,
            },
            externalEffects: "acknowledged",
            purpose: "eddmpython 강의 관리 화면 검수",
            artifacts: {
              maxArtifactBytes: 33554432,
              maxTotalBytes: 268435456,
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

    const preflight = await PyProcControlClient.check(manifestPath, { cwd: SITE, timeoutMs: 30000 });
    if (preflight.ok !== true) throw new Error(`preflight 실패: ${JSON.stringify(preflight)}`);
    const client = await PyProcControlClient.start(manifestPath, {
      cwd: SITE,
      startupTimeoutMs: 300000,
      shutdownTimeoutMs: 30000,
    });

    try {
      const opened = await client.openTarget(`${base}/admin`, {
        expectedRisk: "externalEffect",
        waitUntil: "load",
        timeoutMs: 60000,
      });
      const session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;

      const ev = async (expression) => {
        const result = await client.command(
          session,
          "Runtime.evaluate",
          { expression, awaitPromise: false, returnByValue: true },
          { expectedRisk: "externalEffect", timeoutMs: 120000 },
        );
        return result?.output?.result?.result?.value;
      };

      const save = async (name) => {
        const shot = await client.act(
          session,
          [{ kind: "screenshot", format: "jpeg", fullPage: true, expectedRisk: "read" }],
          { timeoutMs: 120000 },
        );
        const image = shot.attachments.find((attachment) => attachment.mimeType === "image/jpeg");
        if (!image) throw new Error(`screenshot 없음: ${name}`);
        const file = join(OUT, `${name}.${viewport.id}.jpg`);
        await writeFile(file, image.bytes);
        console.log(`  ${file}`);
        const ref = shot.output?.actions?.[0]?.result?.artifactRef;
        if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
      };

      const gate = await ev(
        `(() => ({
          logo: Boolean(document.querySelector('.hd-logo')),
          form: Boolean(document.querySelector('input[name=password]')),
          heading: document.querySelector('.gate h1')?.textContent.trim(),
          title: document.title,
          leaks: ['강의방 목록', '포함할 커리큘럼', '운영 세션'].some((text) => document.body.innerText.includes(text)),
          theme: document.documentElement.dataset.theme,
          bg: getComputedStyle(document.body).backgroundColor,
          font: getComputedStyle(document.body).fontFamily.split(',')[0],
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        }))()`,
      );
      record(`${viewport.id} 로그인 화면에 브랜드 머리띠가 있다`, Boolean(gate?.logo));
      record(`${viewport.id} 로그인 화면 이름이 강의 관리다`, gate?.heading === "강의 관리" && gate?.title === "강의 관리 | eddmpython", JSON.stringify(gate));
      record(`${viewport.id} 로그인 전에는 강의방 정보가 없다`, gate?.leaks === false);
      record(`${viewport.id} 로그인 화면에 비밀번호 칸이 있다`, Boolean(gate?.form));
      record(`${viewport.id} 브랜드 글꼴이 걸렸다`, String(gate?.font ?? "").includes("Pretendard"), gate?.font);
      record(`${viewport.id} 처음 열면 라이트다`, gate?.theme === "light", gate?.theme);
      record(`${viewport.id} 로그인 화면이 가로로 넘치지 않는다`, gate?.overflow === false);
      await save("admin-login");

      const password = await adminPassword();
      await ev(
        `(() => { const input = document.querySelector('input[name=password]'); input.value = ${JSON.stringify(password)}; input.form.submit(); return true; })()`,
      );
      await client.act(
        session,
        [{ kind: "waitFor", selector: `[data-room="${ROOM}"]`, timeoutMs: 15000, expectedRisk: "read" }],
        { timeoutMs: 30000 },
      );

      const consoleView = await ev(
        `(() => {
          const create = document.querySelector('.new');
          const rooms = document.querySelector('.rooms-section');
          const card = document.querySelector('[data-room=${ROOM}]');
          const roomInput = card?.querySelector('[data-next-title]');
          const roomSave = card?.querySelector('[data-act=rename]');
          return {
            path: location.pathname,
            title: document.title,
            heading: document.querySelector('.adm-title')?.textContent.trim(),
            cards: document.querySelectorAll('.card').length,
            cats: card?.querySelectorAll('.cat').length ?? 0,
            checkboxes: card?.querySelectorAll('.cat input[type=checkbox][data-act=toggle]').length ?? 0,
            checked: card?.querySelectorAll('.cat input[type=checkbox]:checked').length ?? 0,
            allow: Boolean(card?.querySelector('.head-actions [data-act=open]')),
            deleteTop: Boolean(card?.querySelector('.head-actions [data-act=remove]')),
            copyBesideUrl: Boolean(card?.querySelector('.addr-row .addr + .copy-icon[data-act=copy]')),
            closeCopy: document.body.innerText.includes('수강생 입장 닫기'),
            redundantState: ['입장 가능', '준비 중'].some((text) => document.body.innerText.includes(text)),
            createdCopy: document.body.innerText.includes('만듦'),
            controlsAligned: Boolean(roomInput && roomSave && Math.abs(roomInput.getBoundingClientRect().height - roomSave.getBoundingClientRect().height) < 1),
            controlHeight: roomInput?.getBoundingClientRect().height ?? 0,
            createBeforeRooms: Boolean(create && rooms && (create.compareDocumentPosition(rooms) & Node.DOCUMENT_POSITION_FOLLOWING)),
            urlFirst: create?.querySelector('input')?.id === 'n-slug',
            password: Boolean(create?.querySelector('#n-pw')),
            weirdCopy: document.body.innerText.includes('수강생에게 보임'),
            themeToggle: Boolean(document.querySelector('[data-theme-toggle]')),
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            bg: getComputedStyle(document.body).backgroundColor,
          };
        })()`,
      );
      record(`${viewport.id} 로그인하면 강의 관리 화면이 뜬다`, consoleView?.path === "/admin" && consoleView?.heading === "강의 관리" && consoleView?.title === "강의 관리 | eddmpython", JSON.stringify(consoleView));
      record(`${viewport.id} URL과 비밀번호 설정이 강의방 목록보다 먼저다`, consoleView?.createBeforeRooms === true && consoleView?.urlFirst === true && consoleView?.password === true);
      record(`${viewport.id} 만든 방에 입장 허용 동작이 보인다`, (consoleView?.cards ?? 0) >= 1 && consoleView?.allow === true, JSON.stringify(consoleView));
      record(`${viewport.id} 입장 상태와 생성일을 장식으로 표시하지 않는다`, consoleView?.redundantState === false && consoleView?.createdCopy === false, JSON.stringify(consoleView));
      record(`${viewport.id} URL 옆에 복사 아이콘이 있다`, consoleView?.copyBesideUrl === true);
      record(`${viewport.id} 삭제가 카드 우상단에 있다`, consoleView?.deleteTop === true);
      record(`${viewport.id} 입장 닫기 동작이 없다`, consoleView?.closeCopy === false);
      record(`${viewport.id} 입력창과 저장 버튼 높이가 작고 같다`, consoleView?.controlsAligned === true && consoleView?.controlHeight <= 38, JSON.stringify(consoleView));
      record(`${viewport.id} 닫힌 방에도 커리큘럼 체크박스가 보인다`, (consoleView?.cats ?? 0) >= 1 && consoleView?.checkboxes === consoleView?.cats, JSON.stringify(consoleView));
      record(`${viewport.id} 선택한 커리큘럼이 체크되어 있다`, (consoleView?.checked ?? 0) >= 1, String(consoleView?.checked));
      record(`${viewport.id} 수강생에게 보임 문구를 쓰지 않는다`, consoleView?.weirdCopy === false);
      record(`${viewport.id} 테마 토글이 있다`, Boolean(consoleView?.themeToggle));
      record(`${viewport.id} 관리 화면이 가로로 넘치지 않는다`, consoleView?.overflow === false);
      await save("admin-console");

      await ev(`(() => { document.querySelector('[data-theme-toggle]').click(); return true; })()`);
      await new Promise((resolveWait) => setTimeout(resolveWait, 800));
      const dark = await ev(
        `(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }))()`,
      );
      record(`${viewport.id} 다크 테마로 바뀐다`, dark?.theme === "dark", dark?.theme);
      record(`${viewport.id} 다크에서 배경이 달라진다`, dark?.bg !== consoleView?.bg, `${consoleView?.bg} -> ${dark?.bg}`);
      await save("admin-console-dark");
    } finally {
      await client.stop?.({ timeoutMs: 30000 });
    }
  }

  const opened = await drive({ action: "open", slug: ROOM, open: true });
  const openedRoom = opened.rooms.find((room) => room.slug === ROOM);
  record("입장을 허용하면 선택한 커리큘럼과 함께 공개된다", openedRoom?.open === true && (!category || openedRoom?.unlocked.includes(category.slug) === true));
} finally {
  await cleanup();
  console.log("  검수용 방을 지웠다");
}

const failed = checks.filter((ok) => !ok).length;
console.log(`\n강의 관리 검수: ${checks.length}건 중 ${failed}건 실패. 그림은 ${OUT}`);
process.exit(failed ? 1 : 0);
