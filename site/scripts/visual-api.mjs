import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { preview } from "vite";
import { VISUAL_VIEWPORTS, visualContractFor } from "./visual-contract.mjs";
import { planFullPageCaptures } from "./visual-capture-plan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(SITE_ROOT, "..");
const OUTPUT_ROOT = resolve(SITE_ROOT, "../../eddmpython.out");
const DIST_ROOT = join(OUTPUT_ROOT, "site-dist");
const VISUAL_ROOT = join(OUTPUT_ROOT, "visual");
const APPROVAL_PATH = join(VISUAL_ROOT, "approval.json");
const ENGINE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

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

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

async function createVisualClient(baseUrl, viewport, runDir) {
  const executable = process.env.BROWSER_PATH?.trim();
  if (executable && !existsSync(executable)) throw new Error(`BROWSER_PATH가 없습니다: ${executable}`);
  const manifestPath = join(runDir, `pyproc-control.${viewport.id}.json`);
  const manifest = {
    schemaVersion: 1,
    engine: { indexURL: ENGINE_INDEX },
    timeoutMs: 180000,
    browser: {
      enabled: true,
      provider: "nativeCdp",
      allowedOrigins: [new URL(baseUrl).origin],
      maxRisk: "externalEffect",
      actions: ["snapshot", "screenshot", "waitFor", "hydrateLazy", "navigate", "click"],
      methods: ["Runtime.evaluate"],
      viewport: {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.isMobile,
        touch: viewport.hasTouch,
      },
      ...(executable ? { executable } : {}),
      externalEffects: "acknowledged",
      purpose: "eddmpython 데스크톱과 모바일 시각 검증",
      artifacts: {
        maxArtifactBytes: 33554432,
        maxTotalBytes: 134217728,
        maxArtifacts: 64,
        inlineMaxBytes: 4194304,
        ttlMs: 900000,
      },
    },
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const preflight = await PyProcControlClient.check(manifestPath, {
    cwd: SITE_ROOT,
    timeoutMs: 30000,
  });
  if (preflight.ok !== true) throw new Error(`pyproc-control preflight 실패: ${JSON.stringify(preflight)}`);
  const client = await PyProcControlClient.start(manifestPath, {
    cwd: SITE_ROOT,
    startupTimeoutMs: 180000,
    shutdownTimeoutMs: 30000,
  });
  return { client, manifestPath };
}

async function evaluate(client, sessionRef, expression, { awaitPromise = false } = {}) {
  const response = await client.command(
    sessionRef,
    "Runtime.evaluate",
    { expression, awaitPromise, returnByValue: true },
    { expectedRisk: "externalEffect", timeoutMs: 180000 },
  );
  const result = response.output?.result;
  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "브라우저 평가 실패");
  }
  return result?.result?.value;
}

async function preparePage(client, sessionRef) {
  return evaluate(
    client,
    sessionRef,
    `(async () => {
      const until = async (test, timeoutMs) => {
        const started = Date.now();
        while (!test()) {
          if (Date.now() - started > timeoutMs) throw new Error("페이지 준비 시간 초과");
          await new Promise((resolveWait) => setTimeout(resolveWait, 50));
        }
      };
      const settle = async (test, timeoutMs) => {
        const started = Date.now();
        while (!test()) {
          if (Date.now() - started > timeoutMs) return false;
          await new Promise((resolveWait) => setTimeout(resolveWait, 50));
        }
        return true;
      };
      await until(() => document.readyState === "complete", 30000);
      for (const image of document.images) {
        const style = getComputedStyle(image);
        const relevant = image.getAttribute("aria-hidden") !== "true"
          && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
        if (relevant) image.loading = "eager";
      }
      await settle(() => Array.from(document.images).every((image) => {
        const style = getComputedStyle(image);
        const relevant = image.getAttribute("aria-hidden") !== "true"
          && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
        return !relevant || image.complete;
      }), 30000);
      await Promise.allSettled(Array.from(document.images).map((image) => image.decode()));
      const retryDelays = [2000, 4000, 8000];
      for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
        const broken = Array.from(document.images).filter((image) => {
          const style = getComputedStyle(image);
          const relevant = image.getAttribute("aria-hidden") !== "true"
            && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
          return relevant && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0);
        });
        if (!broken.length) break;
        await new Promise((resolveWait) => setTimeout(resolveWait, retryDelays[attempt]));
        for (const image of broken) {
          const source = image.currentSrc || image.src;
          const retryUrl = new URL(source, location.href);
          retryUrl.searchParams.set("eddm_visual_retry", String(attempt + 1));
          image.removeAttribute("srcset");
          image.src = retryUrl.href;
        }
        await settle(() => broken.every((image) => image.complete), 30000);
        await Promise.allSettled(broken.map((image) => image.decode()));
      }
      if (document.fonts) await document.fonts.ready;
      const style = document.createElement("style");
      style.dataset.visualVerification = "true";
      style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}.fade-up,.reveal{opacity:1!important;transform:none!important}";
      document.head.appendChild(style);
      return true;
    })()`,
    { awaitPromise: true },
  );
}

