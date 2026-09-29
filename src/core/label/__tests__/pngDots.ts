/** Test helper: reads an icon PNG (8-bit, any colour type, not interlaced) as dots. */
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

import type { IconBitmap } from '../iconScale'

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

export function readPngDots(path: string): IconBitmap {
  const png = readFileSync(path)
  let o = 8
  let width = 0
  let height = 0
  let type = 0
  const idat: Buffer[] = []
  while (o < png.length) {
    const len = png.readUInt32BE(o)
    const kind = png.toString('latin1', o + 4, o + 8)
    const body = png.subarray(o + 8, o + 8 + len)
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      if (body[8] !== 8 || body[12] !== 0)
        throw new Error(`${path}: only 8-bit, non-interlaced PNGs`)
      type = body[9]!
    } else if (kind === 'IDAT') idat.push(body)
    o += 12 + len
  }
  const ch = CHANNELS[type]!
  const stride = width * ch
  const raw = inflateSync(Buffer.concat(idat))
  const rows = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i]!
      const a = i >= ch ? rows[y * stride + i - ch]! : 0
      const b = y > 0 ? rows[(y - 1) * stride + i]! : 0
      const c = y > 0 && i >= ch ? rows[(y - 1) * stride + i - ch]! : 0
      const p = a + b - c
      const pa = Math.abs(p - a)
      const pb = Math.abs(p - b)
      const pc = Math.abs(p - c)
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      const pred = [0, a, b, (a + b) >> 1, paeth][filter]!
      rows[y * stride + i] = (x + pred) & 0xff
    }
  }
  const data = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i++) {
    // Alpha where there is one, else dark grey/colour counts as a dot.
    const px = rows.subarray(i * ch, i * ch + ch)
    data[i] = ch === 2 || ch === 4 ? (px[ch - 1]! >= 128 ? 1 : 0) : px[0]! < 128 ? 1 : 0
  }
  return { width, height, data }
}
