import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { applyRecipe, bottom, extract, inferRows, limits, makeRegion, mergeCells, readRecipe, resetGrid, suggestBox, toRecipe, type Box, type Cell, type Region } from "./model";
import { OcrSession, openPdf, readPage, type SourceFile } from "./pdf";
import { PdfCanvas, type CanvasMode } from "./pdfCanvas";
import { TableGrid, type Pick } from "./tableGrid";
import { download, workbookBytes } from "./export";
import { sampleFiles, scanSample } from "./sample";
import "./style.css";

const freshId = () => crypto.randomUUID();
const paths: Record<string, string> = {
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5", file: "M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6", crop: "M5 2v17h17M2 5h17v17", columns: "M3 3h18v18H3zM9 3v18M15 3v18", rows: "M3 3h18v18H3zM3 9h18M3 15h18", arrow: "M5 12h14m-6-6 6 6-6 6", undo: "m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14", redo: "m16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14", download: "M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4", expand: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5", close: "m6 6 12 12M6 18 18 6", check: "m4 12 5 5L20 6", grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01", scan: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M6 12h12", link: "m9 15 6-6m-7 2-3 3a4 4 0 0 0 6 6l3-3m-1-4 3-3a4 4 0 0 1 6 6l-3 3", trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7", plus: "M12 4v16M4 12h16", minus: "M4 12h16", lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4", save: "M4 3h14l3 3v15H3V3h1Zm3 0v6h10V3M7 21v-8h10v8", layers: "m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5",
};
function Icon({ name }: { name: string }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.file} /></svg>; }

