/** Canvas rendering of a {@link LabelLayout}. Browser-only (needs a 2D canvas). */

import type { LabelLayout } from './compose'
import { forEachRun } from './iconScale'
import { iconBitmap } from './icons'
import type { MeasureText } from './layout'

type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function createCanvasMeasurer(ctx: Canvas2D): MeasureText {
  return (text, font) => {
    ctx.font = font
    const m = ctx.measureText(text)
    return {
      width: m.width,
      ascent: m.actualBoundingBoxAscent,
      descent: m.actualBoundingBoxDescent,
    }
  }
}

let sharedMeasure: MeasureText | null = null

/** Text measurer backed by one hidden canvas, created on first use. */
export function canvasMeasure(): MeasureText {
  if (!sharedMeasure) {
    const ctx = new OffscreenCanvas(1, 1).getContext('2d')
    if (!ctx) throw new Error('2D canvas is not available')
    sharedMeasure = createCanvasMeasurer(ctx)
  }
  return sharedMeasure
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Scripts whose glyphs change shape with their neighbours; they must be drawn as a whole. */
const SHAPED_SCRIPT = /[֐-ࣿऀ-෿ༀ-࿿က-႟ក-៿]/

/**
 * Draws text with every glyph starting on a whole pixel, so identical
 * characters produce identical bitmaps after thresholding. Kerning is kept by
 * positioning each glyph from the measured width of the text up to it.
 */
export function fillTextSnapped(ctx: Canvas2D, text: string, x: number, baseline: number) {
  if (SHAPED_SCRIPT.test(text)) {
    ctx.fillText(text, x, baseline)
    return
  }
  let prefix = ''
  for (const { segment } of graphemes.segment(text)) {
    prefix += segment
    const start = ctx.measureText(prefix).width - ctx.measureText(segment).width
    ctx.fillText(segment, x + Math.round(start), baseline)
  }
}

/**
 * Draws the label black on white; returns the pixels for rasterisation.
 * Icons are filled dot by dot from their bitmap, so they stay exact.
 * With `scale` > 1 the same layout is drawn that many times larger (glyph
 * positions stay on the 1× dot grid), which {@link measureSharpness} uses to
 * see how much of each dot the outlines really cover.
 */
export function renderLayout(layout: LabelLayout, scale = 1): ImageData | null {
  if (layout.width <= 0 || layout.height <= 0) return null
  const canvas = new OffscreenCanvas(layout.width * scale, layout.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas is not available')

  ctx.scale(scale, scale)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  for (const block of layout.blocks) {
    if (block.kind === 'text') {
      if (!block.layout.lines.length) continue
      ctx.font = block.layout.font
      for (const line of block.layout.lines) {
        fillTextSnapped(ctx, line.text, block.x + line.x, line.baseline)
      }
    } else if (block.kind === 'icon') {
      const { x: left, y: top } = block
      forEachRun(iconBitmap(block.icon, block.height), (x, y, length) =>
        ctx.fillRect(left + x, top + y, length, 1),
      )
    }
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
