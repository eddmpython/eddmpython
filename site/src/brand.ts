/**
 * 브랜드 심볼 정본.
 *
 * 심볼의 형태는 좌표가 아니라 **작도 규칙**으로 적혀 있다. 아래 `GEOMETRY` 의 숫자
 * 열몇 개가 정본이고 경로 문자열은 그 숫자에서 계산해서 나온다. 손으로 딴 path 를
 * 박아 두면 획 두께 하나를 고치려 해도 좌표 수백 개를 다시 따야 하고, 그때 접선이
 * 어긋난 것을 아무도 못 본다.
 *
 * 랜딩(React), favicon(정적 파일), 강의장 머리띠(Worker HTML), og 이미지(Node)가
 * 전부 이 모듈을 읽는다. 사본이 없으므로 어긋날 수 없다.
 *
 * ## 형태
 *
 * 한 획으로 그린 나선이다. 안쪽 끝에서 시작해 가로획으로 오른쪽으로 가고, 위로 감아
 * 바깥 바퀴를 한 바퀴 돌고, 오른쪽 아래로 빠져나와 위로 치솟으며 가늘어진다.
 * 치솟은 끝 바로 위에 점이 하나 뜬다.
 *
 * - 소문자 `e` 로 읽힌다. 가로획과 바깥 바퀴가 e 의 눈과 배다.
 * - 한글 `으` 로 읽힌다. 둥근 바깥 바퀴가 `ㅇ`, 가로획이 `ㅡ` 다.
 * - 감긴 몸통과 빠져나오는 꼬리가 뱀(Python)이다.
 * - 가늘어지는 꼬리와 그 위의 점이 성장 곡선의 정점이다.
 *
 * 나선이라 안쪽에 갇힌 구멍이 없다. 가운데 여백은 바깥까지 이어지는 한 줄기 골이다.
 * `fill-rule` 이 필요 없고 16px 에서도 골이 막히지 않는 이유가 이것이다.
 *
 * ## 작도
 *
 * 모든 마디가 앞 마디와 접선을 공유한다. 이음매가 보이지 않는 이유는 그렇게 맞춰서가
 * 아니라 반지름을 접점 조건에서 **풀어서** 쓰기 때문이다.
 *
 * - 가로획은 수평 직선이다.
 * - 감아 올리는 호는 가로획에 접한다. 그래서 호의 중심은 가로획 바로 위에 있다.
 * - 같은 호가 바깥 바퀴에도 안쪽에서 접한다. 두 접점 조건이 호의 반지름을 결정한다.
 *   `ARM_RADIUS` 를 손으로 정하지 않고 푸는 이유다.
 * - 꼬리는 바깥 바퀴에서 접선 방향으로 뻗는 3차 베지에다.
 * - 획 두께는 꼬리에 들어서기 전까지 일정하고 꼬리에서만 선형으로 가늘어진다.
 *
 * ## 좌표계
 *
 * 작도는 바깥 바퀴의 중심을 원점으로 하고 y 는 화면과 같이 아래로 늘어난다.
 * 바깥 바퀴의 중심선 반지름이 100 이다. 다른 숫자는 전부 그 100 에 대한 비율로 읽는다.
 * 내보낼 때만 잉크 경계가 viewBox 에 꼭 맞도록 평행이동한다.
 *
 * ## 작은 크기에서
 *
 * 16px 에서도 가운데 골이 막히지 않는다. 획을 깎아 골을 넓히지 않는다.
 * 점은 2~3px 의 색 점 하나로 남고 꼬리 끝과 붙지 않는다.
 *
 * 이 파일은 React 를 import 하지 않는다. vite.config.ts(Node)에서도 읽는다.
 */

// `npm run og` 는 Node 의 strip-types 로 이 파일을 직접 읽는다. 확장자를 빼면 그쪽에서
// 모듈을 못 찾는다. vite 와 tsc 는 확장자가 있어도 그대로 푼다.
import { DESIGN } from "./design.ts";

/**
 * 심볼의 정본 수치. 이 열몇 줄이 형태를 전부 결정한다.
 *
 * 바깥 바퀴 중심이 원점, 중심선 반지름이 100 이다. 값을 고치면 접선 조건이 다시 풀리므로
 * 이음매는 저절로 맞는다. 다만 고친 뒤에는 16px 렌더를 눈으로 본다.
 */
