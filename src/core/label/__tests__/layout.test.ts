import { describe, expect, test } from 'bun:test'

import {
  clampFontSize,
  cssFont,
  layoutText,
  minFontSize,
  splitLines,
  type MeasureText,
} from '../layout'
import { LINE_GAP, type LabelDocument } from '../types'

const fontSize = (font: string) => Number(/(\d+)px/.exec(font)![1])

/** Monospace fake: each glyph is 0.55em wide (0.65em bold), ink 0.7em up and 0.2em down. */
const measure: MeasureText = (text, font) => {
  const size = fontSize(font)
  const em = font.startsWith('700') ? 0.65 : 0.55
  return { width: text.length * size * em, ascent: size * 0.7, descent: size * 0.2 }
}

/**
 * Like `measure`, but the ink depends on the letters: descenders reach
 * 0.2em down, other letters 0.05em; a breve (Й) reaches 0.9em up.
 */
const measureByLetter: MeasureText = (text, font) => {
  const size = fontSize(font)
  return {
    width: text.length * size * 0.55,
    ascent: size * (text.includes('Й') ? 0.9 : 0.7),
    descent: size * (/[gjpqyру]/.test(text) ? 0.2 : 0.05),
  }
}

const spec = { heightDots: 64, paddingDots: 8 }
const doc = (text: string, extra: Partial<LabelDocument> = {}): LabelDocument => ({
  text,
  align: 'left',
  fontFamily: 'Test',
  bold: false,
  fontSizePx: 0,
  lineGap: LINE_GAP.default,
  lengthMm: 0,
  tapeAlign: 'left',
  ...extra,
})

const isInt = (n: number) => Number.isInteger(n)
/** Line box of the plain fake at `size`: ceil(0.7 size) + ceil(0.2 size). */
const ink = (size: number) => Math.ceil(size * 0.7) + Math.ceil(size * 0.2)
const pitch = (layout: { lines: { baseline: number }[] }) =>
  layout.lines[1]!.baseline - layout.lines[0]!.baseline

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
    expect([layout.lineGap, layout.minLineGap, layout.maxLineGap]).toEqual([0, 0, 0])
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

  test('the line box comes from the font, not from the letters in the text', () => {
    const flat = layoutText(doc('left\nleft', { fontSizePx: 24 }), spec, measureByLetter)
    const deep = layoutText(doc('right\nright', { fontSizePx: 24 }), spec, measureByLetter)
    expect(deep.fontSizePx).toBe(flat.fontSizePx)
    expect(deep.contentHeight).toBe(flat.contentHeight)
    expect(deep.lines.map((l) => l.baseline)).toEqual(flat.lines.map((l) => l.baseline))

    const autoFlat = layoutText(doc('left'), spec, measureByLetter)
    const autoDeep = layoutText(doc('right'), spec, measureByLetter)
    expect(autoDeep.fontSizePx).toBe(autoFlat.fontSizePx)
  })

  test('letters reaching beyond the usual line box still count, so nothing is cut', () => {
    const plain = layoutText(doc('И'), spec, measureByLetter)
    const breve = layoutText(doc('Й'), spec, measureByLetter)
    expect(breve.fontSizePx).toBeLessThan(plain.fontSizePx)
    expect(breve.lines[0]!.baseline - Math.ceil(breve.fontSizePx * 0.9)).toBeGreaterThanOrEqual(0)
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
    expect(a! - Math.ceil(layout.fontSizePx * 0.7)).toBeGreaterThanOrEqual(0)
    expect(c! + Math.ceil(layout.fontSizePx * 0.2)).toBeLessThanOrEqual(64)
  })

  test('the gap is the space between the line boxes, in dots', () => {
    const tight = layoutText(doc('AB\nCD', { fontSizePx: 20 }), spec, measure)
    const spaced = layoutText(doc('AB\nCD', { fontSizePx: 20, lineGap: 7 }), spec, measure)
    expect(pitch(tight)).toBe(ink(20))
    expect(pitch(spaced)).toBe(ink(20) + 7)
    expect(spaced.lineGap).toBe(7)
  })

  test('with an automatic size, a larger gap means a smaller font', () => {
    const tight = layoutText(doc('AB\nCD'), spec, measure)
    const loose = layoutText(doc('AB\nCD', { lineGap: 20 }), spec, measure)
    expect(loose.fontSizePx).toBeLessThan(tight.fontSizePx)
    expect(pitch(loose)).toBe(ink(loose.fontSizePx) + 20)
    // Only the tape bounds the gap: two lines of at least one dot each.
    expect(tight.maxLineGap).toBe(62)
    expect(layoutText(doc('AB\nCD', { lineGap: 500 }), spec, measure).lineGap).toBe(62)
  })

  test('with a chosen size, the gap is limited so the size is kept', () => {
    // 30px: line box 21 + 6 = 27 dots; two of them leave 10 dots between the lines.
    const layout = layoutText(doc('AB\nCD', { fontSizePx: 30 }), spec, measure)
    expect(layout.maxLineGap).toBe(10)
    const atMax = layoutText(doc('AB\nCD', { fontSizePx: 30, lineGap: 10 }), spec, measure)
    expect(atMax.fontSizePx).toBe(30)
    expect(atMax.contentHeight).toBe(64)
    // Beyond the limit (not reachable through the field) the size gives way.
    expect(
      layoutText(doc('AB\nCD', { fontSizePx: 30, lineGap: 11 }), spec, measure).fontSizePx,
    ).toBe(28)
  })

  test('a negative gap lets lines overlap, by up to half a line box', () => {
    const overlap = layoutText(doc('AB\nCD', { fontSizePx: 30, lineGap: -5 }), spec, measure)
    expect(pitch(overlap)).toBe(27 - 5)
    expect(overlap.minLineGap).toBe(-13)
    const clamped = layoutText(doc('AB\nCD', { fontSizePx: 30, lineGap: -100 }), spec, measure)
    expect(clamped.lineGap).toBe(-13)
    expect(pitch(clamped)).toBe(14)
    // Automatic size: the size follows the overlap, and the limit follows the size.
    const auto = layoutText(doc('AB\nCD', { lineGap: -100 }), spec, measure)
    expect(auto.lineGap).toBe(auto.minLineGap)
    expect(auto.contentHeight).toBeLessThanOrEqual(64)
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

  test('cssFont escapes quotes in family names', () => {
    expect(cssFont('My "Font"', 12, 700)).toBe('700 12px "My \\"Font\\"", sans-serif')
  })
})
