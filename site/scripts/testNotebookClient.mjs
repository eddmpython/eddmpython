import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { PyProcControlClient } from "pyproc/control";
import { executionRoot } from "./executionWorkspace.mjs";

const source = fileURLToPath(new URL("../", import.meta.url));
const shared = process.platform === "win32"
  ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "dev-workspace")
  : join(homedir(), ".local", "share", "dev-workspace");
await mkdir(shared, { recursive: true });
const workspace = executionRoot(await mkdtemp(join(shared, "notebookClient-")));
const beforeEnv = Object.fromEntries(["TEMP", "TMP", "TMPDIR", "EDDMPYTHON_RUN_DIR"].map(key => [key, process.env[key]]));
const temp = join(workspace, "tmp");
await mkdir(temp);
Object.assign(process.env, { TEMP: temp, TMP: temp, TMPDIR: temp, EDDMPYTHON_RUN_DIR: workspace });
let mf, client;

try {
  // 운영 교안과 방을 읽거나 변경하지 않는 독립된 HTTP 서버다.
  const built = await build({
    stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: source },
    bundle: true, format: "esm", platform: "browser", write: false, logLevel: "silent",
  });
  const password = crypto.randomUUID();
  mf = new Miniflare({
    rootPath: workspace, host: "127.0.0.1", port: 0, modules: true, script: built.outputFiles[0].text,
    compatibilityDate: "2026-08-08", compatibilityFlags: ["nodejs_compat"],
    durableObjects: { CLASSROOM: { className: "Classroom", useSQLite: true } },
    durableObjectsPersist: join(workspace, "durable"), kvNamespaces: ["COURSE"], kvPersist: join(workspace, "kv"),
    r2Buckets: ["SUBMISSIONS"], r2Persist: join(workspace, "r2"),
    bindings: { ADMIN_PASSWORD: password, LOCAL_PREVIEW_BYPASS: "1" },
  });
  const origin = (await mf.ready).origin;
  const lesson = "01-start/01-first", roomSlug = "note-client";
  const kv = await mf.getKVNamespace("COURSE");
  await kv.put("bundle", JSON.stringify({ schema: 5, sceneContract: 12, categories: [{
    slug: "01-start", title: "메모 동작 확인", order: 1, posts: [{
      id: "01-first", title: "합성 수업", summary: "메모와 질문 입력을 확인합니다.",
      body: "## 첫 항목\n\n첫 항목 설명입니다.\n\n## 둘째 항목\n\n둘째 항목 설명입니다.",
    }],
  }] }));
  await kv.put("version", "notebook-client-test");
  const ns = await mf.getDurableObjectNamespace("CLASSROOM"), stub = ns.get(ns.idFromName("main"));
  const store = async body => {
    const response = await stub.fetch("https://classroom/do", { method: "POST", body: JSON.stringify(body) });
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  };
  await store({ action: "create", slug: roomSlug, title: "메모 동작 확인", password });
  await store({ action: "toggle", slug: roomSlug, category: "01-start" });
  await store({ action: "open", slug: roomSlug, open: true });
  const room = (await store({ action: "list" })).rooms.find(item => item.slug === roomSlug);
  await store({ action: "studentSave", roomId: room.id, name: "학습자" });
  const read = () => store({ action: "notebookRead", roomId: room.id, ownerId: "personal", lesson });
  const until = async (readValue, matches, message) => {
    const end = Date.now() + 15000;
    while (Date.now() < end) {
      const result = await readValue();
      if (matches(result)) return result;
      await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    assert.fail(message);
  };
  const manifest = join(workspace, "browser.json");
  await writeFile(manifest, JSON.stringify({
    schemaVersion: 1, engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" }, timeoutMs: 180000,
    browser: {
      enabled: true, provider: "nativeCdp", allowedOrigins: [origin], maxRisk: "externalEffect",
      actions: ["click", "navigate", "waitFor"], methods: ["Runtime.evaluate"],
      viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, touch: false },
      externalEffects: "acknowledged", purpose: "합성 강의방에서 메모와 질문 입력 분리 검사",
    },
  }));
  client = await PyProcControlClient.start(manifest, { cwd: source, startupTimeoutMs: 180000, shutdownTimeoutMs: 30000 });
  const url = `${origin}/room/${roomSlug}/${lesson}`;
  const opened = await client.openTarget(url, { expectedRisk: "externalEffect", waitUntil: "load" });
  const session = (await client.attachSession(opened.output.targetRef)).output;
  const evaluate = async expression => {
    const result = await client.command(session, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, { expectedRisk: "externalEffect" });
    const exception = result.output?.result?.exceptionDetails;
    if (exception) throw new Error(exception.exception?.description || exception.text || "브라우저 평가 실패");
    return result.output?.result?.result?.value;
  };
  const click = selector => client.act(session, [{ kind: "click", selector, expectedRisk: "externalEffect" }]);
  const field = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.value`);
  const input = (selector, body) => evaluate(`(() => {
    const area = document.querySelector(${JSON.stringify(selector)});
    if (!area || area.readOnly || area.disabled) throw new Error('입력할 수 없는 영역');
    area.value = ${JSON.stringify(body)};
    area.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const keys = await evaluate(`[...document.querySelectorAll('.notebook-rail .toc [data-notebook-open]')].map(button => button.dataset.notebookOpen)`);
  assert.equal(keys.length, 2, "각 목차 항목에서 메모를 연다");
  const open = async key => {
    await click(`.notebook-rail .toc [data-notebook-open="${key}"]`);
    await until(() => evaluate(`Boolean(document.querySelector('[data-question-body]'))`), Boolean, "질문 입력 영역을 열지 못했다");
  };
  const note = "privateMemoOnlyForLearner", question = "firstQuestionForInstructor", otherQuestion = "secondQuestionDraft";
  await open(keys[0]);
  assert.equal(await evaluate(`Boolean(document.querySelector('.notebook-rail .toc').contains(document.querySelector('#notebook-panel')))`), true);
  await input("[data-note-body]", note);
  await until(read, result => result.notes.some(item => item.sectionKey === keys[0] && item.body === note), "메모 자동 저장 실패");
  await input("[data-question-body]", question);
  assert.equal((await read()).threads.length, 0, "질문을 입력하는 것만으로 강사에게 보내지 않는다");
  await open(keys[1]);
  assert.equal(await field("[data-question-body]"), "");
  await input("[data-question-body]", otherQuestion);
  await open(keys[0]);
  assert.equal(await field("[data-note-body]"), note);
  assert.equal(await field("[data-question-body]"), question, "다른 섹션을 열었다 돌아와도 질문 초안을 유지한다");
  console.log("  메모 자동 저장과 섹션별 질문 입력 확인");

  const reloaded = await client.act(session, [{ kind: "click", selector: ".nav-post.on", dialog: { decision: "accept" }, expectedRisk: "externalEffect", timeoutMs: 15000 }], { timeoutMs: 30000 });
  assert.equal(reloaded.output.actions[0].result.dialog.type, "beforeunload", "미전송 초안이 있으면 이동 전 확인한다");
  await client.act(session, [{ kind: "waitFor", selector: `.notebook-rail [data-notebook-open="${keys[0]}"]`, timeoutMs: 15000, expectedRisk: "read" }]);
  await open(keys[1]);
  assert.equal(await field("[data-question-body]"), otherQuestion, "새로고침 뒤 둘째 섹션 질문 초안을 복원한다");
  await open(keys[0]);
  assert.equal(await field("[data-note-body]"), note);
  assert.equal(await field("[data-question-body]"), question, "새로고침 뒤 첫 섹션 질문 초안을 복원한다");
  console.log("  페이지 재진입 뒤 메모와 두 질문 초안 복원 확인");

  // 서버가 받은 뒤 응답만 유실되면 다시 보내도 같은 질문이 하나만 남아야 한다.
  await evaluate(`(() => {
    const fetchOriginal = window.fetch.bind(window);
    window.notebookAttempts = [];
    window.fetch = async (...args) => {
      const data = args[1]?.body && typeof args[1].body === 'string' ? JSON.parse(args[1].body) : null;
      const response = await fetchOriginal(...args);
      if (data?.action === 'ask') {
        window.notebookAttempts.push(data);
        if (window.notebookAttempts.length === 1) {
          if (!response.ok) throw new Error('합성 질문 저장 실패');
          await response.clone().text();
          throw new Error('합성 응답 유실');
        }
      }
      return response;
    };
  })()`);
  await click("[data-question-send]");
  await until(() => evaluate(`document.querySelector('[data-question-status]')?.textContent`), text => text?.includes("합성 응답 유실"), "전송 실패가 표시되지 않았다");
  assert.equal(await field("[data-question-body]"), question, "전송 실패 뒤 질문을 유지한다");
  assert.equal(await field("[data-note-body]"), note, "질문 전송이 메모를 바꾸지 않는다");
  assert.equal((await read()).threads.length, 1);
  await click("[data-question-send]");
  await until(() => evaluate(`document.querySelectorAll('[data-thread]').length`), count => count === 1, "질문 재시도 결과가 표시되지 않았다");
  const attempts = await evaluate("window.notebookAttempts");
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].id, attempts[1].id, "응답 유실 뒤에는 같은 질문 id로 재시도한다");
  assert.ok(attempts.every(item => item.body === question), "메모 내용 대신 질문 입력 내용만 전송한다");
  const saved = await read();
  assert.equal(saved.threads.length, 1, "응답 유실 뒤 재시도가 질문을 중복 생성하지 않는다");
  assert.equal(saved.threads[0].messages[0].body, question);
  assert.equal(saved.notes.length, 1);
  assert.equal(saved.notes[0].body, note);
  assert.equal(saved.notes[0].version, 1, "질문 전송으로 개인 메모를 다시 저장하지 않는다");
  assert.equal(await field("[data-note-body]"), note);
  assert.equal(await field("[data-question-body]"), "", "전송한 질문 입력칸을 비운다");
  await open(keys[1]);
  assert.equal(await field("[data-question-body]"), otherQuestion, "첫 질문 전송 뒤에도 다른 섹션 초안을 유지한다");

  const login = await mf.dispatchFetch(`${origin}/admin/login`, { method: "POST", headers: { origin }, body: new URLSearchParams({ password }), redirect: "manual" });
  assert.equal(login.status, 303);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const inbox = await mf.dispatchFetch(`${origin}/admin/students/questions?thread=${saved.threads[0].id}`, { headers: { origin, cookie } });
  assert.equal(inbox.status, 200);
  const html = await inbox.text();
  assert.ok(html.includes(question), "강사 질문함에서 보낸 질문을 확인한다");
  assert.ok(!html.includes(note), "강사 질문함에 개인 메모가 노출되지 않는다");
  assert.ok(!html.includes(otherQuestion), "보내지 않은 질문 초안은 강사에게 노출되지 않는다");
  console.log("메모 입력 동작: 목차 펼침, 메모와 질문 분리, 섹션별 초안 복원, 응답 유실 재시도, 강사 질문함 비공개 경계 통과");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (client) await client.close();
  if (mf) await mf.dispose();
  for (const [key, value] of Object.entries(beforeEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  assert.equal(dirname(resolve(workspace)), resolve(shared), "이 검사에서 만든 실행 공간만 정리한다");
  await rm(workspace, { recursive: true, maxRetries: 20, retryDelay: 100 });
}
// pyproc 브라우저 호스트의 종료 뒤 남는 핸들이 검사 프로세스를 붙들지 않게 한다.
process.exit(process.exitCode ?? 0);
