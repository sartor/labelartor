import { describe, expect, test } from 'bun:test'

import { createEntry } from '../entries'
import { findLabelIcon, iconBitmap, setUserIcons } from '../icons'
import {
  isUserIcon,
  newUserIconId,
  packDots,
  unpackDots,
  userIconsUsedBy,
  type UserIcon,
} from '../userIcons'

const dots = (width: number) =>
  Uint8Array.from({ length: width * 64 }, (_, i) => ((i * 7) % 3 === 0 ? 1 : 0))

describe('user icons', () => {
  test('dots pack and unpack exactly', () => {
    for (const width of [1, 7, 8, 13, 64]) {
      const b = { width, height: 64, data: dots(width) }
      expect(unpackDots({ width, dots: packDots(b) })).toEqual(b)
    }
  })

  test('ids are prefixed and unique', () => {
    const a = newUserIconId()
    expect(a.startsWith('user-')).toBe(true)
    expect(newUserIconId()).not.toBe(a)
  })

  test('validation', () => {
    const good: UserIcon = {
      id: 'user-1',
      name: 'One',
      width: 3,
      dots: packDots({ width: 3, height: 64, data: dots(3) }),
    }
    expect(isUserIcon(good)).toBe(true)
    expect(isUserIcon({ ...good, width: 4 })).toBe(false)
    expect(isUserIcon({ ...good, id: 'bolt' })).toBe(false)
    expect(isUserIcon({ ...good, name: '' })).toBe(false)
    expect(isUserIcon(null)).toBe(false)
  })

  test('used icons are found in labels', () => {
    const label = createEntry({
      blocks: [
        { kind: 'icon', id: 'a', icon: 'user-1', size: 32 },
        { kind: 'icon', id: 'b', icon: 'warning', size: 32 },
      ],
    })
    expect([...userIconsUsedBy([label])]).toEqual(['user-1'])
  })

  test('registered icons are found and drawn; replacing the set forgets old ones', () => {
    const icon: UserIcon = {
      id: 'user-test',
      name: 'Test',
      width: 8,
      dots: packDots({ width: 8, height: 64, data: new Uint8Array(8 * 64).fill(1) }),
    }
    setUserIcons([icon])
    expect(findLabelIcon('user-test')).toMatchObject({ name: 'Test', categories: ['user'] })
    const b = iconBitmap(findLabelIcon('user-test')!, 32)
    expect(b.width).toBe(4)
    expect(b.data.every((d) => d === 1)).toBe(true)
    setUserIcons([])
    expect(findLabelIcon('user-test')).toBeUndefined()
  })
})
