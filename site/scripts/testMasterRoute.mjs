// 운영자 강의방(/room/master, master.ts)의 비밀번호 로그인, 구글 로그인과 화면을 실제 Worker로 확인한다. 구글 토큰 끝점은 가짜로 답한다.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const built = await build({ stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent' });
const password = crypto.randomUUID();
const clientId = 'test-client.apps.googleusercontent.com';
const clientSecret = crypto.randomUUID();
const origin = 'https://classroom.example';
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');

// 구글 토큰 끝점이 받은 요청과 돌려줄 값. 시험마다 claims를 바꾼다.
let claims = {};
let tokenStatus = 200;
const tokenRequests = [];
const outboundService = async request => {
  const url = new URL(request.url);
  if (url.origin !== 'https://oauth2.googleapis.com' || url.pathname !== '/token') return new Response('blocked', { status: 599 });
  tokenRequests.push(Object.fromEntries(new URLSearchParams(await request.text())));
  if (tokenStatus !== 200) return Response.json({ error: 'invalid_grant' }, { status: tokenStatus });
  return Response.json({ access_token: 'unused', id_token: `${b64({ alg: 'RS256' })}.${b64(claims)}.sig` });
};
const good = () => ({ iss: 'https://accounts.google.com', aud: clientId, exp: Math.floor(Date.now() / 1000) + 600, email: 'eddmpython@gmail.com', email_verified: true });

const worker = bindings => new Miniflare({ modules: true, script: built.outputFiles[0].text, compatibilityDate: '2026-08-08', compatibilityFlags: ['nodejs_compat'], durableObjects: { CLASSROOM: { className: 'Classroom', useSQLite: true } }, kvNamespaces: ['COURSE'], r2Buckets: ['SUBMISSIONS'], bindings: { ADMIN_PASSWORD: password, ...bindings }, outboundService });
const client = mf => {
  const request = (path, init = {}, cookie = '', base = origin) => mf.dispatchFetch(base + path, { ...init, headers: { origin: base, cookie, ...init.headers }, redirect: 'manual' });
  return {
    request,
    json: (path, data, cookie) => request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }, cookie),
    post: (path, data, cookie) => request(path, { method: 'POST', body: new URLSearchParams(data) }, cookie),
  };
};
const cookies = r => r.headers.getSetCookie?.() ?? [r.headers.get('set-cookie')].filter(Boolean);
const cookieNamed = (r, name) => cookies(r).find(c => c.startsWith(name + '='));
const bundle = JSON.stringify({ schema: 4, sceneContract: 12, categories: [
  { slug: '01-start', title: '시작', order: 1, posts: [
    { id: '01-first', title: '첫 수업', summary: '실습', body: '## 준비\n\n설명입니다.' },
    { id: '02-second', title: '두 번째 수업', summary: '실습', body: '## 다음\n\n두 번째 본문입니다.' },
  ] },
  { slug: '02-next', title: '다른 과정', order: 2, posts: [{ id: '01-next', title: '다른 수업', summary: '다음', body: '## 연결\n\n다음 과정입니다.' }] },
] });

// 구글 값을 넣지 않은 강의장은 이 길을 닫고 로그인 화면에도 보이지 않는다.
const closed = worker({});
try {
  const { request, post } = client(closed);
  const login = await request('/room/master/login');
  assert.equal(login.status, 503);
  assert.match(await login.text(), /구글 로그인 연결 전입니다/);
  const google = await request('/room/master/google');
  assert.equal(google.status, 503);
  assert.equal(cookieNamed(google, 'eddm_master_state'), undefined);
  assert.doesNotMatch(await (await request('/admin')).text(), /room\/master/);
  assert.equal((await request('/room/master/callback?code=x&state=y')).status, 503);
  assert.equal((await post('/room/master/login', { password: '' })).status, 503);
  const room = await request('/room/master');
  assert.equal(room.status, 503);
  assert.match(await room.text(), /구글 로그인 연결 전입니다/);
} finally {
  await closed.dispose();
}

