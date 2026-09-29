/**
 * Label layout: the blocks side by side along the tape, each centred across
 * it. Text blocks are laid out by {@link layoutText}; icons take the largest
 * of their size and the sizes that fit the tape; spaces are blank tape.
 * Pure logic: measurement is injected, and icon widths come from the icon
 * data alone.
 */

import { mmToDots } from '../printer/device'
import { findLabelIcon, iconWidth, type LabelIcon } from './icons'
import { layoutText, type MeasureText, type TextLayout } from './layout'
import { ICON_SIZES, type LabelCanvasSpec, type LabelDocument } from './types'

export interface PlacedText {
  kind: 'text'
  id: string
  /** Left edge in dots; the text layout's own positions start here. */
  x: number
  width: number
  layout: TextLayout
}

export interface PlacedIcon {
  kind: 'icon'
  id: string
  x: number
  /** Top edge in dots. */
  y: number
  width: number
  height: number
  icon: LabelIcon
}

export interface PlacedSpace {
  kind: 'space'
  id: string
  x: number
  width: number
}

export type PlacedBlock = PlacedText | PlacedIcon | PlacedSpace

export interface LabelLayout {
  width: number
  height: number
  /** Dots the tallest block spans across the tape. */
  contentHeight: number
  /** Every block, including those that draw nothing (empty text, unknown icon). */
  blocks: PlacedBlock[]
}

export interface ComposeSpec extends LabelCanvasSpec {
  /** Blank tape between two blocks that both draw something (not next to a space). */
  gapDots: number
}

/** Largest icon size not above `size` that fits `heightDots`. */
export function fittedIconSize(size: number, heightDots: number): number {
  return ICON_SIZES.find((s) => s <= size && s <= heightDots) ?? 16
}

export function layoutLabel(
  doc: LabelDocument,
  spec: ComposeSpec,
  measure: MeasureText,
): LabelLayout {
  const height = spec.heightDots
  const placed: PlacedBlock[] = []
  let x = spec.paddingDots
  let drawn = 0
  let previous: PlacedBlock | null = null
  let contentHeight = 0

  for (const block of doc.blocks) {
    let item: PlacedBlock
    if (block.kind === 'text') {
      const layout = layoutText(block, { heightDots: height, paddingDots: 0 }, measure)
      item = { kind: 'text', id: block.id, x: 0, width: layout.width, layout }
      contentHeight = Math.max(contentHeight, layout.contentHeight)
    } else if (block.kind === 'space') {
      item = { kind: 'space', id: block.id, x: 0, width: Math.max(0, mmToDots(block.lengthMm)) }
    } else {
      const icon = findLabelIcon(block.icon)
      const size = fittedIconSize(block.size, height)
      if (icon) {
        const y = Math.floor((height - size) / 2)
        item = {
          kind: 'icon',
          id: block.id,
          x: 0,
          y,
          width: iconWidth(icon, size),
          height: size,
          icon,
        }
        contentHeight = Math.max(contentHeight, size)
      } else {
        // An icon that no longer exists (a deleted pasted one) takes no room.
        item = { kind: 'space', id: block.id, x: 0, width: 0 }
      }
    }
    if (item.width > 0) {
      if (previous && previous.kind !== 'space' && item.kind !== 'space') x += spec.gapDots
      item.x = x
      x += item.width
      drawn++
      previous = item
    } else {
      item.x = x
    }
    placed.push(item)
  }

  return {
    width: drawn ? x + spec.paddingDots : 0,
    height,
    contentHeight,
    blocks: placed,
  }
}
