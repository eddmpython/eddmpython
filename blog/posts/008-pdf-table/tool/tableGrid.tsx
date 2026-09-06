import { useEffect, useRef, useState } from "react";
import type { Cell, Extracted, Region } from "./model";
export type Pick = { row: number; column: number };
type Props = { table: Extracted; picked?: Pick; extent?: Pick; onPick: (cell: Cell, extend: boolean) => void; onChange: (region: Region) => void; onlyIssues: boolean };
export function TableGrid({ table, picked, extent, onPick, onChange, onlyIssues }: Props) {
  const { region } = table;
  const [editing, setEditing] = useState<string | null>(null), [value, setValue] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  useEffect(() => { setEditing(null); }, [region.id]);
  const save = () => {
    if (editing !== null) onChange({ ...region, edits: { ...region.edits, [editing]: value }, reviewed: region.reviewed.filter(key => key !== editing) });
    setEditing(null);
  };
  const selected = (cell: Cell) => {
    if (!picked) return false;
    const end = extent ?? picked;
    return cell.row >= Math.min(picked.row, end.row) && cell.row <= Math.max(picked.row, end.row) && cell.column >= Math.min(picked.column, end.column) && cell.column <= Math.max(picked.column, end.column);
  };
  return <div className="pt-grid-scroll" data-pdf-grid>
    <table className="pt-grid" aria-label="추출한 표">
      <thead><tr><th className="pt-row-number">행</th>{table.headers.map((name, c) => <th key={c}><input aria-label={`${c + 1}열 이름`} value={name} maxLength={200} onChange={event => { const names = [...table.headers]; names[c] = event.target.value; onChange({ ...region, names }); }} /><button className={region.numberColumns.includes(c) ? "pt-number-active" : ""} aria-label={`${name} 숫자 열`} aria-pressed={region.numberColumns.includes(c)} title="숫자로 읽고 합계 확인" onClick={() => onChange({ ...region, numberColumns: region.numberColumns.includes(c) ? region.numberColumns.filter(i => i !== c) : [...region.numberColumns, c] })}>123</button></th>)}</tr></thead>
      <tbody>{table.cells.map((row, r) => {
        if (r < region.headerRows || (onlyIssues && !row.some(cell => cell.flags.length && !cell.reviewed))) return null;
        const omitted = region.omitted.includes(r);
        return <tr key={r} className={omitted ? "pt-row-omitted" : ""}><th className="pt-row-number"><button aria-label={`${r + 1}행 ${omitted ? "포함" : "제외"}`} title={omitted ? "결과에 다시 포함" : "반복 제목이나 합계 행 제외"} onClick={() => onChange({ ...region, omitted: omitted ? region.omitted.filter(i => i !== r) : [...region.omitted, r] })}>{r + 1}</button></th>{row.map(cell => cell.hidden ? null : <td key={cell.column} rowSpan={cell.rowSpan} colSpan={cell.colSpan} data-cell={cell.key} className={[selected(cell) ? "pt-cell-picked" : "", cell.flags.length && !cell.reviewed ? "pt-cell-issue" : "", cell.edited ? "pt-cell-edited" : ""].join(" ")}>
          {editing === cell.key ? <textarea ref={input} value={value} aria-label={`${r + 1}행 ${cell.column + 1}열 수정`} onChange={e => setValue(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); setEditing(null); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }} /> : <button className="pt-cell-value" onClick={e => onPick(cell, e.shiftKey)} onDoubleClick={() => { setEditing(cell.key); setValue(cell.value); }} onKeyDown={e => { if (e.key === "F2" || e.key === "Enter") { e.preventDefault(); setEditing(cell.key); setValue(cell.value); } }} title={`${cell.flags.join(" · ")}${cell.flags.length ? " · " : ""}두 번 누르면 수정`}>{cell.value || <span className="pt-empty-value">비어 있음</span>}</button>}
          {cell.flags.length > 0 && !cell.reviewed && <span className="pt-cell-mark" aria-label={cell.flags.join(", ")}>!</span>}
          {cell.edited && <span className="pt-edited-mark" aria-label="직접 수정" />}
        </td>)}</tr>;
      })}</tbody>
    </table>
    {onlyIssues && !table.issues.length && <div className="pt-grid-empty">표시된 확인 항목이 없습니다. 모든 값의 정확성이 보장된다는 뜻은 아닙니다.</div>}
    {!table.data.length && !onlyIssues && <div className="pt-grid-empty">결과에 포함된 행이 없습니다. 제목 행 수와 제외한 행을 확인해 주세요</div>}
  </div>;
}
