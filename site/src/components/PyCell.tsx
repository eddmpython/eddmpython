import { useEffect, useRef, useState } from "react";
import { getMachine, ensurePackages } from "../pymachine";

type EnvReport = {
  ok?: boolean;
  issues?: Array<{ code?: string; why?: string; fix?: string }>;
};

type State =
  | "idle"
  | "booting"
  | "installing"
  | "running"
  | "done"
  | "error"
  | "unsupported";

export function PyCell({
  code,
  onCodeChange,
  packages = [],
  hint,
  minRows = 4,
}: {
  code: string;
  onCodeChange: (next: string) => void;
  /** micropip 으로 설치할 PyPI 패키지 */
  packages?: string[];
  hint?: string;
  minRows?: number;
}) {
  const [out, setOut] = useState("");
  const [state, setState] = useState<State>("idle");
  const [slow, setSlow] = useState(false);
  const readyRef = useRef(false);

  /* 클릭하기 전에 이 브라우저에서 되는지 미리 판정한다. */
  useEffect(() => {
    let alive = true;
    import("pyproc")
      .then((m) => m.checkEnvironment?.())
      .then((report: EnvReport | undefined) => {
        if (!alive || !report) return;
        const blocking = (report.issues ?? []).filter(
          (i) => i.code && !String(i.code).startsWith("no-cross-origin"),
        );
        // 기본 실행은 헤더를 요구하지 않는다. 그 외 문제만 차단으로 본다.
        if (report.ok === false && blocking.length) {
          setState("unsupported");
          setOut(
            blocking
              .map((i) => i.why ?? i.code)
              .filter(Boolean)
              .join("\n") ||
              "이 브라우저에서는 실행할 수 없습니다. Chrome 이나 Edge 에서 열어 주세요",
          );
        }
      })
      .catch(() => {
        /* 판정 자체가 실패하면 막지 않는다. 실행에서 진짜 오류를 보여준다. */
      });
    return () => {
      alive = false;
    };
  }, []);

  const busy =
    state === "booting" || state === "installing" || state === "running";

  /* 오래 걸리면 되돌릴 방법을 알려 준다. 메인 스레드 무한 루프는 새로고침이 유일한 탈출구다. */
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 60_000);
    return () => clearTimeout(t);
  }, [busy]);

  async function run() {
    if (state === "unsupported") return;
    setOut("");
    setState(readyRef.current ? "running" : "booting");
    try {
      const machine = await getMachine();

      if (packages.length) {
        setState("installing");
        await ensurePackages(machine, packages);
      }

      readyRef.current = true;
      setState("running");

      /*
       * print 출력을 파이썬 쪽에서 받아 둔다.
       *
       * `boot()` 이 돌려주는 머신에는 stdout 훅이 없다. 프로토타입에 run, runAsync, fs, term,
       * loadPackages, proc, jobs, containers, dispose 뿐이다. 그래서 `runAsync` 의 반환값만
       * 화면에 남고 `print` 로 결과를 보여 주는 예제는 전부 빈 출력으로 끝났다. 2026-08-26 에
       * 실제로 그 상태였고 실행 칸을 쓴 글 전부가 해당됐다.
       *
       * `sys.stdout` 을 StringIO 로 바꿔 두고 실행한 뒤 되돌려 받는다. 파이썬 표준 동작이라
       * 런타임 구현이 바뀌어도 그대로 성립한다.
       */
      await machine.runAsync(
        "import sys as _sys, io as _io\n_cell_cap = _io.StringIO()\n_cell_prev = _sys.stdout\n_sys.stdout = _cell_cap",
      );

      let result: unknown;
      let failed: unknown;
      try {
        result = await machine.runAsync(code);
      } catch (e) {
        failed = e;
      }

      const printed = String(
        (await machine.runAsync(
          "import sys as _sys\n_sys.stdout = _cell_prev\n_cell_cap.getvalue()",
        )) ?? "",
      );

      if (failed) throw failed;

      const tail =
        result === undefined || result === null ? "" : String(result);
      const shown = [printed, tail]
        .filter((part) => part.length)
        .join("\n")
        .replace(/\s+$/, "");
      setOut(shown.length ? shown : "(출력 없음)");
      setState("done");
    } catch (e) {
      setOut(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  const status = {
    idle: "실행 준비됨",
    booting: "머신 부팅 중",
    installing: "패키지 설치 중",
    running: "실행 중",
    done: "완료",
    error: "오류",
    unsupported: "실행 불가",
  }[state];

  const placeholder =
    state === "booting"
      ? "Python 머신을 처음 띄우는 중입니다."
      : state === "installing"
        ? `${packages.join(", ")} 를 설치하고 있습니다. 처음 한 번만 걸립니다.`
        : "실행을 누르면 결과가 여기에 나옵니다. 코드를 고쳐서 다시 실행해 보세요";

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-carbon">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pyproc" />
        <span className="truncate font-mono text-xs text-ivory/55">
          pyproc 머신 · 브라우저 안
        </span>
        <span
          className="ml-auto shrink-0 font-mono text-xs text-ivory/55"
          aria-live="polite"
        >
          {status}
        </span>
      </div>

      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        spellCheck={false}
        wrap="off"
        aria-label="Python 코드"
        rows={Math.max(minRows, code.split("\n").length + 1)}
        className="block w-full resize-y overflow-x-auto bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-ivory/90 outline-none focus-visible:bg-white/[0.03]"
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={run}
          disabled={busy || state === "unsupported"}
          className="eddm-button-primary rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy ? status : "실행"}
        </button>
        {slow && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-white/25 px-3.5 py-1.5 text-sm text-ivory transition-colors hover:bg-white/5"
          >
            멈추고 새로고침
          </button>
        )}
        <span className="text-xs text-ivory/55">
          {hint ?? "Chromium 계열 필요"}
        </span>
      </div>

      <output
        className={`block max-h-72 overflow-auto border-t border-white/10 px-4 py-4 font-mono text-[12px] leading-5 break-words whitespace-pre-wrap ${
          state === "error" || state === "unsupported"
            ? "text-[var(--eddm-danger)]"
            : "text-ivory/70"
        }`}
      >
        {out || placeholder}
      </output>
    </div>
  );
}
