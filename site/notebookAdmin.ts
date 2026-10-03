import { call, type PublicRoom } from "./rooms";
import { esc } from "./classroom-render";
import type { Env } from "./env";
import { notebookEmailStatus, notifyQuestion } from "./notebookEmail";

type QuestionMessage = { id: string; role: "learner" | "instructor"; body: string; created: number };
type QuestionThread = {
  id: string; roomId: string; ownerName: string; lesson: string; lessonTitle: string;
  sectionKey: string; sectionTitle: string; status: "pending" | "answered";
  created: number; updated: number; messages: QuestionMessage[];
  notificationState?: string; notificationMessageId?: string;
};
const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
const root = "/admin/students/questions";
const date = (value: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short", hour12: false }).format(value);
const badge = (status: string) => `<span class="badge ${status === "pending" ? "pending" : ""}">${status === "pending" ? "답변 대기" : "답변 완료"}</span>`;
function link(url: URL, updates: Record<string, string>) {
  const query = new URLSearchParams(url.search);
  for (const [key, value] of Object.entries(updates)) value ? query.set(key, value) : query.delete(key);
  return `${root}${query.size ? "?" + query : ""}`;
}
function messagesHtml(thread: QuestionThread) {
  return thread.messages.map(message => `<article class="question-message ${message.role === "instructor" ? "question-answer" : ""}" data-message-id="${esc(message.id)}"><div class="topline"><strong>${message.role === "instructor" ? "강사 답변" : esc(thread.ownerName || "학습자")}</strong><time class="small muted" datetime="${new Date(message.created).toISOString()}">${date(message.created)}</time></div><div class="pre question-message-body">${esc(message.body)}</div></article>`).join("");
}
function notificationHtml(thread: QuestionThread, ready: boolean) {
  if (!ready) return "";
  const state = thread.notificationState ?? "pending";
  const labels: Record<string, string> = { pending: "메일 알림 대기", sending: "메일 발송 중 또는 결과 확인 중", sent: "메일 발송 완료", failed: "메일 발송 실패", unknown: "메일 발송 결과 확인 필요" };
  const canRetry = ["pending", "failed", "unknown", "sending"].includes(state) && thread.notificationMessageId;
  return `<div class="question-notification actions"><span class="small muted" data-mail-state>${esc(labels[state] ?? "메일 상태 확인 필요")}</span>${canRetry ? `<button class="small" type="button" data-notification-retry data-room="${esc(thread.roomId)}" data-thread="${esc(thread.id)}" data-state="${esc(state)}">${state === "pending" ? "알림 보내기" : "알림 다시 보내기"}</button>` : ""}<span class="small message" role="status" data-mail-result></span></div>`;
}
function detailHtml(thread: QuestionThread, rooms: PublicRoom[], ready: boolean) {
  const room = rooms.find(room => room.id === thread.roomId);
  if (!room) return '<p class="empty">강의장을 찾을 수 없습니다.</p>';
  const preview = `/admin/students/${encodeURIComponent(room.id)}/preview?lesson=${encodeURIComponent(thread.lesson)}&section=${encodeURIComponent(thread.sectionKey)}`;
  return `<header class="question-heading"><div class="topline"><span class="small muted">${esc(room.title)} · ${esc(thread.ownerName || "학습자")}</span><span data-question-status>${badge(thread.status)}</span></div><h2>${esc(thread.sectionTitle)}</h2><p class="small muted">${esc(thread.lessonTitle)}</p><a class="small" href="${esc(preview)}" target="_blank" rel="noreferrer">연결된 수업 열기 ↗</a>${notificationHtml(thread, ready)}</header><div class="question-messages" data-question-messages>${messagesHtml(thread)}</div><form class="question-reply" data-question-reply data-thread="${esc(thread.id)}"><input type="hidden" name="action" value="notebookReply"><input type="hidden" name="roomId" value="${esc(thread.roomId)}"><input type="hidden" name="id" value="${esc(thread.id)}"><input type="hidden" name="messageId" value="${crypto.randomUUID()}"><label for="question-answer">강사 답변<textarea id="question-answer" name="body" required maxlength="12000" rows="6" placeholder="학습자가 다음에 확인하거나 시도할 내용을 적어 주세요" aria-describedby="question-reply-help"></textarea></label><p id="question-reply-help" class="notice">보내면 학습자가 해당 섹션에서 답변을 확인할 수 있습니다. 줄바꿈과 코드는 입력한 대로 표시됩니다.</p><div class="actions"><button class="primary" type="submit">답변 보내기</button><span role="status" class="message" aria-live="polite"></span></div><p class="notice" data-draft-status></p></form>`;
}

export async function notebookAdminPage(env: Env, url: URL, rooms: PublicRoom[]) {
  const roomId = url.searchParams.get("room") ?? "";
  if (roomId && !rooms.some(room => room.id === roomId)) return { status: 404, body: '<p class="empty">없는 강의장입니다.</p>' };
  const result = await call(env, { action: "notebookInbox", ...(roomId ? { roomId } : {}) });
  if (result.status !== 200) return { status: result.status, body: '<p class="empty">질문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요</p>' };
  const threads = (result.data.threads as QuestionThread[]).filter(thread => rooms.some(room => room.id === thread.roomId));
  const status = ["pending", "answered"].includes(url.searchParams.get("status") ?? "") ? url.searchParams.get("status")! : "";
  const filtered = threads.filter(thread => !status || thread.status === status).sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || b.updated - a.updated);
  const selectedId = url.searchParams.get("thread");
  const selected = selectedId ? threads.find(thread => thread.id === selectedId) : filtered[0];
  const cards = filtered.map(thread => {
    const room = rooms.find(room => room.id === thread.roomId)!;
    const excerpt = thread.messages.find(message => message.role === "learner")?.body ?? "";
    return `<a class="question-card" data-question-card="${esc(thread.id)}" data-question-search="${esc([room.title, thread.ownerName, thread.lessonTitle, thread.sectionTitle, excerpt].join(" ").toLowerCase())}" href="${esc(link(url, { thread: thread.id }))}" ${selected?.id === thread.id ? 'aria-current="page"' : ""}><div class="topline"><strong>${esc(thread.ownerName || "학습자")}</strong><span data-list-status>${badge(thread.status)}</span></div><span class="small muted">${esc(room.title)}</span><h3>${esc(thread.sectionTitle)}</h3><p class="question-excerpt">${esc(excerpt.slice(0, 160))}</p><span class="small muted">${date(thread.updated)} · ${thread.messages.length}개 메시지</span></a>`;
  }).join("");
  const counts = { pending: threads.filter(thread => thread.status === "pending").length, answered: threads.filter(thread => thread.status === "answered").length };
  const email = notebookEmailStatus(env);
  return { status: 200, body: `<p class="muted">학습자가 섹션에서 보낸 질문을 확인하고 답변합니다. 개인 메모는 이곳에 표시되지 않습니다.</p><p class="notice" data-email-status="${email.state}">${esc(email.label)}</p><form class="question-filters" method="get" action="${root}"><label>강의방<select name="room"><option value="">전체 강의방</option>${rooms.map(room => `<option value="${esc(room.id)}" ${room.id === roomId ? "selected" : ""}>${esc(room.title)} · ${esc(room.slug)}</option>`).join("")}</select></label><label>답변 상태<select name="status"><option value="">전체 ${threads.length}건</option><option value="pending" ${status === "pending" ? "selected" : ""}>답변 대기 ${counts.pending}건</option><option value="answered" ${status === "answered" ? "selected" : ""}>답변 완료 ${counts.answered}건</option></select></label><button type="submit">적용</button><a href="${esc(link(url, {}))}" data-question-refresh>새로고침</a></form><div class="question-inbox"><aside class="question-list" aria-label="질문 목록"><label class="sr-only" for="question-search">질문 검색</label><input id="question-search" type="search" data-question-search-input placeholder="이름, 수업, 질문 내용 검색"><p class="small muted" data-question-count>${filtered.length}건의 질문</p><div class="question-cards">${cards}</div><p class="empty" data-question-empty ${filtered.length ? "hidden" : ""}>${threads.length ? "이 조건에 맞는 질문이 없습니다." : "아직 등록된 질문이 없습니다."}</p></aside><section class="question-detail" aria-label="선택한 질문">${selected ? detailHtml(selected, rooms, email.ready) : `<p class="empty">${selectedId ? "이 질문을 찾을 수 없습니다. 강의방 필터와 질문 목록을 확인해 주세요" : "질문을 선택하면 대화와 답변 작성란이 열립니다."}</p>`}</section></div>` };
}

