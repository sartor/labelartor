/**
 * How "pixel perfect" a rendering is, independent of the browser's text
 * anti-aliasing.
 *
 * The layout is rendered `scale` times larger, so every printer dot is a
 * scale×scale block whose mean darkness is the glyph outline's coverage of
 * that dot. A dot the outline covers (almost) fully or not at all prints the
 * same in every browser; a partly covered dot is decided by the threshold and
 * by each browser's anti-aliasing, so it counts against the score. Pixel fonts
 * drawn at a multiple of their grid have no partly covered dots and score 1;
 * outline fonts, and pixel fonts off their grid, score lower.
 */

import type { PixelImage } from './rasterize'

/** Supersampling factor the score is measured at. */
export const SHARPNESS_SCALE = 4

/** Coverage at or below this is a blank dot, at or above `CLEAN_INK` a solid one. */
const CLEAN_BLANK = 0.15
const CLEAN_INK = 0.85

export function measureSharpness(image: PixelImage, scale: number): number {
  const { data, width } = image
  const dotsX = Math.floor(width / scale)
  const dotsY = Math.floor(image.height / scale)
  const samples = scale * scale
  let touched = 0
  let ambiguous = 0

  for (let dy = 0; dy < dotsY; dy++) {
    for (let dx = 0; dx < dotsX; dx++) {
      let ink = 0
      for (let sy = 0; sy < scale; sy++) {
        let i = ((dy * scale + sy) * width + dx * scale) * 4
        for (let sx = 0; sx < scale; sx++, i += 4) {
          const alpha = data[i + 3]! / 255
          const luma = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
          ink += 1 - (luma * alpha + 255 * (1 - alpha)) / 255
        }
      }
      const coverage = ink / samples
      if (coverage <= CLEAN_BLANK) continue
      touched++
      if (coverage < CLEAN_INK) ambiguous++
    }
  }
  return touched ? 1 - ambiguous / touched : 0
}
