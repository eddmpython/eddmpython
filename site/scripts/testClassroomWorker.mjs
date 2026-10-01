import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import './testTaxlyDownload.ts';

const config = JSON.parse(await readFile(new URL("../wrangler.classroom.jsonc", import.meta.url), "utf8"));
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const classroom = await readFile(new URL("../classroom.ts", import.meta.url), "utf8");
const classroomWorker = await readFile(new URL("../classroomWorker.ts", import.meta.url), "utf8");

assert.equal(config.name, "eddmpython-classroom");
assert.equal(config.main, "classroomWorker.ts");
assert.equal(config.assets, undefined, "course Worker에 공개 사이트 자산을 묶으면 안 됩니다");
assert.deepEqual(
  new Set(config.routes.map((route) => route.pattern)),
  new Set([
    "eddmpython.com/admin",
    "eddmpython.com/admin/*",
    "eddmpython.com/room",
    "eddmpython.com/room/*",
    "www.eddmpython.com/admin",
    "www.eddmpython.com/admin/*",
    "www.eddmpython.com/room",
    "www.eddmpython.com/room/*",
  ]),
);

const classroomBinding = config.durable_objects.bindings.find((binding) => binding.name === "CLASSROOM");
assert.equal(classroomBinding?.class_name, "Classroom");
assert.equal(classroomBinding?.script_name, "eddmpython-site");
assert.ok(config.kv_namespaces.some((binding) => binding.binding === "COURSE"));

const deploy = pkg.scripts["deploy:classroom"];
assert.match(deploy, /wrangler deploy --config wrangler\.classroom\.jsonc/);
assert.doesNotMatch(deploy, /check:approved|approve:blog|check:blog|vite build|npm run deploy(?:\s|$)/);
assert.match(pkg.scripts["classroom:dev"], /--var LOCAL_PREVIEW_BYPASS:1/);
assert.doesNotMatch(JSON.stringify(config), /LOCAL_PREVIEW_BYPASS/);
assert.doesNotMatch(deploy, /LOCAL_PREVIEW_BYPASS/);
assert.match(classroomWorker, /pathname === "\/room-test"/);
assert.match(classroom, /String\(env\.LOCAL_PREVIEW_BYPASS\) === "1"/);
assert.match(classroom, /unlocked: cachedCourse\.categories\.map/);
assert.match(classroom, /c\.displayNumber \?\? String\(i \+ 1\)\.padStart\(2, "0"\)/);
assert.doesNotMatch(JSON.stringify(config.routes), /room-test/);

