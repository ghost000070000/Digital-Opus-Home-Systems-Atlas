/**
 * Local QR encoder (byte mode, ECC M, versions 1–4).
 * Encodes a user-defined identifier as SVG. No network.
 */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

function rsGenerator(ecCount: number): Uint8Array {
  const gen = new Uint8Array(ecCount + 1);
  gen[0] = 1;
  for (let i = 0; i < ecCount; i++) {
    for (let j = i + 1; j > 0; j--) {
      gen[j] ^= gfMul(gen[j - 1]!, EXP[i]!);
    }
  }
  return gen;
}

function rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGenerator(ecCount);
  const ec = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ ec[0]!;
    ec.copyWithin(0, 1);
    ec[ecCount - 1] = 0;
    if (factor === 0) continue;
    for (let i = 0; i < ecCount; i++) {
      ec[i] ^= gfMul(gen[i + 1]!, factor);
    }
  }
  return ec;
}

interface VersionSpec {
  version: number;
  size: number;
  dataCount: number;
  ecCount: number;
  align: number[];
}

const VERSIONS: VersionSpec[] = [
  { version: 1, size: 21, dataCount: 16, ecCount: 10, align: [] },
  { version: 2, size: 25, dataCount: 28, ecCount: 16, align: [18] },
  { version: 3, size: 29, dataCount: 44, ecCount: 26, align: [22] },
  { version: 4, size: 33, dataCount: 64, ecCount: 36, align: [26] },
];

/** Format bits for ECC-M + mask 0..7 */
const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

function chooseVersion(byteLen: number): VersionSpec {
  for (const v of VERSIONS) {
    // 4 mode + 8 length + 8*bytes + 4 terminator, packed into dataCount bytes
    const bits = 4 + 8 + byteLen * 8 + 4;
    if (Math.ceil(bits / 8) <= v.dataCount) return v;
  }
  throw new Error("Text is too long for a local label QR (max ~60 characters).");
}

function encodeBytes(text: string, dataCount: number): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, dataCount * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data = new Uint8Array(dataCount);
  for (let i = 0; i < bits.length / 8 && i < dataCount; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b]!;
    data[i] = v;
  }
  const pads = [0xec, 0x11];
  let p = 0;
  for (let i = Math.ceil(bits.length / 8); i < dataCount; i++) {
    data[i] = pads[p % 2]!;
    p += 1;
  }
  return data;
}

function placeFinder(mod: Uint8Array, size: number, x: number, y: number, reserved: Uint8Array) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
      const on =
        dx >= 0 &&
        dx <= 6 &&
        dy >= 0 &&
        dy <= 6 &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      mod[yy * size + xx] = on ? 1 : 0;
      reserved[yy * size + xx] = 1;
    }
  }
}

function placeAlign(mod: Uint8Array, size: number, cx: number, cy: number, reserved: Uint8Array) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const xx = cx + dx;
      const yy = cy + dy;
      const on = Math.max(Math.abs(dx), Math.abs(dy)) !== 1 || (dx === 0 && dy === 0);
      const edge = Math.max(Math.abs(dx), Math.abs(dy)) === 2;
      const center = dx === 0 && dy === 0;
      mod[yy * size + xx] = edge || center ? 1 : 0;
      reserved[yy * size + xx] = 1;
      void on;
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function setFormat(mod: Uint8Array, size: number, reserved: Uint8Array, bits: number) {
  for (let i = 0; i < 15; i++) {
    const bit = (bits >> (14 - i)) & 1;
    // around top-left finder
    if (i < 6) {
      mod[i * size + 8] = bit;
      reserved[i * size + 8] = 1;
    } else if (i === 6) {
      mod[7 * size + 8] = bit;
      reserved[7 * size + 8] = 1;
    } else if (i === 7) {
      mod[8 * size + 8] = bit;
      reserved[8 * size + 8] = 1;
    } else {
      mod[8 * size + (14 - i)] = bit;
      reserved[8 * size + (14 - i)] = 1;
    }
    // split copy
    if (i < 8) {
      mod[8 * size + (size - 1 - i)] = bit;
      reserved[8 * size + (size - 1 - i)] = 1;
    } else {
      mod[(size - 15 + i) * size + 8] = bit;
      reserved[(size - 15 + i) * size + 8] = 1;
    }
  }
  mod[8 * size + 8] = (bits >> 7) & 1; // already set
}

export function encodeQrMatrix(text: string): { size: number; modules: Uint8Array } {
  const spec = chooseVersion(new TextEncoder().encode(text).length);
  const data = encodeBytes(text, spec.dataCount);
  const ec = rsEncode(data, spec.ecCount);
  const payload = new Uint8Array(spec.dataCount + spec.ecCount);
  payload.set(data, 0);
  payload.set(ec, spec.dataCount);

  const size = spec.size;
  const mod = new Uint8Array(size * size);
  const reserved = new Uint8Array(size * size);

  placeFinder(mod, size, 0, 0, reserved);
  placeFinder(mod, size, size - 7, 0, reserved);
  placeFinder(mod, size, 0, size - 7, reserved);
  for (const a of spec.align) {
    if (reserved[a * size + a]) continue;
    placeAlign(mod, size, a, a, reserved);
  }
  // timing
  for (let i = 8; i < size - 8; i++) {
    mod[6 * size + i] = i % 2 === 0 ? 1 : 0;
    mod[i * size + 6] = i % 2 === 0 ? 1 : 0;
    reserved[6 * size + i] = 1;
    reserved[i * size + 6] = 1;
  }
  // dark module
  mod[(size - 8) * size + 8] = 1;
  reserved[(size - 8) * size + 8] = 1;

  const MASK = 0;
  setFormat(mod, size, reserved, FORMAT_M[MASK]!);

  // zigzag data
  let bit = 0;
  const totalBits = payload.length * 8;
  let goingUp = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const y = goingUp ? size - 1 - i : i;
      for (const dx of [0, -1]) {
        const x = col + dx;
        if (reserved[y * size + x]) continue;
        let v = 0;
        if (bit < totalBits) {
          const byte = payload[bit >> 3]!;
          v = (byte >> (7 - (bit & 7))) & 1;
          bit += 1;
        }
        if (maskBit(MASK, x, y)) v ^= 1;
        mod[y * size + x] = v;
      }
    }
    goingUp = !goingUp;
  }

  return { size, modules: mod };
}

export function qrSvg(text: string, opts?: { module?: number; pad?: number; fg?: string; bg?: string }): string {
  const { size, modules } = encodeQrMatrix(text);
  const module = opts?.module ?? 4;
  const pad = opts?.pad ?? 4;
  const fg = opts?.fg ?? "#1a1814";
  const bg = opts?.bg ?? "#f3efe6";
  const dim = (size + pad * 2) * module;
  let rects = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      rects += `<rect x="${(x + pad) * module}" y="${(y + pad) * module}" width="${module}" height="${module}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="${bg}"/><g fill="${fg}">${rects}</g></svg>`;
}
