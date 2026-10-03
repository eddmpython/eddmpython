import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';
import { executionRoot } from './executionWorkspace.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));
const shared = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'dev-workspace')
  : join(homedir(), '.local', 'share', 'dev-workspace');
await mkdir(shared, { recursive: true });
const workspace = executionRoot(await mkdtemp(join(shared, 'notebookRoutes-')));
let mf;
try {
  const helpers = await build({ stdin: { contents: 'export {notebookSections} from "./notebookSections.ts"; export {notebookHeadings, notebookMarkup} from "./classroomNotes.ts"; export {renderPost} from "./classroom-render.ts";', resolveDir: source }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  const { notebookSections, notebookHeadings, notebookMarkup, renderPost } = await import(`data:text/javascript;base64,${Buffer.from(helpers.outputFiles[0].contents).toString('base64')}`);
  const headings = ['원장 입력', '결과 비교'];
  const sections = await notebookSections(headings);
  const reversed = await notebookSections([...headings].reverse());
  for (const section of sections) assert.equal(reversed.find(next => next.title === section.title).key, section.key, '다른 제목 섹션의 순서를 바꿔도 메모 연결을 유지한다');
  assert.notEqual(sections[0].anchor, reversed.find(section => section.title === headings[0]).anchor);
  assert.equal((await notebookSections(['원장\u00a0 입력']))[0].key, (await notebookSections(['원장 입력']))[0].key);
  const duplicates = await notebookSections(['같은 제목', '같은 제목']);
  assert.notEqual(duplicates[0].key, duplicates[1].key);

  const body = '## 원장 입력\n\n### 입력을 확인합니다\n\n![첫 화면](https://example.com/first.png "첫 화면")\n\n첫 화면의 설명입니다.\n\n![둘째 화면](https://example.com/second.png "둘째 화면")\n\n둘째 화면의 설명입니다.\n\n## 결과 비교\n\n### 결과를 확인합니다\n\n더미 결과입니다.';
  const scenes = [{ id: 's1', role: 'open', layout: 'sequence', fit: 'cover', visualCount: 2, beats: [{ effect: 'enter', targets: [1, 2] }] }];
  const rendered = notebookHeadings(renderPost(body, {}, {}, { scenes }).html, sections);
  const renderedHeadings = [...rendered.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)];
  assert.equal(renderedHeadings.length, 2);
  assert.match(renderedHeadings[0][1], /data-carousel-prev/);
  assert.doesNotMatch(rendered, /data-notebook-open=/, '본문 제목에는 메모 버튼을 반복하지 않는다');
  for (const section of sections) assert.ok(rendered.includes(`id="note-${section.key}"`), '질문 링크의 섹션 앵커를 유지한다');
  const toc = notebookMarkup(`<details class="toc"><summary>목차</summary>${sections.map(section => `<a href="#${section.anchor}" data-to="${section.anchor}">${section.title}</a>`).join('')}</details>`, sections);
  for (const section of sections) {
    assert.ok(toc.includes(`data-notebook-entry="${section.key}"`));
    assert.ok(toc.includes(`data-notebook-open="${section.key}"`));
    assert.ok(toc.includes(`href="#${section.anchor}"`), '목차 이동 링크와 메모 펼치기를 함께 제공한다');
  }
  assert.doesNotMatch(toc, /data-notebook-tab|data-notebook-current/);

  const built = await build({ stdin: { contents: 'export {default} from "./classroomWorker.ts"; export {Classroom} from "./rooms.ts";', resolveDir: source }, bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent' });
  const password = crypto.randomUUID();
  mf = new Miniflare({ rootPath: workspace, modules: true, script: built.outputFiles[0].text,
    compatibilityDate: '2026-08-08', compatibilityFlags: ['nodejs_compat'],
    durableObjects: { CLASSROOM: { className: 'Classroom', useSQLite: true } },
    durableObjectsPersist: join(workspace, 'durable'), kvNamespaces: ['COURSE'], kvPersist: join(workspace, 'kv'),
    r2Buckets: ['SUBMISSIONS'], r2Persist: join(workspace, 'r2'),
    bindings: { ADMIN_PASSWORD: password, LOCAL_PREVIEW_BYPASS: '1' } });
  const origin = 'https://classroom.example';
  const request = async (path, init = {}, cookie = '') => {
    const sent = new Request(origin + path, { ...init, headers: { origin, cookie, ...init.headers }, redirect: 'manual' });
    return mf.dispatchFetch(sent.url, { method: sent.method, headers: Object.fromEntries(sent.headers), body: sent.body ? await sent.arrayBuffer() : undefined, redirect: 'manual' });
  };
  const json = (path, data, cookie, headers = {}) => request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) }, cookie);
  const post = (path, data, cookie) => request(path, { method: 'POST', body: new URLSearchParams(data) }, cookie);
  const cookieOf = response => { const value = response.headers.get('set-cookie'); assert.ok(value, '로그인 응답에 쿠키가 있다'); return value.split(';')[0]; };
  const readJson = async response => { assert.equal(response.status, 200, await response.clone().text()); return response.json(); };
  const lesson = '01-start/01-first';
  const kv = await mf.getKVNamespace('COURSE');
  await kv.put('bundle', JSON.stringify({ schema: 5, sceneContract: 12, categories: [{ slug: '01-start', title: '메모 실습', order: 1, posts: [
    { id: '01-first', title: '더미 원장 실습', summary: '더미 자료', body, scenes },
    { id: '02-next', title: '다음 수업', summary: '다음', body: '## 다음 섹션\n\n학습 완료 후 열립니다.' },
  ] }] }));
  await kv.put('version', 'notebook-test');
  const adminLogin = await post('/admin/login', { password });
  assert.equal(adminLogin.status, 303);
  const admin = cookieOf(adminLogin);
  for (const slug of ['alpha', 'beta', 'group', 'othergroup']) {
    await readJson(await json('/admin/api', { action: 'create', slug, title: slug, password }, admin));
    await readJson(await json('/admin/api', { action: 'toggle', slug, category: '01-start' }, admin));
    await readJson(await json('/admin/api', { action: 'open', slug, open: true }, admin));
  }
  const rooms = (await readJson(await json('/admin/api', { action: 'list' }, admin))).rooms;
  for (const slug of ['alpha', 'beta']) await readJson(await json('/admin/students/api', { action: 'studentSave', roomId: rooms.find(room => room.slug === slug).id, name: `학습자 ${slug}` }, admin));
  const alpha = rooms.find(room => room.slug === 'alpha'), beta = rooms.find(room => room.slug === 'beta');
  const aCookie = cookieOf(await post('/room/alpha/login', { password }));
  const bCookie = cookieOf(await post('/room/beta/login', { password }));
  const groupRoomCookie = cookieOf(await post('/room/group/login', { password }));
  const otherRoomCookie = cookieOf(await post('/room/othergroup/login', { password }));
  const note = (slug, action, data = {}, session = '') => json(`/room/${slug}/notes`, { action, lesson, ...data }, session);
  const sectionKey = sections[0].key;
  const save = { sectionKey, version: 0, body: '개인 메모는 질문함에 나오면 안 됩니다', expectedOwnerId: 'personal' };

  assert.equal((await note('alpha', 'read')).status, 401);
  assert.equal((await note('alpha', 'save', save)).status, 401);
  assert.equal((await json('/room/alpha/notes', { action: 'save', lesson, ...save }, aCookie, { origin: 'https://outside.example' })).status, 403);
  assert.equal((await request('/room/alpha/notes', {}, aCookie)).status, 403);
  assert.equal((await note('alpha', 'read', { lesson: '01-start/02-next' }, aCookie)).status, 404);
  assert.equal((await note('alpha', 'save', { ...save, lesson: '01-start/02-next' }, aCookie)).status, 404);
  assert.equal((await note('alpha', 'save', { ...save, expectedOwnerId: 'wrong-person' }, aCookie)).status, 409);
  assert.equal((await readJson(await note('alpha', 'read', {}, aCookie))).notes.length, 0);
  const saved = await readJson(await note('alpha', 'save', { ...save, ownerId: 'forged-owner', roomId: beta.id }, aCookie));
  assert.equal(saved.note.version, 1);
  assert.equal((await readJson(await note('alpha', 'read', {}, aCookie))).notes[0].body, save.body);
  assert.equal((await readJson(await note('beta', 'read', {}, bCookie))).notes.length, 0);
  const conflict = await note('alpha', 'save', { ...save, body: '오래된 탭 값' }, aCookie);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).note.body, save.body);
  const preview = await request(`/admin/students/${alpha.id}/preview`, {}, admin);
  assert.equal(preview.status, 303);
  const previewCookie = cookieOf(preview);
  const previewNotes = await readJson(await note('alpha', 'read', {}, previewCookie));
  assert.equal(previewNotes.identity, null); assert.deepEqual(previewNotes.notes, []); assert.deepEqual(previewNotes.threads, []);
  assert.equal((await note('alpha', 'save', { ...save, version: 1 }, previewCookie)).status, 403);
  assert.equal((await note('alpha', 'ask', { ...save, id: crypto.randomUUID() }, previewCookie)).status, 403);
  const page = await (await request(`/room/alpha/${lesson}`, {}, aCookie)).text();
  const pageHeadings = [...page.matchAll(/<h2 id="s\d+">([\s\S]*?)<\/h2>/g)];
  assert.equal(pageHeadings.length, 2);
  assert.ok(pageHeadings.every(heading => !/data-notebook-open=/.test(heading[1])));
  for (const section of sections) assert.ok(page.includes(`data-notebook-entry="${section.key}"`));

  const questionId = crypto.randomUUID(), question = { sectionKey, id: questionId, body: '입력 열을 바꾸면 <script>evil()</script> 어떻게 되나요?', expectedOwnerId: 'personal' };
  assert.equal((await readJson(await note('alpha', 'ask', question, aCookie))).created, true);
  assert.equal((await readJson(await note('alpha', 'ask', question, aCookie))).created, false);
  assert.equal((await note('beta', 'followup', { id: questionId, messageId: crypto.randomUUID(), body: '다른 학습자', expectedOwnerId: 'personal' }, bCookie)).status, 404);
  const inboxPath = `/admin/students/questions?thread=${questionId}`;
  const anonymousInbox = await (await request(inboxPath)).text();
  assert.match(anonymousInbox, /type="password"/);
  assert.doesNotMatch(anonymousInbox, /학습자 alpha|입력 열을 바꾸면/);
  const inbox = await (await request(inboxPath, {}, admin)).text();
  assert.match(inbox, /학습자 alpha/);
  assert.match(inbox, /입력 열을 바꾸면 &lt;script&gt;evil\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(inbox, /개인 메모는 질문함에 나오면 안 됩니다|<script>evil\(\)<\/script>/);
  const reply = { action: 'notebookReply', roomId: alpha.id, id: questionId, messageId: crypto.randomUUID(), body: '원장의 표 머리글을 먼저 확인해 주세요' };
  assert.equal((await json('/admin/students/questions/api', reply)).status, 401);
  assert.equal((await json('/admin/students/questions/api', reply, admin, { origin: 'https://outside.example' })).status, 403);
  assert.equal((await json('/admin/students/questions/api', { ...reply, roomId: beta.id }, admin)).status, 404);
  await readJson(await json('/admin/students/questions/api', reply, admin));
  await readJson(await json('/admin/students/questions/api', reply, admin));
  const answered = (await readJson(await note('alpha', 'read', {}, aCookie))).threads[0];
  assert.equal(answered.status, 'answered'); assert.equal(answered.messages.length, 2);
  assert.equal(answered.messages[1].body, reply.body);

  assert.equal((await readJson(await note('group', 'read', {}, groupRoomCookie))).identity, null);
  assert.equal((await note('group', 'save', save, groupRoomCookie)).status, 401);
  const memberPassword = crypto.randomUUID(), wrongPassword = crypto.randomUUID();
  const groupAResponse = await note('group', 'register', { name: '공용 A', password: memberPassword }, groupRoomCookie);
  const groupACookie = `${groupRoomCookie}; ${cookieOf(groupAResponse)}`;
  assert.match(groupAResponse.headers.get('set-cookie'), /Path=\/room\/group; HttpOnly; Secure; SameSite=Lax/);
  const groupA = (await readJson(groupAResponse)).identity;
  const groupBResponse = await note('group', 'register', { name: '공용 B', password: memberPassword }, groupRoomCookie);
  const groupBCookie = `${groupRoomCookie}; ${cookieOf(groupBResponse)}`;
  const groupB = (await readJson(groupBResponse)).identity;
  const groupSave = { ...save, expectedOwnerId: groupA.id, body: 'A의 메모만 저장', ownerId: groupB.id };
  await readJson(await note('group', 'save', groupSave, groupACookie));
  assert.equal((await readJson(await note('group', 'read', { ownerId: groupB.id }, groupACookie))).notes[0].body, groupSave.body);
  assert.equal((await readJson(await note('group', 'read', {}, groupBCookie))).notes.length, 0);
  assert.equal((await note('group', 'save', groupSave, groupBCookie)).status, 409);
  assert.equal((await readJson(await note('group', 'read', {}, groupBCookie))).notes.length, 0);
  assert.equal((await note('group', 'ask', { ...question, id: crypto.randomUUID(), expectedOwnerId: groupA.id }, groupBCookie)).status, 409);
  const foreignMemberCookie = `${otherRoomCookie}; ${groupACookie.split('; ').find(value => value.startsWith('eddm_notebook='))}`;
  assert.equal((await readJson(await note('othergroup', 'read', {}, foreignMemberCookie))).identity, null);
  const relogin = await note('group', 'login', { name: '공용 A', password: memberPassword }, groupRoomCookie);
  assert.equal((await readJson(relogin)).identity.id, groupA.id);
  assert.equal((await note('group', 'login', { name: '공용 A', password: wrongPassword }, groupRoomCookie)).status, 401);
  const groupQuestion = { ...question, id: crypto.randomUUID(), expectedOwnerId: groupA.id, body: '공용방 질문' };
  await readJson(await note('group', 'ask', groupQuestion, groupACookie));
  assert.equal((await readJson(await note('group', 'read', {}, groupBCookie))).threads.length, 0);
  assert.equal((await note('group', 'followup', { id: groupQuestion.id, messageId: crypto.randomUUID(), body: '타인 질문 접근', expectedOwnerId: groupB.id }, groupBCookie)).status, 404);
  assert.match(await (await request(`/admin/students/questions?thread=${groupQuestion.id}`, {}, admin)).text(), /공용 A/);
  const loggedOut = await note('group', 'logout', {}, groupACookie);
  assert.match(loggedOut.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await readJson(await note('group', 'read', {}, groupRoomCookie))).identity, null);

  // 방의 주소와 표시 이름을 바꾼 뒤에도 UUID 기준으로 저장한 기록을 다시 읽는다.
  await readJson(await json('/admin/api', { action: 'rename', slug: 'alpha', nextSlug: 'alpha-renamed', title: '이름을 바꾼 개인방' }, admin));
  const personalRooms = (await readJson(await json('/admin/api', { action: 'list' }, admin))).rooms;
  const renamedPersonal = personalRooms.find(room => room.slug === 'alpha-renamed');
  assert.equal(renamedPersonal.id, alpha.id);
  assert.notEqual(renamedPersonal.gen, alpha.gen);
  assert.equal((await note('alpha', 'read', {}, aCookie)).status, 404);
  assert.equal((await note('alpha-renamed', 'read', {}, aCookie)).status, 401);
  const renamedPersonalCookie = cookieOf(await post('/room/alpha-renamed/login', { password }));
  const personalAfterRename = await readJson(await note('alpha-renamed', 'read', {}, renamedPersonalCookie));
  assert.equal(personalAfterRename.notes[0].body, save.body);
  assert.equal(personalAfterRename.notes[0].version, 1);
  assert.equal(personalAfterRename.threads[0].id, questionId);
  assert.equal(personalAfterRename.threads[0].messages[1].body, reply.body);

  const groupRoom = rooms.find(room => room.slug === 'group');
  await readJson(await json('/admin/api', { action: 'rename', slug: 'group', nextSlug: 'group-renamed', title: '이름을 바꾼 공용방' }, admin));
  const groupRooms = (await readJson(await json('/admin/api', { action: 'list' }, admin))).rooms;
  assert.equal(groupRooms.find(room => room.slug === 'group-renamed').id, groupRoom.id);
  assert.equal((await note('group-renamed', 'read', {}, groupACookie)).status, 401);
  const renamedGroupCookie = cookieOf(await post('/room/group-renamed/login', { password }));
  const oldMemberCookie = groupACookie.split('; ').find(value => value.startsWith('eddm_notebook='));
  assert.equal((await readJson(await note('group-renamed', 'read', {}, `${renamedGroupCookie}; ${oldMemberCookie}`))).identity, null);
  const renamedLogin = await note('group-renamed', 'login', { name: '공용 A', password: memberPassword }, renamedGroupCookie);
  const renamedMemberCookie = `${renamedGroupCookie}; ${cookieOf(renamedLogin)}`;
  assert.equal((await readJson(renamedLogin)).identity.id, groupA.id);
  const groupAfterRename = await readJson(await note('group-renamed', 'read', {}, renamedMemberCookie));
  assert.equal(groupAfterRename.notes[0].body, groupSave.body);
  assert.equal(groupAfterRename.notes[0].version, 1);
  assert.equal(groupAfterRename.threads[0].id, groupQuestion.id);
  const renamedBLogin = await note('group-renamed', 'login', { name: '공용 B', password: memberPassword }, renamedGroupCookie);
  const renamedBCookie = `${renamedGroupCookie}; ${cookieOf(renamedBLogin)}`;
  assert.deepEqual((await readJson(await note('group-renamed', 'read', {}, renamedBCookie))).notes, []);
  console.log('메모 HTTP: 인증·방·계정·선수 수업·미리보기 분리, CAS, 질문함과 답변, 계정 변경 쓰기 거부, 방 이름 변경과 재로그인 보존, 섹션 연결과 캐러셀 버튼 확인');
} finally {
  if (mf) await mf.dispose();
  assert.equal(dirname(resolve(workspace)), resolve(shared), '이 테스트의 공통 실행 공간만 정리한다');
  await rm(workspace, { recursive: true });
}
