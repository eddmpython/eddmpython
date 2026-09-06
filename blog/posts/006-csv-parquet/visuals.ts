import { readFileSync } from "node:fs";
import { DESIGN } from "../../../site/src/design.ts";

// 측정 그래프는 본문과 같은 실측 파일을 읽는다. 색은 브랜드 정본에서만 가져온다.
const report = JSON.parse(readFileSync(new URL("./measurements.json", import.meta.url), "utf8"));
const [small, middle, large] = report.measurements;
const { carbon, ink, ivory, brand } = DESIGN.palette;
const esc = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const text = (x: number, y: number, value: string | number, size = 68, fill = ivory, anchor = "start") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
const rect = (x: number, y: number, w: number, h: number, stroke = ivory, fill = ink, opacity = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}" stroke="${stroke}" stroke-width="4" opacity="${opacity}"/>`;
const line = (d: string, color = brand, arrow = true) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="8" stroke-linejoin="round" ${arrow ? 'marker-end="url(#arrow)"' : ""}/>`;
const box = (x: number, y: number, w: number, label: string, detail: string, accent = false) =>
  rect(x, y, w, 210, accent ? brand : ivory) + text(x + 40, y + 82, label, 68, accent ? brand : ivory) + text(x + 40, y + 155, detail, 58);
const frame = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 1152" width="2048" height="1152"><defs><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 12 6 L 0 12 Z" fill="${brand}"/></marker></defs><rect width="2048" height="1152" fill="${carbon}"/><g font-family="Malgun Gothic, sans-serif" font-weight="600">${body}</g></svg>`;
const number = (value: number) => value.toLocaleString("en-US");

function table(x: number, y: number, width: number, selected = false) {
  const columns = ["code", "region", "qty"];
  const values = [["0012", "0013", "0014"], ["서울", "부산", "서울"], ["3", "5", "2"]];
  const cell = width / 3;
  return columns.map((column, i) => `<g opacity="${selected && i !== 2 ? 0.3 : 1}">` +
    rect(x + i * cell, y, cell - 12, 450, i === 2 ? brand : ivory) +
    text(x + i * cell + cell / 2 - 6, y + 78, column, 62, i === 2 ? brand : ivory, "middle") +
    values[i].map((value, j) => text(x + i * cell + cell / 2 - 6, y + 185 + j * 102, value, 72, ivory, "middle")).join("") + "</g>").join("");
}

function sizeBars(rows: Array<{ label: string; bytes: number; accent?: boolean }>, maximum: number) {
  const left = 210;
  const width = 1640;
  let result = line(`M ${left} 950 H ${left + width}`, ivory, false) + text(left, 1020, "0", 56) + text(left + width, 1020, `${number(maximum)} B`, 56, ivory, "end");
  rows.forEach((row, i) => {
    const y = 170 + i * (rows.length === 2 ? 355 : 250);
    result += text(left, y + 30, row.label, 66) + text(left + width, y + 30, `${number(row.bytes)} B`, 66, row.accent ? brand : ivory, "end");
    result += `<rect x="${left}" y="${y + 72}" width="${row.bytes / maximum * width}" height="108" rx="4" fill="${row.accent ? brand : ivory}"/>`;
  });
  return result;
}

