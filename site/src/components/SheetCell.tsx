import { useState } from "react";
import { getMachine } from "../pymachine";

/**
 * xlpod 방식을 보여주는 작은 시트.
 * Python 으로 함수를 정의하고 셀 수식에서 그 함수를 부른다.
 * xlpod 소스를 쓰지 않고 인터페이스만 재현한 독립 구현이다.
 */

type Row = { name: string; price: string; formula: string };

const INITIAL_DEF = `def WITHTAX(price):
    return round(price * 1.1)`;

const INITIAL_ROWS: Row[] = [
  { name: "노트북", price: "1450000", formula: "=WITHTAX(B1)" },
  { name: "마우스", price: "32000", formula: "=WITHTAX(B2)" },
  { name: "모니터", price: "280000", formula: "=WITHTAX(B3)" },
];

const FORMULA = /^=\s*([A-Za-z_]\w*)\s*\((.*)\)\s*$/;

/** =NAME(B1, 10) 을 실제 값이 들어간 Python 호출로 바꾼다. */
function toCall(formula: string, rows: Row[]): string | null {
  const m = formula.match(FORMULA);
  if (!m) return null;
  const [, name, rawArgs] = m;
  const args = rawArgs
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      const ref = a.match(/^([AB])([1-9]\d*)$/i);
      if (!ref) return a;
      const row = rows[Number(ref[2]) - 1];
      if (!row) return "None";
      return ref[1].toUpperCase() === "A"
        ? JSON.stringify(row.name)
        : row.price.trim() || "0";
    });
  return `${name}(${args.join(", ")})`;
}

const fmt = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && v.trim() !== "" ? n.toLocaleString("ko-KR") : v;
};

export function SheetCell() {
  const [def, setDef] = useState(INITIAL_DEF);
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const [results, setResults] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  function patch(i: number, key: keyof Row, value: string) {
    setRows((rs) => rs.map((r, j) => (i === j ? { ...r, [key]: value } : r)));
  }

  async function calculate() {
    setState("busy");
    setError("");
    try {
      const machine = await getMachine();
      await machine.runAsync(def);
      const next: string[] = [];
      for (const row of rows) {
        const call = toCall(row.formula, rows);
        if (!call) {
          next.push("#NAME?");
          continue;
        }
        try {
          const v = await machine.runAsync(call);
          next.push(v === undefined || v === null ? "" : String(v));
        } catch {
          next.push("#VALUE!");
        }
      }
      setResults(next);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  const status =
    state === "busy" ? "계산 중" : state === "error" ? "오류" : "계산 준비됨";

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-carbon">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-xlpod" />
        <span className="truncate font-mono text-xs text-ivory/55">
          시트 · 셀 수식이 Python 함수를 부른다
        </span>
        <span
          className="ml-auto shrink-0 font-mono text-xs text-ivory/55"
          aria-live="polite"
        >
          {status}
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="border-b border-white/10 md:border-r md:border-b-0">
          <div className="px-4 pt-3 pb-1 font-mono text-xs text-ivory/55">
            Python 정의
          </div>
          <textarea
            value={def}
            onChange={(e) => setDef(e.target.value)}
            spellCheck={false}
            aria-label="Python 함수 정의"
            rows={Math.max(4, def.split("\n").length + 1)}
            className="block w-full resize-y bg-transparent px-4 pb-4 font-mono text-[13px] leading-6 text-ivory/90 outline-none"
          />
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-[13px]">
              <thead>
                <tr className="text-ivory/45">
                  <th className="w-8 pb-2 text-left font-normal"> </th>
                  <th className="pb-2 text-left font-normal">A</th>
                  <th className="pb-2 text-left font-normal">B</th>
                  <th className="pb-2 text-left font-normal">C</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-2 text-ivory/35">{i + 1}</td>
                    <td className="border border-white/10 px-2 py-1 text-ivory/80">
                      {row.name}
                    </td>
                    <td className="border border-white/10 p-0">
                      <input
                        value={row.price}
                        onChange={(e) => patch(i, "price", e.target.value)}
                        inputMode="numeric"
                        aria-label={`B${i + 1} 단가`}
                        className="w-24 bg-transparent px-2 py-1 text-right text-ivory/90 outline-none"
                      />
                    </td>
                    <td className="border border-white/10 p-0">
                      <input
                        value={
                          results[i] !== undefined && state === "done"
                            ? fmt(results[i])
                            : row.formula
                        }
                        onChange={(e) => {
                          patch(i, "formula", e.target.value);
                          setState("idle");
                          setResults([]);
                        }}
                        aria-label={`C${i + 1} 수식`}
                        className={`w-full min-w-32 bg-transparent px-2 py-1 text-right outline-none ${
                          state === "done" ? "text-xlpod" : "text-ivory/90"
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={calculate}
          disabled={state === "busy"}
          className="rounded-lg bg-ivory px-3.5 py-1.5 text-sm font-medium text-carbon transition-colors hover:bg-white disabled:opacity-50"
        >
          {state === "busy" ? "계산 중" : "계산"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDef(INITIAL_DEF);
            setRows(INITIAL_ROWS);
            setResults([]);
            setState("idle");
            setError("");
          }}
          className="rounded-lg border border-white/15 px-3.5 py-1.5 text-sm text-ivory transition-colors hover:bg-white/5"
        >
          되돌리기
        </button>
        <span className="text-xs text-ivory/55">
          함수 이름과 단가를 바꿔도 됩니다. Chromium 계열 필요.
        </span>
      </div>

      <output className="block border-t border-white/10 px-4 py-3 font-mono text-[12px] leading-5 whitespace-pre-wrap text-ivory/60">
        {error ? (
          <span className="text-[#e0908a]">{error}</span>
        ) : state === "done" ? (
          "C 열이 Python 함수가 돌려준 값입니다. 수식 칸을 고치면 다시 수식으로 돌아갑니다."
        ) : (
          "계산을 누르면 정의한 함수가 셀 수식에서 호출됩니다."
        )}
      </output>
    </div>
  );
}
