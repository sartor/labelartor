import { describe, expect, test } from 'bun:test'

import type { PixelImage } from '../rasterize'
import { measureSharpness } from '../sharpness'

const SCALE = 4

/** Builds a `scale`× image from per-dot 4×4 sample blocks (luma values). */
function image(dots: number[][][]): PixelImage {
  const width = dots.length * SCALE
  const data = new Uint8ClampedArray(width * SCALE * 4).fill(255)
  dots.forEach((block, dx) =>
    block.forEach((row, sy) =>
      row.forEach((luma, sx) => {
        const i = (sy * width + dx * SCALE + sx) * 4
        data.set([luma, luma, luma, 255], i)
      }),
    ),
  )
  return { width, height: SCALE, data }
}

const rows = (fill: (sx: number, sy: number) => number) =>
  Array.from({ length: SCALE }, (_, sy) => Array.from({ length: SCALE }, (_, sx) => fill(sx, sy)))

const solid = rows(() => 0)
const blank = rows(() => 255)
const halfCovered = rows((sx) => (sx < 2 ? 0 : 255))
/** A solid dot whose outer column got the browser's soft edge. */
const solidWithRamp = rows((sx) => (sx === 3 ? 30 : 0))
/** A blank dot next to an edge, touched only by the ramp's halo. */
const blankWithHalo = rows((sx) => (sx === 0 ? 230 : 255))

describe('measureSharpness', () => {
  test('fully covered dots score 1, blank images 0', () => {
    expect(measureSharpness(image([solid, solid, blank]), SCALE)).toBe(1)
    expect(measureSharpness(image([blank, blank]), SCALE)).toBe(0)
  })

  test('partly covered dots count against the score', () => {
    expect(measureSharpness(image([solid, halfCovered]), SCALE)).toBe(0.5)
    expect(measureSharpness(image([halfCovered]), SCALE)).toBe(0)
  })

  test("a browser's soft edge on an aligned outline does not count as blur", () => {
    expect(measureSharpness(image([blankWithHalo, solidWithRamp, solid]), SCALE)).toBe(1)
  })

  test('transparent samples are blank', () => {
    const img = image([solid])
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 0
    expect(measureSharpness(img, SCALE)).toBe(0)
  })
})
