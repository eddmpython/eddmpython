import { useRef, useState } from "react";

/* pyproc 이 고정한 Pyodide 배포판. 같은 버전을 CDN 에서 가져온다. */
const ENGINE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

type Machine = {
  run: (code: string) => unknown;
  runAsync?: (code: string) => Promise<unknown>;
};

let booting: Promise<Machine> | null = null;

/** pyproc 머신을 한 번만 띄우고 재사용한다. 상태는 셀 사이에 유지된다. */
function getMachine(): Promise<Machine> {
  if (!booting) {
    booting = import("pyproc").then((m) =>
      m.boot({ indexURL: ENGINE_INDEX }),
    ) as Promise<Machine>;
  }
  return booting;
}

type State = "idle" | "booting" | "running" | "done" | "error";

export function PyCell({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [out, setOut] = useState("");
  const [state, setState] = useState<State>("idle");
  const bootedRef = useRef(false);

  async function run() {
    setOut("");
    setState(bootedRef.current ? "running" : "booting");
    try {
      const machine = await getMachine();
      bootedRef.current = true;
      setState("running");
      const result = machine.runAsync
        ? await machine.runAsync(code)
        : machine.run(code);
      setOut(
        result === undefined || result === null ? "(반환값 없음)" : String(result),
      );
      setState("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOut(msg);
      setState("error");
    }
  }

  const busy = state === "booting" || state === "running";
  const status =
    state === "booting"
      ? "머신 부팅 중"
      : state === "running"
        ? "실행 중"
        : state === "error"
          ? "오류"
          : state === "done"
            ? "완료"
            : "실행 준비됨";

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-carbon">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pyproc" />
        <span className="font-mono text-xs text-ivory/55">
          pyproc 머신 · 브라우저 안
        </span>
        <span className="ml-auto shrink-0 font-mono text-xs text-ivory/35">
          {status}
        </span>
      </div>

      <label className="sr-only" htmlFor="pycell-code">
        Python 코드
      </label>
      <textarea
        id="pycell-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={Math.max(4, code.split("\n").length + 1)}
        className="block w-full resize-y bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-ivory/90 outline-none"
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-lg bg-ivory px-3.5 py-1.5 text-sm font-medium text-carbon transition-colors hover:bg-white disabled:opacity-50"
        >
          {busy ? status : "실행"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCode(initialCode);
            setOut("");
            setState("idle");
          }}
          className="rounded-lg border border-white/15 px-3.5 py-1.5 text-sm text-ivory transition-colors hover:bg-white/5"
        >
          되돌리기
        </button>
        <span className="text-xs text-ivory/35">Chromium 계열 필요</span>
      </div>

      <output
        className={`block max-h-56 overflow-auto border-t border-white/10 px-4 py-4 font-mono text-[13px] leading-6 break-words whitespace-pre-wrap ${
          state === "error" ? "text-[#e0908a]" : "text-ivory/70"
        }`}
      >
        {out ||
          (state === "booting"
            ? "Python 머신을 처음 띄우는 중입니다. 한 번만 걸립니다."
            : "실행을 누르면 결과가 여기에 나옵니다. 값을 바꿔서 다시 실행해 보세요.")}
      </output>
    </div>
  );
}
