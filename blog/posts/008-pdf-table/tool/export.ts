import { numberValue, type Extracted } from "./model.ts";

export async function workbookBytes(tables: Extracted[]): Promise<Uint8Array> {
  const XLSX = await import("../../../../site/src/spreadsheet.ts");
  const book = XLSX.utils.book_new();
  const reserved = new Set(tables.flatMap(table => table.headers));
  const uniqueHeaders = (headers: string[]) => {
    const used = new Set<string>();
    return headers.map(name => {
      let candidate = name, suffix = 2;
      if (used.has(candidate)) {
        do { candidate = `${name} (${suffix++})`; } while (used.has(candidate) || reserved.has(candidate));
      }
      used.add(candidate);
      return candidate;
    });
  };
  const headers = [...new Set(tables.flatMap(table => uniqueHeaders(table.headers)))];
  const rows: (string | number)[][] = [[...headers, "원본 파일", "페이지", "표 이름"]];
  const evidence: (string | number)[][] = [["원본 파일", "페이지", "표 이름", "원본 행", "열", "원문", "최종 값", "직접 수정", "확인 상태", "왼쪽 (%)", "위 (%)", "너비 (%)", "높이 (%)"]];
  const issues: (string | number)[][] = [["원본 파일", "페이지", "표 이름", "원본 행", "열", "확인할 내용", "값"]];
  for (const table of tables) {
    const names = uniqueHeaders(table.headers);
    for (const line of table.data) {
      const values: (string | number)[] = headers.map(() => "");
      for (const cell of line) {
        if (cell.hidden) continue;
        const numeric = table.region.numberColumns.includes(cell.column) ? numberValue(cell.value) : null;
        values[headers.indexOf(names[cell.column])] = numeric ?? cell.value;
        evidence.push([table.page.fileName, table.page.number, table.region.name, cell.row + 1, names[cell.column], cell.original, cell.value, cell.edited ? "수정" : "원문", cell.reviewed ? "확인함" : cell.flags.length ? "검토 필요" : "미확인", ...[cell.box.x, cell.box.y, cell.box.width, cell.box.height].map(n => Math.round(n * 10000) / 100)]);
        if (cell.flags.length && !cell.reviewed) issues.push([table.page.fileName, table.page.number, table.region.name, cell.row + 1, names[cell.column], cell.flags.join(", "), cell.value]);
      }
      rows.push([...values, table.page.fileName, table.page.number, table.region.name]);
    }
    for (const total of table.totals) if (total.matches === false) issues.push([table.page.fileName, table.page.number, table.region.name, "", table.headers[total.column], `합계 불일치: 기준 ${total.expected}, 읽은 합계 ${total.actual}, 숫자 확인 ${total.invalid}칸`, total.actual]);
  }
  for (const [name, data] of [["통합 표", rows], ["원문 근거", evidence], ["검토 항목", issues]] as const) {
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!autofilter"] = { ref: sheet["!ref"] ?? "A1" };
    sheet["!cols"] = data[0].map((_, i) => ({ wch: Math.min(48, Math.max(14, ...data.slice(0, 50).map(row => String(row[i] ?? "").length + 2))) }));
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  return new Uint8Array(XLSX.write(book, { bookType: "xlsx", type: "array", compression: true }));
}
export function download(bytes: Uint8Array | string, name: string, type: string) {
  const blob = new Blob([typeof bytes === "string" ? bytes : Uint8Array.from(bytes).buffer], { type });
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
