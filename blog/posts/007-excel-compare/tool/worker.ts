import { compareTables, sampleTables, type Table, type Comparison } from "./compare.ts";
import { readWorkbook, reportBytes, tableBytes, sheetNames } from "./workbook.ts";

export type Request =
  | { kind: "names"; bytes: ArrayBuffer }
  | { kind: "read"; bytes: ArrayBuffer; sheetName?: string; headerRow: number }
  | { kind: "compare"; before: Table; after: Table; keys: string[]; columns: string[]; trim: boolean }
  | { kind: "sample"; side: number }
  | { kind: "report"; result: Comparison; info: Parameters<typeof reportBytes>[1] };

self.onmessage = ({ data }: MessageEvent<Request>) => {
  try {
    const result = data.kind === "names" ? sheetNames(data.bytes) : data.kind === "read" ? readWorkbook(data.bytes, data.sheetName, data.headerRow)
      : data.kind === "compare" ? compareTables(data.before, data.after, data.keys, data.columns, data.trim)
      : data.kind === "sample" ? tableBytes(sampleTables()[data.side]) : reportBytes(data.result, data.info);
    self.postMessage({ ok: true, result }, result instanceof ArrayBuffer ? { transfer: [result] } : {});
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : "파일을 읽지 못했습니다" });
  }
};
