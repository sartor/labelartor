import { describe, expect, test } from 'bun:test'

import type { TextLayout } from '../layout'
import { applySpacing, distributeSpace } from '../spacing'

describe('distributeSpace', () => {
  test('adds nothing when the text already fills the wanted length', () => {
    expect(distributeSpace(50, { totalDots: 0, leadDots: 0, align: 'center' })).toEqual({
      before: 0,
      after: 0,
    })
    expect(distributeSpace(50, { totalDots: 40, leadDots: 0, align: 'left' })).toEqual({
      before: 0,
      after: 0,
    })
  })

  test('places the text at the start, centre or end of the strip', () => {
    const opts = { totalDots: 100, leadDots: 0 }
    expect(distributeSpace(20, { ...opts, align: 'left' })).toEqual({ before: 0, after: 80 })
    expect(distributeSpace(20, { ...opts, align: 'center' })).toEqual({ before: 40, after: 40 })
    expect(distributeSpace(20, { ...opts, align: 'right' })).toEqual({ before: 80, after: 0 })
  })

  test('the lead is part of the strip length', () => {
    // 100-dot strip = 30 lead + 70 label; text 20 -> 50 extra.
    const opts = { totalDots: 100, leadDots: 30 }
    expect(distributeSpace(20, { ...opts, align: 'left' })).toEqual({ before: 0, after: 50 })
    expect(distributeSpace(20, { ...opts, align: 'right' })).toEqual({ before: 50, after: 0 })
    // Centred on the whole strip: lead + before + half the text = half the strip.
    const centred = distributeSpace(20, { ...opts, align: 'center' })
    expect(centred).toEqual({ before: 10, after: 40 })
    expect(30 + centred.before + 10).toBe(50)
  })

  test('centring never pushes the text into the lead', () => {
    // 60-dot strip = 30 lead + 30 label; text 20 -> only 10 extra.
    expect(distributeSpace(20, { totalDots: 60, leadDots: 30, align: 'center' })).toEqual({
      before: 0,
      after: 10,
    })
  })
})

describe('applySpacing', () => {
  const layout: TextLayout = {
    width: 40,
    height: 64,
    contentHeight: 30,
    font: '10px x',
    fontSizePx: 10,
    maxFontSizePx: 10,
    lines: [{ text: 'a', x: 7, baseline: 30, width: 26 }],
  }

  test('widens the layout and shifts the lines', () => {
    const padded = applySpacing(layout, { before: 15, after: 5 })
    expect(padded.width).toBe(60)
    expect(padded.lines[0]!.x).toBe(22)
    expect(layout.lines[0]!.x).toBe(7)
  })

  test('leaves empty layouts and zero spacing alone', () => {
    expect(applySpacing(layout, { before: 0, after: 0 })).toBe(layout)
    const empty = { ...layout, width: 0, lines: [] }
    expect(applySpacing(empty, { before: 50, after: 50 })).toBe(empty)
  })
})