async function inspectPage(client, sessionRef, checks) {
  return evaluate(
    client,
    sessionRef,
    `(() => {
      const checks = ${JSON.stringify(checks)};
      const errors = [];
      const visible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden"
          && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      for (const check of checks) {
        try {
          if (check.type === "visible") {
            if (!visible(document.querySelector(check.selector))) errors.push("보이지 않는 요소: " + check.selector);
          } else if (check.type === "count") {
            const count = document.querySelectorAll(check.selector).length;
            if (check.exact !== undefined && count !== check.exact) errors.push(check.selector + " 개수 " + count + ", 기대 " + check.exact);
            if (check.min !== undefined && count < check.min) errors.push(check.selector + " 개수 " + count + ", 최소 " + check.min);
          } else if (check.type === "text") {
            const found = Array.from(document.querySelectorAll(check.selector)).some((item) => item.textContent.includes(check.includes));
            if (!found) errors.push(check.selector + "에서 텍스트를 찾지 못했습니다: " + check.includes);
          } else if (check.type === "equal-count") {
            const left = document.querySelectorAll(check.left).length;
            const right = document.querySelectorAll(check.right).length;
            if (left !== right) errors.push(check.left + " " + left + "개와 " + check.right + " " + right + "개가 다릅니다");
          } else {
            errors.push("지원하지 않는 시각 검증 규칙: " + check.type);
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      const root = document.documentElement;
      const relevantImages = Array.from(document.images).filter((image) => {
        const style = getComputedStyle(image);
        return image.getAttribute("aria-hidden") !== "true" && style.display !== "none"
          && style.visibility !== "hidden" && Number(style.opacity) > 0;
      });
      return {
        errors,
        metrics: {
          title: document.title,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
          scrollHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
          imageCount: document.images.length,
          renderedImageCount: relevantImages.length,
          brokenImages: relevantImages.filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
            .map((image) => image.currentSrc || image.src).slice(0, 10),
        },
      };
    })()`,
  );
}

async function runInteraction(client, sessionRef, interaction) {
  if (interaction.type === "click-hash-target") {
    const target = await evaluate(
      client,
      sessionRef,
      `(() => {
        const link = document.querySelector(${JSON.stringify(interaction.click)});
        if (!link) throw new Error("목차 링크가 없습니다: " + ${JSON.stringify(interaction.click)});
        const href = link.getAttribute("href") ?? "";
        if (!href.startsWith("#")) throw new Error("목차 링크가 해시가 아닙니다: " + href);
        const id = decodeURIComponent(href.slice(1));
        if (!document.getElementById(id)) throw new Error("목차 대상이 없습니다: " + id);
        return { href, id };
      })()`,
    );
    await client.act(
      sessionRef,
      [{ kind: "click", selector: interaction.click, expectedRisk: "externalEffect" }],
      { timeoutMs: interaction.timeoutMs ?? 30000 },
    );
    return evaluate(
      client,
      sessionRef,
      `(async () => {
        const id = ${JSON.stringify(target.id)};
        const minTop = ${interaction.minTop ?? 80};
        const maxTop = ${interaction.maxTop ?? 112};
        const started = Date.now();
        while (true) {
          const currentId = decodeURIComponent(location.hash.slice(1));
          const activeHref = document.querySelector('nav[aria-label="글 목차"] a[aria-current="location"]')
            ?.getAttribute("href") ?? "";
          const activeId = activeHref.startsWith("#") ? decodeURIComponent(activeHref.slice(1)) : "";
          const top = document.getElementById(id)?.getBoundingClientRect().top;
          if (currentId === id && activeId === id && typeof top === "number" && top >= minTop && top <= maxTop) {
            await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
            await new Promise((resolveWait) => setTimeout(resolveWait, 200));
            return { hash: location.hash, activeId, targetId: id, targetTop: top };
          }
          if (Date.now() - started > ${interaction.timeoutMs ?? 30000}) {
            throw new Error("목차 위치 불일치: " + JSON.stringify({ currentId, activeId, id, top, minTop, maxTop }));
          }
          await new Promise((resolveWait) => setTimeout(resolveWait, 50));
        }
      })()`,
      { awaitPromise: true },
    );
    return;
  }
  if (interaction.type !== "click-until-text") {
    throw new Error(`지원하지 않는 상호작용 검증: ${interaction.type}`);
  }
  await client.act(
    sessionRef,
    [{ kind: "click", selector: interaction.click, expectedRisk: "externalEffect" }],
    { timeoutMs: interaction.timeoutMs ?? 30000 },
  );
  await evaluate(
    client,
    sessionRef,
    `(async () => {
      const selector = ${JSON.stringify(interaction.target)};
      const includes = ${JSON.stringify(interaction.includes)};
      const started = Date.now();
      while (!document.querySelector(selector)?.textContent?.includes(includes)) {
        if (Date.now() - started > ${interaction.timeoutMs ?? 30000}) throw new Error("기대 문장 대기 시간 초과: " + includes);
        await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      }
      return true;
    })()`,
    { awaitPromise: true },
  );
}

