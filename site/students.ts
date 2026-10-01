import { call, type PublicRoom } from "./rooms";
import { esc } from "./classroom-render";
import { header, page } from "./shell";
import type { Env } from "./env";
import { course } from "./course";
import { cookie, issueToken } from "./auth";

const methods: Record<string, string> = { any: "글·링크·파일 중 선택", link: "링크 제출", file: "파일 제출", text: "글로 제출" };
const statuses: Record<string, string> = { pending: "검토 대기", revision: "수정 요청", accepted: "확인 완료" };
const kinds: Record<string, string> = { login: "로그인", visit: "강의장 접속", lesson: "수업 열람", section: "섹션 열람", lecture: "강의 모드", download: "자료 다운로드", submission: "숙제 제출" };
type RecordRow = Record<string, any>;
const date = (value: unknown) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short", hour12: false }).format(Number(value)) : "기록 없음";
const due = (value: unknown) => value ? date(value) : "기한 미정";
const datetime = (value: unknown) => value ? new Date(Number(value) + 9 * 3600000).toISOString().slice(0, 16) : "";
const label = (status: string) => `<span class="badge ${esc(status)}">${esc(statuses[status] ?? status)}</span>`;
const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
export const STUDENT_STYLE = `
.wrap.wide {width:min(100% - 3rem,84rem);max-width:none;padding-inline:0}
.students {padding:2rem 0 5rem;font-size:1rem}.students h1{margin:0;font-size:2.1rem;letter-spacing:-.04em}
.wrap:has(.students) .hd{margin-bottom:2rem}.students a{color:var(--eddm-accent)}
.students h2{font-size:1.25rem;margin:0 0 1rem}.students h3{margin:0;font-size:1.05rem}
.students p{line-height:1.7}.muted{color:var(--eddm-text-muted)}.small{font-size:.85rem}.pre{white-space:pre-wrap;overflow-wrap:anywhere}
.topline,.actions{display:flex;gap:.8rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.actions{justify-content:flex-start}
.admin-nav{display:flex;gap:1.5rem;border-bottom:1px solid var(--eddm-line);margin:1.5rem 0 2rem;padding-bottom:.8rem}.admin-nav a{text-decoration:none;color:var(--eddm-text-muted)}.admin-nav a[aria-current=page]{color:var(--eddm-accent);font-weight:700}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin:1.5rem 0}.stat,.panel{border:1px solid var(--eddm-line);border-radius:.85rem;padding:1.3rem;background:var(--eddm-carbon)}.stat b{display:block;font-size:1.7rem;margin-top:.5rem}.stat span{color:var(--eddm-text-muted);font-size:.9rem}
.students input,.students textarea,.students select{width:100%;box-sizing:border-box;padding:.65rem .75rem;background:var(--eddm-carbon);color:var(--eddm-ivory);border:1px solid var(--eddm-line-strong);border-radius:.45rem;font:inherit}.students textarea{min-height:8rem;resize:vertical}.students label{display:grid;gap:.45rem;font-size:.9rem}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.full{grid-column:1/-1}
.students button,.students .button{padding:.65rem .95rem;border:1px solid var(--eddm-line-strong);border-radius:.5rem;background:var(--eddm-carbon);color:var(--eddm-ivory);font:inherit;cursor:pointer;text-decoration:none;display:inline-block}.students .primary{background:var(--eddm-accent);border-color:var(--eddm-accent);color:var(--eddm-carbon);font-weight:700}.students button:disabled{opacity:.5;cursor:wait}
.students a{overflow-wrap:anywhere}.students details{margin:1rem 0}.students summary{cursor:pointer;padding:.5rem 0;font-weight:600}.table-wrap{overflow:auto}.students table{width:100%;border-collapse:collapse;text-align:left}.students th{font-size:.8rem;color:var(--eddm-text-muted);font-weight:500}.students th,.students td{padding:1rem .7rem;border-bottom:1px solid var(--eddm-line);vertical-align:top}.students td:first-child,.students th:first-child{padding-left:0}.students td:last-child{padding-right:0}.name{font-weight:700;text-decoration:none}.badge{display:inline-block;border-radius:.35rem;padding:.2rem .5rem;background:var(--eddm-raise);font-size:.8rem;white-space:nowrap}.badge.pending,.badge.revision,.badge.overdue{background:var(--eddm-accent-bg);color:var(--eddm-accent)}
.stack{display:grid;gap:1rem}.work-card{border:1px solid var(--eddm-line);border-radius:.85rem;padding:1.4rem}.work-card:has(.pending){border-color:var(--eddm-accent-line)}.work-card .meta{display:flex;gap:1rem;flex-wrap:wrap;font-size:.85rem;color:var(--eddm-text-muted);margin:.7rem 0}.submission{border-top:1px solid var(--eddm-line);padding-top:1rem;margin-top:1.2rem}.feedback{border-left:3px solid var(--eddm-accent);padding:.1rem 1rem;margin:1rem 0}.message{min-height:1.5rem;color:var(--eddm-accent)}.empty{padding:2rem 0;color:var(--eddm-text-muted)}.search{max-width:22rem;margin:0 0 1rem}.backlink{display:inline-block;margin-bottom:1rem}.notice{font-size:.85rem;color:var(--eddm-text-muted)}
@media(max-width:650px){.wrap.wide{width:calc(100% - 2rem)}.students{padding-top:1rem}.students h1{font-size:1.6rem}.stats{gap:.5rem}.stat{padding:.8rem}.stat b{font-size:1.4rem}.form-grid{grid-template-columns:1fr}.students th,.students td{padding:.8rem .5rem}.hide-small{display:none}.work-card{padding:1rem}.admin-nav{gap:1rem}.panel{padding:1rem}}
`;
const script = `
document.querySelectorAll('[data-json-form]').forEach(form=>form.addEventListener('submit',async event=>{
 event.preventDefault();const message=form.querySelector('[role=status]');const button=event.submitter||form.querySelector('button');button.disabled=true;message.textContent='저장하고 있습니다';
 try {const body=Object.fromEntries(new FormData(form));if('dueAt' in body)body.dueAt=body.dueAt?Date.parse(body.dueAt+':00+09:00'):null;if('archived' in body)body.archived=body.archived==='true';
 const response=await fetch('/admin/students/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'저장하지 못했습니다');location.href=form.dataset.next||location.pathname;
 }catch(error){message.textContent=error.message;button.disabled=false;}
}));
document.querySelector('[data-search]')?.addEventListener('input',event=>{const term=event.target.value.toLowerCase();document.querySelectorAll('[data-student]').forEach(row=>row.hidden=!row.dataset.student.includes(term));});
document.querySelector('[data-more]')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{const r=await fetch('/admin/students/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'studentEvents',roomId:button.dataset.room,before:Number(button.dataset.before)})});const data=await r.json();if(!r.ok)throw Error(data.error);document.querySelector('[data-events]').insertAdjacentHTML('beforeend',data.html);button.dataset.before=data.before;button.hidden=!data.more;}catch(error){document.querySelector('#message').textContent=error.message;}finally{button.disabled=false;}});
`;
function adminPage(title: string, body: string) {
  return page({ title, style: STUDENT_STYLE, script, wide: true, inner: `${header()}<main class="students"><div class="topline"><h1>${esc(title)}</h1><form method="post" action="/admin/logout"><button>나가기</button></form></div><nav class="admin-nav"><a href="/admin/students" aria-current="page">수강자 관리</a><a href="/admin">강의장 설정</a></nav>${body}</main>` });
}
function hidden(name: string, value: string) { return `<input type="hidden" name="${name}" value="${esc(value)}">`; }
function saveButton(text = "저장") { return `<div class="full actions"><button class="primary">${text}</button><span role="status" class="message" aria-live="polite"></span></div>`; }
function filesHtml(files: RecordRow[], root: string) { return files.map(f => `<p><a href="${root}/files/${esc(f.id)}">${esc(f.name)}</a> <span class="muted small">(${Math.ceil(f.size / 1024)} KB)</span></p>`).join(""); }
function submissionHtml(s: RecordRow, files: RecordRow[], root: string) {
  return `<div class="submission"><div class="topline"><strong>${date(s.created)} 제출</strong>${label(s.status)}</div>${s.body ? `<p class="pre">${esc(s.body)}</p>` : ""}${s.url ? `<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a></p>` : ""}${filesHtml(files.filter(f => f.submissionId === s.id), root)}${s.feedback ? `<div class="feedback"><b>강사 피드백</b><p class="pre">${esc(s.feedback)}</p><small>${date(s.reviewedAt)}</small></div>` : ""}</div>`;
}
function eventRows(events: RecordRow[]) { return events.map(e => `<tr><td class="small">${date(e.at)}</td><td><span class="badge">${esc(kinds[e.kind] ?? e.kind)}</span></td><td>${esc(e.title)}</td></tr>`).join(""); }

