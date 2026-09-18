#!/usr/bin/env node
// Recorta e redimensiona uma foto retangular pro formato vertical exigido pelo
// sidebar do instalador NSIS (BMP 24-bit, 164x314px). Reaproveita o decode/resize
// PNG de generate-brand-assets.mjs; so adiciona o crop central e o encoder BMP.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
      header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], colorType: data[9], interlace: data[12] };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (!header) throw new Error('PNG has no IHDR chunk');
  if (header.depth !== 8) throw new Error(`unsupported bit depth ${header.depth}`);
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

function cropCenter(image, width, height) {
  const left = Math.max(0, Math.round((image.width - width) / 2));
  const top = Math.max(0, Math.round((image.height - height) / 2));
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    image.pixels.copy(pixels, y * width * 4, ((top + y) * image.width + left) * 4, ((top + y) * image.width + left + width) * 4);
  }
  return { width, height, pixels };
}

function resize(image, width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  const scaleX = image.width / width;
  const scaleY = image.height / height;
  for (let y = 0; y < height; y += 1) {
    const top = Math.floor(y * scaleY);
    const bottom = Math.max(top + 1, Math.floor((y + 1) * scaleY));
    for (let x = 0; x < width; x += 1) {
      const left = Math.floor(x * scaleX);
      const right = Math.max(left + 1, Math.floor((x + 1) * scaleX));
      let r = 0, g = 0, b = 0, count = 0;
      for (let sy = top; sy < bottom; sy += 1) {
        for (let sx = left; sx < right; sx += 1) {
          const source = (sy * image.width + sx) * 4;
          r += image.pixels[source];
          g += image.pixels[source + 1];
          b += image.pixels[source + 2];
          count += 1;
        }
      }
      const target = (y * width + x) * 4;
      pixels[target] = Math.round(r / count);
      pixels[target + 1] = Math.round(g / count);
      pixels[target + 2] = Math.round(b / count);
      pixels[target + 3] = 255;
    }
  }
  return { width, height, pixels };
}

/** BMP 24-bit sem compressao, linhas de baixo pra cima, cada linha alinhada em 4 bytes. */
function encodeBmp24(image) {
  const { width, height, pixels } = image;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 14 + 40 + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);
  buffer.write('BM', 0, 'ascii');
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(14 + 40, 10);

  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);

  let offset = 54;
  for (let y = height - 1; y >= 0; y -= 1) {
    const rowStart = offset;
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      buffer[offset] = pixels[source + 2];
      buffer[offset + 1] = pixels[source + 1];
      buffer[offset + 2] = pixels[source];
      offset += 3;
    }
    offset = rowStart + rowSize;
  }

  return buffer;
}

const [source, outFile, widthArg, heightArg] = process.argv.slice(2);
if (!source || !outFile) {
  console.error('usage: node scripts/generate-installer-sidebar.mjs <source.png> <out.bmp> [width] [height]');
  process.exit(1);
}

const width = Number(widthArg) || 164;
const height = Number(heightArg) || 314;

const image = decodePng(readFileSync(source));
const targetRatio = width / height;
let cropWidth = image.width;
let cropHeight = Math.round(image.width / targetRatio);
if (cropHeight > image.height) {
  cropHeight = image.height;
  cropWidth = Math.round(image.height * targetRatio);
}
const cropped = cropCenter(image, cropWidth, cropHeight);
const resized = resize(cropped, width, height);
const bmp = encodeBmp24(resized);

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, bmp);
console.log(`${source} (${image.width}x${image.height}) -> crop ${cropWidth}x${cropHeight} -> ${outFile} (${width}x${height}, ${(bmp.length / 1024).toFixed(1)} KB)`);
