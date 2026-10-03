import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const built = await build({ stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent' });
const password = crypto.randomUUID();
const mf = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-08', compatibilityFlags: ['nodejs_compat'], durableObjects: { CLASSROOM: { className: 'Classroom', useSQLite: true } }, kvNamespaces: ['COURSE'], bindings: { ADMIN_PASSWORD: password, LOCAL_PREVIEW_BYPASS: '1' } });
const origin = 'https://classroom.example';
const root = '/admin/students/questions';
const request = (path, init = {}, cookie = '') => mf.dispatchFetch(origin + path, { ...init, headers: { origin, cookie, ...init.headers }, redirect: 'manual' });
const json = (body, cookie = '', headers = {}) => request(root + '/api', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, cookie);

try {
  const kv = await mf.getKVNamespace('COURSE');
  await kv.put('bundle', JSON.stringify({ schema: 5, sceneContract: 12, categories: [{ slug: '01-start', title: '시작', order: 1, posts: [{ id: '01-first', title: '첫 수업', summary: '실습', body: '## 준비\n\n설명입니다.' }] }] }));
  const ns = await mf.getDurableObjectNamespace('CLASSROOM');
  const stub = ns.get(ns.idFromName('main'));
  const store = async body => { const response = await stub.fetch('https://classroom/do', { method: 'POST', body: JSON.stringify(body) }); assert.equal(response.status, 200); return response.json(); };
  for (const slug of ['personal', 'shared']) {
    await store({ action: 'create', slug, title: slug, password });
    await store({ action: 'toggle', slug, category: '01-start' });
    await store({ action: 'open', slug, open: true });
  }
  const rooms = (await store({ action: 'list' })).rooms;
  const personal = rooms.find(room => room.slug === 'personal'), shared = rooms.find(room => room.slug === 'shared');
  await store({ action: 'studentSave', roomId: personal.id, name: '개인 학습자' });
  const identity = (await store({ action: 'notebookRegister', roomId: shared.id, name: '공용방 학습자', password })).identity;
  const scope = { lesson: '01-start/01-first', lessonTitle: '첫 수업', sectionKey: 'a'.repeat(24), sectionTitle: '준비 <img src=x onerror=alert(1)>' };
  const privateNote = 'privateNoteNeverShownToInstructor';
  await store({ action: 'notebookSaveNote', roomId: personal.id, ownerId: 'personal', ...scope, body: privateNote, version: 0 });
  const ownId = crypto.randomUUID(), sharedId = crypto.randomUUID();
  await store({ action: 'notebookAsk', roomId: personal.id, ownerId: 'personal', ...scope, id: ownId, body: '개인방 질문\n<script>alert(1)</script>' });
  await store({ action: 'notebookAsk', roomId: shared.id, ownerId: identity.id, ...scope, id: sharedId, body: '공용방 질문' });

  assert.equal((await json({ action: 'notebookReply' })).status, 401);
  const anonymous = await (await request(root + '?thread=' + ownId)).text();
  assert.doesNotMatch(anonymous, /개인방 질문|공용방 질문|data-question-card/);
  const login = await request('/admin/login', { method: 'POST', body: new URLSearchParams({ password }) });
  assert.equal(login.status, 303);
  const admin = login.headers.get('set-cookie').split(';')[0];
  const all = await request(root + '?thread=' + ownId, {}, admin);
  assert.equal(all.status, 200);
  assert.match(all.headers.get('cache-control'), /no-store/);
  const html = await all.text();
  assert.equal((html.match(/<a class="question-card" data-question-card="/g) ?? []).length, 2);
  assert.match(html, /공용방 학습자/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<img src=x|<script>alert|privateNoteNeverShownToInstructor/);
  assert.match(html, /data-email-status="local"/);
  assert.doesNotMatch(html, /data-notification-retry data-room=/);
  const filtered = await (await request(root + '?room=' + shared.id, {}, admin)).text();
  assert.equal((filtered.match(/<a class="question-card" data-question-card="/g) ?? []).length, 1);
  assert.match(filtered, /공용방 질문/);
  assert.doesNotMatch(filtered, /개인방 질문/);
  assert.equal((await request(root + '?room=unknown', {}, admin)).status, 404);
  const student = await (await request('/admin/students/' + personal.id, {}, admin)).text();
  assert.ok(student.includes('/admin/students/questions?room=' + personal.id));

  const reply = { action: 'notebookReply', roomId: personal.id, id: ownId, messageId: crypto.randomUUID(), body: '답변\n<script>alert(2)</script>' };
  assert.equal((await json(reply, admin, { origin: 'https://another.example' })).status, 403);
  assert.equal((await json(reply, admin, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await json({ ...reply, roomId: shared.id }, admin)).status, 404);
  assert.equal((await json({ ...reply, body: ' ' }, admin)).status, 400);
  assert.equal((await json({ ...reply, body: '가'.repeat(12001) }, admin)).status, 400);
  assert.equal((await json({ action: 'notebookRead', roomId: personal.id, ownerId: 'personal', ...scope }, admin)).status, 400);
  assert.equal((await request(root + '/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }, admin)).status, 400);
  const response = await json(reply, admin);
  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.match(answer.html, /개인 학습자/);
  assert.match(answer.html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(answer.html, /<script>alert/);
  assert.match(answer.statusHtml, /답변 완료/);
  assert.equal(answer.messageCount, 2);
  assert.equal((await (await json(reply, admin)).json()).messageCount, 2, 'retry must not duplicate a reply');
  const learnerRead = await store({ action: 'notebookRead', roomId: personal.id, ownerId: 'personal', lesson: scope.lesson });
  assert.equal(learnerRead.threads[0].messages.at(-1).body, reply.body);
  assert.equal(learnerRead.notes[0].body, privateNote);
  const pending = await (await request(root + '?status=pending', {}, admin)).text();
  assert.match(pending, /공용방 질문/);
  assert.doesNotMatch(pending, /개인방 질문/);
  assert.equal((await json({ action: 'notebookRetryNotification', roomId: shared.id, id: ownId }, admin)).status, 404);
  const retry = await (await json({ action: 'notebookRetryNotification', roomId: personal.id, id: ownId }, admin)).json();
  assert.equal(retry.state, 'local');

  const preview = '/admin/students/' + personal.id + '/preview';
  const correct = await request(preview + '?lesson=' + encodeURIComponent(scope.lesson) + '&section=' + scope.sectionKey, {}, admin);
  assert.equal(correct.status, 303);
  assert.equal(correct.headers.get('location'), '/room/personal/' + scope.lesson + '#note-' + scope.sectionKey);
  assert.ok(correct.headers.get('set-cookie').startsWith('eddm_preview='));
  for (const target of ['https://other.example', '//other.example', '../../admin/logout', '01-start/missing']) {
    assert.equal((await request(preview + '?lesson=' + encodeURIComponent(target), {}, admin)).headers.get('location'), '/room/personal');
  }
  assert.equal((await request(preview + '?lesson=' + encodeURIComponent(scope.lesson) + '&section=' + encodeURIComponent('"><script>'), {}, admin)).headers.get('location'), '/room/personal/' + scope.lesson);
  console.log('강사 질문함: 공용·개인방, 메모 비공개, HTML 이스케이프, 관리자 인증·동일 출처, 답변 재시도, 수업 미리보기 검증 통과');
} finally { await mf.dispose(); }
