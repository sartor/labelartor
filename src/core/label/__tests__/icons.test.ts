import { describe, expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import {
  ICON_CATEGORIES,
  ICON_GRID,
  LABEL_ICONS,
  RECENT_ICON_LIMIT,
  findLabelIcon,
  iconBitmap,
  iconWidth,
  registerIconDots,
  rememberIconUse,
} from '../icons'
import { readPngDots } from './pngDots'

const ASSETS = join(import.meta.dir, '../../../assets/label-icons')

describe('label icons', () => {
  test('ids are unique and found by id', () => {
    const ids = LABEL_ICONS.map((icon) => icon.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(findLabelIcon(id)?.id).toBe(id)
  })

  test('every icon has a known category and a source', () => {
    const known = new Set<string>(ICON_CATEGORIES.map((c) => c.id))
    for (const icon of LABEL_ICONS) {
      expect(icon.categories.length).toBeGreaterThan(0)
      for (const c of icon.categories) expect(known.has(c)).toBe(true)
      expect(icon.source).toMatch(
        /^((tabler|mdi|iconmind|fluent|wikimedia):[a-z0-9-]+|screenshot)$/,
      )
    }
  })

  test('every icon has a 64-dot PNG as wide as its entry says', () => {
    for (const icon of LABEL_ICONS) {
      const dots = readPngDots(join(ASSETS, `${icon.id}.png`))
      expect([icon.id, dots.width, dots.height]).toEqual([icon.id, icon.width, ICON_GRID])
      expect(dots.data.some((d) => d === 1)).toBe(true)
    }
  })

  test('every icon PNG belongs to an icon', () => {
    for (const file of readdirSync(ASSETS))
      expect(findLabelIcon(file.replace(/\.png$/, ''))).toBeDefined()
  })

  test('icons shrink to every height, as wide as iconWidth says', () => {
    for (const icon of LABEL_ICONS) {
      registerIconDots(icon.id, readPngDots(join(ASSETS, `${icon.id}.png`)))
      for (const h of [12, 16, 24, 32, 48, 64]) {
        const bitmap = iconBitmap(icon, h)
        expect(bitmap.width).toBe(iconWidth(icon, h))
        expect(bitmap.height).toBe(h)
        expect(bitmap.data.some((d) => d === 1)).toBe(true)
      }
    }
  })

  test('an icon whose PNG is not loaded draws blank at the right size', () => {
    const icon = { ...LABEL_ICONS[0]!, id: 'not-loaded' }
    const bitmap = iconBitmap(icon, 32)
    expect(bitmap.width).toBe(iconWidth(icon, 32))
    expect(bitmap.data.every((d) => d === 0)).toBe(true)
  })
})

describe('recent icons', () => {
  test('a use is recorded without changing the input', () => {
    const before = { a: 1 }
    expect(rememberIconUse(before, 'b', 5)).toEqual({ a: 1, b: 5 })
    expect(rememberIconUse(before, 'a', 9)).toEqual({ a: 9 })
    expect(before).toEqual({ a: 1 })
  })

  test('only the most recent ones are kept', () => {
    let used: Record<string, number> = {}
    for (let i = 0; i < RECENT_ICON_LIMIT + 20; i++) used = rememberIconUse(used, `icon${i}`, i)
    expect(Object.keys(used)).toHaveLength(RECENT_ICON_LIMIT)
    expect(used.icon0).toBeUndefined()
    expect(used[`icon${RECENT_ICON_LIMIT + 19}`]).toBe(RECENT_ICON_LIMIT + 19)
    // Using one that was dropped brings it back and drops the oldest remaining one.
    const again = rememberIconUse(used, 'icon5', 1000)
    expect(again.icon5).toBe(1000)
    expect(again.icon20).toBeUndefined()
    expect(Object.keys(again)).toHaveLength(RECENT_ICON_LIMIT)
  })

  test('a smaller limit can be given', () => {
    expect(rememberIconUse({ a: 1, b: 2 }, 'c', 3, 2)).toEqual({ b: 2, c: 3 })
  })
})