// 비밀번호만 넣은 강의장. 구글 로그인 전에는 이 비밀번호로 들어온다.
const masterPassword = crypto.randomUUID().slice(0, 4);
const passwordOnly = worker({ MASTER_PASSWORD: masterPassword });
try {
  const { request, json, post } = client(passwordOnly);
  const kv = await passwordOnly.getKVNamespace('COURSE');
  await kv.put('bundle', bundle);
  await kv.put('version', 'test');
  // 운영장 첫 로그인은 비밀번호 지문을 적으며 세대를 돌린다. 운영처럼 지문이 적힌 뒤에 시험한다.
  const admin = cookieNamed(await post('/admin/login', { password }), 'eddm_admin');
  const anonymous = await request('/room/master/01-start/02-second');
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), '/room/master/login?returnTo=%2Froom%2Fmaster%2F01-start%2F02-second');
  const form = await request('/room/master/login?returnTo=%2Froom%2Fmaster%2F01-start%2F02-second');
  assert.equal(form.status, 200);
  const formHtml = await form.text();
  assert.match(formHtml, /<form method="post" action="\/room\/master\/login">/);
  assert.match(formHtml, /name="returnTo" value="\/room\/master\/01-start\/02-second"/);
  assert.doesNotMatch(formHtml, /구글 계정으로 들어가기/);
  assert.equal((await request('/room/master/google')).status, 503);

  // 틀리면 세션을 주지 않는다.
  const wrong = await post('/room/master/login', { password: masterPassword + 'x' });
  assert.equal(wrong.status, 401);
  assert.match(await wrong.text(), /비밀번호가 맞지 않습니다/);
  assert.equal(cookieNamed(wrong, 'eddm_master'), undefined);

  // 맞으면 운영자 강의방 세션만 받고 가려던 수업으로 간다. 운영장 세션은 주지 않는다.
  const signed = await post('/room/master/login', { password: masterPassword, returnTo: '/room/master/01-start/02-second' });
  assert.equal(signed.status, 303);
  assert.equal(signed.headers.get('location'), '/room/master/01-start/02-second');
  assert.match(cookieNamed(signed, 'eddm_master'), /Path=\/room\/master; HttpOnly; Secure; SameSite=Lax/);
  assert.equal(cookieNamed(signed, 'eddm_admin'), undefined);
  const master = cookieNamed(signed, 'eddm_master').split(';')[0];
  const view = await request('/room/master', {}, master);
  assert.equal(view.status, 200);
  const html = await view.text();
  assert.match(html, /href="\/room\/master\/01-start\/02-second"/);
  assert.match(html, /href="\/room\/master\/02-next\/01-next"/);
  assert.match(await (await request('/room/master/01-start/02-second', {}, master)).text(), /두 번째 본문입니다/);
  assert.deepEqual(await (await json('/room/master/notes', { action: 'read' }, master)).json(), { readOnly: true, identity: null, notes: [], threads: [] });
  assert.match(await (await request('/admin/students', {}, master)).text(), /<form method="post" action="\/admin\/login">/);
  // 운영장 질문 링크나 바깥 주소로 돌아가지 않고 이 강의방 첫 화면으로 간다.
  for (const returnTo of ['/admin/students/questions?thread=' + crypto.randomUUID(), 'https://evil.example/room/master', '/room/master/login']) {
    assert.equal((await post('/room/master/login', { password: masterPassword, returnTo })).headers.get('location'), '/room/master');
  }

  // 여덟 번 틀리면 맞는 비밀번호도 잠시 받지 않는다. 운영장 로그인은 따로 세어 잠기지 않는다.
  for (let i = 0; i < 8; i += 1) assert.equal((await post('/room/master/login', { password: masterPassword + i })).status, 401);
  const locked = await post('/room/master/login', { password: masterPassword });
  assert.equal(locked.status, 401);
  assert.match(await locked.text(), /너무 여러 번 틀렸습니다/);
  assert.equal(cookieNamed(locked, 'eddm_master'), undefined);
  assert.ok(cookieNamed(await post('/admin/login', { password }), 'eddm_admin'));

  // 받은 세션은 모든 운영 세션 끊기로 끊긴다.
  assert.equal((await request('/room/master', {}, master)).status, 200);
  assert.equal((await json('/admin/api', { action: 'adminRotate' }, admin.split(';')[0])).status, 200);
  assert.equal((await request('/room/master', {}, master)).status, 303);
} finally {
  await passwordOnly.dispose();
}

