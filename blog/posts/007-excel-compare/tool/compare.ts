export type Value = string | number | boolean | null;
export type Cell = { value: Value; kind: "text" | "number" | "boolean" | "date" | "blank" };
export type Table = { headers: string[]; rows: Cell[][]; rowNumbers: number[] };
export type Change = { status: "변경" | "추가" | "삭제"; key: string; column: string; before: Cell; after: Cell; beforeRow: number | null; afterRow: number | null };
export type Comparison = { changes: Change[]; added: number; removed: number; changed: number; unchanged: number; comparedColumns: string[]; ignoredBefore: string[]; ignoredAfter: string[] };
export const blank: Cell = { value: null, kind: "blank" };
export const textCell = (value: string): Cell => ({ value, kind: "text" });
export const display = (cell: Cell) => cell.kind === "blank" ? "(빈칸)" : String(cell.value);

function token(cell: Cell, trim: boolean) {
  return [cell.kind, trim && cell.kind === "text" ? String(cell.value).trim() : cell.value];
}

export function compareTables(before: Table, after: Table, keys: string[], columns: string[], trim = false): Comparison {
  if (!keys.length) throw new Error("같은 항목을 찾을 기준 열을 하나 이상 고르세요");
  if (!columns.length) throw new Error("비교할 값 열을 하나 이상 고르세요");
  for (const name of [...keys, ...columns]) {
    if (!before.headers.includes(name) || !after.headers.includes(name)) throw new Error(`두 파일에 모두 있는 열을 고르세요: ${name}`);
  }
  if (columns.some(name => keys.includes(name))) throw new Error("기준 열과 비교할 값 열은 나눠서 고르세요");
  const index = (table: Table, label: string) => {
    const found = new Map<string, { cells: Cell[]; row: number; label: string }>();
    const positions = keys.map(name => table.headers.indexOf(name));
    table.rows.forEach((cells, i) => {
      const values = positions.map(position => cells[position] ?? blank);
      if (values.some(cell => cell.value === null || (cell.kind === "text" && !String(cell.value).trim()))) {
        throw new Error(`${label} ${table.rowNumbers[i]}행의 기준 값이 비어 있습니다. 기준 열 ${keys.join(" + ")}을 채운 뒤 다시 비교하세요`);
      }
      const key = JSON.stringify(values.map(cell => token(cell, trim)));
      const duplicate = found.get(key);
      if (duplicate) throw new Error(`${label} 기준 값 ${values.map(display).join(" / ")}이 ${duplicate.row}행과 ${table.rowNumbers[i]}행에 중복됩니다. 창고처럼 항목을 구별할 열을 기준에 더 고르세요`);
      found.set(key, { cells, row: table.rowNumbers[i], label: values.length === 1 ? display(values[0]) : JSON.stringify(values.map(display)) });
    });
    return found;
  };
  const oldRows = index(before, "이전 파일");
  const newRows = index(after, "이후 파일");
  const result: Comparison = {
    changes: [], added: 0, removed: 0, changed: 0, unchanged: 0, comparedColumns: columns,
    ignoredBefore: before.headers.filter(name => !after.headers.includes(name)),
    ignoredAfter: after.headers.filter(name => !before.headers.includes(name)),
  };
  const oldPositions = columns.map(name => before.headers.indexOf(name));
  const newPositions = columns.map(name => after.headers.indexOf(name));
  for (const [id, old] of oldRows) {
    const next = newRows.get(id);
    if (!next) {
      result.removed++;
      columns.forEach((column, i) => result.changes.push({ status: "삭제", key: old.label, column, before: old.cells[oldPositions[i]] ?? blank, after: blank, beforeRow: old.row, afterRow: null }));
      continue;
    }
    let changed = false;
    columns.forEach((column, i) => {
      const left = old.cells[oldPositions[i]] ?? blank;
      const right = next.cells[newPositions[i]] ?? blank;
      if (JSON.stringify(token(left, trim)) === JSON.stringify(token(right, trim))) return;
      changed = true;
      result.changes.push({ status: "변경", key: old.label, column, before: left, after: right, beforeRow: old.row, afterRow: next.row });
    });
    if (changed) result.changed++;
    else result.unchanged++;
  }
  for (const [id, next] of newRows) {
    if (oldRows.has(id)) continue;
    result.added++;
    columns.forEach((column, i) => result.changes.push({ status: "추가", key: next.label, column, before: blank, after: next.cells[newPositions[i]] ?? blank, beforeRow: null, afterRow: next.row }));
  }
  return result;
}

export function sampleTables(): [Table, Table] {
  const headers = ["상품코드", "상품명", "재고", "단가", "담당자"];
  const make = (rows: Value[][]): Table => ({ headers, rows: rows.map(row => row.map(value => ({ value, kind: typeof value === "number" ? "number" : "text" }))), rowNumbers: rows.map((_, i) => i + 2) });
  return [
    make([["0012", "무선 마우스", 30, 18000, "김민수"], ["0013", "키보드", 15, 45000, "이서연"], ["0014", "USB 허브", 8, 25000, "박지훈"], ["0015", "모니터 받침대", 12, 32000, "김민수"]]),
    make([["0013", "키보드", 15, 45000, "이서연"], ["0012", "무선 마우스", 24, 19000, "김민수"], ["0015", "모니터 받침대", 12, 32000, "김민수"], ["0016", "노트북 거치대", 20, 28000, "박지훈"]]),
  ];
}
