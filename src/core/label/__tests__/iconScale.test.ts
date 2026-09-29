import { describe, expect, test } from 'bun:test'

import { type IconBitmap, scaleIcon, scaledWidth } from '../iconScale'

/** Bitmap from rows of '#' and '.'. */
const bitmap = (rows: string[]): IconBitmap => ({
  width: rows[0]!.length,
  height: rows.length,
  data: Uint8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0)),
})
const rows = (b: IconBitmap) =>
  Array.from({ length: b.height }, (_, y) =>
    Array.from(b.data.slice(y * b.width, (y + 1) * b.width), (d) => (d ? '#' : '.')).join(''),
  )

/** A 64 × w bitmap with a filled box. */
function box(w: number, x0: number, y0: number, x1: number, y1: number): IconBitmap {
  const data = new Uint8Array(w * 64)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[y * w + x] = 1
  return { width: w, height: 64, data }
}

describe('scaleIcon', () => {
  test('the same height is the same bitmap', () => {
    const b = box(40, 4, 4, 36, 60)
    expect(scaleIcon(b, 64)).toBe(b)
  })

  test('width scales with the height', () => {
    expect(scaledWidth(40, 32)).toBe(20)
    expect(scaledWidth(61, 24)).toBe(23)
    expect(scaledWidth(3, 12)).toBe(1)
    expect(scaleIcon(box(40, 4, 4, 36, 60), 32).width).toBe(20)
  })

  test('a line on even dots halves exactly', () => {
    // 6 dots wide from x = 28, full height.
    const b = scaleIcon(box(64, 28, 0, 34, 64), 32)
    for (const r of rows(b)) expect(r).toBe('.'.repeat(14) + '###' + '.'.repeat(15))
  })

  test('dots print when at least half covered', () => {
    // Left block fully covers two dots; the right one covers half of a dot.
    const b = scaleIcon(bitmap(['####.#..', '####.#..', '####.#..', '####.#..']), 2)
    expect(rows(b)).toEqual(['###.', '###.'])
  })

  test('lone specks beside the drawing are cleaned away', () => {
    // A speck at the top left, a solid bar along the bottom.
    const b = scaleIcon(
      bitmap([
        '##..........',
        '##..........',
        '............',
        '............',
        '############',
        '############',
      ]),
      3,
    )
    expect(rows(b)).toEqual(['......', '......', '######'])
  })

  test('symmetric icons stay symmetric at every height', () => {
    // A ring: symmetric left–right and top–bottom.
    const w = 62
    const data = new Uint8Array(w * 64)
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - 32)
        if (d >= 22 && d <= 28) data[y * w + x] = 1
      }
    for (const h of [48, 32, 24, 17, 16, 12]) {
      const r = rows(scaleIcon({ width: w, height: 64, data }, h))
      for (const line of r) expect(line).toBe([...line].reverse().join(''))
      expect(r).toEqual([...r].reverse())
    }
  })
})

describe('scaleIcon diagonals', () => {
  test('an icon symmetric across a diagonal stays so at every height', () => {
    // A thick diagonal bar from top-left to bottom-right, with a head.
    const n = 64
    const data = new Uint8Array(n * n)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const along = Math.abs(x - y) <= 4 && x > 6 && y > 6 && x < 58 && y < 58
        const head = x + y > 90 && x > 40 && y > 40
        if (along || head) data[y * n + x] = 1
      }
    for (const h of [48, 32, 24, 17]) {
      const b = scaleIcon({ width: n, height: n, data }, h)
      expect(b.width).toBe(h)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < h; x++) expect(b.data[y * h + x]).toBe(b.data[x * h + y]!)
    }
  })
})

describe('scaleIcon thin lines', () => {
  test('a thin ring does not vanish when shrunk a lot', () => {
    // A 2-dot ring at 64: at 12 dots every dot is well under half covered.
    const data = new Uint8Array(64 * 64)
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32)
        if (d >= 28 && d <= 30) data[y * 64 + x] = 1
      }
    const b = scaleIcon({ width: 64, height: 64, data }, 12)
    expect(b.data.some((d) => d === 1)).toBe(true)
    // Still a ring: the middle stays empty.
    expect(b.data[6 * 12 + 6]).toBe(0)
  })
})
