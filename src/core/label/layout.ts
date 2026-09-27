/**
 * Text layout: finds the largest font size at which all lines fit the
 * printable height (or uses the size the document asks for, within limits)
 * and positions each line. Pure logic — text measurement is injected, so it
 * runs with a real canvas in the app and a fake in tests.
 *
 * Every position is a whole dot: the label is thresholded to 1 bit, and
 * fractional positions make identical glyphs rasterise differently.
 */

import { FONT_SIZE, LINE_GAP, type LabelCanvasSpec, type LabelDocument } from './types'

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
  /** Dots the text block spans vertically (all lines, line box to line box). */
  contentHeight: number
  /** CSS font shorthand used to draw the lines. */
  font: string
  fontSizePx: number
  /** Largest size at which the text fits the height; what "auto" gives. */
  maxFontSizePx: number
  /** Space between the line boxes actually used, in dots. */
  lineGap: number
  /**
   * The gap's range for this text: lines may overlap by up to half a line
   * box, and with a chosen font size they must still fit the height. 0..0
   * for a single line.
   */
  minLineGap: number
  maxLineGap: number
  lines: LaidOutLine[]
}

const REFERENCE_SIZE = 100
const FALLBACK_FAMILIES = 'sans-serif'

/**
 * Glyphs the vertical metrics are taken from: the tallest and deepest common
 * letters of Latin and Cyrillic. Measuring these instead of the text itself
 * gives every text the same line box at a given size, so "right" and "left"
 * get the same size, baseline and line pitch. Letters that reach beyond the
 * probe (accents, unusual symbols) still widen the box, so nothing is cut.
 * The font must be loaded for these glyphs too (see `renderDocument`).
 */
export const METRICS_PROBE = 'HbdfghjklpqyДЩбруф'

export function cssFont(family: string, sizePx: number, weight: FontWeight = 400): string {
  return `${weight} ${sizePx}px "${family.replace(/"/g, '\\"')}", ${FALLBACK_FAMILIES}`
}

export function splitLines(text: string): string[] {
  const lines = text.split(/\r?\n/)
  // Trailing empty lines are usually an in-progress edit; don't shrink for them.
  while (lines.length > 1 && lines[lines.length - 1]!.trim() === '') lines.pop()
  return lines
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
  const probe = measure(METRICS_PROBE, font)
  let ascent = probe.ascent
  let descent = probe.descent
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
function snapBlock(m: BlockMetrics, lineCount: number, gap: number) {
  const ascent = Math.ceil(m.ascent)
  const descent = Math.ceil(m.descent)
  const ink = ascent + descent
  const pitch = Math.max(1, ink + gap)
  return { ascent, ink, pitch, height: ink + (lineCount - 1) * pitch }
}

/** Largest gap at which `lineCount` lines of `ink` dots fit the height. */
const maxGapFor = (ink: number, lineCount: number, heightDots: number) =>
  Math.floor((heightDots - lineCount * ink) / (lineCount - 1))

/** Lines may overlap by up to half a line box. */
const minGapFor = (ink: number) => -Math.floor(ink / 2)

const emptyLayout = (spec: LabelCanvasSpec): TextLayout => ({
  width: 0,
  height: spec.heightDots,
  contentHeight: 0,
  font: '',
  fontSizePx: 0,
  maxFontSizePx: 0,
  lineGap: 0,
  minLineGap: 0,
  maxLineGap: 0,
  lines: [],
})

export function layoutText(
  doc: LabelDocument,
  spec: LabelCanvasSpec,
  measure: MeasureText,
): TextLayout {
  const lines = splitLines(doc.text)
  if (!lines.some((line) => line.trim())) return emptyLayout(spec)
  const count = lines.length
  const weight: FontWeight = doc.bold ? 700 : 400
  const font = (size: number) => cssFont(doc.fontFamily, size, weight)

  const ref = measureBlock(lines, font(REFERENCE_SIZE), measure)
  const refInk = ref.ascent + ref.descent
  if (refInk <= 0) return emptyLayout(spec)

  /** Largest size at which the lines fit the height with `gap` between them. */
  const fit = (gap: number) => {
    // Glyph metrics scale ~linearly with size: estimate, then step down until
    // the snapped block fits (rounding up ascent/descent can push it over)
    // and up while a larger size still fits (the estimate can fall short).
    const room = spec.heightDots - (count - 1) * gap
    let size = Math.max(1, Math.floor((REFERENCE_SIZE * room) / (count * refInk)))
    let block = measureBlock(lines, font(size), measure)
    let snapped = snapBlock(block, count, gap)
    while (size > 1 && snapped.height > spec.heightDots) {
      size--
      block = measureBlock(lines, font(size), measure)
      snapped = snapBlock(block, count, gap)
    }
    for (;;) {
      const larger = measureBlock(lines, font(size + 1), measure)
      const largerSnapped = snapBlock(larger, count, gap)
      if (largerSnapped.height > spec.heightDots) break
      size++
      block = larger
      snapped = largerSnapped
    }
    return { size, block, snapped }
  }

  const multiline = count > 1
  const wanted = Number.isFinite(doc.lineGap) ? Math.round(doc.lineGap) : LINE_GAP.default
  // The gap first, within what any size allows; the overlap limit needs the size.
  let gap = multiline ? Math.min(wanted, maxGapFor(1, count, spec.heightDots)) : 0
  let fitted = fit(gap)
  if (multiline && gap < minGapFor(fitted.snapped.ink)) {
    gap = minGapFor(fitted.snapped.ink)
    fitted = fit(gap)
  }
  const maxSize = fitted.size
  let { size, block, snapped } = fitted

  // A smaller size may be asked for; it can never exceed what fits.
  const chosen = doc.fontSizePx > 0
  if (chosen) {
    size = clampFontSize(doc.fontSizePx, maxSize)
    if (size !== maxSize) {
      block = measureBlock(lines, font(size), measure)
      snapped = snapBlock(block, count, gap)
    }
    if (multiline && gap < minGapFor(snapped.ink)) {
      gap = minGapFor(snapped.ink)
      snapped = snapBlock(block, count, gap)
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
    lineGap: gap,
    minLineGap: multiline ? Math.min(gap, minGapFor(snapped.ink)) : 0,
    // With a chosen size the gap stops where the lines would no longer fit;
    // with an automatic size the size follows, so only the tape bounds it.
    maxLineGap: multiline
      ? chosen
        ? Math.max(gap, maxGapFor(snapped.ink, count, spec.heightDots))
        : maxGapFor(1, count, spec.heightDots)
      : 0,
    lines: laidOut,
  }
}
