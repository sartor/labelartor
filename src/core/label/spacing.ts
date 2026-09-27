/**
 * Extra blank tape around the text, e.g. to wrap a label around a cable or a
 * thick object. The user picks a total strip length; the text is placed
 * within it and the rest of the strip stays blank.
 */

import type { TextLayout } from './layout'
import type { TextAlign } from './types'

export interface SpacingOptions {
  /** Wanted total strip length in dots; 0 (or less than the text) adds nothing. */
  totalDots: number
  /**
   * Blank tape the printer feeds before the label. It is part of the strip
   * the user holds but not of the raster, so it counts for centring only.
   */
  leadDots: number
  /** Where the text sits within the strip when there is room to spare. */
  align: TextAlign
}

export interface Spacing {
  before: number
  after: number
}

export function distributeSpace(contentDots: number, opts: SpacingOptions): Spacing {
  const labelDots = Math.max(contentDots, Math.round(opts.totalDots) - opts.leadDots)
  const extra = labelDots - contentDots
  let before: number
  switch (opts.align) {
    case 'left':
      before = 0
      break
    case 'right':
      before = extra
      break
    default:
      // Centred on the whole strip, lead included; never past the label edges.
      before = Math.min(extra, Math.max(0, Math.round((extra - opts.leadDots) / 2)))
  }
  return { before, after: extra - before }
}

/** Widens a layout with blank space; an empty layout stays empty. */
export function applySpacing(layout: TextLayout, spacing: Spacing): TextLayout {
  if (!layout.lines.length || (!spacing.before && !spacing.after)) return layout
  return {
    ...layout,
    width: layout.width + spacing.before + spacing.after,
    lines: layout.lines.map((line) => ({ ...line, x: line.x + spacing.before })),
  }
}