const GEOMETRY = {
  /** 바깥 바퀴 중심선 반지름. 다른 모든 수치의 기준이다 */
  turnRadius: 100,
  /** 획 두께. 꼬리에 들어서기 전까지 일정하다 */
  stroke: 48,
  /** 가로획의 중심선 y. 원점보다 아주 조금 아래다 */
  barY: 2.5,
  /** 감아 올리는 호의 중심 x. 중심 y 는 접선 조건이 정한다 */
  armCenterX: 41.5,
  /** 가로획 안쪽 끝(둥근 마구리)의 중심 x */
  barCapX: -25,
  /** 꼬리가 바깥 바퀴에서 갈라지는 각도(도). 화면 아래쪽이 +90 이다 */
  tailAngle: 77,
  /** 꼬리 베지에의 시작 손잡이 길이. 바퀴에서 얼마나 길게 접선을 끌고 나가는지 */
  tailOutHandle: 110,
  /** 꼬리 베지에의 끝 손잡이 길이. 끝에서 얼마나 곧게 위로 서는지 */
  tailInHandle: 38,
  /** 꼬리 끝(둥근 마구리)의 중심 x. 점의 중심과 같다. 꼬리가 점을 겨눈다 */
  tipX: 165.5,
  /** 꼬리 끝의 중심 y */
  tipY: -34.5,
  /** 꼬리 끝의 획 두께. 0 으로 보내지 않는다. 작은 크기에서 끝이 사라진다 */
  tipStroke: 15.5,
  /** 점의 중심 y. x 는 `tipX` 와 같다 */
  dotY: -80.5,
  /** 점의 반지름. 획 반두께보다 조금 크다. 같게 하면 점이 작아 보인다 */
  dotRadius: 25.5,
} as const;

const HALF = GEOMETRY.stroke / 2;

/**
 * 감아 올리는 호의 반지름. 두 접점 조건을 연립해 푼다.
 *
 * 가로획에 접하므로 중심은 `(armCenterX, barY - r)` 이고, 바깥 바퀴에 안쪽에서
 * 접하므로 중심 사이 거리가 `turnRadius - r` 이다. 두 식을 정리하면 r 이 하나로 떨어진다.
 * 이 값을 손으로 적어 두면 다른 수치를 고칠 때 접선이 조용히 어긋난다.
 */
const ARM_RADIUS =
  (GEOMETRY.armCenterX ** 2 + GEOMETRY.barY ** 2 - GEOMETRY.turnRadius ** 2) /
  (2 * (GEOMETRY.barY - GEOMETRY.turnRadius));
const ARM_CENTER_Y = GEOMETRY.barY - ARM_RADIUS;
/** 호와 바깥 바퀴가 만나는 각도. 두 중심을 잇는 방향이 곧 접점 방향이다 */
const JOIN_ANGLE = Math.atan2(ARM_CENTER_Y, GEOMETRY.armCenterX);

/**
 * 작도가 성립하는 범위.
 *
 * "값을 고치면 접선 조건이 다시 풀리므로 이음매가 저절로 맞는다" 는 무조건이 아니다. 획이
 * 감아 올리는 호의 지름보다 두꺼워지면 호의 안쪽 가장자리가 뒤집혀 반지름이 음수인 `A` 가
 * 나온다. 브라우저는 그것을 조용히 무시하거나 이상하게 그린다. 형태가 깨졌는데 아무 데서도
 * 안 걸리는 것이 가장 나쁘므로 여기서 세운다.
 *
 * 지금 값에서 여유는 획 두께 84.8 까지다. 실제로 쓰는 48 과는 멀다.
 */
if (!(GEOMETRY.stroke > 0 && GEOMETRY.stroke < 2 * ARM_RADIUS)) {
  throw new Error(
    `심볼 작도가 성립하지 않습니다. 획 두께는 0 보다 크고 ${(2 * ARM_RADIUS).toFixed(2)} 보다 작아야 하는데 ${GEOMETRY.stroke} 입니다`,
  );
}
if (!(GEOMETRY.stroke < 2 * GEOMETRY.turnRadius)) {
  throw new Error(
    `심볼 작도가 성립하지 않습니다. 획 두께가 바깥 바퀴의 지름 ${2 * GEOMETRY.turnRadius} 을 넘습니다`,
  );
}
const TAIL_ANGLE = (GEOMETRY.tailAngle * Math.PI) / 180;

type Pt = readonly [number, number];

