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

/**
 * 왕복 디코더. 인코더와 같은 표를 쓰지 않고 여기서 따로 만든다.
 *
 * 구조 불변식만 보면 "형태는 QR 인데 읽으면 딴 글자" 인 경우를 못 잡는다. 그래서 만든 행렬을
 * 다시 읽어 원문이 그대로 나오는지 본다. 인코더가 마스크를 어느 것으로 고르든 상관없이,
 * 포맷 비트가 가리키는 마스크로 벗겨서 지그재그로 읽고 블록을 풀어 본문을 복원한다.
 *
 * 2026-08-24 에 segno 1.6.6 과 같은 주소를 인코딩해 대조했다. 마스크는 서로 달랐지만
 * (이쪽 2, segno 5) 이 디코더로 둘 다 원문이 복원됐다. 마스크 선택은 구현 자유다.
 */
const D_TOTAL: Record<number, number> = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346 };
const D_ECCLEN: Record<number, number> = { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24, 6: 16, 7: 18, 8: 22, 9: 22, 10: 26 };
const D_BLOCKS: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 4, 8: 4, 9: 5, 10: 5 };
const D_ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};
const D_MASKS: Array<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x, _y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function decodeQr(matrix: boolean[][], size: number, version: number): string | null {
  const at = (y: number, x: number) => (matrix[y][x] ? 1 : 0);

  // 포맷 15비트에서 마스크를 읽는다
  const raw: number[] = [];
  for (let i = 0; i <= 5; i++) raw[i] = at(i, 8);
  raw[6] = at(7, 8);
  raw[7] = at(8, 8);
  raw[8] = at(8, 7);
  for (let i = 9; i < 15; i++) raw[i] = at(8, 14 - i);
  let bits = 0;
  for (let i = 0; i < 15; i++) if (raw[i]) bits |= 1 << i;
  const un = bits ^ 0x5412;
  const fdata = un >>> 10;
  let rem = fdata;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
  if (((fdata << 10) | rem) !== un) return null;
  const mask = fdata & 7;

  // 함수 패턴 지도를 여기서 새로 만든다
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const mark = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) fn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) mark(cx + dx, cy + dy);
  }
  const ap = D_ALIGN[version];
  const last = ap.length ? ap[ap.length - 1] : 0;
  for (const ay of ap) {
    for (const ax of ap) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === last) || (ax === last && ay === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(ax + dx, ay + dy);
    }
  }
  for (let i = 0; i <= 8; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) mark(size - 1 - i, 8);
  for (let i = 0; i < 7; i++) mark(8, size - 1 - i);
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      mark(a, b);
      mark(b, a);
    }
  }

  // 지그재그로 읽으며 마스크를 벗긴다
  const stream: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x]) stream.push(D_MASKS[mask](x, y) ? at(y, x) ^ 1 : at(y, x));
      }
    }
  }
  const cw: number[] = [];
  for (let i = 0; i + 8 <= stream.length; i += 8) {
    let v = 0;
    for (let k = 0; k < 8; k++) v = (v << 1) | stream[i + k];
    cw.push(v);
  }

  // 인터리브를 푼다
  const numBlocks = D_BLOCKS[version];
  const eccLen = D_ECCLEN[version];
  const total = D_TOTAL[version];
  const numShort = numBlocks - (total % numBlocks);
  const shortLen = Math.floor(total / numBlocks);
  const lens = Array.from({ length: numBlocks }, (_, j) => shortLen + (j < numShort ? 0 : 1));
  const blocks: number[][] = lens.map((n) => new Array<number>(n).fill(0));
  let idx = 0;
  for (let i = 0; i < Math.max(...lens); i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i !== shortLen - eccLen || j >= numShort) {
        if (i < lens[j]) blocks[j][i] = cw[idx++];
      }
    }
  }
  const data: number[] = [];
  for (let j = 0; j < numBlocks; j++) data.push(...blocks[j].slice(0, lens[j] - eccLen));

  // 모드와 길이와 본문
  let p = 0;
  const take = (n: number) => {
    let v = 0;
    for (let k = 0; k < n; k++) {
      const byte = data[p >> 3];
      if (byte === undefined) return -1;
      v = (v << 1) | ((byte >>> (7 - (p & 7))) & 1);
      p++;
    }
    return v;
  };
  const mode = take(4);
  if (mode !== 0b0100) return null;
  const len = take(version <= 9 ? 8 : 16);
  if (len < 0) return null;
  const bytes: number[] = [];
  for (let i = 0; i < len; i++) {
    const b = take(8);
    if (b < 0) return null;
    bytes.push(b);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// 왕복 검사. 만든 QR 을 다시 읽어 원문이 그대로 나와야 한다.
const ROUNDTRIP = [
  "QR",
  "https://eddmpython.com",
  "https://eddmpython.com/blog/python-qr",
  "https://eddmpython.com/blog/ai-writing-tells?utm_source=qr&utm_medium=print&utm_campaign=blog",
  "한글도 바이트 모드로 들어갑니다",
  "010-0000-0000",
  "a".repeat(100),
];
for (const text of ROUNDTRIP) {
  const r = encodeQr(text);
  if (!("matrix" in r)) {
    fail(`왕복 ${text.slice(0, 24)}: 인코딩 실패 ${r.error}`);
    continue;
  }
  const back = decodeQr(r.matrix, r.size, r.version);
  if (back !== text) {
    fail(`왕복 복원 불일치 (v${r.version}): 넣은 것 ${JSON.stringify(text.slice(0, 40))} / 나온 것 ${JSON.stringify(String(back).slice(0, 40))}`);
  }
}

/**
 * 음성 대조군. 데이터 칸 하나를 뒤집으면 왕복 복원이 반드시 깨져야 한다.
 *
 * 이 확인이 없으면 위 왕복 검사가 항상 통과하는 장식인지 알 수 없다. QR 은 오류 복원 코드를
 * 들고 있지만 이 디코더는 복원을 하지 않고 그대로 읽으므로, 한 칸만 틀어도 본문이 달라진다.
 */
{
  const r = encodeQr("https://eddmpython.com");
  if ("matrix" in r) {
    const broken = r.matrix.map((row) => row.slice());
    // 함수 패턴이 아닌 오른쪽 아래 데이터 칸 하나를 뒤집는다
    broken[r.size - 1][r.size - 1] = !broken[r.size - 1][r.size - 1];
    const back = decodeQr(broken, r.size, r.version);
    if (back === "https://eddmpython.com") {
      fail("음성 대조군: 데이터 칸을 뒤집었는데도 원문이 그대로 나왔습니다. 왕복 검사가 실제로 읽고 있지 않습니다");
    }
  }
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
console.log(
  `qr test: 구조 ${cases.length} 입력, 왕복 복원 ${ROUNDTRIP.length} 입력, 음성 대조군 1, 골든 해시 ${Object.keys(GOLDEN).length} 통과`,
);
