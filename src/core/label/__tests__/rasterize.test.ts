import { describe, expect, test } from 'bun:test'

import { rasterToPixels, rasterize, type PixelImage } from '../rasterize'

function image(width: number, height: number, ink: Array<[number, number]>): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (const [x, y] of ink) data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3)
  return { width, height, data }
}

const colors = {
  ink: [0, 0, 0] as [number, number, number],
  tape: [255, 255, 255] as [number, number, number],
}

describe('rasterize', () => {
  test('one raster line per label column, centred on the head', () => {
    // 64-dot label on a 128-dot head -> offset 32.
    const raster = rasterize(
      image(2, 64, [
        [0, 0],
        [1, 63],
      ]),
      { headDots: 128 },
    )
    expect(raster.lines).toBe(2)
    expect(raster.bytesPerLine).toBe(16)
    // Column 0, row 0 -> dot 32 -> byte 4, MSB.
    expect(raster.data[4]).toBe(0x80)
    // Column 1, row 63 -> dot 95 -> byte 11, LSB.
    expect(raster.data[16 + 11]).toBe(0x01)
    expect(raster.data.reduce((n, b) => n + (b ? 1 : 0), 0)).toBe(2)
  })

  test('threshold and transparency', () => {
    const img = image(3, 8, [])
    img.data.set([100, 100, 100, 255], 0) // dark grey -> ink
    img.data.set([200, 200, 200, 255], 4) // light grey -> blank
    img.data.set([0, 0, 0, 0], 8) // transparent black -> blank
    const raster = rasterize(img, { headDots: 128 })
    // 8-dot label -> offset 60; row 0 -> dot 60 -> byte 7, mask 0x80 >> 4.
    expect(raster.data[7]).toBe(0x08)
    expect(raster.data[16 + 7]).toBe(0)
    expect(raster.data[32 + 7]).toBe(0)
  })

  test('rejects labels taller than the head', () => {
    expect(() => rasterize(image(1, 129, []), { headDots: 128 })).toThrow(RangeError)
  })

  test('rasterToPixels is the inverse of rasterize', () => {
    const ink: Array<[number, number]> = [
      [0, 0],
      [3, 5],
      [7, 18],
      [2, 10],
    ]
    const src = image(8, 19, ink)
    const back = rasterToPixels(rasterize(src, { headDots: 128 }), 19, colors)
    expect(back.width).toBe(8)
    expect(back.height).toBe(19)
    expect(back.data).toEqual(src.data)
  })
})
