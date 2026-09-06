import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { executionRoot } from "../../../../site/scripts/executionWorkspace.mjs";

const site = fileURLToPath(new URL("../../../../site/", import.meta.url));
const require = createRequire(new URL("../../../../site/package.json", import.meta.url));
const XLSX = require("xlsx");
const { PyProcControlClient } = await import(pathToFileURL(require.resolve("pyproc/control")).href);
const out = join(executionRoot(), "visual", "pdf-table");
const stage = join(executionRoot(), "blog-media", "008-pdf-table");
const captureMedia = process.env.PDF_CAPTURE_MEDIA === "1";
const articleOnly = process.env.PDF_TEST_ARTICLE === "1";
await mkdir(out, { recursive: true });
if (captureMedia) await mkdir(stage, { recursive: true });
const baseUrl = process.env.PDF_TEST_URL || "http://127.0.0.1:5175/blog/pdf-table";
const report = [];
for (const width of articleOnly ? [1440, 390] : [1440, 390, 1024]) {
  const manifest = join(out, `browser-${width}.json`);
  await writeFile(manifest, JSON.stringify({ schemaVersion: 1, engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" }, timeoutMs: 120000,
    browser: { enabled: true, provider: "nativeCdp", allowedOrigins: [new URL(baseUrl).origin], maxRisk: "externalEffect", actions: ["click", "screenshot", "waitFor"], methods: ["Runtime.evaluate", "Input.dispatchKeyEvent", "Input.insertText", "Input.dispatchMouseEvent", "Input.dispatchDragEvent"], viewport: { width, height: 1000, deviceScaleFactor: width === 1440 ? 2 : 1, mobile: false, touch: false }, externalEffects: "acknowledged", purpose: "PDF 표 작업대의 실제 파일 추출, 드래그, 원문 대조, 내보내기 검증", artifacts: { maxArtifactBytes: 33554432, maxTotalBytes: 134217728, maxArtifacts: 32, inlineMaxBytes: 4194304, ttlMs: 900000 } } }, null, 2));
  const check = await PyProcControlClient.check(manifest, { cwd: site, timeoutMs: 30000 }); assert.equal(check.ok, true, JSON.stringify(check));
  const client = await PyProcControlClient.start(manifest, { cwd: site, startupTimeoutMs: 120000 });
  try {
    const opened = await client.openTarget(baseUrl, { expectedRisk: "externalEffect", waitUntil: "commit", timeoutMs: 30000 });
    const session = (await client.attachSession(opened.output.targetRef)).output;
    const evaluate = async expression => {
      const response = await client.command(session, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, { expectedRisk: "externalEffect", timeoutMs: 60000 });
      if (response.output?.result?.exceptionDetails) throw new Error(JSON.stringify(response.output.result.exceptionDetails));
      return response.output?.result?.result?.value;
    };
    const wait = expression => evaluate(`(async()=>{const start=Date.now();while(!(${expression})){if(Date.now()-start>45000)throw new Error('대기 실패: '+${JSON.stringify(expression)}+' '+document.body.innerText.slice(-1500));await new Promise(r=>setTimeout(r,100));}return true})()`);
    const click = text => evaluate(`(()=>{const button=Array.from(document.querySelectorAll('[data-pdf-table] button')).find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button)throw new Error('버튼 없음: '+${JSON.stringify(text)});button.click();return true})()`);
    const mouse = (type, x, y, extra = {}) => client.command(session, "Input.dispatchMouseEvent", { type, x, y, ...extra }, { expectedRisk: "externalEffect" });
    const bounds = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
    const press = async (selector, modifiers = 0) => { const r = await bounds(selector); await mouse("mousePressed", r.x + r.width / 2, r.y + r.height / 2, { button: "left", clickCount: 1, modifiers }); await mouse("mouseReleased", r.x + r.width / 2, r.y + r.height / 2, { button: "left", clickCount: 1, modifiers }); };
    const drag = async (start, end) => {
      await mouse("mouseMoved", start.x, start.y);
      await mouse("mousePressed", start.x, start.y, { button: "left", buttons: 1, clickCount: 1 });
      for (let i = 1; i <= 12; i++) await mouse("mouseMoved", start.x + (end.x - start.x) * i / 12, start.y + (end.y - start.y) * i / 12, { button: "left", buttons: 1 });
      await mouse("mouseReleased", end.x, end.y, { button: "left", clickCount: 1 });
    };
    const key = (key, code = key) => client.command(session, "Input.dispatchKeyEvent", { type: "keyDown", key, code }, { expectedRisk: "externalEffect" });
    const type = value => client.command(session, "Input.insertText", { text: value }, { expectedRisk: "externalEffect" });
    const shot = async name => {
      await evaluate(`(async()=>{await document.fonts.ready;document.querySelectorAll('.fade-up,.reveal').forEach(e=>{e.style.opacity='1';e.style.transform='none'});document.querySelector('[data-pdf-table]').scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>setTimeout(r,200))})()`);
      const result = await client.act(session, [{ kind: "screenshot", format: "png", expectedRisk: "read" }], { timeoutMs: 60000 });
      const image = result.attachments.find(item => item.mimeType === "image/png"); assert.ok(image);
      const path = join(out, `${name}-${width}.png`); await writeFile(path, image.bytes); console.log(path);
      const artifact = result.output?.actions?.[0]?.result?.artifactRef; if (artifact) await client.deleteArtifact(artifact);
    };
    const media = async (name, selector, offset = 0) => {
      if (!captureMedia || width !== 1440) return;
      const clip = await evaluate(`(async()=>{document.activeElement?.blur();const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});await document.fonts.ready;const r=e.getBoundingClientRect();const w=Math.min(innerWidth-24,r.width+24);return{x:Math.max(0,r.x+scrollX-12),y:Math.max(0,r.y+scrollY-12+${offset}),width:w,height:Math.ceil(w*9/16),scale:1}})()`);
      const result = await client.act(session, [{ kind: "screenshot", format: "png", clip, expectedRisk: "read" }], { timeoutMs: 60000 });
      const image = result.attachments.find(item => item.mimeType === "image/png"); assert.ok(image);
      await writeFile(join(stage, `${name}.png`), image.bytes);
      const artifact = result.output?.actions?.[0]?.result?.artifactRef; if (artifact) await client.deleteArtifact(artifact);
      console.log(`media: ${name}`);
    };
    await wait("document.querySelector('[data-pdf-table]')");
    if (articleOnly) {
      await evaluate("document.querySelectorAll('[data-article-visual] img').forEach(img=>img.loading='eager')");
      await wait("document.querySelectorAll('[data-article-visual] img').length===9 && Array.from(document.querySelectorAll('[data-article-visual] img')).every(img=>img.complete&&img.naturalWidth>0)");
      const sections = await evaluate("Array.from(document.querySelectorAll('[data-article-body] h2.eddm-section-title')).slice(0,9).map(h=>({id:h.id,subtitle:h.nextElementSibling?.tagName,figure:h.nextElementSibling?.nextElementSibling?.tagName,src:h.nextElementSibling?.nextElementSibling?.querySelector('img')?.src,alt:h.nextElementSibling?.nextElementSibling?.querySelector('img')?.alt,fit:getComputedStyle(h.nextElementSibling.nextElementSibling.querySelector('img')).objectFit}))");
      assert.equal(sections.length, 9); assert.equal(new Set(sections.map(s=>s.src)).size, 9);
      for (const section of sections) { assert.equal(section.subtitle, "H3"); assert.equal(section.figure, "FIGURE"); assert.ok(section.alt); assert.equal(section.fit, "contain"); }
      assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false);
      const missing = await evaluate("Array.from(document.querySelectorAll('[data-article-body] a[href^=\"#\"]')).filter(a=>!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash)");
      assert.deepEqual(missing, []);
      for (const [i, section] of sections.entries()) {
        await evaluate(`(async()=>{document.getElementById(${JSON.stringify(section.id)}).scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>setTimeout(r,150))})()`);
        const result = await client.act(session, [{ kind: "screenshot", format: "png", expectedRisk: "read" }], { timeoutMs: 60000 });
        const image = result.attachments.find(item=>item.mimeType==="image/png"); assert.ok(image);
        await writeFile(join(out, `article-${i+1}-${width}.png`), image.bytes);
        const artifact = result.output?.actions?.[0]?.result?.artifactRef; if (artifact) await client.deleteArtifact(artifact);
      }
      console.log(JSON.stringify({width,sections})); report.push({width,sections});
      continue;
    }
    await evaluate(`(()=>{window.__downloads=[];const blobs=new Map();const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)return original.call(this);const name=this.download,blob=blobs.get(this.href);if(!blob)throw new Error('다운로드 Blob 없음');blob.arrayBuffer().then(buffer=>{const a=new Uint8Array(buffer);let b='';for(let i=0;i<a.length;i+=8192)b+=String.fromCharCode(...a.subarray(i,i+8192));window.__downloads.push({name,base64:btoa(b)});});};return true})()`);
    await shot("empty");
    if (width === 1024) {
      await click("스캔본 예제 열기");
      await wait("!document.querySelector('.pt-busy') && document.querySelector('.pt-source-footer')?.textContent.includes('텍스트 없는 페이지')");
      await click("스캔본 글자 인식");
      await wait("!document.querySelector('.pt-busy') && document.querySelector('.pt-source-footer')?.textContent.includes('글자 인식 결과')");
      assert.equal(await evaluate("document.querySelectorAll('.pt-grid tbody tr').length"), 4);
      await shot("scan-example");
      report.push({ width, scanExample: true });
      continue;
    }
    await click("예제로 둘러보기");
    await wait("document.querySelector('.pt-workspace') || document.querySelector('.pt-error')");
    await wait("!document.querySelector('.pt-busy')");
    const error = await evaluate("document.querySelector('.pt-error')?.textContent || ''");
    console.log(JSON.stringify({ width, error }));
    await shot("loaded");
    assert.equal(error, "");
    await wait("document.querySelector('.pt-paper[data-rendered=true]')");
    const initial = await evaluate("({head:Array.from(document.querySelectorAll('.pt-grid thead input')).map(e=>e.value), rows:document.querySelectorAll('.pt-grid tbody tr').length, text:document.querySelector('.pt-grid')?.textContent, overflow:document.documentElement.scrollWidth>innerWidth})");
    console.log(JSON.stringify({ width, initial }));
    assert.equal(initial.rows, 4); assert.equal(initial.overflow, false); assert.equal(initial.head.length, 5);
    await media("workspace", ".pt-editors");
    if (width === 1440) {
      await click("원본 저장");
      await wait("window.__downloads.length===1");
      const original = await evaluate("window.__downloads[0]");
      await writeFile(join(out, "sampleA.pdf"), Buffer.from(original.base64, "base64"));
      const before = await evaluate("document.querySelector('.pt-cut-column').style.left");
      const cut = await bounds(".pt-cut-column");
      await drag({ x: cut.x + cut.width / 2, y: cut.y + 12 }, { x: cut.x + cut.width / 2 + 20, y: cut.y + 12 });
      assert.notEqual(await evaluate("document.querySelector('.pt-cut-column').style.left"), before);
      await media("columns", ".pt-source-pane", 250);
      await press('button[aria-label="되돌리기"]');
      assert.equal(await evaluate("document.querySelector('.pt-cut-column').style.left"), before);
      await press(".pt-cut-column"); await key("Delete");
      assert.equal(await evaluate("document.querySelectorAll('.pt-cut-column').length"), 3);
      await press('button[aria-label="되돌리기"]');
      const divider = await bounds(".pt-splitter");
      await drag({ x: divider.x + 4, y: divider.y + 30 }, { x: divider.x - 50, y: divider.y + 30 });
      assert.ok(Number(await evaluate("document.querySelector('.pt-splitter').getAttribute('aria-valuenow')")) < 52);
      await press('[data-cell="1:1"] button'); await key("F2");
      await type("무선 마우스 검토"); await key("Enter");
      assert.equal(await evaluate("document.querySelector('[data-cell=\"1:1\"] button').textContent"), "무선 마우스 검토");
      await shot("edit");
      await media("trace", ".pt-inspector");
      await press('button[aria-label="되돌리기"]');
      assert.equal(await evaluate("document.querySelector('[data-cell=\"1:1\"] button').textContent"), "무선 마우스");
      await press('[data-cell="1:1"] button'); await key("F2"); await type("취소할 수정"); await key("Escape");
      assert.equal(await evaluate("document.querySelector('[data-cell=\"1:1\"] button').textContent"), "무선 마우스");
      await press('[data-cell="1:0"] button'); await press('[data-cell="1:1"] button', 8); await click("셀 병합");
      assert.equal(await evaluate("document.querySelector('[data-cell=\"1:0\"]').colSpan"), 2);
      await press('button[aria-label="되돌리기"]');
      await press('button[aria-label="금액 (원) 숫자 열"]');
      await press('input[aria-label="금액 (원) 기준 합계"]'); await type("1,723,000");
      await wait("document.querySelector('.pt-totals')?.textContent.includes('합계 일치')");
      await press('[data-cell="1:4"] button');
      await shot("verify");
      await media("totals", ".pt-inspector", 0);
      const area = await evaluate("(()=>{const s=document.querySelector('.pt-region').style;return{x:parseFloat(s.left)/100,y:parseFloat(s.top)/100,width:parseFloat(s.width)/100,height:parseFloat(s.height)/100}})()");
      await press('.pt-file-group:first-child>button:nth-of-type(2)');
      await wait("document.querySelector('.pt-paper[data-rendered=true]') && !document.querySelector('.pt-region')");
      const paper = await bounds(".pt-overlay");
      await drag({ x: paper.x + area.x * paper.width, y: paper.y + area.y * paper.height }, { x: paper.x + (area.x + area.width) * paper.width, y: paper.y + (area.y + area.height) * paper.height });
      await wait("document.querySelectorAll('.pt-region-chip').length===2");
      assert.equal(await evaluate("document.querySelectorAll('.pt-grid tbody tr').length"), 4);
      await shot("dragged");
      await media("area", ".pt-source-pane", 235);
      await press('.pt-file-group:first-child>button:first-of-type');
    }
    await click("다른 페이지에도 적용");
    await wait("document.querySelectorAll('.pt-region-chip').length===3");
    await shot("collected");
    await media("batch", ".pt-workspace", 260);
    if (width === 1440) {
      const firstName = await evaluate("document.querySelector('.pt-region-chip small').textContent");
      const start = await bounds(".pt-region-chip:first-child .pt-grip"), end = await bounds(".pt-region-chip:nth-child(3) .pt-grip");
      await drag({ x: start.x + start.width / 2, y: start.y + start.height / 2 }, { x: end.x + end.width / 2, y: end.y + end.height / 2 });
      assert.notEqual(await evaluate("document.querySelector('.pt-region-chip small').textContent"), firstName);
      await press('button[aria-label="되돌리기"]');
      await press('button[aria-label="2행 제외"]');
      assert.ok((await evaluate("document.querySelector('.pt-command>.pt-primary').textContent")).includes("11행"));
      await press('button[aria-label="되돌리기"]');
    }
    if (width === 390) { await click("추출한 표 4행"); await shot("table"); assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"), false); }
    await evaluate("document.querySelector('.pt-command>.pt-primary').click()");
    await wait("window.__downloads.some(d=>d.name.endsWith('.xlsx'))");
    const exported = await evaluate("window.__downloads.find(d=>d.name.endsWith('.xlsx'))");
    const bytes = Buffer.from(exported.base64, "base64"), book = XLSX.read(bytes, { type: "buffer" });
    assert.deepEqual(book.SheetNames, ["통합 표", "원문 근거", "검토 항목"]);
    assert.equal(XLSX.utils.sheet_to_json(book.Sheets["통합 표"], { header: 1 }).length, 13);
    assert.equal(book.Sheets["통합 표"].A2.v, "0012"); assert.equal(book.Sheets["통합 표"].A2.t, "s");
    await writeFile(join(out, `export-${width}.xlsx`), bytes);
    await media("download", ".pt-command");
    if (width === 1440) {
      await click("설정 저장");
      await wait("window.__downloads.some(d=>d.name.endsWith('.json'))");
      const recipe = await evaluate("window.__downloads.find(d=>d.name.endsWith('.json'))");
      const settings = JSON.parse(Buffer.from(recipe.base64, "base64").toString("utf8"));
      assert.equal(settings.kind, "eddmpython-pdf-table"); assert.equal(JSON.stringify(settings).includes("456,000"), false);
      await media("recipe", ".pt-collection-heading>div");
      await evaluate(`(()=>{const t=new DataTransfer();t.items.add(new File(['not a PDF'],'invalid.pdf',{type:'application/pdf'}));const input=document.querySelector('input[aria-label="PDF 파일 선택"]');input.files=t.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
      await wait("!document.querySelector('.pt-busy') && document.querySelector('.pt-error')");
      assert.equal(await evaluate("document.querySelectorAll('.pt-region-chip').length"), 3);
      assert.equal(await evaluate("document.querySelectorAll('.pt-file-group').length"), 2);
      await press('button[aria-label="오류 메시지 닫기"]');
      await evaluate(`(()=>{const d=window.__downloads.find(d=>d.name.endsWith('.pdf'));const t=new DataTransfer();t.items.add(new File([Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0))],d.name,{type:'application/pdf'}));const input=document.querySelector('input[aria-label="PDF 파일 선택"]');input.files=t.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
      await wait("!document.querySelector('.pt-busy') && document.querySelectorAll('.pt-file-group').length===3");
      await evaluate(`(()=>{const d=window.__downloads.find(d=>d.name.endsWith('.json'));const f=new File([Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0))],d.name,{type:'application/json'});const t=new DataTransfer();t.items.add(f);const input=document.querySelector('input[aria-label="추출 설정 파일 선택"]');input.files=t.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
      await wait("document.querySelectorAll('.pt-region-chip').length===4");
      assert.equal(await evaluate("document.querySelectorAll('.pt-grid thead input').length"), 5);
      await press('button[aria-label="되돌리기"]');
      await press('button[aria-label="작업대 넓게 보기"]');
      assert.equal(await evaluate("document.querySelector('[data-pdf-table]').getBoundingClientRect().top"), 0);
      await shot("fullscreen");
      await press('button[aria-label="전체 화면 닫기"]');
      const raster = await evaluate("document.querySelector('.pt-paper canvas').toDataURL('image/png').split(',')[1]");
      const { PDFDocument } = require("pdf-lib");
      const scanned = await PDFDocument.create(), picture = await scanned.embedPng(Buffer.from(raster, "base64"));
      scanned.addPage([595, 760]).drawImage(picture, { x: 0, y: 0, width: 595, height: 760 });
      const scannedPath = join(out, "scanned.pdf"); await writeFile(scannedPath, await scanned.save());
      const target = await bounds(".pt-header"), x = target.x + 120, y = target.y + 30;
      for (const type of ["dragEnter", "dragOver", "drop"]) {
        const result = await client.command(session, "Input.dispatchDragEvent", { type, x, y, data: { items: [], files: [scannedPath], dragOperationsMask: 1 } }, { expectedRisk: "externalEffect" });
        assert.equal(result.output.state, "applied", JSON.stringify(result));
      }
      await wait("!document.querySelector('.pt-busy') && document.querySelector('.pt-source-footer')?.textContent.includes('텍스트 없는 페이지')");
      await click("스캔본 글자 인식");
      await wait("document.querySelector('.pt-busy')");
      await click("취소"); await wait("!document.querySelector('.pt-busy')");
      await click("스캔본 글자 인식");
      await wait("!document.querySelector('.pt-busy') && document.querySelector('.pt-source-footer')?.textContent.includes('글자 인식 결과')");
      const ocrText = await evaluate("document.querySelector('.pt-grid')?.textContent || ''");
      assert.ok(ocrText.includes("0012"), ocrText); assert.ok(ocrText.includes("456,000"), ocrText);
      assert.equal(await evaluate("document.querySelectorAll('.pt-grid tbody tr').length"), 4);
      assert.equal(await evaluate("document.querySelectorAll('.pt-grid thead input').length"), 5);
      console.log(JSON.stringify({ ocrText, rows: await evaluate("document.querySelectorAll('.pt-grid tbody tr').length"), columns: await evaluate("document.querySelectorAll('.pt-grid thead input').length") }));
      await shot("ocr"); await media("ocr", ".pt-editors");
      const external = await evaluate("performance.getEntriesByType('resource').filter(e=>/traineddata|tesseract|pdf.worker/.test(e.name)&&new URL(e.name).origin!==location.origin).map(e=>e.name)");
      assert.deepEqual(external, []);
    }
    report.push({ width, initial, tables: 3 });
  } finally { await client.close(); }
}
await writeFile(join(out, articleOnly ? "articleReport.json" : "report.json"), JSON.stringify(report, null, 2));
