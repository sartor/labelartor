import { describe, expect, test } from 'bun:test'

import { jobSetupSequence, rasterSequence, statusRequestSequence } from '../sequences'

const bytes = (...b: number[]) => Uint8Array.from(b)
const media = { type: 0x01, widthMm: 12, lengthMm: 0 }

describe('sequences', () => {
  test('status request initialises the printer first', () => {
    const [invalidate, reset, mode, status] = statusRequestSequence()
    expect(invalidate).toEqual(new Uint8Array(64))
    expect(reset).toEqual(bytes(0x1b, 0x40))
    expect(mode).toEqual(bytes(0x1b, 0x69, 0x61, 0x01))
    expect(status).toEqual(bytes(0x1b, 0x69, 0x53))
  })

  test('default job setup', () => {
    const packets = jobSetupSequence(100, media).slice(3)
    expect(packets).toEqual([
      bytes(0x1b, 0x69, 0x7a, 0xc4, 0x01, 0x0c, 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00),
      bytes(0x1b, 0x69, 0x4b, 0x08), // no chaining -> feed after print
      bytes(0x1b, 0x69, 0x4d, 0x00),
      bytes(0x1b, 0x69, 0x64, 0x00, 0x00),
      bytes(0x4d, 0x02),
    ])
  })

  test('job options map to flags', () => {
    const packets = jobSetupSequence(1, media, {
      chaining: true,
      autoCut: true,
      marginDots: 14,
      compress: false,
    }).slice(3)
    expect(packets[1]).toEqual(bytes(0x1b, 0x69, 0x4b, 0x00))
    expect(packets[2]).toEqual(bytes(0x1b, 0x69, 0x4d, 0x40))
    expect(packets[3]).toEqual(bytes(0x1b, 0x69, 0x64, 0x0e, 0x00))
    expect(packets[4]).toEqual(bytes(0x4d, 0x00))
  })

  test('raster lines: blank lines use Z', () => {
    const data = new Uint8Array(32)
    data[16] = 0x80
    const packets = [...rasterSequence(data, 16)]
    expect(packets).toHaveLength(2)
    expect(packets[0]).toEqual(bytes(0x5a))
    expect(packets[1]![0]).toBe(0x47)
  })
})
