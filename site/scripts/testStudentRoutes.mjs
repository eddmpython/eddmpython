import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const built = await build({ stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent' });
const password = crypto.randomUUID();
// 설치된 workerd가 지원하는 날짜로 실행한다. 운영 배포의 호환성 날짜는 설정 파일에서 유지한다.
const mf = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-08', compatibilityFlags: ['nodejs_compat'], durableObjects: { CLASSROOM: { className: 'Classroom', useSQLite: true } }, kvNamespaces: ['COURSE'], r2Buckets: ['SUBMISSIONS'], bindings: { ADMIN_PASSWORD: password } });
const origin = 'https://classroom.example';
const request = async (path, init = {}, cookie = '') => {
  const sent = new Request(origin + path, { ...init, headers: { origin, cookie, ...init.headers }, redirect: 'manual' });
  return mf.dispatchFetch(sent.url, { method: sent.method, headers: Object.fromEntries(sent.headers), body: sent.body ? await sent.arrayBuffer() : undefined, redirect: 'manual' });
};
const json = (path, data, cookie) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }, cookie);
const post = (path, data, cookie) => request(path, { method: 'POST', body: new URLSearchParams(data) }, cookie);
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];
try {
  const kv = await mf.getKVNamespace('COURSE');
  await kv.put('bundle', JSON.stringify({ schema: 4, sceneContract: 12, categories: [{ slug: '01-start', title: '시작', order: 1, posts: [{ id: '01-first', title: '첫 수업', summary: '실습', body: '## 준비\n\n설명입니다.' }] }] }));
  await kv.put('version', 'test');
  assert.equal((await json('/admin/students/api', { action: 'studentList' })).status, 401);
  const login = await post('/admin/login', { password });
  assert.equal(login.status, 303);
  const admin = cookieOf(login);
  for (const slug of ['alpha', 'beta']) {
    assert.equal((await json('/admin/api', { action: 'create', slug, title: slug, password }, admin)).status, 200);
    await json('/admin/api', { action: 'toggle', slug, category: '01-start' }, admin);
    await json('/admin/api', { action: 'open', slug, open: true }, admin);
  }
  const rooms = (await (await json('/admin/api', { action: 'list' }, admin)).json()).rooms;
  const alpha = rooms.find(r => r.slug === 'alpha'), beta = rooms.find(r => r.slug === 'beta');
  for (const room of rooms) await json('/admin/students/api', { action: 'studentSave', roomId: room.id, name: room.slug }, admin);
  const assignment = await (await json('/admin/students/api', { action: 'studentAssignment', roomId: alpha.id, title: '첫 숙제', instructions: '파일을 제출하세요', dueAt: null, method: 'file', lesson: '01-start/01-first' }, admin)).json();
  assert.ok(assignment.id);
  const aCookie = cookieOf(await post('/room/alpha/login', { password }));
  const bCookie = cookieOf(await post('/room/beta/login', { password }));
  assert.match(await (await request('/room/alpha/homework')).text(), /비밀번호/);
  assert.equal((await request('/room/beta/homework/' + assignment.id, {}, bCookie)).status, 404);
  const form = new FormData();
  form.set('id', crypto.randomUUID()); form.set('body', '실습 결과'); form.set('files', new File(['private result'], 'result.txt'));
  const submitted = await request('/room/alpha/homework/' + assignment.id, { method: 'POST', body: form }, aCookie);
  assert.equal(submitted.status, 303, (await submitted.text()).match(/role="alert">([^<]*)/)?.[1]);
  const html = await (await request('/room/alpha/homework/' + assignment.id, {}, aCookie)).text();
  const filePath = html.match(/href="(\/room\/alpha\/homework\/files\/[^\"]+)"/)[1];
  assert.equal(await (await request(filePath, {}, aCookie)).text(), 'private result');
  assert.equal((await request(filePath.replace('/alpha/', '/beta/'), {}, bCookie)).status, 404);
  const detail = await (await request('/admin/students/' + alpha.id, {}, admin)).text();
  const submissionId = detail.match(/name="id" value="([^"]+)"/g).map(s => s.match(/value="([^"]+)/)[1]).find(id => id !== assignment.id);
  assert.equal((await json('/admin/students/api', { action: 'studentReview', roomId: beta.id, id: submissionId, status: 'accepted' }, admin)).status, 404);
  assert.equal((await json('/admin/students/api', { action: 'studentReview', roomId: alpha.id, id: submissionId, status: 'revision', feedback: '결과를 다시 확인하세요' }, admin)).status, 200);
  assert.match(await (await request('/room/alpha/homework/' + assignment.id, {}, aCookie)).text(), /결과를 다시 확인하세요/);
  const preview = await request('/admin/students/' + alpha.id + '/preview', {}, admin);
  const previewCookie = cookieOf(preview);
  const eventsBefore = await (await json('/admin/students/api', { action: 'studentEvents', roomId: alpha.id }, admin)).text();
  await request('/room/alpha/01-start/01-first', {}, previewCookie);
  assert.equal(await (await json('/admin/students/api', { action: 'studentEvents', roomId: alpha.id }, admin)).text(), eventsBefore);
  assert.equal((await request('/room/alpha/homework/' + assignment.id, { method: 'POST', body: form }, previewCookie)).status, 403);
  assert.equal((await json('/room/alpha/activity', { kind: 'section', category: '01-start', post: '01-first', section: 99 }, aCookie)).status, 404);
  assert.equal((await json('/room/alpha/activity', { kind: 'section', category: '01-start', post: '01-first', section: 1 }, aCookie)).status, 200);
  assert.equal((await request('/room/alpha/activity', { method: 'POST', body: JSON.stringify({ kind: 'lecture' }), headers: { origin: 'https://another.example' } }, aCookie)).status, 403);
  await json('/admin/api', { action: 'rename', slug: 'alpha', nextSlug: 'renamed', title: '새 제목' }, admin);
  const renamed = (await (await json('/admin/api', { action: 'list' }, admin)).json()).rooms.find(r => r.slug === 'renamed');
  assert.equal(renamed.id, alpha.id);
  const renamedCookie = cookieOf(await post('/room/renamed/login', { password }));
  assert.match(await (await request('/room/renamed/homework/' + assignment.id, {}, renamedCookie)).text(), /결과를 다시 확인하세요/);
  console.log('수강자 HTTP: 인증, 파일 제출·다운로드, 다른 방 접근 차단, 피드백, 미리보기 기록 제외, 주소 변경 후 이력 보존 확인');
} finally { await mf.dispose(); }
