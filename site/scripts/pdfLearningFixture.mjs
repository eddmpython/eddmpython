import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { executionRoot } from "./executionWorkspace.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url)).replaceAll("\\", "/");
const output = join(executionRoot(), "tmp", "pdfLearningFixture");
await mkdir(output, { recursive: true });
const origin = process.env.PDF_TEST_ORIGIN || "http://127.0.0.1:5175";
const manifest = join(output, "control.json");
await writeFile(manifest, JSON.stringify({ schemaVersion: 1, engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" }, timeoutMs: 120000,
  browser: { enabled: true, provider: "nativeCdp", allowedOrigins: [origin], maxRisk: "externalEffect", actions: ["screenshot"], methods: ["Runtime.evaluate"],
    viewport: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, touch: false }, externalEffects: "acknowledged", purpose: "공통 PDF 입력과 JavaScript 표 추출 결과 생성" } }));

async function collect(base) {
  const { sampleFiles } = await import(base + "sample.ts");
  const { openPdf, readPage } = await import(base + "pdf.ts");
  const { suggestBox, makeRegion, extract, numberValue } = await import(base + "model.ts");
  const files = await sampleFiles(), inputs = [], tables = [];
  for (const [index, file] of files.entries()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    (window.pdfLearningBytes ??= []).push(bytes);
    inputs.push({ name: file.name, byteLength: bytes.length });
    const source = await openPdf(file, "fixture-" + index);
    try {
      for (let pageNumber = 1; pageNumber <= source.pdf.numPages; pageNumber++) {
        const page = await readPage(source, pageNumber), box = suggestBox(page);
        if (!box) throw new Error("예제 표를 찾지 못함");
        const region = makeRegion(page, box, "table-" + pageNumber, "표 1"); region.numberColumns = [2, 3, 4];
        const table = extract(page, region);
        tables.push({ file: file.name, page: pageNumber, table: 1, headers: table.headers,
          rows: table.data.map(row => row.map((cell, column) => column >= 2 ? numberValue(cell.value) : cell.value)) });
      }
    } finally { await source.close(); }
  }
  return { inputs, tables };
}

const client = await PyProcControlClient.start(manifest, { cwd: join(root, "site"), startupTimeoutMs: 120000 });
console.log("PDF fixture control started");
try {
  const opened = await client.openTarget(origin + "/blog/pdf-table", { expectedRisk: "externalEffect", waitUntil: "commit" });
  const attached = await client.attachSession(opened.output.targetRef);
  console.log("PDF fixture page attached");
  const base = "/@fs/" + root + "blog/posts/008-pdf-table/tool/";
  const response = await client.command(attached.output, "Runtime.evaluate", { awaitPromise: true, returnByValue: true,
    expression: "(" + collect.toString() + ")(" + JSON.stringify(base) + ")" }, { expectedRisk: "externalEffect", timeoutMs: 60000 });
  if (response.output.result.exceptionDetails) throw new Error(JSON.stringify(response.output.result.exceptionDetails));
  const result = response.output.result.result.value;
  const sourceBytes = await readFile(join(root, "blog/posts/008-pdf-table/tool/sampleData.json"));
  const data = JSON.parse(sourceBytes);
  const expected = data.documents.flatMap(document => document.pages.map((rows, index) => ({ file: document.name, page: index + 1, table: 1, headers: data.headers,
    rows: rows.map(row => row.map((value, column) => column >= 2 ? Number(value.replaceAll(",", "")) : value)) })));
  assert.deepEqual(result.tables, expected);
  const inputs = [];
  for (const [index, input] of result.inputs.entries()) {
    const chunks = [];
    for (let start = 0; start < input.byteLength; start += 16384) {
      const chunk = await client.command(attached.output, "Runtime.evaluate", { returnByValue: true,
        expression: "btoa(String.fromCharCode(...window.pdfLearningBytes[" + index + "].subarray(" + start + "," + (start + 16384) + ")))" }, { expectedRisk: "externalEffect" });
      chunks.push(Buffer.from(chunk.output.result.result.value, "base64"));
    }
    const bytes = Buffer.concat(chunks);
    assert.equal(bytes.length, input.byteLength);
    await writeFile(join(output, input.name), bytes);
    inputs.push({ name: input.name, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  await writeFile(join(output, "sampleData.json"), sourceBytes);
  await writeFile(join(output, "result.json"), JSON.stringify({ schemaVersion: 1,
    source: "blog/posts/008-pdf-table/tool/sampleData.json", sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"), inputs, tables: result.tables }, null, 2) + "\n");
  console.log(JSON.stringify({ output, files: inputs.length, pages: result.tables.length, rows: result.tables.flatMap(table => table.rows).length }));
  await client.detachSession(attached.output);
} catch (error) {
  console.error(client.diagnostics);
  throw error;
} finally { await client.close(); }
