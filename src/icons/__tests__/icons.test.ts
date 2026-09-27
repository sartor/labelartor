import { describe, expect, test } from 'bun:test'

import * as icons from '..'

const paths = Object.entries(icons).filter(
  (entry): entry is [string, string] => entry[0].startsWith('Icon') && typeof entry[1] === 'string',
)

describe('icons', () => {
  test('exports icon paths', () => {
    expect(paths.length).toBeGreaterThan(20)
  })

  test.each(paths)('%s uses whole-number coordinates inside the 16-unit grid', (_, d) => {
    const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    expect(numbers.length).toBeGreaterThan(0)
    for (const n of numbers) {
      expect(Number.isInteger(n)).toBe(true)
      expect(Math.abs(n)).toBeLessThanOrEqual(16)
    }
  })

  test.each(paths)('%s is made of closed subpaths', (_, d) => {
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('z')).toBe(true)
  })
})
