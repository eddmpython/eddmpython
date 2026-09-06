// 기존 authored 자산의 재현 전용. 신규 제작 기준은 skills/specs/operation/blogMedia.md가 소유한다.
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PyProcControlClient } from "pyproc/control";
import { OUTPUT_ROOT, STAGING_DIR } from "./workspace-contract.mjs";
import { DESIGN } from "../src/design.ts";

const site = fileURLToPath(new URL("..", import.meta.url));
const postId = process.argv[2];
if (!/^\d{3}-[a-z0-9-]+$/.test(postId ?? "")) throw new Error("글 폴더 이름을 지정하세요");
const post = resolve(site, "../blog/posts", postId);
const plan = JSON.parse(await readFile(join(post, "media.json"), "utf8"));
const targets = Object.entries(plan.assets).filter(([, asset]) => asset.sourceKind === "authored" && asset.sourceModule);
if (!targets.length) throw new Error("sourceModule을 가진 authored 자산이 없습니다");
const pages = new Map();
for (const [key, asset] of targets) {
  const source = resolve(post, asset.sourceModule);
  if (relative(post, source).startsWith("..") || !source.endsWith(".ts")) throw new Error("이미지 소스는 해당 글의 TypeScript 파일이어야 합니다");
  const { visuals } = await import(pathToFileURL(source).href);
  const svg = visuals[key];
  if (!svg?.includes('viewBox="0 0 2048 1152"')) throw new Error(`${key}: 16:9 SVG가 없습니다`);
  pages.set(`/${key}`, `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:${DESIGN.palette.carbon}}svg{display:block}</style>${svg}`);
}
const server = createServer((req, res) => {
  const page = pages.get(req.url);
  res.writeHead(page ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  res.end(page ?? "Not found");
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
if (!process.env.LOCALAPPDATA) throw new Error("공통 실행 공간을 확인할 수 없습니다");
const task = await mkdtemp(join(process.env.LOCALAPPDATA, "dev-workspace", "blogVisuals-"));
const destination = join(OUTPUT_ROOT, STAGING_DIR, postId);
await mkdir(destination, { recursive: true });
const manifest = join(task, "control.json");
await writeFile(manifest, JSON.stringify({
  schemaVersion: 1,
  engine: { indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/" },
  timeoutMs: 120000,
  browser: {
    enabled: true, provider: "nativeCdp", allowedOrigins: [origin],
    maxRisk: "externalEffect", externalEffects: "acknowledged",
    actions: ["screenshot", "navigate"], methods: ["Runtime.evaluate"],
    purpose: "블로그 개념 도식을 실제 브라우저에서 이미지로 렌더",
    viewport: { width: 2048, height: 1152, deviceScaleFactor: 1, mobile: false, touch: false },
    artifacts: { maxArtifactBytes: 33554432, maxTotalBytes: 134217728, maxArtifacts: 16, inlineMaxBytes: 4194304, ttlMs: 300000 },
  },
}), "utf8");
let client;
try {
  client = await PyProcControlClient.start(manifest, { cwd: site, startupTimeoutMs: 120000, shutdownTimeoutMs: 30000 });
  let session;
  for (const [key] of targets) {
    if (!session) {
      const opened = await client.openTarget(`${origin}/${key}`, { expectedRisk: "externalEffect", waitUntil: "load", timeoutMs: 30000 });
      session = (await client.attachSession(opened.output.targetRef, { timeoutMs: 30000 })).output;
    } else {
      await client.act(session, [{ kind: "navigate", url: `${origin}/${key}`, expectedRisk: "externalEffect" }], { timeoutMs: 30000 });
    }
    await client.command(session, "Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true, returnByValue: true }, { expectedRisk: "externalEffect", timeoutMs: 30000 });
    const capture = await client.act(session, [{ kind: "screenshot", format: "png", fullPage: false, expectedRisk: "read" }], { timeoutMs: 30000 });
    const image = capture.attachments.find((item) => item.mimeType === "image/png");
    if (!image) throw new Error(`${key}: 렌더 이미지가 없습니다`);
    await writeFile(join(destination, `${key}.png`), image.bytes);
    const ref = capture.output?.actions?.[0]?.result?.artifactRef;
    if (ref) await client.deleteArtifact(ref, { timeoutMs: 10000 });
    console.log(`${key}.png`);
  }
} finally {
  await client?.close();
  await new Promise((done) => server.close(done));
  // mkdtemp가 만든 정확한 작업 디렉터리만 정리한다. 발행할 이미지 작업본은 남긴다.
  await rm(task, { recursive: true });
}
console.log(`이미지 ${targets.length}개: ${destination}`);