async function saveScreenshot(client, sessionRef, path, options) {
  const captured = await client.act(
    sessionRef,
    [{ kind: "screenshot", format: "jpeg", expectedRisk: "read", ...options }],
    { timeoutMs: 60000 },
  );
  const image = captured.attachments.find((item) => item.mimeType === "image/jpeg");
  if (!image) throw new Error(`screenshot attachment가 없습니다: ${path}`);
  await writeFile(path, image.bytes);
  const artifactRef = captured.output?.actions?.[0]?.result?.artifactRef;
  if (artifactRef) await client.deleteArtifact(artifactRef, { timeoutMs: 10000 });
}

function diagnosticErrors(startup, observation) {
  const errors = [];
  const payload = observation?.result ?? observation ?? {};
  for (const event of [...(startup?.console ?? []), ...(payload.console ?? [])]) {
    if ([event.type, event.level].some((value) => value === "error")) {
      errors.push(`console: ${(event.args ?? [event.text ?? "오류"]).join(" ")}`);
    }
  }
  for (const event of [...(startup?.network ?? []), ...(payload.network ?? [])]) {
    const failed = event.failed === true || /fail|error/i.test(event.phase ?? "");
    if (failed && ["document", "stylesheet", "script", "image", "font"].includes((event.resourceType ?? "").toLowerCase())) {
      errors.push(`${event.resourceType}: ${event.url ?? "알 수 없는 요청"}`);
    }
  }
  return errors;
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

  const previewServer = await openPreview(baseUrl);
  const results = [];
  let browserName = "pyproc-control";

  try {
    for (const viewport of VISUAL_VIEWPORTS) {
      const { client, manifestPath } = await createVisualClient(previewServer.baseUrl, viewport, runDir);
      try {
        const space = await client.inspectSpace({ timeoutMs: 30000 });
        browserName = space.output?.browser?.product ?? space.output?.browser?.name ?? browserName;
        for (const contract of selected) {
          const startedAt = Date.now();
          const errors = [];
          const screenshotFiles = [];
          const interactionEvidence = [];
          let metrics = null;
          let opened = null;
          let sessionRef = null;
          try {
          const previewPath = contract.path === "/" ? "/" : `${contract.path}/`;
          opened = await client.openTarget(`${previewServer.baseUrl}${previewPath}`, {
            expectedRisk: "externalEffect",
            waitUntil: "load",
            timeoutMs: 30000,
          });
          const attached = await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 });
          sessionRef = attached.output;
          await preparePage(client, sessionRef);
          const inspected = await inspectPage(client, sessionRef, contract.checks);
          metrics = inspected.metrics;
          errors.push(...inspected.errors);
          if (metrics.scrollWidth > metrics.viewportWidth + 1) {
            errors.push(`가로 넘침 ${metrics.scrollWidth}px, 뷰포트 ${metrics.viewportWidth}px`);
          }
          if (metrics.brokenImages.length) {
            errors.push(`깨진 이미지 ${metrics.brokenImages.join(", ")}`);
          }
          for (const interaction of contract.interactions) {
            if (interaction.viewports && !interaction.viewports.includes(viewport.id)) continue;
            try {
              const evidence = await runInteraction(client, sessionRef, interaction);
              const captured = { id: interaction.id, evidence };
              if (interaction.captureAfter) {
                const interactionFile = `${contract.id}.${viewport.id}.interaction-${interaction.id}.jpg`;
                await saveScreenshot(client, sessionRef, join(runDir, interactionFile), { quality: 90 });
                screenshotFiles.push({
                  kind: "interaction",
                  id: interaction.id,
                  file: interactionFile,
                });
                captured.screenshot = interactionFile;
              }
              interactionEvidence.push(captured);
            } catch (error) {
              errors.push(`${interaction.id}: ${errorText(error)}`);
            }
          }
          const observed = await client.observe(
            sessionRef,
            { expectedRisk: "read", maxNodes: 64, includeConsole: true, includeNetwork: true, maxEvents: 100 },
            { timeoutMs: 30000 },
          );
          errors.push(...diagnosticErrors(opened.output.startup, observed.output));

          await evaluate(
            client,
            sessionRef,
            `(async () => { scrollTo(0, 0); await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))); return true; })()`,
            { awaitPromise: true },
          );
          const topFile = `${contract.id}.${viewport.id}.top.jpg`;
          await saveScreenshot(client, sessionRef, join(runDir, topFile), { quality: 88 });
          screenshotFiles.push({ kind: "top", file: topFile });

          await client.act(
            sessionRef,
            [{ kind: "hydrateLazy", maxScrolls: 100, settleMs: 50, timeoutMs: 30000, expectedRisk: "externalEffect" }],
            { timeoutMs: 60000 },
          );
          const fullPageBounds = await evaluate(
            client,
            sessionRef,
            `(() => ({
              width: Math.min(innerWidth, Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0)),
              height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0),
            }))()`,
          );
          for (const capture of planFullPageCaptures({
            ...fullPageBounds,
            viewportHeight: metrics.viewportHeight,
          })) {
            if (Number.isFinite(capture.scrollY)) {
              await evaluate(
                client,
                sessionRef,
                `(async () => {
                  scrollTo(0, ${capture.scrollY});
                  await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
                  return scrollY;
                })()`,
                { awaitPromise: true },
              );
            }
            const fullFile = `${contract.id}.${viewport.id}.${capture.fileToken}.jpg`;
            await saveScreenshot(client, sessionRef, join(runDir, fullFile), {
              quality: 84,
              ...capture.options,
            });
            screenshotFiles.push({
              kind: capture.kind,
              file: fullFile,
              ...(capture.segment
                ? {
                    segment: capture.segment,
                    segmentCount: capture.segmentCount,
                    scrollY: capture.scrollY,
                  }
                : {}),
            });
          }

          for (const capture of contract.captures) {
            const focusFile = `${contract.id}.${viewport.id}.${capture.id}.jpg`;
            const clip = await evaluate(
              client,
              sessionRef,
              `(() => {
                const element = document.querySelector(${JSON.stringify(capture.selector)});
                if (!element) throw new Error("캡처 요소가 없습니다: " + ${JSON.stringify(capture.selector)});
                const rect = element.getBoundingClientRect();
                return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY),
                  width: rect.width, height: rect.height, scale: 1 };
              })()`,
            );
            await saveScreenshot(client, sessionRef, join(runDir, focusFile), { quality: 90, clip });
            screenshotFiles.push({
              kind: "focus",
              id: capture.id,
              selector: capture.selector,
              file: focusFile,
            });
          }
          } catch (error) {
            errors.push(errorText(error));
          } finally {
            if (sessionRef) {
              try {
                await client.detachSession(sessionRef, { timeoutMs: 30000 });
              } catch (error) {
                errors.push(`브라우저 session 정리 실패: ${errorText(error)}`);
              }
            }
          }

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
            interactions: interactionEvidence,
            pyprocManifest: relative(runDir, manifestPath).replace(/\\/g, "/"),
          });
        }
      } finally {
        await client.close();
      }
    }
  } finally {
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
