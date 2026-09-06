import { useEffect, useMemo, useRef, useState } from "react";
import { display, type Cell, type Comparison, type Table } from "./compare.ts";
import type { Request } from "./worker.ts";
import { limits } from "./limits.ts";
import "./style.css";

type Loaded = { fileName: string; bytes: ArrayBuffer; sheetNames: string[]; sheetName: string; headerRow: number; table: Table | null };
type Parsed = { sheetNames: string[]; sheetName: string; table: Table };
const names = ["이전 파일", "이후 파일"];

function work<T>(request: Request, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("작업을 취소했습니다")); return; }
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); worker.terminate(); };
    const cancel = () => { finish(); reject(new Error("작업을 취소했습니다")); };
    const timer = setTimeout(() => { finish(); reject(new Error("30초 안에 처리하지 못했습니다. 필요한 시트와 행만 남긴 복사본으로 다시 시도하세요")); }, 30000);
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = ({ data }) => { finish(); if (data.ok) resolve(data.result); else reject(new Error(data.error)); };
    worker.onerror = () => { finish(); reject(new Error("파일 처리기를 시작하지 못했습니다. 페이지를 새로 열고 다시 시도하세요")); };
    worker.postMessage(request);
  });
}

function download(bytes: ArrayBuffer, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ValueCell({ cell }: { cell: Cell }) {
  const kind = { text: "문자", number: "숫자", boolean: "논리", date: "날짜", blank: "" }[cell.kind];
  return <><span className="xc-value">{display(cell)}</span>{kind && <small>{kind}</small>}</>;
}

export default function ExcelComparison() {
  const [files, setFiles] = useState<Array<Loaded | null>>([null, null]);
  const [keys, setKeys] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [trim, setTrim] = useState(false);
  const [result, setResult] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [inputVersion, setInputVersion] = useState(0);
  const active = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const before = files[0]?.table;
  const after = files[1]?.table;
  const common = useMemo(() => before && after ? before.headers.filter(name => after.headers.includes(name)) : [], [before, after]);
  useEffect(() => {
    const first = common.find(name => /^(상품코드|주문번호|사번|id)$/i.test(name)) ?? common[0];
    setKeys(first ? [first] : []); setColumns(common.filter(name => name !== first)); setResult(null);
  }, [common]);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { setResult(null); setStatus(""); setError(""); }, [keys, columns, trim]);
  useEffect(() => { setPage(0); }, [filter, query, result]);

  async function job(label: string, task: (signal: AbortSignal) => Promise<void>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller; setBusy(label); setError(""); setStatus("");
    try { await task(controller.signal); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "처리하지 못했습니다"); }
    finally { active.current = null; setBusy(""); }
  }

  function reset() {
    setFiles([null, null]); setResult(null); setError(""); setStatus("선택한 파일과 결과를 메모리에서 지웠습니다");
    setQuery(""); setFilter("전체"); setInputVersion(value => value + 1);
  }

  async function openFile(file: File, side: number) {
    setResult(null);
    setFiles(current => current.map((item, i) => i === side ? null : item));
    await job(`${names[side]} 읽는 중`, async signal => {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("암호가 없는 .xlsx 파일을 골라 주세요. .xls와 CSV는 지원하지 않습니다");
      if (file.size > limits.bytes) throw new Error(`파일 하나는 ${limits.bytes / 1024 / 1024}MB까지 받습니다. 필요한 시트만 새 파일에 저장하세요`);
      const bytes = await file.arrayBuffer();
      const sheetNames = await work<string[]>({ kind: "names", bytes }, signal);
      const loaded: Loaded = { fileName: file.name, bytes, headerRow: 1, sheetNames, sheetName: sheetNames[0] ?? "", table: null };
      setFiles(current => current.map((item, i) => i === side ? loaded : item));
      const parsed = await work<Parsed>({ kind: "read", bytes, headerRow: 1 }, signal);
      setFiles(current => current.map((item, i) => i === side ? { ...loaded, ...parsed } : item));
    });
  }

  async function chooseSheet(side: number, sheetName: string, headerRow: number) {
    const file = files[side]; if (!file) return;
    const updated = { ...file, sheetName, headerRow, table: null };
    setFiles(current => current.map((item, i) => i === side ? updated : item));
    setResult(null);
    await job(`${names[side]}의 표 읽는 중`, async signal => {
      const parsed = await work<Parsed>({ kind: "read", bytes: file.bytes, sheetName, headerRow }, signal);
      setFiles(current => current.map((item, i) => i === side ? { ...updated, ...parsed } : item));
    });
  }

  async function loadSample() {
    setResult(null);
    await job("예제 파일 읽는 중", async signal => {
      const loaded: Loaded[] = [];
      for (const side of [0, 1]) {
        const bytes = await work<ArrayBuffer>({ kind: "sample", side }, signal);
        const parsed = await work<Parsed>({ kind: "read", bytes, headerRow: 1 }, signal);
        loaded.push({ fileName: side === 0 ? "재고_이전.xlsx" : "재고_이후.xlsx", bytes, headerRow: 1, ...parsed });
      }
      setFiles(loaded); setTrim(false); setQuery(""); setFilter("전체");
    });
  }

  async function compare() {
    if (!before || !after) return;
    setResult(null);
    await job("변경 내역 찾는 중", async signal => {
      const comparison = await work<Comparison>({ kind: "compare", before, after, keys, columns, trim }, signal).catch(cause => {
        const message = cause instanceof Error ? cause.message : "비교하지 못했습니다";
        throw new Error(message.replace(/^이전 파일/, `이전 파일 ${files[0]!.fileName}`).replace(/^이후 파일/, `이후 파일 ${files[1]!.fileName}`));
      });
      setResult(comparison);
      setStatus(`비교 완료. 변경 ${comparison.changed}개, 추가 ${comparison.added}개, 삭제 ${comparison.removed}개, 동일 ${comparison.unchanged}개 항목`);
      requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
    });
  }

  const visible = useMemo(() => result?.changes.filter(change => (filter === "전체" || change.status === filter)
    && (!query || [change.key, change.column, display(change.before), display(change.after)].some(value => value.toLocaleLowerCase().includes(query.toLocaleLowerCase())))) ?? [], [result, filter, query]);

  return <section id="excel-compare" className="excel-compare" data-excel-compare aria-label="엑셀 파일 비교 도구">
    <header className="xc-heading">
      <div><span className="xc-eyebrow">EXCEL DIFF</span><h2>두 파일 사이,<br />달라진 값만.</h2><p>상품코드·주문번호로 행을 맞추고 변경 내역을 받습니다.</p></div>
      <span className="xc-private">파일 전송 없이<br />내 브라우저에서 비교</span>
    </header>
    <div className="xc-start">
      <button type="button" className="xc-primary" onClick={loadSample} disabled={Boolean(busy)}>예제로 시작</button>
      <span>실제 재고가 아닌 연습용 파일 두 개를 불러옵니다.</span>
    </div>
    <div className="xc-files">
      {files.map((file, side) => <div className="xc-file" key={side}>
        <label className="xc-file-label"><span className="xc-number">0{side + 1}</span><strong>{names[side]}</strong><input key={inputVersion} type="file" accept=".xlsx" aria-label={names[side]} disabled={Boolean(busy)} onChange={event => { const selected = event.target.files?.[0]; if (selected) void openFile(selected, side); event.target.value = ""; }} /></label>
        <p className="xc-filename">{file?.fileName || `.xlsx 파일 선택 · 최대 ${limits.bytes / 1024 / 1024}MB`}</p>
        <button type="button" className="xc-link" disabled={Boolean(busy)} onClick={() => job("예제 내려받기 준비", async signal => download(await work<ArrayBuffer>({ kind: "sample", side }, signal), side === 0 ? "재고_이전.xlsx" : "재고_이후.xlsx"))}>{names[side]} 예제 내려받기</button>
        {file && <div className="xc-sheet">
          <label>시트<select aria-label={`${names[side]} 시트`} value={file.sheetName} disabled={Boolean(busy) || !file.sheetNames.length} onChange={event => chooseSheet(side, event.target.value, file.headerRow)}>{file.sheetNames.map(name => <option key={name}>{name}</option>)}</select></label>
          <label>제목 행<select aria-label={`${names[side]} 제목 행`} value={file.headerRow} disabled={Boolean(busy)} onChange={event => chooseSheet(side, file.sheetName, Number(event.target.value))}>{Array.from({ length: limits.headerRows }, (_, i) => <option key={i} value={i + 1}>{i + 1}행</option>)}</select></label>
        </div>}
        {file?.table && <p className="xc-count">데이터 {file.table.rows.length.toLocaleString()}행 · {file.table.headers.length}열</p>}
      </div>)}
    </div>
    {!(before && after) && files.some(Boolean) && <button type="button" onClick={reset} disabled={Boolean(busy)}>파일과 결과 지우기</button>}
    <p className="xc-note">수식·병합 셀·암호 파일은 받지 않습니다. 셀의 값과 자료형만 비교하며 색·글꼴·표시 형식은 비교하지 않습니다.</p>
    {before && after && <div className="xc-settings" data-excel-settings>
      <fieldset disabled={Boolean(busy)}><legend><span className="xc-number">03</span> 같은 항목을 찾을 기준 열</legend><p>한 상품을 구별하는 열을 고르세요. 필요한 경우 여러 열을 함께 고릅니다.</p><div className="xc-options">{common.map(name => <label key={name}><input type="checkbox" checked={keys.includes(name)} onChange={event => { const next = event.target.checked ? [...keys, name] : keys.filter(key => key !== name); setKeys(next); setColumns(common.filter(column => !next.includes(column))); }} />{name}</label>)}</div></fieldset>
      <fieldset disabled={Boolean(busy)}><legend>비교할 값 열</legend><div className="xc-options">{common.filter(name => !keys.includes(name)).map(name => <label key={name}><input type="checkbox" checked={columns.includes(name)} onChange={event => setColumns(current => event.target.checked ? [...current, name] : current.filter(column => column !== name))} />{name}</label>)}</div></fieldset>
      {!common.length && <p role="alert">이름이 같은 열이 없습니다. 두 파일의 제목 행과 열 이름을 확인하세요</p>}
      {(before.headers.some(name => !after.headers.includes(name)) || after.headers.some(name => !before.headers.includes(name))) && <p className="xc-warning">한쪽에만 있는 열은 값 비교에서 제외합니다. 이전에만: {before.headers.filter(name => !after.headers.includes(name)).join(", ") || "없음"} / 이후에만: {after.headers.filter(name => !before.headers.includes(name)).join(", ") || "없음"}</p>}
      <label className="xc-trim"><input type="checkbox" disabled={Boolean(busy)} checked={trim} onChange={event => setTrim(event.target.checked)} />문자 앞뒤 공백 무시 <small>기준 값에도 적용</small></label>
      <details className="xc-preview"><summary>읽은 표 확인</summary>{files.map((file, side) => file?.table && <div key={side}><h3>{names[side]} · 처음 세 행</h3><div className="xc-scroll" tabIndex={0}><table><thead><tr><th>원본 행</th>{file.table.headers.map(name => <th key={name}>{name}</th>)}</tr></thead><tbody>{file.table.rows.slice(0, 3).map((row, i) => <tr key={i}><th>{file.table!.rowNumbers[i]}</th>{row.map((cell, c) => <td key={c}><ValueCell cell={cell} /></td>)}</tr>)}</tbody></table></div></div>)}</details>
      <div className="xc-actions"><button type="button" className="xc-primary" disabled={Boolean(busy) || !keys.length || !columns.length} onClick={compare}>변경 내역 찾기 <span aria-hidden="true">↗</span></button><button type="button" onClick={reset} disabled={Boolean(busy)}>파일과 결과 지우기</button></div>
    </div>}
    {busy && <div className="xc-status" role="status">{busy}<button type="button" onClick={() => active.current?.abort()}>취소</button></div>}
    {error && <p className="xc-warning" role="alert">{error}</p>}
    <p className="xc-live" aria-live="polite">{status}</p>
    {result && <div className="xc-result" data-excel-result ref={resultRef} tabIndex={-1}>
      <div className="xc-summary">{[["변경", result.changed], ["추가", result.added], ["삭제", result.removed], ["동일", result.unchanged]].map(([label, value]) => <div key={label}><span>{label} 항목</span><strong>{Number(value).toLocaleString()}</strong></div>)}</div>
      <div className="xc-result-heading"><h3>값별 변경 내역</h3><button type="button" className="xc-primary" disabled={Boolean(busy)} onClick={() => job("결과 파일 준비 중", async signal => {
        const bytes = await work<ArrayBuffer>({ kind: "report", result, info: { before: `${files[0]!.fileName} / ${files[0]!.sheetName} / 제목 ${files[0]!.headerRow}행`, after: `${files[1]!.fileName} / ${files[1]!.sheetName} / 제목 ${files[1]!.headerRow}행`, keys, trim } }, signal);
        download(bytes, "엑셀_변경내역.xlsx"); setStatus("엑셀_변경내역.xlsx 다운로드를 시작했습니다");
      })}>전체 결과 .xlsx 내려받기</button></div>
      <p className="xc-note">항목 수는 기준 값으로 셉니다. 아래는 값 하나당 한 줄이며 추가·삭제는 선택한 값 열을 모두 보여 줍니다. 다운로드에는 검색과 관계없이 전체 내역과 비교 설정이 담깁니다.</p>
      <div className="xc-filters"><div aria-label="변경 종류">{["전체", "변경", "추가", "삭제"].map(name => <button type="button" key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}</div><input type="search" placeholder="상품코드, 열 이름, 값 검색" aria-label="변경 내역 검색" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="xc-scroll" tabIndex={0} aria-label="값별 변경 내역 표"><table><thead><tr><th>구분</th><th>기준 값</th><th>열 이름</th><th>이전 값</th><th>이후 값</th><th>원본 행<br />이전 / 이후</th></tr></thead><tbody>{visible.slice(page * 50, (page + 1) * 50).map((change, i) => <tr key={`${page}-${i}`}><td><span className={`xc-tag ${change.status === "변경" ? "xc-changed" : ""}`}>{change.status}</span></td><th>{change.key}</th><td>{change.column}</td><td><ValueCell cell={change.before} /></td><td className={change.status === "변경" ? "xc-new" : ""}><ValueCell cell={change.after} /></td><td>{change.beforeRow ?? "없음"} / {change.afterRow ?? "없음"}</td></tr>)}</tbody></table></div>
      {!visible.length && <p className="xc-empty">{result.changes.length ? "검색 조건에 맞는 내역이 없습니다." : "선택한 기준과 값 열에서 변경 내역이 없습니다."}</p>}
      <div className="xc-pagination"><span>{visible.length.toLocaleString()}줄 중 {visible.length ? page * 50 + 1 : 0}~{Math.min((page + 1) * 50, visible.length)}줄</span><div><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>이전</button><button type="button" disabled={(page + 1) * 50 >= visible.length} onClick={() => setPage(value => value + 1)}>다음</button></div></div>
    </div>}
    <footer className="xc-footnote">한 시트씩 비교 · 최대 {limits.rows.toLocaleString()}행 / {limits.columns}열 / {limits.cells.toLocaleString()}칸 · 파일은 서버로 전송하거나 브라우저 저장소에 보관하지 않습니다. 기밀 파일은 회사의 도구 사용 규정을 먼저 확인하세요</footer>
  </section>;
}
