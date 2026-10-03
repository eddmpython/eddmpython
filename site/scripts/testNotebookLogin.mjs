import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { fileURLToPath } from "node:url";

const built = await build({
  stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, platform: "browser", format: "esm", write: false, logLevel: "silent",
});
const password = crypto.randomUUID();
const mf = new Miniflare({
  modules: true, script: built.outputFiles[0].text, compatibilityDate: "2026-08-08", compatibilityFlags: ["nodejs_compat"],
  durableObjects: { CLASSROOM: { className: "Classroom", useSQLite: true } }, kvNamespaces: ["COURSE"], bindings: { ADMIN_PASSWORD: password },
});
const origin = "https://classroom.example";
const request = (path, init = {}, cookie = "") => mf.dispatchFetch(origin + path, { ...init, redirect: "manual", headers: { origin, cookie, ...init.headers } });
const submit = (returnTo, value = password) => request("/admin/login", { method: "POST", body: new URLSearchParams({ password: value, ...(returnTo === undefined ? {} : { returnTo }) }) });
const hidden = html => html.match(/name="returnTo" value="([^"]+)"/)?.[1];
try {
  const kv = await mf.getKVNamespace("COURSE");
  await kv.put("bundle", JSON.stringify({ schema: 5, sceneContract: 12, categories: [] }));
  const ns = await mf.getDurableObjectNamespace("CLASSROOM"), stub = ns.get(ns.idFromName("main"));
  const call = async body => { const response = await stub.fetch("https://classroom/do", { method: "POST", body: JSON.stringify(body) }); assert.equal(response.status, 200); return response.json(); };
  await call({ action: "create", slug: "sample", title: "실습방", password });
  const room = (await call({ action: "list" })).rooms[0];
  await call({ action: "studentSave", roomId: room.id, name: "학습자" });
  const threadId = crypto.randomUUID();
  await call({ action: "notebookAsk", roomId: room.id, ownerId: "personal", id: threadId,
    lesson: "sample/lesson", lessonTitle: "입력 검증", sectionKey: "result", sectionTitle: "실행 결과", body: "로그인 뒤 이 질문으로 돌아왔습니다." });
  const questionPath = `/admin/students/questions?thread=${threadId}`;
  const gate = await request(questionPath);
  assert.equal(gate.status, 200);
  const gateHtml = await gate.text();
  assert.match(gateHtml, /action="\/admin\/login"/);
  assert.equal(hidden(gateHtml), questionPath);
  assert.doesNotMatch(gateHtml, /로그인 뒤 이 질문으로 돌아왔습니다/);

  const denied = await submit(hidden(gateHtml), "wrong-password");
  assert.equal(denied.status, 401);
  const deniedHtml = await denied.text();
  assert.equal(hidden(deniedHtml), questionPath, "틀린 비밀번호 뒤에도 질문 위치를 유지한다");
  assert.equal(denied.headers.get("set-cookie"), null);
  const loggedIn = await submit(hidden(deniedHtml));
  assert.equal(loggedIn.status, 303);
  assert.equal(loggedIn.headers.get("location"), questionPath);
  const session = loggedIn.headers.get("set-cookie");
  assert.match(session, /Path=\/admin/);
  assert.match(session, /HttpOnly/);
  assert.match(session, /Secure/);
  const opened = await request(questionPath, {}, session.split(";")[0]);
  assert.equal(opened.status, 200);
  const openedHtml = await opened.text();
  assert.match(openedHtml, /로그인 뒤 이 질문으로 돌아왔습니다/);
  assert.ok(openedHtml.includes(`data-question-card="${threadId}"`));

  assert.equal((await submit()).headers.get("location"), "/admin/students");
  assert.equal((await submit("/admin/students/questions")).headers.get("location"), "/admin/students/questions");
  for (const target of [
    "https://other.example/admin/students/questions", "//other.example/admin/students/questions",
    "\\\\other.example\\admin\\students\\questions", "/\\other.example/admin/students/questions",
    "/admin/students/questions\r\nLocation:https://other.example", "/admin/students/questions\u0000",
    "/admin/login", "/admin/logout", "/admin/api", "/admin/students/api", "/admin/students/sample/preview",
    "/admin/students/questions/../api", "/admin/api/../students/questions", "/admin%2Fstudents%2Fquestions",
    "/admin/students/questions#reply", `${questionPath}#reply`, `${questionPath}&next=https://other.example`,
    `${questionPath}&thread=${crypto.randomUUID()}`, "/admin/students/questions?thread=%0d%0aLocation:evil",
    "/admin/students/questions?thread=%22%3E%3Cscript%3Ealert(1)%3C/script%3E",
  ]) {
    const response = await submit(target);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/admin/students", "허용된 질문 화면 외에는 로그인 기본 화면으로 이동한다");
  }
  const injected = await submit('/admin/students/questions?thread="><script>window.bad=1</script>', "wrong-password");
  const safeGate = await injected.text();
  assert.equal(hidden(safeGate), "/admin/students");
  assert.doesNotMatch(safeGate, /window.bad/);
  assert.equal((await request("/admin/login?returnTo=" + encodeURIComponent(questionPath))).headers.get("location"), "/admin", "기존 GET 로그인 경로를 바꾸지 않는다");
  const anonymousApi = await request("/admin/students/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "notebookReply", returnTo: questionPath }) });
  assert.equal(anonymousApi.status, 401);
  assert.match(anonymousApi.headers.get("content-type"), /application\/json/);
  console.log("질문 링크 로그인 검사 통과: 로그인 전 비공개, 실패 후 위치 유지, 성공 후 질문 복귀, 외부·작업 경로 차단");
} finally { await mf.dispose(); }
