import { useMemo, useRef, useState } from "react";
import { calculate, cellId, colLetter, display, type Grid } from "../sheet";

/**
 * 작은 스프레드시트. 셀을 누르고 값이나 수식을 넣으면 즉시 다시 계산된다.
 * xlpod 소스를 쓰지 않은 독립 구현이며, 쓰는 느낌만 그대로 보여 준다.
 */

const COLS = 4;
const ROWS = 5;
const HEAD = ["제품", "단가", "수량", "금액"];

const INITIAL: Grid = {
  A1: "노트북",
  B1: "1450000",
  C1: "2",
  D1: "=B1*C1",
  A2: "마우스",
  B2: "32000",
  C2: "5",
  D2: "=B2*C2",
  A3: "모니터",
  B3: "280000",
  C3: "1",
  D3: "=B3*C3",
  A5: "합계",
  C5: "=SUM(C1:C3)",
  D5: "=SUM(D1:D3)",
};

const IDS = Array.from({ length: COLS }, (_, c) =>
  Array.from({ length: ROWS }, (_, r) => cellId(c, r)),
).flat();

export function SheetCell() {
  const [grid, setGrid] = useState<Grid>(INITIAL);
  const [active, setActive] = useState("D1");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const barRef = useRef<HTMLInputElement>(null);

  const values = useMemo(() => calculate(grid, IDS), [grid]);

  function commit(id: string, text: string) {
    setGrid((g) => {
      const next = { ...g };
      if (text.trim() === "") delete next[id];
      else next[id] = text;
      return next;
    });
  }

  function startEdit(id: string, seed?: string) {
    setActive(id);
    setEditing(id);
    setDraft(seed ?? grid[id] ?? "");
  }

  function moveDown(id: string) {
    const col = id.charCodeAt(0) - 65;
    const row = Number(id.slice(1)) - 1;
    if (row + 1 < ROWS) setActive(cellId(col, row + 1));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-carbon">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-xlpod" />
        <span className="truncate font-mono text-xs text-ivory/55">
          시트 · 눌러서 값과 수식을 바꿔 보세요
        </span>
      </div>

      {/* 수식 입력줄 */}
      <div className="flex items-stretch border-b border-white/10">
        <span className="flex w-14 shrink-0 items-center justify-center border-r border-white/10 font-mono text-xs text-ivory/55">
          {active}
        </span>
        <input
          ref={barRef}
          value={editing === active ? draft : (grid[active] ?? "")}
          onChange={(e) => {
            setEditing(active);
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(active, editing === active ? draft : (grid[active] ?? ""));
              setEditing(null);
              moveDown(active);
            }
            if (e.key === "Escape") setEditing(null);
          }}
          onBlur={() => {
            if (editing === active) {
              commit(active, draft);
              setEditing(null);
            }
          }}
          spellCheck={false}
          aria-label={`${active} 수식 입력줄`}
          placeholder="값 또는 =B1*C1"
          className="w-full bg-transparent px-3 py-2 font-mono text-[13px] text-ivory/90 outline-none"
        />
      </div>

      {/* 격자 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse font-mono text-[13px]">
          <thead>
            <tr>
              <th className="w-9 border-r border-b border-white/10 bg-white/[0.02] p-0 font-normal" />
              {HEAD.map((h, c) => (
                <th
                  key={c}
                  className="border-r border-b border-white/10 bg-white/[0.02] px-2 py-1 text-left font-normal text-ivory/45"
                >
                  <span className="text-ivory/70">{colLetter(c)}</span>
                  <span className="ml-2 text-[11px]">{h}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <td className="border-r border-b border-white/10 bg-white/[0.02] px-2 py-1 text-center text-ivory/45">
                  {r + 1}
                </td>
                {Array.from({ length: COLS }, (_, c) => {
                  const id = cellId(c, r);
                  const isActive = id === active;
                  const isEditing = editing === id;
                  const v = values[id];
                  const isFormula = (grid[id] ?? "").startsWith("=");
                  const numeric = typeof v === "number";
                  return (
                    <td
                      key={id}
                      className={`border-r border-b p-0 ${
                        isActive
                          ? "border-xlpod/60 bg-xlpod/10 outline outline-1 outline-xlpod/60"
                          : "border-white/10"
                      }`}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              commit(id, draft);
                              setEditing(null);
                              moveDown(id);
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                          onBlur={() => {
                            commit(id, draft);
                            setEditing(null);
                          }}
                          spellCheck={false}
                          aria-label={`${id} 편집`}
                          className="w-full bg-transparent px-2 py-1 text-right text-ivory outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActive(id)}
                          onDoubleClick={() => startEdit(id)}
                          onKeyDown={(e) => {
                            if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
                              startEdit(id, e.key);
                              e.preventDefault();
                            }
                            if (e.key === "Enter") {
                              startEdit(id);
                              e.preventDefault();
                            }
                            if (e.key === "Delete" || e.key === "Backspace") {
                              commit(id, "");
                              e.preventDefault();
                            }
                          }}
                          aria-label={`${id} ${grid[id] ?? "빈 칸"}`}
                          className={`block w-full px-2 py-1 text-left ${
                            numeric ? "text-right" : ""
                          } ${
                            typeof v === "string" && v.startsWith("#")
                              ? "text-[#e0908a]"
                              : isFormula
                                ? "text-xlpod"
                                : "text-ivory/85"
                          }`}
                        >
                          {v === "" ? " " : display(v)}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-4 py-3 text-xs text-ivory/55">
        <button
          type="button"
          onClick={() => {
            setGrid(INITIAL);
            setActive("D1");
            setEditing(null);
          }}
          className="rounded-lg border border-white/15 px-3 py-1 text-sm text-ivory transition-colors hover:bg-white/5"
        >
          되돌리기
        </button>
        <span>
          한 번 눌러 선택, 다시 눌러 편집. SUM, AVERAGE, MIN, MAX, ROUND 를 씁니다.
        </span>
      </div>
    </div>
  );
}
