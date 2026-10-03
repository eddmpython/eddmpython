import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const result = await build({ entryPoints: [fileURLToPath(new URL('../studentStore.ts', import.meta.url))], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { StudentStore } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const db = new DatabaseSync(':memory:');
const storage = {
  sql: { exec(query, ...values) {
    if (!values.length && query.includes('CREATE TABLE')) { db.exec(query); return { toArray: () => [] }; }
    const rows = db.prepare(query).all(...values);
    return { toArray: () => rows };
  } },
  transactionSync(run) { db.exec('BEGIN'); try { const result = run(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } },
};
const store = new StudentStore(storage);
const call = async (action, body = {}) => {
  const response = await store.handleNotebook({ action, roomId: 'alpha', ownerId: 'personal', ...body });
  return { status: response.status, ...await response.json() };
};
const scope = { lesson: '08-work/01-first', lessonTitle: '실습', sectionKey: 'abc123', sectionTitle: '원장 읽기' };
const memberPassword = crypto.randomUUID(), wrongPassword = crypto.randomUUID(), shortPassword = crypto.randomUUID().slice(0, 5);
const actualNow = Date.now;
let now = actualNow();
Date.now = () => now;
const advance = (ms = 10001) => { now += ms; };

try {
  assert.equal((await call('notebookIdentity')).identity, null);
  assert.equal((await call('notebookRead', scope)).status, 401);
  store.handle({ action: 'studentSave', roomId: 'alpha', name: '수강자 A' });
  store.handle({ action: 'studentSave', roomId: 'beta', name: '수강자 B' });
  assert.deepEqual((await call('notebookIdentity')).identity, { id: 'personal', name: '수강자 A' });
  assert.equal((await call('notebookRegister', { name: '개인방 별도 계정', password: memberPassword })).status, 409);

  assert.equal((await call('notebookSaveNote', { ...scope, body: '개인 메모', version: 1 })).status, 409);
  assert.equal((await call('notebookSaveNote', { ...scope, body: '개인 메모' })).status, 400);
  assert.equal((await call('notebookSaveNote', { ...scope, body: 'x'.repeat(12001), version: 0 })).status, 400);
  assert.equal((await call('notebookSaveNote', { ...scope, body: '비공개 메모\n코드()', version: 0 })).note.version, 1);
  assert.equal((await call('notebookRead', { ...scope, roomId: 'beta' })).notes.length, 0);
  const conflict = await call('notebookSaveNote', { ...scope, body: '오래된 창', version: 0 });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.note.body, '비공개 메모\n코드()');
  assert.equal((await call('notebookSaveNote', { ...scope, body: '', version: 1 })).note.version, 2);
  assert.equal((await call('notebookRead', scope)).notes[0].body, '');
  await call('notebookSaveNote', { ...scope, body: '강사에게 보이면 안 되는 내용', version: 2 });
  assert.equal((await call('notebookSaveNote', { ...scope, lesson: '../private', body: 'x', version: 0 })).status, 400);

  const questionId = crypto.randomUUID();
  const question = { ...scope, id: questionId, body: '원장 입력 형식을 알려 주세요' };
  const made = await call('notebookAsk', question);
  assert.equal(made.created, true);
  assert.equal(made.thread.status, 'pending');
  assert.equal(made.thread.messages[0].id, questionId);
  assert.equal(made.thread.notificationMessageId, questionId);
  assert.equal((await call('notebookAsk', question)).created, false);
  assert.equal((await call('notebookAsk', { ...question, body: '다른 내용' })).status, 409);
  assert.equal((await call('notebookAsk', { ...question, roomId: 'beta' })).status, 409);
  assert.equal((await call('notebookAsk', { ...question, id: crypto.randomUUID() })).status, 429);
  assert.equal((await call('notebookFollowup', { roomId: 'beta', id: questionId, messageId: crypto.randomUUID(), body: '타인 질문' })).status, 404);
  assert.equal((await call('notebookReply', { roomId: 'beta', id: questionId, messageId: crypto.randomUUID(), body: '잘못된 방' })).status, 404);
  assert.equal((await call('notebookRead', { ...scope, roomId: 'beta' })).threads.length, 0);
  const inbox = await call('notebookInbox');
  assert.equal(inbox.threads.length, 1);
  assert.equal(inbox.threads[0].ownerName, '수강자 A');
  assert.ok(!JSON.stringify(inbox).includes('강사에게 보이면 안 되는 내용'));
  assert.equal((await call('notebookInbox', { roomId: 'beta', threadId: questionId })).threads.length, 0);
  assert.equal((await call('notebookInbox', { roomId: '', roomIds: ['beta'] })).threads.length, 0);
  const reply = { id: questionId, messageId: crypto.randomUUID(), body: '표 머리글을 확인해 주세요' };
  const replied = await call('notebookReply', reply);
  assert.equal(replied.thread.status, 'answered');
  assert.equal(replied.thread.ownerName, '수강자 A');
  assert.equal((await call('notebookReply', reply)).created, false);
  assert.equal((await call('notebookReply', { ...reply, body: '바뀐 답변' })).status, 409);
  assert.equal((await call('notebookFollowup', { id: questionId, messageId: reply.messageId, body: reply.body })).status, 409);
  advance();
  const followup = { id: questionId, messageId: crypto.randomUUID(), body: '열 순서도 같아야 하나요?' };
  assert.equal((await call('notebookFollowup', followup)).thread.status, 'pending');
  assert.equal((await call('notebookFollowup', followup)).created, false);
  assert.equal((await call('notebookFollowup', { ...followup, messageId: crypto.randomUUID() })).status, 429);
  assert.equal((await call('notebookRead', scope)).threads[0].messages.length, 3);

  const group = { roomId: 'group', name: 'Learner A', password: memberPassword };
  assert.equal((await call('notebookRegister', { ...group, password: shortPassword })).status, 400);
  const registered = await call('notebookRegister', group);
  assert.equal(registered.status, 200);
  const ownerId = registered.identity.id;
  assert.equal((await call('notebookRegister', { ...group, name: ' learner a ' })).status, 409);
  assert.equal((await call('notebookLogin', { ...group, name: 'LEARNER A' })).identity.id, ownerId);
  assert.equal((await call('notebookIdentity', { roomId: 'group', ownerId })).identity.name, 'Learner A');
  assert.equal((await call('notebookIdentity', { roomId: 'group-other', ownerId })).identity, null);
  assert.equal((await call('notebookIdentity', { roomId: 'group', ownerId: 'personal' })).identity, null);
  const peer = await call('notebookRegister', { ...group, name: 'Learner B' });
  await call('notebookSaveNote', { ...scope, roomId: 'group', ownerId, body: 'A만 읽을 메모', version: 0 });
  assert.equal((await call('notebookRead', { ...scope, roomId: 'group', ownerId: peer.identity.id })).notes.length, 0);
  const groupQuestion = { ...scope, roomId: 'group', ownerId, id: crypto.randomUUID(), body: '그룹 질문' };
  await call('notebookAsk', groupQuestion);
  assert.equal((await call('notebookFollowup', { roomId: 'group', ownerId: peer.identity.id, id: groupQuestion.id, messageId: crypto.randomUUID(), body: '다른 사람 질문' })).status, 404);
  for (let i = 0; i < 8; i++) assert.equal((await call('notebookLogin', { ...group, password: wrongPassword })).status, 401);
  assert.equal((await call('notebookLogin', group)).status, 429);
  advance(300001);
  assert.equal((await call('notebookLogin', group)).status, 200);
  assert.equal((await call('notebookLogin', { ...group, name: '없는 계정' })).status, 401);
  const member = db.prepare('SELECT * FROM notebookMembers WHERE id=?').get(ownerId);
  assert.notEqual(member.hash, group.password);
  assert.equal(member.hash.length, 64);
  db.prepare('INSERT OR REPLACE INTO notebookAuthRooms(roomId,started,count) VALUES(?,?,?)').run('group', now, 60);
  assert.equal((await call('notebookLogin', group)).status, 429);
  advance(60001);
  const duplicate = { roomId: 'concurrent', name: '같은 사람', password: memberPassword };
  const parallel = await Promise.all([call('notebookRegister', duplicate), call('notebookRegister', duplicate)]);
  assert.deepEqual(parallel.map(r => r.status).sort(), [200, 409]);

  assert.equal((await call('notebookClaimNotification', { roomId: 'beta', messageId: questionId })).status, 404);
  assert.equal((await call('notebookClaimNotification', { messageId: reply.messageId })).status, 404);
  const claim = await call('notebookClaimNotification', { messageId: questionId, roomSlug: 'alpha-room', roomTitle: 'A 방' });
  assert.equal(claim.notification.state, 'sending');
  assert.equal(claim.thread.ownerName, '수강자 A');
  assert.equal(claim.message.body, question.body);
  assert.equal((await call('notebookClaimNotification', { messageId: questionId })).notification, null);
  assert.equal((await call('notebookFinishNotification', { messageId: questionId, attempt: 'other', state: 'sent' })).status, 409);
  advance(60001);
  assert.equal((await call('notebookClaimNotification', { messageId: questionId })).notification, null);
  assert.equal((await call('notebookClaimNotification', { messageId: questionId, retry: true })).notification, null);
  const retry = await call('notebookClaimNotification', { messageId: questionId, retry: true, confirm: true });
  assert.notEqual(retry.notification.attempt, claim.notification.attempt);
  assert.equal((await call('notebookFinishNotification', { messageId: questionId, attempt: claim.notification.attempt, state: 'sent' })).status, 409);
  await call('notebookFinishNotification', { messageId: questionId, attempt: retry.notification.attempt, state: 'unknown' });
  assert.equal((await call('notebookClaimNotification', { messageId: questionId })).notification, null);
  const retried = await call('notebookClaimNotification', { messageId: questionId, retry: true });
  await call('notebookFinishNotification', { messageId: questionId, attempt: retried.notification.attempt, state: 'sent' });
  assert.equal((await call('notebookClaimNotification', { messageId: questionId, retry: true, confirm: true })).notification, null);
  // 옛 메시지 알림을 나중에 처리해도 최신 질문의 알림 상태를 덮지 않는다.
  const current = (await call('notebookRead', scope)).threads[0];
  assert.equal(current.notificationMessageId, followup.messageId);
  assert.equal(current.notificationState, 'pending');
  const nextClaim = await call('notebookClaimNotification', { messageId: followup.messageId });
  await call('notebookFinishNotification', { messageId: followup.messageId, attempt: nextClaim.notification.attempt, state: 'failed', error: 'service_unavailable' });
  assert.equal((await call('notebookClaimNotification', { messageId: followup.messageId })).notification, null);
  assert.ok((await call('notebookClaimNotification', { messageId: followup.messageId, retry: true })).notification);

  // 저장소를 다시 만들더라도 DB 기록이 남고, 삭제된 학습자는 질문함에서도 제외된다.
  const restored = new StudentStore(storage);
  assert.equal((await (await restored.handleNotebook({ action: 'notebookRead', roomId: 'alpha', ownerId: 'personal', lesson: scope.lesson })).json()).notes[0].version, 3);
  db.prepare('DELETE FROM notebookMembers WHERE id=?').run(ownerId);
  assert.equal((await call('notebookReply', { roomId: 'group', id: groupQuestion.id, messageId: crypto.randomUUID(), body: '삭제된 사람' })).status, 404);
  assert.equal((await call('notebookClaimNotification', { roomId: 'group', messageId: groupQuestion.id })).status, 404);
  assert.equal((await call('notebookInbox', { roomId: 'group' })).threads.length, 0);
  console.log('메모 저장소: 개인·공용방 분리, CAS 충돌, 질문·답변 멱등성, 속도 제한, 계정 잠금, 알림 발송 상태, 재시작 보존 확인');
} finally {
  Date.now = actualNow;
  db.close();
}