// 실제 요청에서 방에 선택하지 않은 과정과 파일이 내려가지 않는지 확인한다.
const built = await build({
  entryPoints: [fileURLToPath(new URL("../classroom.ts", import.meta.url))],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { handleRoom } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString("base64")}`);
const publicFile = `${"a".repeat(64)}.xlsx`;
const alphaFile = `${"b".repeat(64)}.xlsx`;
const betaFile = `${"c".repeat(64)}.xlsx`;
const invalidSchemeFile = `${"d".repeat(64)}.xlsx`;
const rooms = Object.fromEntries(["alpha", "beta"].map((slug) => [slug, {
  slug,
  title: `${slug} 강의방`,
  open: true,
  unlocked: slug === "alpha" ? ["01-shared", "02-alpha"] : ["01-shared", "03-beta"],
  gen: "first",
  created: 0,
  lockedUntil: 0,
}]));
const bundle = {
  schema: 4,
  sceneContract: 12,
  categories: [
    {
      slug: "01-shared",
      order: 1,
      title: "공통 과정",
      posts: [{ id: "01-start", title: "공통 실습", summary: "공통 자료 확인", body: `[공통.xlsx](room://${publicFile})` }],
    },
    {
      slug: "02-alpha",
      order: 2,
      title: "A 프로젝트 과정",
      posts: [{ id: "01-alpha", title: "A 실습", summary: "A 자료 확인", body: `[A.xlsx](room://${alphaFile})` }],
    },
    {
      slug: "03-beta",
      order: 3,
      title: "B 프로젝트 과정",
      posts: [{ id: "01-beta", title: "B 실습", summary: "B 자료 확인", body: `[B.xlsx](room://${betaFile}) [잘못된 주소](ROOM://${invalidSchemeFile})` }],
    },
  ],
};
const mediaReads = [];
const env = {
  CLASSROOM: {
    idFromName: (name) => name,
    get: () => ({
      fetch: async (_url, init) => {
        const { action, slug } = JSON.parse(init.body);
        if (action === "get") return Response.json({ room: rooms[slug] ?? null });
        if (action === "login") return Response.json({ ok: true });
        if (action === "signKey") return Response.json({ key: "test-sign-key" });
        if (action === "studentInfo") return Response.json({ enabled: false, completed: [] });
        return Response.json({ error: "unexpected action" }, { status: 400 });
      },
    }),
  },
  COURSE: {
    get: async (key) => {
      if (key === "bundle") return JSON.stringify(bundle);
      if (key === "version") return "test";
      mediaReads.push(key);
      return new TextEncoder().encode(key).buffer;
    },
  },
  LOCAL_PREVIEW_BYPASS: "1",
};
const loginRoom = async (slug) => {
  const url = new URL(`https://eddmpython.com/room/${slug}/login`);
  const response = await handleRoom(new Request(url, {
    method: "POST",
    body: new URLSearchParams({ password: crypto.randomUUID() }),
  }), env, url);
  assert.equal(response.status, 303);
  return response.headers.get("set-cookie").split(";")[0];
};
const alphaCookie = await loginRoom("alpha");
const betaCookie = await loginRoom("beta");
const requestRoom = async (path, cookie, headers = {}) => {
  const url = new URL(`https://eddmpython.com${path}`);
  return handleRoom(new Request(url, { headers: { ...headers, ...(cookie ? { cookie } : {}) } }), env, url);
};

const alphaPage = await requestRoom("/room/alpha", alphaCookie);
const alphaHtml = await alphaPage.text();
assert.equal(alphaPage.status, 200);
assert.match(alphaHtml, /공통 과정/);
assert.match(alphaHtml, /A 프로젝트 과정/);
assert.doesNotMatch(alphaHtml, /B 프로젝트 과정|B 실습|다음에 열립니다/);
assert.equal((await requestRoom("/room/alpha/03-beta/01-beta", alphaCookie)).status, 404);
assert.equal((await requestRoom(`/room/alpha/media/${betaFile}`, alphaCookie)).status, 404);
assert.deepEqual(mediaReads, [], "권한 없는 파일은 KV에서 읽지 않아야 합니다");
assert.equal((await requestRoom(`/room/alpha/media/${publicFile}`, alphaCookie)).status, 200);
assert.equal((await requestRoom(`/room/alpha/media/${alphaFile}`, alphaCookie)).status, 200);

