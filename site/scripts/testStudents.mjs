import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({ entryPoints: [fileURLToPath(new URL('../studentStore.ts', import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { StudentStore } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const db = new DatabaseSync(':memory:');
const store = new StudentStore({
  sql: { exec(query, ...values) { if (!values.length && query.includes('CREATE TABLE')) { db.exec(query); return { toArray: () => [] }; } const rows = db.prepare(query).all(...values); return { toArray: () => rows }; } },
  transactionSync(run) { db.exec('BEGIN'); try { const result = run(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } },
});
const call = async (action, roomId = 'alpha', body = {}) => { const r = store.handle({ action, roomId, ...body }); return { status: r.status, ...(await r.json()) }; };
try {
  assert.equal((await call('studentInfo')).enabled, false);
  await call('studentSave', 'alpha', { name: '수강자 A' });
  await call('studentSave', 'beta', { name: '수강자 B' });
  const made = await call('studentAssignment', 'alpha', { title: '첫 결과', instructions: '파일 제출', method: 'file', dueAt: Date.now() - 60000 });
  assert.equal(made.status, 200);
  assert.equal((await call('studentWork', 'beta')).assignments.length, 0);
  assert.equal((await call('studentList')).students.find(s => s.roomId === 'alpha').overdue, 1);
  assert.equal((await call('studentSubmit', 'beta', { id: crypto.randomUUID(), assignmentId: made.id, body: '다른 방' })).status, 404);
  assert.equal((await call('studentSubmit', 'alpha', { id: crypto.randomUUID(), assignmentId: made.id, body: '파일 없음' })).status, 400);
  const id = crypto.randomUUID(), fileId = crypto.randomUUID();
  const submission = { id, assignmentId: made.id, body: '결과 설명', url: 'https://example.com/result', files: [{ id: fileId, name: 'result.txt', size: 30 }] };
  assert.equal((await call('studentSubmit', 'alpha', { ...submission, url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await call('studentSubmit', 'alpha', submission)).status, 200);
  assert.equal((await call('studentSubmit', 'alpha', submission)).duplicate, true);
  assert.equal((await call('studentWork')).submissions.length, 1);
  assert.equal((await call('studentFile', 'beta', { id: fileId })).file, null);
  assert.equal((await call('studentReview', 'beta', { id, status: 'accepted' })).status, 404);
  assert.equal((await call('studentReview', 'alpha', { id, status: 'revision' })).status, 400);
  await call('studentReview', 'alpha', { id, status: 'revision', feedback: '값을 고쳐 주세요' });
  assert.equal((await call('studentWork')).submissions[0].feedback, '값을 고쳐 주세요');
  await call('studentSubmit', 'alpha', { ...submission, id: crypto.randomUUID(), files: [{ id: crypto.randomUUID(), name: 'result-v2.txt', size: 40 }] });
  assert.equal((await call('studentWork')).submissions.length, 2);
  assert.equal((await call('studentList')).students.find(s => s.roomId === 'alpha').pending, 1);
  assert.equal((await call('studentList')).students.find(s => s.roomId === 'alpha').overdue, 0);
  await call('studentArchive', 'alpha', { id: made.id, archived: true });
  assert.equal((await call('studentWork')).assignments.length, 0);
  assert.equal((await call('studentList')).students.find(s => s.roomId === 'alpha').pending, 0);
  assert.equal((await call('studentGet')).submissions.length, 2);
  assert.equal((await call('studentSubmit', 'alpha', { ...submission, id: crypto.randomUUID() })).status, 404);
  await call('studentEvent', 'alpha', { kind: 'lesson', title: '첫 수업', path: '01/01' });
  await call('studentEvent', 'alpha', { kind: 'lesson', title: '첫 수업', path: '01/01' });
  assert.equal((await call('studentGet')).events.filter(e => e.kind === 'lesson').length, 1);
  for (let i = 0; i < 70; i++) db.prepare('INSERT INTO studentEvents(roomId,kind,title,path,at) VALUES(?,?,?,?,?)').run('alpha', 'visit', '이전 접속', '', Date.now() - 100000 - i);
  const first = (await call('studentEvents')).events;
  const next = (await call('studentEvents', 'alpha', { before: first.at(-1).id })).events;
  assert.equal(first.length, 50); assert.ok(next.length > 0); assert.ok(next.every(e => e.id < first.at(-1).id));
  assert.equal((await call('studentEvents', 'beta')).events.length, 0);
  assert.deepEqual((await call('studentInfo')).completed, []);
  const firstLesson = { lesson: '01-start/01-first', required: [], title: '첫 수업' };
  const nextLesson = { lesson: '01-start/02-next', required: [firstLesson.lesson], title: '다음 수업' };
  assert.equal((await call('studentComplete', 'alpha', nextLesson)).status, 409);
  assert.equal((await call('studentComplete', 'alpha', { ...firstLesson, lesson: '../outside' })).status, 400);
  assert.equal((await call('studentComplete', 'alpha', firstLesson)).status, 200);
  assert.equal((await call('studentComplete', 'alpha', firstLesson)).status, 200);
  assert.equal((await call('studentGet')).events.filter(e => e.kind === 'complete').length, 1);
  assert.deepEqual((await call('studentInfo')).completed, [firstLesson.lesson]);
  assert.deepEqual((await call('studentInfo', 'beta')).completed, []);
  assert.equal((await call('studentComplete', 'beta', nextLesson)).status, 409);
  assert.equal((await call('studentComplete', 'alpha', nextLesson)).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lessonCompletions WHERE roomId=?').get('alpha').n, 2);
  console.log('수강자 저장소: 방 분리, 제출 검증, 중복 제출, 검토, 재제출, 보관, 기록 페이지 확인');
} finally { db.close(); }
