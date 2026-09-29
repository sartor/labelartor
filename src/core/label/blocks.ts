/** Building and editing a label's blocks. Pure functions; a new document is returned each time. */

import { DEFAULT_FONT_FAMILY } from '../fonts'
import { moveById } from '../../utils/reorder'
import { newEntryId } from './ids'
import { splitLines } from './layout'
import {
  ICON_SIZES,
  LINE_GAP,
  SPACE_LENGTH,
  type IconBlock,
  type IconSize,
  type LabelBlock,
  type LabelDocument,
  type SpaceBlock,
  type TextBlock,
  type TextStyle,
} from './types'

/** What a fresh text block looks like. */
export const DEFAULT_TEXT_STYLE: Readonly<TextStyle> = {
  fontFamily: DEFAULT_FONT_FAMILY,
  bold: false,
  fontSizePx: 68,
  align: 'center',
  lineGap: LINE_GAP.default,
}

export function createTextBlock(text = '', style: TextStyle = DEFAULT_TEXT_STYLE): TextBlock {
  return { kind: 'text', id: newEntryId(), text, ...style }
}

export function createIconBlock(icon: string, size: IconSize = ICON_SIZES[0]): IconBlock {
  return { kind: 'icon', id: newEntryId(), icon, size }
}

export function createSpaceBlock(lengthMm: number = SPACE_LENGTH.default): SpaceBlock {
  return { kind: 'space', id: newEntryId(), lengthMm }
}

/** A label with one text block, as a new project starts. */
export function createDefaultDocument(): LabelDocument {
  return { blocks: [createTextBlock('Labelartor')] }
}

/** A copy that shares nothing with `doc`, so editing one never changes the other. */
export function cloneDocument(doc: LabelDocument): LabelDocument {
  return { ...doc, blocks: doc.blocks.map((block) => ({ ...block })) }
}

function styleOf(block: TextBlock): TextStyle {
  const { fontFamily, bold, fontSizePx, align, lineGap } = block
  return { fontFamily, bold, fontSizePx, align, lineGap }
}

/** The style a new text block next to `blockId` starts with: the nearest text block's. */
export function nearestTextStyle(doc: LabelDocument, blockId: string): TextStyle {
  const index = doc.blocks.findIndex((block) => block.id === blockId)
  const byDistance = doc.blocks
    .map((block, i) => ({ block, distance: Math.abs(i - index) }))
    .filter((item): item is { block: TextBlock; distance: number } => item.block.kind === 'text')
    .sort((a, b) => a.distance - b.distance)
  return byDistance[0] ? styleOf(byDistance[0].block) : { ...DEFAULT_TEXT_STYLE }
}

/** Inserts `block` right before or after the block `blockId` (at the end if it is missing). */
export function insertBlock(
  doc: LabelDocument,
  block: LabelBlock,
  blockId: string,
  side: 'before' | 'after',
): LabelDocument {
  const index = doc.blocks.findIndex((b) => b.id === blockId)
  const at = index === -1 ? doc.blocks.length : index + (side === 'after' ? 1 : 0)
  const blocks = [...doc.blocks]
  blocks.splice(at, 0, block)
  return { ...doc, blocks }
}

/** Removes a block; the last one stays, since a label always has a block. */
export function removeBlock(doc: LabelDocument, blockId: string): LabelDocument {
  if (doc.blocks.length <= 1) return doc
  return { ...doc, blocks: doc.blocks.filter((block) => block.id !== blockId) }
}

/** Moves a block to `toIndex` of the reordered list. */
export function moveBlock(doc: LabelDocument, blockId: string, toIndex: number): LabelDocument {
  return { ...doc, blocks: moveById(doc.blocks, blockId, toIndex) }
}

/** Whether a stored value has the block shape (anything older is dropped). */
export function isLabelDocument(value: unknown): value is LabelDocument {
  if (typeof value !== 'object' || value === null) return false
  const blocks = (value as { blocks?: unknown }).blocks
  return (
    Array.isArray(blocks) &&
    blocks.length > 0 &&
    blocks.every(
      (block: unknown) =>
        typeof block === 'object' &&
        block !== null &&
        ['text', 'icon', 'space'].includes((block as LabelBlock).kind),
    )
  )
}

/** Short description for tooltips, e.g. "Handjet bold, 2 lines · Warning". */
export function describeDocument(
  doc: LabelDocument,
  fontLabel: (family: string) => string,
  iconLabel: (icon: string) => string,
): string {
  return doc.blocks
    .map((block) => {
      if (block.kind === 'icon') return iconLabel(block.icon)
      if (block.kind === 'space') return `${block.lengthMm} mm space`
      const lines = splitLines(block.text).length
      const font = `${fontLabel(block.fontFamily)}${block.bold ? ' bold' : ''}`
      return `${font}, ${lines} ${lines === 1 ? 'line' : 'lines'}`
    })
    .join(' · ')
}
