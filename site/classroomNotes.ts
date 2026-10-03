import type { NotebookSection } from "./notebookSections";
import { createNotebookDrafts } from "./notebookDrafts";

export type NotebookConfig = { endpoint: string; roomId: string; lesson: string; sections: NotebookSection[]; personal: boolean; readOnly: boolean };

export const notebookStyle = `
.notebook-rail{position:sticky;top:2rem;max-height:calc(100dvh - 4rem);overflow:auto;width:100%;max-width:18rem;justify-self:end;font-size:.85rem;scrollbar-width:thin}
.notebook-rail .toc{position:static;width:100%;max-width:none;max-height:none;overflow:visible}
.notebook-rail .toc-h{gap:.65rem}.notebook-rail .toc-at{margin-left:auto}
.notebook-open{display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .1rem;border:0;background:transparent;color:var(--eddm-text-muted);font:inherit;font-size:.78rem;letter-spacing:0;cursor:pointer}
.notebook-open:hover,.notebook-open[aria-expanded=true]{background:transparent;color:var(--eddm-accent)}
.notebook-open svg{width:14px;height:14px}
.note-anchor{scroll-margin-top:2rem}
.notebook-panel[hidden],.notebook-panel [hidden]{display:none!important}
.notebook-panel{position:fixed;z-index:90;display:flex;flex-direction:column;box-sizing:border-box;min-width:min(20rem,calc(100vw - 1.5rem));min-height:min(18rem,calc(100dvh - 1.5rem));resize:both;overflow:hidden;border:1px solid var(--eddm-line-strong);border-radius:.75rem;background:var(--eddm-canvas);box-shadow:0 .8rem 3rem var(--eddm-line-strong);color:var(--eddm-text);font-size:.875rem;line-height:1.6}
.notebook-panel[data-minimized=true]{min-height:0;resize:none}
.notebook-titlebar{display:flex;align-items:center;gap:.5rem;min-height:44px;box-sizing:border-box;padding:.35rem .7rem;border-bottom:1px solid var(--eddm-line);cursor:move;touch-action:none;user-select:none}
.notebook-titlebar b{font-size:.9rem;font-weight:600;margin-right:auto}
.notebook-panel button{font-family:inherit;cursor:pointer}
.notebook-control{display:grid;place-items:center;width:1.75rem;height:1.75rem;border:0;border-radius:.3rem;background:transparent;color:var(--eddm-text-muted);font-size:1.1rem;line-height:1}
.notebook-control:hover{background:var(--eddm-raise);color:var(--eddm-text)}
.notebook-work{display:flex;flex-direction:column;flex:1;min-height:0;padding:.75rem;overflow:auto}
.notebook-panel[data-minimized=true] .notebook-work{display:none}
.notebook-panel select,.notebook-panel input,.notebook-panel textarea{box-sizing:border-box;width:100%;font:inherit;color:var(--eddm-text);background:var(--eddm-canvas);border:1px solid var(--eddm-line-strong);border-radius:.4rem;padding:.6rem;min-width:0}
.notebook-panel select{flex-shrink:0;font-size:.82rem;margin:0 0 .5rem}
.notebook-panel textarea{flex:1;min-height:8rem;resize:none;line-height:1.65;tab-size:4;white-space:pre-wrap;overflow-wrap:anywhere}
.notebook-panel :is(textarea,input,select,button):focus-visible,.notebook-open:focus-visible,.notebook-titlebar:focus-visible{outline:2px solid var(--eddm-accent);outline-offset:-2px}
.notebook-tools{display:flex;flex-shrink:0;gap:.6rem;margin:0 0 .4rem}.notebook-tools button{background:transparent;border:0;border-radius:.25rem;color:var(--eddm-text-muted);font-size:.76rem;padding:.2rem .1rem}.notebook-tools button:hover{color:var(--eddm-accent)}
.notebook-status{flex-shrink:0;font-size:.76rem;color:var(--eddm-text-muted);margin:.45rem 0;overflow-wrap:anywhere}.notebook-status:empty{display:none}.notebook-status[data-error=true]{color:var(--eddm-accent)}
.notebook-link{border:0;background:none;color:var(--eddm-text-muted);font-size:.76rem;padding:.3rem}.notebook-link:hover{color:var(--eddm-accent)}
.notebook-primary{background:var(--eddm-accent);color:var(--eddm-accent-contrast);border:0;border-radius:.4rem;padding:.6rem .85rem;font-family:inherit;font-size:.82rem}
.notebook-panel button:disabled{opacity:.55;cursor:default}
.notebook-panel p{margin:.4rem 0 .75rem}.notebook-hint{font-size:.77rem;color:var(--eddm-text-muted)}
.notebook-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin:.6rem 0}
.notebook-card{flex-shrink:0;border-top:1px solid var(--eddm-line);padding-top:.7rem;margin-top:.7rem}.notebook-card summary{cursor:pointer;overflow-wrap:anywhere}
.notebook-message{border-top:1px solid var(--eddm-line);padding-top:.7rem;margin-top:.7rem;overflow-wrap:anywhere}
.notebook-message p,.notebook-preview p{white-space:pre-wrap}.notebook-message pre,.notebook-preview pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8rem;padding:.7rem;border-radius:.4rem;background:var(--eddm-raise)}
.notebook-preview{flex:1;min-height:8rem;overflow:auto;padding:.6rem;border:1px solid var(--eddm-line);border-radius:.4rem}
.notebook-ask-link{display:flex;flex-shrink:0;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.7rem}.notebook-ask-link span{font-size:.76rem;color:var(--eddm-text-muted)}
.notebook-ask-actions{display:flex;flex-shrink:0;justify-content:space-between;align-items:center;gap:.5rem;margin-top:.6rem}.notebook-ask-actions .notebook-primary{margin-left:auto}
.notebook-question{flex:1 0 10rem!important}.notebook-badge{font-size:.72rem;color:var(--eddm-accent)}.notebook-message b{font-size:.78rem}.notebook-message time{font-size:.7rem;color:var(--eddm-text-muted);display:block}
.notebook-auth label{display:block;margin-bottom:.5rem}.notebook-auth input{margin-top:.3rem}.notebook-auth .notebook-primary{width:100%}
.notebook-empty{color:var(--eddm-text-muted)}
@media(max-width:1200px){.notebook-rail{position:static;order:-1;max-height:none;max-width:48rem;justify-self:center;overflow:visible}.notebook-rail .toc{box-sizing:border-box}}
@media(max-width:520px){.notebook-panel textarea,.notebook-panel input,.notebook-panel select{font-size:16px}.notebook-control{width:2rem;height:2rem}}
`;

