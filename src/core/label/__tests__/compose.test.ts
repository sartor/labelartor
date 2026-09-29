import { describe, expect, test } from 'bun:test'

import { createIconBlock, createSpaceBlock, createTextBlock, DEFAULT_TEXT_STYLE } from '../blocks'
import { fittedIconSize, layoutLabel } from '../compose'
import { findLabelIcon, iconWidth } from '../icons'
import { layoutText, type MeasureText } from '../layout'
import type { LabelDocument } from '../types'

const fontSize = (font: string) => Number(/(\d+)px/.exec(font)![1])
/** Monospace fake: glyphs 0.55em wide, ink 0.7em up and 0.2em down. */
const measure: MeasureText = (text, font) => {
  const size = fontSize(font)
  return { width: text.length * size * 0.55, ascent: size * 0.7, descent: size * 0.2 }
}

const spec = { heightDots: 64, paddingDots: 8, gapDots: 7 }
const label = (...blocks: LabelDocument['blocks']): LabelDocument => ({
  blocks,
})
const text = (value: string) =>
  createTextBlock(value, { ...DEFAULT_TEXT_STYLE, fontFamily: 'Test', fontSizePx: 0 })

describe('layoutLabel', () => {
  test('one text block is the text layout plus padding', () => {
    const block = text('ABCD')
    const layout = layoutLabel(label(block), spec, measure)
    const alone = layoutText(block, { heightDots: 64, paddingDots: 0 }, measure)
    expect(layout.width).toBe(alone.width + 16)
    expect(layout.blocks[0]!.x).toBe(8)
    expect(layout.contentHeight).toBe(alone.contentHeight)
  })

  test('blocks sit side by side with a gap, icons centred across the tape', () => {
    const t = text('AB')
    const icon = createIconBlock('high-voltage', 32)
    const layout = layoutLabel(label(t, icon), spec, measure)
    const [placedText, placedIcon] = layout.blocks
    const iconDots = iconWidth(findLabelIcon('high-voltage')!, 32)
    expect(placedIcon!.x).toBe(placedText!.x + placedText!.width + 7)
    expect(placedIcon).toMatchObject({ kind: 'icon', y: 16, height: 32, width: iconDots })
    expect(layout.width).toBe(placedIcon!.x + iconDots + 8)
  })

  test('empty text and unknown icons take no room and no gap', () => {
    const icon = createIconBlock('high-voltage', 64)
    const alone = layoutLabel(label(icon), spec, measure)
    const withEmpty = layoutLabel(label(text(''), icon, createIconBlock('nope', 64)), spec, measure)
    expect(withEmpty.width).toBe(alone.width)
    expect(layoutLabel(label(text('')), spec, measure).width).toBe(0)
  })

  test('a space is blank tape of its length, with no gap beside it', () => {
    const t = text('AB')
    const withSpace = layoutLabel(label(t, createSpaceBlock(10), text('CD')), spec, measure)
    const [first, space, second] = withSpace.blocks
    // 10 mm = 71 dots at 180 dpi.
    expect(space).toMatchObject({ kind: 'space', width: 71, x: first!.x + first!.width })
    expect(second!.x).toBe(space!.x + 71)
    // A space at the start sits right after the padding.
    const leading = layoutLabel(label(createSpaceBlock(5), t), spec, measure)
    expect(leading.blocks[0]!.x).toBe(8)
    expect(leading.blocks[1]!.x).toBe(8 + 35)
  })

  test('an icon too tall for the tape shrinks to the largest size that fits', () => {
    const layout = layoutLabel(
      label(createIconBlock('high-voltage', 64)),
      { ...spec, heightDots: 48 },
      measure,
    )
    expect(layout.blocks[0]).toMatchObject({ height: 48, y: 0 })
    expect(fittedIconSize(64, 32)).toBe(32)
    expect(fittedIconSize(24, 64)).toBe(24)
    expect(fittedIconSize(48, 40)).toBe(32)
  })
})