// 영상 탐색은 허용된 자료의 요청 구간을 돌려줘야 한다. 전체 파일로 응답하면 Chrome이 처음으로 돌아간다.
const mediaPath = `/room/alpha/media/${alphaFile}`;
const original = `media/${alphaFile}`;
for (const [range, start, end] of [["bytes=2-8", 2, 8], ["bytes=5-", 5, original.length - 1], ["bytes=-4", original.length - 4, original.length - 1]]) {
  const response = await requestRoom(mediaPath, alphaCookie, { range });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${original.length}`);
  assert.match(response.headers.get("cache-control"), /^private,/);
  assert.equal(await response.text(), original.slice(start, end + 1));
}
const outside = await requestRoom(mediaPath, alphaCookie, { range: "bytes=9999-" });
assert.equal(outside.status, 416);
assert.equal(outside.headers.get("content-range"), `bytes */${original.length}`);
assert.equal((await requestRoom(mediaPath, alphaCookie, { range: "bytes=2-8", "if-range": '"old"' })).status, 200);
const readsBeforeRange = mediaReads.length;
assert.equal((await requestRoom(`/room/alpha/media/${betaFile}`, alphaCookie, { range: "bytes=2-8" })).status, 404);
assert.equal(mediaReads.length, readsBeforeRange, "구간 요청도 다른 방 자료를 읽으면 안 됩니다");

const betaHtml = await (await requestRoom("/room/beta", betaCookie)).text();
assert.match(betaHtml, /공통 과정/);
assert.match(betaHtml, /B 프로젝트 과정/);
assert.doesNotMatch(betaHtml, /A 프로젝트 과정|A 실습|다음에 열립니다/);
assert.equal((await requestRoom("/room/beta/02-alpha/01-alpha", betaCookie)).status, 404);
assert.equal((await requestRoom(`/room/beta/media/${alphaFile}`, betaCookie)).status, 404);
assert.equal((await requestRoom(`/room/beta/media/${publicFile}`, betaCookie)).status, 200);
assert.equal((await requestRoom(`/room/beta/media/${betaFile}`, betaCookie)).status, 200);
assert.equal((await requestRoom(`/room/beta/media/${invalidSchemeFile}`, betaCookie)).status, 404);

const roomTest = await requestRoom("/room-test");
const roomTestHtml = await roomTest.text();
assert.equal(roomTest.status, 200);
assert.match(roomTestHtml, /A 프로젝트 과정/);
assert.match(roomTestHtml, /B 프로젝트 과정/);
assert.equal((await requestRoom(`/room-test/media/${alphaFile}`)).status, 200);
assert.equal((await requestRoom(`/room-test/media/${betaFile}`)).status, 200);

// Only an explicitly linked and open next category continues the lesson sequence.
const firstPath = "/room/alpha/01-shared/01-start";
const unlinked = await (await requestRoom(firstPath, alphaCookie)).text();
assert.doesNotMatch(unlinked, /다음 과정/);
bundle.categories[0].nextCategory = "02-alpha";
const linked = await (await requestRoom(firstPath, alphaCookie)).text();
assert.match(linked, /class="nx" href="\/room\/alpha\/02-alpha\/01-alpha"/);
assert.match(linked, /다음 과정/);
const back = await (await requestRoom("/room/alpha/02-alpha/01-alpha", alphaCookie)).text();
assert.match(back, /href="\/room\/alpha\/01-shared\/01-start"><span>이전 과정/);
const hiddenNext = await (await requestRoom("/room/beta/01-shared/01-start", betaCookie)).text();
assert.doesNotMatch(hiddenNext, /다음 과정|A 프로젝트 과정/);
delete bundle.categories[0].nextCategory;

// Production authentication remains required for slugs with underscores. Local previews use
// the same stored room and unlocks, with both the dev flag and a loopback URL required.
rooms.alpha_one = { ...rooms.alpha, slug: "alpha_one" };
const previewRequest = async (origin, enabled) => {
  const url = new URL(`${origin}/room/alpha_one`);
  return handleRoom(new Request(url), { ...env, LOCAL_PREVIEW_BYPASS: enabled }, url);
};
const localRoom = await previewRequest("http://127.0.0.1:8787", "1");
assert.equal(localRoom.status, 200);
assert.match(await localRoom.text(), /A 프로젝트 과정/);
for (const [origin, flag] of [["https://eddmpython.com", "1"], ["https://eddmpython.com", undefined], ["http://127.0.0.1:8787", undefined]]) {
  const response = await previewRequest(origin, flag);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /type="password"/);
  assert.doesNotMatch(html, /A 프로젝트 과정/);
}
delete rooms.alpha_one;

console.log("classroom worker: 독립 배포와 방별 과정·파일 접근 계약 통과");
