import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";

/** 고정한 OFL 글꼴을 WOFF 포장만 풀어 PDF 생성기가 읽을 sfnt로 복원한다. https://www.w3.org/TR/WOFF/ */
export function unpackFont(bytes: Uint8Array) {
  const woff = Buffer.from(bytes);
  assert.equal(woff.readUInt32BE(0), 0x774f4646);
  assert.equal(woff.readUInt32BE(8), woff.length);
  const count = woff.readUInt16BE(12), font = Buffer.alloc(woff.readUInt32BE(16));
  font.writeUInt32BE(woff.readUInt32BE(4), 0); font.writeUInt16BE(count, 4);
  const power = 2 ** Math.floor(Math.log2(count));
  font.writeUInt16BE(power * 16, 6); font.writeUInt16BE(Math.log2(power), 8); font.writeUInt16BE(count * 16 - power * 16, 10);
  let offset = 12 + count * 16, head = 0;
  for (let i = 0; i < count; i++) {
    const source = 44 + i * 20, target = 12 + i * 16;
    const start = woff.readUInt32BE(source + 4), compressed = woff.readUInt32BE(source + 8), length = woff.readUInt32BE(source + 12);
    const bytes = woff.subarray(start, start + compressed), data = compressed < length ? inflateSync(bytes) : bytes;
    assert.equal(data.length, length); assert.ok(offset + length <= font.length);
    woff.copy(font, target, source, source + 4);
    font.writeUInt32BE(woff.readUInt32BE(source + 16), target + 4); font.writeUInt32BE(offset, target + 8); font.writeUInt32BE(length, target + 12);
    data.copy(font, offset);
    if (woff.toString("ascii", source, source + 4) === "head") head = offset;
    offset += Math.ceil(length / 4) * 4;
  }
  assert.equal(offset, font.length); assert.ok(head > 0);
  font.writeUInt32BE(0, head + 8);
  let checksum = 0;
  for (let i = 0; i < font.length; i += 4) checksum = (checksum + font.readUInt32BE(i)) >>> 0;
  font.writeUInt32BE((0xb1b0afba - checksum) >>> 0, head + 8);
  return font;
}
