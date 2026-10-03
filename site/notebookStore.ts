import { LOCK_MS, MAX_FAILS, randomHex, safeEqual, stretch } from "./auth";

type Row = Record<string, SqlStorageValue>;
type Identity = { id: string; name: string };
const fail = (error: string, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const field = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value.trim() : "";
const lessonPattern = /^[a-z0-9-]+\/[a-z0-9-]+$/;

/** 메모는 개인에게만 반환한다. 질문과 답변만 강사 질문함에서 읽는다. HTTP 권한은 호출자가 확인한다. */
export class NotebookStore {
  private sql: SqlStorage;
  constructor(private storage: DurableObjectStorage) {
    this.sql = storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS notebookMembers (
        id TEXT PRIMARY KEY, roomId TEXT NOT NULL, name TEXT NOT NULL, nameKey TEXT NOT NULL,
        salt TEXT NOT NULL, hash TEXT NOT NULL, fails INTEGER NOT NULL DEFAULT 0,
        lockedUntil INTEGER NOT NULL DEFAULT 0, attempt TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL,
        UNIQUE(roomId,nameKey));
      CREATE TABLE IF NOT EXISTS notebookAuthRooms (roomId TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS notebookNotes (
        roomId TEXT NOT NULL, ownerId TEXT NOT NULL, lesson TEXT NOT NULL, sectionKey TEXT NOT NULL,
        sectionTitle TEXT NOT NULL, lessonTitle TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL,
        PRIMARY KEY(roomId,ownerId,lesson,sectionKey));
      CREATE TABLE IF NOT EXISTS notebookThreads (
        id TEXT PRIMARY KEY, roomId TEXT NOT NULL, ownerId TEXT NOT NULL, lesson TEXT NOT NULL,
        lessonTitle TEXT NOT NULL, sectionKey TEXT NOT NULL, sectionTitle TEXT NOT NULL,
        status TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS notebookThreadsOwner ON notebookThreads(roomId,ownerId,lesson,updated DESC);
      CREATE INDEX IF NOT EXISTS notebookThreadsInbox ON notebookThreads(status,updated DESC);
      CREATE TABLE IF NOT EXISTS notebookMessages (
        id TEXT PRIMARY KEY, threadId TEXT NOT NULL, role TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS notebookMessagesThread ON notebookMessages(threadId,created);
      CREATE TABLE IF NOT EXISTS notebookNotifications (
        messageId TEXT PRIMARY KEY, roomId TEXT NOT NULL, threadId TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
        attempt TEXT NOT NULL DEFAULT '', claimedAt INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL, lastError TEXT NOT NULL DEFAULT '');
    `);
  }

  private rows(query: string, ...values: SqlStorageValue[]): Row[] { return this.sql.exec(query, ...values).toArray(); }
  private one(query: string, ...values: SqlStorageValue[]): Row | undefined { return this.rows(query, ...values)[0]; }

  private identity(roomId: string, ownerId: string): Identity | null {
    if (ownerId === "personal") {
      const student = this.one("SELECT name FROM students WHERE roomId=?", roomId);
      return student ? { id: "personal", name: String(student.name) } : null;
    }
    // 개인방으로 전환한 뒤에도 이전 공용방 계정으로 접근할 수 없게 한다.
    if (this.one("SELECT roomId FROM students WHERE roomId=?", roomId)) return null;
    const member = this.one("SELECT id,name FROM notebookMembers WHERE roomId=? AND id=?", roomId, ownerId);
    return member ? { id: String(member.id), name: String(member.name) } : null;
  }

  private thread(row: Row) {
    const messages = this.rows("SELECT id,role,body,created FROM notebookMessages WHERE threadId=? ORDER BY created,rowid", row.id);
    const notification = this.one(`SELECT n.state,n.messageId FROM notebookNotifications n JOIN notebookMessages m ON m.id=n.messageId
      WHERE n.threadId=? ORDER BY m.created DESC,m.rowid DESC LIMIT 1`, row.id);
    return { ...row, messages, notificationState: notification?.state ?? "pending", notificationMessageId: notification?.messageId ?? null };
  }

  private scope(body: Record<string, unknown>) {
    const lesson = field(body.lesson, 300), sectionKey = field(body.sectionKey, 120);
    const lessonTitle = field(body.lessonTitle, 300), sectionTitle = field(body.sectionTitle, 300);
    return lessonPattern.test(lesson) && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(sectionKey) && lessonTitle && sectionTitle
      ? { lesson, sectionKey, lessonTitle, sectionTitle } : null;
  }

  private message(body: unknown) { return typeof body === "string" && body.length <= 12000 && body.trim() ? body.trim() : null; }

  private slowQuestion(roomId: string, ownerId: string, now: number) {
    return Boolean(this.one(`SELECT m.id FROM notebookMessages m JOIN notebookThreads t ON t.id=m.threadId
      WHERE t.roomId=? AND t.ownerId=? AND m.role='learner' AND m.created>? LIMIT 1`, roomId, ownerId, now - 10000));
  }

  private addMessage(roomId: string, threadId: string, id: string, role: string, body: string, now: number) {
    this.sql.exec("INSERT INTO notebookMessages(id,threadId,role,body,created) VALUES(?,?,?,?,?)", id, threadId, role, body, now);
    this.sql.exec("UPDATE notebookThreads SET status=?,updated=? WHERE id=? AND roomId=?", role === "learner" ? "pending" : "answered", now, threadId, roomId);
    if (role === "learner") this.sql.exec("INSERT INTO notebookNotifications(messageId,roomId,threadId,updated) VALUES(?,?,?,?)", id, roomId, threadId, now);
  }

  private async authenticate(body: Record<string, unknown>, roomId: string): Promise<Response> {
    if (this.one("SELECT roomId FROM students WHERE roomId=?", roomId)) return fail("개인 강의장에서는 별도 메모 계정이 필요하지 않습니다", 409);
    const name = field(body.name, 60).normalize("NFKC").replace(/\s+/g, " ");
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 60 || /[\u0000-\u001f\u007f]/.test(name) || password.length < 8 || password.length > 200) return fail("60자 이하의 이름과 8자 이상 200자 이하의 비밀번호를 적어 주세요");
    const now = Date.now(), nameKey = name.toLocaleLowerCase("en-US");
    const rate = this.one("SELECT started,count FROM notebookAuthRooms WHERE roomId=?", roomId);
    if (rate && Number(rate.started) > now - 60000 && Number(rate.count) >= 60) return fail("요청이 많습니다. 1분 뒤에 다시 시도해 주세요", 429);
    this.sql.exec(`INSERT INTO notebookAuthRooms(roomId,started,count) VALUES(?,?,1)
      ON CONFLICT(roomId) DO UPDATE SET started=excluded.started,count=?`, roomId,
      rate && Number(rate.started) > now - 60000 ? rate.started : now,
      rate && Number(rate.started) > now - 60000 ? Number(rate.count) + 1 : 1);
    let member = this.one("SELECT * FROM notebookMembers WHERE roomId=? AND nameKey=?", roomId, nameKey);
    if (body.action === "notebookRegister") {
      if (member) return fail("이미 등록한 이름입니다. 로그인해 주세요", 409);
      if (Number(this.one("SELECT COUNT(*) AS n FROM notebookMembers WHERE roomId=?", roomId)?.n) >= 2000) return fail("메모 계정 등록 한도를 초과했습니다. 강사에게 알려 주세요", 429);
      const salt = randomHex(16), hash = await stretch(password, salt), id = crypto.randomUUID();
      // 비밀번호 계산 중 다른 등록 요청이나 개인방 전환이 일어났을 수 있다.
      if (this.one("SELECT roomId FROM students WHERE roomId=?", roomId)) return fail("개인 강의장에서 다시 열어 주세요", 409);
      if (this.one("SELECT id FROM notebookMembers WHERE roomId=? AND nameKey=?", roomId, nameKey)) return fail("이미 등록한 이름입니다. 로그인해 주세요", 409);
      if (Number(this.one("SELECT COUNT(*) AS n FROM notebookMembers WHERE roomId=?", roomId)?.n) >= 2000) return fail("메모 계정 등록 한도를 초과했습니다. 강사에게 알려 주세요", 429);
      this.sql.exec("INSERT INTO notebookMembers(id,roomId,name,nameKey,salt,hash,created) VALUES(?,?,?,?,?,?,?)", id, roomId, name, nameKey, salt, hash, now);
      return Response.json({ identity: { id, name } });
    }
    if (member && Number(member.lockedUntil) > now) return fail("로그인 시도가 잠겼습니다. 5분 뒤에 다시 시도해 주세요", 429);
    const attempt = crypto.randomUUID();
    if (member) {
      const fails = Number(member.lockedUntil) && Number(member.lockedUntil) <= now ? 1 : Number(member.fails) + 1;
      this.sql.exec("UPDATE notebookMembers SET fails=?,lockedUntil=?,attempt=? WHERE id=? AND roomId=?", fails,
        fails >= MAX_FAILS ? now + LOCK_MS : 0, attempt, member.id, roomId);
    }
    const hash = await stretch(password, member ? String(member.salt) : "notebook-unknown-account");
    if (!member || !safeEqual(hash, String(member.hash))) return fail("이름 또는 비밀번호가 맞지 않습니다", 401);
    member = this.one("SELECT * FROM notebookMembers WHERE id=? AND roomId=?", member.id, roomId);
    if (!member || member.attempt !== attempt || !this.identity(roomId, String(member.id))) return fail("다른 로그인 요청이 진행되었습니다. 다시 시도해 주세요", 409);
    this.sql.exec("UPDATE notebookMembers SET fails=0,lockedUntil=0,attempt='' WHERE id=? AND roomId=?", member.id, roomId);
    return Response.json({ identity: { id: member.id, name: member.name } });
  }

  async handle(body: Record<string, unknown>): Promise<Response> {
    const action = String(body.action), roomId = field(body.roomId, 64), ownerId = field(body.ownerId, 64), now = Date.now();
    if (action === "notebookInbox") {
      const threadId = field(body.threadId, 64);
      const threads = threadId ? this.rows("SELECT * FROM notebookThreads WHERE id=?", threadId)
        : roomId ? this.rows("SELECT * FROM notebookThreads WHERE roomId=? ORDER BY status DESC,updated DESC", roomId)
        : this.rows("SELECT * FROM notebookThreads ORDER BY status DESC,updated DESC");
      return Response.json({ threads: threads.flatMap(row => {
        if (roomId && row.roomId !== roomId || Array.isArray(body.roomIds) && !body.roomIds.includes(row.roomId)) return [];
        const identity = this.identity(String(row.roomId), String(row.ownerId));
        return identity ? [{ ...this.thread(row), ownerName: identity.name }] : [];
      }) });
    }
    if (!roomId) return fail("강의장 정보가 필요합니다");
    if (action === "notebookRegister" || action === "notebookLogin") return this.authenticate(body, roomId);
    if (action === "notebookReply") {
      const id = field(body.id, 64), messageId = body.messageId, message = this.message(body.body);
      const row = this.one("SELECT * FROM notebookThreads WHERE id=? AND roomId=?", id, roomId);
      const owner = row ? this.identity(roomId, String(row.ownerId)) : null;
      if (!row || !owner) return fail("질문을 찾을 수 없습니다", 404);
      if (!uuid(messageId) || !message) return fail("답변 내용과 요청 번호를 확인해 주세요");
      const previous = this.one("SELECT threadId,role,body FROM notebookMessages WHERE id=?", messageId);
      if (previous) return previous.threadId === id && previous.role === "instructor" && previous.body === message
        ? Response.json({ thread: { ...this.thread(row), ownerName: owner.name }, created: false }) : fail("이미 사용한 요청 번호입니다", 409);
      if (Number(this.one("SELECT COUNT(*) AS n FROM notebookMessages WHERE threadId=?", id)?.n) >= 200) return fail("대화가 길어졌습니다. 새 질문으로 이어 주세요", 429);
      this.storage.transactionSync(() => this.addMessage(roomId, id, messageId, "instructor", message, now));
      return Response.json({ thread: { ...this.thread(this.one("SELECT * FROM notebookThreads WHERE id=?", id)!), ownerName: owner.name }, created: true });
    }
    if (action === "notebookClaimNotification" || action === "notebookFinishNotification") {
      const messageId = field(body.messageId, 64);
      const row = this.one(`SELECT n.* FROM notebookNotifications n JOIN notebookMessages m ON m.id=n.messageId
        JOIN notebookThreads t ON t.id=n.threadId WHERE n.messageId=? AND n.roomId=? AND t.roomId=? AND m.role='learner'`, messageId, roomId, roomId);
      if (!row) return fail("질문 알림을 찾을 수 없습니다", 404);
      const thread = this.one("SELECT * FROM notebookThreads WHERE id=? AND roomId=?", row.threadId, roomId)!;
      const identity = this.identity(roomId, String(thread.ownerId));
      if (!identity) return fail("질문자를 찾을 수 없습니다", 404);
      if (action === "notebookClaimNotification") {
        if (row.state === "sent" || ["failed", "unknown"].includes(String(row.state)) && body.retry !== true
          || row.state === "sending" && (Number(row.claimedAt) > now - 60000 || body.retry !== true || body.confirm !== true)) return Response.json({ notification: null });
        const attempt = crypto.randomUUID();
        this.sql.exec("UPDATE notebookNotifications SET state='sending',attempt=?,claimedAt=?,updated=?,lastError='' WHERE messageId=? AND roomId=?", attempt, now, now, messageId, roomId);
        return Response.json({ notification: { messageId, roomId, threadId: row.threadId, attempt, state: "sending" },
          thread: { ...thread, roomSlug: field(body.roomSlug, 31), roomTitle: field(body.roomTitle, 200), ownerName: identity.name },
          message: this.one("SELECT id,role,body,created FROM notebookMessages WHERE id=? AND threadId=?", messageId, row.threadId) });
      }
      if (row.state !== "sending" || row.attempt !== body.attempt) return fail("알림 요청이 만료되었습니다", 409);
      if (!["sent", "failed", "unknown"].includes(String(body.state))) return fail("알림 상태를 확인해 주세요");
      this.sql.exec("UPDATE notebookNotifications SET state=?,updated=?,lastError=? WHERE messageId=? AND roomId=?", String(body.state), now, field(body.error, 300), messageId, roomId);
      return Response.json({ ok: true });
    }
    const identity = this.identity(roomId, ownerId);
    if (action === "notebookIdentity") return Response.json({ identity });
    if (!identity) return fail("메모 계정으로 로그인해 주세요", 401);
    if (action === "notebookRead") {
      const lesson = field(body.lesson, 300);
      if (!lessonPattern.test(lesson)) return fail("수업 정보를 확인해 주세요");
      return Response.json({ notes: this.rows("SELECT sectionKey,sectionTitle,lessonTitle,body,version,updated FROM notebookNotes WHERE roomId=? AND ownerId=? AND lesson=?", roomId, ownerId, lesson),
        threads: this.rows("SELECT * FROM notebookThreads WHERE roomId=? AND ownerId=? AND lesson=? ORDER BY created,rowid", roomId, ownerId, lesson).map(row => this.thread(row)) });
    }
    if (action === "notebookSaveNote") {
      const scope = this.scope(body);
      if (!scope || typeof body.body !== "string" || body.body.length > 12000 || !Number.isSafeInteger(body.version) || Number(body.version) < 0) return fail("메모 정보와 저장 버전을 확인해 주세요");
      const note = this.one("SELECT sectionKey,sectionTitle,lessonTitle,body,version,updated FROM notebookNotes WHERE roomId=? AND ownerId=? AND lesson=? AND sectionKey=?", roomId, ownerId, scope.lesson, scope.sectionKey);
      if (Number(body.version) !== Number(note?.version ?? 0)) return fail("다른 창에서 메모가 변경되었습니다. 내용을 확인해 주세요", 409, { note: note ?? null });
      if (!note && Number(this.one("SELECT COUNT(*) AS n FROM notebookNotes WHERE roomId=? AND ownerId=?", roomId, ownerId)?.n) >= 2000) return fail("메모 수가 많습니다. 강사에게 알려 주세요", 429);
      const version = Number(body.version) + 1;
      this.sql.exec(`INSERT INTO notebookNotes(roomId,ownerId,lesson,sectionKey,sectionTitle,lessonTitle,body,version,updated) VALUES(?,?,?,?,?,?,?,?,?)
        ON CONFLICT(roomId,ownerId,lesson,sectionKey) DO UPDATE SET sectionTitle=excluded.sectionTitle,lessonTitle=excluded.lessonTitle,body=excluded.body,version=excluded.version,updated=excluded.updated`,
        roomId, ownerId, scope.lesson, scope.sectionKey, scope.sectionTitle, scope.lessonTitle, body.body, version, now);
      return Response.json({ note: { sectionKey: scope.sectionKey, sectionTitle: scope.sectionTitle, lessonTitle: scope.lessonTitle, body: body.body, version, updated: now } });
    }
    if (action === "notebookAsk") {
      const scope = this.scope(body), message = this.message(body.body), id = body.id;
      if (!scope || !uuid(id) || !message) return fail("질문 내용과 수업 정보를 확인해 주세요");
      const existing = this.one("SELECT * FROM notebookThreads WHERE id=?", id);
      if (existing) {
        const first = this.one("SELECT body FROM notebookMessages WHERE id=? AND threadId=? AND role='learner'", id, id);
        return existing.roomId === roomId && existing.ownerId === ownerId && existing.lesson === scope.lesson && existing.sectionKey === scope.sectionKey && first?.body === message
          ? Response.json({ thread: this.thread(existing), created: false }) : fail("이미 사용한 요청 번호입니다", 409);
      }
      if (this.one("SELECT id FROM notebookMessages WHERE id=?", id)) return fail("이미 사용한 요청 번호입니다", 409);
      if (this.slowQuestion(roomId, ownerId, now)) return fail("질문은 10초 간격으로 보낼 수 있습니다. 잠시 뒤에 다시 보내 주세요", 429);
      if (Number(this.one("SELECT COUNT(*) AS n FROM notebookThreads WHERE roomId=? AND ownerId=?", roomId, ownerId)?.n) >= 1000) return fail("질문 수가 많습니다. 강사에게 알려 주세요", 429);
      this.storage.transactionSync(() => {
        this.sql.exec("INSERT INTO notebookThreads(id,roomId,ownerId,lesson,lessonTitle,sectionKey,sectionTitle,status,created,updated) VALUES(?,?,?,?,?,?,?,'pending',?,?)", id, roomId, ownerId, scope.lesson, scope.lessonTitle, scope.sectionKey, scope.sectionTitle, now, now);
        this.addMessage(roomId, id, id, "learner", message, now);
      });
      return Response.json({ thread: this.thread(this.one("SELECT * FROM notebookThreads WHERE id=?", id)!), created: true });
    }
    if (action === "notebookFollowup") {
      const id = field(body.id, 64), messageId = body.messageId, message = this.message(body.body);
      const row = this.one("SELECT * FROM notebookThreads WHERE id=? AND roomId=? AND ownerId=?", id, roomId, ownerId);
      if (!row) return fail("질문을 찾을 수 없습니다", 404);
      if (!uuid(messageId) || !message) return fail("질문 내용과 요청 번호를 확인해 주세요");
      const previous = this.one("SELECT threadId,role,body FROM notebookMessages WHERE id=?", messageId);
      if (previous) return previous.threadId === id && previous.role === "learner" && previous.body === message
        ? Response.json({ thread: this.thread(row), created: false }) : fail("이미 사용한 요청 번호입니다", 409);
      if (this.slowQuestion(roomId, ownerId, now)) return fail("새 질문은 10초 뒤에 보내 주세요", 429);
      if (Number(this.one("SELECT COUNT(*) AS n FROM notebookMessages WHERE threadId=?", id)?.n) >= 200) return fail("대화가 길어졌습니다. 새 질문으로 이어 주세요", 429);
      this.storage.transactionSync(() => this.addMessage(roomId, id, messageId, "learner", message, now));
      return Response.json({ thread: this.thread(this.one("SELECT * FROM notebookThreads WHERE id=?", id)!), created: true });
    }
    return fail("지원하지 않는 메모 작업입니다");
  }
}