const onTurn = (angle: number, radius: number): Pt => [
  radius * Math.cos(angle),
  radius * Math.sin(angle),
];

/** 꼬리 중심선 3차 베지에의 제어점 네 개 */
const TAIL: readonly Pt[] = (() => {
  const p0 = onTurn(TAIL_ANGLE, GEOMETRY.turnRadius);
  // 바퀴를 각도가 줄어드는 쪽으로 돌아 왔으므로 진행 방향은 (sin, -cos) 이다.
  const tangent: Pt = [Math.sin(TAIL_ANGLE), -Math.cos(TAIL_ANGLE)];
  return [
    p0,
    [
      p0[0] + tangent[0] * GEOMETRY.tailOutHandle,
      p0[1] + tangent[1] * GEOMETRY.tailOutHandle,
    ],
    [GEOMETRY.tipX, GEOMETRY.tipY + GEOMETRY.tailInHandle],
    [GEOMETRY.tipX, GEOMETRY.tipY],
  ];
})();

const bezierAt = (t: number): Pt => {
  const u = 1 - t;
  return [
    u ** 3 * TAIL[0][0] +
      3 * u * u * t * TAIL[1][0] +
      3 * u * t * t * TAIL[2][0] +
      t ** 3 * TAIL[3][0],
    u ** 3 * TAIL[0][1] +
      3 * u * u * t * TAIL[1][1] +
      3 * u * t * t * TAIL[2][1] +
      t ** 3 * TAIL[3][1],
  ];
};

const bezierDirectionAt = (t: number): Pt => {
  const u = 1 - t;
  const x =
    3 * u * u * (TAIL[1][0] - TAIL[0][0]) +
    6 * u * t * (TAIL[2][0] - TAIL[1][0]) +
    3 * t * t * (TAIL[3][0] - TAIL[2][0]);
  const y =
    3 * u * u * (TAIL[1][1] - TAIL[0][1]) +
    6 * u * t * (TAIL[2][1] - TAIL[1][1]) +
    3 * t * t * (TAIL[3][1] - TAIL[2][1]);
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};

/** 꼬리의 반두께. 바퀴에서 나온 두께에서 끝 두께까지 선형으로 준다 */
const tailHalf = (t: number) => HALF + (GEOMETRY.tipStroke / 2 - HALF) * t;

/**
 * 꼬리 한쪽 가장자리의 표본점. `side` 가 +1 이면 진행 방향 왼쪽(바깥쪽)이다.
 *
 * 두께가 변하므로 가장자리는 원호가 아니다. 균일하게 표본을 뜨고 Catmull-Rom 으로
 * 3차 베지에를 만든다. 양 끝의 접선을 얻으려고 구간 밖을 한 점씩 더 뜬다. 끝을 특별히
 * 다루지 않아도 바퀴 쪽 이음매가 접선을 그대로 잇는다.
 */
const tailEdge = (side: 1 | -1, segments = 12): Pt[] => {
  const at = (t: number): Pt => {
    const [x, y] = bezierAt(t);
    const [dx, dy] = bezierDirectionAt(t);
    const h = tailHalf(t) * side;
    return [x - dy * h, y + dx * h];
  };
  const out: Pt[] = [];
  for (let i = -1; i <= segments + 1; i += 1) out.push(at(i / segments));
  return out;
};

const round = (n: number) => {
  const v = Math.round(n * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};

/**
 * 표본점을 3차 베지에 마디로 잇는다. 앞뒤 한 점씩은 접선 계산에만 쓰고 그리지 않는다.
 *
 * Catmull-Rom 의 제어점 공식이라 마디 사이가 C1 이다. 표본 열두 개면 이 곡률에서
 * 참 곡선과의 차이가 좌표 단위 0.05 아래다. viewBox 가 315 이므로 눈으로도
 * 계측으로도 구분되지 않는다.
 */
const edgeToCubics = (pts: readonly Pt[]): string => {
  const parts: string[] = [];
  for (let i = 1; i < pts.length - 2; i += 1) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    parts.push(
      `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`,
    );
  }
  return parts.join("");
};

/** 잉크 경계. 바깥 바퀴가 왼쪽·위·아래를 정하고 점이 오른쪽을 정한다 */
const BOUNDS = {
  left: -(GEOMETRY.turnRadius + HALF),
  top: -(GEOMETRY.turnRadius + HALF),
  bottom: GEOMETRY.turnRadius + HALF,
  right: GEOMETRY.tipX + GEOMETRY.dotRadius,
};
const OFFSET_X = -BOUNDS.left;
const OFFSET_Y = -BOUNDS.top;

