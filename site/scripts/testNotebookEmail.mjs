import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const built = await build({
  stdin: { contents: 'export {notifyQuestion,notebookEmailStatus} from "./notebookEmail.ts"; export {StudentStore} from "./studentStore.ts";', resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const { notifyQuestion, notebookEmailStatus, StudentStore } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString("base64")}`);
const db = new DatabaseSync(":memory:");
const store = new StudentStore({
  sql: { exec(query, ...values) { if (!values.length && query.includes("CREATE TABLE")) { db.exec(query); return { toArray: () => [] }; } const rows = db.prepare(query).all(...values); return { toArray: () => rows }; } },
  transactionSync(run) { db.exec("BEGIN"); try { const value = run(); db.exec("COMMIT"); return value; } catch (error) { db.exec("ROLLBACK"); throw error; } },
});
const sent = [], calls = [];
let send = async () => ({ messageId: crypto.randomUUID() });
let failFinish = false;
const env = {
  CLASSROOM_NOTIFY_FROM: "classroom@example.com", CLASSROOM_NOTIFY_TO: "instructor@example.net",
  CLASSROOM_EMAIL: { async send(message) { sent.push(message); return send(message); } },
  CLASSROOM: { idFromName: name => name, get: () => ({ async fetch(_url, options) {
    const data = JSON.parse(options.body); calls.push(data);
    if (failFinish && data.action === "notebookFinishNotification") return Response.json({ error: "unavailable" }, { status: 503 });
    return store.handleNotebook({ ...data, roomTitle: "실습 & 검토", roomSlug: "sample" });
  } }) },
};
async function fixture() {
  const roomId = crypto.randomUUID(), messageId = crypto.randomUUID();
  assert.equal((await store.handle({ action: "studentSave", roomId, name: "학습자 <script>" })).status, 200);
  assert.equal((await store.handleNotebook({ action: "notebookAsk", roomId, ownerId: "personal", id: messageId, lesson: "sample/lesson", lessonTitle: "검증\r\nBcc: injected@example.org", sectionKey: "sample", sectionTitle: "입력 <b>변경</b>", body: "PRIVATE-QUESTION-CONTENT" })).status, 200);
  return { roomId, messageId };
}
const row = input => db.prepare("SELECT * FROM notebookNotifications WHERE messageId=?").get(input.messageId);
try {
  const initial = await fixture();
  const before = calls.length;
  const unconfigured = { ...env, CLASSROOM_NOTIFY_TO: "" };
  assert.equal(notebookEmailStatus(unconfigured).state, "unconfigured");
  assert.equal((await notifyQuestion(unconfigured, initial)).state, "unconfigured");
  assert.equal(calls.length, before);
  assert.equal(row(initial).state, "pending");
  assert.equal(notebookEmailStatus({ ...env, CLASSROOM_NOTIFY_TO: "a@example.com\r\nBcc:other@example.com" }).ready, false);
  assert.equal(notebookEmailStatus({ ...env, LOCAL_PREVIEW_BYPASS: "1" }).state, "local");
  assert.equal((await notifyQuestion({ ...env, LOCAL_PREVIEW_BYPASS: "1" }, initial)).state, "local");
  assert.equal(sent.length, 0);
  assert.equal(notebookEmailStatus(env).ready, true);
  assert.doesNotMatch(JSON.stringify(notebookEmailStatus(env)), /example\./);

  assert.equal((await notifyQuestion(env, initial)).state, "sent");
  assert.equal(row(initial).state, "sent");
  const mail = sent[0];
  assert.equal(mail.to, env.CLASSROOM_NOTIFY_TO);
  assert.equal(mail.from.email, env.CLASSROOM_NOTIFY_FROM);
  assert.doesNotMatch(mail.subject, /[\r\n]/);
  assert.match(mail.html, /학습자 &lt;script&gt;/);
  assert.match(mail.html, /입력 &lt;b&gt;변경&lt;\/b&gt;/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.doesNotMatch(JSON.stringify(mail), /PRIVATE-QUESTION-CONTENT|attachments|token|password/);
  assert.ok(mail.text.includes(`https://eddmpython.com/admin/students/questions?thread=${initial.messageId}`));
  assert.match(mail.text, /관리자 로그인 필요/);
  assert.equal((await notifyQuestion(env, initial, true)).state, "skipped");
  assert.equal(sent.length, 1, "완료된 알림은 관리자가 재요청해도 다시 보내지 않는다");

  const concurrent = await fixture();
  let release;
  send = () => new Promise(resolve => { release = resolve; });
  const ongoing = notifyQuestion(env, concurrent);
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal((await notifyQuestion(env, concurrent)).state, "skipped");
  assert.equal((await notifyQuestion(env, concurrent, true)).state, "skipped");
  release({ messageId: "accepted" });
  assert.equal((await ongoing).state, "sent");
  assert.equal(sent.length, 2, "동시 요청은 한 번만 발송한다");

  const failure = await fixture();
  send = async () => { throw Object.assign(new Error("private@example.net SECRET-CREDENTIAL"), { code: "E_SENDER_NOT_VERIFIED" }); };
  const rejected = await notifyQuestion(env, failure);
  assert.equal(rejected.state, "failed");
  assert.match(rejected.error, /발신 도메인/);
  assert.doesNotMatch(JSON.stringify(rejected), /private@|SECRET-CREDENTIAL/);
  assert.equal(row(failure).state, "failed");
  assert.doesNotMatch(row(failure).lastError, /private@|SECRET-CREDENTIAL/);
  const stored = await (await store.handleNotebook({ action: "notebookRead", roomId: failure.roomId, ownerId: "personal", lesson: "sample/lesson" })).json();
  assert.equal(stored.threads[0].messages[0].body, "PRIVATE-QUESTION-CONTENT", "메일 실패에도 질문은 보존된다");
  assert.equal((await notifyQuestion(env, failure)).state, "skipped");
  send = async () => ({ messageId: "retry-accepted" });
  assert.equal((await notifyQuestion(env, failure, true)).state, "sent");

  const uncertain = await fixture();
  send = async () => { throw new Error("NETWORK-PRIVATE-TOKEN"); };
  assert.equal((await notifyQuestion(env, uncertain)).state, "unknown");
  assert.equal(row(uncertain).state, "unknown");
  assert.doesNotMatch(row(uncertain).lastError, /NETWORK-PRIVATE-TOKEN/);
  assert.equal((await notifyQuestion(env, uncertain)).state, "skipped");
  send = async () => ({ messageId: "confirmed-retry" });
  assert.equal((await notifyQuestion(env, uncertain, true)).state, "sent");

  const lostFinish = await fixture();
  failFinish = true;
  assert.equal((await notifyQuestion(env, lostFinish)).state, "unknown");
  assert.equal(row(lostFinish).state, "sending");
  const count = sent.length;
  assert.equal((await notifyQuestion(env, lostFinish)).state, "skipped");
  assert.equal(sent.length, count);
  failFinish = false;
  db.prepare("UPDATE notebookNotifications SET claimedAt=? WHERE messageId=?").run(Date.now() - 61000, lostFinish.messageId);
  assert.equal((await notifyQuestion(env, lostFinish)).state, "skipped", "시간 경과만으로 알림을 중복 발송하지 않는다");
  assert.equal((await notifyQuestion(env, lostFinish, true)).state, "sent");
  assert.ok(calls.some(item => item.action === "notebookClaimNotification" && item.retry && item.confirm));

  const wrongRoom = await fixture();
  const finalCount = sent.length;
  assert.equal((await notifyQuestion(env, { ...wrongRoom, roomId: initial.roomId })).state, "pending");
  assert.equal((await notifyQuestion(env, { ...wrongRoom, messageId: crypto.randomUUID() })).state, "pending");
  assert.equal(sent.length, finalCount, "저장된 학습자 질문 이외에는 메일을 보내지 않는다");
  console.log("질문 알림 검사 통과: 설정·로컬 차단, 개인정보 제외, 중복 방지, 실패 보존, 수동 재시도");
} finally { db.close(); }
