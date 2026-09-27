import { describe, expect, test } from 'bun:test'

import { statusBytes } from '../../__tests__/fixtures'
import {
  StatusParseError,
  describeStatus,
  errorMessages,
  hasError,
  isReady,
  parseStatus,
} from '../status'

describe('status', () => {
  test('parses a ready status', () => {
    const status = parseStatus(statusBytes({ mediaWidthMm: 12, mediaType: 0x01 }))
    expect(status.model).toBe(0x72)
    expect(status.mediaWidthMm).toBe(12)
    expect(status.mediaType).toBe(0x01)
    expect(isReady(status)).toBe(true)
    expect(hasError(status)).toBe(false)
  })

  test('error word is big-endian across bytes 8-9', () => {
    const status = parseStatus(statusBytes({ errors: 0x0110 }))
    expect(status.errors).toBe(0x0110)
    expect(errorMessages(status.errors)).toEqual(['Cover open', 'No media loaded'])
    expect(isReady(status)).toBe(false)
  })

  test('busy phase is not ready', () => {
    expect(isReady(parseStatus(statusBytes({ phaseType: 0x01 })))).toBe(false)
  })

  test('describes codes for display', () => {
    const d = describeStatus(
      parseStatus(statusBytes({ tapeTextColor: 0x08, tapeBackground: 0x06 })),
    )
    expect(d.model).toBe('PT-P300BT')
    expect(d.media).toBe('12 mm Laminated tape (TZe)')
    expect(d.tapeColors).toBe('Black on Yellow')
    expect(d.errors).toBe('None')
    expect(d.phase).toBe('Ready')
  })

  test('rejects bad length and header', () => {
    expect(() => parseStatus(new Uint8Array(31))).toThrow(StatusParseError)
    const bad = statusBytes()
    bad[2] = 0x00
    expect(() => parseStatus(bad)).toThrow(StatusParseError)
  })
})
