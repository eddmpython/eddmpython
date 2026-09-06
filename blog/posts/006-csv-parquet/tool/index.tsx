import { useState } from "react";
import { ensurePackages, withMachine } from "../../../../site/src/pymachine";
import experiment from "./experiment.py?raw";

type Comparison = {
  rows: number;
  version: string;
  csvBytes: number;
  parquetBytes: number;
  csvCode: number;
  parquetCode: string;
  csvFixedCode: string;
  csvText: string;
  schema: string;
  csvData: string;
  parquetData: string;
};

function downloadFile(encoded: string, name: string, type: string) {
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function FileComparison() {
  const [rows, setRows] = useState(3);
  const [result, setResult] = useState<Comparison | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function compare() {
    setBusy(true);
    setError("");
    setResult(null);
    setStatus("Python 준비 중입니다. 첫 실행에는 패키지를 받습니다.");
    try {
      await withMachine(async (machine) => {
      await ensurePackages(machine, ["pyarrow==22.0.0"]);
      setStatus("같은 표를 저장하고 다시 읽는 중입니다.");
      const output = await machine.runAsync(`${experiment}\njson.dumps(compareFiles(${rows}), ensure_ascii=False)`);
      const parsed = JSON.parse(String(output)) as Comparison;
      if (parsed.rows !== rows || !Number.isFinite(parsed.csvBytes) || !Number.isFinite(parsed.parquetBytes)) {
        throw new Error("실험 결과의 행 수와 파일 크기를 확인하지 못했습니다.");
      }
      setResult(parsed);
      setStatus(`${rows.toLocaleString("ko-KR")}행 비교 완료`);
      });
    } catch (cause) {
      setStatus("");
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-file-comparison aria-label="CSV와 Parquet 직접 비교" className="my-8 overflow-hidden rounded-2xl border border-[var(--eddm-line-strong)] bg-carbon p-5 sm:p-7">
      <div className="font-mono text-xs tracking-widest text-[var(--eddm-accent)]">CSV / PARQUET</div>
      <p className="mt-2 text-xl font-semibold text-ivory">같은 표, 다른 파일</p>
      <p className="mt-2 text-sm leading-6 text-ivory/70">실험용 표를 브라우저에서 두 형식으로 저장합니다. 행 수를 고르고 비교한 뒤 파일도 내려받을 수 있습니다.</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-2 text-sm text-ivory/80">
          실험할 행 수
          <select aria-label="실험할 행 수" value={rows} disabled={busy} onChange={(event) => { setRows(Number(event.target.value)); setResult(null); setStatus(""); setError(""); }} className="rounded-lg border border-[var(--eddm-line-strong)] bg-carbon px-3 py-2 text-ivory">
            <option value={3}>3행</option>
            <option value={1000}>1,000행</option>
            <option value={100000}>100,000행</option>
          </select>
        </label>
        <button data-compare-run type="button" disabled={busy} onClick={compare} className="eddm-button-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? "비교 중" : "파일 비교"}</button>
      </div>
      <p aria-live="polite" data-compare-status className="mt-3 text-sm text-ivory/65">{status || "처음 세 행: 0012 · 서울 · 3 / 0013 · 부산 · 5 / 0014 · 서울 · 2"}</p>
      {error && <p role="alert" className="mt-3 break-words text-sm text-[var(--eddm-accent)]">실행하지 못했습니다. Chrome 또는 Edge에서 다시 시도해 보세요<br />{error}</p>}
      {result && <div data-compare-result className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            { name: "CSV", bytes: result.csvBytes, code: String(result.csvCode), data: result.csvData, type: "text/csv;charset=utf-8", extension: "csv", detail: "기본 읽기: 정수로 추정" },
            { name: "Parquet", bytes: result.parquetBytes, code: result.parquetCode, data: result.parquetData, type: "application/vnd.apache.parquet", extension: "parquet", detail: "다시 읽기: 문자열 유지" },
          ]).map((file) => <div key={file.name} className="min-w-0 rounded-xl border border-[var(--eddm-line-base)] p-4">
            <div className="font-mono text-sm text-ivory/65">{file.name}</div>
            <div className="mt-2 text-xl font-semibold tabular-nums text-ivory">{file.bytes.toLocaleString("ko-KR")} <span className="text-sm font-normal">바이트</span></div>
            <div className="my-3 h-2 overflow-hidden rounded-full bg-[var(--eddm-raise)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--eddm-accent)]" style={{ width: `${file.bytes / Math.max(result.csvBytes, result.parquetBytes) * 100}%` }} /></div>
            <div className="text-xs text-ivory/60">첫 code 값</div>
            <div className="mt-1 font-mono text-2xl text-ivory">{file.code}</div>
            <div className="mt-1 text-xs text-ivory/65">{file.detail}</div>
            <button type="button" onClick={() => downloadFile(file.data, `sample-${result.rows}.${file.extension}`, file.type)} className="mt-4 rounded-lg border border-[var(--eddm-line-strong)] px-3 py-2 text-sm text-ivory hover:bg-[var(--eddm-hover)]">{file.name} 내려받기</button>
          </div>)}
        </div>
        <p className="mt-4 text-sm leading-6 text-ivory/70">CSV도 code를 문자열로 지정하면 <span className="font-mono text-ivory">{result.csvFixedCode}</span>로 읽힙니다. 아래 본문에서 읽기 설정을 바꿔 봅니다.</p>
        <p className="mt-2 text-xs leading-5 text-ivory/50">PyArrow {result.version} · CSV 압축 없음 · Parquet Snappy 압축 · 다운로드할 실제 바이트 수입니다. 큰 표는 코드 1,000종과 지역·수량 패턴을 반복한 합성 데이터입니다.</p>
      </div>}
    </section>
  );
}
