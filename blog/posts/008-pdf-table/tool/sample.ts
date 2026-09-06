import { loadPdfWriter, loadPdfFont } from "../../../../site/src/pdfLibraries";
import { DESIGN } from "../../../../site/src/design";
import { runtimeBase } from "./runtimePaths";
import { openPdf, readPage } from "./pdf";

import sampleData from "./sampleData.json";
export async function sampleFiles(): Promise<File[]> {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([loadPdfWriter(), loadPdfFont()]);
  const color = (hex: string) => rgb(...[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255) as [number, number, number]);
  const response = await fetch(`${runtimeBase}sample.ttf`);
  if (!response.ok) throw new Error("예제 글꼴을 읽지 못했습니다. 다시 시도해 주세요");
  const fontBytes = new Uint8Array(await response.arrayBuffer());
  const files: File[] = [];
  for (const [part, document] of sampleData.documents.entries()) {
    const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
    const font = await pdf.embedFont(fontBytes, { subset: false });
    pdf.setTitle("사무용품 입고 내역 · 실습용 합성 자료"); pdf.setAuthor("eddmpython");
    for (const [pageIndex, sampleRows] of document.pages.entries()) {
      const page = pdf.addPage([595, 760]);
      const ink = color(DESIGN.palette.carbon), accent = color(DESIGN.palette.brandDeep);
      const text = (value: string, x: number, top: number, size = 11) => page.drawText(value, { x, y: 760 - top, font, size, color: ink });
      text("WAREHOUSE / OPERATIONS", 44, 54, 9);
      text("사무용품 입고 내역", 44, 96, 25);
      text(`창고 ${part === 0 ? "A" : "B"} · ${pageIndex + 1} / ${document.pages.length}`, 44, 124, 11);
      text("실습용으로 만든 자료입니다. 실제 거래 내역이 아닙니다.", 44, 153, 9);
      const x = [44, 111, 292, 356, 440, 551], y = 213, rowHeight = 45;
      page.drawRectangle({ x: 44, y: 760 - y - 17, width: 507, height: rowHeight, color: color(DESIGN.palette.ivory) });
      const rows = [sampleData.headers, ...sampleRows];
      rows.forEach((row, r) => {
        row.forEach((value, c) => text(value, x[c] + 9, y + r * rowHeight, r === 0 ? 10 : 11));
        page.drawLine({ start: { x: 44, y: 760 - y - r * rowHeight - 17 }, end: { x: 551, y: 760 - y - r * rowHeight - 17 }, thickness: 0.35, color: ink, opacity: 0.22 });
      });
      const total = sampleRows.reduce((sum, row) => sum + Number(row[4].replaceAll(",", "")), 0);
      text("확인할 합계", 350, 477, 10);
      page.drawText(`${total.toLocaleString("en-US")} 원`, { x: 440, y: 760 - 477, size: 11, font, color: accent });
      text("상품코드의 앞자리 0은 유지합니다. 단위: 원 / 수량: 개", 44, 525, 9);
      text("표 바깥의 합계는 검증 기준으로 사용합니다.", 44, 544, 9);
      text("eddmpython  |  PDF 표 추출 예제", 44, 710, 9);
      text(String(pageIndex + 1), 540, 710, 9);
    }
    files.push(new File([Uint8Array.from(await pdf.save()).buffer], document.name, { type: "application/pdf" }));
  }
  return files;
}

export async function scanSample(): Promise<File[]> {
  const { PDFDocument } = await loadPdfWriter();
  const files = await sampleFiles(), source = await openPdf(files[0], "scan-sample");
  const canvas = document.createElement("canvas");
  try {
    await readPage(source, 1);
    const page = await source.pdf.getPage(1), viewport = page.getViewport({ scale: 2 });
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const pdf = await PDFDocument.create(), image = await pdf.embedPng(canvas.toDataURL("image/png"));
    pdf.addPage([595, 760]).drawImage(image, { x: 0, y: 0, width: 595, height: 760 });
    return [new File([Uint8Array.from(await pdf.save()).buffer], "입고내역_스캔본.pdf", { type: "application/pdf" })];
  } finally { canvas.width = 0; canvas.height = 0; await source.close(); }
}
