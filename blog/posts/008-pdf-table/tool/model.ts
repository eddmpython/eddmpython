export type Box = { x: number; y: number; width: number; height: number };
export type Word = Box & { id: string; text: string; confidence?: number };
export type PageData = { id: string; fileId: string; fileName: string; number: number; width: number; height: number; words: Word[]; method: "text" | "ocr" };
export type Merge = { row: number; column: number; rows: number; columns: number };
export type Region = {
  id: string; pageId: string; name: string; box: Box; columns: number[]; rows: number[];
  headerRows: number; omitted: number[]; edits: Record<string, string>; reviewed: string[];
  merges: Merge[]; names: string[]; numberColumns: number[]; checks: Record<string, string>;
};
export type Cell = { key: string; row: number; column: number; value: string; original: string; box: Box; words: Word[]; flags: string[]; edited: boolean; reviewed: boolean; rowSpan: number; colSpan: number; hidden: boolean };
export type Extracted = { region: Region; page: PageData; cells: Cell[][]; headers: string[]; data: Cell[][]; issues: Cell[]; totals: { column: number; actual: number; expected: number | null; matches: boolean | null; invalid: number }[] };

export const limits = { files: 20, fileBytes: 30 * 1024 * 1024, totalBytes: 100 * 1024 * 1024, pages: 200, words: 60000, regions: 100, columns: 40, rows: 2000, recipeBytes: 1024 * 1024, renderPixels: 12000000, history: 60 };
export const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
export const right = (b: Box) => b.x + b.width;
export const bottom = (b: Box) => b.y + b.height;
export const cellKey = (row: number, column: number) => `${row}:${column}`;
export const within = (w: Box, b: Box) => w.x + w.width / 2 >= b.x && w.x + w.width / 2 <= right(b) && w.y + w.height / 2 >= b.y && w.y + w.height / 2 <= bottom(b);
export function boxFrom(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  const x = clamp(Math.min(a.x, b.x)), y = clamp(Math.min(a.y, b.y));
  return { x, y, width: clamp(Math.max(a.x, b.x)) - x, height: clamp(Math.max(a.y, b.y)) - y };
}
export function union(boxes: Box[]): Box {
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return { x, y, width: Math.max(...boxes.map(right)) - x, height: Math.max(...boxes.map(bottom)) - y };
}
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0.01;
}
export function wordLines(words: Word[]): Word[][] {
  const lines: Word[][] = [];
  const centers: number[] = [];
  const tolerance = Math.max(0.002, median(words.map(w => w.height)) * 0.55);
  for (const word of [...words].sort((a, b) => a.y + a.height / 2 - b.y - b.height / 2 || a.x - b.x)) {
    const line = lines.at(-1);
    const center = word.y + word.height / 2;
    if (line && Math.abs(center - centers[centers.length - 1]) < tolerance) {
      centers[centers.length - 1] = (centers[centers.length - 1] * line.length + center) / (line.length + 1);
      line.push(word);
    } else { lines.push([word]); centers.push(center); }
  }
  return lines.map(line => line.sort((a, b) => a.x - b.x));
}
export function inferRows(page: PageData, box: Box): number[] {
  const lines = wordLines(page.words.filter(word => within(word, box)));
  return lines.slice(1).map((line, index) => (Math.min(...line.map(w => w.y)) + Math.max(...lines[index].map(bottom))) / 2).filter(y => y > box.y && y < bottom(box));
}
export function inferColumns(page: PageData, box: Box): number[] {
  const lines = wordLines(page.words.filter(word => within(word, box)));
  const useful = lines.filter(line => line.length > 1);
  if (!useful.length) return [];
  const bins = 200;
  const clear = Array.from({ length: bins }, (_, i) => {
    const x = box.x + box.width * (i + 0.5) / bins;
    return useful.filter(line => !line.some(w => x >= w.x - 0.002 && x <= right(w) + 0.002)).length / useful.length >= 0.8;
  });
  const cuts: number[] = [];
  let start = -1;
  for (let i = 0; i <= bins; i++) {
    if (i < bins && clear[i]) { if (start < 0) start = i; }
    else if (start >= 0) {
      if (start > 0 && i < bins && i - start >= 3) cuts.push(box.x + box.width * (start + i) / 2 / bins);
      start = -1;
    }
  }
  return cuts.slice(0, limits.columns - 1);
}
export function makeRegion(page: PageData, box: Box, id: string, name: string): Region {
  return { id, pageId: page.id, name, box, columns: inferColumns(page, box), rows: inferRows(page, box).slice(0, limits.rows - 1), headerRows: 1, omitted: [], edits: {}, reviewed: [], merges: [], names: [], numberColumns: [], checks: {} };
}
export function suggestBox(page: PageData): Box | null {
  const all = wordLines(page.words);
  const runs: number[][] = [];
  for (const [i, line] of all.entries()) {
    if (line.filter(word => numberValue(word.text) !== null).length < 2 || union(line).width < 0.25) continue;
    const last = runs.at(-1);
    if (last?.at(-1) === i - 1) last.push(i); else runs.push([i]);
  }
  const run = runs.sort((a, b) => b.length - a.length)[0];
  let lines = all.filter(line => line.length >= 3);
  if (run && run.length >= 2) {
    const first = run[0], previous = all[first - 1];
    const gap = union(all[run[1]]).y - union(all[first]).y;
    const header = previous && previous.length >= 3 && union(all[first]).y - bottom(union(previous)) < gap * 1.5;
    lines = all.slice(header ? first - 1 : first, run.at(-1)! + 1);
  }
  if (lines.length < 2) return null;
  const box = union(lines.flat());
  return { x: clamp(box.x - 0.012), y: clamp(box.y - 0.008), width: Math.min(1 - clamp(box.x - 0.012), box.width + 0.024), height: Math.min(1 - clamp(box.y - 0.008), box.height + 0.016) };
}
function numericText(value: string): string | null {
  let text = value.trim();
  if (!text || text.length > 120) return null;
  const negative = /^\([\s\S]*\)$/.test(text);
  if (negative) text = text.slice(1, -1).trim();
  text = text.replace(/^[₩$€¥]\s*/, "");
  if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(text)) return null;
  text = text.replaceAll(",", "");
  if (negative && /^[+-]/.test(text)) return null;
  return negative ? `-${text}` : text;
}
export function numberValue(value: string): number | null {
  const text = numericText(value);
  if (text === null) return null;
  const n = Number(text);
  return Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER ? n : null;
}
function exactTotal(values: string[], expected: string): { actual: number; matches: boolean } {
  const parsed = [...values, expected].map(value => numericText(value) ?? "0");
  const scale = Math.max(...parsed.map(value => value.split(".")[1]?.length ?? 0));
  const units = parsed.map(value => {
    const negative = value.startsWith("-"), [whole, fraction = ""] = value.replace(/^[+-]/, "").split(".");
    return BigInt(whole + fraction.padEnd(scale, "0")) * (negative ? -1n : 1n);
  });
  const target = units.pop()!, sum = units.reduce((a, b) => a + b, 0n);
  return { actual: Number(sum) / 10 ** scale, matches: sum === target };
}
function textOf(words: Word[]): string {
  return wordLines(words).map(line => line.map(w => w.text).join(" ").trim()).join("\n");
}
export function extract(page: PageData, region: Region): Extracted {
  const xs = [region.box.x, ...region.columns, right(region.box)];
  const ys = [region.box.y, ...region.rows, bottom(region.box)];
  const cells: Cell[][] = ys.slice(1).map((y, r) => xs.slice(1).map((x, c) => ({ key: cellKey(r, c), row: r, column: c, value: "", original: "", box: { x: xs[c], y: ys[r], width: x - xs[c], height: y - ys[r] }, words: [], flags: [], edited: false, reviewed: false, rowSpan: 1, colSpan: 1, hidden: false })));
  for (const word of page.words) {
    if (!within(word, region.box)) continue;
    const row = ys.findIndex((edge, index) => index > 0 && word.y + word.height / 2 <= edge) - 1;
    const col = xs.findIndex((edge, index) => index > 0 && word.x + word.width / 2 <= edge) - 1;
    cells[row]?.[col]?.words.push(word);
  }
  for (const merge of region.merges) {
    const anchor = cells[merge.row]?.[merge.column];
    if (!anchor || !cells[merge.row + merge.rows - 1]?.[merge.column + merge.columns - 1]) continue;
    const all = cells.slice(merge.row, merge.row + merge.rows).flatMap(row => row.slice(merge.column, merge.column + merge.columns));
    anchor.words = all.flatMap(cell => cell.words);
    anchor.box = union(all.map(cell => cell.box));
    anchor.rowSpan = merge.rows; anchor.colSpan = merge.columns;
    all.forEach(cell => { if (cell !== anchor) cell.hidden = true; });
  }
  for (const cell of cells.flat()) {
    if (cell.hidden) continue;
    cell.original = textOf(cell.words);
    cell.edited = Object.hasOwn(region.edits, cell.key);
    cell.value = cell.edited ? region.edits[cell.key] : cell.original;
    cell.reviewed = region.reviewed.includes(cell.key);
    if (page.method === "ocr" && cell.row >= region.headerRows && !cell.value.trim()) cell.flags.push("빈 칸 확인");
    if (cell.words.some(word => (word.confidence ?? 100) < 80)) cell.flags.push("인식 확인");
    if (cell.words.some(word => word.x < cell.box.x - 0.002 || right(word) > right(cell.box) + 0.002 || word.y < cell.box.y - 0.002 || bottom(word) > bottom(cell.box) + 0.002)) cell.flags.push("경계 겹침");
    if (region.numberColumns.includes(cell.column) && cell.row >= region.headerRows && numberValue(cell.value) === null) cell.flags.push("숫자 확인");
  }
  const headers = xs.slice(1).map((_, c) => region.names[c]?.trim() || [...new Set(cells.slice(0, region.headerRows).map(row => row[c]?.value?.trim()).filter(Boolean))].join(" / ") || `열 ${c + 1}`);
  const data = cells.slice(region.headerRows).filter(row => !region.omitted.includes(row[0].row));
  const issues = data.flat().filter(cell => !cell.hidden && cell.flags.length > 0 && !cell.reviewed);
  const totals = region.numberColumns.map(column => {
    const texts = data.map(row => row[column]).filter(cell => !cell.hidden).map(cell => cell.value);
    const values = texts.map(numberValue), check = region.checks[String(column)] ?? "";
    const expected = numberValue(check);
    const sum = exactTotal(texts.filter((_, i) => values[i] !== null), check);
    const actual = sum.actual;
    const invalid = values.filter(n => n === null).length;
    return { column, actual, expected, invalid, matches: !check.trim() ? null : expected !== null && invalid === 0 && Math.abs(actual) <= Number.MAX_SAFE_INTEGER && sum.matches };
  });
  return { region, page, cells, headers, data, issues, totals };
}
export function resetGrid(region: Region, change: Partial<Region>): Region {
  return { ...region, ...change, edits: {}, reviewed: [], merges: [], omitted: [], names: [], numberColumns: [], checks: {} };
}
export function mergeCells(region: Region, from: { row: number; column: number }, to: { row: number; column: number }): Region {
  const row = Math.min(from.row, to.row), column = Math.min(from.column, to.column);
  const rows = Math.abs(from.row - to.row) + 1, columns = Math.abs(from.column - to.column) + 1;
  if (rows === 1 && columns === 1) return region;
  const target: Merge = { row, column, rows, columns };
  const overlaps = (a: Merge) => a.row < row + rows && a.row + a.rows > row && a.column < column + columns && a.column + a.columns > column;
  return { ...region, merges: [...region.merges.filter(a => !overlaps(a)), target], edits: {}, reviewed: [] };
}
export type Recipe = { version: 1; kind: "eddmpython-pdf-table"; regions: { name: string; box: Box; columns: number[]; headerRows: number; names: string[]; numberColumns: number[] }[] };
export function toRecipe(regions: Region[]): Recipe {
  return { version: 1, kind: "eddmpython-pdf-table", regions: regions.map(({ name, box, columns, headerRows, names, numberColumns }) => ({ name, box, columns, headerRows, names, numberColumns })) };
}
export function readRecipe(text: string): Recipe {
  if (new TextEncoder().encode(text).length > limits.recipeBytes) throw new Error("설정 파일은 1MB 이하만 열 수 있습니다");
  const value = JSON.parse(text) as Recipe;
  if (value?.version !== 1 || value.kind !== "eddmpython-pdf-table" || !Array.isArray(value.regions) || !value.regions.length || value.regions.length > limits.regions) throw new Error("이 도구에서 저장한 추출 설정 파일을 선택해 주세요");
  for (const r of value.regions) {
    if (!r || typeof r.name !== "string" || r.name.length > 100 || !r.box || ![r.box.x, r.box.y, r.box.width, r.box.height].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1) || r.box.width < 0.005 || r.box.height < 0.005 || right(r.box) > 1.000001 || bottom(r.box) > 1.000001) throw new Error("설정 파일의 표 영역이 올바르지 않습니다");
    if (!Array.isArray(r.columns) || r.columns.length >= limits.columns || !r.columns.every((n, i) => Number.isFinite(n) && n > r.box.x && n < right(r.box) && (!i || n > r.columns[i - 1]))) throw new Error("설정 파일의 열 경계가 올바르지 않습니다");
    if (!Number.isInteger(r.headerRows) || r.headerRows < 0 || r.headerRows > 10 || !Array.isArray(r.names) || !r.names.every(n => typeof n === "string" && n.length <= 200) || r.names.length > r.columns.length + 1 || !Array.isArray(r.numberColumns) || !r.numberColumns.every(n => Number.isInteger(n) && n >= 0 && n <= r.columns.length)) throw new Error("설정 파일의 제목 행이나 열 정보가 올바르지 않습니다");
  }
  return toRecipe(value.regions.map(r => ({ ...r, id: "", pageId: "", rows: [], omitted: [], edits: {}, reviewed: [], merges: [], checks: {} })));
}
export function applyRecipe(recipe: Recipe, pages: PageData[], id: () => string): Region[] {
  if (recipe.regions.length * pages.length > limits.regions) throw new Error(`표는 ${limits.regions}개까지 만들 수 있습니다`);
  return pages.flatMap(page => recipe.regions.map(r => ({ ...makeRegion(page, r.box, id(), r.name), ...r, pageId: page.id })));
}
