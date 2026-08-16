import assert from "node:assert/strict";
import { decodeHashId, findHashTarget } from "../src/hashNavigation.ts";

const koreanId = "완료-조건은-숫자와-시나리오입니다";
const encodedHash = `#${encodeURIComponent(koreanId)}`;
const target = { id: koreanId };
const root = {
  getElementById(id: string) {
    return id === koreanId ? target : null;
  },
};

assert.equal(decodeHashId(encodedHash), koreanId);
assert.equal(decodeHashId(`#${koreanId}`), koreanId);
assert.equal(decodeHashId("#"), null);
assert.equal(decodeHashId(""), null);
assert.equal(decodeHashId("#%E0%A4%A"), "%E0%A4%A");
assert.equal(findHashTarget(encodedHash, root as Pick<Document, "getElementById">), target);
assert.equal(findHashTarget("#없는-제목", root as Pick<Document, "getElementById">), null);

console.log("hash navigation: 한글과 인코딩 오류 7 cases");
