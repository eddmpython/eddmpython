import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const built = await build({ stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent' });
const password = crypto.randomUUID();
const mf = new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-08', compatibilityFlags: ['nodejs_compat'], durableObjects: { CLASSROOM: { className: 'Classroom', useSQLite: true } }, kvNamespaces: ['COURSE'], r2Buckets: ['SUBMISSIONS'], bindings: { ADMIN_PASSWORD: password } });
const origin = 'https://classroom.example';
const request = async (path, init = {}, cookie = '') => {
  const sent = new Request(origin + path, { ...init, headers: { origin, cookie, ...init.headers }, redirect: 'manual' });
  return mf.dispatchFetch(sent.url, { method: sent.method, headers: Object.fromEntries(sent.headers), body: sent.body ? await sent.arrayBuffer() : undefined, redirect: 'manual' });
};
const json = (path, data, cookie) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }, cookie);
const post = (path, data, cookie) => request(path, { method: 'POST', body: new URLSearchParams(data) }, cookie);
const cookieOf = r => r.headers.get('set-cookie').split(';')[0];
const lesson = (id, extra = {}) => ({ id, title: id, summary: '테스트 수업', body: '## 확인\n\n테스트 설명입니다.', ...extra });
try {
  const kv = await mf.getKVNamespace('COURSE');
  const media = 'a'.repeat(64) + '.py';
  const hiddenMedia = 'b'.repeat(64) + '.py';
  await kv.put('bundle', JSON.stringify({ schema: 6, sceneContract: 12, categories: [
    { slug: '01-start', title: '시작', order: 1, nextCategory: '02-next', posts: [
      lesson('01-first'),
      lesson('02-extra', { optional: true, body: `## 참고\n\n[예시 파일](room://${media})` }),
      lesson('03-second'),
      lesson('04-extra', { optional: true }),
    ] },
    { slug: '02-next', title: '연결 과정', order: 2, posts: [lesson('01-next')] },
    { slug: '03-extra', title: '보충 과정', order: 3, posts: [lesson('01-extra', { optional: true })] },
    { slug: '04-hidden', title: '미배정 과정', order: 4, posts: [lesson('01-hidden', { optional: true, body: `## 비공개\n\n[파일](room://${hiddenMedia})` })] },
  ] }));
  await kv.put('media/' + media, 'optional resource');
  await kv.put('media/' + hiddenMedia, 'unassigned resource');
  await kv.put('version', 'optional-test');
  const admin = cookieOf(await post('/admin/login', { password }));
  for (const slug of ['alpha', 'beta', 'gamma', 'delta']) {
    assert.equal((await json('/admin/api', { action: 'create', slug, title: slug, password }, admin)).status, 200);
    await json('/admin/api', { action: 'open', slug, open: true }, admin);
  }
  const rooms = (await (await json('/admin/api', { action: 'list' }, admin)).json()).rooms;
  const alpha = rooms.find(r => r.slug === 'alpha');
  const curricula = {
    alpha: [{ category: '01-start', posts: ['01-first', '02-extra', '03-second', '04-extra'] }, { category: '03-extra', posts: ['01-extra'] }, { category: '02-next', posts: ['01-next'] }],
    beta: [{ category: '01-start', posts: ['01-first'] }],
    gamma: [{ category: '03-extra', posts: ['01-extra'] }],
    delta: [{ category: '01-start', posts: ['01-first', '02-extra', '03-second'] }],
  };
  for (const room of rooms) {
    assert.equal((await json('/admin/students/api', { action: 'roomCurriculum', roomId: room.id, title: room.title, curriculum: curricula[room.slug] }, admin)).status, 200);
    assert.equal((await json('/admin/students/api', { action: 'studentSave', roomId: room.id, name: room.slug }, admin)).status, 200);
  }
  const aCookie = cookieOf(await post('/room/alpha/login', { password }));
  const bCookie = cookieOf(await post('/room/beta/login', { password }));
  const gCookie = cookieOf(await post('/room/gamma/login', { password }));
  const dCookie = cookieOf(await post('/room/delta/login', { password }));
  const first = '/room/alpha/01-start/01-first';
  const extra = '/room/alpha/01-start/02-extra';
  const second = '/room/alpha/01-start/03-second';
  const tail = '/room/alpha/01-start/04-extra';
  const next = '/room/alpha/02-next/01-next';
  const initial = await (await request('/room/alpha', {}, aCookie)).text();
  assert.match(initial, /필수 학습 완료 0 \/ 3편/);
  assert.match(initial, /02-extra <small>\(선택\)<\/small>/);
  assert.match(initial, /data-resume href="\/room\/alpha\/01-start\/01-first"/);
  // 선택편의 선수만 생략한다. 로그인, 방 배정, 비공개 미디어 경계는 그대로 유지한다.
  for (const cookie of ['', bCookie]) {
    const locked = await (await request(extra, {}, cookie)).text();
    assert.match(locked, /type="password"/);
    assert.doesNotMatch(locked, /예시 파일|선택 학습/);
  }
  for (const path of [extra, tail, '/room/alpha/03-extra/01-extra']) {
    const response = await request(path, {}, aCookie);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /선택 학습 \(필수 진도 제외\)/);
  }
  assert.equal((await request('/room/alpha/media/' + media, {}, aCookie)).status, 200);
  assert.equal((await request('/room/beta/01-start/02-extra', {}, bCookie)).status, 404);
  assert.equal((await request('/room/beta/media/' + media, {}, bCookie)).status, 404);
  assert.equal((await request('/room/alpha/04-hidden/01-hidden', {}, aCookie)).status, 404);
  assert.equal((await request('/room/alpha/media/' + hiddenMedia, {}, aCookie)).status, 404);
  for (const path of [second, next]) {
    assert.equal((await request(path, {}, aCookie)).status, 303);
    assert.equal((await post(path + '/complete', {}, aCookie)).status, 409);
  }
  assert.equal((await post(extra + '/complete', {}, aCookie)).status, 303);
  assert.match(await (await request('/room/alpha', {}, aCookie)).text(), /필수 학습 완료 0 \/ 3편/);
  assert.match(await (await request('/admin/students/' + alpha.id, {}, admin)).text(), /0 \/ 3편/);
  assert.match(await (await request('/admin/students', {}, admin)).text(), /0 \/ 3편 완료/);
  // 선택 완료를 지우지 않으며, 필수 다음 편의 잠금도 대신 해제하지 않는다.
  const adminProgress = await (await request('/admin/students/' + alpha.id, {}, admin)).text();
  assert.match(adminProgress, /02-extra \(선택\)<\/strong>[\s\S]*?완료: /);
  assert.equal((await request(second, {}, aCookie)).status, 303);
  await post(first + '/complete', {}, aCookie);
  assert.equal((await request(second, {}, aCookie)).status, 200);
  assert.match(await (await request('/room/alpha', {}, aCookie)).text(), /data-resume href="\/room\/alpha\/01-start\/03-second"/);
  await post(second + '/complete', {}, aCookie);
  // 같은 카테고리 끝 선택편과 연결된 카테고리의 선택편을 완료하지 않아도 열린다.
  assert.equal((await request(next, {}, aCookie)).status, 200);
  assert.match(await (await request('/room/alpha', {}, aCookie)).text(), /data-resume href="\/room\/alpha\/02-next\/01-next"/);
  await post(next + '/complete', {}, aCookie);
  assert.match(await (await request('/room/alpha', {}, aCookie)).text(), /필수 학습 완료 3 \/ 3편/);
  assert.match(await (await request('/admin/students/' + alpha.id, {}, admin)).text(), /3 \/ 3편/);
  await post(tail + '/complete', {}, aCookie);
  assert.match(await (await request('/room/alpha', {}, aCookie)).text(), /필수 학습 완료 3 \/ 3편/);
  const optionalOnly = await (await request('/room/gamma', {}, gCookie)).text();
  assert.match(optionalOnly, /필수 학습 완료 0 \/ 0편/);
  assert.match(optionalOnly, /<progress value="0" max="1"/);
  assert.equal((await post('/room/gamma/03-extra/01-extra/complete', {}, gCookie)).status, 303);
  assert.match(await (await request('/room/gamma', {}, gCookie)).text(), /필수 학습 완료 0 \/ 0편/);
  // 같은 카테고리 중간의 선택편도 건너뛸 수 있다.
  await post('/room/delta/01-start/01-first/complete', {}, dCookie);
  assert.equal((await request('/room/delta/01-start/03-second', {}, dCookie)).status, 200);
  assert.match(await (await request('/room/delta', {}, dCookie)).text(), /data-resume href="\/room\/delta\/01-start\/03-second"/);
  assert.equal((await post('/room/delta/01-start/03-second/complete', {}, dCookie)).status, 303);
  assert.match(await (await request('/room/delta', {}, dCookie)).text(), /필수 학습 완료 2 \/ 2편/);
  console.log('optional lessons: 선택 열람·완료 저장, 필수 진행률·순서, 방과 미디어 접근 경계 확인');
} finally {
  await mf.dispose();
}