export async function notebookAdminAction(env: Env, body: Record<string, unknown>, rooms: PublicRoom[]) {
  if (!["notebookReply", "notebookRetryNotification"].includes(String(body.action))) return Response.json({ error: "지원하지 않는 작업입니다" }, { status: 400, headers: privateHeaders });
  if (!rooms.some(room => room.id === body.roomId)) return Response.json({ error: "없는 강의장입니다" }, { status: 404, headers: privateHeaders });
  if (body.action === "notebookRetryNotification") {
    const inbox = await call(env, { action: "notebookInbox", roomId: body.roomId, threadId: body.id });
    if (inbox.status !== 200) return Response.json({ error: "질문을 불러오지 못했습니다" }, { status: 503, headers: privateHeaders });
    const thread = (inbox.data.threads as QuestionThread[]).find(thread => thread.id === body.id && thread.roomId === body.roomId);
    if (!thread?.notificationMessageId) return Response.json({ error: "질문 알림을 찾을 수 없습니다" }, { status: 404, headers: privateHeaders });
    if (["sending", "unknown"].includes(thread.notificationState ?? "") && body.confirmed !== true) return Response.json({ error: "이미 메일이 도착했을 수 있습니다. 받은편지함 확인 후 다시 보내기를 선택해 주세요" }, { status: 409, headers: privateHeaders });
    const result = await notifyQuestion(env, { roomId: thread.roomId, messageId: thread.notificationMessageId }, true);
    return Response.json(result, { headers: privateHeaders });
  }
  if (typeof body.body !== "string" || !body.body.trim() || body.body.length > 12000) return Response.json({ error: "답변은 1자 이상 12,000자 이하로 적어 주세요" }, { status: 400, headers: privateHeaders });
  const result = await call(env, { action: "notebookReply", roomId: body.roomId, id: body.id, messageId: body.messageId, body: body.body });
  if (result.status !== 200) return Response.json(result.data, { status: result.status, headers: privateHeaders });
  const thread = result.data.thread as QuestionThread;
  return Response.json({ html: messagesHtml(thread), statusHtml: badge(thread.status), messageCount: thread.messages.length }, { headers: privateHeaders });
}