const shift = (p: Pt): Pt => [p[0] + OFFSET_X, p[1] + OFFSET_Y];
const fmt = (p: Pt) => `${round(p[0])} ${round(p[1])}`;

/**
 * 획 하나의 바깥 윤곽. 겉을 따라 나갔다가 속을 따라 돌아온다.
 *
 * 두께가 일정한 구간은 원호의 평행곡선이 다시 원호라서 `A` 명령 하나로 정확히 적힌다.
 * 근사가 들어가는 곳은 두께가 변하는 꼬리뿐이다.
 */
const buildShape = (): string => {
  const outerTurn = GEOMETRY.turnRadius + HALF;
  const innerTurn = GEOMETRY.turnRadius - HALF;
  const outerEdge = tailEdge(1).map(shift);
  const innerEdge = tailEdge(-1).map(shift);
  const tipInner = innerEdge[innerEdge.length - 2];
  const tipRadius = GEOMETRY.tipStroke / 2;

  const barStart = shift([GEOMETRY.barCapX, GEOMETRY.barY + HALF]);
  const barEnd = shift([GEOMETRY.armCenterX, GEOMETRY.barY + HALF]);
  const barBackEnd = shift([GEOMETRY.armCenterX, GEOMETRY.barY - HALF]);
  const barBackStart = shift([GEOMETRY.barCapX, GEOMETRY.barY - HALF]);

  return [
    `M${fmt(barStart)}`,
    `L${fmt(barEnd)}`,
    // 감아 올리는 호의 바깥 가장자리. 끝점은 바깥 바퀴의 바깥 가장자리와 같은 점이다.
    `A${round(ARM_RADIUS + HALF)} ${round(ARM_RADIUS + HALF)} 0 0 0 ${fmt(shift(onTurn(JOIN_ANGLE, outerTurn)))}`,
    // 바깥 바퀴 겉면. 240도를 돌므로 large-arc 를 켠다.
    `A${outerTurn} ${outerTurn} 0 1 0 ${fmt(shift(onTurn(TAIL_ANGLE, outerTurn)))}`,
    edgeToCubics(outerEdge),
    // 꼬리 끝 둥근 마구리.
    `A${round(tipRadius)} ${round(tipRadius)} 0 0 0 ${fmt(tipInner)}`,
    edgeToCubics([...innerEdge].reverse()),
    `A${innerTurn} ${innerTurn} 0 1 1 ${fmt(shift(onTurn(JOIN_ANGLE, innerTurn)))}`,
    `A${round(ARM_RADIUS - HALF)} ${round(ARM_RADIUS - HALF)} 0 0 1 ${fmt(barBackEnd)}`,
    `L${fmt(barBackStart)}`,
    // 가로획 안쪽 둥근 마구리.
    `A${HALF} ${HALF} 0 0 0 ${fmt(barStart)}`,
    "Z",
  ].join("");
};

export const SYMBOL = {
  width: round(BOUNDS.right - BOUNDS.left),
  height: round(BOUNDS.bottom - BOUNDS.top),
  viewBox: `0 0 ${round(BOUNDS.right - BOUNDS.left)} ${round(BOUNDS.bottom - BOUNDS.top)}`,
  /** 획 하나. 나선이라 갇힌 구멍이 없고 fill-rule 이 필요 없다 */
  shape: buildShape(),
  /** 꼬리 끝 위의 점. 심볼에서 유일하게 색이 고정된 부분이다 */
  dot: {
    cx: round(GEOMETRY.tipX + OFFSET_X),
    cy: round(GEOMETRY.dotY + OFFSET_Y),
    r: GEOMETRY.dotRadius,
  },
} as const;

/** 정적 SVG는 CSS 변수를 못 읽으므로 디자인 정본의 원색을 읽어 쓴다. */
export const BRAND = {
  carbon: DESIGN.palette.carbon,
  ivory: DESIGN.palette.ivory,
  paper: DESIGN.palette.paper,
  /**
   * 심볼의 점. 저장소 강행규칙이 강조색을 `DESIGN.palette.brand` 하나로 묶는다.
   * 워드마크의 `.py` 도 같은 값에서 나온다.
   */
  dot: DESIGN.palette.brand,
} as const;

