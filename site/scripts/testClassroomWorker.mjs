import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../wrangler.classroom.jsonc", import.meta.url), "utf8"));
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

assert.equal(config.name, "eddmpython-classroom");
assert.equal(config.main, "classroomWorker.ts");
assert.equal(config.assets, undefined, "course Worker에 공개 사이트 자산을 묶으면 안 됩니다");
assert.deepEqual(
  new Set(config.routes.map((route) => route.pattern)),
  new Set([
    "eddmpython.com/admin",
    "eddmpython.com/admin/*",
    "eddmpython.com/room",
    "eddmpython.com/room/*",
    "www.eddmpython.com/admin",
    "www.eddmpython.com/admin/*",
    "www.eddmpython.com/room",
    "www.eddmpython.com/room/*",
  ]),
);

const classroom = config.durable_objects.bindings.find((binding) => binding.name === "CLASSROOM");
assert.equal(classroom?.class_name, "Classroom");
assert.equal(classroom?.script_name, "eddmpython-site");
assert.ok(config.kv_namespaces.some((binding) => binding.binding === "COURSE"));

const deploy = pkg.scripts["deploy:classroom"];
assert.match(deploy, /wrangler deploy --config wrangler\.classroom\.jsonc/);
assert.doesNotMatch(deploy, /check:approved|approve:blog|check:blog|vite build|npm run deploy(?:\s|$)/);

console.log("classroom worker: course 경로와 독립 배포 계약 통과");