export const notebookAdminStyle = `
.question-filters{display:flex;align-items:end;gap:1rem;flex-wrap:wrap;margin:1.5rem 0}.question-filters label{min-width:11rem}.question-filters label:first-child{min-width:16rem}.question-filters>a{margin:0 0 .65rem auto;font-size:.9rem}
.question-notification{margin-top:1rem}.students .question-notification button{font-size:.8rem;padding:.35rem .55rem}.question-notification .message{margin:0}
.students .question-reply{display:block}.question-reply label{width:100%}.students .question-reply textarea{min-height:10rem}
.question-inbox{display:grid;grid-template-columns:minmax(16rem,23rem) minmax(0,1fr);gap:2rem;align-items:start}.question-list{min-width:0}.question-cards{display:grid;gap:.7rem}.students .question-card{display:block;text-decoration:none;color:var(--eddm-ivory);border:1px solid var(--eddm-line);border-radius:.75rem;padding:1rem}.students .question-card[aria-current=page]{border-color:var(--eddm-accent);background:var(--eddm-accent-bg)}.students .question-card:hover{border-color:var(--eddm-accent-line)}.question-card[hidden]{display:none}.question-card h3{margin:.75rem 0 .4rem;font-size:1rem}.question-excerpt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:.9rem;margin:.4rem 0;color:var(--eddm-text-muted);overflow-wrap:anywhere}.question-card .topline{gap:.5rem}.question-card strong{font-size:.95rem}.question-detail{min-width:0;border:1px solid var(--eddm-line);border-radius:.85rem;padding:1.5rem;scroll-margin-top:1rem}.question-heading{padding-bottom:1.3rem;border-bottom:1px solid var(--eddm-line)}.students .question-heading h2{font-size:1.4rem;line-height:1.4;margin:1rem 0 .4rem}.question-heading p{margin:.4rem 0}.question-messages{display:grid;gap:1rem;padding:1.3rem 0}.question-message{padding:1.1rem;border-radius:.6rem;background:var(--eddm-raise)}.question-answer{border-left:3px solid var(--eddm-accent)}.question-message-body{margin-top:.7rem;font-size:.95rem;line-height:1.8;tab-size:4}.question-reply{border-top:1px solid var(--eddm-line);padding-top:1.2rem}.question-reply .actions{align-items:center}.question-reply .message{margin:0;font-size:.9rem}.question-reply [data-draft-status]{min-height:1.2rem;margin:.5rem 0 0}
@media(max-width:800px){.question-inbox{grid-template-columns:1fr;gap:1rem}.question-cards{max-height:19rem;overflow-y:auto;overscroll-behavior:contain;padding:.1rem}.question-detail{padding:1rem}.question-filters{gap:.7rem}.question-filters label,.question-filters label:first-child{min-width:0;flex:1 1 10rem}.question-filters>a{margin-left:0}.students .question-heading h2{font-size:1.2rem}}
`;

