import { describe, expect, test } from 'bun:test'

import { packbitsDecode, packbitsEncode } from '../packbits'

const hex = (s: string) => Uint8Array.from(s.split(/\s+/).filter(Boolean), (b) => parseInt(b, 16))

describe('packbits', () => {
  test('matches the reference example from the TIFF spec', () => {
    const input = hex('AA AA AA 80 00 2A AA AA AA AA 80 00 2A 22 AA AA AA AA AA AA AA AA AA AA')
    expect(packbitsEncode(input)).toEqual(hex('FE AA 02 80 00 2A FD AA 03 80 00 2A 22 F7 AA'))
  })

  test('empty and single byte input', () => {
    expect(packbitsEncode(new Uint8Array(0))).toEqual(new Uint8Array(0))
    expect(packbitsEncode(hex('42'))).toEqual(hex('00 42'))
  })

  test('splits runs longer than 128 bytes', () => {
    const input = new Uint8Array(300).fill(7)
    const encoded = packbitsEncode(input)
    expect(encoded).toEqual(hex('81 07 81 07 D5 07'))
    expect(packbitsDecode(encoded)).toEqual(input)
  })

  test('splits literals longer than 128 bytes', () => {
    const input = Uint8Array.from({ length: 200 }, (_, i) => i % 2)
    const encoded = packbitsEncode(input)
    expect(encoded[0]).toBe(127)
    expect(packbitsDecode(encoded)).toEqual(input)
  })

  test('round-trips random raster lines', () => {
    let seed = 1
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 16
    for (let n = 0; n < 500; n++) {
      // Sparse data with runs, like real label rasters.
      const line = Uint8Array.from({ length: 16 }, () => (rand() % 4 === 0 ? rand() & 0xff : 0))
      expect(packbitsDecode(packbitsEncode(line))).toEqual(line)
    }
  })
})
