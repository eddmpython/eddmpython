import { useEffect, useMemo, useRef, useState } from "react";
import { encodeQr } from "../qrEncode";

/**
 * 링크나 문구를 QR 로 바꾸는 도구. 글이 품는 도구의 첫 사례다.
 *
 * QR 은 스캔되도록 흰 타일에 검은 모듈로 그린다. 페이지가 다크여도 이 규칙은 지킨다.
 * 인코더는 src/qrEncode.ts 하나를 쓰고 게이트가 그 정합성을 검사한다.
 */
export function QrTool() {
  const [text, setText] = useState("https://eddmpython.com");
  const [scale, setScale] = useState(6);
  const [quiet, setQuiet] = useState(4);
  const [toast, setToast] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toastTimer = useRef<number | null>(null);

  const result = useMemo(() => encodeQr(text.trim()), [text]);
  const ok = "matrix" in result;

  useEffect(() => {
    if (!("matrix" in result)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dim = (result.size + quiet * 2) * scale;
    canvas.width = dim;
    canvas.height = dim;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = "#101514";
    for (let y = 0; y < result.size; y++)
      for (let x = 0; x < result.size; x++) {
        if (result.matrix[y][x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
  }, [result, scale, quiet]);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1600);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !ok) return;
    try {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "qr.png";
      a.click();
      flash("내려받았습니다");
    } catch {
      flash("저장이 지원되지 않는 화면입니다");
    }
  }

  async function copy() {
    const canvas = canvasRef.current;
    if (!canvas || !ok) return;
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("복사했습니다");
    } catch {
      flash("복사가 지원되지 않는 화면입니다");
    }
  }

  return (
    <section
      aria-label="QR 생성기"
      className="my-8 overflow-hidden rounded-2xl border border-white/11 bg-white/[0.025]"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px]">
        <div className="border-b border-white/8 p-5 md:border-r md:border-b-0 md:p-6">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ivory/38 uppercase">도구 · QR</p>
          <label className="mt-4 block">
            <span className="mb-2 block font-mono text-[11px] tracking-[0.12em] text-ivory/45 uppercase">
              주소 또는 문구
            </span>
            <textarea
              value={text}
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[5rem] w-full resize-y rounded-lg border border-white/11 bg-carbon px-3 py-2.5 font-mono text-sm leading-relaxed text-ivory outline-none focus:border-white/25"
            />
          </label>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.12em] text-ivory/45 uppercase">모듈 크기</span>
                <span className="font-mono text-xs text-ivory/70 tabular-nums">{scale}px</span>
              </span>
              <input
                type="range"
                min={3}
                max={12}
                step={1}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="mt-2 w-full accent-ivory"
              />
            </label>
            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.12em] text-ivory/45 uppercase">테두리 여백</span>
                <span className="font-mono text-xs text-ivory/70 tabular-nums">{quiet}</span>
              </span>
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={quiet}
                onChange={(e) => setQuiet(Number(e.target.value))}
                className="mt-2 w-full accent-ivory"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 bg-white/[0.02] p-5 md:p-6">
          <div className="rounded-lg bg-white p-3.5 leading-none shadow-[0_14px_40px_-18px_rgba(0,0,0,.9)]">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="생성된 QR 코드"
              className="block h-[190px] w-[190px] [image-rendering:pixelated]"
            />
          </div>
          <p className="text-center font-mono text-[11px] text-ivory/38 tabular-nums">
            {ok ? (
              <>
                버전 <span className="text-ivory/55">{result.version}</span> · {result.size}&times;{result.size} 칸
              </>
            ) : (
              <span className="text-[#e0908a]">{(result as { error: string }).error}</span>
            )}
          </p>
          <div className="flex w-full gap-2.5">
            <button
              type="button"
              onClick={download}
              disabled={!ok}
              className="flex-1 rounded-lg border border-white/11 bg-white/[0.08] px-2 py-2 text-[13px] font-medium text-ivory/75 transition-colors hover:border-white/20 hover:bg-white/[0.12] hover:text-ivory disabled:opacity-40"
            >
              PNG 저장
            </button>
            <button
              type="button"
              onClick={copy}
              disabled={!ok}
              className="flex-1 rounded-lg border border-white/11 bg-white/[0.08] px-2 py-2 text-[13px] font-medium text-ivory/75 transition-colors hover:border-white/20 hover:bg-white/[0.12] hover:text-ivory disabled:opacity-40"
            >
              이미지 복사
            </button>
          </div>
          <p className="h-4 font-mono text-[11px] text-ivory/45" aria-live="polite">
            {toast}
          </p>
        </div>
      </div>
    </section>
  );
}
