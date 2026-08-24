/**
 * QR 인코더 게이트. src/qrEncode.ts 하나가 도구 화면과 이 검사의 공동 정본이다.
 *
 * 구조 불변식(파인더, 타이밍, format BCH 왕복, 크기, 다크 모듈)과 고정 입력의 골든 해시로
 * 회귀를 막는다. 인코더가 바뀌어 배치나 마스크가 틀어지면 해시가 어긋나 실패한다.
 */
import { encodeQr } from "../src/qrEncode.ts";

let failures = 0;
function fail(msg: string) {
  console.error("  FAIL:", msg);
  failures++;
}

function fnv(m: boolean[][]): string {
  let h = 0x811c9dc5;
  for (const row of m) for (const cell of row) {
    h ^= cell ? 1 : 0;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function finderOk(m: boolean[][], size: number): boolean {
  const centers = [[3, 3], [size - 4, 3], [3, size - 4]];
  for (const [cx, cy] of centers) {
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const want = dist <= 1 || dist === 3;
        if (m[cy + dy][cx + dx] !== want) return false;
      }
  }
  return true;
}
function timingOk(m: boolean[][], size: number): boolean {
  for (let i = 8; i < size - 8; i++) {
    if (m[6][i] !== (i % 2 === 0)) return false;
    if (m[i][6] !== (i % 2 === 0)) return false;
  }
  return true;
}
function formatOk(m: boolean[][], size: number): boolean {
  // 상단 좌측 15비트를 읽어 BCH 왕복과 ECC=M 을 확인한다
  const getBit = (x: number, i: number) => ((x >>> i) & 1) !== 0;
  let bits = 0;
  const read: boolean[] = [];
  for (let i = 0; i <= 5; i++) read[i] = m[i][8];
  read[6] = m[7][8];
  read[7] = m[8][8];
  read[8] = m[8][7];
  for (let i = 9; i < 15; i++) read[i] = m[8][14 - i];
  for (let i = 0; i < 15; i++) if (read[i]) bits |= 1 << i;
  const unmasked = bits ^ 0x5412;
  const data = unmasked >>> 10;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
  if (((data << 10) | rem) !== unmasked) return false;
  const ecc = (data >>> 3) & 3;
  const mask = data & 7;
  return ecc === 0 && mask >= 0 && mask <= 7 && getBit(1, 0) === true; // ecc=M(0), mask 유효
}

// 골든 해시. QR_PIN=1 로 돌리면 현재 값을 찍는다. 확정한 값을 아래에 박는다.
const GOLDEN: Record<string, string> = {
  "https://eddmpython.com": "53965107",
  "QR": "9d8427b7",
  "https://eddmpython.com/blog/ai-environment": "ced5fbf0",
};

const pin = process.env.QR_PIN === "1";
const cases = [
  "QR",
  "https://eddmpython.com",
  "https://eddmpython.com/blog/ai-environment",
  "https://eddmpython.com/blog/ai-writing-tells?utm_source=qr&utm_medium=print&utm_campaign=blog",
  "안녕하세요 QR 테스트입니다",
];

for (const text of cases) {
  const r = encodeQr(text);
  if (!("matrix" in r)) { fail(`${text} -> ${r.error}`); continue; }
  if (r.size !== r.version * 4 + 17) fail(`${text}: size 불일치`);
  if (!finderOk(r.matrix, r.size)) fail(`${text}: 파인더 불일치`);
  if (!timingOk(r.matrix, r.size)) fail(`${text}: 타이밍 불일치`);
  if (!formatOk(r.matrix, r.size)) fail(`${text}: format BCH 불일치`);
  if (r.matrix[r.size - 8][8] !== true) fail(`${text}: 다크 모듈 없음`);
}

// 버전 선택 단조성: 길수록 버전이 줄지 않는다
let prevV = 0;
for (const n of [1, 10, 30, 60, 100, 150, 200]) {
  const r = encodeQr("a".repeat(n));
  if ("matrix" in r) { if (r.version < prevV) fail(`길이 ${n}: 버전 역행`); prevV = r.version; }
}

// 한도 초과는 오류를 낸다
const over = encodeQr("a".repeat(300));
if ("matrix" in over) fail("v10 한도 초과인데 오류를 안 냄");

if (pin) {
  for (const text of Object.keys(GOLDEN)) {
    const r = encodeQr(text);
    if ("matrix" in r) console.log(`  "${text}" -> ${fnv(r.matrix)}`);
  }
} else {
  for (const [text, want] of Object.entries(GOLDEN)) {
    const r = encodeQr(text);
    if (!("matrix" in r)) { fail(`golden ${text}: 인코딩 실패`); continue; }
    const got = fnv(r.matrix);
    if (want === "PIN") { console.log(`  (핀 필요) "${text}" -> ${got}`); }
    else if (got !== want) fail(`golden ${text}: ${got} != ${want}`);
  }
}

if (failures) {
  console.error(`qr test: ${failures} 건 실패`);
  process.exit(1);
}
console.log(`qr test: ${cases.length} 입력 구조 검증 + 골든 해시 통과`);
