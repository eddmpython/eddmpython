export const MAX_SINGLE_CAPTURE_HEIGHT = 30000;

function positiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`긴 페이지 캡처 ${name}가 올바르지 않습니다: ${value}`);
  }
  return Math.ceil(value);
}

export function planFullPageCaptures({ width, height, viewportHeight }) {
  const captureWidth = positiveFinite(width, "너비");
  const captureHeight = positiveFinite(height, "높이");
  const captureViewportHeight = positiveFinite(viewportHeight, "뷰포트 높이");

  if (captureHeight <= MAX_SINGLE_CAPTURE_HEIGHT) {
    return [
      {
        kind: "full",
        fileToken: "full",
        options: { fullPage: true },
      },
    ];
  }

  const maxScrollY = Math.max(0, captureHeight - captureViewportHeight);
  const scrollPositions = [];
  for (let y = 0; y < maxScrollY; y += captureViewportHeight) {
    scrollPositions.push(y);
  }
  if (scrollPositions.at(-1) !== maxScrollY) scrollPositions.push(maxScrollY);

  const segmentCount = scrollPositions.length;
  return scrollPositions.map((scrollY, index) => {
    return {
      kind: "full-segment",
      fileToken: `full-${String(index + 1).padStart(2, "0")}`,
      segment: index + 1,
      segmentCount,
      scrollY,
      options: {},
    };
  });
}
