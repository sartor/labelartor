/**
 * Document → printer raster. One pipeline for the editor preview, the
 * project and the history, so every label is rendered the same way it prints.
 */

import { ensureFontLoaded, fontHasBold, isFontLoaded } from '../fonts'
import { PT_P300BT, dotsToMm, mmToDots, type RasterImage, type TapeSpec } from '../printer'
import { layoutLabel, type LabelLayout } from './compose'
import { METRICS_PROBE, type MeasureText } from './layout'
import { rasterize } from './rasterize'
import { canvasMeasure, renderLayout } from './render'
import { SHARPNESS_SCALE, measureSharpness } from './sharpness'
import type { LabelDocument, TextBlock } from './types'

/** Blank tape before and after the content. */
const PADDING_DOTS = mmToDots(1)
/** Blank tape between two blocks. */
const BLOCK_GAP_DOTS = mmToDots(1)
/** The sharpness score looks at this much of the label at most (the start is representative). */
const SHARPNESS_MAX_DOTS = 512

export interface RenderOptions {
  tape: TapeSpec
  /** Text measurer; the shared canvas one unless a test injects a fake. */
  measure?: MeasureText
  /** Also compute the pixel-perfect score (costs a 4× render). */
  withSharpness?: boolean
}

export interface RenderedLabel {
  layout: LabelLayout
  raster: RasterImage | null
  /** Length of the raster that will be printed. */
  lengthMm: number
  /** 0..1, see {@link measureSharpness}; 0 when not requested. */
  sharpness: number
}

/** Fonts without a bold face render regular; the browser would fake a bold otherwise. */
function effectiveDocument(doc: LabelDocument): LabelDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((block) =>
      block.kind === 'text' && block.bold && !fontHasBold(block.fontFamily)
        ? { ...block, bold: false }
        : block,
    ),
  }
}

const textBlocks = (doc: LabelDocument) =>
  doc.blocks.filter((block): block is TextBlock => block.kind === 'text')

const weightOf = (block: TextBlock): 400 | 700 => (block.bold ? 700 : 400)

/** The glyphs a text block needs: its text and the probe its line box is measured on. */
const glyphsOf = (block: TextBlock) => block.text + METRICS_PROBE

/** Family of the first text block whose glyphs are not loaded yet, or null. */
export function unloadedFont(source: LabelDocument): string | null {
  const block = textBlocks(effectiveDocument(source)).find(
    (b) => !isFontLoaded(b.fontFamily, glyphsOf(b), weightOf(b)),
  )
  return block?.fontFamily ?? null
}

export async function renderDocument(
  source: LabelDocument,
  { tape, measure = canvasMeasure(), withSharpness = false }: RenderOptions,
): Promise<RenderedLabel> {
  const doc = effectiveDocument(source)
  await Promise.all(
    textBlocks(doc).map((b) => ensureFontLoaded(b.fontFamily, glyphsOf(b), weightOf(b))),
  )

  const layout = layoutLabel(
    doc,
    { heightDots: tape.printableDots, paddingDots: PADDING_DOTS, gapDots: BLOCK_GAP_DOTS },
    measure,
  )
  const pixels = renderLayout(layout)
  const raster = pixels ? rasterize(pixels, { headDots: PT_P300BT.headDots }) : null

  return {
    layout,
    raster,
    lengthMm: raster ? dotsToMm(raster.lines) : 0,
    sharpness: withSharpness ? scoreSharpness(layout) : 0,
  }
}

function scoreSharpness(content: LabelLayout): number {
  if (!content.width) return 0
  const sample = { ...content, width: Math.min(content.width, SHARPNESS_MAX_DOTS) }
  const hires = renderLayout(sample, SHARPNESS_SCALE)
  return hires ? measureSharpness(hires, SHARPNESS_SCALE) : 0
}