/**
 * 심볼의 알맹이. `<svg>` 껍데기 없이 도형만 낸다.
 *
 * 머리띠, 파비콘, og 이미지, 내려받는 자산이 전부 이 한 줄을 쓴다. 각자 조립하게 두면
 * 점의 색이나 좌표가 한 곳에서만 어긋난다.
 *
 * `ink` 를 비우면 획이 `currentColor` 를 따른다. 문서 문맥 밖에서 렌더되는 정적
 * 파일은 상속받을 색이 없으므로 반드시 값을 넘긴다.
 */
export function symbolMarkup({
  ink = "currentColor",
  dot = BRAND.dot,
}: { ink?: string; dot?: string } = {}): string {
  return `<path fill="${ink}" d="${SYMBOL.shape}"/><circle cx="${SYMBOL.dot.cx}" cy="${SYMBOL.dot.cy}" r="${SYMBOL.dot.r}" fill="${dot}"/>`;
}

/** 심볼 한 장짜리 SVG 파일. 배경을 깔지 않는다 */
export function symbolSvg(options: { ink?: string; dot?: string } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SYMBOL.viewBox}" role="img" aria-label="eddmpython">${symbolMarkup(options)}</svg>\n`;
}

/**
 * 앱 아이콘 마감 네 가지. 정사각 칩 안에 심볼만 넣는다.
 *
 * 어디에 놓이는지에 따라 바탕이 달라야 한다. 밝은 독에서는 어두운 획이, 어두운
 * 독에서는 밝은 획이 살아남는다. 강조색 칩은 다른 아이콘 사이에서 눈에 띄어야 할 때만,
 * 테두리 칩은 어두운 바탕 위에 칩 경계를 보여야 할 때만 쓴다. 네 가지 다 같은 심볼이고
 * 색만 바뀐다.
 *
 * 강조색 칩에서는 점도 획과 같은 흰색이다. 칩이 이미 강조색이라 점을 강조색으로 두면
 * 바탕에 묻혀 사라진다. 강조를 지고 있는 것이 점에서 칩으로 옮겨 간 것이지 점을
 * 빼는 것이 아니다.
 */
export const ICON_FINISHES = {
  light: { tile: BRAND.paper, ink: BRAND.carbon, dot: BRAND.dot, outlined: false },
  dark: { tile: BRAND.carbon, ink: BRAND.ivory, dot: BRAND.dot, outlined: false },
  brand: { tile: BRAND.dot, ink: BRAND.paper, dot: BRAND.paper, outlined: false },
  outline: { tile: BRAND.carbon, ink: BRAND.ivory, dot: BRAND.dot, outlined: true },
} as const;

export type IconFinish = keyof typeof ICON_FINISHES;

/**
 * 정사각 칩의 작도.
 *
 * 문자열 판(`appIconSvg`)과 React 판(`components/Logo.tsx` 의 `AppIcon`)이 같은 값을 읽는다.
 * 양쪽에 여백과 모서리를 따로 적어 두면 한쪽만 고쳐도 아무도 모른다. 실제로 두 판의
 * 변환행렬이 어긋난 적이 있다.
 *
 * 심볼을 칩 한 변의 12% 만큼 들여 놓는다. iOS 스퀘어클과 Android 원형 마스크 양쪽에서
 * 꼬리 끝과 점이 잘리지 않는 값으로 실제 렌더해서 정했다. **심볼이 가로로 1.27:1 이라
 * 들여쓰기는 가로에 걸리고 세로 여백은 그보다 더 남는다.** 남는 여백을 재는 것은 `padX`,
 * `padY` 이고 두 값은 다르다. 위아래까지 12% 로 맞추려 들면 심볼이 칩 밖으로 나간다.
 */
