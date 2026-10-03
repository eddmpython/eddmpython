/** 수강자 기록은 방 상태와 같은 SQLite 저장소에서 관리한다. 외부 권한은 HTTP 처리자가 확인한다. */
import { NotebookStore } from "./notebookStore";
type Row = Record<string, SqlStorageValue>;
const fail = (error: string, status = 400) => Response.json({ error }, { status });
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export class StudentStore {
  private sql: SqlStorage;
  private notebook: NotebookStore;
  constructor(private storage: DurableObjectStorage) {
    this.sql = storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS students (roomId TEXT PRIMARY KEY, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, roomId TEXT NOT NULL, title TEXT NOT NULL, instructions TEXT NOT NULL,
        dueAt INTEGER, method TEXT NOT NULL, lesson TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS assignmentsRoom ON assignments(roomId, created);
      CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, roomId TEXT NOT NULL, assignmentId TEXT NOT NULL, body TEXT NOT NULL, url TEXT NOT NULL,
        created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', feedback TEXT NOT NULL DEFAULT '', reviewedAt INTEGER);
      CREATE INDEX IF NOT EXISTS submissionsRoom ON submissions(roomId, created);
      CREATE INDEX IF NOT EXISTS submissionsAssignment ON submissions(assignmentId, created DESC);
      CREATE TABLE IF NOT EXISTS submissionFiles (id TEXT PRIMARY KEY, roomId TEXT NOT NULL, submissionId TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS filesSubmission ON submissionFiles(submissionId);
      CREATE TABLE IF NOT EXISTS studentEvents (id INTEGER PRIMARY KEY AUTOINCREMENT, roomId TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, path TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS eventsRoom ON studentEvents(roomId, id DESC);
      CREATE INDEX IF NOT EXISTS eventsRoomKind ON studentEvents(roomId, kind, id DESC);
      CREATE TABLE IF NOT EXISTS lessonCompletions (roomId TEXT NOT NULL, lesson TEXT NOT NULL, completed INTEGER NOT NULL, PRIMARY KEY(roomId, lesson));
      CREATE TABLE IF NOT EXISTS studentGithub (roomId TEXT PRIMARY KEY, repository TEXT NOT NULL, lesson TEXT NOT NULL,
        username TEXT NOT NULL DEFAULT '', accountId INTEGER, status TEXT NOT NULL DEFAULT 'unlinked', error TEXT NOT NULL DEFAULT '',
        attempt TEXT NOT NULL DEFAULT '', attemptedAt INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL DEFAULT 0);
    `);
    this.notebook = new NotebookStore(storage);
  }
  handleNotebook(body: Record<string, unknown>): Promise<Response> { return this.notebook.handle(body); }
  private rows(query: string, ...values: SqlStorageValue[]): Row[] { return this.sql.exec(query, ...values).toArray(); }
  private one(query: string, ...values: SqlStorageValue[]): Row | undefined { return this.rows(query, ...values)[0]; }
  private event(roomId: string, kind: string, title: string, path = "") {
    this.sql.exec("INSERT INTO studentEvents(roomId, kind, title, path, at) VALUES(?,?,?,?,?)", roomId, kind, title, path, Date.now());
  }
  handle(body: Record<string, unknown>): Response {
    const action = String(body.action);
    const roomId = text(body.roomId, 64);
    const now = Date.now();
    if (action === "studentList") {
      const completions = this.rows("SELECT roomId, lesson FROM lessonCompletions");
      return Response.json({ students: this.rows(`SELECT s.*,
        (SELECT username FROM studentGithub WHERE roomId=s.roomId) AS githubUsername,
        (SELECT status FROM studentGithub WHERE roomId=s.roomId) AS githubStatus,
        (SELECT title FROM studentEvents WHERE roomId=s.roomId AND kind IN ('lesson','section') ORDER BY id DESC LIMIT 1) AS lastLesson,
        (SELECT MAX(at) FROM studentEvents WHERE roomId=s.roomId AND kind IN ('login','visit','lesson','section','lecture','download','submission','complete','github')) AS lastAt,
        (SELECT COUNT(*) FROM assignments a WHERE a.roomId=s.roomId AND a.archived=0 AND a.dueAt < ? AND NOT EXISTS
          (SELECT 1 FROM submissions u WHERE u.assignmentId=a.id)) AS overdue,
        (SELECT COUNT(*) FROM submissions u JOIN assignments a ON a.id=u.assignmentId WHERE u.roomId=s.roomId AND a.archived=0 AND u.status='pending' AND u.id=(SELECT id FROM submissions WHERE assignmentId=u.assignmentId ORDER BY created DESC, rowid DESC LIMIT 1)) AS pending,
        (SELECT COUNT(*) FROM submissions WHERE roomId=s.roomId) AS submitted
        FROM students s ORDER BY pending DESC, overdue DESC, s.name`, now).map(student => ({ ...student,
          completed: completions.filter(row => row.roomId === student.roomId).map(row => row.lesson) })) });
    }
    if (!roomId) return fail("수강자 강의장이 필요합니다");
    if (action === "studentSave") {
      const name = text(body.name, 60);
      if (!name) return fail("수강자 이름을 적어 주세요");
      this.sql.exec(`INSERT INTO students(roomId,name,note,created) VALUES(?,?,?,?)
        ON CONFLICT(roomId) DO UPDATE SET name=excluded.name,note=excluded.note`, roomId, name, text(body.note, 4000), now);
      return Response.json({ ok: true });
    }
    const student = this.one("SELECT * FROM students WHERE roomId=?", roomId);
    if (action === "studentInfo") return Response.json({ enabled: Boolean(student), github: this.one("SELECT * FROM studentGithub WHERE roomId=?", roomId) ?? null, completed: student
      ? this.rows("SELECT lesson FROM lessonCompletions WHERE roomId=? ORDER BY lesson", roomId).map(row => row.lesson) : [] });
    // 등록하지 않은 단체 강의장은 기록하지 않는다.
    if (!student) return action === "studentEvent" ? Response.json({ ok: true }) : fail("등록되지 않은 수강자입니다", 404);
    if (action === "studentGithubConfig") {
      const repository = text(body.repository, 140), lesson = text(body.lesson, 300);
      if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(lesson)) return fail("저장소와 연결할 수업을 확인해 주세요");
      const previous = this.one("SELECT * FROM studentGithub WHERE roomId=?", roomId);
      if (previous?.username && previous.repository !== repository) return fail("계정이 연결된 저장소는 변경할 수 없습니다", 409);
      this.sql.exec(`INSERT INTO studentGithub(roomId,repository,lesson) VALUES(?,?,?)
        ON CONFLICT(roomId) DO UPDATE SET repository=excluded.repository,lesson=excluded.lesson`, roomId, repository, lesson);
      return Response.json({ ok: true });
    }
    if (action === "studentGithubStart") {
      const github = this.one("SELECT * FROM studentGithub WHERE roomId=?", roomId);
      if (!github) return fail("연결할 저장소가 없습니다. 강사에게 알려 주세요", 404);
      const username = text(body.username, 40);
      if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) return fail("GitHub 사용자 이름을 확인해 주세요");
      if (github.username && String(github.username).toLowerCase() !== username.toLowerCase()) return fail("이미 연결한 계정이 있습니다. 계정 변경은 강사에게 요청해 주세요", 409);
      if (now - Number(github.attemptedAt) < 30000) return fail("30초 뒤에 다시 확인해 주세요", 429);
      const attempt = crypto.randomUUID();
      this.sql.exec("UPDATE studentGithub SET username=?,attempt=?,attemptedAt=? WHERE roomId=?", username, attempt, now, roomId);
      return Response.json({ github: { ...github, username, attempt } });
    }
    if (action === "studentGithubFinish") {
      const github = this.one("SELECT * FROM studentGithub WHERE roomId=? AND attempt=?", roomId, text(body.attempt, 64));
      if (!github || !github.attempt) return fail("요청이 만료되었습니다. 다시 확인해 주세요", 409);
      const status = text(body.status, 20);
      if (!["pending", "active", "error", "unlinked"].includes(status)) return fail("연결 상태가 올바르지 않습니다");
      this.storage.transactionSync(() => {
        this.sql.exec("UPDATE studentGithub SET status=?,accountId=?,error=?,username=?,attempt='',updated=? WHERE roomId=?", status,
          Number(body.accountId) || github.accountId, text(body.error, 300), body.release === true && !github.accountId ? "" : github.username, now, roomId);
        if (github.status !== status) this.event(roomId, "github", status === "active" ? `GitHub 연결 완료 · ${github.username}` : status === "pending" ? `GitHub 초대 발송 · ${github.username}` : `GitHub 연결 확인 필요 · ${github.username}`);
      });
      return Response.json({ github: this.one("SELECT * FROM studentGithub WHERE roomId=?", roomId) });
    }
    if (action === "studentComplete") {
      const lesson = text(body.lesson, 300);
      const required = body.required;
      if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(lesson) || !Array.isArray(required) || required.some(value => typeof value !== "string")) return fail("수업 정보가 올바르지 않습니다");
      const completed = new Set(this.rows("SELECT lesson FROM lessonCompletions WHERE roomId=?", roomId).map(row => row.lesson));
      if (required.some(value => !completed.has(value))) return fail("앞 편의 학습을 먼저 완료해 주세요", 409);
      if (!completed.has(lesson)) this.storage.transactionSync(() => {
        this.sql.exec("INSERT INTO lessonCompletions(roomId,lesson,completed) VALUES(?,?,?)", roomId, lesson, now);
        this.event(roomId, "complete", text(body.title, 180), lesson);
      });
      return Response.json({ ok: true });
    }
    if (action === "studentGet") {
      return Response.json({ student, github: this.one("SELECT * FROM studentGithub WHERE roomId=?", roomId) ?? null,
        assignments: this.rows("SELECT * FROM assignments WHERE roomId=? ORDER BY archived, created DESC", roomId),
        submissions: this.rows("SELECT * FROM submissions WHERE roomId=? ORDER BY created DESC, rowid DESC", roomId),
        files: this.rows("SELECT * FROM submissionFiles WHERE roomId=?", roomId),
        completions: this.rows("SELECT lesson, completed FROM lessonCompletions WHERE roomId=?", roomId),
        reading: this.rows("SELECT e.* FROM studentEvents e WHERE e.roomId=? AND e.kind IN ('lesson','section') AND e.id=(SELECT MAX(id) FROM studentEvents WHERE roomId=e.roomId AND path=e.path AND kind=e.kind) ORDER BY e.id DESC", roomId),
        events: this.rows("SELECT * FROM studentEvents WHERE roomId=? ORDER BY id DESC LIMIT 50", roomId),
      });
    }
    if (action === "studentEvents") {
      const before = Number(body.before) || Number.MAX_SAFE_INTEGER;
      const kind = text(body.kind, 20);
      return Response.json({ events: kind
        ? this.rows("SELECT * FROM studentEvents WHERE roomId=? AND kind=? AND id < ? ORDER BY id DESC LIMIT 50", roomId, kind, before)
        : this.rows("SELECT * FROM studentEvents WHERE roomId=? AND id < ? ORDER BY id DESC LIMIT 50", roomId, before) });
    }
    if (action === "studentWork") {
      return Response.json({ assignments: this.rows("SELECT * FROM assignments WHERE roomId=? AND archived=0 ORDER BY dueAt IS NULL, dueAt, created", roomId),
        submissions: this.rows("SELECT * FROM submissions WHERE roomId=? ORDER BY created DESC, rowid DESC", roomId),
        files: this.rows("SELECT * FROM submissionFiles WHERE roomId=?", roomId) });
    }
    if (action === "studentAssignment") {
      const id = text(body.id, 64) || crypto.randomUUID();
      const previous = this.one("SELECT * FROM assignments WHERE id=?", id);
      if (body.id && (!previous || previous.roomId !== roomId)) return fail("없는 숙제입니다", 404);
      const title = text(body.title, 100), instructions = text(body.instructions, 12000), method = text(body.method, 20);
      const dueAt = body.dueAt === null || body.dueAt === "" ? null : Number(body.dueAt);
      if (!title || !instructions || !["any", "link", "file", "text"].includes(method)) return fail("숙제 제목, 제출 안내와 제출 방식을 확인해 주세요");
      if (dueAt !== null && (!Number.isSafeInteger(dueAt) || dueAt < 0 || dueAt > 253402214400000)) return fail("제출 기한이 올바르지 않습니다");
      this.sql.exec(`INSERT INTO assignments(id,roomId,title,instructions,dueAt,method,lesson,created,updated) VALUES(?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,instructions=excluded.instructions,dueAt=excluded.dueAt,method=excluded.method,lesson=excluded.lesson,updated=excluded.updated`,
        id, roomId, title, instructions, dueAt, method, text(body.lesson, 300), now, now);
      return Response.json({ ok: true, id });
    }
    if (action === "studentArchive") {
      this.sql.exec("UPDATE assignments SET archived=?,updated=? WHERE id=? AND roomId=?", body.archived === true ? 1 : 0, now, text(body.id, 64), roomId);
      return Response.json({ ok: true });
    }
    if (action === "studentSubmit") {
      const assignmentId = text(body.assignmentId, 64);
      const assignment = this.one("SELECT * FROM assignments WHERE id=? AND roomId=? AND archived=0", assignmentId, roomId);
      if (!assignment) return fail("제출할 수 없는 숙제입니다", 404);
      const id = text(body.id, 64);
      if (!/^[a-f0-9-]{36}$/.test(id)) return fail("제출 번호가 올바르지 않습니다");
      if (this.one("SELECT id FROM submissions WHERE id=? AND roomId=?", id, roomId)) return Response.json({ ok: true, id, duplicate: true });
      const message = text(body.body, 12000), url = text(body.url, 2000);
      if (url) { try { if (new URL(url).protocol !== "https:") return fail("https 주소를 적어 주세요"); } catch { return fail("링크 주소를 확인해 주세요"); } }
      const files = Array.isArray(body.files) ? body.files as Record<string, unknown>[] : [];
      if (files.length > 3 || files.some(f => !/^[a-f0-9-]{36}$/.test(String(f.id)) || !text(f.name, 180) || !Number.isSafeInteger(f.size) || Number(f.size) < 1 || Number(f.size) > 10 * 1024 * 1024)) return fail("첨부 파일이 올바르지 않습니다");
      if ((!message && !url && !files.length) || (assignment.method === "link" && !url) || (assignment.method === "file" && !files.length) || (assignment.method === "text" && !message)) return fail("안내된 방식으로 내용이나 파일을 넣어 주세요");
      this.storage.transactionSync(() => {
        this.sql.exec("INSERT INTO submissions(id,roomId,assignmentId,body,url,created) VALUES(?,?,?,?,?,?)", id, roomId, assignmentId, message, url, now);
        for (const f of files) this.sql.exec("INSERT INTO submissionFiles(id,roomId,submissionId,name,size) VALUES(?,?,?,?,?)", String(f.id), roomId, id, text(f.name, 180), Number(f.size));
        this.event(roomId, "submission", String(assignment.title));
      });
      return Response.json({ ok: true, id });
    }
    if (action === "studentReview") {
      const id = text(body.id, 64), status = text(body.status, 20);
      if (!["pending", "revision", "accepted"].includes(status)) return fail("검토 상태를 확인해 주세요");
      if (!this.one("SELECT id FROM submissions WHERE id=? AND roomId=?", id, roomId)) return fail("없는 제출물입니다", 404);
      const feedback = text(body.feedback, 12000);
      if (status === "revision" && !feedback) return fail("수정할 내용을 피드백에 적어 주세요");
      this.sql.exec("UPDATE submissions SET status=?,feedback=?,reviewedAt=? WHERE id=? AND roomId=?", status, feedback, now, id, roomId);
      return Response.json({ ok: true });
    }
    if (action === "studentFile") return Response.json({ file: this.one("SELECT * FROM submissionFiles WHERE id=? AND roomId=?", text(body.id, 64), roomId) ?? null });
    if (action === "studentEvent") {
      const kind = text(body.kind, 20);
      if (!["login", "visit", "lesson", "section", "lecture", "download"].includes(kind)) return fail("기록할 수 없는 활동입니다");
      const title = text(body.title, 180), path = text(body.path, 400);
      // 같은 페이지의 새로고침을 접속 횟수로 부풀리지 않는다.
      if (kind !== "login" && this.one("SELECT id FROM studentEvents WHERE roomId=? AND kind=? AND path=? AND title=? AND at>? LIMIT 1", roomId, kind, path, title, now - 60000)) return Response.json({ ok: true });
      if (this.rows("SELECT id FROM studentEvents WHERE roomId=? AND at>? LIMIT 60", roomId, now - 60000).length >= 60) return fail("잠시 뒤에 다시 기록합니다", 429);
      this.event(roomId, kind, title, path);
      return Response.json({ ok: true });
    }
    return fail("지원하지 않는 수강자 작업입니다");
  }
}
