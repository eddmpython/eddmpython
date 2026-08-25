/**
 * eddmpython 디자인 정본.
 *
 * 공개 랜딩, 블로그, 강의장, 강의 관리가 이 파일의 토큰을 함께 쓴다. 화면별 CSS에는
 * 색상값과 글꼴 스택을 다시 적지 않는다. 컴포넌트는 이 파일이 만드는 `--eddm-*`
 * 의미 변수를 소비한다.
 *
 * 강조색을 바꾸려면 아래 `ACCENT`의 `dark`와 `light`만 고친다. 현재는 색조를
 * 더하지 않고 다크에서는 가장 밝은 값, 라이트에서는 가장 진한 값을 쓴다. 브랜드 마크의
 * 눈 색은 강조색이 아니며 `brand.ts`가 이 파일의 `palette.eye`를 읽어 사용한다.
 */

const PALETTE = {
  carbon: "#101514",
  ink: "#0c0f0e",
  ivory: "#f5f3ee",
  paper: "#ffffff",
  eye: "#d8be91",
  alert: "#e0552d",
  dartlab: "#7da2e8",
  codaro: "#dfa14e",
  xlpod: "#57b98a",
  pyproc: "#ff5a36",
} as const;

/** 강조색 교체 지점. 테마별 대비를 위해 두 값만 한 묶음으로 관리한다. */
const ACCENT = {
  dark: PALETTE.ivory,
  light: PALETTE.carbon,
} as const;

export const DESIGN = {
  palette: PALETTE,
  accent: ACCENT,
  theme: {
    dark: {
      canvas: PALETTE.carbon,
      frame: PALETTE.ink,
      foreground: PALETTE.ivory,
      accentContrast: PALETTE.carbon,
      raisedSurface: `color-mix(in srgb, ${PALETTE.ivory} 4%, transparent)`,
      hoverSurface: `color-mix(in srgb, ${PALETTE.ivory} 8%, transparent)`,
    },
    light: {
      canvas: PALETTE.ivory,
      frame: `color-mix(in srgb, ${PALETTE.ivory} 92%, ${PALETTE.carbon})`,
      foreground: PALETTE.carbon,
      accentContrast: PALETTE.ivory,
      raisedSurface: `color-mix(in srgb, ${PALETTE.paper} 60%, transparent)`,
      hoverSurface: `color-mix(in srgb, ${PALETTE.carbon} 6%, transparent)`,
    },
  },
  radius: {
    sm: ".45rem",
    md: ".7rem",
    lg: ".85rem",
    xl: "1rem",
  },
  font: {
    sans: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  typography: {
    sectionTitle: {
      mobile: "1.375rem",
      desktop: "1.5rem",
      lineHeight: "1.35",
      weight: "600",
      tracking: "-.015em",
    },
  },
  motion: {
    fast: "150ms",
    base: "300ms",
    easing: "cubic-bezier(.4,0,.2,1)",
  },
  fontHref:
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
} as const;

export type DesignTheme = keyof typeof DESIGN.theme;

function declarations(entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

function themeDeclarations(theme: DesignTheme): string {
  const value = DESIGN.theme[theme];
  return declarations({
    "--eddm-canvas": value.canvas,
    "--eddm-frame": value.frame,
    "--eddm-foreground": value.foreground,
    "--eddm-accent": DESIGN.accent[theme],
    "--eddm-accent-contrast": value.accentContrast,
    "--eddm-raise": value.raisedSurface,
    "--eddm-hover": value.hoverSurface,
  });
}

function sharedDeclarations(): string {
  const d = DESIGN;
  const section = d.typography.sectionTitle;
  return declarations({
    "--eddm-alert": d.palette.alert,
    "--eddm-dartlab": d.palette.dartlab,
    "--eddm-codaro": d.palette.codaro,
    "--eddm-xlpod": d.palette.xlpod,
    "--eddm-pyproc": d.palette.pyproc,
    "--eddm-carbon": "var(--eddm-canvas)",
    "--eddm-ink": "var(--eddm-frame)",
    "--eddm-ivory": "var(--eddm-foreground)",
    /** 이전 소비자를 위한 별칭. 새 컴포넌트는 --eddm-accent를 쓴다. */
    "--eddm-sand": "var(--eddm-accent)",
    "--eddm-text": "color-mix(in srgb, var(--eddm-foreground) 75%, transparent)",
    "--eddm-text-muted": "color-mix(in srgb, var(--eddm-foreground) 55%, transparent)",
    "--eddm-text-dim": "color-mix(in srgb, var(--eddm-foreground) 45%, transparent)",
    "--eddm-text-faint": "color-mix(in srgb, var(--eddm-foreground) 35%, transparent)",
    "--eddm-line": "color-mix(in srgb, var(--eddm-foreground) 8%, transparent)",
    "--eddm-line-base": "color-mix(in srgb, var(--eddm-foreground) 11%, transparent)",
    "--eddm-line-strong": "color-mix(in srgb, var(--eddm-foreground) 17%, transparent)",
    "--eddm-accent-line": "color-mix(in srgb, var(--eddm-accent) 28%, transparent)",
    "--eddm-accent-bg": "color-mix(in srgb, var(--eddm-accent) 7%, transparent)",
    "--eddm-accent-dim": "color-mix(in srgb, var(--eddm-accent) 55%, transparent)",
    "--eddm-code-surface": "color-mix(in srgb, var(--eddm-foreground) 5%, var(--eddm-canvas))",
    "--eddm-code-focus": "color-mix(in srgb, var(--eddm-foreground) 8%, var(--eddm-canvas))",
    "--eddm-danger": "color-mix(in srgb, var(--eddm-alert) 68%, var(--eddm-foreground))",
    "--eddm-danger-line": "color-mix(in srgb, var(--eddm-danger) 38%, transparent)",
    "--eddm-media": "var(--eddm-frame)",
    "--eddm-overlay": "color-mix(in srgb, var(--eddm-frame) 92%, transparent)",
    "--eddm-radius-sm": d.radius.sm,
    "--eddm-radius-md": d.radius.md,
    "--eddm-radius-lg": d.radius.lg,
    "--eddm-radius-xl": d.radius.xl,
    "--eddm-font-sans": d.font.sans,
    "--eddm-font-mono": d.font.mono,
    "--eddm-motion-fast": d.motion.fast,
    "--eddm-motion-base": d.motion.base,
    "--eddm-motion-easing": d.motion.easing,
    "--eddm-section-title-size-mobile": section.mobile,
    "--eddm-section-title-size-desktop": section.desktop,
    "--eddm-section-title-line-height": section.lineHeight,
    "--eddm-section-title-weight": section.weight,
    "--eddm-section-title-tracking": section.tracking,
  });
}

/**
 * CSS 의미 변수를 만든다.
 *
 * 랜딩은 고정 다크를, Worker가 그리는 강의장과 강의 관리는 라이트 기본의 `adaptive`를 쓴다.
 * 값과 파생 규칙은 두 출력 모두 이 함수 한 곳에서 나온다.
 */
export function designCssVars(mode: "dark" | "adaptive" = "dark"): string {
  const dark = `${sharedDeclarations()};${themeDeclarations("dark")}`;
  if (mode === "dark") return `:root{color-scheme:dark;${dark}}`;
  return `:root{${dark}}:root:not([data-theme="dark"]){color-scheme:light;${themeDeclarations("light")}}:root[data-theme="dark"]{color-scheme:dark}`;
}

export function themeColor(theme: DesignTheme): string {
  return DESIGN.theme[theme].canvas;
}
