import {
  approveVisualEvidence,
  assertVisualApproval,
  captureVisualEvidence,
} from "./visual-api.mjs";

function values(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(3).filter((arg) => arg.startsWith(prefix)).map((arg) => arg.slice(prefix.length));
}

function value(name) {
  return values(name).at(-1);
}

const command = process.argv[2] ?? "capture";

try {
  if (command === "capture") {
    const report = await captureVisualEvidence({
      baseUrl: value("base-url"),
      routeFilters: values("route"),
    });
    console.log(`visual capture: ${report.status}, ${report.results.length}개 화면`);
    console.log(`run id: ${report.runId}`);
    console.log(`evidence: ${report.artifactDir}`);
    if (report.status !== "passed") {
      for (const result of report.results.filter((item) => item.status === "failed")) {
        console.error(`${result.routeId}/${result.viewport}: ${result.errors.join(" | ")}`);
      }
      process.exitCode = 1;
    }
  } else if (command === "approve") {
    const runId = value("run");
    if (!runId) throw new Error("approve에는 --run=<run-id>가 필요합니다");
    const approval = await approveVisualEvidence(runId);
    console.log(`visual approval: ${approval.runId}`);
    console.log(`build fingerprint: ${approval.distSha256}`);
  } else if (command === "check") {
    const approval = await assertVisualApproval();
    console.log(`visual approval check: ${approval.runId}`);
  } else {
    throw new Error(`알 수 없는 시각 검증 명령: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
