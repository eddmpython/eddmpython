import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { executionRoot } from "../../../../site/scripts/executionWorkspace.mjs";

const site = fileURLToPath(new URL("../../../../site/", import.meta.url));
const require = createRequire(new URL("../../../../site/package.json", import.meta.url));
const { PyProcControlClient } = await import(pathToFileURL(require.resolve("pyproc/control")).href);
const root = executionRoot();
const out = join(root, "visual", "excel-compare");
const stage = join(root, "blog-media", "007-excel-compare");
const captureMedia = process.env.EXCEL_CAPTURE_MEDIA === "1";
await mkdir(out, { recursive: true });
if (captureMedia) await mkdir(stage, { recursive: true });
const url = process.env.EXCEL_TEST_URL || "http://127.0.0.1:5174/blog/excel-compare";
const report = [];

for (const width of [1440, 390]) {
  const manifest = join(out, `browser-${width}.json`);
  await writeFile(manifest, JSON.stringify({ schemaVersion: 1, engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" }, timeoutMs: 120000,
    browser: { enabled: true, provider: "nativeCdp", allowedOrigins: [new URL(url).origin], maxRisk: "externalEffect", actions: ["click", "screenshot", "waitFor"], methods: ["Runtime.evaluate", "Input.dispatchKeyEvent", "Input.insertText"], viewport: { width, height: 1000, deviceScaleFactor: 1, mobile: false, touch: false }, externalEffects: "acknowledged", purpose: "공개 엑셀 비교 도구의 예제, 결과 내보내기 및 반응형 화면 검증", artifacts: { maxArtifactBytes: 33554432, maxTotalBytes: 134217728, maxArtifacts: 32, inlineMaxBytes: 4194304, ttlMs: 900000 } } }, null, 2));
  const check = await PyProcControlClient.check(manifest, { cwd: site, timeoutMs: 30000 });
  assert.equal(check.ok, true, JSON.stringify(check));
  const client = await PyProcControlClient.start(manifest, { cwd: site, startupTimeoutMs: 120000 });
  try {
    const opened = await client.openTarget(url, { expectedRisk: "externalEffect", waitUntil: "commit", timeoutMs: 30000 });
    const session = (await client.attachSession(opened.output.targetRef)).output;
    const evaluate = async expression => {
      const r = await client.command(session, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, { expectedRisk: "externalEffect", timeoutMs: 60000 });
      if (r.output?.result?.exceptionDetails) throw new Error(JSON.stringify(r.output.result.exceptionDetails));
      return r.output?.result?.result?.value;
    };
    const wait = expression => evaluate(`(async()=>{const start=Date.now();while(!(${expression})){if(Date.now()-start>45000)throw new Error('화면 대기 실패: '+${JSON.stringify(expression)});await new Promise(r=>setTimeout(r,100));}return true})()`);
    const click = text => evaluate(`(()=>{const button=Array.from(document.querySelectorAll('[data-excel-compare] button')).find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button)throw new Error('버튼 없음');button.click();return true})()`);
    const capture = async (name, selector, destination = out) => {
      const clip = await evaluate(`(async()=>{await document.fonts.ready;document.activeElement?.blur();document.querySelectorAll('.fade-up,.reveal').forEach(e=>{e.style.opacity='1';e.style.transform='none'});const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>setTimeout(r,250));const rect=e.getBoundingClientRect();const tool=document.querySelector('[data-excel-compare]').getBoundingClientRect();const width=Math.min(innerWidth,tool.width+24);return {x:Math.max(0,tool.left+scrollX-12),y:Math.max(0,rect.top+scrollY-12),width,height:Math.round(width*9/16),scale:1}})()`);
      const r = await client.act(session, [{ kind: "screenshot", format: "png", ...(destination === out ? {} : { clip }), expectedRisk: "read" }], { timeoutMs: 60000 });
      const image = r.attachments.find(item => item.mimeType === "image/png"); assert.ok(image);
      const path = join(destination, `${name}.png`); await writeFile(path, image.bytes);
      const artifact = r.output?.actions?.[0]?.result?.artifactRef; if (artifact) await client.deleteArtifact(artifact);
      console.log(path); return path;
    };
    await wait("document.querySelector('[data-excel-compare]')");
    const sections = await evaluate("Array.from(document.querySelectorAll('[data-article-body] h2')).filter(h=>!h.closest('[data-excel-compare]')).map(h=>h.textContent).filter(t=>!t.endsWith('더 해 볼 것'))");
    assert.equal(sections.length, 8);
    for (const [i, heading] of sections.entries()) {
      const section = await evaluate(`(async()=>{const h=Array.from(document.querySelectorAll('[data-article-body] h2')).find(h=>h.textContent===${JSON.stringify(heading)});h.scrollIntoView({block:'start',behavior:'instant'});let n=h.nextElementSibling;const nodes=[];while(n&&n.tagName!=='H2'){nodes.push(n);n=n.nextElementSibling}const images=nodes.flatMap(n=>Array.from(n.querySelectorAll('img')));await Promise.all(images.map(image=>image.decode()));await document.fonts.ready;await new Promise(r=>setTimeout(r,200));return {subtitle:nodes[0]?.tagName,images:images.map(image=>({width:image.naturalWidth,height:image.naturalHeight,alt:image.alt})),overflow:document.documentElement.scrollWidth>innerWidth}})()`);
      assert.equal(section.subtitle, 'H3'); assert.equal(section.images.length, 1); assert.ok(section.images[0].width > 0); assert.equal(section.overflow, false);
      const shot = await client.act(session, [{ kind: 'screenshot', format: 'png', expectedRisk: 'read' }], { timeoutMs: 60000 });
      const picture = shot.attachments.find(item=>item.mimeType==='image/png'); assert.ok(picture);
      await writeFile(join(out, `article-${width}-${i + 1}.png`), picture.bytes);
      const artifact = shot.output?.actions?.[0]?.result?.artifactRef; if (artifact) await client.deleteArtifact(artifact);
    }
    await capture(`empty-${width}`, "[data-excel-compare]");
    await click("예제로 시작");
    await wait("(document.querySelectorAll('.xc-count').length===2 && !document.querySelector('.xc-status')) || document.querySelector('[role=alert]')");
    assert.equal(await evaluate("document.querySelector('[role=alert]')?.textContent || ''"), "");
    await capture(`loaded-${width}`, ".xc-files");
    if (width === 1440 && captureMedia) {
      await capture("file-selection", ".xc-files", stage);
      await capture("key-selection", ".xc-settings", stage);
      await evaluate(`document.querySelectorAll('.xc-settings fieldset')[1].querySelectorAll('input').forEach(i=>{if(['상품명','담당자'].includes(i.parentElement.textContent.trim()))i.click()})`);
      await capture("value-columns", ".xc-settings fieldset:nth-of-type(2)", stage);
      await evaluate(`document.querySelectorAll('.xc-settings fieldset')[1].querySelectorAll('input').forEach(i=>{if(!i.checked)i.click()})`);
    }
    await evaluate(`document.querySelector('.xc-preview').open=true`);
    assert.ok((await evaluate("document.querySelector('.xc-preview').textContent")).includes("0012"));
    await evaluate(`document.querySelector('.xc-preview').open=false`);
    await click("변경 내역 찾기 ↗");
    await wait("document.querySelector('[data-excel-result]')");
    const summary = await evaluate("Array.from(document.querySelectorAll('.xc-summary strong')).map(e=>Number(e.textContent))");
    assert.deepEqual(summary, [1, 1, 1, 2]);
    await capture(`result-${width}`, ".xc-result");
    if (width === 1440 && captureMedia) await capture("sample-result", ".xc-result", stage);
    await click("변경");
    assert.equal(await evaluate("document.querySelectorAll('.xc-result tbody tr').length"), 2);
    if (width === 1440 && captureMedia) await capture("changed-values", ".xc-filters", stage);
    // 내려받을 Blob 자체를 읽어 검증한다. 브로커 외부의 기본 다운로드 폴더에는 파일을 쓰지 않는다.
    await evaluate(`window.__excelDownload=null;const blobs=new Map();const create=URL.createObjectURL.bind(URL);URL.createObjectURL=function(blob){const url=create(blob);blobs.set(url,blob);return url};HTMLAnchorElement.prototype.click=function(){if(!this.download)return;const name=this.download;blobs.get(this.href).arrayBuffer().then(b=>{window.__excelDownload={name,bytes:Array.from(new Uint8Array(b))}})}`);
    await click("전체 결과 .xlsx 내려받기");
    await wait("window.__excelDownload && document.querySelector('.xc-live').textContent.includes('다운로드')");
    const download = await evaluate("window.__excelDownload");
    assert.equal(download.name, "엑셀_변경내역.xlsx");
    const XLSX = require("xlsx");
    const book = XLSX.read(Uint8Array.from(download.bytes), { type: "array" });
    assert.equal(book.Sheets["변경 내역"].E2.v, 24);
    assert.equal(book.Sheets["변경 내역"].B2.v, "0012");
    assert.equal(XLSX.utils.sheet_to_json(book.Sheets["변경 내역"], { header: 1 }).length, 11);
    if (width === 1440 && captureMedia) await capture("download-report", ".xc-live", stage);
    const overflow = await evaluate("document.documentElement.scrollWidth > innerWidth");
    assert.equal(overflow, false);
    await click("파일과 결과 지우기");
    assert.equal(await evaluate("document.querySelector('[data-excel-result]')===null && document.querySelectorAll('.xc-count').length===0"), true);
    const makeFile = rows => { const b=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet(rows),'재고'); return Array.from(new Uint8Array(XLSX.write(b,{type:'array',bookType:'xlsx',compression:true}))); };
    const rows = [['상품코드','상품명','재고'],['0012','무선 마우스',30],['0013','키보드',15]];
    const setFile = async (data, side) => {
      await evaluate(`(()=>{const file=new File([new Uint8Array(${JSON.stringify(data)})],${JSON.stringify(side === 0 ? "재고_이전.xlsx" : "재고_이후.xlsx")},{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelectorAll('input[type=file]')[${side}];input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await wait("!document.querySelector('.xc-status')");
    };
    await setFile(makeFile(rows), 0);
    const typed=structuredClone(rows);typed[1][2]='30';
    await setFile(makeFile(typed), 1);
    await wait("document.querySelectorAll('.xc-count').length===2");
    await click("변경 내역 찾기 ↗"); await wait("document.querySelector('[data-excel-result]')");
    assert.equal(await evaluate("document.querySelectorAll('.xc-result tbody tr').length"),1);
    assert.ok((await evaluate("document.querySelector('.xc-result tbody').textContent")).includes('문자'));
    if(width===1440 && captureMedia)await capture('value-types','.xc-filters',stage);
    const spaced=structuredClone(rows);spaced[1][1]='무선 마우스 ';
    await setFile(makeFile(spaced),1);
    await click("변경 내역 찾기 ↗");await wait("document.querySelector('[data-excel-result]')");
    assert.equal(await evaluate("document.querySelector('.xc-summary strong').textContent"),'1');
    await evaluate("document.querySelector('.xc-trim input').click()");
    await click("변경 내역 찾기 ↗");await wait("document.querySelector('[data-excel-result]')");
    assert.equal(await evaluate("document.querySelector('.xc-summary strong').textContent"),'0');
    if(width===1440 && captureMedia)await capture('trim-spaces','.xc-trim',stage);
    const repeated=structuredClone(rows);repeated[2][0]='0012';
    await setFile(makeFile(repeated),1);
    await click("변경 내역 찾기 ↗");await wait("document.querySelector('[role=alert]')");
    assert.ok((await evaluate("document.querySelector('[role=alert]').textContent")).includes('2행과 3행'));
    assert.ok((await evaluate("document.querySelector('[role=alert]').textContent")).includes('재고_이후.xlsx'));
    assert.equal(await evaluate("document.querySelector('[data-excel-result]')===null"),true);
    await capture(`duplicate-${width}`,'.xc-warning');
    await click('파일과 결과 지우기');
    await setFile(makeFile([['재고 보고서'],[],...rows]),0);
    await wait("document.querySelector('[role=alert]')");
    assert.ok((await evaluate("document.querySelector('[role=alert]').textContent")).includes('B1'));
    await evaluate(`(()=>{const select=document.querySelector('select[aria-label="이전 파일 제목 행"]');select.value='3';select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await wait("document.querySelector('.xc-count') && !document.querySelector('.xc-status')");
    assert.equal(await evaluate("document.querySelector('[role=alert]')?.textContent || ''"),'');
    await click('파일과 결과 지우기');
    assert.equal(await evaluate("document.querySelectorAll('.xc-count').length"),0);
    report.push({ width, summary, articleSections:sections.length, downloadBytes: download.bytes.length, downloadedCells: 10, overflow, reset: true, fileInputs:true, types:true, trim:true, duplicateBlocked:true, headerRecovery:true });
    console.log(JSON.stringify(report.at(-1)));
  } finally { await client.close(); }
}
await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2));
