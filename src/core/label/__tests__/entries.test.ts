import { describe, expect, test } from 'bun:test'

import { cloneDocument } from '../blocks'
import { createEntry, sameDocument, sameEntries } from '../entries'
import type { LabelDocument } from '../types'

const doc: LabelDocument = {
  blocks: [
    {
      kind: 'text',
      id: 't1',
      text: 'Hello',
      fontFamily: 'Roboto Variable',
      bold: true,
      fontSizePx: 0,
      align: 'center',
      lineGap: 0,
    },
    { kind: 'icon', id: 'i1', icon: 'warning', size: 48 },
    { kind: 'space', id: 's1', lengthMm: 12 },
  ],
}

/** `doc` with other text in its text block. */
const withText = (text: string): LabelDocument => ({
  ...doc,
  blocks: doc.blocks.map((b) => (b.kind === 'text' ? { ...b, text } : { ...b })),
})

describe('comparing labels', () => {
  test('field order does not matter, content does', () => {
    const reordered = {
      blocks: [
        {
          lineGap: 0,
          align: 'center',
          fontSizePx: 0,
          bold: true,
          fontFamily: 'Roboto Variable',
          text: 'Hello',
          id: 't1',
          kind: 'text',
        },
        { size: 48, icon: 'warning', id: 'i1', kind: 'icon' },
        { lengthMm: 12, id: 's1', kind: 'space' },
      ],
    } as LabelDocument
    expect(sameDocument(doc, reordered)).toBe(true)
    expect(sameDocument(doc, withText('Other'))).toBe(false)
    expect(sameDocument(doc, { ...doc, blocks: [...doc.blocks].reverse() })).toBe(false)
    expect(sameDocument(doc, { ...doc, blocks: doc.blocks.slice(0, 1) })).toBe(false)
    const longer = {
      blocks: doc.blocks.map((b) => (b.kind === 'space' ? { ...b, lengthMm: 13 } : b)),
    }
    expect(sameDocument(doc, longer)).toBe(false)
  })

  test('entries compare by id, time, content and order', () => {
    const a = createEntry(doc)
    const b = createEntry(withText('Other'))
    expect(sameEntries([a, b], [{ ...a, doc: cloneDocument(a.doc) }, b])).toBe(true)
    expect(sameEntries([a, b], [b, a])).toBe(false)
    expect(sameEntries([a], [a, b])).toBe(false)
  })

  test('a new entry holds its own copy of the blocks', () => {
    const entry = createEntry(doc)
    ;(entry.doc.blocks[0] as { text: string }).text = 'Changed'
    expect((doc.blocks[0] as { text: string }).text).toBe('Hello')
  })
})
