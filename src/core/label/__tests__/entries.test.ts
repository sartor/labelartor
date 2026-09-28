import { describe, expect, test } from 'bun:test'

import { createEntry, sameDocument, sameEntries } from '../entries'
import type { LabelDocument } from '../types'

const doc: LabelDocument = {
  text: 'Hello',
  fontFamily: 'F',
  bold: false,
  fontSizePx: 0,
  align: 'center',
  lineGap: 0,
  lengthMm: 0,
  tapeAlign: 'left',
}

describe('comparing labels', () => {
  test('field order does not matter, content does', () => {
    const reordered = {
      tapeAlign: 'left',
      lengthMm: 0,
      lineGap: 0,
      align: 'center',
      fontSizePx: 0,
      bold: false,
      fontFamily: 'F',
      text: 'Hello',
    } as LabelDocument
    expect(sameDocument(doc, reordered)).toBe(true)
    expect(sameDocument(doc, { ...doc, lineGap: 1 })).toBe(false)
  })

  test('entries compare by id, time, content and order', () => {
    const a = createEntry(doc)
    const b = createEntry({ ...doc, text: 'Other' })
    expect(sameEntries([a, b], [{ ...a, doc: { ...a.doc } }, b])).toBe(true)
    expect(sameEntries([a, b], [b, a])).toBe(false)
    expect(sameEntries([a], [a, b])).toBe(false)
    expect(sameEntries([a], [{ ...a, doc: { ...a.doc, bold: true } }])).toBe(false)
  })
})
