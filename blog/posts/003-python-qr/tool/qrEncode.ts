/**
 * 자기완결 QR 인코더. 바이트 모드, 오류복원 M, 버전 1~10.
 *
 * 외부 라이브러리 없이 QR Code model 2 표준을 구현한다. 도구 컴포넌트(QrTool)와
 * 게이트(scripts/test-qr.ts)가 이 파일 하나를 함께 쓴다. 두 곳이 다른 인코더를 쓰면
 * 화면과 검사가 갈라진다. 정본은 여기 하나다.
 *
 * 정합성은 `npm run test:qr` 이 검사한다. 각 블록의 (데이터+ECC) 코드워드를 생성다항식으로
 * 다시 나누면 나머지가 0 이어야 한다. 그것이 RS 인코딩이 맞다는 수학적 증거다.
 */

type Success = { matrix: boolean[][]; size: number; version: number };
type Failure = { error: string };
export type QrResult = Success | Failure;

const TOTAL: Record<number, number> = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346 };
const ECCLEN: Record<number, number> = { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24, 6: 16, 7: 18, 8: 22, 9: 22, 10: 26 };
const BLOCKS: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 4, 8: 4, 9: 5, 10: 5 };
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

function gmul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ (((z >>> 7) & 1) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < degree - 1; i++) result.push(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gmul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gmul(root, 0x02);
  }
  return result;
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= gmul(divisor[i], factor);
  }
  return result;
}
const getBit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

export function encodeQr(text: string): QrResult {
  const bytes = new TextEncoder().encode(text);
  let version = 0;
  let capacityBits = 0;
  for (let v = 1; v <= 10; v++) {
    const dataCw = TOTAL[v] - ECCLEN[v] * BLOCKS[v];
    const cap = dataCw * 8;
    const cc = v <= 9 ? 8 : 16;
    if (4 + cc + bytes.length * 8 <= cap) {
      version = v;
      capacityBits = cap;
      break;
    }
  }
  if (version === 0) return { error: "내용이 너무 깁니다" };

  const bb: number[] = [];
  const put = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  for (let i = 0; i < 4 && bb.length < capacityBits; i++) bb.push(0);
  while (bb.length % 8 !== 0) bb.push(0);
  for (let pad = 0xec; bb.length < capacityBits; pad ^= 0xec ^ 0x11) put(pad, 8);

  const dataCw: number[] = [];
  for (let i = 0; i < bb.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bb[i + j];
    dataCw.push(b);
  }

  const numBlocks = BLOCKS[version];
  const eccLen = ECCLEN[version];
  const raw = TOTAL[version];
  const numShort = numBlocks - (raw % numBlocks);
  const shortLen = Math.floor(raw / numBlocks);
  const divisor = rsDivisor(eccLen);
  const blocks: number[][] = [];
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortLen - eccLen + (i < numShort ? 0 : 1);
    const dat = dataCw.slice(k, k + datLen);
    k += datLen;
    blocks.push(dat.concat(rsRemainder(dat, divisor)));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0].length + 1; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortLen - eccLen || j >= numShort) {
        if (i < blocks[j].length) all.push(blocks[j][i]);
      }
    }
  }

  const size = version * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setF = (x: number, y: number, d: boolean) => {
    mod[y][x] = d;
    fn[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    setF(6, i, i % 2 === 0);
    setF(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setF(x, y, dist !== 2 && dist !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const ap = ALIGN[version];
  const last = ap.length ? ap[ap.length - 1] : 0;
  for (const ay of ap)
    for (const ax of ap) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === last) || (ax === last && ay === 6)) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
    }

  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      if (!fn[i][8]) setF(8, i, false);
      if (!fn[8][i]) setF(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) if (!fn[8][size - 1 - i]) setF(size - 1 - i, 8, false);
  for (let i = 0; i < 7; i++) if (!fn[size - 1 - i][8]) setF(8, size - 1 - i, false);
  setF(8, size - 8, true);

  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setF(a, b, false);
      setF(b, a, false);
    }
  }

  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x]) {
          let dark = false;
          if (bi < all.length * 8) dark = getBit(all[bi >>> 3], 7 - (bi & 7));
          mod[y][x] = dark;
          bi++;
        }
      }
    }
  }

  const maskFns: Array<(x: number, y: number) => boolean> = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x, _y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const drawFormat = (m: number, t: boolean[][]) => {
    const data = (0 << 3) | m; // 오류복원 M 지시자 = 0
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) t[i][8] = getBit(bits, i);
    t[7][8] = getBit(bits, 6);
    t[8][8] = getBit(bits, 7);
    t[8][7] = getBit(bits, 8);
    for (let i = 9; i < 15; i++) t[8][14 - i] = getBit(bits, i);
    for (let i = 0; i < 8; i++) t[8][size - 1 - i] = getBit(bits, i);
    for (let i = 8; i < 15; i++) t[size - 15 + i][8] = getBit(bits, i);
    t[size - 8][8] = true;
  };
  const drawVersion = (t: boolean[][]) => {
    if (version < 7) return;
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ (((rem >>> 11) & 1) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      t[b][a] = bit;
      t[a][b] = bit;
    }
  };
  const penalty = (g: boolean[][]): number => {
    let p = 0;
    for (let y = 0; y < size; y++) {
      let c = g[y][0];
      let l = 1;
      for (let x = 1; x < size; x++) {
        if (g[y][x] === c) {
          l++;
          if (l === 5) p += 3;
          else if (l > 5) p++;
        } else {
          c = g[y][x];
          l = 1;
        }
      }
    }
    for (let x = 0; x < size; x++) {
      let c = g[0][x];
      let l = 1;
      for (let y = 1; y < size; y++) {
        if (g[y][x] === c) {
          l++;
          if (l === 5) p += 3;
          else if (l > 5) p++;
        } else {
          c = g[y][x];
          l = 1;
        }
      }
    }
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = g[y][x];
        if (c === g[y][x + 1] && c === g[y + 1][x] && c === g[y + 1][x + 1]) p += 3;
      }
    const pat = [true, false, true, true, true, false, true];
    const check = (arr: boolean[]): number => {
      let s = 0;
      for (let i = 0; i + 11 <= arr.length; i++) {
        let m1 = true;
        for (let kk = 0; kk < 7; kk++) if (arr[i + kk] !== pat[kk]) m1 = false;
        let la = true;
        for (let kk = 0; kk < 4; kk++) if (arr[i + 7 + kk] !== false) la = false;
        if (m1 && la) s += 40;
      }
      return s;
    };
    for (let y = 0; y < size; y++) {
      p += check(g[y]);
      const col: boolean[] = [];
      for (let x = 0; x < size; x++) col.push(g[x][y]);
      p += check(col);
    }
    let dark = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (g[y][x]) dark++;
    p += Math.floor(Math.abs((dark / (size * size)) * 100 - 50) / 5) * 10;
    return p;
  };

  let best: boolean[][] = mod;
  let bestP = Infinity;
  for (let m = 0; m < 8; m++) {
    const g = mod.map((r) => r.slice());
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (!fn[y][x] && maskFns[m](x, y)) g[y][x] = !g[y][x];
      }
    drawFormat(m, g);
    drawVersion(g);
    const pp = penalty(g);
    if (pp < bestP) {
      bestP = pp;
      best = g;
    }
  }
  return { matrix: best, size, version };
}
