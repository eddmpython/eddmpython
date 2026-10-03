import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createContext, runInContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const built = await build({ entryPoints: [fileURLToPath(new URL("../notebookDrafts.ts", import.meta.url))], bundle: true, format: "esm", platform: "browser", keepNames: true, write: false, logLevel: "silent" });
const { createNotebookDrafts } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString("base64")}`);
const local = new Map();
let clock = 1;
function storage(records, fault = {}) {
  return {
    get length() { if (fault.read) throw Error("blocked"); return records.size; },
    key(index) { if (fault.read) throw Error("blocked"); return [...records.keys()][index] ?? null; },
    getItem(key) { if (fault.read) throw Error("blocked"); return records.get(key) ?? null; },
    setItem(key, value) { if (fault.write) throw Error("quota"); records.set(key, String(value)); },
    removeItem(key) { if (fault.remove) throw Error("blocked"); records.delete(key); },
  };
}
function tab(scope, legacyKey = "legacy", session = new Map(), fault = {}) {
  const context = createContext({ localStorage: storage(local, fault), sessionStorage: storage(session, fault.session), crypto: webcrypto, Date: { now: () => clock++ }, scope, legacyKey });
  // 실제 화면과 같은 toString 삽입으로 외부 함수·상수 의존성도 검사한다.
  return runInContext(`(()=>{const __name=(fn)=>fn;return (${createNotebookDrafts.toString()})(scope,legacyKey);})()`, context);
}
const read = drafts => JSON.parse(JSON.stringify(drafts.read()));
const scope = JSON.stringify(["room-uuid", "owner-id", "sample/lesson"]);
const first = tab(scope);
assert.equal(first.write({ notes: [{ body: "첫 탭" }] }), true);
assert.equal(local.size, 1);
for (const separate of [["other-room", "owner-id", "sample/lesson"], ["room-uuid", "other-owner", "sample/lesson"], ["room-uuid", "owner-id", "sample/other"]]) {
  assert.deepEqual(read(tab(JSON.stringify(separate))), [], "방·작성자·수업이 다른 초안은 읽지 않는다");
}

const clonedSession = new Map([["old-tab-id", "copied-tab-id"]]);
const second = tab(scope, "legacy", new Map(clonedSession));
assert.equal(second.write({ notes: [{ body: "복제 탭" }] }), true);
assert.equal(local.size, 2, "복제 탭도 새 저장 키를 사용한다");
assert.deepEqual(read(first), [{ notes: [{ body: "복제 탭" }] }, { notes: [{ body: "첫 탭" }] }]);
assert.equal(local.size, 2, "읽기는 다른 탭의 초안을 제거하지 않는다");
first.write({ notes: [{ body: "첫 탭 수정" }] });
assert.equal(local.size, 2, "현재 탭 수정은 자기 키만 바꾼다");
assert.deepEqual(read(second), [{ notes: [{ body: "첫 탭 수정" }] }, { notes: [{ body: "복제 탭" }] }]);
assert.deepEqual(read(tab(scope)), read(second), "새 문서에서도 이전 작성 내용을 복구한다");

const legacyKey = "notebook-draft:room-uuid:/room/old-slug/notebook:owner-id:sample/lesson";
const legacyPayload = { notes: [{ body: "이전 버전" }], questions: [["new:sample", { body: "이전 질문" }]] };
const legacy = new Map([[legacyKey, JSON.stringify(legacyPayload)]]);
const restored = tab(scope, legacyKey, legacy);
const merged = read(restored);
assert.deepEqual(merged.at(-1), legacyPayload);
assert.equal(legacy.has(legacyKey), true, "이전 sessionStorage를 읽었다는 이유로 지우지 않는다");
restored.consume();
assert.equal(local.size, 2, "새 사본을 저장하기 전에 기존 초안을 소비하지 않는다");
assert.equal(legacy.has(legacyKey), true);
assert.equal(restored.write({ recovered: merged }), true);
restored.consume();
assert.equal(local.size, 1, "병합 사본을 저장한 뒤 이미 복구한 이전 문서만 제거한다");
assert.equal(legacy.has(legacyKey), false);
assert.deepEqual(read(tab(scope, "new-endpoint")), [{ recovered: merged }], "방 slug나 endpoint가 달라져도 같은 scope에서 복구한다");

local.clear();
const concurrent = tab(scope), recovery = tab(scope);
concurrent.write({ body: "읽은 시점" });
const snapshot = read(recovery);
concurrent.write({ body: "읽은 뒤 다른 탭에서 수정" });
recovery.write({ recovered: snapshot });
recovery.consume();
assert.equal(local.size, 2);
assert.ok(read(tab(scope)).some(value => value.body === "읽은 뒤 다른 탭에서 수정"), "복구 중 다른 탭에서 변경한 초안은 남긴다");
recovery.clear();
assert.equal(local.size, 1, "clear는 현재 문서의 키만 지운다");
assert.deepEqual(read(concurrent), [{ body: "읽은 뒤 다른 탭에서 수정" }]);

const changedLegacy = new Map([[legacyKey, JSON.stringify({ body: "이전 초안" })]]);
const legacyRecovery = tab(scope, legacyKey, changedLegacy);
const legacyRead = read(legacyRecovery);
changedLegacy.set(legacyKey, JSON.stringify({ body: "이전 에디터의 새 입력" }));
legacyRecovery.write({ recovered: legacyRead });
legacyRecovery.consume();
assert.equal(JSON.parse(changedLegacy.get(legacyKey)).body, "이전 에디터의 새 입력");

local.clear();
const original = tab(scope); original.write({ body: "원본" });
const quota = { write: true }, blocked = tab(scope, legacyKey, new Map(), quota);
read(blocked);
assert.equal(blocked.write({ body: "저장 불가" }), false);
blocked.consume();
assert.equal(local.size, 1, "저장 실패 후에도 복구 원본을 유지한다");
quota.write = false;
assert.equal(blocked.write({ body: "한 번 저장" }), true);
const cyclic = {}; cyclic.self = cyclic;
assert.equal(blocked.write(cyclic), false);
blocked.consume();
assert.equal(local.size, 2, "직렬화 실패도 이후 원본 제거를 막는다");
assert.equal(blocked.write(undefined), false);

const inaccessible = tab(scope, legacyKey, new Map([[legacyKey, JSON.stringify(legacyPayload)]]), { read: true, write: true, remove: true });
assert.deepEqual(read(inaccessible), [legacyPayload]);
assert.equal(inaccessible.write({ body: "값" }), false);
assert.doesNotThrow(() => { inaccessible.clear(); inaccessible.consume(); });
local.set(`notebook-draft:v2:${encodeURIComponent(scope)}:broken`, "broken-json");
assert.equal(read(tab(scope)).length, 2, "한 레코드의 손상으로 정상 초안 복구를 막지 않는다");

console.log("브라우저 초안 검사 통과: 문서 재접속, 방·작성자·수업 격리, 복제 탭, 이전 초안, 병합 후 소비, 저장 실패 보호");
