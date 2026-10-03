import { esc } from "./classroom-render";
import type { NotebookSection } from "./notebookSections";
import { createNotebookDrafts } from "./notebookDrafts";

export type NotebookConfig = { endpoint: string; roomId: string; lesson: string; sections: NotebookSection[]; personal: boolean; readOnly: boolean };

export const notebookStyle = `
.lay:has(.notebook-rail){grid-template-columns:minmax(12rem,1fr) minmax(0,48rem) minmax(20rem,1fr);gap:clamp(1rem,1.5vw,1.75rem)}
.notebook-rail{position:sticky;top:1.5rem;max-height:calc(100dvh - 3rem);overflow:auto;width:100%;max-width:24rem;justify-self:end;font-size:.875rem;scrollbar-width:thin}
body.lecture-on .notebook-quick{display:none}
.notebook-rail .toc{position:static;width:100%;max-height:none;max-width:none;overflow:visible}
.notebook-tabs{display:flex;gap:.2rem;border-bottom:1px solid var(--eddm-line);padding-bottom:.45rem;margin-bottom:1rem}
.notebook-tabs button{flex:1;border:0;background:transparent;padding:.65rem .25rem;color:var(--eddm-text-muted);font:inherit;white-space:nowrap;border-radius:.45rem;cursor:pointer}
.notebook-tabs button[aria-pressed=true]{background:var(--eddm-accent-bg);color:var(--eddm-accent);font-weight:600}
.section-notebook{align-self:center;white-space:nowrap;font-family:inherit;font-size:.72rem;font-weight:500;line-height:1.4;letter-spacing:0;color:var(--eddm-text-muted);background:transparent;border:1px solid var(--eddm-line);border-radius:99px;padding:.45rem .65rem;cursor:pointer}
.section-notebook:hover,.section-notebook[aria-expanded=true]{color:var(--eddm-accent);border-color:var(--eddm-accent-line);background:var(--eddm-accent-bg)}
article h2:has(.visual-carousel-controls):has(.section-notebook){grid-template-columns:auto minmax(0,1fr) auto auto}
.note-anchor{scroll-margin-top:2rem}
.notebook-panel[hidden],.notebook-rail [hidden]{display:none!important}
.notebook-panel{min-width:0;font-size:.875rem;line-height:1.6;color:var(--eddm-text)}
.notebook-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.8rem}
.notebook-head b{font-size:.9rem}.notebook-panel button{font-family:inherit;cursor:pointer}
.notebook-link{border:0;background:none;color:var(--eddm-text-muted);font-size:.76rem;padding:.3rem}
.notebook-link:hover{color:var(--eddm-accent)}
.notebook-panel label{display:block;font-weight:500;margin-bottom:.55rem}
.notebook-panel select,.notebook-panel input,.notebook-panel textarea{box-sizing:border-box;width:100%;font:inherit;color:var(--eddm-text);background:var(--eddm-canvas);border:1px solid var(--eddm-line-strong);border-radius:.55rem;padding:.7rem;min-width:0}
.notebook-panel select{font-size:.82rem;margin:.3rem 0 .8rem}
.notebook-panel textarea{line-height:1.65;min-height:13rem;resize:vertical;tab-size:4;white-space:pre-wrap;overflow-wrap:anywhere}
.notebook-panel :is(textarea,input,select,button):focus-visible,.section-notebook:focus-visible,.notebook-tabs button:focus-visible{outline:2px solid var(--eddm-accent);outline-offset:3px}
.notebook-panel p{margin:.45rem 0 .85rem;font-size:inherit}.notebook-hint{font-size:.77rem!important;color:var(--eddm-text-muted)}
.notebook-tools{display:flex;gap:.3rem;margin:.3rem 0 .4rem}.notebook-tools button{background:none;border:1px solid var(--eddm-line);border-radius:.35rem;color:var(--eddm-text-muted);font-size:.74rem;padding:.3rem .5rem}
.notebook-status{min-height:1.5em;font-size:.76rem;color:var(--eddm-text-muted);margin:.45rem 0;overflow-wrap:anywhere}
.notebook-status[data-error=true]{color:var(--eddm-accent)}
.notebook-primary{background:var(--eddm-accent);color:var(--eddm-accent-contrast);border:0;border-radius:.5rem;padding:.7rem 1rem;font-family:inherit;font-size:.84rem;font-weight:500;line-height:1.4}
.notebook-panel button:disabled{opacity:.55;cursor:wait}
.notebook-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin:.6rem 0}
.notebook-card{border:1px solid var(--eddm-line);border-radius:.6rem;padding:.85rem;margin:.75rem 0;background:var(--eddm-canvas)}
.notebook-card summary{cursor:pointer;overflow-wrap:anywhere}.notebook-badge{font-size:.7rem;color:var(--eddm-accent);white-space:nowrap}
.notebook-message{border-top:1px solid var(--eddm-line);padding-top:.7rem;margin-top:.7rem;overflow-wrap:anywhere}
.notebook-message b{font-size:.78rem}.notebook-message time{display:block;font-size:.7rem;color:var(--eddm-text-muted)}
.notebook-message p,.notebook-preview p{white-space:pre-wrap}.notebook-message pre,.notebook-preview pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8rem;padding:.7rem;border-radius:.4rem;background:var(--eddm-raise)}
.notebook-question{min-height:8rem!important}.notebook-auth input{margin:.3rem 0 .7rem}.notebook-auth .notebook-primary{width:100%}
.notebook-empty{padding:1rem 0;color:var(--eddm-text-muted)}
.notebook-context{border-bottom:1px solid var(--eddm-line);padding-bottom:.7rem;margin-bottom:.8rem}.notebook-context strong{display:block;font-size:.88rem;overflow-wrap:anywhere}.notebook-context summary{font-size:.75rem;color:var(--eddm-text-muted);cursor:pointer}.notebook-context details{margin-top:.35rem}.notebook-quick{display:none}.notebook-preview{padding:.75rem;border:1px solid var(--eddm-line);border-radius:.5rem;min-height:5rem}
@media(max-width:1200px){
 .lay:has(.notebook-rail){grid-template-columns:minmax(0,1fr)}
 .notebook-rail{position:static;order:-1;max-height:none;max-width:48rem;justify-self:center;overflow:visible}
 .notebook-rail>.notebook-tabs{display:none}.notebook-rail .toc{box-sizing:border-box}
 article>.notebook-panel{font-size:.9rem;margin:1rem 0 1.5rem;padding:1rem;border:1px solid var(--eddm-line);border-radius:.75rem;background:var(--eddm-canvas)}
 .notebook-quick{display:block;position:fixed;right:1rem;bottom:1rem;z-index:30;box-shadow:0 .25rem 1rem var(--eddm-line)}.notebook-quick[hidden]{display:none}.notebook-panel textarea{font-size:16px}.notebook-panel select,.notebook-panel input{font-size:16px}
 article h2{gap:.7rem}.section-notebook{font-size:.7rem;padding:.4rem .5rem}
}
@media(max-width:520px){article h2:has(.section-notebook),article h2:has(.visual-carousel-controls):has(.section-notebook){grid-template-columns:auto minmax(0,1fr)}.section-notebook{grid-column:2;justify-self:start}article h2:has(.section-notebook) .visual-carousel-controls{grid-column:2;justify-self:start}}
`;