export const ICON_TILE = (() => {
  const size = 100;
  const inset = 12;
  const box = size - inset * 2;
  // 여기서 한 번만 자른다. 쓰는 쪽에서 각자 자르면 문자열 판과 React 판이 서로 다른
  // 자릿수를 내고, 같은 값을 읽는데도 결과가 갈린다. 실제로 그렇게 갈린 적이 있다.
  // 여섯 자리면 512px 칩에서 오차가 0.001px 아래다.
  const trim = (n: number) => Math.round(n * 1e6) / 1e6;
  // 자리는 자르지 않은 배율로 잡고 배율만 자른다. 잘린 배율로 자리를 잡으면 12% 들여쓰기가
  // 11.999975% 가 되어 문서가 말하는 값과 미묘하게 달라진다. 그 차이는 눈에 안 보이지만
  // 숫자를 확인하러 온 사람에게는 보인다.
  const exact = Math.min(box / SYMBOL.width, box / SYMBOL.height);
  const scale = trim(exact);
  const w = SYMBOL.width * exact;
  const h = SYMBOL.height * exact;
  return {
    size,
    /** 칩 모서리 */
    radius: 22,
    /** 테두리 마감의 안쪽 선 */
    edge: { inset: 1.5, radius: 20.5, width: 3, opacity: 0.22 },
    scale,
    x: trim((size - w) / 2),
    y: trim((size - h) / 2),
    /** 실제로 남는 여백(%). 가로가 들여쓰기와 같고 세로가 더 크다 */
    padX: trim(((size - w) / 2 / size) * 100),
    padY: trim(((size - h) / 2 / size) * 100),
  };
})();

/** 정사각 앱 아이콘 한 장짜리 SVG 파일 */
export function appIconSvg(
  finish: IconFinish = "dark",
  size = ICON_TILE.size,
): string {
  const f = ICON_FINISHES[finish];
  const t = ICON_TILE;
  const inner = t.size - t.edge.inset * 2;
  const edge = f.outlined
    ? `<rect x="${t.edge.inset}" y="${t.edge.inset}" width="${inner}" height="${inner}" rx="${t.edge.radius}" fill="none" stroke="${f.ink}" stroke-opacity="${t.edge.opacity}" stroke-width="${t.edge.width}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${t.size} ${t.size}" role="img" aria-label="eddmpython">
  <rect width="${t.size}" height="${t.size}" rx="${t.radius}" fill="${f.tile}"/>${edge}
  <g transform="translate(${t.x} ${t.y}) scale(${t.scale})">${symbolMarkup({ ink: f.ink, dot: f.dot })}</g>
</svg>
`;
}

/**
 * 브라우저 탭 아이콘. 파비콘에는 로고가 아니라 심볼만 넣는다.
 * 16px 정사각에 글자를 넣으면 읽히지 않는다.
 *
 * `currentColor` 를 쓸 수 없다. 파비콘은 문서 문맥 밖에서 렌더되어 상속받을 색이
 * 없고, 브라우저는 이를 검정으로 처리한다. 어두운 탭 배경에서 심볼이 사라진다.
 * 그래서 칩 배경과 심볼 색을 명시하는 `dark` 마감을 쓴다.
 */
export function faviconSvg(): string {
  return appIconSvg("dark");
}

/**
 * 내려받을 수 있는 브랜드 파일의 정본 목록.
 *
 * 빌드(`vite.config.ts`)가 이 목록을 그대로 dist 에 쓰고, `/brand` 화면(`pages/Brand.tsx`)이
 * 같은 목록을 그대로 보여 준다. 한때 빌드는 일곱 개를 내는데 화면은 네 개만 보여 줬다.
 * 목록이 두 곳에 있었기 때문이고, 그래서 목록을 여기 하나로 옮겼다.
 *
 * `file` 이 dist 안의 경로이자 공개 URL(`/` + file)이다. 목록에 없는 브랜드 파일은
 * 존재하지 않는다.
 */
export const BRAND_ASSETS = [
  {
    file: "brand/mark-dark.svg",
    label: "심볼 (밝은 획)",
    note: "어두운 바탕용",
    svg: () => symbolSvg({ ink: BRAND.ivory }),
  },
  {
    file: "brand/mark-light.svg",
    label: "심볼 (어두운 획)",
    note: "밝은 바탕용",
    svg: () => symbolSvg({ ink: BRAND.carbon }),
  },
  {
    file: "brand/icon-light.svg",
    label: "앱 아이콘 (밝은 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("light", 512),
  },
  {
    file: "brand/icon-dark.svg",
    label: "앱 아이콘 (어두운 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("dark", 512),
  },
  {
    file: "brand/icon-brand.svg",
    label: "앱 아이콘 (강조 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("brand", 512),
  },
  {
    file: "brand/icon-outline.svg",
    label: "앱 아이콘 (테두리 칩)",
    note: "512px 정사각",
    svg: () => appIconSvg("outline", 512),
  },
  {
    file: "favicon.svg",
    label: "파비콘",
    note: "탭 아이콘",
    svg: faviconSvg,
  },
] as const;
