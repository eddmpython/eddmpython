import { loadPdfEngine, pdfWorkerUrl, createWorker, OEM, PSM, type PDFDocumentProxy, type OcrWorker } from "../../../../site/src/pdfLibraries";
import { limits, type PageData, type Word } from "./model";
import { runtimeBase } from "./runtimePaths";

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new Error("작업을 취소했습니다"));
    if (signal.aborted) { void promise.catch(() => {}); cancel(); return; }
    signal.addEventListener("abort", cancel, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", cancel));
  });
}

export type SourceFile = { id: string; name: string; bytes: Uint8Array; pdf: PDFDocumentProxy; pages: PageData[]; close: () => Promise<void> };
export async function openPdf(file: File, id: string, signal?: AbortSignal): Promise<SourceFile> {
  if (!/\.pdf$/i.test(file.name)) throw new Error(`${file.name}: PDF 파일을 선택해 주세요`);
  if (!file.size || file.size > limits.fileBytes) throw new Error(`${file.name}: 파일은 30MB 이하만 열 수 있습니다`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { getDocument, GlobalWorkerOptions } = await loadPdfEngine();
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = getDocument({ data: bytes.slice(), cMapUrl: `${runtimeBase}pdf/cmaps/`, cMapPacked: true, standardFontDataUrl: `${runtimeBase}pdf/standard_fonts/`, wasmUrl: `${runtimeBase}pdf/wasm/`, enableXfa: false });
  const cancel = () => { void task.destroy(); };
  signal?.addEventListener("abort", cancel, { once: true });
  const pdf = await (signal ? abortable(task.promise, signal) : task.promise).catch(error => {
    void task.destroy();
    if (signal?.aborted) throw new Error("파일 열기를 취소했습니다");
    if (error?.name === "PasswordException") throw new Error(`${file.name}: 암호가 걸린 PDF입니다. 암호를 해제한 사본을 선택해 주세요`);
    throw new Error(`${file.name}: PDF를 읽지 못했습니다. 파일이 정상적으로 열리는지 확인해 주세요`);
  }).finally(() => signal?.removeEventListener("abort", cancel));
  if (pdf.numPages > limits.pages) { await task.destroy(); throw new Error(`${file.name}: ${limits.pages}페이지 이하만 열 수 있습니다`); }
  return { id, name: file.name, bytes, pdf, close: () => task.destroy(), pages: Array.from({ length: pdf.numPages }, (_, i) => ({ id: `${id}:${i + 1}`, fileId: id, fileName: file.name, number: i + 1, width: 0, height: 0, words: [], method: "text" as const })) };
}
export async function readPage(file: SourceFile, number: number): Promise<PageData> {
  const cached = file.pages[number - 1];
  if (cached.width) return cached;
  const page = await file.pdf.getPage(number), viewport = page.getViewport({ scale: 1 });
  const text = await page.getTextContent();
  const { Util } = await loadPdfEngine();
  const words: Word[] = [];
  for (const [index, item] of text.items.entries()) {
    if (!("str" in item) || !item.str.trim()) continue;
    const transform = Util.transform(viewport.transform, item.transform);
    const height = Math.hypot(transform[2], transform[3]);
    const style = text.styles[item.fontName];
    const ascent = style?.ascent ?? (style?.descent ? 1 + style.descent : 0.8);
    const angle = Math.atan2(transform[1], transform[0]);
    const width = Math.abs(item.width);
    const corners = [[0, -height * ascent], [width, -height * ascent], [width, height * (1 - ascent)], [0, height * (1 - ascent)]].map(([x, y]) => ({ x: transform[4] + x * Math.cos(angle) - y * Math.sin(angle), y: transform[5] + x * Math.sin(angle) + y * Math.cos(angle) }));
    const x = Math.min(...corners.map(p => p.x)), y = Math.min(...corners.map(p => p.y));
    words.push({ id: `${cached.id}:${index}`, text: item.str, x: x / viewport.width, y: y / viewport.height, width: (Math.max(...corners.map(p => p.x)) - x) / viewport.width, height: (Math.max(...corners.map(p => p.y)) - y) / viewport.height });
  }
  if (words.length > limits.words) throw new Error(`${file.name} ${number}페이지: 글자 조각이 너무 많습니다. 필요한 페이지만 분리해 주세요`);
  const data: PageData = { ...cached, width: viewport.width, height: viewport.height, words };
  file.pages[number - 1] = data;
  return data;
}
export class OcrSession {
  private worker?: OcrWorker;
  private loading?: Promise<OcrWorker>;
  private disposed = false;
  private controller = new AbortController();
  private cancelRender?: () => void;
  async recognize(file: SourceFile, number: number, onProgress: (value: number) => void): Promise<PageData> {
    const run = <T>(promise: Promise<T>) => abortable(promise, this.controller.signal);
    const data = await readPage(file, number), page = await file.pdf.getPage(number);
    const scale = Math.min(2.5, Math.sqrt(limits.renderPixels / (data.width * data.height)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const rendering = page.render({ canvas, viewport });
    this.cancelRender = () => rendering.cancel();
    try {
    await run(rendering.promise);
    if (!this.loading) this.loading = createWorker(["kor", "eng"], OEM.LSTM_ONLY, {
      workerPath: `${runtimeBase}ocr/worker.min.js`, corePath: `${runtimeBase}ocr/`, langPath: `${runtimeBase}ocr`, workerBlobURL: false, cacheMethod: "none",
      logger: message => { if (!this.disposed && message.status === "recognizing text") onProgress(message.progress); },
    }).then(worker => { if (this.disposed) { void worker.terminate(); throw new Error("글자 인식을 취소했습니다"); } this.worker = worker; return worker; });
    const worker = await run(this.loading);
      await run(worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: "1" }));
      const result = await run(worker.recognize(canvas, {}, { blocks: true, text: true }));
      const tokens = (result.data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.flatMap(line => line.words)));
      if (tokens.length > limits.words) throw new Error("인식된 글자가 너무 많습니다");
      const words: Word[] = tokens.filter(word => word.text.trim()).map((word, i) => ({ id: `${data.id}:ocr:${i}`, text: word.text, confidence: word.confidence, x: word.bbox.x0 / canvas.width, y: word.bbox.y0 / canvas.height, width: (word.bbox.x1 - word.bbox.x0) / canvas.width, height: (word.bbox.y1 - word.bbox.y0) / canvas.height }));
      const next: PageData = { ...data, method: "ocr", words }; file.pages[number - 1] = next; return next;
    } finally { this.cancelRender = undefined; canvas.width = 0; canvas.height = 0; }
  }
  async close() { if (this.disposed) return; this.disposed = true; this.controller.abort(); this.cancelRender?.(); if (this.worker) await this.worker.terminate(); }
}
