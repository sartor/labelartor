import { describe, expect, test } from 'bun:test'

import {
  CommandSet,
  Compression,
  PrintParamField,
  getStatus,
  printAndFeed,
  printPage,
  rasterLine,
  reset,
  setCompression,
  setMargin,
  setPageMode,
  setPageModeAdvanced,
  setPrintParameters,
  useCommandSet,
  zeroRasterLine,
} from '../commands'

const bytes = (...b: number[]) => Uint8Array.from(b)

describe('commands', () => {
  test('simple control commands', () => {
    expect(reset()).toEqual(bytes(0x1b, 0x40))
    expect(getStatus()).toEqual(bytes(0x1b, 0x69, 0x53))
    expect(useCommandSet(CommandSet.raster)).toEqual(bytes(0x1b, 0x69, 0x61, 0x01))
    expect(setPageMode(0x40)).toEqual(bytes(0x1b, 0x69, 0x4d, 0x40))
    expect(setPageModeAdvanced(0x08)).toEqual(bytes(0x1b, 0x69, 0x4b, 0x08))
    expect(setCompression(Compression.rle)).toEqual(bytes(0x4d, 0x02))
    expect(zeroRasterLine()).toEqual(bytes(0x5a))
    expect(printPage()).toEqual(bytes(0x0c))
    expect(printAndFeed()).toEqual(bytes(0x1a))
  })

  test('margin is little-endian u16', () => {
    expect(setMargin(0x0102)).toEqual(bytes(0x1b, 0x69, 0x64, 0x02, 0x01))
  })

  test('print parameters layout', () => {
    const packet = setPrintParameters({
      validFields: PrintParamField.width | PrintParamField.quality | PrintParamField.recovery,
      mediaType: 0x01,
      widthMm: 12,
      lengthMm: 0,
      rasterLines: 0x0001012c,
    })
    expect(packet).toEqual(
      bytes(0x1b, 0x69, 0x7a, 0xc4, 0x01, 0x0c, 0x00, 0x2c, 0x01, 0x01, 0x00, 0x00, 0x00),
    )
  })

  test('uncompressed raster line', () => {
    const line = Uint8Array.from({ length: 16 }, (_, i) => i)
    expect(rasterLine(line, false)).toEqual(bytes(0x47, 0x10, 0x00, ...line))
  })

  test('compressed raster line', () => {
    const line = new Uint8Array(16).fill(0xff)
    expect(rasterLine(line, true)).toEqual(bytes(0x47, 0x02, 0x00, 0xf1, 0xff))
  })
})