const mf = worker({ GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret });
try {
  const { request, json, post } = client(mf);
  const kv = await mf.getKVNamespace('COURSE');
  await kv.put('bundle', bundle);
  await kv.put('version', 'test');
  const admin = cookieNamed(await post('/admin/login', { password }), 'eddm_admin').split(';')[0];
  assert.equal((await json('/admin/api', { action: 'create', slug: 'alpha', title: '알파 강의방', password }, admin)).status, 200);
  await json('/admin/api', { action: 'toggle', slug: 'alpha', category: '01-start' }, admin);
  await json('/admin/api', { action: 'open', slug: 'alpha', open: true }, admin);
  // 저장된 강의방은 master 이름을 쓰지 못한다.
  assert.notEqual((await json('/admin/api', { action: 'create', slug: 'master', title: '겹치는 방', password }, admin)).status, 200);

  // 주소와 화면 문. 로그인하지 않으면 구글 로그인으로 보내고 그 수업으로 돌아올 주소를 단다.
  assert.equal((await request('/master')).headers.get('location'), '/room/master');
  assert.equal((await request('/admin/master')).headers.get('location'), '/room/master');
  assert.equal((await request('/master/login?returnTo=%2Fadmin%2Fstudents')).headers.get('location'), '/room/master/login?returnTo=%2Fadmin%2Fstudents');
  const anonymous = await request('/room/master');
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), '/room/master/login?returnTo=%2Froom%2Fmaster');
  assert.equal((await request('/room/master/01-start/02-second')).headers.get('location'), '/room/master/login?returnTo=%2Froom%2Fmaster%2F01-start%2F02-second');
  assert.equal((await json('/room/master/notes', { action: 'read' })).status, 401);
  const www = await request('/room/master/login', {}, '', 'https://www.classroom.example');
  assert.equal(www.status, 308);
  assert.equal(www.headers.get('location'), 'https://classroom.example/room/master/login');
  assert.equal((await request('/room/master/google', { method: 'POST' })).status, 404);
  assert.match(await (await request('/admin')).text(), /href="\/room\/master\/google\?returnTo=%2Fadmin%2Fstudents">eddmpython 구글 계정으로 들어가기/);
  // 비밀번호를 넣지 않았으면 로그인 화면에는 구글 길만 있다.
  const googleOnly = await (await request('/room/master/login?returnTo=%2Froom%2Fmaster%2F01-start%2F02-second')).text();
  assert.match(googleOnly, /href="\/room\/master\/google\?returnTo=%2Froom%2Fmaster%2F01-start%2F02-second">eddmpython 구글 계정으로 들어가기/);
  assert.doesNotMatch(googleOnly, /type="password"/);

  // 구글로 보내는 주소와 상태 쿠키.
  const begin = async (returnTo = '') => {
    const r = await request('/room/master/google' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : ''));
    assert.equal(r.status, 303);
    const target = new URL(r.headers.get('location'));
    const state = cookieNamed(r, 'eddm_master_state');
    assert.match(state, /Path=\/room\/master; HttpOnly; Secure; SameSite=Lax/);
    return { target, cookie: state.split(';')[0] };
  };
  const { target, cookie: stateCookie } = await begin();
  assert.equal(target.origin + target.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  const params = target.searchParams;
  assert.equal(params.get('client_id'), clientId);
  assert.equal(params.get('redirect_uri'), origin + '/room/master/callback');
  assert.equal(params.get('response_type'), 'code');
  assert.equal(params.get('scope'), 'openid email');
  assert.equal(params.get('code_challenge_method'), 'S256');
  assert.equal(params.get('login_hint'), 'eddmpython@gmail.com');
  assert.ok(!params.has('client_secret'));
  const [stateValue, verifier] = stateCookie.slice('eddm_master_state='.length).split('.');
  assert.equal(params.get('state'), stateValue);
  assert.equal(params.get('code_challenge'), createHash('sha256').update(verifier).digest('base64url'));

  const back = (cookie, query) => request('/room/master/callback?' + new URLSearchParams(query), {}, cookie);
  const refused = async (r, status) => {
    assert.equal(r.status, status);
    assert.equal(cookieNamed(r, 'eddm_admin'), undefined);
    assert.equal(cookieNamed(r, 'eddm_master'), undefined);
    assert.match(cookieNamed(r, 'eddm_master_state'), /Max-Age=0/);
    return r.text();
  };

  // 요청을 시작한 창이 아니거나 구글이 거절하면 토큰을 받으러 가지 않는다.
  await refused(await back('', { code: 'c', state: stateValue }), 400);
  await refused(await back(stateCookie, { code: 'c', state: 'other' }), 400);
  await refused(await back(stateCookie, { error: 'access_denied', state: stateValue }), 400);
  assert.equal(tokenRequests.length, 0);

  // 구글 계정 확인.
  const tries = [
    [{ ...good(), email: 'someone@gmail.com' }, 403],
    [{ ...good(), email_verified: false }, 403],
    [{ ...good(), aud: 'other-client' }, 502],
    [{ ...good(), iss: 'https://evil.example' }, 502],
    [{ ...good(), exp: Math.floor(Date.now() / 1000) - 5 }, 502],
  ];
  for (const [next, status] of tries) {
    claims = next;
    const html = await refused(await back(stateCookie, { code: 'c', state: stateValue }), status);
    if (status === 403) assert.match(html, /eddmpython 구글 계정으로만/);
  }
  tokenStatus = 400;
  await refused(await back(stateCookie, { code: 'c', state: stateValue }), 502);
  tokenStatus = 200;

  // 맞는 계정이면 운영자 강의방 세션과 운영 세션을 받고 운영자 강의방으로 간다.
  claims = { ...good(), email: 'EddmPython@gmail.com', email_verified: 'true' };
  const signed = await back(stateCookie, { code: 'the-code', state: stateValue });
  assert.equal(signed.status, 303);
  assert.equal(signed.headers.get('location'), '/room/master');
  assert.match(cookieNamed(signed, 'eddm_master_state'), /Max-Age=0/);
  assert.match(cookieNamed(signed, 'eddm_master'), /Path=\/room\/master; HttpOnly; Secure; SameSite=Lax/);
  assert.match(cookieNamed(signed, 'eddm_admin'), /Path=\/admin; HttpOnly; Secure; SameSite=Lax/);
  const sent = tokenRequests.at(-1);
  assert.deepEqual(sent, { code: 'the-code', client_id: clientId, client_secret: clientSecret, redirect_uri: origin + '/room/master/callback', grant_type: 'authorization_code', code_verifier: verifier });
  const master = cookieNamed(signed, 'eddm_master').split(';')[0];
  const google = cookieNamed(signed, 'eddm_admin').split(';')[0];

  // 운영자 강의방: 강의방 화면 그대로 모든 과정이 열리고, 차례 잠금 없이 바로 읽는다.
  const view = await request('/room/master', {}, master);
  assert.equal(view.status, 200);
  const html = await view.text();
  assert.match(html, /운영자 강의방/);
  assert.match(html, /href="\/room\/master\/01-start\/02-second"/);
  assert.match(html, /href="\/room\/master\/02-next\/01-next"/);
  assert.doesNotMatch(html, new RegExp(password));
  const lesson = await request('/room/master/01-start/02-second', {}, master);
  assert.equal(lesson.status, 200);
  assert.match(await lesson.text(), /두 번째 본문입니다/);
  assert.match(await (await request('/room/master/02-next/01-next', {}, master)).text(), /다음 과정입니다/);
  // 읽기만 한다. 메모는 비어 있고 저장되지 않는다.
  assert.deepEqual(await (await json('/room/master/notes', { action: 'read' }, master)).json(), { readOnly: true, identity: null, notes: [], threads: [] });
  assert.equal((await json('/room/master/notes', { action: 'save' }, master)).status, 403);
  // 운영장 세션 쿠키로는 운영자 강의방에 들어가지 못하고, 운영장은 그대로 열린다.
  assert.equal((await request('/room/master', {}, google)).status, 303);
  assert.equal((await request('/admin/students', {}, google)).status, 200);
  // 운영자 강의방은 저장된 강의방을 만들지 않는다.
  const listed = (await (await json('/admin/api', { action: 'list' }, admin)).json()).rooms;
  assert.deepEqual(listed.map(r => r.slug), ['alpha']);

  // 메일의 질문 링크는 로그인 뒤 그 질문으로, 강의방 안 주소는 그 주소로, 다른 주소는 강의방 첫 화면으로 간다.
  const thread = crypto.randomUUID();
  for (const [returnTo, location] of [
    [`/admin/students/questions?thread=${thread}`, `/admin/students/questions?thread=${thread}`],
    ['/room/master/01-start/02-second', '/room/master/01-start/02-second'],
    ['/admin/students', '/room/master'],
    ['/admin/api', '/room/master'],
    ['/room/master/callback', '/room/master'],
    ['/room/master/../alpha', '/room/master'],
    ['https://evil.example/admin/students/questions', '/room/master'],
  ]) {
    const started = await begin(returnTo);
    claims = good();
    const done = await back(started.cookie, { code: 'c', state: started.target.searchParams.get('state') });
    assert.equal(done.status, 303);
    assert.equal(done.headers.get('location'), location);
  }

  // 모든 운영 세션 끊기는 구글로 받은 운영자 강의방 세션도 끊는다.
  assert.equal((await json('/admin/api', { action: 'adminRotate' }, google)).status, 200);
  assert.equal((await request('/room/master', {}, master)).headers.get('location'), '/room/master/login?returnTo=%2Froom%2Fmaster');
} finally {
  await mf.dispose();
}
console.log('master route ok');