export async function handleStudents(request: Request, env: Env, url: URL): Promise<Response> {
  const parts = url.pathname.replace(/\/$/, "").split("/").slice(3);
  const listed = await call(env, { action: "list" });
  const rooms = listed.data.rooms as PublicRoom[];
  if (parts[0] === "api" && request.method === "POST") {
    if (!sameOrigin(request, url)) return Response.json({ error: "이 화면에서 다시 시도해 주세요" }, { status: 403 });
    const body = await readJson(request);
    const allowed = ["studentSave", "studentAssignment", "studentReview", "studentArchive", "studentEvents"];
    if (!body || !allowed.includes(String(body.action))) return Response.json({ error: "지원하지 않는 작업입니다" }, { status: 400 });
    const room = rooms.find(r => r.id === body.roomId);
    if (!room) return new Response("없는 강의장입니다", { status: 404 });
    if (body.action === "studentAssignment" && body.lesson) {
      const found = await course(env);
      if (!found.categories.some(c => room.unlocked.includes(c.slug) && c.posts.some(p => `${c.slug}/${p.id}` === body.lesson))) return Response.json({ error: "이 강의장에 열린 수업을 선택해 주세요" }, { status: 400 });
    }
    const result = await call(env, body);
    if (body.action === "studentEvents" && result.status === 200) {
      const events = result.data.events as RecordRow[];
      return Response.json({ html: eventRows(events), before: events.at(-1)?.id ?? 0, more: events.length === 50 }, { headers: privateHeaders });
    }
    return Response.json(result.data, { status: result.status, headers: privateHeaders });
  }
  if (request.method !== "GET") return new Response("not found", { status: 404 });
  if (!parts[0]) {
    const result = await call(env, { action: "studentList" });
    const students = (result.data.students as RecordRow[]).filter(s => rooms.some(r => r.id === s.roomId));
    const available = rooms.filter(r => !students.some(s => s.roomId === r.id));
    return adminPage("수강자 관리", `<p class="muted">수강자를 선택해 숙제를 내고 제출물과 활동 기록을 확인하세요</p><div class="stats"><div class="stat"><span>검토할 제출물</span><b>${students.reduce((n, s) => n + Number(s.pending), 0)}</b></div><div class="stat"><span>기한 지난 미제출</span><b>${students.reduce((n, s) => n + Number(s.overdue), 0)}</b></div><div class="stat"><span>등록 수강자</span><b>${students.length}명</b></div></div>
    <input class="search" data-search aria-label="수강자 검색" placeholder="이름 또는 강의장 주소로 검색">
    <div class="table-wrap"><table><thead><tr><th>수강자</th><th>확인할 일</th><th>마지막 접속</th><th class="hide-small">제출</th></tr></thead><tbody>${students.map(s => { const room = rooms.find(r => r.id === s.roomId)!; return `<tr data-student="${esc((s.name + " " + room.slug).toLowerCase())}"><td><a class="name" href="/admin/students/${esc(s.roomId)}">${esc(s.name)} →</a><div class="muted small">${esc(room.slug)}</div></td><td>${s.pending ? `<span class="badge pending">검토 ${s.pending}</span> ` : ""}${s.overdue ? `<span class="badge overdue">미제출 ${s.overdue}</span>` : ""}${!s.pending && !s.overdue ? '<span class="muted">없음</span>' : ""}</td><td class="small">${date(s.lastAt)}</td><td class="hide-small">${s.submitted}건</td></tr>`; }).join("")}</tbody></table></div>${students.length ? "" : '<p class="empty">개인 강의장에 수강자를 등록하면 이곳에서 관리할 수 있습니다.</p>'}
    <details class="panel"><summary>수강자 등록</summary>${available.length ? `<form class="form-grid" data-json-form>${hidden("action", "studentSave")}<label>이름<input name="name" required maxlength="60"></label><label>개인 강의장<select name="roomId">${available.map(r => `<option value="${esc(r.id)}">${esc(r.title)} · ${esc(r.slug)}</option>`).join("")}</select></label>${saveButton("등록")}</form>` : '<p>등록할 개인 강의장이 없습니다. <a href="/admin">강의장 설정</a>에서 먼저 만드세요</p>'}</details><p class="notice">시간은 한국 시간입니다. 접속·열람은 해당 강의장에서 발생한 활동이며 학습 완료를 뜻하지 않습니다.</p>`);
  }
  const room = rooms.find(r => r.id === parts[0]);
  if (!room) return new Response("없는 강의장입니다", { status: 404 });
  if (parts[1] === "preview" && parts.length === 2) {
    const { data } = await call(env, { action: "adminSession" });
    return new Response(null, { status: 303, headers: { ...privateHeaders, location: `/room/${room.slug}`, "set-cookie": cookie("eddm_preview", await issueToken(data.key, `preview:${room.slug}:${room.gen}`, data.gen), `/room/${room.slug}`, url) } });
  }
  if (parts[1] === "files" && parts.length === 3) return studentFile(env, room.id, parts[2]);
  if (parts.length !== 1) return new Response("not found", { status: 404 });
  const result = await call(env, { action: "studentGet", roomId: room.id });
  if (result.status !== 200) return new Response("등록되지 않은 수강자입니다", { status: 404 });
  const { student, assignments, submissions, files, events } = result.data;
  const root = `/admin/students/${room.id}`;
  const tab = url.searchParams.get("tab") ?? "work";
  const nav = `<a class="backlink" href="/admin/students">← 수강자 목록</a><div class="topline"><div><p class="muted small">${esc(room.title)} · /room/${esc(room.slug)}</p></div><a class="button" href="${root}/preview" target="_blank" rel="noreferrer">강의장 미리보기</a></div><nav class="admin-nav">${[["work", "숙제와 제출"], ["activity", "접속·활동 기록"], ["settings", "수강자 정보"]].map(([id, title]) => `<a href="${root}?tab=${id}" ${tab === id ? 'aria-current="page"' : ""}>${title}</a>`).join("")}</nav>`;
  let body = "";
  if (tab === "settings") {
    body = `<form class="form-grid panel" data-json-form>${hidden("action", "studentSave")}${hidden("roomId", room.id)}<label>이름<input name="name" value="${esc(student.name)}" required maxlength="60"></label><label class="full">강사 메모<textarea name="note" maxlength="4000">${esc(student.note)}</textarea><span class="muted small">수강자에게 보이지 않습니다</span></label>${saveButton()}</form>`;
  } else if (tab === "activity") {
    body = `<p class="notice">등록 이후의 접속과 열람, 다운로드, 제출을 기록합니다. 이전 활동과 컴퓨터에서 한 작업은 알 수 없습니다.</p><div class="table-wrap"><table><thead><tr><th>일시 (한국 시간)</th><th>활동</th><th>내용</th></tr></thead><tbody data-events>${eventRows(events)}</tbody></table></div>${events.length ? "" : '<p class="empty">아직 활동 기록이 없습니다.</p>'}<p id="message" role="status"></p><button data-more data-room="${esc(room.id)}" data-before="${events.at(-1)?.id ?? 0}" ${events.length < 50 ? "hidden" : ""}>이전 기록 더 보기</button>`;
  } else {
    const edit = assignments.find((a: RecordRow) => a.id === url.searchParams.get("edit"));
    const found = await course(env);
    const lessons = found.categories.filter(c => room.unlocked.includes(c.slug)).flatMap(c => c.posts.map(p => ({value: `${c.slug}/${p.id}`, title: `${c.title} · ${p.title}`})));
    const active = assignments.filter((a: RecordRow) => !a.archived);
    body = `<details class="panel" ${edit ? "open" : ""}><summary>${edit ? "숙제 수정" : "새 숙제 내기"}</summary><form class="form-grid" data-json-form>${hidden("action", "studentAssignment")}${hidden("roomId", room.id)}${hidden("id", edit?.id ?? "")}<label class="full">숙제 제목<input name="title" required maxlength="100" value="${esc(edit?.title ?? "")}" placeholder="예: 첫 커밋을 GitHub에 올리기"></label><label class="full">무엇을 어떻게 제출하나요?<textarea name="instructions" required maxlength="12000" placeholder="할 일과 제출할 결과를 적어 주세요">${esc(edit?.instructions ?? "")}</textarea></label><label>제출 기한 (한국 시간)<input type="datetime-local" name="dueAt" value="${datetime(edit?.dueAt)}"><span class="muted small">비워 두면 기한 미정</span></label><label>제출 방식<select name="method">${Object.entries(methods).map(([v, t]) => `<option value="${v}" ${edit?.method === v ? "selected" : ""}>${t}</option>`).join("")}</select></label><label class="full">연결할 수업 (선택)<select name="lesson"><option value="">선택하지 않음</option>${lessons.map(l => `<option value="${esc(l.value)}" ${edit?.lesson === l.value ? "selected" : ""}>${esc(l.title)}</option>`).join("")}</select></label>${saveButton(edit ? "숙제 수정" : "숙제 등록")}</form></details><div class="stack">${active.map((a: RecordRow) => {
      const history = submissions.filter((s: RecordRow) => s.assignmentId === a.id); const latest = history[0];
      return `<section class="work-card"><div class="topline"><h3>${esc(a.title)}</h3>${latest ? label(latest.status) : `<span class="badge ${a.dueAt && a.dueAt < Date.now() ? "overdue" : ""}">미제출</span>`}</div><div class="meta"><span>${due(a.dueAt)}</span><span>${methods[a.method]}</span><a href="${root}?edit=${esc(a.id)}">숙제 수정</a></div><p class="pre">${esc(a.instructions)}</p>${latest ? `${submissionHtml(latest, files, root)}<form class="form-grid" data-json-form>${hidden("action", "studentReview")}${hidden("roomId", room.id)}${hidden("id", latest.id)}<label class="full">피드백<textarea name="feedback" maxlength="12000" placeholder="확인한 내용이나 수정할 점">${esc(latest.feedback)}</textarea></label><label>검토 결과<select name="status">${Object.entries(statuses).map(([v, t]) => `<option value="${v}" ${latest.status === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>${saveButton("검토 저장")}</form>${history.length > 1 ? `<details><summary>이전 제출 ${history.length - 1}건</summary>${history.slice(1).map((s: RecordRow) => submissionHtml(s, files, root)).join("")}</details>` : ""}` : '<p class="muted">제출하면 이곳에서 내용과 첨부 파일을 확인할 수 있습니다.</p>'}<details><summary class="muted small">숙제 관리</summary><form data-json-form>${hidden("action", "studentArchive")}${hidden("roomId", room.id)}${hidden("id", a.id)}${hidden("archived", "true")}${saveButton("숙제 보관")}</form><p class="notice">강의장에서 숨깁니다. 제출 기록은 남습니다.</p></details></section>`;
    }).join("")}</div>${active.length ? "" : '<p class="empty">아직 숙제가 없습니다. 위에서 첫 숙제를 등록하세요</p>'}<details><summary>보관한 숙제 ${assignments.length - active.length}개</summary>${assignments.filter((a: RecordRow) => a.archived).map((a: RecordRow) => `<section class="work-card"><h3>${esc(a.title)}</h3>${submissions.filter((s: RecordRow) => s.assignmentId === a.id).map((s: RecordRow) => submissionHtml(s, files, root)).join("")}<form data-json-form>${hidden("action", "studentArchive")}${hidden("roomId", room.id)}${hidden("id", a.id)}${hidden("archived", "false")}${saveButton("숙제 다시 열기")}</form></section>`).join("")}</details>`;
  }
  return adminPage(student.name, nav + body);
}

export function sameOrigin(request: Request, url: URL) { const origin = request.headers.get("origin"); return request.headers.get("sec-fetch-site") !== "cross-site" && (!origin || origin === url.origin); }
export async function readJson(request: Request, max = 32000): Promise<Record<string, unknown> | null> { try { const text = await limitedBody(request, max); const value = JSON.parse(new TextDecoder().decode(text)); return value && typeof value === "object" && !Array.isArray(value) ? value : null; } catch { return null; } }
async function limitedBody(request: Request, max: number): Promise<Uint8Array> {
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new Error("파일은 합계 10 MB 이하로 제출해 주세요"); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
export async function studentFile(env: Env, roomId: string, id: string): Promise<Response> {
  const result = await call(env, { action: "studentFile", roomId, id }); const file = result.data.file;
  if (!file || !env.SUBMISSIONS) return new Response("없는 파일입니다", { status: 404 });
  const object = await env.SUBMISSIONS.get(`${roomId}/${id}`);
  if (!object) return new Response("없는 파일입니다", { status: 404 });
  return new Response(object.body, { headers: { ...privateHeaders, "content-type": "application/octet-stream", "x-content-type-options": "nosniff", "content-disposition": `attachment; filename="submission"; filename*=UTF-8''${encodeURIComponent(file.name)}` } });
}

export async function homeworkPage(request: Request, env: Env, url: URL, room: PublicRoom, parts: string[], readOnly = false, trackActivity = false): Promise<Response> {
  const root = `/room/${room.slug}`;
  if (parts[2] === "files" && parts.length === 4 && request.method === "GET") return studentFile(env, room.id, parts[3]);
  const work = await call(env, { action: "studentWork", roomId: room.id });
  if (work.status !== 200) return new Response("등록된 실습이 없습니다", { status: 404 });
  const { assignments, submissions, files } = work.data;
  const assignment = assignments.find((a: RecordRow) => a.id === parts[2]);
  if (parts.length > 2 && !assignment) return new Response("없는 실습입니다", { status: 404 });
  let error = "";
  let submittedBody = "", submittedUrl = "";
  let submissionId: string = crypto.randomUUID();
  if (request.method === "POST" && assignment) {
    if (!sameOrigin(request, url)) return new Response("이 화면에서 다시 시도해 주세요", { status: 403 });
    if (readOnly) return new Response("미리보기에서는 제출할 수 없습니다", { status: 403 });
    const uploaded: string[] = [];
    let uncertainCommit = false;
    try {
      const bytes = await limitedBody(request, 11 * 1024 * 1024);
      const form = await new Response(bytes.buffer as ArrayBuffer, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
      submittedBody = String(form.get("body") ?? ""); submittedUrl = String(form.get("url") ?? ""); submissionId = String(form.get("id") ?? "");
      const attachments = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
      if (attachments.length > 3 || attachments.reduce((n, f) => n + f.size, 0) > 10 * 1024 * 1024) throw new Error("파일은 최대 3개, 합계 10 MB까지 제출할 수 있습니다");
      if (attachments.length && !env.SUBMISSIONS) throw new Error("파일 제출을 준비 중입니다. 강사에게 알려 주세요");
      const fileRows = [];
      for (const f of attachments) {
        const id = crypto.randomUUID(); const name = f.name.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 180);
        await env.SUBMISSIONS!.put(`${room.id}/${id}`, f.stream(), { httpMetadata: { contentType: "application/octet-stream" } }); uploaded.push(`${room.id}/${id}`);
        fileRows.push({ id, name, size: f.size });
      }
      uncertainCommit = true;
      const result = await call(env, { action: "studentSubmit", roomId: room.id, id: String(form.get("id") ?? ""), assignmentId: assignment.id, body: String(form.get("body") ?? ""), url: String(form.get("url") ?? ""), files: fileRows });
      uncertainCommit = false;
      if (result.status !== 200) throw new Error(result.data.error ?? "제출하지 못했습니다");
      if (result.data.duplicate && uploaded.length) await env.SUBMISSIONS!.delete(uploaded);
      return new Response(null, { status: 303, headers: { ...privateHeaders, location: `${root}/homework/${assignment.id}?submitted=1` } });
    } catch (e) { if (!uncertainCommit && uploaded.length && env.SUBMISSIONS) await env.SUBMISSIONS.delete(uploaded); error = e instanceof Error ? e.message : "제출하지 못했습니다. 다시 시도해 주세요"; }
  } else if (request.method !== "GET") return new Response("not found", { status: 404 });
  if (request.method === "GET" && trackActivity) await recordActivity(env, room, "visit", assignment ? `실습 확인 · ${assignment.title}` : "제출 목록", `homework/${assignment?.id ?? ""}`);
  const history = assignment ? submissions.filter((s: RecordRow) => s.assignmentId === assignment.id) : [];
  const content = assignment ? `<h1>${esc(assignment.title)}</h1><div class="meta muted"><p>${due(assignment.dueAt)} · ${methods[assignment.method]}</p></div><p class="pre">${esc(assignment.instructions)}</p>${assignment.lesson ? `<p><a href="${root}/${esc(assignment.lesson)}">관련 수업 열기 →</a></p>` : ""}${url.searchParams.has("submitted") ? '<p class="message" role="status">제출했습니다. 아래에서 제출 내용과 강사 피드백을 확인할 수 있습니다.</p>' : ""}${history.length ? submissionHtml(history[0], files, `${root}/homework`) + `<details ${error ? "open" : ""}><summary>수정해서 다시 제출</summary>` : ""}<form class="form-grid panel" method="post" enctype="multipart/form-data">${hidden("id", submissionId)}<h2 class="full">${history.length ? "수정해서 다시 제출" : "결과 제출"}</h2><label class="full">설명 또는 답변<textarea name="body" maxlength="12000" ${assignment.method === "text" ? "required" : ""}>${esc(submittedBody)}</textarea></label><label class="full">결과 링크<input type="url" name="url" value="${esc(submittedUrl)}" placeholder="https://" maxlength="2000" ${assignment.method === "link" ? "required" : ""}></label><label class="full">첨부 파일<input type="file" name="files" multiple ${assignment.method === "file" ? "required" : ""}><span class="muted small">최대 3개, 합계 10 MB. 더 큰 파일은 접근 가능한 링크로 제출하세요</span></label><div class="full"><p class="message" role="alert">${esc(error)}</p><button class="primary" ${readOnly ? "disabled" : ""}>${readOnly ? "강사 미리보기" : history.length ? "다시 제출" : "제출"}</button></div></form>${history.length ? "</details>" : ""}${history.length > 1 ? `<details><summary>이전 제출 ${history.length - 1}건</summary>${history.slice(1).map((s: RecordRow) => submissionHtml(s, files, `${root}/homework`)).join("")}</details>` : ""}` : `<p class="muted">제출 기한과 방법을 확인하고 결과를 제출하세요</p><div class="stack">${assignments.map((a: RecordRow) => { const latest = submissions.find((s: RecordRow) => s.assignmentId === a.id); return `<a class="work-card name" href="${root}/homework/${esc(a.id)}"><div class="topline"><h2>${esc(a.title)}</h2>${latest ? label(latest.status) : '<span class="badge">미제출</span>'}</div><p class="muted small">${due(a.dueAt)} · ${methods[a.method]}</p><span>실습 확인 →</span></a>`; }).join("")}</div>${assignments.length ? "" : '<p class="empty">아직 등록된 실습이 없습니다.</p>'}`;
  return page({ title: assignment?.title ?? "제출 목록", style: STUDENT_STYLE, inner: `${header()}<main class="students"><a class="backlink" href="${root}${assignment ? "/homework" : ""}">← ${assignment ? "제출 목록" : "수업 목록"}</a>${content}</main>`, status: error ? 400 : 200 });
}

export async function recordActivity(env: Env, room: PublicRoom, kind: string, title: string, path = "") {
  if (!room.id) return;
  const result = await call(env, { action: "studentEvent", roomId: room.id, kind, title, path });
  if (result.status >= 500) throw new Error("활동 기록 저장 실패");
}
