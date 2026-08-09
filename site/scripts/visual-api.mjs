import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";
import { VISUAL_VIEWPORTS, visualContractFor } from "./visual-contract.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(SITE_ROOT, "..");
const OUTPUT_ROOT = resolve(SITE_ROOT, "../../eddmpython.out");
const DIST_ROOT = join(OUTPUT_ROOT, "site-dist");
const VISUAL_ROOT = join(OUTPUT_ROOT, "visual");
const APPROVAL_PATH = join(VISUAL_ROOT, "approval.json");

function assertOutputBoundary(path) {
  const rel = relative(OUTPUT_ROOT, resolve(path));
  if (!rel || rel.startsWith("..") || rel.includes(":")) {
    throw new Error(`시각 검증 산출물 경계가 잘못됐습니다: ${path}`);
  }
  const repoRel = relative(REPO_ROOT, resolve(path));
  if (!repoRel.startsWith("..") && !repoRel.includes(":")) {
    throw new Error(`시각 검증 산출물은 저장소 밖에 있어야 합니다: ${path}`);
  }
}

async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const out = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path)));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

export async function fingerprintBuild() {
  if (!existsSync(join(DIST_ROOT, "index.html"))) {
    throw new Error("프로덕션 빌드가 없습니다. 먼저 npm run build를 실행합니다");
  }
  const hash = createHash("sha256");
  for (const path of await filesUnder(DIST_ROOT)) {
    hash.update(relative(DIST_ROOT, path).replace(/\\/g, "/"));
    hash.update("\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function pathsFromSitemap(xml) {
  const paths = [];
  for (const match of xml.matchAll(/<loc>https:\/\/eddmpython\.com([^<]*)<\/loc>/g)) {
    paths.push(match[1] || "/");
  }
  if (!paths.length) throw new Error("sitemap.xml에서 시각 검증 경로를 찾지 못했습니다");
  return [...new Set(paths)];
}

async function launchChromium() {
  const requested = process.env.BROWSER_PATH?.trim();
  if (requested) {
    if (!existsSync(requested)) throw new Error(`BROWSER_PATH가 없습니다: ${requested}`);
    return {
      browser: await chromium.launch({ headless: true, executablePath: requested }),
      browserName: requested,
    };
  }

  const attempts = [];
  for (const channel of ["msedge", "chrome"]) {
    try {
      return {
        browser: await chromium.launch({ headless: true, channel }),
        browserName: channel,
      };
    } catch (error) {
      attempts.push(`${channel}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }

  const bundled = chromium.executablePath();
  if (existsSync(bundled)) {
    return {
      browser: await chromium.launch({ headless: true }),
      browserName: "playwright-chromium",
    };
  }

  throw new Error(
    `Chromium 계열 브라우저를 시작하지 못했습니다. BROWSER_PATH를 지정하거나 npx playwright install chromium을 실행합니다\n${attempts.join("\n")}`,
  );
}

async function openPreview(baseUrl) {
  if (baseUrl) return { baseUrl: baseUrl.replace(/\/$/, ""), close: async () => {} };

  const requestedPort = process.env.VISUAL_PORT?.trim();
  const port = requestedPort ? Number(requestedPort) : 0;
  const server = await preview({
    root: SITE_ROOT,
    configFile: resolve(SITE_ROOT, "vite.config.ts"),
    preview: { host: "127.0.0.1", port, strictPort: Boolean(requestedPort) },
    logLevel: "error",
  });
  const localUrl = server.resolvedUrls?.local?.[0];
  if (!localUrl) {
    await new Promise((resolveClose) => server.httpServer.close(() => resolveClose()));
    throw new Error("Vite preview 주소를 확인하지 못했습니다");
  }
  return {
    baseUrl: new URL(localUrl).origin,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.httpServer.close((error) => (error ? rejectClose(error) : resolveClose()));
      }),
  };
}

async function runDeclaredCheck(page, check) {
  if (check.type === "visible") {
    const visible = await page.locator(check.selector).first().isVisible();
    if (!visible) throw new Error(`보이지 않는 요소: ${check.selector}`);
    return;
  }
  if (check.type === "count") {
    const count = await page.locator(check.selector).count();
    if (check.exact !== undefined && count !== check.exact) {
      throw new Error(`${check.selector} 개수 ${count}, 기대 ${check.exact}`);
    }
    if (check.min !== undefined && count < check.min) {
      throw new Error(`${check.selector} 개수 ${count}, 최소 ${check.min}`);
    }
    return;
  }
  if (check.type === "text") {
    const text = await page.locator(check.selector).allTextContents();
    if (!text.some((value) => value.includes(check.includes))) {
      throw new Error(`${check.selector}에서 텍스트를 찾지 못했습니다: ${check.includes}`);
    }
    return;
  }
  if (check.type === "equal-count") {
    const [left, right] = await Promise.all([
      page.locator(check.left).count(),
      page.locator(check.right).count(),
    ]);
    if (left !== right) throw new Error(`${check.left} ${left}개와 ${check.right} ${right}개가 다릅니다`);
    return;
  }
  throw new Error(`지원하지 않는 시각 검증 규칙: ${check.type}`);
}

async function runInteraction(page, interaction) {
  if (interaction.type !== "click-until-text") {
    throw new Error(`지원하지 않는 상호작용 검증: ${interaction.type}`);
  }
  await page.locator(interaction.click).first().click();
  await page.waitForFunction(
    ({ selector, includes }) => document.querySelector(selector)?.textContent?.includes(includes),
    { selector: interaction.target, includes: interaction.includes },
    { timeout: interaction.timeoutMs ?? 30_000 },
  );
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => document.readyState === "complete");
  await page.evaluate(() => {
    for (const image of document.images) {
      const style = getComputedStyle(image);
      const relevant =
        image.getAttribute("aria-hidden") !== "true" &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0;
      if (relevant) image.loading = "eager";
    }
  });
  await page.waitForFunction(
    () =>
      Array.from(document.images).every((image) => {
        const style = getComputedStyle(image);
        const relevant =
          image.getAttribute("aria-hidden") !== "true" &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0;
        return !relevant || image.complete;
      }),
    null,
    { timeout: 30_000 },
  );
  await page.evaluate(async () => {
    const relevant = Array.from(document.images).filter((image) => {
      const style = getComputedStyle(image);
      return (
        image.getAttribute("aria-hidden") !== "true" &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0
      );
    });
    await Promise.allSettled(relevant.map((image) => image.decode()));
  });
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}",
  });
}

async function primeFullPagePaint(page) {
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    for (let top = 0; top < height; top += step) {
      window.scrollTo(0, top);
      await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
    }
    window.scrollTo(0, 0);
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });
}

async function returnToPageTop(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
    );
  });
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const relevantImages = Array.from(document.images).filter((image) => {
      const style = getComputedStyle(image);
      return (
        image.getAttribute("aria-hidden") !== "true" &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0
      );
    });
    const brokenImages = relevantImages
      .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
      .map((image) => image.currentSrc || image.src)
      .slice(0, 10);
    return {
      title: document.title,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
      scrollHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
      imageCount: document.images.length,
      renderedImageCount: relevantImages.length,
      brokenImages,
    };
  });
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

export async function captureVisualEvidence({ baseUrl, routeFilters = [] } = {}) {
  assertOutputBoundary(VISUAL_ROOT);
  const distSha256 = await fingerprintBuild();
  const sitemap = await readFile(join(DIST_ROOT, "sitemap.xml"), "utf8");
  const contracts = pathsFromSitemap(sitemap).map(visualContractFor);
  const selected = routeFilters.length
    ? contracts.filter((contract) =>
        routeFilters.some((filter) => filter === contract.id || filter === contract.path),
      )
    : contracts;
  if (!selected.length) {
    throw new Error(`선택한 시각 검증 경로가 없습니다: ${routeFilters.join(", ")}`);
  }

  const runId = new Date().toISOString().replace(/[-:.]/g, "");
  const runDir = join(VISUAL_ROOT, runId);
  assertOutputBoundary(runDir);
  await mkdir(runDir, { recursive: true });

  const { browser, browserName } = await launchChromium();
  let previewServer;
  try {
    previewServer = await openPreview(baseUrl);
  } catch (error) {
    await browser.close();
    throw error;
  }
  const results = [];

  try {
    for (const contract of selected) {
      for (const viewport of VISUAL_VIEWPORTS) {
        const startedAt = Date.now();
        const errors = [];
        const requestFailures = [];
        const screenshotFiles = [];
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          screen: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch,
          locale: "ko-KR",
          timezoneId: "Asia/Seoul",
          colorScheme: "dark",
          reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(`pageerror: ${errorText(error)}`));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(`console: ${message.text()}`);
        });
        page.on("requestfailed", (request) => {
          if (["document", "stylesheet", "script", "image", "font"].includes(request.resourceType())) {
            requestFailures.push(`${request.resourceType()}: ${request.url()}`);
          }
        });

        let metrics = null;
        try {
          const previewPath = contract.path === "/" ? "/" : `${contract.path}/`;
          const response = await page.goto(`${previewServer.baseUrl}${previewPath}`, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          if (!response?.ok()) errors.push(`HTTP 상태 ${response?.status() ?? "없음"}`);
          await waitForStablePage(page);
          await primeFullPagePaint(page);
          metrics = await inspectPage(page);
          if (metrics.scrollWidth > metrics.viewportWidth + 1) {
            errors.push(`가로 넘침 ${metrics.scrollWidth}px, 뷰포트 ${metrics.viewportWidth}px`);
          }
          if (metrics.brokenImages.length) {
            errors.push(`깨진 이미지 ${metrics.brokenImages.join(", ")}`);
          }
          for (const check of contract.checks) {
            try {
              await runDeclaredCheck(page, check);
            } catch (error) {
              errors.push(errorText(error));
            }
          }
          for (const interaction of contract.interactions) {
            try {
              await runInteraction(page, interaction);
            } catch (error) {
              errors.push(`${interaction.id}: ${errorText(error)}`);
            }
          }
        } catch (error) {
          errors.push(errorText(error));
        }

        if (requestFailures.length) errors.push(...requestFailures);
        try {
          await returnToPageTop(page);
          const topFile = `${contract.id}.${viewport.id}.top.jpg`;
          await page.screenshot({
            path: join(runDir, topFile),
            type: "jpeg",
            quality: 88,
            fullPage: false,
            animations: "disabled",
            caret: "hide",
          });
          screenshotFiles.push({ kind: "top", file: topFile });

          const fullFile = `${contract.id}.${viewport.id}.full.jpg`;
          await page.screenshot({
            path: join(runDir, fullFile),
            type: "jpeg",
            quality: 84,
            fullPage: true,
            animations: "disabled",
            caret: "hide",
          });
          screenshotFiles.push({ kind: "full", file: fullFile });

          for (const capture of contract.captures) {
            const focusFile = `${contract.id}.${viewport.id}.${capture.id}.jpg`;
            await page.locator(capture.selector).first().screenshot({
              path: join(runDir, focusFile),
              type: "jpeg",
              quality: 90,
              animations: "disabled",
              caret: "hide",
            });
            screenshotFiles.push({
              kind: "focus",
              id: capture.id,
              selector: capture.selector,
              file: focusFile,
            });
          }
        } catch (error) {
          errors.push(`스크린샷 실패: ${errorText(error)}`);
        }
        await context.close();

        results.push({
          routeId: contract.id,
          path: contract.path,
          viewport: viewport.id,
          width: viewport.width,
          height: viewport.height,
          screenshots: screenshotFiles,
          status: errors.length ? "failed" : "passed",
          durationMs: Date.now() - startedAt,
          metrics,
          errors,
        });
      }
    }
  } finally {
    await browser.close();
    await previewServer.close();
  }

  const report = {
    version: 1,
    runId,
    createdAt: new Date().toISOString(),
    status: results.every((result) => result.status === "passed") ? "passed" : "failed",
    reviewStatus: "pending",
    reviewRequired: true,
    deploymentEligible: !baseUrl,
    coverage: {
      full: selected.length === contracts.length,
      selectedRoutes: selected.length,
      totalRoutes: contracts.length,
      viewportCount: VISUAL_VIEWPORTS.length,
    },
    distSha256,
    browser: browserName,
    baseUrl: previewServer.baseUrl,
    artifactDir: runDir,
    results,
  };
  await writeFile(join(runDir, "visual-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

export async function approveVisualEvidence(runId) {
  assertOutputBoundary(VISUAL_ROOT);
  const reportPath = join(VISUAL_ROOT, runId, "visual-report.json");
  assertOutputBoundary(reportPath);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (report.status !== "passed") throw new Error(`${runId} 시각 검증이 통과하지 않았습니다`);
  if (!report.coverage?.full) {
    throw new Error(`${runId}은 일부 경로만 검사해 배포 승인에 사용할 수 없습니다`);
  }
  if (!report.deploymentEligible) {
    throw new Error(`${runId}은 외부 URL을 검사한 진단 실행이라 배포 승인에 사용할 수 없습니다`);
  }
  const current = await fingerprintBuild();
  if (report.distSha256 !== current) {
    throw new Error("시각 증거를 만든 뒤 빌드가 바뀌었습니다. 전체 경로를 다시 capture합니다");
  }

  for (const result of report.results) {
    if (!result.screenshots?.length) {
      throw new Error(`승인할 스크린샷 목록이 없습니다: ${result.routeId}/${result.viewport}`);
    }
    for (const item of result.screenshots) {
      const screenshot = join(VISUAL_ROOT, runId, item.file);
      if (!existsSync(screenshot) || (await stat(screenshot)).size === 0) {
        throw new Error(`승인할 스크린샷이 없습니다: ${item.file}`);
      }
    }
  }

  const approval = {
    version: 1,
    runId,
    approvedAt: new Date().toISOString(),
    distSha256: report.distSha256,
    screenshots: report.results.flatMap((result) =>
      result.screenshots.map((item) => ({
        routeId: result.routeId,
        viewport: result.viewport,
        kind: item.kind,
        file: item.file,
      })),
    ),
  };
  await mkdir(VISUAL_ROOT, { recursive: true });
  await writeFile(APPROVAL_PATH, `${JSON.stringify(approval, null, 2)}\n`, "utf8");
  return approval;
}

export async function assertVisualApproval() {
  assertOutputBoundary(APPROVAL_PATH);
  if (!existsSync(APPROVAL_PATH)) {
    throw new Error("시각 검증 승인이 없습니다. capture와 이미지 확인, approve를 먼저 실행합니다");
  }
  const approval = JSON.parse(await readFile(APPROVAL_PATH, "utf8"));
  const current = await fingerprintBuild();
  if (approval.distSha256 !== current) {
    throw new Error(
      `시각 검증 뒤 빌드가 바뀌었습니다. 승인 ${approval.distSha256}, 현재 ${current}`,
    );
  }
  return approval;
}

export const visualPaths = {
  siteRoot: SITE_ROOT,
  outputRoot: OUTPUT_ROOT,
  distRoot: DIST_ROOT,
  visualRoot: VISUAL_ROOT,
  approvalPath: APPROVAL_PATH,
};