export function notebookMarkup(toc: string) {
  return `<aside class="notebook-rail" aria-label="목차와 내 기록"><div class="notebook-tabs" aria-label="학습 도구">${["목차", "메모·질문"].map((label, i) => `<button type="button" data-notebook-tab="${i ? "note" : "toc"}" aria-pressed="${i === 0}" aria-controls="${i === 0 ? "notebook-toc" : "notebook-panel"}">${label}</button>`).join("")}</div><div id="notebook-toc">${toc}</div><section id="notebook-panel" class="notebook-panel" aria-label="내 메모와 강사 질문" hidden></section></aside><button type="button" class="notebook-quick notebook-primary" data-notebook-current aria-controls="notebook-panel">메모·질문</button>`;
}

export function notebookHeadings(html: string, sections: NotebookSection[]) {
  for (const section of sections) html = html.replace(new RegExp(`<h2 id="${section.anchor}">([\\s\\S]*?)</h2>`),
    (_match, content: string) => `<span id="note-${section.key}" class="note-anchor"></span><h2 id="${section.anchor}">${content}<button type="button" class="section-notebook" data-notebook-open="${section.key}" aria-controls="notebook-panel" aria-expanded="false" aria-label="${esc(section.title)} 메모와 질문 열기">메모·질문</button></h2>`);
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
  const toc = document.querySelector<HTMLElement>("#notebook-toc")!;
  const narrow = matchMedia("(max-width:1200px)");
  const drafts = new Map<string, Draft>();
  const questions = new Map<string, QuestionDraft>();
  let cache: ReturnType<typeof createCache> | null = null, cacheOk = true;
  let recovered: Pick<Note, "sectionKey" | "sectionTitle" | "body">[] = [];
  let selected = config.sections[0]?.key ?? "", tab = "toc", identity: { id: string; name: string } | null = null;
  let threads: Thread[] = [], loaded = false, loading: Promise<void> | null = null, loadError = "", register = false;
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let opener: HTMLElement | null = null;
  let followReading = true, composing = false;
  const escape = (text: string) => String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const date = (at: number) => new Date(at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const prose = (body: string) => body.split(/```[^\n]*\n|```/).map((part, i) => i % 2 ? `<pre><code>${escape(part)}</code></pre>` : `<p>${escape(part)}</p>`).join("");
  const storageKey = () => `notebook-draft:${config.roomId}:${config.endpoint}:${identity?.id}:${config.lesson}`;
  const persist = () => {
    if (!identity || !cache) return;
    cacheOk = cache.write({ notes: [...drafts.values()].filter(d => d.body !== d.saved).map(d => ({ sectionKey: d.sectionKey, sectionTitle: d.sectionTitle, body: d.body, version: d.version })), questions: [...questions].filter(([, d]) => d.body.trim() && !d.sent), recovered });
  };
  const dirty = () => [...drafts.values()].some(d => d.body !== d.saved || d.saving) || [...questions.values()].some(d => !d.sent && d.body.trim());
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
    const question = qDraft(`new:${selected}`), body = currentDraft(selected).body, button = panel.querySelector<HTMLButtonElement>("[data-question-send]");
    if (!button) return;
    const sent = sentAlready(selected, body);
    button.disabled = !body.trim() || Boolean(question.sending) || sent;
    button.textContent = question.sending ? "보내는 중…" : sent ? "강사에게 보낸 내용입니다" : "강사에게 질문 보내기";
  };
  const updateCounts = () => document.querySelectorAll<HTMLButtonElement>("[data-notebook-open]").forEach(button => {
    const key = button.dataset.notebookOpen!, note = drafts.get(key)?.body.trim(), count = threads.filter(t => t.sectionKey === key).length;
    button.textContent = note || count ? [note ? "메모 1" : "", count ? `질문 ${count}` : ""].filter(Boolean).join(" · ") : "메모·질문";
    button.setAttribute("aria-expanded", String(!panel.hidden && key === selected));
  });
  const updateStatus = (key: string) => {
    updateCounts();
    if (selected !== key || tab !== "note") return;
    const draft = currentDraft(key), status = panel.querySelector<HTMLElement>("[data-note-status]");
    if (status) { status.textContent = draft.error ? `${draft.error} ${cacheOk ? "이 기기에 초안을 보관했습니다." : "임시 보관도 할 수 없습니다. 내용을 복사해 보관해 주세요"}` : draft.saving ? "내 강의방에 저장 중…" : draft.body !== draft.saved ? cacheOk ? "이 기기에 임시 보관 · 서버 저장 대기" : "임시 보관 불가 · 서버 저장 확인 전에는 창을 닫지 마세요" : draft.version ? "내 강의방에 저장됨" : "작성하면 내 강의방에 자동 저장됩니다"; status.dataset.error = String(Boolean(draft.error) || (!cacheOk && draft.body !== draft.saved)); }
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
              if (key.startsWith("new:") && sentAlready(sectionKey, question.body)) continue;
              if (questions.has(key) && questions.get(key)!.body !== question.body) keep({ sectionKey, sectionTitle: currentDraft(sectionKey).sectionTitle, body: question.body });
              else questions.set(key, { ...question, sending: false });
            }
            for (const note of Array.isArray(cached.recovered) ? cached.recovered : []) if (note && typeof note.sectionKey === "string" && typeof note.body === "string" && note.body.length <= 12000) keep({ ...note, sectionTitle: String(note.sectionTitle || "이전 섹션") });
          }
          persist(); if (cacheOk) cache.consume();
        }
        loaded = true;
      } catch (error) { loadError = (error as Error).message; }
      finally { loading = null; updateCounts(); }
    })();
    return loading;
  };
  const place = () => {
    const heading = document.getElementById(config.sections.find(s => s.key === selected)?.anchor ?? "");
    if (narrow.matches && tab !== "toc" && heading) heading.parentNode!.insertBefore(panel, heading.nextSibling);
    else rail.appendChild(panel);
    toc.hidden = !narrow.matches && tab !== "toc";
  };
  const readingSection = () => {
    let key = config.sections[0]?.key ?? "";
    for (const section of config.sections) {
      const heading = document.getElementById(section.anchor);
      if (heading && heading.getBoundingClientRect().top <= Math.min(180, innerHeight * .25)) key = section.key;
    }
    return key;
  };
  const editing = () => composing || panel.contains(document.activeElement) || Boolean(drafts.get(selected)?.saving) || (drafts.has(selected) && drafts.get(selected)!.body !== drafts.get(selected)!.saved) || [...questions].some(([key, d]) => d.sending || (!d.sent && Boolean(d.body.trim()) && (key === `new:${selected}` || threads.some(t => t.id === key && t.sectionKey === selected))));
  const updateContext = () => {
    const label = panel.querySelector("[data-note-context]");
    if (label) label.textContent = !followReading ? "선택한 섹션" : narrow.matches || editing() ? "이 섹션에 기록 중" : "읽는 섹션에 자동 연결";
  };
  let scrollPending = false;
  const followSection = () => {
    updateContext();
    if (tab === "toc" || narrow.matches || !followReading || editing()) return;
    const next = readingSection();
    if (next !== selected) { selected = next; render(); }
  };
  addEventListener("scroll", () => { if (scrollPending) return; scrollPending = true; requestAnimationFrame(() => { scrollPending = false; followSection(); }); }, { passive: true });
  panel.addEventListener("focusin", updateContext);
  panel.addEventListener("focusout", () => { requestAnimationFrame(updateContext); });
  const render = () => {
    panel.hidden = tab === "toc";
    document.querySelector<HTMLElement>("[data-notebook-current]")!.hidden = !panel.hidden;
    document.querySelectorAll<HTMLButtonElement>("[data-notebook-tab]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.notebookTab === tab)));
    place(); updateCounts(); if (panel.hidden) return;
    const section = config.sections.find(s => s.key === selected), draft = currentDraft(selected);
    const sections = [...config.sections];
    for (const note of [...drafts.values(), ...threads]) if ((!("body" in note) || note.body) && !sections.some(s => s.key === note.sectionKey)) sections.push({ key: note.sectionKey, title: `이전 교안 · ${note.sectionTitle}`, anchor: "" });
    panel.innerHTML = `<div class="notebook-head"><b>메모·질문</b><button type="button" class="notebook-link" data-note-close aria-label="메모와 질문 닫기">닫기 ×</button></div><div class="notebook-context"><span class="notebook-hint" data-note-context></span><strong data-note-title>${escape(section?.title || sections.find(s => s.key === selected)?.title || "이전 섹션")}</strong><details><summary>섹션 변경</summary><label class="sr-only" for="note-section">기록할 섹션</label><select id="note-section" data-note-section>${sections.map(s => `<option value="${s.key}" ${s.key === selected ? "selected" : ""}>${escape(s.title)}</option>`).join("")}</select><button type="button" class="notebook-link" data-note-follow>현재 읽는 섹션으로</button></details></div>`;
    if (config.readOnly) { panel.innerHTML += '<p class="notebook-empty">강사 미리보기입니다. 학습자의 개인 메모는 표시하지 않습니다.</p>'; bind(); return; }
    if (loadError) { panel.innerHTML += `<p role="alert">${escape(loadError)}</p><button type="button" class="notebook-primary" data-note-reload>다시 연결</button>`; bind(); return; }
    if (!loaded) { panel.innerHTML += '<p class="notebook-empty" role="status">내 기록을 불러오는 중…</p>'; bind(); return; }
    if (!identity) {
      panel.innerHTML += `<p class="notebook-hint">이 공용 강의장에서 사용할 내 기록 계정입니다. 메모는 본인만, 보낸 질문은 강사와 본인이 볼 수 있습니다.</p><form class="notebook-auth"><label>이름<input name="name" required maxlength="60" autocomplete="username" placeholder="이 강의장에서 사용할 이름"></label><label>비밀번호<input name="password" type="password" required minlength="8" maxlength="128" autocomplete="${register ? "new-password" : "current-password"}" placeholder="8자 이상"></label><button class="notebook-primary">${register ? "내 기록 시작하기" : "내 기록 로그인"}</button><p class="notebook-status" role="status"></p></form><button type="button" class="notebook-link" data-note-register>${register ? "이미 계정이 있어요. 로그인" : "처음이라면 내 기록 만들기"}</button>`;
      bind(); return;
    }
    {
      panel.innerHTML += `<p class="notebook-hint">나만 보는 메모 · ${escape(identity.name)}</p><div class="notebook-tools"><button type="button" data-insert="list">목록</button><button type="button" data-insert="code">코드</button><button type="button" data-note-preview>미리보기</button></div><label class="sr-only" for="note-body">메모 내용</label><textarea id="note-body" data-note-body maxlength="12000" placeholder="메모하거나 궁금한 점을 적어 보세요. 질문은 아래 버튼으로 보낼 수 있어요." ${!section ? "readonly" : ""}>${escape(draft.body)}</textarea><div class="notebook-preview" data-note-preview-body hidden></div><p class="notebook-status" data-note-status role="status" aria-live="polite"></p><button type="button" class="notebook-link" data-note-retry hidden>저장 다시 시도</button><div class="notebook-card" data-note-conflict hidden><p>다른 창에서 저장한 내용이 있습니다. 작성 중인 내용은 위에 유지됩니다.</p><details><summary>현재 저장된 내용 보기</summary><pre data-remote-note></pre></details><button type="button" class="notebook-link" data-note-overwrite>위의 내 내용으로 저장</button></div>${!section ? '<p class="notebook-hint">제목이 변경된 이전 섹션의 기록입니다. 내용을 복사해 현재 섹션에 이어 쓸 수 있습니다.</p>' : ""}`;
    }
    {
      const q = qDraft(`new:${selected}`), matches = threads.filter(t => t.sectionKey === selected);
      panel.innerHTML += `${q.body && !q.sent && q.body !== draft.body ? `<details class="notebook-card"><summary>이전에 쓰던 질문 초안</summary>${prose(q.body)}<button type="button" class="notebook-link" data-question-restore>편집기에 이어 붙이기</button></details>` : ""}<p class="notebook-hint">메모는 나만 봅니다. 아래 버튼을 누르면 위 내용이 강사에게 전달되고 메모도 그대로 남습니다.</p><button type="button" class="notebook-primary" data-question-send ${!section ? "hidden" : ""}>강사에게 질문 보내기</button><p class="notebook-status" data-question-status role="status" aria-live="polite"></p><div class="notebook-row"><b>질문과 답변${matches.length ? ` · ${matches.length}` : ""}</b><button type="button" class="notebook-link" data-question-refresh>새로고침</button></div>${matches.length ? matches.map(thread => `<details class="notebook-card" data-thread="${thread.id}" ${new URL(location.href).searchParams.get("question") === thread.id ? "open" : ""}><summary><span class="notebook-badge">${thread.status === "answered" ? "답변 도착" : "답변 대기"}</span><br>${escape(thread.messages[0]?.body.slice(0, 90) || "질문")}</summary>${thread.messages.map(message => `<div class="notebook-message"><b>${message.role === "instructor" ? "강사 답변" : "내 질문"}</b><time>${date(message.created)}</time>${prose(message.body)}</div>`).join("")}<label>이어서 질문<textarea class="notebook-question" data-followup="${thread.id}" maxlength="12000" placeholder="답변을 읽고 더 궁금한 점을 적어 주세요">${escape(qDraft(thread.id).body)}</textarea></label><button type="button" class="notebook-primary" data-followup-send="${thread.id}">추가 질문 보내기</button><p class="notebook-status" role="status"></p></details>`).join("") : '<p class="notebook-empty">이 섹션에 보낸 질문이 아직 없습니다.</p>'}`;
    }
    if (!config.personal) panel.innerHTML += '<div class="notebook-row"><span class="notebook-hint">공용 컴퓨터에서는 사용 후 로그아웃하세요</span><button type="button" class="notebook-link" data-note-logout>내 기록 로그아웃</button></div>';
    if (recovered.length) panel.innerHTML += `<details class="notebook-card"><summary>다른 창에서 보관한 초안 ${recovered.length}개</summary><p class="notebook-hint">서로 다른 내용은 덮어쓰지 않고 보관했습니다.</p>${recovered.map((note, index) => `<div class="notebook-message"><b>${escape(note.sectionTitle)}</b>${prose(note.body)}${config.sections.some(s => s.key === note.sectionKey) ? `<button type="button" class="notebook-link" data-recover="${index}">해당 섹션 메모에 이어 붙이기</button>` : '<p class="notebook-hint">이전 섹션의 초안입니다. 필요한 내용을 복사해 보관하세요</p>'}<button type="button" class="notebook-link" data-recover-remove="${index}">이 초안 삭제</button></div>`).join("")}</details>`;
    bind(); updateStatus(selected); updateSend(); updateContext();
  };
  const open = async (key: string, focus = false) => {
    selected = key; tab = "note"; render(); if (!loaded) { await load(); render(); }
    if (focus) panel.querySelector<HTMLElement>("textarea,input")?.focus({ preventScroll: !narrow.matches });
  };
  const send = async (threadId: string | null, button: HTMLButtonElement) => {
    const key = threadId || `new:${selected}`, question = qDraft(key), sectionKey = selected;
    if (question.sending) return;
    if (!threadId) {
      const body = currentDraft(sectionKey).body;
      if (sentAlready(sectionKey, body)) return;
      if (question.body && !question.sent && question.body !== body && !recovered.some(n => n.sectionKey === sectionKey && n.body === question.body)) recovered.push({ sectionKey, sectionTitle: currentDraft(sectionKey).sectionTitle, body: question.body });
      question.body = body; question.sent = false;
    }
    if (!question.body.trim()) { panel.querySelector<HTMLElement>(threadId ? `[data-followup="${threadId}"]` : "[data-note-body]")?.focus(); return; }
    if (question.attemptedBody !== undefined && question.attemptedBody !== question.body) question.id = crypto.randomUUID();
    question.attemptedBody = question.body; persist();
    const status = threadId ? button.nextElementSibling! : panel.querySelector("[data-question-status]")!;
    const area = panel.querySelector<HTMLTextAreaElement>(threadId ? `[data-followup="${threadId}"]` : "[data-note-body]")!;
    const sentBody = question.body, sentId = question.id, sentOwner = identity?.id;
    question.sending = true; question.error = ""; button.disabled = true; area.readOnly = true; status.textContent = "질문을 보내는 중…";
    try {
      const result = await api(threadId ? "followup" : "ask", threadId ? { id: threadId, messageId: question.id, body: question.body } : { id: question.id, sectionKey, body: question.body });
      if (identity?.id !== sentOwner) return;
      if (question.body === sentBody && question.id === sentId) questions.delete(key);
      else question.id = crypto.randomUUID();
      if (!threadId) questions.set(key, { ...question, sent: true, sending: false, error: "" });
      persist(); threads = [result.thread, ...threads.filter(t => t.id !== result.thread.id)];
      if (selected !== sectionKey || tab === "toc") { updateCounts(); return; }
      render();
      panel.querySelector<HTMLDetailsElement>(`[data-thread="${result.thread.id}"]`)?.setAttribute("open", "");
      const done = panel.querySelector("[data-question-status]"); if (done) done.textContent = "질문을 보냈습니다. 강사 답변을 기다려 주세요";
    } catch (error) { question.sending = false; question.error = (error as Error).message; status.textContent = question.error; button.disabled = false; area.readOnly = false; if (selected === sectionKey && tab === "note" && questions.get(key) === question) { render(); if (threadId) panel.querySelector<HTMLDetailsElement>(`[data-thread="${threadId}"]`)?.setAttribute("open", ""); } }
    finally { question.sending = false; }
  };
  function bind() {
    if (tab === "note") {
      const current = qDraft(`new:${selected}`), input = panel.querySelector<HTMLTextAreaElement>("[data-note-body]"), button = panel.querySelector<HTMLButtonElement>("[data-question-send]"), status = panel.querySelector("[data-question-status]");
      if (input) input.readOnly = Boolean(current.sending) || !config.sections.some(s => s.key === selected); if (button) button.disabled = Boolean(current.sending); if (status) status.textContent = current.sending ? "질문을 보내는 중…" : current.error || "";
      panel.querySelectorAll<HTMLTextAreaElement>("[data-followup]").forEach(input => { const draft = qDraft(input.dataset.followup!); input.readOnly = Boolean(draft.sending); const button = panel.querySelector<HTMLButtonElement>(`[data-followup-send="${input.dataset.followup}"]`); if (button) { button.disabled = Boolean(draft.sending); button.nextElementSibling!.textContent = draft.sending ? "질문을 보내는 중…" : draft.error || ""; } });
    }
    panel.querySelector("[data-note-close]")?.addEventListener("click", () => { tab = "toc"; render(); opener?.focus(); });
    panel.querySelector<HTMLElement>("[data-note-section]")?.addEventListener("change", event => { followReading = false; selected = (event.target as HTMLSelectElement).value; render(); });
    panel.querySelector("[data-note-register]")?.addEventListener("click", () => { register = !register; render(); });
    panel.querySelector("[data-note-reload]")?.addEventListener("click", async () => { await load(); render(); });
    panel.querySelector<HTMLFormElement>(".notebook-auth")?.addEventListener("submit", async event => {
      event.preventDefault(); const form = event.currentTarget as HTMLFormElement, button = form.querySelector("button")!, status = form.querySelector(".notebook-status")!; button.disabled = true;
      try { const data = new FormData(form); await api(register ? "register" : "login", { name: data.get("name"), password: data.get("password") }); loaded = false; await load(); render(); }
      catch (error) { status.textContent = (error as Error).message; button.disabled = false; }
    });
    const editorKey = selected;
    const area = panel.querySelector<HTMLTextAreaElement>("[data-note-body]");
    area?.addEventListener("compositionstart", () => { composing = true; });
    area?.addEventListener("compositionend", () => { composing = false; });
    area?.addEventListener("input", () => { const key = editorKey, draft = currentDraft(key); draft.body = area.value; draft.error = draft.conflict ? draft.error : ""; persist(); updateStatus(key); updateSend(); clearTimeout(saveTimers.get(key)); saveTimers.set(key, setTimeout(() => { void save(key); }, 700)); });
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
    panel.querySelector("[data-question-restore]")?.addEventListener("click", () => { const question = qDraft(`new:${editorKey}`); if (!area || area.readOnly) return; const merged = [area.value, question.body].filter(Boolean).join("\n\n"); if (merged.length > 12000) { alert("내용이 길어 한 번에 합칠 수 없습니다. 필요한 부분을 복사해 주세요"); return; } area.value = merged; questions.delete(`new:${editorKey}`); area.dispatchEvent(new Event("input", { bubbles: true })); render(); });
    panel.querySelector("[data-note-follow]")?.addEventListener("click", () => { followReading = true; void open(readingSection()); });
    panel.querySelectorAll<HTMLElement>("[data-recover]").forEach(button => button.addEventListener("click", () => {
      const index = Number(button.dataset.recover), note = recovered[index]; if (!note) return;
      const draft = currentDraft(note.sectionKey), merged = [draft.body, note.body].filter(Boolean).join("\n\n");
      if (merged.length > 12000) { alert("내용이 길어 한 번에 합칠 수 없습니다. 필요한 부분을 복사해 주세요"); return; }
      draft.body = merged; recovered.splice(index, 1); persist(); followReading = false; void open(note.sectionKey, true); void save(note.sectionKey);
    }));
    panel.querySelectorAll<HTMLElement>("[data-recover-remove]").forEach(button => button.addEventListener("click", () => { if (!confirm("이 임시 초안을 삭제할까요? 서버에 저장한 메모는 유지됩니다.")) return; recovered.splice(Number(button.dataset.recoverRemove), 1); persist(); render(); }));
    panel.querySelector<HTMLButtonElement>("[data-question-send]")?.addEventListener("click", event => { void send(null, event.currentTarget as HTMLButtonElement); });
    panel.querySelector("[data-question-refresh]")?.addEventListener("click", async () => { await load(); render(); });
    panel.querySelectorAll<HTMLTextAreaElement>("[data-followup]").forEach(area => area.addEventListener("input", () => { qDraft(area.dataset.followup!).body = area.value; persist(); }));
    panel.querySelectorAll<HTMLButtonElement>("[data-followup-send]").forEach(button => button.addEventListener("click", () => { void send(button.dataset.followupSend!, button); }));
    panel.querySelector<HTMLButtonElement>("[data-note-logout]")?.addEventListener("click", async event => {
      const button = event.currentTarget as HTMLButtonElement;
      if ([...drafts.values()].some(d => d.saving) || [...questions.values()].some(d => d.sending)) { button.textContent = "저장·전송이 끝나면 다시 눌러 주세요"; return; }
      if ((dirty() || recovered.length) && !confirm("저장되지 않은 메모와 보내지 않은 질문 초안을 버리고 로그아웃할까요? 이미 저장한 기록은 유지됩니다.")) return;
      try { await api("logout"); cache?.clear(); cache = null; recovered = []; drafts.clear(); questions.clear(); threads = []; identity = null; loaded = false; await load(); render(); } catch (error) { button.textContent = (error as Error).message; }
    });
  }
  document.querySelectorAll<HTMLElement>("[data-notebook-open]").forEach(button => button.addEventListener("click", () => { opener = button; followReading = true; void open(button.dataset.notebookOpen!, true); }));
  document.querySelectorAll<HTMLElement>("[data-notebook-tab]").forEach(button => button.addEventListener("click", () => { if (button.dataset.notebookTab === "toc") { tab = "toc"; render(); } else { opener = button; followReading = true; void open(readingSection()); } }));
  document.querySelector<HTMLElement>("[data-notebook-current]")!.addEventListener("click", event => { opener = event.currentTarget as HTMLElement; followReading = true; void open(readingSection(), true); });
  narrow.addEventListener("change", place);
  addEventListener("beforeunload", event => { if (dirty()) { persist(); event.preventDefault(); event.returnValue = ""; } });
  addEventListener("pagehide", persist);
  addEventListener("online", () => { for (const draft of drafts.values()) if (draft.body !== draft.saved && !draft.conflict) void save(draft.sectionKey); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { persist(); for (const draft of drafts.values()) if (draft.body !== draft.saved && !draft.conflict) void save(draft.sectionKey); } });
  void load().then(() => {
    const questionId = new URL(location.href).searchParams.get("question"), thread = threads.find(t => t.id === questionId);
    if (thread) { followReading = false; void open(thread.sectionKey); }
    for (const draft of drafts.values()) if (draft.body !== draft.saved && !draft.conflict) void save(draft.sectionKey);
  });
}
