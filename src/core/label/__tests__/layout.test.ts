import { describe, expect, test } from 'bun:test'

import {
  clampFontSize,
  clampLineHeight,
  cssFont,
  layoutText,
  minFontSize,
  splitLines,
  type MeasureText,
} from '../layout'
import { LINE_HEIGHT, type LabelDocument } from '../types'

const fontSize = (font: string) => Number(/(\d+)px/.exec(font)![1])

/** Monospace fake: each glyph is 0.55em wide (0.65em bold), ink 0.7em up and 0.2em down. */
const measure: MeasureText = (text, font) => {
  const size = fontSize(font)
  const em = font.startsWith('700') ? 0.65 : 0.55
  return { width: text.length * size * em, ascent: size * 0.7, descent: size * 0.2 }
}

const spec = { heightDots: 64, paddingDots: 8 }
const doc = (text: string, extra: Partial<LabelDocument> = {}): LabelDocument => ({
  text,
  align: 'left',
  fontFamily: 'Test',
  bold: false,
  fontSizePx: 0,
  lineHeight: LINE_HEIGHT.default,
  lengthMm: 0,
  tapeAlign: 'left',
  ...extra,
})

const isInt = (n: number) => Number.isInteger(n)

describe('layoutText', () => {
  test('single line fills the printable height with snapped metrics', () => {
    const layout = layoutText(doc('ABCD'), spec, measure)
    // 71px would need ceil(49.7) + ceil(14.2) = 65 dots; 70px needs 49 + 14 = 63.
    expect(layout.fontSizePx).toBe(70)
    expect(layout.maxFontSizePx).toBe(70)
    expect(layout.contentHeight).toBe(63)
    expect(layout.lines[0]!.x).toBe(8)
    expect(layout.lines[0]!.baseline).toBe(49)
    expect(layout.width).toBe(Math.ceil(4 * 70 * 0.55) + 16)
  })

  test('a chosen font size is used, centred, and kept within limits', () => {
    const smaller = layoutText(doc('ABCD', { fontSizePx: 40 }), spec, measure)
    expect(smaller.fontSizePx).toBe(40)
    expect(smaller.maxFontSizePx).toBe(70)
    expect(smaller.contentHeight).toBe(28 + 8)
    // Block of 36 dots centred in 64: top at 14, baseline 14 + 28.
    expect(smaller.lines[0]!.baseline).toBe(42)
    expect(smaller.width).toBe(Math.ceil(4 * 40 * 0.55) + 16)

    expect(layoutText(doc('ABCD', { fontSizePx: 200 }), spec, measure).fontSizePx).toBe(70)
    expect(layoutText(doc('ABCD', { fontSizePx: 5 }), spec, measure).fontSizePx).toBe(21)
  })

  test('font size limits', () => {
    expect(minFontSize(70)).toBe(21)
    expect(clampFontSize(50, 70)).toBe(50)
    expect(clampFontSize(50.4, 70)).toBe(50)
    expect(clampFontSize(10, 70)).toBe(21)
    expect(clampFontSize(90, 70)).toBe(70)
    expect(clampFontSize(Number.NaN, 70)).toBe(70)
  })

  test('bold uses the 700 weight and measures with it', () => {
    const regular = layoutText(doc('ABCD'), spec, measure)
    const bold = layoutText(doc('ABCD', { bold: true }), spec, measure)
    expect(bold.font.startsWith('700 ')).toBe(true)
    expect(regular.font.startsWith('400 ')).toBe(true)
    expect(bold.width).toBeGreaterThan(regular.width)
  })

  test('every position is a whole dot', () => {
    for (const align of ['left', 'center', 'right'] as const) {
      const layout = layoutText(doc('ABCDE\nAB\nABC', { align }), spec, measure)
      for (const line of layout.lines) {
        expect(isInt(line.x)).toBe(true)
        expect(isInt(line.baseline)).toBe(true)
      }
    }
  })

  test('lines keep a constant pitch and stay inside the height', () => {
    const layout = layoutText(doc('AB\nCD\nEF'), spec, measure)
    const [a, b, c] = layout.lines.map((l) => l.baseline)
    expect(b! - a!).toBe(c! - b!)
    const ascent = Math.ceil(layout.fontSizePx * 0.7)
    const descent = Math.ceil(layout.fontSizePx * 0.2)
    expect(a! - ascent).toBeGreaterThanOrEqual(0)
    expect(c! + descent).toBeLessThanOrEqual(64)
  })

  test('larger line height means a smaller font and wider pitch', () => {
    const tight = layoutText(doc('AB\nCD', { lineHeight: 1 }), spec, measure)
    const loose = layoutText(doc('AB\nCD', { lineHeight: 2 }), spec, measure)
    expect(loose.fontSizePx).toBeLessThan(tight.fontSizePx)
    const pitch = (l: typeof tight) => l.lines[1]!.baseline - l.lines[0]!.baseline
    const ink = (l: typeof tight) => Math.ceil(l.fontSizePx * 0.7) + Math.ceil(l.fontSizePx * 0.2)
    expect(pitch(tight)).toBe(ink(tight))
    expect(pitch(loose)).toBe(2 * ink(loose))
  })

  test('alignment offsets shorter lines', () => {
    const center = layoutText(doc('ABCD\nAB', { align: 'center' }), spec, measure)
    const right = layoutText(doc('ABCD\nAB', { align: 'right' }), spec, measure)
    const [long, short] = center.lines
    expect(center.lines[1]!.x).toBe(8 + Math.floor((long!.width - short!.width) / 2))
    expect(right.lines[1]!.x).toBe(8 + long!.width - short!.width)
  })

  test('empty or blank text produces an empty layout', () => {
    expect(layoutText(doc(''), spec, measure).width).toBe(0)
    expect(layoutText(doc('   \n  '), spec, measure).lines).toHaveLength(0)
  })

  test('trailing empty lines are ignored', () => {
    expect(splitLines('a\nb\n\n')).toEqual(['a', 'b'])
    expect(splitLines('a\n\nb')).toEqual(['a', '', 'b'])
  })

  test('line height is clamped', () => {
    expect(clampLineHeight(0.1)).toBe(LINE_HEIGHT.min)
    expect(clampLineHeight(10)).toBe(LINE_HEIGHT.max)
    expect(clampLineHeight(Number.NaN)).toBe(LINE_HEIGHT.default)
  })

  test('cssFont escapes quotes in family names', () => {
    expect(cssFont('My "Font"', 12, 700)).toBe('700 12px "My \\"Font\\"", sans-serif')
  })
})
