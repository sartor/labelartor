import { describe, expect, test } from 'bun:test'

import { dropIndex, moveItem } from '../reorder'

const ids = ['a', 'b', 'c', 'd']

describe('moveItem', () => {
  test('moves forward and back without changing the input', () => {
    expect(moveItem(ids, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(ids, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(ids).toEqual(['a', 'b', 'c', 'd'])
  })

  test('clamps the target and ignores a missing source', () => {
    expect(moveItem(ids, 1, 99)).toEqual(['a', 'c', 'd', 'b'])
    expect(moveItem(ids, 1, -5)).toEqual(['b', 'a', 'c', 'd'])
    expect(moveItem(ids, 9, 0)).toEqual(ids)
  })
})

describe('dropIndex', () => {
  test('before or after the target, counted without the dragged item', () => {
    expect(dropIndex(ids, 'a', 'c', false)).toBe(1)
    expect(dropIndex(ids, 'a', 'c', true)).toBe(2)
    expect(dropIndex(ids, 'd', 'a', false)).toBe(0)
    expect(dropIndex(ids, 'd', 'b', true)).toBe(2)
  })

  test('is stable once moved: the same half gives the same index', () => {
    const index = dropIndex(ids, 'a', 'c', true)
    const moved = moveItem(ids, 0, index)
    expect(moved).toEqual(['b', 'c', 'a', 'd'])
    expect(dropIndex(moved, 'a', 'c', true)).toBe(moved.indexOf('a'))
  })

  test('an unknown target leaves the item where it is', () => {
    expect(dropIndex(ids, 'b', 'zz', true)).toBe(1)
  })
})
