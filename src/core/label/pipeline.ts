/**
 * Document → printer raster. One pipeline for the editor preview, the queue
 * and the history, so every label is rendered the same way it prints.
 */

import { ensureFontLoaded, fontHasBold, isFontLoaded } from '../fonts'
import { PT_P300BT, dotsToMm, mmToDots, type RasterImage, type TapeSpec } from '../printer'
import { layoutText, type MeasureText, type TextLayout } from './layout'
import { rasterize } from './rasterize'
import { canvasMeasure, renderLayout } from './render'
import { SHARPNESS_SCALE, measureSharpness } from './sharpness'
import { applySpacing, distributeSpace } from './spacing'
import type { LabelDocument } from './types'

/** Blank tape before and after the text. */
const PADDING_DOTS = mmToDots(1)
/** The sharpness score looks at this much of the text at most (the start is representative). */
const SHARPNESS_MAX_DOTS = 512

export interface RenderOptions {
  tape: TapeSpec
  /** The wanted total length includes the lead the printer feeds before the label. */
  countLead: boolean
  /** Text measurer; the shared canvas one unless a test injects a fake. */
  measure?: MeasureText
  /** Also compute the pixel-perfect score (costs a 4× render). */
  withSharpness?: boolean
}

export interface RenderedLabel {
  layout: TextLayout
  raster: RasterImage | null
  /** Label length the text alone needs, before any extra tape. */
  naturalLengthMm: number
  /** Length of the raster that will be printed. */
  lengthMm: number
  /** 0..1, see {@link measureSharpness}; 0 when not requested. */
  sharpness: number
}

/** Fonts without a bold face render regular; the browser would fake a bold otherwise. */
function effectiveDocument(doc: LabelDocument): LabelDocument {
  return doc.bold && !fontHasBold(doc.fontFamily) ? { ...doc, bold: false } : doc
}

function documentFontWeight(doc: LabelDocument): 400 | 700 {
  return effectiveDocument(doc).bold ? 700 : 400
}

export function isDocumentFontLoaded(doc: LabelDocument): boolean {
  return isFontLoaded(doc.fontFamily, doc.text, documentFontWeight(doc))
}

export async function renderDocument(
  source: LabelDocument,
  { tape, countLead, measure = canvasMeasure(), withSharpness = false }: RenderOptions,
): Promise<RenderedLabel> {
  const doc = effectiveDocument(source)
  await ensureFontLoaded(doc.fontFamily, doc.text, documentFontWeight(doc))

  const text = layoutText(
    doc,
    { heightDots: tape.printableDots, paddingDots: PADDING_DOTS },
    measure,
  )
  const spacing = distributeSpace(text.width, {
    totalDots: mmToDots(doc.lengthMm),
    leadDots: countLead ? mmToDots(PT_P300BT.unusedLeadMm) : 0,
    align: doc.tapeAlign,
  })
  const layout = applySpacing(text, spacing)
  const pixels = renderLayout(layout)
  const raster = pixels ? rasterize(pixels, { headDots: PT_P300BT.headDots }) : null

  return {
    layout,
    raster,
    naturalLengthMm: dotsToMm(text.width),
    lengthMm: raster ? dotsToMm(raster.lines) : 0,
    sharpness: withSharpness ? scoreSharpness(text) : 0,
  }
}

function scoreSharpness(text: TextLayout): number {
  if (!text.lines.length) return 0
  const sample = { ...text, width: Math.min(text.width, SHARPNESS_MAX_DOTS) }
  const hires = renderLayout(sample, SHARPNESS_SCALE)
  return hires ? measureSharpness(hires, SHARPNESS_SCALE) : 0
}
