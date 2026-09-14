#!/usr/bin/env node

import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {Buffer} file */
function decodePng(file) {
  if (!file.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('not a PNG file');

  let offset = 8;
  let header;
  const idat = [];

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }

  if (!header) throw new Error('PNG has no IHDR chunk');
  if (header.depth !== 8) throw new Error(`unsupported bit depth ${header.depth}, expected 8`);
  if (header.interlace !== 0) throw new Error('interlaced PNG is not supported');

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[header.colorType];
  if (!channels) throw new Error(`unsupported color type ${header.colorType}`);

  const { width, height } = header;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * 4);
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    raw.copy(current, 0, rowStart + 1, rowStart + 1 + stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let value = current[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) throw new Error(`unknown PNG filter ${filter} on row ${y}`);
      current[x] = value & 0xff;
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      if (channels <= 2) {
        pixels[target] = current[source];
        pixels[target + 1] = current[source];
        pixels[target + 2] = current[source];
        pixels[target + 3] = channels === 2 ? current[source + 1] : 255;
      } else {
        pixels[target] = current[source];
        pixels[target + 1] = current[source + 1];
        pixels[target + 2] = current[source + 2];
        pixels[target + 3] = channels === 4 ? current[source + 3] : 255;
      }
    }

    current.copy(previous);
  }

  return { width, height, pixels };
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
}

/**
 * Photographic art compresses far better when each row picks its own filter, so try all five
 * and keep the one with the smallest sum of signed deltas (the heuristic libpng uses).
 */
function filterRow(current, previous, stride, output) {
  const candidates = [0, 1, 2, 3, 4];
  let bestScore = Infinity;

  for (const filter of candidates) {
    let score = 0;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? current[x - 4] : 0;
      const up = previous[x];
      const upLeft = x >= 4 ? previous[x - 4] : 0;
      let value = current[x];
      if (filter === 1) value -= left;
      else if (filter === 2) value -= up;
      else if (filter === 3) value -= (left + up) >> 1;
      else if (filter === 4) value -= paeth(left, up, upLeft);
      value &= 0xff;
      score += value < 128 ? value : 256 - value;
    }

    if (score < bestScore) {
      bestScore = score;
      output[0] = filter;
      for (let x = 0; x < stride; x += 1) {
        const left = x >= 4 ? current[x - 4] : 0;
        const up = previous[x];
        const upLeft = x >= 4 ? previous[x - 4] : 0;
        let value = current[x];
        if (filter === 1) value -= left;
        else if (filter === 2) value -= up;
        else if (filter === 3) value -= (left + up) >> 1;
        else if (filter === 4) value -= paeth(left, up, upLeft);
        output[x + 1] = value & 0xff;
      }
    }
  }
}

