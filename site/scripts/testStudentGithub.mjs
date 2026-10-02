import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const built = await build({ stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent' });
const token = crypto.randomUUID(), password = crypto.randomUUID(), calls = [];
let privateRepo = true, accepted = false, inviteStatus = 201;
const mf = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-08', compatibilityFlags: ['nodejs_compat'], durableObjects: { CLASSROOM: { className: 'Classroom', useSQLite: true } }, kvNamespaces: ['COURSE'], bindings: { ADMIN_PASSWORD: password, GITHUB_INVITE_TOKEN: token, LOCAL_PREVIEW_BYPASS: '1' }, outboundService: async request => {
  const url = new URL(request.url);
  assert.equal(url.hostname, 'api.github.com');
  assert.equal(request.headers.get('authorization'), 'Bearer ' + token);
  calls.push(request.method + ' ' + url.pathname);
  if (url.pathname === '/repos/sample/practice') return Response.json({ private: privateRepo, full_name: 'sample/practice' });
  if (url.pathname === '/users/missing') return new Response(null, { status: 404 });
  if (url.pathname === '/users/learner') return Response.json({ id: 123, type: 'User' });
  if (url.pathname.endsWith('/collaborators/learner')) {
    if (request.method === 'PUT') { assert.deepEqual(await request.json(), { permission: 'push' }); return new Response('{}', { status: inviteStatus }); }
    return new Response(null, { status: accepted ? 204 : 404 });
  }
  throw new Error('Unexpected GitHub call: ' + request.method + ' ' + url.pathname);
} });
const origin = 'https://classroom.example';
const request = (path, init = {}, cookie = '') => mf.dispatchFetch(origin + path, { ...init, headers: { origin, cookie, ...init.headers }, redirect: 'manual' });
const json = (path, body, cookie = '', headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, cookie);
const login = async path => (await request(path, { method: 'POST', body: new URLSearchParams({ password }) })).headers.get('set-cookie').split(';')[0];
const input = { username: 'learner', mode: 'invite', confirm: true };
try {
  const kv = await mf.getKVNamespace('COURSE');
  await kv.put('bundle', JSON.stringify({ schema: 4, sceneContract: 12, categories: [{ slug: '01-start', title: '환경', order: 1, posts: [
    { id: '01-first', title: '연결', summary: '계정', body: '## 계정\n\n```course-github\nconnect\n```\n\n## 파일\n\n```course-github\npractice\n```' },
    { id: '02-next', title: '다음', summary: '다음', body: '## 다음\n\n수업' },
  ] }] }));
  const ns = await mf.getDurableObjectNamespace('CLASSROOM'), stub = ns.get(ns.idFromName('main'));
  const call = async body => { const res = await stub.fetch('https://classroom/do', { method: 'POST', body: JSON.stringify(body) }); return { status: res.status, ...await res.json() }; };
  const rooms = new Map(), cookies = new Map();
  for (const slug of ['invite', 'active', 'missing', 'public', 'failure', 'locked', 'unconfigured']) {
    await call({ action: 'create', slug, title: slug, password });
    await call({ action: 'toggle', slug, category: '01-start' });
    await call({ action: 'open', slug, open: true });
    const room = (await call({ action: 'list' })).rooms.find(r => r.slug === slug); rooms.set(slug, room);
    await call({ action: 'studentSave', roomId: room.id, name: slug });
    if (slug !== 'unconfigured') await call({ action: 'studentGithubConfig', roomId: room.id, repository: 'sample/practice', lesson: slug === 'locked' ? '01-start/02-next' : '01-start/01-first' });
    cookies.set(slug, await login('/room/' + slug + '/login'));
  }
  const admin = await login('/admin/login');
  const before = calls.length;
  assert.doesNotMatch(await (await json('/room/invite/github', input)).text(), /data-github-panel/);
  assert.equal((await json('/room/invite/github', input, cookies.get('invite'), { origin: 'https://other.example' })).status, 403);
  const preview = await request('/admin/students/' + rooms.get('invite').id + '/preview', {}, admin);
  const previewCookie = preview.headers.get('set-cookie').split(';')[0];
  assert.equal((await json('/room/invite/github', input, previewCookie)).status, 403);
  assert.equal((await json('/room/locked/github', input, cookies.get('locked'))).status, 404);
  assert.equal((await json('/room/unconfigured/github', input, cookies.get('unconfigured'))).status, 404);
  assert.equal((await json('/room/invite/github', { ...input, confirm: false }, cookies.get('invite'))).status, 400);
  assert.equal((await json('/room/invite/github', { ...input, username: '../evil' }, cookies.get('invite'))).status, 400);
  assert.equal(calls.length, before, 'rejected requests must not contact GitHub');
  const page = await (await request('/room/invite/01-start/01-first', {}, cookies.get('invite'))).text();
  assert.match(page, /data-github-form/); assert.match(page, /practice\/invite\/README.md/); assert.ok(!page.includes(token));
  const result = await json('/room/invite/github', { ...input, repository: 'attacker/other', roomId: rooms.get('active').id }, cookies.get('invite'));
  assert.equal(result.status, 200); assert.match((await result.json()).html, /초대 수락 대기/);
  assert.equal((await call({ action: 'studentGet', roomId: rooms.get('invite').id })).github.status, 'pending');
  assert.equal((await call({ action: 'studentGet', roomId: rooms.get('active').id })).github.status, 'unlinked');
  assert.equal((await json('/room/invite/github', input, cookies.get('invite'))).status, 429);
  assert.equal((await json('/room/invite/github', { ...input, username: 'other' }, cookies.get('invite'))).status, 409);
  assert.equal(calls.filter(c => c.startsWith('PUT')).length, 1);
  const changedRepo = await call({ action: 'studentGithubConfig', roomId: rooms.get('invite').id, repository: 'sample/other', lesson: '01-start/01-first' });
  assert.equal(changedRepo.status, 409);
  accepted = true;
  const active = await json('/room/active/github', input, cookies.get('active'));
  assert.equal(active.status, 200); assert.match((await active.json()).html, /연결 완료/);
  assert.equal(calls.filter(c => c.startsWith('PUT')).length, 1, 'existing collaborator is not reinvited');
  accepted = false;
  assert.equal((await json('/room/missing/github', { ...input, username: 'missing' }, cookies.get('missing'))).status, 502);
  assert.equal((await call({ action: 'studentGet', roomId: rooms.get('missing').id })).github.username, '');
  privateRepo = false;
  assert.equal((await json('/room/public/github', input, cookies.get('public'))).status, 502);
  assert.equal(calls.filter(c => c.startsWith('PUT')).length, 1, 'public repositories never receive an invitation');
  privateRepo = true; inviteStatus = 403;
  assert.equal((await json('/room/failure/github', input, cookies.get('failure'))).status, 502);
  assert.equal((await call({ action: 'studentGet', roomId: rooms.get('failure').id })).github.status, 'error');
  const settings = await (await request('/admin/students/' + rooms.get('invite').id + '?tab=settings', {}, admin)).text();
  assert.match(settings, /learner/); assert.match(settings, /초대 수락 대기/); assert.ok(!settings.includes(token));
  assert.match(await (await request('/admin/students', {}, admin)).text(), /GitHub · 초대 수락 대기 · learner/);
  console.log('GitHub 연결: 초대·기존 접근·실패·개인 방 격리·중복·공개 저장소 차단·감수·관리자 상태 확인');
} finally { await mf.dispose(); }
