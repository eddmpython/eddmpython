/** 블로그와 강의장이 함께 쓰는 코드셀 조작과 표현. 색 값은 DESIGN이 소유한다. */
export const CODE_CELL_KEYS = "Tab 들여쓰기 · Shift+Tab 내어쓰기 · Shift+Enter 실행 · Esc 다음 Tab 이동";

export function codeKeyAction(event: {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}): "run" | "indent" | "outdent" | "release" | null {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === "Enter" && event.shiftKey) return "run";
  if (event.key === "Tab") return event.shiftKey ? "outdent" : "indent";
  if (event.key === "Escape") return "release";
  return null;
}

export const CODE_CELL_STYLE = `
.eddm-cell { margin:1.75rem 0; min-width:0; border:0; border-radius:0; background:transparent; padding:0; }
.eddm-cell .cell-h { display:flex; align-items:center; gap:.75rem; margin-bottom:.4rem; }
.eddm-cell .cell-t { flex:1; min-width:0; margin:0; font-size:1rem; font-weight:600; line-height:1.6; color:var(--eddm-text); }
.eddm-cell .cell-d, .eddm-cell .cell-hint { margin:.35rem 0 .75rem; font-size:.9rem; line-height:1.7; color:var(--eddm-text-muted); }
.eddm-cell .cell-body { display:grid; grid-template-columns:2.75rem minmax(0,1fr); align-items:start; min-width:0; }
.eddm-cell .cell-gutter { padding-top:.45rem; }
.eddm-cell .cell-run { display:flex; align-items:center; justify-content:center; width:2.5rem; height:2.5rem; margin:0; padding:0; border:0; border-radius:50%; background:transparent; color:var(--eddm-text-muted); cursor:pointer; }
.eddm-cell .cell-run:hover { background:var(--eddm-hover); color:var(--eddm-accent); }
.eddm-cell .cell-run:focus-visible, .eddm-cell .cell-reset:focus-visible { outline:2px solid var(--eddm-accent); outline-offset:2px; }
.eddm-cell .cell-run:disabled { cursor:wait; opacity:.55; }
.eddm-cell .cell-run svg { width:1.15rem; height:1.15rem; fill:currentColor; }
.eddm-cell .cell-run[aria-busy="true"] svg { animation:eddm-cell-pulse 1s ease-in-out infinite alternate; }
.eddm-cell .cell-c { display:block; box-sizing:border-box; width:100%; min-height:3.2rem; margin:0; padding:.75rem .85rem; border:0; border-left:2px solid transparent; border-radius:0; outline:0; resize:none; background:var(--eddm-code-surface); color:var(--eddm-text); font-family:var(--eddm-font-mono); font-size:.85rem; line-height:1.65; tab-size:4; white-space:pre; overflow-x:auto; overflow-y:hidden; }
.eddm-cell .cell-c:focus { border-left-color:var(--eddm-accent); background:var(--eddm-code-focus); }
.eddm-cell .cell-help { display:flex; flex-wrap:wrap; align-items:baseline; gap:.5rem 1rem; margin:.5rem 0 0 2.75rem; }
.eddm-cell .cell-keys { margin:0; font-size:.75rem; line-height:1.7; color:var(--eddm-text-muted); }
.eddm-cell .cell-reset { margin-left:auto; padding:.15rem 0; border:0; border-radius:0; height:auto; background:transparent; color:var(--eddm-text-muted); font:inherit; font-size:.75rem; cursor:pointer; }
.eddm-cell .cell-reset:hover { color:var(--eddm-accent); }
.eddm-cell .cell-reset[hidden], .eddm-cell .cell-out[hidden] { display:none; }
.eddm-cell .cell-out { margin:.75rem 0 0 2.75rem; padding:0; border:0; border-top:1px solid var(--eddm-line); border-radius:0; background:transparent; }
.eddm-cell .cell-out-h { display:flex; align-items:baseline; gap:.75rem; padding:.55rem .85rem 0; border:0; font-size:.7rem; color:var(--eddm-text-faint); }
.eddm-cell .cell-s { margin-left:auto; font-size:.75rem; color:var(--eddm-text-muted); }
.eddm-cell .cell-o { display:block; margin:0; padding:.5rem .85rem; border:0; border-radius:0; background:transparent; max-height:24rem; overflow:auto; font-family:var(--eddm-font-mono); font-size:.82rem; line-height:1.65; color:var(--eddm-text); white-space:pre-wrap; overflow-wrap:anywhere; }
.eddm-cell[data-cell-state="error"] .cell-o, .eddm-cell[data-cell-state="unsupported"] .cell-o { color:var(--eddm-danger); }
@keyframes eddm-cell-pulse { to { opacity:.3; } }
@media (prefers-reduced-motion:reduce) { .eddm-cell .cell-run[aria-busy="true"] svg { animation:none; } }
`;
