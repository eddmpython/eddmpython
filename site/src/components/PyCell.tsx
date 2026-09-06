import { useEffect, useId, useRef, useState } from "react";
import { withMachine, ensurePackages } from "../pymachine";
import { editCodeIndent } from "../codeIndent";
import { codeKeyAction, CODE_CELL_KEYS } from "../codeCell";

type EnvReport = {
  ok?: boolean;
  issues?: Array<{ code?: string; why?: string; fix?: string }>;
};

type State =
  | "idle"
  | "waiting"
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
  title,
  description,
  hint,
  minRows = 2,
}: {
  code: string;
  onCodeChange: (next: string) => void;
  /** micropip 으로 설치할 PyPI 패키지 */
  packages?: string[];
  title?: string;
  description?: string;
  hint?: string;
  minRows?: number;
}) {
  const [out, setOut] = useState("");
  const [state, setState] = useState<State>("idle");
  const [slow, setSlow] = useState(false);
  const readyRef = useRef(false);
  const running = useRef(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const initialCode = useRef(code);
  const tabNavigation = useRef(false);
  const helpId = useId();

  useEffect(() => {
    const target = editor.current;
    if (!target) return;
    const fit = () => {
      if (!target.offsetWidth) return;
      target.style.height = "auto";
      const scrollbar = target.offsetHeight - target.clientHeight;
      target.style.height = (target.scrollHeight + scrollbar) + "px";
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(target.parentElement!);
    return () => observer.disconnect();
  }, [code]);

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
    state === "waiting" || state === "booting" || state === "installing" || state === "running";

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
    if (running.current || state === "unsupported") return;
    running.current = true;
    const submittedCode = code;
    setOut("");
    setState("waiting");
    try {
      await withMachine(async (machine) => {

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
          result = await machine.runAsync(submittedCode);
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
      }, () => setState(readyRef.current ? "running" : "booting"));
    } catch (e) {
      setOut(e instanceof Error ? e.message : String(e));
      setState("error");
    } finally {
      running.current = false;
    }
  }

  const status = {
    idle: "",
    waiting: "앞 칸이 끝나기를 기다립니다",
    booting: "머신 부팅 중",
    installing: "패키지 설치 중",
    running: "실행 중",
    done: "완료",
    error: "오류",
    unsupported: "실행 불가",
  }[state];

  return (
    <div className="eddm-cell" data-cell-state={state} data-py-cell>
      {title && <div className="cell-h"><span className="cell-t">{title}</span></div>}
      {description && <p className="cell-d">{description}</p>}
      {hint && <p className="cell-hint">{hint}</p>}
      <div className="cell-body">
        <div className="cell-gutter">
          <button type="button" className="cell-run" onClick={run} disabled={busy || state === "unsupported"}
            aria-label="실행" title="실행 (Shift+Enter)" aria-keyshortcuts="Shift+Enter" aria-busy={busy}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
          </button>
        </div>
        <textarea ref={editor} className="cell-c" value={code} onChange={(event) => onCodeChange(event.target.value)}
          onBlur={() => { tabNavigation.current = false; }}
          onKeyDown={(event) => {
            const action = codeKeyAction({ key: event.key, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, isComposing: event.nativeEvent.isComposing });
            if (action === "release") {
              tabNavigation.current = true;
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            if (event.key === "Tab" && tabNavigation.current) { tabNavigation.current = false; return; }
            tabNavigation.current = false;
            if (!action) return;
            event.preventDefault();
            event.stopPropagation();
            if (action === "run") { if (!event.repeat) void run(); return; }
            const target = event.currentTarget;
            const edit = editCodeIndent(code, target.selectionStart, target.selectionEnd, action === "outdent");
            onCodeChange(edit.code);
            requestAnimationFrame(() => target.setSelectionRange(edit.selectionStart, edit.selectionEnd));
          }} spellCheck={false} wrap="off" aria-label="Python 코드" aria-describedby={helpId}
          rows={Math.max(minRows, code.split("\n").length)} />
      </div>
      <div className="cell-help">
        <p className="cell-keys" id={helpId}>{CODE_CELL_KEYS}</p>
        {code !== initialCode.current && <button type="button" className="cell-reset" onClick={() => { onCodeChange(initialCode.current); editor.current?.focus(); }}>처음으로</button>}
      </div>
      <div className="cell-out" hidden={state === "idle"}>
        <div className="cell-out-h"><span>출력</span><span className="cell-s" role="status">{status}</span></div>
        <output className="cell-o">{out}</output>
        {slow && <p className="cell-hint">오래 걸리고 있습니다. 무한 반복을 입력했다면 <button type="button" className="cell-reset" onClick={() => window.location.reload()}>멈추고 새로고침</button></p>}
      </div>
    </div>
  );
}
