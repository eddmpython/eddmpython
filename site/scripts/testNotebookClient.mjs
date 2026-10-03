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
      id: "01-first", title: "합성 수업", summary: "이동할 수 있는 메모 창을 확인합니다.",
      body: `## 첫 항목\n\n${"본문을 읽으면서 해당 섹션의 메모를 확인합니다.\n\n".repeat(35)}## 둘째 항목\n\n${"다음 섹션의 본문을 읽습니다.\n\n".repeat(25)}`,
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
      actions: ["click", "navigate", "waitFor"], methods: ["Runtime.evaluate", "Input.dispatchMouseEvent"],
      viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, touch: false },
      externalEffects: "acknowledged", purpose: "합성 강의방에서 이동식 메모 창과 긴 메모 보존 검사",
    },
  }));
  client = await PyProcControlClient.start(manifest, { cwd: source, startupTimeoutMs: 180000, shutdownTimeoutMs: 30000 });
  const url = `${origin}/room/${roomSlug}/${lesson}`;
  const opened = await client.openTarget(`${origin}/room/${roomSlug}`, { expectedRisk: "externalEffect", waitUntil: "load" });
  const session = (await client.attachSession(opened.output.targetRef)).output;
  await client.act(session, [{ kind: 'navigate', url, expectedRisk: 'externalEffect', waitUntil: 'load', timeoutMs: 15000 }], { timeoutMs: 30000 });
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
  const open = async () => {
    await click('[data-notebook-open]');
    await until(() => evaluate(`Boolean(document.querySelector('[data-note-body]') && !document.querySelector('#notebook-panel').hidden)`), Boolean, '메모 창을 열지 못했다');
  };
  const select = key => evaluate(`(() => {
    const section = document.querySelector('[data-note-section]');
    section.value = ${JSON.stringify(key)};
    section.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const scrollTo = anchor => evaluate(`(async () => {
    const heading = document.getElementById(${JSON.stringify(anchor)});
    window.scrollTo({ top: scrollY + heading.getBoundingClientRect().top - 100, behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  })()`);
  const box = () => evaluate(`(() => {
    const panel = document.querySelector('#notebook-panel'), rect = panel.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  })()`);
  const inside = value => value.left >= -1 && value.top >= -1 && value.right <= value.viewportWidth + 1 && value.bottom <= value.viewportHeight + 1;
  const drag = async (from, to) => {
    const mouse = params => client.command(session, 'Input.dispatchMouseEvent', params, { expectedRisk: 'externalEffect' });
    await mouse({ type: 'mouseMoved', x: from.x, y: from.y, button: 'none', buttons: 0 });
    await mouse({ type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let step = 1; step <= 6; step++) await mouse({ type: 'mouseMoved', x: from.x + (to.x - from.x) * step / 6, y: from.y + (to.y - from.y) * step / 6, button: 'left', buttons: 1 });
    await mouse({ type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
  };
  assert.equal(await evaluate(`document.querySelectorAll('[data-notebook-open]').length`), 1, '목차에 메모 창을 여는 버튼 하나만 둔다');
  await open();
  const keys = await evaluate(`[...document.querySelector('[data-note-section]').options].map(option => option.value)`);
  const anchors = await evaluate(`[...document.querySelectorAll('article h2[id]')].map(heading => heading.id)`);
  assert.equal(keys.length, 2);
  const surface = await evaluate(`(() => {
    const panel = document.querySelector('#notebook-panel');
    return {
      role: panel.getAttribute('role'), modal: panel.getAttribute('aria-modal'),
      outsideInert: Boolean(document.querySelector('article').closest('[inert]')),
      questions: panel.querySelectorAll('[data-question-body], [data-question-send], [data-thread], [data-followup]').length,
      fixed: getComputedStyle(panel).position, resize: getComputedStyle(panel).resize,
    };
  })()`);
  assert.deepEqual(surface, { role: 'dialog', modal: 'false', outsideInert: false, questions: 0, fixed: 'fixed', resize: 'both' });
  assert.equal(inside(await box()), true, '메모 창이 화면 안에서 열린다');
  const initialBox = await box();
  assert.ok(initialBox.height >= 580, `기본 메모 창에서 긴 내용을 볼 세로 공간을 확보한다: ${JSON.stringify(initialBox)}`);
  assert.equal(await evaluate(`document.querySelector('[data-question-open]')?.textContent`), '질문하기');
  assert.equal(await evaluate(`document.querySelector('.notebook-ask-link span')?.textContent`), '궁금한건 그때그때 질문하세요!');

  const note = Array.from({ length: 110 }, (_, index) => `메모 ${index + 1}: 긴 내용을 적어도 순서와 줄바꿈을 그대로 보존합니다.`).join('\n');
  const secondNote = '둘째 항목의 별도 메모';
  await input('[data-note-body]', note);
  await until(read, result => result.notes.some(item => item.sectionKey === keys[0] && item.body === note), '긴 메모 자동 저장 실패');
  await select(keys[1]);
  assert.equal(await field('[data-note-body]'), '');
  await input('[data-note-body]', secondNote);
  await until(read, result => result.notes.some(item => item.sectionKey === keys[1] && item.body === secondNote), '둘째 메모 자동 저장 실패');
  await select(keys[0]);
  assert.equal(await field('[data-note-body]'), note, '섹션을 바꿨다 돌아와도 긴 메모를 유지한다');
  console.log('  긴 메모 자동 저장과 섹션별 내용 보존 확인');

  await scrollTo(anchors[1]);
  await until(() => field('[data-note-section]'), key => key === keys[1], '본문 이동을 따라 메모 섹션을 선택하지 못했다');
  assert.equal(await field('[data-note-body]'), secondNote);
  await click('[data-note-body]');
  await scrollTo(anchors[0]);
  assert.equal(await field('[data-note-section]'), keys[1], '메모를 편집하는 동안 본문 이동으로 섹션을 바꾸지 않는다');
  await evaluate(`document.querySelector('[data-note-body]').blur()`);
  await until(() => field('[data-note-section]'), key => key === keys[0], '편집을 마치면 보류한 본문 섹션을 반영한다');
  assert.equal(await field('[data-note-body]'), note);
  console.log('  본문 이동 자동 선택과 편집 중 전환 보류 확인');

  const beforeMove = await box();
  const handle = await evaluate(`(() => {
    const rect = document.querySelector('[data-note-drag]').getBoundingClientRect();
    return { x: rect.left + 30, y: rect.top + rect.height / 2 };
  })()`);
  await drag(handle, { x: Math.max(50, handle.x - 230), y: Math.max(50, handle.y - 90) });
  const moved = await box();
  assert.ok(Math.abs(moved.left - beforeMove.left) > 20 || Math.abs(moved.top - beforeMove.top) > 20, '제목줄을 끌면 창 위치가 바뀐다');
  assert.equal(inside(moved), true, '이동한 메모 창이 화면 안에 남는다');
  const resizeFrom = { x: moved.right - 3, y: moved.bottom - 3 };
  await drag(resizeFrom, { x: Math.min(moved.viewportWidth - 4, resizeFrom.x + 180), y: Math.min(moved.viewportHeight - 4, resizeFrom.y + 160) });
  const resized = await until(box, value => value.width > moved.width + 30 || value.height > moved.height + 30, '창 모서리를 끌어 크기를 바꾸지 못했다');
  assert.equal(inside(resized), true, '크기를 바꾼 창도 화면 안에 남는다');
  assert.equal(await field('[data-note-body]'), note);
  console.log('  제목줄 이동과 모서리 크기 조절 확인');

  const largeHeight = resized.height;
  await click('[data-note-minimize]');
  await until(box, value => value.height < largeHeight / 2, '메모 창이 최소화되지 않았다');
  await click('[data-note-minimize]');
  await until(box, value => value.height > largeHeight / 2, '메모 창이 복원되지 않았다');
  assert.equal(await field('[data-note-body]'), note, '최소화·복원 뒤 메모를 유지한다');
  await click('[data-note-close]');
  assert.equal(await evaluate(`document.querySelector('#notebook-panel').hidden`), true);
  await open();
  await select(keys[0]);
  assert.equal(await field('[data-note-body]'), note, '닫았다 열어도 긴 메모를 유지한다');

  // 저장된 메모만 있으므로 페이지를 다시 열 때 미저장 확인이 필요하지 않다.
  await client.act(session, [{ kind: 'navigate', url, expectedRisk: 'externalEffect', waitUntil: 'load', timeoutMs: 15000 }], { timeoutMs: 30000 });
  await open();
  await select(keys[0]);
  assert.equal(await field('[data-note-body]'), note, '페이지 재진입 뒤 긴 메모를 복원한다');
  await select(keys[1]);
  assert.equal(await field('[data-note-body]'), secondNote, '페이지 재진입 뒤 둘째 메모를 복원한다');
  const saved = await read();
  assert.equal(saved.notes.length, 2);
  assert.equal(saved.threads.length, 0, '메모 작성으로 질문을 생성하지 않는다');
  assert.equal(await evaluate(`document.querySelectorAll('[data-question-body], [data-question-send], [data-thread], [data-followup]').length`), 0, '기본 메모 화면에는 질문 입력이나 답변 UI를 펼치지 않는다');
  assert.equal(await evaluate(`Boolean(document.querySelector('article').closest('[inert]'))`), false, '메모 창을 연 채 본문을 사용할 수 있다');

  await select(keys[0]);
  await click('[data-question-open]');
  assert.equal(await field('[data-question-body]'), '', '질문 입력에 메모 내용을 복사하지 않는다');
  assert.equal(await evaluate(`document.querySelector('[data-note-drag] b').textContent`), '메모', '질문 입력 중에도 기능명은 메모다');
  const question = 'firstQuestionForInstructor';
  await input('[data-question-body]', question);
  await click('[data-question-back]');
  assert.equal(await field('[data-note-body]'), note);
  await click('[data-question-open]');
  assert.equal(await field('[data-question-body]'), question, '메모를 보고 돌아와도 질문 초안은 유지한다');
  await scrollTo(anchors[1]);
  assert.equal(await field('[data-note-section]'), keys[0], '질문 화면에서는 본문을 이동해도 질문 대상을 유지한다');
  assert.equal((await read()).threads.length, 0, '질문 입력만으로 강사에게 전송하지 않는다');
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
        await new Promise(resolve => { window.releaseQuestion = resolve; });
        window.questionReturned = true;
      }
      return response;
    };
  })()`);
  await click('[data-question-send]');
  await until(() => evaluate(`document.querySelector('[data-question-status]')?.textContent`), text => text?.includes('합성 응답 유실'), '전송 실패가 표시되지 않았다');
  assert.equal(await field('[data-question-body]'), question, '전송 실패 뒤 질문을 유지한다');
  assert.equal((await read()).threads.length, 1);
  await click('[data-question-send]');
  await until(() => evaluate(`typeof window.releaseQuestion`), type => type === 'function', '질문 응답 대기 실패');
  await click('[data-question-back]');
  await until(() => field('[data-note-section]'), key => key === keys[1], '메모로 돌아오면 질문 중 보류한 본문 섹션을 반영한다');
  const editedNote = secondNote + '\n질문 응답을 기다리며 추가한 메모';
  await click('[data-note-body]');
  await input('[data-note-body]', editedNote);
  await evaluate(`window.memoEditor = document.querySelector('[data-note-body]'); window.memoEditor.setSelectionRange(4, 4); window.releaseQuestion()`);
  await until(() => evaluate(`window.questionReturned`), Boolean, '질문 응답이 돌아오지 않았다');
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`document.querySelector('[data-note-body]') === window.memoEditor`), true, '늦은 질문 응답이 메모 편집기를 다시 만들지 않는다');
  assert.equal(await evaluate(`window.memoEditor.selectionStart`), 4, '질문 응답이 도착해도 메모 커서 위치를 유지한다');
  assert.equal(await field('[data-note-body]'), editedNote);
  await until(read, result => result.notes.some(item => item.sectionKey === keys[1] && item.body === editedNote), '질문 응답 중 작성한 메모 저장 실패');
  const attempts = await evaluate('window.notebookAttempts');
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].id, attempts[1].id, '응답 유실 뒤에는 같은 질문 id로 재시도한다');
  assert.ok(attempts.every(item => item.body === question && item.sectionKey === keys[0]), '선택한 섹션의 질문 내용만 전송한다');
  const afterQuestion = await read();
  assert.equal(afterQuestion.threads.length, 1, '질문 재시도로 중복 질문을 만들지 않는다');
  assert.equal(afterQuestion.threads[0].messages[0].body, question);
  assert.deepEqual(afterQuestion.notes.find(item => item.sectionKey === keys[0]), saved.notes.find(item => item.sectionKey === keys[0]), '질문 전송이 원래 섹션의 메모를 변경하지 않는다');
  await click('[data-question-open]');
  await select(keys[0]);
  assert.equal(await field('[data-question-body]'), '', '전송한 질문 입력칸을 비운다');
  assert.equal(await evaluate(`document.querySelectorAll('[data-thread]').length`), 1);
  const login = await mf.dispatchFetch(`${origin}/admin/login`, { method: 'POST', headers: { origin }, body: new URLSearchParams({ password }), redirect: 'manual' });
  assert.equal(login.status, 303);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const inbox = await mf.dispatchFetch(`${origin}/admin/students/questions?thread=${afterQuestion.threads[0].id}`, { headers: { origin, cookie } });
  assert.equal(inbox.status, 200);
  const html = await inbox.text();
  assert.ok(html.includes(question), '강사 질문함에서 보낸 질문을 확인한다');
  assert.ok(!html.includes(note.split('\n')[0]) && !html.includes(secondNote), '강사 질문함에 메모가 노출되지 않는다');
  console.log('메모 창 동작: 긴 메모 저장, 본문 자동 선택, 이동·크기·최소화·재진입, 독립 질문 입력과 재시도·메모 보존 통과');
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
