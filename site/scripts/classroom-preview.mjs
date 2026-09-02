/** 로컬 강의장의 전체 카테고리 검수 라우터를 확인하고 주소를 출력한다. */

const base = (process.argv[2] ?? "http://127.0.0.1:8787").replace(/\/$/, "");
if (!/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/.test(base)) {
  throw new Error("로컬 강의장 주소에서만 전체 검수 라우터를 열 수 있습니다");
}

const address = `${base}/room-test`;
const response = await fetch(address, { redirect: "manual" });
if (!response.ok) {
  throw new Error(`전체 검수 라우터를 열지 못했습니다: ${response.status}`);
}

console.log(`주소 ${address}`);
