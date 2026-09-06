export const loadPdfEngine = () => import("pdfjs-dist");
export type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
export { default as pdfWorkerUrl } from "pdfjs-dist/build/pdf.worker.min.mjs?url";
export { createWorker, OEM, PSM } from "tesseract.js";
export type { Worker as OcrWorker } from "tesseract.js";
export const loadPdfWriter = () => import("pdf-lib");
export const loadPdfFont = () => import("@pdf-lib/fontkit");