export function notebookMarkup(toc: string) {
  const button = `<button type="button" class="notebook-open" data-notebook-open aria-controls="notebook-panel" aria-expanded="false"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M11 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9M8 12l1-4 6-6 3 3-6 6-4 1Z"/></svg>메모</button>`;
  return `<aside class="notebook-rail" aria-label="목차">${toc.replace("</summary>", button + "</summary>")}</aside><section id="notebook-panel" class="notebook-panel" role="dialog" aria-modal="false" aria-label="메모" tabindex="-1" hidden></section>`;
}

export function notebookHeadings(html: string, sections: NotebookSection[]) {
  for (const section of sections) html = html.replace(new RegExp(`<h2 id="${section.anchor}">([\\s\\S]*?)</h2>`),
    (_match, content: string) => `<span id="note-${section.key}" class="note-anchor"></span><h2 id="${section.anchor}">${content}</h2>`);
  return html;
}

export function notebookScript(config: NotebookConfig) {
  // Wrangler preserves nested function names with this helper when serializing the client.
  return `;(()=>{const __name=(fn)=>fn;(${notebookClient.toString()})(${JSON.stringify(config).replace(/</g, "\\u003c")},${createNotebookDrafts.toString()});})();`;
}

function notebookClient(config: NotebookConfig, createCache: typeof createNotebookDrafts) {
  type Note = { sectionKey: string; sectionTitle: string; body: string; version: number; updated?: number };
  type Draft = Note & { saved: string; saving?: boolean; error?: string; conflict?: Note; auth?: boolean };
  type Message = { id: string; role: string; body: string; created: number };
  type Thread = { id: string; sectionKey: string; sectionTitle: string; status: string; messages: Message[] };
  type QuestionDraft = { body: string; id: string; sending?: boolean; sent?: boolean; error?: string; attemptedBody?: string };
  type Reply = { error?: string; identityChanged?: boolean; note: Note; identity: { id: string; name: string } | null; thread: Thread; threads: Thread[]; notes: Note[] };
  const panel = document.querySelector<HTMLElement>("#notebook-panel")!;
  const rail = document.querySelector<HTMLElement>(".notebook-rail")!;
  if (!panel || !rail) return;
  const drafts = new Map<string, Draft>();
  const questions = new Map<string, QuestionDraft>();
  let cache: ReturnType<typeof createCache> | null = null, cacheOk = true;
  let recovered: Pick<Note, "sectionKey" | "sectionTitle" | "body">[] = [];
  let selected = config.sections[0]?.key ?? "", opened = false, identity: { id: string; name: string } | null = null;
  let threads: Thread[] = [], loaded = false, loading: Promise<void> | null = null, loadError = "", register = false;
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let opener: HTMLElement | null = null;
  const escape = (text: string) => String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const date = (at: number) => new Date(at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const prose = (body: string) => body.split(/```[^\n]*\n|```/).map((part, i) => i % 2 ? `<pre><code>${escape(part)}</code></pre>` : `<p>${escape(part)}</p>`).join("");
  const storageKey = () => `notebook-draft:${config.roomId}:${config.endpoint}:${identity?.id}:${config.lesson}`;
  const persist = () => {
    if (!identity || !cache) return;
    cacheOk = cache.write({ notes: [...drafts.values()].filter(d => d.body !== d.saved).map(d => ({ sectionKey: d.sectionKey, sectionTitle: d.sectionTitle, body: d.body, version: d.version })), questions: [...questions].filter(([, d]) => d.body.trim() && !d.sent), recovered });
  };
  const dirty = () => [...drafts.values()].some(d => d.body !== d.saved || d.saving) || [...questions.values()].some(d => d.sending || !cacheOk && d.body.trim());
  const api = async (action: string, body: Record<string, unknown> = {}) => {
    const response = await fetch(config.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, lesson: config.lesson, expectedOwnerId: identity?.id, ...body }), signal: AbortSignal.timeout(15000) });
    let data: Reply; try { data = await response.json() as Reply; } catch { throw new Error("로그인 또는 연결 상태를 확인한 뒤 다시 시도해 주세요. 작성한 내용은 유지됩니다."); }
    if (!response.ok) { const error = new Error(data.error || "저장하지 못했습니다. 다시 시도해 주세요") as Error & { data: typeof data; status: number }; error.data = data; error.status = response.status; throw error; }
    return data;
  };
  const currentDraft = (key: string) => {
    if (!drafts.has(key)) drafts.set(key, { sectionKey: key, sectionTitle: config.sections.find(s => s.key === key)?.title ?? "이전 섹션", body: "", saved: "", version: 0 });
    return drafts.get(key)!;
  };
  const qDraft = (key: string) => { if (!questions.has(key)) questions.set(key, { body: "", id: crypto.randomUUID() }); return questions.get(key)!; };
  const sentAlready = (key: string, body: string) => threads.some(t => t.sectionKey === key && t.messages[0]?.body === body.trim());
  const updateSend = () => {
    const question = qDraft(`new:${selected}`), body = question.body, button = panel.querySelector<HTMLButtonElement>("[data-question-send]");
    if (!button) return;
    const sent = sentAlready(selected, body);
    button.disabled = !body.trim() || Boolean(question.sending) || sent || !config.sections.some(s => s.key === selected);
    button.textContent = question.sending ? "보내는 중…" : sent ? "보냄" : "보내기";
  };
  const updateButtons = () => rail.querySelector("[data-notebook-open]")?.setAttribute("aria-expanded", String(opened));
  const updateStatus = (key: string) => {
    updateButtons();
    if (selected !== key || !opened) return;
    const draft = currentDraft(key), status = panel.querySelector<HTMLElement>("[data-note-status]");
    if (status) { status.textContent = draft.error ? `${draft.error} ${cacheOk ? "이 기기에 초안을 보관했습니다." : "임시 보관도 할 수 없습니다. 내용을 복사해 보관해 주세요"}` : !cacheOk && draft.body !== draft.saved ? "임시 보관 불가 · 서버 저장 확인 전에는 창을 닫지 마세요" : ""; status.dataset.error = String(Boolean(draft.error) || (!cacheOk && draft.body !== draft.saved)); }
    const retry = panel.querySelector<HTMLElement>("[data-note-retry]"); if (retry) { retry.hidden = !draft.error; retry.textContent = draft.auth ? "로그인 다시 확인" : "저장 다시 시도"; }
    const conflict = panel.querySelector<HTMLElement>("[data-note-conflict]"); if (conflict) { conflict.hidden = !draft.conflict; const preview = conflict.querySelector<HTMLElement>("[data-remote-note]"); if (preview && draft.conflict) preview.textContent = draft.conflict.body; }
  };
  const save = async (key: string): Promise<boolean> => {
    const draft = currentDraft(key);
    if (draft.saving) return false;
    if (draft.body === draft.saved) return true;
    if (draft.conflict) return false;
    draft.saving = true; draft.error = ""; updateStatus(key); const sent = draft.body;
    try {
      const result = await api("save", { sectionKey: key, body: sent, version: draft.version });
      draft.version = result.note.version; draft.saved = sent; draft.error = "";
    } catch (error) {
      const problem = error as Error & { data?: { note?: Note; identityChanged?: boolean }; status?: number };
      draft.error = problem.message; draft.auth = problem.status === 401 || problem.data?.identityChanged; if (problem.data?.note) draft.conflict = problem.data.note;
    } finally { draft.saving = false; persist(); updateStatus(key); }
    if (!draft.error && draft.body !== draft.saved) return save(key);
    return !draft.error;
  };
  const load = async () => {
    if (loading) return loading;
    loading = (async () => {
      try {
        const data = await api("read");
        if (identity?.id !== data.identity?.id) { persist(); drafts.clear(); questions.clear(); recovered = []; cache = null; loaded = false; }
        identity = data.identity; threads = data.threads ?? []; loadError = "";
        for (const note of data.notes ?? []) if (!drafts.has(note.sectionKey) || drafts.get(note.sectionKey)?.body === drafts.get(note.sectionKey)?.saved) drafts.set(note.sectionKey, { ...note, saved: note.body });
        if (!loaded && identity) {
          cache ??= createCache(JSON.stringify([config.roomId, identity.id, config.lesson]), storageKey());
          const keep = (note: Pick<Note, "sectionKey" | "sectionTitle" | "body">) => { if (!recovered.some(n => n.sectionKey === note.sectionKey && n.body === note.body)) recovered.push(note); };
          for (const value of cache.read()) {
            if (!value || typeof value !== "object") continue;
            const cached = value as { notes?: Note[]; questions?: [string, QuestionDraft][]; recovered?: Note[] };
            for (const note of Array.isArray(cached.notes) ? cached.notes : []) {
              if (!note || typeof note.sectionKey !== "string" || !/^[a-f0-9]{24}(?:_\d+)?$/.test(note.sectionKey) || typeof note.body !== "string" || note.body.length > 12000 || !Number.isSafeInteger(note.version)) continue;
              const draft = currentDraft(note.sectionKey);
              if (note.body === draft.saved || note.body === draft.body) continue;
              if (draft.body !== draft.saved) { keep({ sectionKey: note.sectionKey, sectionTitle: draft.sectionTitle, body: note.body }); continue; }
              if (note.version !== draft.version) { draft.conflict = { ...draft }; draft.version = note.version; draft.error = "다른 창에서 저장한 내용이 있습니다. 두 내용을 확인해 주세요"; }
              draft.body = note.body;
            }
            for (const entry of Array.isArray(cached.questions) ? cached.questions : []) {
              if (!Array.isArray(entry) || entry.length !== 2) continue;
              const [key, question] = entry;
              if (typeof key !== "string") continue;
              const sectionKey = key.startsWith("new:") ? key.slice(4) : threads.find(t => t.id === key)?.sectionKey;
              if (!sectionKey || !question || typeof question.body !== "string" || question.body.length > 12000 || typeof question.id !== "string" || !/^[0-9a-f-]{36}$/.test(question.id) || question.sent) continue;
              if (key.startsWith("new:") && threads.some(t => t.sectionKey === sectionKey && t.messages[0]?.body === question.body.trim())) continue;
              if (questions.has(key) && questions.get(key)!.body !== question.body) keep({ sectionKey, sectionTitle: currentDraft(sectionKey).sectionTitle, body: question.body });
              else questions.set(key, { ...question, sending: false });
            }
            for (const note of Array.isArray(cached.recovered) ? cached.recovered : []) if (note && typeof note.sectionKey === "string" && typeof note.body === "string" && note.body.length <= 12000) keep({ ...note, sectionTitle: String(note.sectionTitle || "이전 섹션") });
          }
          persist(); if (cacheOk) cache.consume();
        }
        loaded = true;
      } catch (error) { loadError = (error as Error).message; }
      finally { loading = null; updateButtons(); }
    })();
    return loading;
  };
  let minimized = false, asking = false;
  let bounds = { x: innerWidth - 464, y: 110, width: 440, height: 600 };
  try { const saved = JSON.parse(sessionStorage.getItem("notebook-window") || "null"); if (saved && [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite)) bounds = saved; } catch {}
  const keepBounds = () => { try { sessionStorage.setItem("notebook-window", JSON.stringify(bounds)); } catch {} };
  const layout = () => {
    bounds.width = Math.min(Math.max(320, bounds.width), innerWidth - 24);
    bounds.height = Math.min(Math.max(288, bounds.height), innerHeight - 24);
    bounds.x = Math.max(12, Math.min(bounds.x, innerWidth - bounds.width - 12));
    bounds.y = Math.max(12, Math.min(bounds.y, innerHeight - (minimized ? 44 : bounds.height) - 12));
    Object.assign(panel.style, { left: `${bounds.x}px`, top: `${bounds.y}px`, width: `${bounds.width}px`, height: `${minimized ? 44 : bounds.height}px`, maxWidth: `${innerWidth - bounds.x - 12}px`, maxHeight: `${innerHeight - bounds.y - 12}px` });
    panel.dataset.minimized = String(minimized);
    keepBounds();
  };
  const readingSection = () => {
    let key = config.sections[0]?.key ?? "";
    for (const section of config.sections) if ((document.getElementById(section.anchor)?.getBoundingClientRect().top ?? Infinity) <= 180) key = section.key;
    return key;
  };
  const close = () => { opened = false; panel.hidden = true; updateButtons(); opener?.focus({ preventScroll: true }); };
  const minimize = () => { minimized = !minimized; layout(); const button = panel.querySelector("[data-note-minimize]"); button?.setAttribute("aria-label", minimized ? "메모 펼치기" : "메모 최소화"); if (button) button.textContent = minimized ? "□" : "−"; };
  const render = () => {
    panel.hidden = !opened;
    updateButtons();
    if (!opened) return;
    const section = config.sections.find(s => s.key === selected), draft = currentDraft(selected);
    const sections = [...config.sections];
    for (const note of [...drafts.values(), ...threads]) if (!("body" in note && !note.body) && !sections.some(s => s.key === note.sectionKey)) sections.push({ key: note.sectionKey, title: `이전 교안 · ${note.sectionTitle}`, anchor: "" });
    panel.innerHTML = `<div class="notebook-titlebar" data-note-drag tabindex="0" aria-label="메모창 이동"><b>메모</b><button type="button" class="notebook-control" data-note-minimize aria-label="${minimized ? "메모 펼치기" : "메모 최소화"}">${minimized ? "□" : "−"}</button><button type="button" class="notebook-control" data-note-close aria-label="메모 닫기">×</button></div><div class="notebook-work"><label class="sr-only" for="note-section">섹션</label><select id="note-section" data-note-section>${sections.map(s => `<option value="${s.key}" ${s.key === selected ? "selected" : ""}>${escape(s.title)}</option>`).join("")}</select></div>`;
    const work = panel.querySelector<HTMLElement>(".notebook-work")!;
    layout();
    if (config.readOnly) { work.innerHTML += '<p class="notebook-empty">강사 미리보기입니다. 학습자의 개인 메모는 표시하지 않습니다.</p>'; bind(); return; }
    if (loadError) { work.innerHTML += `<p role="alert">${escape(loadError)}</p><button type="button" class="notebook-primary" data-note-reload>다시 연결</button>`; bind(); return; }
    if (!loaded) { work.innerHTML += '<p class="notebook-empty" role="status">내 기록을 불러오는 중…</p>'; bind(); return; }
    if (!identity) {
      work.innerHTML += `<form class="notebook-auth"><label>계정<input name="name" required maxlength="60" autocomplete="username"></label><label>비밀번호<input name="password" type="password" required minlength="8" maxlength="128" autocomplete="${register ? "new-password" : "current-password"}" placeholder="8자 이상"></label><button class="notebook-primary">${register ? "계정 만들기" : "로그인"}</button><p class="notebook-status" role="status"></p></form><button type="button" class="notebook-link" data-note-register>${register ? "로그인" : "계정 만들기"}</button>`;
      bind(); return;
    }
    if (!asking) {
      work.innerHTML += `<div class="notebook-tools"><button type="button" data-insert="list">목록</button><button type="button" data-insert="code">코드</button><button type="button" data-note-preview>미리보기</button></div><label class="sr-only" for="note-body">메모 내용</label><textarea id="note-body" data-note-body maxlength="12000" ${!section ? "readonly" : ""}>${escape(draft.body)}</textarea><div class="notebook-preview" data-note-preview-body hidden></div><p class="notebook-status" data-note-status role="status" aria-live="polite"></p><button type="button" class="notebook-link" data-note-retry hidden>저장 다시 시도</button><div class="notebook-card" data-note-conflict hidden><p>다른 창에서 저장한 내용이 있습니다. 작성 중인 내용은 위에 유지됩니다.</p><details><summary>현재 저장된 내용 보기</summary><pre data-remote-note></pre></details><button type="button" class="notebook-link" data-note-overwrite>위의 내 내용으로 저장</button></div>${!section ? '<p class="notebook-hint">제목이 변경된 이전 섹션의 기록입니다. 내용을 복사해 현재 섹션에 이어 쓸 수 있습니다.</p>' : ""}`;
    }
    if (asking) {
      const q = qDraft(`new:${selected}`), matches = threads.filter(t => t.sectionKey === selected);
      work.innerHTML += `<div class="notebook-tools"><button type="button" data-question-back>← 메모</button></div><label class="sr-only" for="question-body">질문 내용</label><textarea id="question-body" class="notebook-question" data-question-body maxlength="12000" placeholder="궁금한건 그때그때 질문하세요!" ${!section ? "readonly" : ""}>${escape(q.body)}</textarea><div class="notebook-ask-actions"><button type="button" class="notebook-primary" data-question-send>보내기</button></div><p class="notebook-status" data-question-status role="status" aria-live="polite"></p>${matches.length ? `<div class="notebook-row"><b>답변</b><button type="button" class="notebook-link" data-question-refresh>새로고침</button></div>${matches.map(thread => `<details class="notebook-card" data-thread="${thread.id}" ${new URL(location.href).searchParams.get("question") === thread.id ? "open" : ""}><summary><span class="notebook-badge">${thread.status === "answered" ? "답변 도착" : "답변 대기"}</span><br>${escape(thread.messages[0]?.body.slice(0, 90) || "질문")}</summary>${thread.messages.map(message => `<div class="notebook-message"><b>${message.role === "instructor" ? "강사 답변" : "내 질문"}</b><time>${date(message.created)}</time>${prose(message.body)}</div>`).join("")}<label class="notebook-hint">이어서 질문<textarea class="notebook-question" data-followup="${thread.id}" maxlength="12000" >${escape(qDraft(thread.id).body)}</textarea></label><button type="button" class="notebook-primary" data-followup-send="${thread.id}">보내기</button><p class="notebook-status" role="status"></p></details>`).join("")}` : ""}`;
    }
    else if (section) work.innerHTML += '<div class="notebook-ask-link"><span>궁금한건 그때그때 질문하세요!</span><button type="button" class="notebook-primary" data-question-open>질문하기</button></div>';
    if (!config.personal) work.innerHTML += '<div class="notebook-row"><button type="button" class="notebook-link" data-note-logout>로그아웃</button></div>';
    if (!asking && recovered.length) work.innerHTML += `<details class="notebook-card"><summary>다른 창에서 보관한 초안 ${recovered.length}개</summary><p class="notebook-hint">서로 다른 내용은 덮어쓰지 않고 보관했습니다.</p>${recovered.map((note, index) => `<div class="notebook-message"><b>${escape(note.sectionTitle)}</b>${prose(note.body)}${config.sections.some(s => s.key === note.sectionKey) ? `<button type="button" class="notebook-link" data-recover="${index}">해당 섹션 메모에 이어 붙이기</button>` : '<p class="notebook-hint">이전 섹션의 초안입니다. 필요한 내용을 복사해 보관하세요</p>'}<button type="button" class="notebook-link" data-recover-remove="${index}">이 초안 삭제</button></div>`).join("")}</details>`;
    bind(); updateStatus(selected); updateSend();
  };
  const open = async (key: string, focus = false) => {
    selected = key; opened = true; minimized = false; render(); if (!loaded) { await load(); render(); }
    if (focus) panel.querySelector<HTMLElement>("textarea,input")?.focus({ preventScroll: true });
  };
  const send = async (threadId: string | null, button: HTMLButtonElement) => {
    const key = threadId || `new:${selected}`, question = qDraft(key), sectionKey = selected;
    if (question.sending) return;
    if (!threadId && sentAlready(sectionKey, question.body)) return;
    if (!question.body.trim()) { panel.querySelector<HTMLElement>(threadId ? `[data-followup="${threadId}"]` : "[data-question-body]")?.focus(); return; }
    if (question.attemptedBody !== undefined && question.attemptedBody !== question.body) question.id = crypto.randomUUID();
    question.attemptedBody = question.body; persist();
    const status = threadId ? button.nextElementSibling! : panel.querySelector("[data-question-status]")!;
    const area = panel.querySelector<HTMLTextAreaElement>(threadId ? `[data-followup="${threadId}"]` : "[data-question-body]")!;
    const sentBody = question.body, sentId = question.id, sentOwner = identity?.id;
    question.sending = true; question.error = ""; button.disabled = true; area.readOnly = true; status.textContent = "질문을 보내는 중…";
    try {
      const result = await api(threadId ? "followup" : "ask", threadId ? { id: threadId, messageId: question.id, body: question.body } : { id: question.id, sectionKey, body: question.body });
      if (identity?.id !== sentOwner) return;
      if (question.body === sentBody && question.id === sentId) questions.delete(key);
      else question.id = crypto.randomUUID();
      persist(); threads = [result.thread, ...threads.filter(t => t.id !== result.thread.id)];
      if (selected !== sectionKey || !opened || !asking) { updateButtons(); return; }
      render();
      panel.querySelector<HTMLDetailsElement>(`[data-thread="${result.thread.id}"]`)?.setAttribute("open", "");
      const done = panel.querySelector("[data-question-status]"); if (done) done.textContent = "보냈습니다";
    } catch (error) { question.sending = false; question.error = (error as Error).message; status.textContent = question.error; button.disabled = false; area.readOnly = false; if (selected === sectionKey && opened && asking && questions.get(key) === question) { render(); if (threadId) panel.querySelector<HTMLDetailsElement>(`[data-thread="${threadId}"]`)?.setAttribute("open", ""); } }
    finally { question.sending = false; }
  };
  function bind() {
    if (opened) {
      const current = qDraft(`new:${selected}`), input = panel.querySelector<HTMLTextAreaElement>("[data-question-body]"), button = panel.querySelector<HTMLButtonElement>("[data-question-send]"), status = panel.querySelector("[data-question-status]");
      if (input) input.readOnly = Boolean(current.sending) || !config.sections.some(s => s.key === selected); if (button) button.disabled = Boolean(current.sending); if (status) status.textContent = current.sending ? "질문을 보내는 중…" : current.error || "";
      panel.querySelectorAll<HTMLTextAreaElement>("[data-followup]").forEach(input => { const draft = qDraft(input.dataset.followup!); input.readOnly = Boolean(draft.sending); const button = panel.querySelector<HTMLButtonElement>(`[data-followup-send="${input.dataset.followup}"]`); if (button) { button.disabled = Boolean(draft.sending); button.nextElementSibling!.textContent = draft.sending ? "질문을 보내는 중…" : draft.error || ""; } });
    }
    panel.querySelector("[data-question-open]")?.addEventListener("click", () => { asking = true; render(); panel.querySelector<HTMLElement>("[data-question-body]")?.focus({ preventScroll: true }); });
    panel.querySelector("[data-question-back]")?.addEventListener("click", () => { asking = false; render(); followSection(); });
    panel.querySelector("[data-note-close]")?.addEventListener("click", close);
    panel.querySelector("[data-note-minimize]")?.addEventListener("click", minimize);
    panel.querySelector("[data-note-section]")?.addEventListener("change", event => { selected = (event.currentTarget as HTMLSelectElement).value; pendingSection = ""; render(); });
    panel.querySelector("[data-note-register]")?.addEventListener("click", () => { register = !register; render(); });
    panel.querySelector("[data-note-reload]")?.addEventListener("click", async () => { await load(); render(); });
    panel.querySelector<HTMLFormElement>(".notebook-auth")?.addEventListener("submit", async event => {
      event.preventDefault(); const form = event.currentTarget as HTMLFormElement, button = form.querySelector("button")!, status = form.querySelector(".notebook-status")!; button.disabled = true;
      try { const data = new FormData(form); await api(register ? "register" : "login", { name: data.get("name"), password: data.get("password") }); loaded = false; await load(); render(); }
      catch (error) { status.textContent = (error as Error).message; button.disabled = false; }
    });
    const editorKey = selected;
    const area = panel.querySelector<HTMLTextAreaElement>("[data-note-body]");
    area?.addEventListener("input", () => { const key = editorKey, draft = currentDraft(key); draft.body = area.value; draft.error = draft.conflict ? draft.error : ""; persist(); updateStatus(key); clearTimeout(saveTimers.get(key)); saveTimers.set(key, setTimeout(() => { void save(key); }, 700)); });
    area?.addEventListener("blur", () => { if (!area.readOnly) void save(editorKey); });
    panel.querySelector("[data-note-retry]")?.addEventListener("click", async () => { if (currentDraft(selected).auth) { await load(); render(); } else void save(selected); });
    panel.querySelector("[data-note-overwrite]")?.addEventListener("click", () => { const draft = currentDraft(selected); if (!draft.conflict) return; draft.version = draft.conflict.version; draft.conflict = undefined; void save(selected); });
    panel.querySelectorAll<HTMLElement>("[data-insert]").forEach(button => button.addEventListener("click", () => {
      if (!area || area.readOnly) return; const start = area.selectionStart, end = area.selectionEnd, selectedText = area.value.slice(start, end);
      const text = button.dataset.insert === "code" ? `\n\`\`\`\n${selectedText || "코드 또는 오류 메시지"}\n\`\`\`\n` : `\n- ${selectedText}`;
      area.setRangeText(text, start, end, "end"); area.dispatchEvent(new Event("input", { bubbles: true })); area.focus();
    }));
    panel.querySelector("[data-note-preview]")?.addEventListener("click", event => {
      const preview = panel.querySelector<HTMLElement>("[data-note-preview-body]")!; preview.hidden = !preview.hidden; area!.hidden = !preview.hidden; preview.innerHTML = prose(area!.value); (event.currentTarget as HTMLElement).textContent = preview.hidden ? "미리보기" : "편집으로";
    });
    const questionArea = panel.querySelector<HTMLTextAreaElement>("[data-question-body]");
    questionArea?.addEventListener("input", () => { const draft = qDraft(`new:${editorKey}`); draft.body = questionArea.value; draft.error = ""; persist(); updateSend(); const status = panel.querySelector("[data-question-status]"); if (status) status.textContent = cacheOk ? "" : "임시 보관 불가 · 내용을 복사해 보관해 주세요"; });
    panel.querySelectorAll<HTMLElement>("[data-recover]").forEach(button => button.addEventListener("click", () => {
      const index = Number(button.dataset.recover), note = recovered[index]; if (!note) return;
      const draft = currentDraft(note.sectionKey), merged = [draft.body, note.body].filter(Boolean).join("\n\n");
      if (merged.length > 12000) { alert("내용이 길어 한 번에 합칠 수 없습니다. 필요한 부분을 복사해 주세요"); return; }
      draft.body = merged; recovered.splice(index, 1); persist(); void open(note.sectionKey, true); void save(note.sectionKey);
    }));
    panel.querySelectorAll<HTMLElement>("[data-recover-remove]").forEach(button => button.addEventListener("click", () => { if (!confirm("이 임시 초안을 삭제할까요? 서버에 저장한 메모는 유지됩니다.")) return; recovered.splice(Number(button.dataset.recoverRemove), 1); persist(); render(); }));
    panel.querySelector<HTMLButtonElement>("[data-question-send]")?.addEventListener("click", event => { void send(null, event.currentTarget as HTMLButtonElement); });
    panel.querySelector("[data-question-refresh]")?.addEventListener("click", async () => { await load(); render(); });
    panel.querySelectorAll<HTMLTextAreaElement>("[data-followup]").forEach(area => area.addEventListener("input", () => { qDraft(area.dataset.followup!).body = area.value; persist(); }));
    panel.querySelectorAll<HTMLButtonElement>("[data-followup-send]").forEach(button => button.addEventListener("click", () => { void send(button.dataset.followupSend!, button); }));
    panel.querySelector<HTMLButtonElement>("[data-note-logout]")?.addEventListener("click", async event => {
      const button = event.currentTarget as HTMLButtonElement;
      if ([...drafts.values()].some(d => d.saving) || [...questions.values()].some(d => d.sending)) { button.textContent = "저장·전송이 끝나면 다시 눌러 주세요"; return; }
      if ((dirty() || recovered.length) && !confirm("저장되지 않은 메모를 보관하고 로그아웃할까요?")) return;
      try { persist(); await api("logout"); cache = null; recovered = []; drafts.clear(); questions.clear(); threads = []; identity = null; loaded = false; await load(); render(); } catch (error) { button.textContent = (error as Error).message; }
    });
  }
  rail.querySelector<HTMLElement>("[data-notebook-open]")?.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation(); opener = event.currentTarget as HTMLElement; asking = false;
    void open(readingSection()).then(() => panel.focus({ preventScroll: true }));
  });
  panel.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  let viewedSection = readingSection(), pendingSection = "", scrollFrame = 0;
  const followSection = () => {
    const key = readingSection();
    if (key !== viewedSection) { viewedSection = key; pendingSection = key; }
    if (!pendingSection || !opened || asking || panel.contains(document.activeElement) && document.activeElement?.matches("textarea,input,select,[data-insert],[data-note-preview]")) return;
    const next = pendingSection; pendingSection = "";
    if (selected !== next) { selected = next; render(); }
  };
  addEventListener("scroll", () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; followSection(); }); }, { passive: true });
  panel.addEventListener("focusout", () => { setTimeout(followSection, 0); });
  let drag: { id: number; x: number; y: number; left: number; top: number } | null = null;
  panel.addEventListener("pointerdown", event => {
    const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-note-drag]");
    if (!handle || (event.target as HTMLElement).closest("button") || event.button !== 0) return;
    event.preventDefault(); drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.x, top: bounds.y };
    handle.setPointerCapture(event.pointerId);
  });
  panel.addEventListener("pointermove", event => { if (!drag || drag.id !== event.pointerId) return; bounds.x = drag.left + event.clientX - drag.x; bounds.y = drag.top + event.clientY - drag.y; layout(); });
  panel.addEventListener("pointerup", () => { drag = null; });
  panel.addEventListener("pointercancel", () => { drag = null; });
  panel.addEventListener("keydown", event => {
    if (!(event.target as HTMLElement).matches("[data-note-drag]") || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); bounds.x += event.key === "ArrowRight" ? 16 : event.key === "ArrowLeft" ? -16 : 0; bounds.y += event.key === "ArrowDown" ? 16 : event.key === "ArrowUp" ? -16 : 0; layout();
  });
  new ResizeObserver(() => { if (!opened || minimized) return; bounds.width = panel.offsetWidth; bounds.height = panel.offsetHeight; keepBounds(); }).observe(panel);
  addEventListener("resize", layout);
  addEventListener("beforeunload", event => { if (dirty()) { persist(); event.preventDefault(); event.returnValue = ""; } });
  addEventListener("pagehide", persist);
  addEventListener("online", () => { for (const draft of drafts.values()) if (draft.body !== draft.saved && !draft.conflict) void save(draft.sectionKey); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { persist(); for (const draft of drafts.values()) if (draft.body !== draft.saved && !draft.conflict) void save(draft.sectionKey); } });
  void load().then(() => {
    render();
    const questionId = new URL(location.href).searchParams.get("question"), thread = threads.find(t => t.id === questionId);
    if (thread) { asking = true; void open(thread.sectionKey); }
    for (const draft of drafts.values()) if (draft.body !== draft.saved && !draft.conflict) void save(draft.sectionKey);
  });
}
