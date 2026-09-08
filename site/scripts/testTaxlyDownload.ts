import assert from "node:assert/strict";
import { taxlyDownload } from "../taxlyDownload.ts";

const request = new Request("https://eddmpython.com/admin/taxly/download?ignored=1", { headers: { Cookie: "private-session", Authorization: "private" } });
assert.equal((await taxlyDownload(request, undefined)).status, 503);
let calls = 0;
const service = {
  fetch: async (input: Request) => {
    calls++;
    assert.equal(input.url, "https://taxly.internal/launcher");
    assert.equal(input.headers.get("Cookie"), null);
    assert.equal(input.headers.get("Authorization"), null);
    return new Response(new Uint8Array([77, 90, 3]), { headers: { "Content-Length": "3" } });
  },
} as Fetcher;
assert.equal((await taxlyDownload(new Request(request.url, { method: "POST" }), service)).status, 405);
assert.equal(calls, 0);
const response = await taxlyDownload(request, service);
assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [77, 90, 3]);
assert.equal(response.headers.get("Cache-Control"), "private, no-store");
assert.equal(response.headers.get("Content-Disposition"), 'attachment; filename="taxly.exe"');
console.log("Taxly 비공개 다운로드 스트림과 인증정보 분리 확인");