export const notebookAdminScript = `
(()=>{
const form=document.querySelector('[data-question-reply]');
let hasDraft=false;
if(form){
 const input=form.querySelector('textarea'),id=form.querySelector('[name=messageId]'),message=form.querySelector('[role=status]'),draftStatus=form.querySelector('[data-draft-status]');
 const key='eddm-instructor-draft:'+form.dataset.thread;let attemptedBody=null;
 try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved&&typeof saved.body==='string'&&typeof saved.id==='string'){input.value=saved.body;id.value=saved.id;attemptedBody=saved.attempted?saved.body:null;hasDraft=!!input.value;draftStatus.textContent=hasDraft?'이 탭에 임시 저장한 답변을 불러왔습니다.':'';}}catch{}
 const saveDraft=()=>{hasDraft=!!input.value;try{if(hasDraft)sessionStorage.setItem(key,JSON.stringify({body:input.value,id:id.value,attempted:attemptedBody!==null}));else sessionStorage.removeItem(key);draftStatus.textContent=hasDraft?'답변 초안은 이 탭에 임시 저장됩니다. 보내기 전에는 학습자에게 표시되지 않습니다.':'';}catch{draftStatus.textContent='이 브라우저에서는 임시 저장할 수 없습니다. 이동 전에 답변을 복사해 주세요';}};
 input.addEventListener('input',()=>{if(attemptedBody!==null&&input.value!==attemptedBody){id.value=crypto.randomUUID();attemptedBody=null;}saveDraft();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');if(button.disabled)return;
  button.disabled=true;input.readOnly=true;form.setAttribute('aria-busy','true');message.textContent='답변을 보내는 중입니다.';attemptedBody=input.value;saveDraft();
  try{const response=await fetch('${root}/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form))),signal:AbortSignal.timeout(20000)});let result;try{result=await response.json();}catch{throw Error('로그인이 만료되었거나 연결이 끊겼습니다. 답변은 이 탭에 남아 있습니다.');}if(!response.ok)throw Error(result.error||'답변을 보내지 못했습니다. 다시 시도해 주세요');
   document.querySelector('[data-question-messages]').innerHTML=result.html;document.querySelector('[data-question-status]').innerHTML=result.statusHtml;
   const card=document.querySelector('[data-question-card="'+CSS.escape(form.dataset.thread)+'"]');if(card)card.querySelector('[data-list-status]').innerHTML=result.statusHtml;
   input.value='';id.value=crypto.randomUUID();attemptedBody=null;saveDraft();message.textContent='답변을 보냈습니다. 학습자가 해당 섹션에서 확인할 수 있습니다.';
  }catch(error){message.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 같은 답변으로 다시 보내면 중복 등록되지 않습니다.':error.message;}
  finally{button.disabled=false;input.readOnly=false;form.removeAttribute('aria-busy');input.focus();}
 });
 addEventListener('beforeunload',event=>{if(hasDraft){try{if(sessionStorage.getItem(key))return;}catch{}event.preventDefault();event.returnValue='';}});
}
document.querySelector('[data-notification-retry]')?.addEventListener('click',async event=>{
 const button=event.currentTarget,message=document.querySelector('[data-mail-result]');if(button.disabled)return;
 const uncertain=['sending','unknown'].includes(button.dataset.state);if(uncertain&&!confirm('이미 메일이 도착했을 수 있습니다. 받은편지함을 확인한 뒤에도 다시 보내시겠습니까?'))return;
 button.disabled=true;message.textContent='알림 상태를 확인하는 중입니다.';
 try{const response=await fetch('${root}/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'notebookRetryNotification',roomId:button.dataset.room,id:button.dataset.thread,confirmed:uncertain}),signal:AbortSignal.timeout(25000)});const result=await response.json();if(!response.ok)throw Error(result.error||'알림을 보내지 못했습니다');
 const labels={sent:'메일 발송 완료',failed:'메일 발송 실패',unknown:'메일 발송 결과 확인 필요',pending:'메일 알림 대기',skipped:'이미 발송했거나 처리 중입니다. 새로고침해서 확인해 주세요',local:'로컬에서는 이메일을 보내지 않습니다.',unconfigured:'이메일 알림 설정 전입니다.'};message.textContent=result.error||labels[result.state]||'메일 상태를 새로고침해서 확인해 주세요';
 if(result.state==='sent'){document.querySelector('[data-mail-state]').textContent=labels.sent;button.remove();}else if(result.state==='skipped'){button.hidden=true;}else{button.dataset.state=result.state;}
 }catch(error){button.dataset.state='unknown';message.textContent=error.name==='TimeoutError'?'발송 결과를 확인하지 못했습니다. 받은편지함 확인 후 새로고침해 주세요':error.message;}
 finally{button.disabled=false;}
});
document.querySelector('[data-question-search-input]')?.addEventListener('input',event=>{const term=event.target.value.trim().toLowerCase();let count=0;document.querySelectorAll('[data-question-card]').forEach(card=>{card.hidden=!card.dataset.questionSearch.includes(term);if(!card.hidden)count++;});document.querySelector('[data-question-count]').textContent=count+'건의 질문';const empty=document.querySelector('[data-question-empty]');empty.hidden=!!count;if(!count)empty.textContent='검색한 내용과 일치하는 질문이 없습니다.';});
if(new URL(location.href).searchParams.has('thread')&&matchMedia('(max-width:800px)').matches)document.querySelector('.question-detail')?.scrollIntoView({block:'start'});
})();
`;