/** @param {{ width: number, height: number, pixels: Buffer }} image */
function encodePng(image) {
  const { width, height, pixels } = image;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const previous = Buffer.alloc(stride);
  const row = Buffer.alloc(stride + 1);

  for (let y = 0; y < height; y += 1) {
    const current = pixels.subarray(y * stride, (y + 1) * stride);
    filterRow(current, previous, stride, row);
    row.copy(raw, y * (stride + 1));
    current.copy(previous);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    PNG_MAGIC,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Box filter: every target pixel averages the source rectangle it covers, weighted by alpha. */
function resize(image, size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = image.width / size;

  for (let y = 0; y < size; y += 1) {
    const top = Math.floor(y * scale);
    const bottom = Math.max(top + 1, Math.floor((y + 1) * scale));
    for (let x = 0; x < size; x += 1) {
      const left = Math.floor(x * scale);
      const right = Math.max(left + 1, Math.floor((x + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let alphaSum = 0;
      let count = 0;

      for (let sy = top; sy < bottom; sy += 1) {
        for (let sx = left; sx < right; sx += 1) {
          const source = (sy * image.width + sx) * 4;
          const alpha = image.pixels[source + 3];
          r += image.pixels[source] * alpha;
          g += image.pixels[source + 1] * alpha;
          b += image.pixels[source + 2] * alpha;
          alphaSum += alpha;
          count += 1;
        }
      }

      const target = (y * size + x) * 4;
      pixels[target] = alphaSum ? Math.round(r / alphaSum) : 0;
      pixels[target + 1] = alphaSum ? Math.round(g / alphaSum) : 0;
      pixels[target + 2] = alphaSum ? Math.round(b / alphaSum) : 0;
      pixels[target + 3] = Math.round(alphaSum / count);
    }
  }

  return { width: size, height: size, pixels };
}

/**
 * Crops the transparent margin so the mark fills the icon box. Windows and Linux draw the file
 * edge to edge, so art delivered with macOS-style padding renders visibly smaller than its
 * neighbours in the taskbar. The crop is squared off around the content, never past the canvas.
 */
function trim(image) {
  const { width, height, pixels } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return image;

  const side = Math.min(Math.max(maxX - minX + 1, maxY - minY + 1), Math.min(width, height));
  const left = Math.max(0, Math.min(width - side, Math.round((minX + maxX + 1 - side) / 2)));
  const top = Math.max(0, Math.min(height - side, Math.round((minY + maxY + 1 - side) / 2)));

  const cropped = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    pixels.copy(cropped, y * side * 4, ((top + y) * width + left) * 4, ((top + y) * width + left + side) * 4);
  }

  return { width: side, height: side, pixels: cropped, trimmed: side !== width };
}

/** macOS template icons are pure black plus the original alpha. */
function toTemplate(image) {
  const pixels = Buffer.from(image.pixels);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
  }
  return { width: image.width, height: image.height, pixels };
}

function opaqueRatio(image) {
  let opaque = 0;
  for (let i = 3; i < image.pixels.length; i += 4) if (image.pixels[i] > 16) opaque += 1;
  return opaque / (image.width * image.height);
}

/** @param {Array<{ size: number, png: Buffer }>} entries */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(entries.length * 16);
  let offset = header.length + directory.length;

  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

/** @param {Array<{ type: string, png: Buffer }>} entries */
function encodeIcns(entries) {
  const blocks = entries.map(({ type, png }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });

  const body = Buffer.concat(blocks);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const LINUX_SIZES = [16, 24, 32, 48, 64, 128, 256, 512];
const ICNS_TYPES = [
  ['icp4', 16],
  ['icp5', 32],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32],
  ['ic12', 64],
  ['ic13', 256],
  ['ic14', 512],
];

function write(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(`  ${path.relative(process.cwd(), file).split(path.sep).join('/')} (${(data.length / 1024).toFixed(1)} KB)`);
}

const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/generate-brand-assets.mjs <square-png>');
  process.exit(1);
}

const image = decodePng(readFileSync(source));
if (image.width !== image.height) throw new Error(`source must be square, got ${image.width}x${image.height}`);
if (image.width < 1024) throw new Error(`source must be at least 1024x1024, got ${image.width}`);

console.log(`source: ${source} (${image.width}x${image.height})`);

const edgeToEdge = trim(image);
if (edgeToEdge.trimmed) {
  const margin = (((image.width - edgeToEdge.width) / 2 / image.width) * 100).toFixed(1);
  console.log(`trimmed ${margin}% transparent margin per side for the Windows and Linux icons`);
}

const cache = new Map();
const at = (size) => {
  if (!cache.has(size)) cache.set(size, encodePng(resize(edgeToEdge, size)));
  return cache.get(size);
};

/** macOS keeps the padding: Apple's grid expects the rounded plate to sit inside a margin. */
const padded = new Map();
const atPadded = (size) => {
  if (!padded.has(size)) padded.set(size, encodePng(resize(image, size)));
  return padded.get(size);
};

console.log('\nelectron:');
write('electron/resources/icon.png', at(512));
write('electron/resources/icon.ico', encodeIco(ICO_SIZES.map((size) => ({ size, png: at(size) }))));
write('electron/resources/icon.icns', encodeIcns(ICNS_TYPES.map(([type, size]) => ({ type, png: atPadded(size) }))));
for (const size of LINUX_SIZES) write(`electron/resources/icons/${size}x${size}.png`, at(size));

console.log('\ntray:');
write('electron/resources/tray.png', at(16));
write('electron/resources/tray@2x.png', at(32));
const template16 = toTemplate(resize(edgeToEdge, 16));
write('electron/resources/trayTemplate.png', encodePng(template16));
write('electron/resources/trayTemplate@2x.png', encodePng(toTemplate(resize(edgeToEdge, 32))));

console.log('\nweb:');
write('static/brand/icon.png', at(256));

const filled = opaqueRatio(template16);
if (filled > 0.6) {
  console.log(
    `\nWARNING: the template icon is ${(filled * 100).toFixed(0)}% opaque, so the macOS tray renders a solid block.\n` +
      'A template icon is a silhouette cut out of transparency. Export a dedicated monochrome mark without\n' +
      'the background plate and rerun, or the tray stays unusable on macOS.',
  );
}