export const visuals: Record<string, string> = {
  "same-table": frame(
    table(190, 345, 850) +
    line("M 1060 570 H 1170 V 340 H 1280") + line("M 1170 570 V 785 H 1280") +
    box(1320, 225, 530, "CSV", ".csv") +
    box(1320, 675, 530, "Parquet", ".parquet", true) +
    text(190, 910, "입력: 3행 × 3열", 72) + text(1320, 1010, "출력: 두 파일", 72)
  ),
  "csv-text": frame(
    rect(185, 265, 1675, 540) +
    text(250, 430, '"0012"', 108) + text(730, 430, ",", 118, brand) + text(835, 430, '"서울"', 108) + text(1300, 430, ",", 118, brand) + text(1420, 430, "3", 108) +
    text(250, 690, '"0013"', 108) + text(730, 690, ",", 118, brand) + text(835, 690, '"부산"', 108) + text(1300, 690, ",", 118, brand) + text(1420, 690, "5", 108) +
    line("M 1650 415 H 1750 V 595 H 1640") + text(275, 970, "쉼표: 값을 나눔", 76, brand) + text(1080, 970, "줄바꿈: 다음 행", 76, brand)
  ),
  "type-inference": frame(
    text(210, 240, "CSV 원문", 76) + text(1420, 240, "읽은 값", 76) +
    rect(185, 325, 650, 410) + text(285, 590, "00", 170, brand) + text(515, 590, "12", 170) +
    line("M 880 535 H 1330") + text(1110, 410, "정수로 추정", 66, ivory, "middle") +
    rect(1390, 325, 465, 410, brand) + text(1620, 590, "12", 190, brand, "middle") +
    text(210, 955, "파일의 0012는 그대로", 72) + text(1350, 955, "앞자리 0 없음", 68)
  ),
  "explicit-type": frame(
    box(185, 465, 455, "CSV", '"0012"') +
    line("M 680 570 H 795 V 270 H 1280") + line("M 795 570 V 825 H 1280") +
    text(825, 210, "자동 추정", 68) + text(820, 765, "string 지정", 68, brand) +
    box(1330, 165, 525, "정수", "12") + box(1330, 720, 525, "문자열", "0012", true)
  ),
  schema: frame(
    text(210, 225, "Parquet 파일", 78) + rect(185, 305, 870, 515, brand) +
    text(245, 450, "code: string", 85, brand) + text(245, 590, '"0012"  "0013"', 76) + text(245, 710, '"0014"', 76) +
    line("M 1095 555 H 1285") + box(1340, 450, 515, "string", "0012", true) +
    text(210, 975, "값 + 자료형", 78) + text(1350, 975, "문자열 그대로", 68)
  ),
  "small-size": frame(sizeBars([
    { label: "CSV · 압축 없음", bytes: small.csvBytes },
    { label: "Parquet · Snappy", bytes: small.parquetBytes, accent: true },
  ], 1100)),
  "row-count": frame(report.measurements.map((row: typeof small, i: number) => {
    const y = 205 + i * 292;
    const maximum = Math.max(row.csvBytes, row.parquetBytes);
    const x = 610;
    const width = 1180;
    return text(190, y + 90, `${number(row.rows)}행`, 70) +
      `<path d="M ${x} ${y - 5} V ${y + 178}" stroke="${ivory}" stroke-width="3"/>` +
      `<rect x="${x}" y="${y + 10}" width="${row.csvBytes / maximum * width}" height="48" fill="${ivory}"/>` +
      `<rect x="${x}" y="${y + 125}" width="${row.parquetBytes / maximum * width}" height="48" fill="${brand}"/>` +
      text(x, y - 14, `CSV  ${number(row.csvBytes)} B`, 55) + text(x, y + 105, `Parquet  ${number(row.parquetBytes)} B`, 55, brand);
  }).join("")),
  compression: frame(sizeBars([
    { label: "CSV · 압축 없음", bytes: large.csvBytes },
    { label: "Parquet · 압축 없음", bytes: large.uncompressedParquetBytes },
    { label: "Parquet · Snappy", bytes: large.parquetBytes, accent: true },
  ], 2000000)),
  "column-layout": frame(
    text(185, 225, "표", 78) + table(185, 330, 755) + line("M 970 560 H 1120") +
    text(1180, 225, "한 행 묶음 안", 78) +
    rect(1175, 330, 680, 150) + text(1210, 423, "code  0012 · 0013 · 0014", 49) +
    rect(1175, 520, 680, 150) + text(1210, 613, "region  서울 · 부산 · 서울", 49) +
    rect(1175, 710, 680, 150, brand) + text(1210, 803, "qty  3 · 5 · 2", 65, brand) +
    text(185, 1010, "행과 열의 값은 그대로, 같은 열끼리 모음", 69)
  ),
  "column-selection": frame(
    text(185, 225, "저장된 세 열", 78) + table(185, 340, 960, true) +
    line("M 1165 565 H 1450") + text(1310, 440, "qty 요청", 60, brand, "middle") +
    rect(1510, 340, 345, 450, brand) + text(1680, 420, "qty", 72, brand, "middle") +
    [3, 5, 2].map((value, i) => text(1680, 525 + i * 102, value, 78, ivory, "middle")).join("") +
    text(185, 990, "원본 파일은 그대로", 72) + text(1505, 990, "결과 한 열", 68)
  ),
  "read-time": frame(([
    ["3행 · 전체", small.medianMs.csvAll, small.medianMs.parquetAll],
    ["1,000행 · 전체", middle.medianMs.csvAll, middle.medianMs.parquetAll],
    ["십만 행 · 전체", large.medianMs.csvAll, large.medianMs.parquetAll],
    ["십만 행 · qty", large.medianMs.csvQty, large.medianMs.parquetQty],
  ] as Array<[string, number, number]>).map(([label, csv, parquet], i) => {
    const y = 245 + i * 175;
    return text(180, y + 58, label, 57) +
      `<rect x="665" y="${y}" width="${csv / 8 * 920}" height="44" fill="${ivory}"/>` +
      `<rect x="665" y="${y + 68}" width="${parquet / 8 * 920}" height="44" fill="${brand}"/>` +
      text(1845, y + 40, csv.toFixed(3), 58, ivory, "end") + text(1845, y + 110, parquet.toFixed(3), 58, brand, "end");
  }).join("") + text(665, 155, "CSV", 62) + text(1010, 155, "Parquet", 62, brand) + text(1845, 155, "ms", 62, ivory, "end") +
    line("M 665 990 H 1585", ivory, false) + text(665, 1055, "0", 52) + text(1585, 1055, "8 ms", 52, ivory, "end")
  ),
  "format-choice": frame(
    box(185, 390, 540, "받는 프로그램", "Parquet 지원?") +
    line("M 765 495 H 925 V 245 H 1245") + text(820, 190, "아니요", 65) +
    line("M 925 495 V 775 H 1090", brand, false) + text(950, 720, "예", 65, brand) +
    box(1300, 140, 550, "CSV", "CSV 지원 확인") +
    box(1300, 490, 550, "CSV", "문자 확인 · 교환") +
    box(1300, 840, 550, "Parquet 시험", "자료형 · 열 선택", true) +
    line("M 970 775 H 1090 V 595 H 1250") + line("M 1090 775 V 945 H 1250")
  ),
};
