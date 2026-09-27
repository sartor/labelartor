import { expect, test } from 'bun:test'

import { isoLocalDateTime } from '../format'

test('isoLocalDateTime formats local time in ISO order with zero padding', () => {
  expect(isoLocalDateTime(new Date(2026, 8, 7, 9, 5))).toBe('2026-09-07 09:05')
  expect(isoLocalDateTime(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31 23:59')
})
