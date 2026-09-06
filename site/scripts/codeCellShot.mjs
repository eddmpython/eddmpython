import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blog = process.env.CELL_BLOG_URL ?? "http://127.0.0.1:5174/blog/csv-parquet/";
const course = process.env.CELL_COURSE_URL ?? "http://127.0.0.1:8787/room-test";
const postsDir = resolve(site, "../blog/posts");
const blogPages = [];
for (const entry of await readdir(postsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const body = await readFile(join(postsDir, entry.name, "index.md"), "utf8");
  if (!/^https:\/\/eddmpython\.com\/codaro\/run\/\?example=/m.test(body)) continue;
  const slug = body.match(/^slug:\s*(.+)$/m)?.[1].trim();
  assert.ok(slug, `${entry.name} slug`);
  blogPages.push([`blog-${entry.name}`, new URL(`/blog/${slug}/`, blog).href, ""]);
}
const runId = new Date().toISOString().replace(/[-:.]/g, "");
const outDir = resolve(executionRoot(), "visual", runId);
await mkdir(outDir, { recursive: true });
const report = { runId, blog, course, viewports: [] };
console.log(`code cell evidence: ${outDir}`);

for (const viewport of [{ id: "desktop", width: 1440, height: 1000 }, { id: "mobile", width: 390, height: 844 }]) {
  const manifestPath = join(outDir, `code-cell.${viewport.id}.json`);
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: 1,
    engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
    timeoutMs: 180000,
    browser: {
      enabled: true, provider: "nativeCdp", allowedOrigins: [...new Set([new URL(blog).origin, new URL(course).origin])],
      maxRisk: "externalEffect", actions: ["screenshot", "waitFor", "click"],
      methods: ["Runtime.evaluate", "Input.dispatchKeyEvent", "Input.insertText"],
      viewport: { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false, touch: false },
      externalEffects: "acknowledged", purpose: "블로그와 강의장 코드셀의 실제 키 입력, 실행과 화면 검증",
      artifacts: { maxArtifactBytes: 33554432, maxTotalBytes: 134217728, maxArtifacts: 32, inlineMaxBytes: 4194304, ttlMs: 900000 },
    },
  }, null, 2));
  const checked = await PyProcControlClient.check(manifestPath, { cwd: site, timeoutMs: 30000 });
  assert.equal(checked.ok, true, JSON.stringify(checked));
  const client = await PyProcControlClient.start(manifestPath, { cwd: site, startupTimeoutMs: 180000, shutdownTimeoutMs: 30000 });
  const results = { viewport, pages: [] };
  report.viewports.push(results);
  let session;
  const evaluate = async (expression) => {
    const response = await client.command(session, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, { expectedRisk: "externalEffect", timeoutMs: 180000 });
    const result = response.output?.result;
    if (result?.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result?.result?.value;
  };
  const open = async (url) => {
    const target = await client.openTarget(url, { expectedRisk: "externalEffect", waitUntil: "load", timeoutMs: 30000 });
    session = (await client.attachSession(target.output.targetRef)).output;
  };
  const press = async (key, modifiers = 0) => {
    const windowsVirtualKeyCode = { Tab: 9, Enter: 13, Escape: 27, a: 65 }[key];
    for (const type of ["keyDown", "keyUp"]) await client.command(session, "Input.dispatchKeyEvent", { type, key, code: key === "a" ? "KeyA" : key, windowsVirtualKeyCode, modifiers }, { expectedRisk: "externalEffect" });
  };
  const fill = async (index, code) => {
    await evaluate(`document.querySelectorAll('.eddm-cell .cell-c')[${index}].focus()`);
    await press("a", 2);
    await client.command(session, "Input.insertText", { text: code }, { expectedRisk: "externalEffect" });
  };
  const waitDone = (index) => evaluate(`(async () => {
    const cell = document.querySelectorAll('.eddm-cell')[${index}];
    const start = Date.now();
    while (!['done', 'error', 'unsupported'].includes(cell.dataset.cellState)) {
      if (Date.now() - start > 150000) throw new Error('코드 실행 대기 시간 초과');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { state: cell.dataset.cellState, output: cell.querySelector('.cell-o').textContent.trim() };
  })()`);
  const screenshot = async (name) => {
    const position = await evaluate(`(async () => {
      await document.fonts.ready;
      const cell = document.querySelector('.eddm-cell');
      document.activeElement?.blur();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.scrollTo({ top: scrollY + cell.getBoundingClientRect().top - 40, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 300));
      return { top:cell.getBoundingClientRect().top, bottom:cell.getBoundingClientRect().bottom, scrollY, viewport:innerHeight };
    })()`);
    assert.ok(position.top >= 0 && position.top < position.viewport - 100, `코드셀 시작이 캡처 영역에 없습니다: ${JSON.stringify(position)}`);
    const result = await client.act(session, [{ kind: "screenshot", format: "jpeg", quality: 90, expectedRisk: "read" }], { timeoutMs: 60000 });
    const image = result.attachments.find(item => item.mimeType === "image/jpeg");
    assert.ok(image);
    const file = `${name}.${viewport.id}.jpg`;
    await writeFile(join(outDir, file), image.bytes);
    const ref = result.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref);
    console.log(`screenshot: ${file}`);
    return file;
  };
  try {
    for (const [kind, startUrl, lesson] of [...blogPages, ["course", course, "04-run-python-online"], ["course-multiple", course, "03-python-basic-syntax"]]) {
      await open(startUrl);
      if (kind.startsWith("course") && new URL(startUrl).pathname === "/room-test") {
        const href = await evaluate(`Array.from(document.querySelectorAll('a.post')).find(a => a.href.includes(${JSON.stringify(lesson)}))?.href`);
        assert.ok(href, `${lesson} 교안 링크`);
        await open(href);
      }
      await evaluate(`(async () => {
        const start = Date.now();
        while (!document.querySelector('.eddm-cell .cell-c')) {
          if (Date.now() - start > 30000) throw new Error('코드셀을 찾지 못했습니다');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      })()`);
      const page = { kind, url: await evaluate("location.href"), examples: [], screenshots: [] };
      results.pages.push(page);
      if (kind.startsWith("blog-")) {
        const headings = await evaluate(`Array.from(document.querySelectorAll('#content h2.eddm-section-title')).map(h => ({ id: h.id, number: h.firstElementChild.textContent, linked: Array.from(document.querySelectorAll('[data-blog-toc-desktop] a')).some(a => a.hash === '#' + encodeURIComponent(h.id)) }))`);
        assert.ok(headings.length > 0);
        headings.forEach((heading, index) => {
          assert.equal(heading.number, String(index + 1).padStart(2, "0"));
          assert.ok(heading.id && heading.linked, `목차와 섹션 연결: ${heading.id}`);
        });
      }
      const originals = await evaluate(`Array.from(document.querySelectorAll('.eddm-cell .cell-c')).map(t => t.value)`);
      assert.ok(originals.length >= 1, `${kind} 실행 셀`);
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('.cell-out')).every(n => n.hidden)`), true);
      for (let index = 0; index < originals.length; index++) {
        await evaluate(`document.querySelectorAll('.eddm-cell .cell-run')[${index}].click()`);
        const result = await waitDone(index);
        assert.equal(result.state, "done", `${kind} example ${index}: ${result.output}`);
        assert.ok(result.output.length);
        page.examples.push(result);
        console.log(`${viewport.id} ${kind} example ${index + 1}: done`);
      }
      await fill(0, "for n in range(2):\nprint(n)");
      // 둘째 줄 시작은 고정 예제에서 직접 계산한다.
      await evaluate(`{ const t = document.querySelector('.cell-c'); const at = t.value.indexOf('print'); t.setSelectionRange(at, at); }`);
      await press("Tab");
      assert.deepEqual(await evaluate(`({ code: document.querySelector('.cell-c').value, focused: document.activeElement === document.querySelector('.cell-c') })`), { code: "for n in range(2):\n    print(n)", focused: true });
      await press("Enter", 8);
      assert.deepEqual(await waitDone(0), { state: "done", output: "0\n1" });
      assert.equal(await evaluate(`document.querySelector('.cell-c').value`), "for n in range(2):\n    print(n)");
      await press("a", 2);
      await press("Tab");
      assert.equal(await evaluate(`document.querySelector('.cell-c').value`), "    for n in range(2):\n        print(n)");
      await press("Tab", 8);
      assert.equal(await evaluate(`document.querySelector('.cell-c').value`), "for n in range(2):\n    print(n)");
      await press("Escape");
      await press("Tab");
      assert.equal(await evaluate(`document.activeElement === document.querySelector('.cell-c')`), false);
      if (originals.length > 1) {
        await fill(0, "import asyncio\nprint('first-start')\nawait asyncio.sleep(0.5)\nprint('first-end')");
        await fill(1, "print('second-only')");
        await evaluate(`{ const buttons = document.querySelectorAll('.eddm-cell .cell-run'); buttons[0].click(); buttons[1].click(); }`);
        assert.deepEqual(await waitDone(0), { state: "done", output: "first-start\nfirst-end" });
        assert.deepEqual(await waitDone(1), { state: "done", output: "second-only" });
        page.queue = "separate outputs";
      } else {
        assert.notEqual(kind, "course-multiple", "여러 셀 교안에서 실행 순서 검증");
      }
      await fill(0, "raise ValueError('cell-check')");
      await press("Enter", 8);
      const error = await waitDone(0);
      assert.equal(error.state, "error");
      assert.ok(error.output.includes("cell-check"));
      await evaluate(`document.querySelector('.eddm-cell .cell-reset').click()`);
      assert.equal(await evaluate(`document.querySelector('.cell-c').value`), originals[0]);
      await press("Enter", 8);
      assert.equal((await waitDone(0)).state, "done");
      page.keyboard = "Tab, Shift+Tab, Shift+Enter, Esc+Tab";
      page.errorRecovery = true;
      page.layout = await evaluate(`(() => {
        const cell = document.querySelector('.eddm-cell');
        const button = cell.querySelector('.cell-run').getBoundingClientRect();
        const input = cell.querySelector('.cell-c').getBoundingClientRect();
        const style = getComputedStyle(cell);
        return { leftButton: button.right <= input.left, border: style.borderWidth, radius: style.borderRadius, overflow: document.documentElement.scrollWidth > innerWidth, inputHeight: input.height };
      })()`);
      assert.equal(page.layout.leftButton, true);
      assert.equal(page.layout.border, "0px");
      assert.equal(page.layout.radius, "0px");
      assert.equal(page.layout.overflow, false);
      for (const theme of kind.startsWith("blog-") ? ["dark"] : ["light", "dark"]) {
        await evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
        page.screenshots.push(await screenshot(`${kind}.${theme}`));
      }
    }
  } finally {
    await client.close();
    await writeFile(join(outDir, "code-cell-report.json"), JSON.stringify(report, null, 2));
  }
}
console.log("코드셀: 양쪽 예제, 실제 키 입력, 출력 분리, 오류 복구, 데스크톱과 모바일 확인");
import { executionRoot } from "./executionWorkspace.mjs";
