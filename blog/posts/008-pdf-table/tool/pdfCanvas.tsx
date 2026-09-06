import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { RenderTask } from "../../../../site/src/pdfLibraries";
import type { SourceFile } from "./pdf";
import { bottom, boxFrom, clamp, limits, right, type Box, type PageData, type Region } from "./model";

export type CanvasMode = "select" | "column" | "row";
type Point = { x: number; y: number };
type Drag = { start: Point; kind: string; index: number; original?: Region; box?: Box };
type Props = { file: SourceFile; page: PageData; region?: Region; highlight?: Box; mode: CanvasMode; zoom: number; onRegion: (box: Box) => void; onPreview: (region: Region | undefined) => void; onGrid: (region: Region) => void; canEdit: () => boolean; onError: (message: string) => void };

export function PdfCanvas({ file, page, region, highlight, mode, zoom, onRegion, onPreview, onGrid, canEdit, onError }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), overlay = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null), draft = useRef<Region | undefined>(undefined);
  const [selection, setSelection] = useState<Box | undefined>(), [rendering, setRendering] = useState(true);
  useEffect(() => {
    let active = true, task: RenderTask | undefined;
    setRendering(true);
    void file.pdf.getPage(page.number).then(pdfPage => {
      if (!active || !canvas.current) return;
      const scale = Math.min(2, Math.sqrt(limits.renderPixels / (page.width * page.height)));
      const viewport = pdfPage.getViewport({ scale });
      canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
      task = pdfPage.render({ canvas: canvas.current, viewport });
      return task.promise;
    }).then(() => { if (active) setRendering(false); }).catch(error => { if (active && error?.name !== "RenderingCancelledException") onError("PDF 화면을 그리지 못했습니다. 다른 페이지로 이동한 뒤 다시 열어 주세요"); });
    return () => { active = false; task?.cancel(); };
  }, [file, page.number, page.width, page.height, onError]);
  const point = (event: PointerEvent): Point => {
    const box = overlay.current!.getBoundingClientRect();
    return { x: clamp((event.clientX - box.left) / box.width), y: clamp((event.clientY - box.top) / box.height) };
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || rendering) return;
    const node = (event.target as HTMLElement).closest<HTMLElement>("[data-drag]");
    const kind = node?.dataset.drag ?? mode;
    if (kind !== "select" && (!region || !canEdit())) return;
    const start = point(event), index = Number(node?.dataset.index ?? -1);
    if (kind === "column" && region) {
      if (start.x <= region.box.x || start.x >= right(region.box) || region.columns.length >= limits.columns - 1) return;
      if ([region.box.x, ...region.columns, right(region.box)].some(x => Math.abs(x - start.x) < 0.004)) return;
      onGrid({ ...region, columns: [...region.columns, start.x].sort((a, b) => a - b) }); return;
    }
    if (kind === "row" && region) {
      if (start.y <= region.box.y || start.y >= bottom(region.box) || region.rows.length >= limits.rows - 1) return;
      if ([region.box.y, ...region.rows, bottom(region.box)].some(y => Math.abs(y - start.y) < 0.004)) return;
      onGrid({ ...region, rows: [...region.rows, start.y].sort((a, b) => a - b) }); return;
    }
    node?.focus({ preventScroll: true });
    event.preventDefault(); overlay.current!.setPointerCapture(event.pointerId);
    drag.current = { start, kind, index, original: region }; draft.current = undefined;
    if (kind === "select") setSelection(boxFrom(start, start));
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const p = point(event), original = current.original;
    if (current.kind === "select") { current.box = boxFrom(current.start, p); setSelection(current.box); return; }
    if (!original) return;
    let next = { ...original };
    if (current.kind === "cutColumn" || current.kind === "cutRow") {
      const column = current.kind === "cutColumn", cuts = column ? [...original.columns] : [...original.rows];
      const low = cuts[current.index - 1] ?? (column ? original.box.x : original.box.y);
      const high = cuts[current.index + 1] ?? (column ? right(original.box) : bottom(original.box));
      cuts[current.index] = clamp(column ? p.x : p.y, low + 0.002, high - 0.002);
      next = { ...original, ...(column ? { columns: cuts } : { rows: cuts }) };
    } else {
      const end = { x: right(original.box), y: bottom(original.box) };
      const start = { x: original.box.x, y: original.box.y };
      if (current.kind.includes("n")) start.y = Math.min(p.y, end.y - 0.015);
      if (current.kind.includes("w")) start.x = Math.min(p.x, end.x - 0.015);
      if (current.kind.includes("s")) end.y = Math.max(p.y, start.y + 0.015);
      if (current.kind.includes("e")) end.x = Math.max(p.x, start.x + 0.015);
      const box = boxFrom(start, end);
      next = { ...original, box, columns: original.columns.filter(x => x > box.x && x < right(box)), rows: original.rows.filter(y => y > box.y && y < bottom(box)) };
    }
    draft.current = next; onPreview(next);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current; if (!current) return;
    drag.current = null;
    if (overlay.current?.hasPointerCapture(event.pointerId)) overlay.current.releasePointerCapture(event.pointerId);
    if (current.kind === "select" && current.box && current.box.width > 0.012 && current.box.height > 0.012) onRegion(current.box);
    else if (draft.current) onGrid(draft.current);
    setSelection(undefined); onPreview(undefined); draft.current = undefined;
  };
  const styleBox = (b: Box) => ({ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.width * 100}%`, height: `${b.height * 100}%` });
  const nudge = (axis: "columns" | "rows", index: number, key: string) => {
    if (!region || !canEdit()) return;
    const cuts = [...region[axis]];
    if (key === "Delete" || key === "Backspace") cuts.splice(index, 1);
    else if (["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(key)) {
      const low = cuts[index - 1] ?? (axis === "columns" ? region.box.x : region.box.y), high = cuts[index + 1] ?? (axis === "columns" ? right(region.box) : bottom(region.box));
      cuts[index] = clamp(cuts[index] + (["ArrowLeft", "ArrowUp"].includes(key) ? -0.002 : 0.002), low + 0.002, high - 0.002);
    } else return;
    onGrid({ ...region, [axis]: cuts });
  };
  return <div className="pt-paper-scroll">
    <div className="pt-paper" style={{ width: `${zoom}%`, aspectRatio: `${page.width} / ${page.height}` }} data-rendered={!rendering}>
      <canvas ref={canvas} aria-label={`${page.fileName} ${page.number}페이지 원본`} />
      {rendering && <div className="pt-rendering" role="status">원문을 그리는 중</div>}
      <div ref={overlay} className={`pt-overlay pt-mode-${mode}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; draft.current = undefined; setSelection(undefined); onPreview(undefined); }}>
        {region && <>
          <div className="pt-region" style={styleBox(region.box)}><span className="pt-region-label">{region.name}</span></div>
          {region.columns.map((x, i) => <button key={`c${i}`} className="pt-cut pt-cut-column" data-drag="cutColumn" data-index={i} style={{ left: `${x * 100}%`, top: `${region.box.y * 100}%`, height: `${region.box.height * 100}%` }} aria-label={`${i + 1}번째 열 구분선`} title="드래그로 이동 · Delete로 삭제" onKeyDown={e => { if (/^Arrow|Delete|Backspace/.test(e.key)) { e.preventDefault(); nudge("columns", i, e.key); } }}><span>{i + 1}</span></button>)}
          {region.rows.map((y, i) => <button key={`r${i}`} className="pt-cut pt-cut-row" data-drag="cutRow" data-index={i} style={{ top: `${y * 100}%`, left: `${region.box.x * 100}%`, width: `${region.box.width * 100}%` }} aria-label={`${i + 1}번째 행 구분선`} title="드래그로 이동 · Delete로 삭제" onKeyDown={e => { if (/^Arrow|Delete|Backspace/.test(e.key)) { e.preventDefault(); nudge("rows", i, e.key); } }} />)}
          {(["nw", "ne", "sw", "se"] as const).map(handle => <button key={handle} data-drag={handle} className="pt-handle" style={{ left: `${(handle.includes("w") ? region.box.x : right(region.box)) * 100}%`, top: `${(handle.includes("n") ? region.box.y : bottom(region.box)) * 100}%` }} aria-label={`표 영역 ${handle} 모서리`} title="드래그로 표 영역 조절" />)}
        </>}
        {highlight && <div className="pt-highlight" style={styleBox(highlight)} />}
        {selection && <div className="pt-selection" style={styleBox(selection)} />}
      </div>
    </div>
  </div>;
}