export default function PdfTable() {
  const [files, setFiles] = useState<SourceFile[]>([]), [pageId, setPageId] = useState("");
  const [regions, setRegions] = useState<Region[]>([]), [activeId, setActiveId] = useState("");
  const [preview, setPreview] = useState<Region>(), [mode, setMode] = useState<CanvasMode>("select");
  const [picked, setPicked] = useState<Pick>(), [extent, setExtent] = useState<Pick>();
  const [busy, setBusy] = useState(""), [progress, setProgress] = useState(0), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [zoom, setZoom] = useState(100), [split, setSplit] = useState(52), [expanded, setExpanded] = useState(false), [dropping, setDropping] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false), [mobileTab, setMobileTab] = useState("source");
  const [dragTarget, setDragTarget] = useState("");
  const [past, setPast] = useState<Region[][]>([]), [future, setFuture] = useState<Region[][]>([]);
  const root = useRef<HTMLDivElement>(null), splitter = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null), recipeInput = useRef<HTMLInputElement>(null);
  const sources = useRef<SourceFile[]>([]), job = useRef(0), ocr = useRef<OcrSession | null>(null), alive = useRef(true), dragged = useRef<string | null>(null), dropDepth = useRef(0);
  const loadAbort = useRef<AbortController | null>(null);
  const pages = files.flatMap(file => file.pages), page = pages.find(page => page.id === pageId), file = files.find(file => file.id === page?.fileId);
  const active = regions.find(region => region.id === activeId && region.pageId === pageId), shown = preview?.id === active?.id ? preview : active;
  const tables = useMemo(() => regions.flatMap(region => { const page = files.flatMap(file => file.pages).find(page => page.id === region.pageId); return page?.width ? [extract(page, region)] : []; }), [files, regions]);
  const table = useMemo(() => page && shown ? extract(page, shown) : undefined, [page, shown]);
  const cell = picked ? table?.cells[picked.row]?.[picked.column] : undefined;
  const issueCount = tables.reduce((sum, t) => sum + t.issues.length + t.totals.filter(total => total.matches === false).length, 0);
  const rowCount = tables.reduce((sum, table) => sum + table.data.length, 0);
  const reportError = useCallback((message: string) => setError(message), []);

  useEffect(() => { sources.current = files; }, [files]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; job.current++; loadAbort.current?.abort(); for (const file of sources.current) void file.close(); void ocr.current?.close(); }; }, []);
  useEffect(() => { if (regions.length && !regions.some(region => region.id === activeId)) setActiveId(regions.find(region => region.pageId === pageId)?.id ?? ""); }, [regions, activeId, pageId]);
  useEffect(() => {
    if (!expanded) return;
    const original = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [expanded]);
  const commit = (next: Region[]) => { setPast(history => [...history, regions].slice(-limits.history)); setFuture([]); setRegions(next); };
  const update = (region: Region) => commit(regions.map(current => current.id === region.id ? region : current));
  const undo = () => { const previous = past.at(-1); if (previous) { setFuture(items => [regions, ...items]); setRegions(previous); setPast(items => items.slice(0, -1)); setPicked(undefined); setExtent(undefined); } };
  const redo = () => { const next = future[0]; if (next) { setPast(items => [...items, regions]); setRegions(next); setFuture(items => items.slice(1)); setPicked(undefined); setExtent(undefined); } };
  const canEdit = () => !active || !(Object.keys(active.edits).length || active.merges.length || active.omitted.length || active.reviewed.length || active.names.length || active.numberColumns.length) || window.confirm("표 경계를 바꾸면 이 표의 수정값, 병합, 제외 행, 숫자 열 설정이 초기화됩니다. 되돌리기로 복구할 수 있습니다. 경계를 바꿀까요?");
  const grid = (next: Region) => { update(resetGrid(next, {})); setPicked(undefined); setExtent(undefined); setNotice("표 경계를 반영했습니다. 직접 수정과 확인 상태는 새 표를 기준으로 다시 지정합니다."); };
  const selectPage = (id: string) => { setPageId(id); setActiveId(regions.find(region => region.pageId === id)?.id ?? ""); setPicked(undefined); setExtent(undefined); setZoom(100); setPreview(undefined); };
  const selectRegion = (region: Region) => { setPageId(region.pageId); setActiveId(region.id); setPicked(undefined); setExtent(undefined); setPreview(undefined); };
  const addRegion = (box: Box) => {
    if (!page) return;
    if (regions.length >= limits.regions) { setError(`표는 ${limits.regions}개까지 만들 수 있습니다`); return; }
    const region = makeRegion(page, box, freshId(), `표 ${regions.length + 1}`);
    if (!page.words.some(word => word.x < box.x + box.width && word.x + word.width > box.x && word.y < bottom(box) && word.y + word.height > box.y)) { setError("선택한 영역에서 글자를 찾지 못했습니다. 스캔본이면 글자 인식을 먼저 실행해 주세요"); return; }
    commit([...regions, region]); setActiveId(region.id); setPicked(undefined); setExtent(undefined); setError(""); setNotice("표를 만들었습니다. 구분선을 드래그하거나 셀을 두 번 눌러 수정해 보세요");
  };
  const load = async (incoming: File[], replace = false) => {
    if (busy || !incoming.length) return;
    if (incoming.length + (replace ? 0 : files.length) > limits.files) { setError(`PDF는 ${limits.files}개까지 열 수 있습니다`); return; }
    if (incoming.reduce((n, f) => n + f.size, 0) + (replace ? 0 : files.reduce((n, f) => n + f.bytes.length, 0)) > limits.totalBytes) { setError("파일 전체 크기는 100MB 이하여야 합니다"); return; }
    if (replace && files.length && !window.confirm("현재 문서와 편집 내용을 지우고 예제를 열까요? 필요한 결과와 추출 설정을 먼저 저장해 주세요")) return;
    const currentJob = ++job.current, opened: SourceFile[] = [];
    loadAbort.current = new AbortController();
    setBusy("PDF를 읽는 중"); setError(""); setProgress(0);
    try {
      for (const [i, input] of incoming.entries()) {
        const next = await openPdf(input, freshId(), loadAbort.current.signal); opened.push(next);
        if (opened.reduce((n, f) => n + f.pdf.numPages, 0) + (replace ? 0 : pages.length) > limits.pages) throw new Error(`전체 ${limits.pages}페이지 이하로 선택해 주세요`);
        for (let p = 1; p <= next.pdf.numPages; p++) {
          if (currentJob !== job.current || !alive.current) throw new Error("파일 열기를 취소했습니다");
          setBusy(`${input.name} · ${p} / ${next.pdf.numPages}페이지`);
          await readPage(next, p); setProgress((i + p / next.pdf.numPages) / incoming.length);
        }
      }
      if (currentJob !== job.current || !alive.current) throw new Error("파일 열기를 취소했습니다");
      const combined = replace ? opened : [...files, ...opened];
      if (replace) { for (const source of files) void source.close(); setRegions([]); setPast([]); setFuture([]); }
      sources.current = combined; setFiles(combined); setPageId(opened[0].pages[0].id); setPicked(undefined); setExtent(undefined); setActiveId("");
      if (!files.length || replace) {
        const first = opened[0].pages[0], box = suggestBox(first);
        if (box) { const region = makeRegion(first, box, freshId(), "표 1"); setRegions([region]); setActiveId(region.id); }
      }
      setNotice(`${opened.length}개 PDF를 열었습니다. 자동으로 제안한 표의 경계를 원문과 확인해 주세요`);
    } catch (error) { for (const source of opened) void source.close(); if (alive.current) setError(error instanceof Error ? error.message : "PDF를 읽지 못했습니다"); }
    finally { loadAbort.current = null; if (alive.current) { setBusy(""); setProgress(0); } }
  };
  const demo = async (scan = false) => {
    if (busy) return;
    const current = ++job.current;
    setError(""); setBusy("예제 PDF를 준비하는 중");
    try {
      const examples = await (scan ? scanSample() : sampleFiles());
      if (current !== job.current || !alive.current) throw new Error("예제 열기를 취소했습니다");
      await load(examples, true);
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : "예제를 열지 못했습니다"); }
    finally { if (alive.current) setBusy(""); }
  };
  const recognize = async () => {
    if (!file || !page || busy || !canEdit()) return;
    setBusy("한글·영문 글자 인식 준비"); setProgress(0); setError(""); ocr.current = new OcrSession();
    try {
      const next = await ocr.current.recognize(file, page.number, value => { setBusy("스캔본 글자 인식 중"); setProgress(value); });
      if (!alive.current) return;
      setFiles([...files]);
      if (active) grid({ ...active, rows: inferRows(next, active.box) });
      else { const box = suggestBox(next); if (box) { const region = makeRegion(next, box, freshId(), `표 ${regions.length + 1}`); commit([...regions, region]); setActiveId(region.id); } }
      setNotice(`글자 ${next.words.length}개 조각을 읽었습니다. 인식 결과는 원문과 대조해 주세요`);
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : "글자 인식을 완료하지 못했습니다"); }
    finally { await ocr.current?.close(); ocr.current = null; if (alive.current) { setBusy(""); setProgress(0); } }
  };
  const applyOthers = () => {
    if (!active) return;
    const targets = pages.filter(page => page.id !== pageId && !regions.some(region => region.pageId === page.id));
    if (!targets.length) { setNotice("표가 없는 다른 페이지가 없습니다. 기존 표는 덮어쓰지 않습니다."); return; }
    try { const next = applyRecipe(toRecipe([active]), targets, freshId); if (next.length + regions.length > limits.regions) throw new Error(`표는 ${limits.regions}개까지 만들 수 있습니다`); commit([...regions, ...next]); setNotice(`${targets.length}페이지에 같은 위치를 적용했습니다. 페이지마다 결과를 확인해 주세요`); }
    catch (error) { setError((error as Error).message); }
  };
  const openRecipe = async (file: File | undefined) => {
    if (!file || !page) return;
    try { if (file.size > limits.recipeBytes) throw new Error("설정 파일은 1MB 이하만 열 수 있습니다"); const recipe = readRecipe(await file.text()); const next = applyRecipe(recipe, [page], freshId); if (regions.length + next.length > limits.regions) throw new Error(`표는 ${limits.regions}개까지 만들 수 있습니다`); commit([...regions, ...next]); setActiveId(next[0].id); setNotice("현재 페이지에 추출 설정을 적용했습니다. 원문과 맞는지 확인해 주세요"); }
    catch (error) { setError(error instanceof SyntaxError ? "JSON 형식의 추출 설정 파일을 선택해 주세요" : (error as Error).message); }
  };
  const saveRecipe = () => { if (!active) return; download(JSON.stringify(toRecipe([active]), null, 2), "PDF_추출설정.json", "application/json"); setNotice("현재 표의 영역·열·제목 설정을 저장했습니다. 원문과 수정한 값은 들어 있지 않습니다."); };
  const exportBook = async () => {
    if (busy) return;
    const current = ++job.current;
    setBusy("엑셀 파일을 만드는 중"); setError("");
    try {
      const bytes = await workbookBytes(tables);
      if (!alive.current || current !== job.current) return;
      download(bytes, "PDF_통합표.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      setNotice(`전체 ${tables.length}개 표의 ${rowCount}행과 원문 근거, 검토 항목을 내려받습니다.`);
    } catch { if (alive.current) setError("엑셀 파일을 만들지 못했습니다. 표 크기를 확인해 주세요"); }
    finally { if (alive.current) setBusy(""); }
  };
  const pick = (next: Cell, extend: boolean) => { if (extend && picked) setExtent({ row: next.row, column: next.column }); else { setPicked({ row: next.row, column: next.column }); setExtent(undefined); } };
  const reorder = (from: string, to: string) => { if (from === to) return; const next = [...regions], index = next.findIndex(r => r.id === from), target = next.findIndex(r => r.id === to); if (index < 0 || target < 0) return; next.splice(target, 0, next.splice(index, 1)[0]); commit(next); };
  const orderTarget = (event: PointerEvent) => document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-region-id]")?.dataset.regionId ?? "";
  const moveOrder = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragged.current) return;
    const list = event.currentTarget.closest<HTMLElement>(".pt-region-list"), box = list?.getBoundingClientRect();
    if (list && box) { if (event.clientX < box.left + 32) list.scrollLeft -= 16; if (event.clientX > box.right - 32) list.scrollLeft += 16; }
    setDragTarget(orderTarget(event));
  };
  const finishOrder = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const target = orderTarget(event), from = dragged.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragged.current = null; setDragTarget("");
    if (from && target && !cancelled) reorder(from, target);
  };
  const clear = () => { if (files.length && !window.confirm("문서와 편집 내용을 모두 지울까요? 내려받은 파일은 그대로 남습니다.")) return; job.current++; for (const source of files) void source.close(); sources.current = []; setFiles([]); setRegions([]); setPast([]); setFuture([]); setPageId(""); setActiveId(""); setPicked(undefined); setExtent(undefined); setError(""); setNotice("문서와 편집 내용을 지웠습니다."); };

  return <div ref={root} id="pdf-table" data-pdf-table className={`pdf-table ${expanded ? "pt-expanded" : ""} ${dropping ? "pt-dropping" : ""}`} onKeyDown={e => {
    if (e.key === "Escape") { setExpanded(false); setPreview(undefined); }
    if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if (!e.ctrlKey && !e.metaKey && !e.altKey) { if (e.key === "v") setMode("select"); if (e.key === "c" && active) setMode("column"); if (e.key === "r" && active) setMode("row"); }
  }} onDragEnter={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); dropDepth.current++; setDropping(true); } }} onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }} onDragLeave={e => { if (e.dataTransfer.types.includes("Files")) { dropDepth.current--; if (dropDepth.current <= 0) setDropping(false); } }} onDrop={e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); dropDepth.current = 0; setDropping(false); void load(Array.from(e.dataTransfer.files)); }}>
    <input ref={fileInput} type="file" accept=".pdf,application/pdf" multiple hidden aria-label="PDF 파일 선택" onChange={e => { void load(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    <input ref={recipeInput} type="file" accept=".json,application/json" hidden aria-label="추출 설정 파일 선택" onChange={e => { void openRecipe(e.target.files?.[0]); e.target.value = ""; }} />
    <header className="pt-header"><div className="pt-title"><Icon name="columns" /><div><span className="pt-eyebrow">DOCUMENT WORKSPACE</span><strong>PDF 표 작업대</strong></div></div><div className="pt-header-actions"><span className="pt-private"><Icon name="lock" />이 브라우저에서 처리</span><button className="pt-icon" title={expanded ? "전체 화면 닫기 (Esc)" : "작업대 넓게 보기"} aria-label={expanded ? "전체 화면 닫기" : "작업대 넓게 보기"} onClick={() => setExpanded(!expanded)}><Icon name={expanded ? "close" : "expand"} /></button></div></header>
    {files.length > 0 && <div className="pt-command"><div><button disabled={!!busy} onClick={() => fileInput.current?.click()}><Icon name="plus" />PDF 추가</button><span className="pt-divider" /><button className="pt-icon" disabled={!past.length || !!busy} onClick={undo} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기"><Icon name="undo" /></button><button className="pt-icon" disabled={!future.length || !!busy} onClick={redo} title="다시 실행 (Ctrl+Shift+Z)" aria-label="다시 실행"><Icon name="redo" /></button><span className="pt-command-note">{files.length}개 문서 · {pages.length}페이지</span></div><button className="pt-primary" disabled={!rowCount || !!busy} onClick={exportBook}><Icon name="download" />엑셀로 내보내기<span>{rowCount}행</span></button></div>}
    {!files.length ? <div className="pt-welcome"><div className="pt-welcome-icon"><Icon name="file" /></div><span className="pt-eyebrow">PDF → TABLE</span><h2>필요한 표를 꺼내고,<br />원문과 맞춰 보세요</h2><p>PDF를 여기로 끌어다 놓으세요<br />표 영역을 잡고, 구분선을 움직이면 결과가 바로 바뀝니다.</p><div className="pt-welcome-actions"><button className="pt-primary" disabled={!!busy} onClick={() => fileInput.current?.click()}><Icon name="upload" />PDF 파일 선택</button><button disabled={!!busy} onClick={() => void demo()}>예제로 둘러보기<Icon name="arrow" /></button></div><small>여러 파일 가능 · 파일당 30MB · 전체 100MB<br />텍스트 PDF와 한글·영문 스캔본</small><div className="pt-welcome-steps"><span><b>01</b> 영역 선택</span><span><b>02</b> 원문 대조</span><span><b>03</b> 엑셀 저장</span></div></div> : <>
      <div className="pt-workspace" style={{ "--pt-split": `${split}%` } as CSSProperties}>
        <aside className="pt-sidebar"><div className="pt-sidebar-heading">문서<span>{pages.length}P</span></div><div className="pt-pages">{files.map(source => <div className="pt-file-group" key={source.id}><div title={source.name}>{source.name}</div>{source.pages.map(p => <button key={p.id} title={`${source.name} · ${p.number}페이지`} aria-label={`${source.name} ${p.number}페이지`} onClick={() => selectPage(p.id)} aria-current={p.id === pageId ? "page" : undefined} className={p.id === pageId ? "pt-page-active" : ""}><span className="pt-mini-page"><Icon name="file" /><b>{p.number}</b></span><span>{p.number}페이지<small>{regions.filter(r => r.pageId === p.id).length ? `${regions.filter(r => r.pageId === p.id).length}개 표` : "표 선택 전"}</small></span></button>)}</div>)}</div><button className="pt-clear" disabled={!!busy} onClick={clear}><Icon name="trash" />문서 지우기</button></aside>
        <main className="pt-editors" ref={splitter} data-mobile-tab={mobileTab}>
          <div className="pt-mobile-tabs"><button aria-pressed={mobileTab === "source"} onClick={() => setMobileTab("source")}>PDF 원문</button><button aria-pressed={mobileTab === "table"} onClick={() => setMobileTab("table")}>추출한 표 {table?.data.length ?? 0}행</button></div>
          <section className="pt-source-pane" aria-label="PDF 원문 작업 영역"><div className="pt-pane-heading"><span><b>01</b> PDF 원문</span><small>{page?.number} / {file?.pdf.numPages}</small></div><div className="pt-canvas-toolbar"><div>{([["select", "crop", "영역", "V"], ["column", "columns", "열 나누기", "C"], ["row", "rows", "행 나누기", "R"]] as const).map(([value, icon, label, key]) => <button key={value} disabled={!!busy || (value !== "select" && !active)} aria-pressed={mode === value} onClick={() => setMode(value)} title={`${label} (${key})`}><Icon name={icon} /><span>{label}</span></button>)}</div><div className="pt-zoom"><button className="pt-icon" disabled={zoom <= 65} aria-label="축소" onClick={() => setZoom(Math.max(65, zoom - 15))}><Icon name="minus" /></button><button onClick={() => setZoom(100)} title="폭에 맞추기">{zoom}%</button><button className="pt-icon" disabled={zoom >= 220} aria-label="확대" onClick={() => setZoom(Math.min(220, zoom + 15))}><Icon name="plus" /></button></div></div>
            {file && page && <PdfCanvas file={file} page={page} region={shown} highlight={cell?.box} mode={mode} zoom={zoom} onRegion={addRegion} onPreview={setPreview} onGrid={grid} canEdit={canEdit} onError={reportError} />}
            <div className="pt-source-footer"><button disabled={!file || !!busy} onClick={() => file && download(file.bytes, file.name, "application/pdf")} title="현재 PDF 원본 내려받기"><Icon name="download" />원본 저장</button><span>{page?.method === "ocr" ? "글자 인식 결과" : page?.words.length ? "PDF 텍스트" : "텍스트 없는 페이지"}</span><button disabled={!!busy} onClick={() => void recognize()}><Icon name="scan" />{page?.method === "ocr" ? "다시 인식" : "스캔본 글자 인식"}</button></div>
          </section>
          <div className="pt-splitter" role="separator" aria-label="원문과 표 너비 조절" aria-orientation="vertical" aria-valuenow={split} aria-valuemin={32} aria-valuemax={70} tabIndex={0} onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setSplit(n => Math.max(32, Math.min(70, n + (e.key === "ArrowLeft" ? -2 : 2)))); } }} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const box = splitter.current!.getBoundingClientRect(); setSplit(Math.max(32, Math.min(70, (e.clientX - box.left) / box.width * 100))); }} onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}><span /></div>
          <section className="pt-table-pane" aria-label="표 검토 작업 영역"><div className="pt-pane-heading"><span><b>02</b> 추출한 표</span><small>{table ? `${table.headers.length}열 · ${table.data.length}행` : "영역을 선택하세요"}</small></div>
            {active && table ? <><div className="pt-table-toolbar"><label>제목 <select aria-label="제목 행 수" value={active.headerRows} onChange={e => update({ ...active, headerRows: Number(e.target.value) })}>{Array.from({ length: Math.min(10, table.cells.length) + 1 }, (_, n) => <option key={n} value={n}>{n}행</option>)}</select></label><button aria-pressed={onlyIssues} onClick={() => setOnlyIssues(!onlyIssues)}>확인할 칸 <span className="pt-count">{table.issues.length}</span></button><button disabled={!picked || !extent} title="첫 셀을 누른 뒤 Shift를 누르고 마지막 셀 선택" onClick={() => { if (picked && extent && canEdit()) { update(mergeCells(active, picked, extent)); setExtent(undefined); } }}>셀 병합</button><button disabled={!cell || (cell.colSpan === 1 && cell.rowSpan === 1)} onClick={() => { if (cell && canEdit()) update({ ...active, merges: active.merges.filter(m => m.row !== cell.row || m.column !== cell.column), edits: {}, reviewed: [] }); }}>병합 해제</button></div><TableGrid table={table} picked={picked} extent={extent} onPick={pick} onChange={update} onlyIssues={onlyIssues} />
              {cell ? <div className="pt-inspector"><div><span className="pt-eyebrow">SOURCE TRACE</span><strong>{table.headers[cell.column]} <small>{cell.row + 1}행</small></strong><p><Icon name="link" />{page?.fileName} · {page?.number}페이지</p></div><dl><div><dt>원문</dt><dd>{cell.original || "빈 칸"}</dd></div>{cell.edited && <div><dt>수정</dt><dd>{cell.value || "빈 칸"}</dd></div>}</dl><div className="pt-inspector-actions"><span>{cell.flags.join(" · ") || "원문과 값을 대조해 주세요"}</span><button aria-pressed={cell.reviewed} onClick={() => update({ ...active, reviewed: cell.reviewed ? active.reviewed.filter(key => key !== cell.key) : [...active.reviewed, cell.key] })}><Icon name="check" />{cell.reviewed ? "확인함" : "원문 확인"}</button></div></div> : <div className="pt-inspector-empty"><Icon name="link" /><span>셀을 누르면 PDF에서 원문 위치를 짚어 줍니다.<br /><small>두 번 누르기: 수정 · Shift+클릭: 여러 셀 선택</small></span></div>}
              {table.totals.length > 0 && <div className="pt-totals">{table.totals.map(total => <label key={total.column}><span>{table.headers[total.column]}<b>{total.actual.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}</b></span><input aria-label={`${table.headers[total.column]} 기준 합계`} value={active.checks[String(total.column)] ?? ""} placeholder="기준 합계 입력" onChange={e => update({ ...active, checks: { ...active.checks, [String(total.column)]: e.target.value } })} /><small className={total.matches === false || total.invalid ? "pt-warning-text" : ""}>{total.invalid ? `${total.invalid}칸 숫자 확인` : total.matches === null ? "기준 미지정" : total.matches ? "합계 일치" : "합계 불일치"}</small></label>)}</div>}
            </> : <div className="pt-table-empty"><Icon name="crop" /><h3>표가 있는 곳을 드래그하세요</h3><p>왼쪽 PDF에서 표를 감싸면<br />여기에 편집할 수 있는 표가 나타납니다.</p>{page && !page.words.length && <button onClick={() => void recognize()} disabled={!!busy}><Icon name="scan" />스캔본 글자 인식</button>}<button disabled={!page || !!busy} onClick={() => recipeInput.current?.click()}>저장한 설정 열기</button></div>}
          </section>
        </main>
      </div>
      <section className="pt-collection" aria-label="통합할 표 목록"><div className="pt-collection-heading"><span><Icon name="layers" />통합할 표 <b>{regions.length}</b><small>끌어서 내보낼 순서 변경</small></span><div><button disabled={!active || !!busy} onClick={applyOthers}>다른 페이지에도 적용</button><button disabled={!active || !!busy} onClick={saveRecipe}><Icon name="save" />설정 저장</button><button disabled={!page || !!busy} onClick={() => recipeInput.current?.click()}>설정 열기</button></div></div><div className="pt-region-list">{regions.map((r, i) => { const source = pages.find(page => page.id === r.pageId); return <div key={r.id} data-region-id={r.id} data-drag-over={dragTarget === r.id && dragged.current !== r.id} className={`pt-region-chip ${r.id === activeId ? "pt-region-chip-active" : ""}`}><button className="pt-grip" disabled={!!busy} aria-label={`${r.name} 순서 끌어서 변경`} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); dragged.current = r.id; setDragTarget(r.id); }} onPointerMove={moveOrder} onPointerUp={e => finishOrder(e)} onPointerCancel={e => finishOrder(e, true)}><Icon name="grip" /></button><button onClick={() => selectRegion(r)}><b>{r.name}</b><small>{source?.fileName} · {source?.number}p</small></button><button className="pt-order" aria-label={`${r.name} 앞으로 이동`} disabled={i === 0} onClick={() => reorder(r.id, regions[i - 1].id)}>←</button><button className="pt-order" aria-label={`${r.name} 뒤로 이동`} disabled={i === regions.length - 1} onClick={() => reorder(r.id, regions[i + 1].id)}>→</button><button className="pt-icon" aria-label={`${r.name} 삭제`} onClick={() => { commit(regions.filter(current => current.id !== r.id)); if (r.id === activeId) setActiveId(""); }}><Icon name="close" /></button></div>; })}{!regions.length && <p>선택한 표가 여기에 모입니다.</p>}</div></section>
      <footer className="pt-footer"><span><b>{rowCount}</b>행 · <b>{tables.length}</b>개 표 <span className={issueCount ? "pt-warning-text" : ""}>{issueCount ? `· ${issueCount}개 항목 확인 필요` : ""}</span></span><span>추출 결과 + 원문 근거 + 검토 항목</span></footer>
    </>}
    {busy && <div className="pt-busy" role="status"><span className="pt-spinner" /><strong>{busy}</strong><progress max="1" value={progress} /><button onClick={() => { job.current++; loadAbort.current?.abort(); void ocr.current?.close(); }}>취소</button></div>}
    {dropping && <div className="pt-drop-overlay"><Icon name="upload" /><strong>PDF를 놓으면 작업대에 추가합니다</strong></div>}
    {error && <div className="pt-message pt-error" role="alert"><span>{error}</span><button aria-label="오류 메시지 닫기" onClick={() => setError("")}><Icon name="close" /></button></div>}
    <div className="pt-live" aria-live="polite">{notice}</div>
    <div className="pt-example-actions"><button disabled={!!busy} onClick={() => void demo()}>입고 내역 예제 열기</button><button disabled={!!busy} onClick={() => void demo(true)}>스캔본 예제 열기</button></div><div className="pt-privacy-note">선택한 문서는 서버로 전송하지 않습니다. 새로고침하면 작업이 사라지므로 결과와 설정을 저장해야 합니다. 회사 자료는 사용이 허용된 도구인지 먼저 확인해 주세요</div>
  </div>;
}
