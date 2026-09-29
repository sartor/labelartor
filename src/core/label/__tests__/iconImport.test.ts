import { describe, expect, test } from 'bun:test'

import { IMPORT_MAX_WIDTH, iconFromPixels } from '../iconImport'
import type { IconBitmap } from '../iconScale'

/** An RGBA picture; `ink(x, y)` gives 0 (paper) to 1 (black) at a pixel centre. */
function picture(w: number, h: number, ink: (x: number, y: number) => number, alpha = false) {
  const px = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = ink(x + 0.5, y + 0.5)
      const i = (y * w + x) * 4
      if (alpha) px[i + 3] = Math.round(d * 255)
      else {
        const v = Math.round(255 * (1 - d))
        px.set([v, v, v, 255], i)
      }
    }
  return px
}

const mirrored = (b: IconBitmap) => {
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < b.width; x++)
      if (b.data[y * b.width + x] !== b.data[y * b.width + b.width - 1 - x]) return false
  return true
}

const inkedRows = (b: IconBitmap) =>
  Array.from({ length: 64 }, (_, y) => b.data.slice(y * b.width, (y + 1) * b.width)).filter((r) =>
    r.includes(1),
  ).length

describe('iconFromPixels', () => {
  test('blank pictures give nothing', () => {
    expect(
      iconFromPixels(
        picture(40, 40, () => 0),
        40,
        40,
      ),
    ).toBeNull()
  })

  test('trims to the ink and fills all 64 dots of height, keeping proportions', () => {
    // A 30 × 90 bar somewhere in a 200 × 200 picture.
    const bar = (x: number, y: number) => (x > 50 && x < 80 && y > 40 && y < 130 ? 1 : 0)
    const b = iconFromPixels(picture(200, 200, bar), 200, 200)!
    expect(b.height).toBe(64)
    expect(inkedRows(b)).toBe(64)
    expect(b.width).toBe(21)
  })

  test('wide pictures come out wider than tall, up to the limit', () => {
    const wide = (x: number, y: number) => (y > 20 && y < 60 ? 1 : 0)
    expect(iconFromPixels(picture(100, 80, wide), 100, 80)!.width).toBe(160)
    // A 380 × 20 bar: 64 dots tall would make it 1216 wide.
    const long = (x: number, y: number) => (x > 10 && x < 390 && y > 5 && y < 25 ? 1 : 0)
    const huge = iconFromPixels(picture(400, 30, long), 400, 30)!
    expect(huge.width).toBe(IMPORT_MAX_WIDTH)
    expect(inkedRows(huge)).toBeLessThan(64)
  })

  test('transparent pictures count their alpha as ink', () => {
    const disc = (x: number, y: number) => (Math.hypot(x - 50, y - 50) < 40 ? 1 : 0)
    const b = iconFromPixels(picture(100, 100, disc, true), 100, 100)!
    expect(inkedRows(b)).toBe(64)
  })

  test('light-on-dark pictures are inverted', () => {
    const hole = (x: number, y: number) => (Math.hypot(x - 50, y - 50) < 30 ? 0 : 1)
    const b = iconFromPixels(picture(100, 100, hole), 100, 100)!
    expect(b.data[32 * b.width + Math.floor(b.width / 2)]).toBe(1)
  })

  test('a symmetric shape off the pixel grid comes out exactly symmetric', () => {
    const ring = (x: number, y: number) => {
      const d = Math.hypot(x - 61.3, y - 58.7)
      return Math.max(0, Math.min(1, Math.min(d - 30, 40 - d) + 0.5))
    }
    expect(mirrored(iconFromPixels(picture(130, 130, ring), 130, 130)!)).toBe(true)
  })

  test('an asymmetric shape is left as it is', () => {
    const ell = (x: number, y: number) => (x < 120 && (x < 30 || y > 170) ? 1 : 0)
    expect(mirrored(iconFromPixels(picture(200, 200, ell), 200, 200)!)).toBe(false)
  })
})
