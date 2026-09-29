import { describe, expect, test } from 'bun:test'

import {
  cloneDocument,
  createDefaultDocument,
  createIconBlock,
  createSpaceBlock,
  createTextBlock,
  DEFAULT_TEXT_STYLE,
  describeDocument,
  insertBlock,
  isLabelDocument,
  moveBlock,
  nearestTextStyle,
  removeBlock,
} from '../blocks'
import type { LabelDocument } from '../types'

const bold = { ...DEFAULT_TEXT_STYLE, fontFamily: 'Bold One', bold: true }
const a = createTextBlock('A', bold)
const i = createIconBlock('bolt')
const b = createTextBlock('B')
const doc: LabelDocument = { blocks: [a, i, b] }
const ids = (d: LabelDocument) => d.blocks.map((block) => block.id)

describe('blocks', () => {
  test('a new label has one text block', () => {
    const fresh = createDefaultDocument()
    expect(fresh.blocks).toHaveLength(1)
    expect(fresh.blocks[0]).toMatchObject({ kind: 'text', text: 'Labelartor' })
  })

  test('insert before or after a block', () => {
    const n = createIconBlock('star')
    expect(ids(insertBlock(doc, n, i.id, 'before'))).toEqual([a.id, n.id, i.id, b.id])
    expect(ids(insertBlock(doc, n, i.id, 'after'))).toEqual([a.id, i.id, n.id, b.id])
    expect(ids(insertBlock(doc, n, 'missing', 'before'))).toEqual([a.id, i.id, b.id, n.id])
    expect(ids(doc)).toEqual([a.id, i.id, b.id])
  })

  test('remove keeps the last block; move reorders', () => {
    expect(ids(removeBlock(doc, i.id))).toEqual([a.id, b.id])
    const single = { ...doc, blocks: [a] }
    expect(removeBlock(single, a.id)).toBe(single)
    expect(ids(moveBlock(doc, a.id, 2))).toEqual([i.id, b.id, a.id])
  })

  test('a new text block takes the style of the nearest text block', () => {
    expect(nearestTextStyle(doc, i.id)).toMatchObject({ fontFamily: 'Bold One', bold: true })
    expect(nearestTextStyle(doc, b.id)).toMatchObject({ fontFamily: DEFAULT_TEXT_STYLE.fontFamily })
    const icons = { ...doc, blocks: [i] }
    expect(nearestTextStyle(icons, i.id)).toEqual({ ...DEFAULT_TEXT_STYLE })
  })

  test('clones share nothing', () => {
    const copy = cloneDocument(doc)
    ;(copy.blocks[0] as { text: string }).text = 'changed'
    expect(a.text).toBe('A')
  })

  test('recognises the block shape only', () => {
    expect(isLabelDocument(doc)).toBe(true)
    expect(isLabelDocument({ text: 'x', fontFamily: 'F' })).toBe(false)
    expect(isLabelDocument({ blocks: [] })).toBe(false)
    expect(isLabelDocument({ blocks: [{ kind: 'image' }] })).toBe(false)
    expect(isLabelDocument({ blocks: [createSpaceBlock(5)] })).toBe(true)
    expect(isLabelDocument(null)).toBe(false)
  })

  test('describes the blocks for tooltips', () => {
    const text = describeDocument(
      doc,
      (f) => f.toUpperCase(),
      (icon) => `[${icon}]`,
    )
    expect(text).toBe('BOLD ONE bold, 1 line · [bolt] · HANDJET VARIABLE, 1 line')
    const spaced = { blocks: [createSpaceBlock(12)] }
    expect(
      describeDocument(
        spaced,
        (f) => f,
        (x) => x,
      ),
    ).toBe('12 mm space')
  })
})
