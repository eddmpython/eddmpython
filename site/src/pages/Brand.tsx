import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AppIcon, Logo, LogoStacked, LogoSymbol, Wordmark } from "../components/Logo";
import { SYMBOL, BRAND, BRAND_ASSETS, ICON_FINISHES, type IconFinish } from "../brand";
import { DESIGN } from "../design";

/**
 * 브랜드 자산 페이지.
 *
 * 이 화면은 심볼을 **설명하는 그림이 아니라 쓰고 있는 실물**이다. 여기 보이는 마크는
 * 전부 `src/brand.ts` 가 그 자리에서 계산해 낸 것이라 사이트의 다른 화면과 다를 수 없다.
 * 브랜드 시트를 이미지로 떠서 올리면 심볼을 고친 다음 날부터 시트만 옛날 것이 된다.
 *
 * 내려받는 파일 목록은 `src/brand.ts` 의 `BRAND_ASSETS` 가 정본이고 빌드가 그 목록을
 * 그대로 dist 에 쓴다. 이 화면은 같은 목록을 읽어서 보여 주므로 빌드가 내는 파일과
 * 화면이 안내하는 파일이 어긋날 수 없다. 한때 목록이 두 곳에 있어서 빌드는 일곱 개를
 * 내는데 화면은 네 개만 보여 줬다.
 */

