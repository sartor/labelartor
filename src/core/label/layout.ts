/**
 * Text layout: finds the largest font size at which all lines fit the
 * printable height (or uses the size the document asks for, within limits)
 * and positions each line. Pure logic — text measurement is injected, so it
 * runs with a real canvas in the app and a fake in tests.
 *
 * Every position is a whole dot: the label is thresholded to 1 bit, and
 * fractional positions make identical glyphs rasterise differently.
 */

import { FONT_SIZE, LINE_HEIGHT, type LabelCanvasSpec, type LabelDocument } from './types'

export interface TextMetricsLite {
  width: number
  /** Ink extent above the baseline. */
  ascent: number
  /** Ink extent below the baseline. */
  descent: number
}

export type MeasureText = (text: string, font: string) => TextMetricsLite

export type FontWeight = 400 | 700

export interface LaidOutLine {
  text: string
  /** Left edge of the line, whole dots. */
  x: number
  /** Baseline, whole dots. */
  baseline: number
  width: number
}

export interface TextLayout {
  width: number
  height: number
  /** Dots the text block spans vertically (all lines, ink to ink). */
  contentHeight: number
  /** CSS font shorthand used to draw the lines. */
  font: string
  fontSizePx: number
  /** Largest size at which the text fits the height; what "auto" gives. */
  maxFontSizePx: number
  lines: LaidOutLine[]
}

const REFERENCE_SIZE = 100
const FALLBACK_FAMILIES = 'sans-serif'

export function cssFont(family: string, sizePx: number, weight: FontWeight = 400): string {
  return `${weight} ${sizePx}px "${family.replace(/"/g, '\\"')}", ${FALLBACK_FAMILIES}`
}

export function splitLines(text: string): string[] {
  const lines = text.split(/\r?\n/)
  // Trailing empty lines are usually an in-progress edit; don't shrink for them.
  while (lines.length > 1 && lines[lines.length - 1]!.trim() === '') lines.pop()
  return lines
}

export function clampLineHeight(value: number): number {
  if (!Number.isFinite(value)) return LINE_HEIGHT.default
  return Math.min(LINE_HEIGHT.max, Math.max(LINE_HEIGHT.min, value))
}

/** Smallest size a document may ask for, given the largest that fits. */
export function minFontSize(maxSizePx: number): number {
  return Math.max(1, Math.ceil(maxSizePx * FONT_SIZE.minRatio))
}

export function clampFontSize(sizePx: number, maxSizePx: number): number {
  if (!Number.isFinite(sizePx)) return maxSizePx
  return Math.min(maxSizePx, Math.max(minFontSize(maxSizePx), Math.round(sizePx)))
}

interface BlockMetrics {
  ascent: number
  descent: number
  widths: number[]
}

function measureBlock(lines: string[], font: string, measure: MeasureText): BlockMetrics {
  let ascent = 0
  let descent = 0
  const widths = lines.map((line) => {
    if (!line.trim()) return 0
    const m = measure(line, font)
    ascent = Math.max(ascent, m.ascent)
    descent = Math.max(descent, m.descent)
    return Math.ceil(m.width)
  })
  return { ascent, descent, widths }
}

/** Vertical metrics snapped to whole dots. */
function snapBlock(m: BlockMetrics, lineCount: number, lineHeight: number) {
  const ascent = Math.ceil(m.ascent)
  const descent = Math.ceil(m.descent)
  const ink = ascent + descent
  const pitch = Math.max(1, Math.round(ink * lineHeight))
  return { ascent, ink, pitch, height: ink + (lineCount - 1) * pitch }
}

const emptyLayout = (spec: LabelCanvasSpec): TextLayout => ({
  width: 0,
  height: spec.heightDots,
  contentHeight: 0,
  font: '',
  fontSizePx: 0,
  maxFontSizePx: 0,
  lines: [],
})

export function layoutText(
  doc: LabelDocument,
  spec: LabelCanvasSpec,
  measure: MeasureText,
): TextLayout {
  const lines = splitLines(doc.text)
  const lineHeight = clampLineHeight(doc.lineHeight)
  const weight: FontWeight = doc.bold ? 700 : 400
  const font = (size: number) => cssFont(doc.fontFamily, size, weight)

  const ref = measureBlock(lines, font(REFERENCE_SIZE), measure)
  const refInk = ref.ascent + ref.descent
  if (refInk <= 0) return emptyLayout(spec)

  // Glyph metrics scale ~linearly with size: estimate, then step down until the
  // snapped block fits (rounding up ascent/descent can push it over).
  const refHeight = refInk * (1 + (lines.length - 1) * lineHeight)
  let size = Math.max(1, Math.floor((REFERENCE_SIZE * spec.heightDots) / refHeight))
  let block = measureBlock(lines, font(size), measure)
  let snapped = snapBlock(block, lines.length, lineHeight)
  while (size > 1 && snapped.height > spec.heightDots) {
    size--
    block = measureBlock(lines, font(size), measure)
    snapped = snapBlock(block, lines.length, lineHeight)
  }
  const maxSize = size

  // A smaller size may be asked for; it can never exceed what fits.
  if (doc.fontSizePx > 0) {
    size = clampFontSize(doc.fontSizePx, maxSize)
    if (size !== maxSize) {
      block = measureBlock(lines, font(size), measure)
      snapped = snapBlock(block, lines.length, lineHeight)
    }
  }

  const top = Math.floor((spec.heightDots - snapped.height) / 2)
  const contentWidth = Math.max(...block.widths)

  const laidOut = lines.map((text, i): LaidOutLine => {
    const width = block.widths[i]!
    const free = contentWidth - width
    const offset = doc.align === 'center' ? Math.floor(free / 2) : doc.align === 'right' ? free : 0
    return {
      text,
      width,
      x: spec.paddingDots + offset,
      baseline: top + snapped.ascent + i * snapped.pitch,
    }
  })

  return {
    width: contentWidth + 2 * spec.paddingDots,
    height: spec.heightDots,
    contentHeight: snapped.height,
    font: font(size),
    fontSizePx: size,
    maxFontSizePx: maxSize,
    lines: laidOut,
  }
}
