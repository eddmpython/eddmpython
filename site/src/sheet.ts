/**
 * 작은 수식 엔진. 셀 참조, 사칙연산, 범위 함수를 지원한다.
 * eval 을 쓰지 않는다 (CSP 가 막기도 하고, 파서가 더 정확하다).
 */

export type Grid = Record<string, string>;
export type Value = number | string;

const FUNCS: Record<string, (nums: number[]) => number> = {
  SUM: (n) => n.reduce((a, b) => a + b, 0),
  AVERAGE: (n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0),
  MIN: (n) => (n.length ? Math.min(...n) : 0),
  MAX: (n) => (n.length ? Math.max(...n) : 0),
  COUNT: (n) => n.length,
  ROUND: ([v, d = 0]) => {
    const f = 10 ** d;
    return Math.round((v ?? 0) * f) / f;
  },
  ABS: ([v]) => Math.abs(v ?? 0),
};

export const colLetter = (i: number) => String.fromCharCode(65 + i);
export const cellId = (col: number, row: number) => `${colLetter(col)}${row + 1}`;

function parseRef(ref: string): { col: number; row: number } | null {
  const m = ref.match(/^([A-Z])(\d+)$/);
  if (!m) return null;
  return { col: m[1].charCodeAt(0) - 65, row: Number(m[2]) - 1 };
}

function expandRange(a: string, b: string): string[] {
  const from = parseRef(a);
  const to = parseRef(b);
  if (!from || !to) return [];
  const out: string[] = [];
  for (let c = Math.min(from.col, to.col); c <= Math.max(from.col, to.col); c++) {
    for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r++) {
      out.push(cellId(c, r));
    }
  }
  return out;
}

class Calc {
  private grid: Grid;
  private cache = new Map<string, Value>();
  private visiting = new Set<string>();

  constructor(grid: Grid) {
    this.grid = grid;
  }

  value(id: string): Value {
    if (this.cache.has(id)) return this.cache.get(id)!;
    if (this.visiting.has(id)) return "#순환!";
    this.visiting.add(id);

    const raw = (this.grid[id] ?? "").trim();
    let out: Value;
    if (raw === "") {
      out = "";
    } else if (raw.startsWith("=")) {
      try {
        out = this.evaluate(raw.slice(1));
      } catch (e) {
        out = e instanceof Error && e.message.startsWith("#") ? e.message : "#오류!";
      }
    } else {
      const n = Number(raw.replace(/,/g, ""));
      out = raw !== "" && Number.isFinite(n) ? n : raw;
    }

    this.visiting.delete(id);
    this.cache.set(id, out);
    return out;
  }

  private num(id: string): number {
    const v = this.value(id);
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.startsWith("#")) throw new Error(v);
    return 0;
  }

  /* 재귀 하강 파서 */
  private src = "";
  private pos = 0;

  private evaluate(expr: string): number {
    const prevSrc = this.src;
    const prevPos = this.pos;
    this.src = expr;
    this.pos = 0;
    const v = this.expr();
    this.skip();
    const done = this.pos >= this.src.length;
    this.src = prevSrc;
    this.pos = prevPos;
    if (!done) throw new Error("#수식!");
    return v;
  }

  private skip() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
  }

  private eat(ch: string): boolean {
    this.skip();
    if (this.src[this.pos] === ch) {
      this.pos++;
      return true;
    }
    return false;
  }

  private expr(): number {
    let v = this.term();
    for (;;) {
      if (this.eat("+")) v += this.term();
      else if (this.eat("-")) v -= this.term();
      else return v;
    }
  }

  private term(): number {
    let v = this.factor();
    for (;;) {
      if (this.eat("*")) v *= this.factor();
      else if (this.eat("/")) {
        const d = this.factor();
        if (d === 0) throw new Error("#0나눔!");
        v /= d;
      } else return v;
    }
  }

  private factor(): number {
    this.skip();
    if (this.eat("-")) return -this.factor();
    if (this.eat("+")) return this.factor();
    if (this.eat("(")) {
      const v = this.expr();
      if (!this.eat(")")) throw new Error("#수식!");
      return v;
    }

    const rest = this.src.slice(this.pos);

    const fn = rest.match(/^([A-Za-z]+)\s*\(/);
    if (fn) {
      const name = fn[1].toUpperCase();
      const impl = FUNCS[name];
      if (!impl) throw new Error("#이름!");
      this.pos += fn[0].length;
      const args: number[] = [];
      this.skip();
      if (!this.eat(")")) {
        for (;;) {
          args.push(...this.arg());
          if (this.eat(",")) continue;
          if (this.eat(")")) break;
          throw new Error("#수식!");
        }
      }
      return impl(args);
    }

    const range = rest.match(/^([A-Z]\d+)\s*:\s*([A-Z]\d+)/);
    if (range) {
      this.pos += range[0].length;
      throw new Error("#범위!"); // 범위는 함수 인자 안에서만 쓴다
    }

    const ref = rest.match(/^([A-Z]\d+)/);
    if (ref) {
      this.pos += ref[0].length;
      return this.num(ref[1]);
    }

    const num = rest.match(/^\d+(\.\d+)?/);
    if (num) {
      this.pos += num[0].length;
      return Number(num[0]);
    }

    throw new Error("#수식!");
  }

  /** 함수 인자 하나. 범위면 여러 값으로 펼친다. */
  private arg(): number[] {
    this.skip();
    const range = this.src.slice(this.pos).match(/^([A-Z]\d+)\s*:\s*([A-Z]\d+)/);
    if (range) {
      this.pos += range[0].length;
      return expandRange(range[1], range[2])
        .map((id) => this.value(id))
        .filter((v): v is number => typeof v === "number");
    }
    return [this.expr()];
  }
}

/** 격자 전체를 계산해 표시값 맵을 돌려준다. */
export function calculate(grid: Grid, ids: string[]): Record<string, Value> {
  const calc = new Calc(grid);
  const out: Record<string, Value> = {};
  for (const id of ids) out[id] = calc.value(id);
  return out;
}

export function display(v: Value): string {
  if (typeof v !== "number") return v;
  if (!Number.isFinite(v)) return "#값!";
  const rounded = Math.round(v * 1e6) / 1e6;
  return rounded.toLocaleString("ko-KR");
}
