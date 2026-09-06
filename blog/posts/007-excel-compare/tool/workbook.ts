import * as XLSX from "../../../../site/src/spreadsheet.ts";
import { blank, type Cell, type Table, type Comparison, type Value } from "./compare.ts";
import { limits } from "./limits.ts";

/** 압축 해제 전에 ZIP 중앙 디렉터리의 선언 크기를 제한한다. */
export function checkArchive(bytes: ArrayBuffer) {
  if (bytes.byteLength > limits.bytes) throw new Error("파일 하나는 10MB까지 받습니다. 비교할 시트만 새 .xlsx 파일로 저장하세요");
  const view = new DataView(bytes);
  if (bytes.byteLength < 22 || view.getUint32(0, true) !== 0x04034b50) throw new Error("암호가 없는 .xlsx 파일을 골라 주세요. .xls와 CSV는 지원하지 않습니다");
  let end = bytes.byteLength - 22;
  while (end >= Math.max(0, bytes.byteLength - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.byteLength - 65557)) throw new Error("파일의 압축 목록이 깨져 있습니다. Excel에서 다시 저장하세요");
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  let total = 0;
  if (count > 10000 || view.getUint16(end + 4, true) !== 0) throw new Error("분할 또는 대형 압축 파일은 지원하지 않습니다");
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("파일의 압축 목록을 읽지 못했습니다");
    total += view.getUint32(cursor + 24, true);
    if (total > 80 * 1024 * 1024) throw new Error("압축을 푼 내용이 80MB를 넘습니다. 비교할 시트만 새 파일로 저장하세요");
    cursor += 46 + view.getUint16(cursor + 28, true) + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }
}

function cellValue(cell: XLSX.CellObject | undefined, address: string): Cell {
  if (cell?.f) throw new Error(`${address}에 수식이 있습니다. 원본의 복사본에서 값을 붙여넣고 저장한 뒤 비교하세요`);
  if (!cell || cell.t === "z" || cell.v === undefined || cell.v === null || cell.v === "") return blank;
  if (cell.t === "e") throw new Error(`${address}에 Excel 오류 값이 있습니다. 원본에서 오류를 확인하세요`);
  if (cell.t === "d") {
    const date = cell.v instanceof Date ? cell.v : new Date(String(cell.v));
    if (!Number.isFinite(date.getTime())) throw new Error(`${address}의 날짜를 읽지 못했습니다`);
    return { kind: "date", value: date.toISOString() };
  }
  if (cell.t === "n") return { kind: "number", value: Number(cell.v) };
  if (cell.t === "b") return { kind: "boolean", value: Boolean(cell.v) };
  return { kind: "text", value: String(cell.v) };
}

export function sheetNames(bytes: ArrayBuffer): string[] {
  checkArchive(bytes);
  return XLSX.read(bytes, { type: "array", bookSheets: true }).SheetNames;
}

export function readWorkbook(bytes: ArrayBuffer, sheetName?: string, headerRow = 1) {
  checkArchive(bytes);
  if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow > limits.headerRows) throw new Error(`제목 행은 1~${limits.headerRows} 사이로 지정하세요`);
  const names = sheetNames(bytes);
  const name = sheetName || names[0];
  if (!names.includes(name)) throw new Error("선택한 시트를 찾지 못했습니다");
  const book = XLSX.read(bytes, { type: "array", sheets: [name], cellDates: true, cellFormula: true, sheetRows: limits.rows + headerRow + 1 });
  const sheet = book.Sheets[name];
  if (!sheet?.["!ref"]) throw new Error("시트에 표가 없습니다");
  const range = XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"]);
  if (range.e.r + 1 - headerRow > limits.rows || range.e.c + 1 > limits.columns || (range.e.r + 1) * (range.e.c + 1) > limits.cells) {
    throw new Error("시트 하나는 데이터 20,000행, 100열, 300,000칸까지 비교합니다. 필요한 범위만 새 파일에 저장하세요");
  }
  if (sheet["!merges"]?.some(merge => merge.e.r >= headerRow - 1)) throw new Error("표에 병합 셀이 있습니다. 원본 복사본에서 병합을 풀고 빈 기준 값을 채워 주세요");
  const headers: string[] = [];
  for (let c = 0; c <= range.e.c; c++) {
    const address = XLSX.utils.encode_cell({ r: headerRow - 1, c });
    const cell = cellValue(sheet[address], address);
    const header = cell.value === null ? "" : String(cell.value).trim();
    if (!header) throw new Error(`${address}의 열 이름이 비어 있습니다. 제목 행 번호를 확인하거나 열 이름을 채워 주세요`);
    if (headers.includes(header)) throw new Error(`열 이름 ${header}이 중복됩니다. 열마다 다른 이름을 넣어 주세요`);
    headers.push(header);
  }
  const table: Table = { headers, rows: [], rowNumbers: [] };
  for (let r = headerRow; r <= range.e.r; r++) {
    const row = headers.map((_, c) => { const address = XLSX.utils.encode_cell({ r, c }); return cellValue(sheet[address], address); });
    if (row.every(cell => cell.value === null)) continue;
    table.rows.push(row);
    table.rowNumbers.push(r + 1);
  }
  if (!table.rows.length) throw new Error("제목 아래에 비교할 데이터가 없습니다");
  return { sheetNames: names, sheetName: name, table };
}

function workbookBytes(sheets: Array<{ name: string; rows: Value[][] }>) {
  const book = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    // 문자열은 수식이 아닌 문자열 셀로 기록한다. CSV 수식 실행과 코드 앞자리 손실을 피한다.
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = (rows[0] ?? []).map(() => ({ wch: 22 }));
    if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  return XLSX.write(book, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
}

export const tableBytes = (table: Table) => workbookBytes([{ name: "재고", rows: [table.headers, ...table.rows.map(row => row.map(cell => cell.value))] }]);

export function reportBytes(result: Comparison, info: { before: string; after: string; keys: string[]; trim: boolean }) {
  return workbookBytes([
    { name: "비교 설정", rows: [["항목", "내용"], ["이전 파일과 시트", info.before], ["이후 파일과 시트", info.after], ["기준 열", info.keys.join(" + ")], ["비교한 값 열", result.comparedColumns.join(", ")], ["앞뒤 공백 무시", info.trim ? "켬" : "끔"], ["추가 항목", result.added], ["삭제 항목", result.removed], ["변경 항목", result.changed], ["동일 항목", result.unchanged], ["이전 파일에만 있는 열 (비교 제외)", result.ignoredBefore.join(", ")], ["이후 파일에만 있는 열 (비교 제외)", result.ignoredAfter.join(", ")]] },
    { name: "변경 내역", rows: [["구분", "기준 값", "열 이름", "이전 값", "이후 값", "이전 자료형", "이후 자료형", "이전 행", "이후 행"], ...result.changes.map(change => [change.status, change.key, change.column, change.before.value, change.after.value, change.before.kind, change.after.kind, change.beforeRow, change.afterRow])] },
  ]);
}