const PANEL =
  "rounded-2xl border border-[var(--eddm-line-base)] bg-[var(--eddm-raise)]";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-[var(--eddm-line-base)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-14 md:py-20">
        <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ivory/60">
          {description}
        </p>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

/**
 * 심볼이 무엇에서 왔는지. 네 갈래가 한 획으로 겹친다.
 *
 * 글자 두 개는 글자로 두고 뱀과 성장은 도형으로 그린다. 물결표와 화살표 문자를 쓰면
 * 자리를 채운 것처럼 보이고, 실제로 폰트마다 다르게 나온다.
 */
const ORIGINS: Array<{ glyph: React.ReactNode; label: string; note: string }> = [
  { glyph: <span className="text-[40px] leading-none font-semibold">e</span>, label: "소문자 e", note: "eddmpython 의 머리글자" },
  { glyph: <span className="text-[40px] leading-none font-semibold">으</span>, label: "한글 으", note: "둥근 바퀴가 ㅇ, 가로획이 ㅡ" },
  {
    glyph: (
      <svg viewBox="0 0 48 32" className="h-9 w-auto" aria-hidden="true">
        <path
          d="M3 26c6 0 6-9 12-9s6 9 12 9 6-9 12-9c3.5 0 5 3 5 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle cx="44" cy="9" r="3.2" fill="currentColor" />
      </svg>
    ),
    label: "뱀",
    note: "감긴 몸통과 빠져나오는 꼬리",
  },
  {
    glyph: (
      <svg viewBox="0 0 48 32" className="h-9 w-auto" aria-hidden="true">
        <path
          d="M3 28l11-11 8 6L41 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M30 5h13v13" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "성장",
    note: "가늘어지는 꼬리와 그 위의 정점",
  },
];

const FINISH_NOTE: Record<IconFinish, { label: string; note: string }> = {
  light: { label: "밝은 칩", note: "밝은 독과 밝은 문서 위" },
  dark: { label: "어두운 칩", note: "기본값. 파비콘이 쓰는 마감" },
  brand: { label: "강조 칩", note: "다른 아이콘 사이에서 튀어야 할 때" },
  outline: { label: "테두리 칩", note: "어두운 바탕에 칩 경계를 보여야 할 때" },
};

/** 팔레트. 값은 design.ts 가 정본이고 여기서는 읽기만 한다 */
const SWATCHES = [
  {
    value: DESIGN.palette.brand,
    name: "brand",
    role: "강조 하나. 점, .py, 버튼, 링크, 진행선이 전부 여기서 갈라진다",
  },
  { value: DESIGN.palette.carbon, name: "carbon", role: "다크 바탕" },
  { value: DESIGN.palette.ivory, name: "ivory", role: "다크 위의 글자" },
  { value: DESIGN.palette.brandDeep, name: "brandDeep", role: "라이트 테마 전용 강조. 대비 때문에 진한 판을 쓴다" },
];

export function Brand() {
  return (
    <div className="min-h-screen">
      <main id="content">
        <div className="mx-auto w-full max-w-5xl px-6 pt-10 md:pt-20">
          <Nav />
        </div>

        {/* 히어로. 설명보다 마크를 먼저 크게 보여 준다 */}
        <div className="mx-auto w-full max-w-5xl px-6 pb-14 md:pb-20">
          <p className="eddm-kicker">brand</p>
          <h1 className="mt-3 text-3xl leading-tight font-medium tracking-tight md:text-5xl">
            한 획으로 그린 나선 하나
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ivory/60 md:text-base">
            eddmpython 의 심볼은 손으로 딴 좌표가 아니라 작도 규칙입니다. 획 두께와
            반지름 몇 개가 정본이고 나머지는 접선 조건에서 풀려 나옵니다. 이 페이지에
            보이는 마크도 그 규칙이 지금 계산해 낸 것입니다.
          </p>
          <div
            className={`${PANEL} mt-10 flex items-center justify-center px-6 py-14 md:py-20`}
          >
            <LogoSymbol className="h-32 w-auto text-ivory md:h-44" />
          </div>
        </div>

        <Section
          id="origin"
          title="심볼이 읽히는 네 가지"
          description="한 획 안에 네 갈래가 겹쳐 있습니다. 어느 하나만 보여도 틀린 읽기가 아닙니다."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ORIGINS.map((o) => (
              <div key={o.label} className={`${PANEL} px-5 py-6`}>
                <div className="flex h-14 items-center text-ivory/30">{o.glyph}</div>
                <p className="mt-3 text-[15px] font-medium">{o.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-ivory/55">{o.note}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="lockup"
          title="로고 락업"
          description="심볼 단독, 워드마크 단독, 가로 락업, 세로 락업. 넷을 섞어 쓰지 않습니다. 브랜드를 처음 밝히는 자리에는 락업을, 이미 이름이 적힌 자리에는 심볼만 씁니다."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${PANEL} flex min-h-44 items-center justify-center px-6 py-10`}>
              <Logo size="display" />
            </div>
            <div className={`${PANEL} flex min-h-44 items-center justify-center px-6 py-10`}>
              <LogoStacked />
            </div>
            <div className={`${PANEL} flex min-h-44 items-center justify-center px-6 py-10`}>
              <LogoSymbol className="h-[34px] w-auto text-ivory" />
            </div>
            <div className={`${PANEL} flex min-h-44 items-center justify-center px-6 py-10`}>
              <Wordmark className="text-[25px]" />
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ivory/50">
            워드마크는 <code className="font-mono">eddm.py</code> 입니다. 문서와 도메인에서
            부르는 이름은 <code className="font-mono">eddmpython</code> 그대로이고 짧은
            표기는 워드마크에서만 씁니다.
          </p>
        </Section>

        <Section
          id="icon"
          title="앱 아이콘 마감"
          description="같은 심볼이고 색만 바뀝니다. 놓이는 바탕이 밝은지 어두운지가 마감을 정합니다. 강조 칩에서는 점도 흰색입니다. 칩이 이미 강조색이라 점을 강조색으로 두면 사라지기 때문입니다."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(ICON_FINISHES) as IconFinish[]).map((key) => (
              <div key={key} className={`${PANEL} px-5 py-6`}>
                <AppIcon finish={key} className="h-20 w-20 rounded-[18px]" />
                <p className="mt-4 text-[15px] font-medium">{FINISH_NOTE[key].label}</p>
                <p className="mt-1 text-sm leading-relaxed text-ivory/55">
                  {FINISH_NOTE[key].note}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="size"
          title="작은 크기"
          description="16px 까지 내려도 가운데 골이 막히지 않습니다. 나선이라 갇힌 구멍이 없기 때문입니다. 획을 깎아 골을 넓히지 않습니다."
        >
          <div className={`${PANEL} flex flex-wrap items-end gap-8 px-8 py-10`}>
            {[16, 24, 32, 48, 64].map((size) => (
              <div key={size} className="flex flex-col items-center gap-3">
                {/* 실제 픽셀 높이로 그린다. 축소해서 보여 주면 검증이 아니라 그림이다 */}
                <svg
                  viewBox={SYMBOL.viewBox}
                  height={size}
                  width={(size * SYMBOL.width) / SYMBOL.height}
                  className="block text-ivory"
                  aria-hidden="true"
                >
                  <path d={SYMBOL.shape} fill="currentColor" />
                  <circle
                    cx={SYMBOL.dot.cx}
                    cy={SYMBOL.dot.cy}
                    r={SYMBOL.dot.r}
                    fill={BRAND.dot}
                  />
                </svg>
                <span className="font-mono text-xs text-ivory/40">{size}px</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="color"
          title="색"
          description="강조는 하나입니다. 심볼의 점, 워드마크의 .py, 버튼, 링크, 선택 상태가 전부 같은 값에서 갈라집니다. 강조색을 바꾸려면 정본의 한 줄만 고칩니다."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SWATCHES.map((s) => (
              <div key={s.name} className={`${PANEL} overflow-hidden`}>
                <div
                  className="h-24 w-full border-b border-[var(--eddm-line-base)]"
                  style={{ background: s.value }}
                />
                <div className="px-5 py-5">
                  <p className="font-mono text-sm">{s.value}</p>
                  <p className="mt-1 text-[15px] font-medium">{s.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/55">{s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="files"
          title="파일"
          description="빌드가 심볼 정본에서 직접 만들어 냅니다. 저장소에 사본이 없어서 마크를 고치면 이 파일들이 같이 바뀝니다."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {BRAND_ASSETS.map((a) => (
              <a
                key={a.file}
                href={`/${a.file}`}
                className={`${PANEL} flex items-center gap-4 px-5 py-4 transition-colors hover:border-[var(--eddm-line-strong)]`}
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-carbon">
                  <LogoSymbol className="h-4 w-auto text-ivory" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{a.label}</span>
                  <span className="block font-mono text-xs break-all text-ivory/45">
                    /{a.file}
                  </span>
                </span>
                <span className="ml-auto flex-none pl-3 text-sm text-ivory/45">
                  {a.note}
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ivory/50">
            심볼의 viewBox 는 <code className="font-mono">{SYMBOL.viewBox}</code> 이고 점은
            반지름 {SYMBOL.dot.r} 짜리 원 하나입니다. 점의 색{" "}
            <code className="font-mono">{BRAND.dot}</code> 은 마크 안에서만 고정이고 나머지
            획은 놓인 자리의 글자색을 따릅니다.
          </p>
        </Section>

        <Section
          id="use"
          title="쓰지 않는 것"
          description="심볼을 다시 그리지 않아도 되도록 파일을 내어 둡니다. 아래는 그 파일을 받았더라도 하지 않는 것입니다."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "심볼을 늘이거나 기울이지 않습니다. 비율을 바꾸면 획 두께가 자리마다 달라집니다.",
              "점을 떼거나 다른 색으로 바꾸지 않습니다. 강조 칩의 흰 점만 예외입니다.",
              "심볼과 워드마크의 간격을 다시 잡지 않습니다. 락업은 이미 맞춰져 있습니다.",
              "심볼 위에 효과를 얹지 않습니다. 그림자, 외곽선, 그라디언트 전부 해당합니다.",
            ].map((line) => (
              <li key={line} className={`${PANEL} px-5 py-4 text-sm leading-relaxed text-ivory/70`}>
                {line}
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
