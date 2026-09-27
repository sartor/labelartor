/**
 * Brother P-touch raster command set (PTCBP) — packet builders.
 *
 * Every function returns the exact bytes sent to the printer. Multi-byte
 * parameters are little-endian.
 */

import { ByteWriter } from './bytes'
import { packbitsEncode } from './packbits'

export const ESC = 0x1b

export const CommandSet = {
  escp: 0x00,
  raster: 0x01,
  ptouchTemplate: 0x03,
} as const
export type CommandSet = (typeof CommandSet)[keyof typeof CommandSet]

export const Compression = {
  none: 0x00,
  rle: 0x02,
} as const
export type Compression = (typeof Compression)[keyof typeof Compression]

/** Flags for {@link setPageMode} (ESC i M). */
export const PageModeFlag = {
  autoCut: 1 << 6,
  mirror: 1 << 7,
} as const

/** Flags for {@link setPageModeAdvanced} (ESC i K). */
export const AdvancedModeFlag = {
  halfCut: 1 << 2,
  noChaining: 1 << 3,
  noCutOnSpecialTape: 1 << 4,
  cutAtEnd: 1 << 5,
  highResolution: 1 << 6,
  preserveBuffer: 1 << 7,
} as const

/** "Valid field" flags for {@link setPrintParameters} (ESC i z). */
export const PrintParamField = {
  mediaType: 1 << 1,
  width: 1 << 2,
  length: 1 << 3,
  quality: 1 << 6,
  recovery: 1 << 7,
} as const

export interface PrintParameters {
  /** Bitmask of {@link PrintParamField} telling the printer which fields to honour. */
  validFields: number
  /** Media type code as reported by the status register. */
  mediaType: number
  widthMm: number
  lengthMm: number
  rasterLines: number
  /** 0 for the first page of a job, 1 for the following ones. */
  pageIndex?: number
}

const op = (...bytes: number[]) => new ByteWriter().u8(...bytes)

/** Clears the print buffer: a run of NUL bytes ("invalidate"). */
export const invalidate = (length = 64) => new Uint8Array(length)

/** ESC @ — initialise the printer. */
export const reset = () => op(ESC, 0x40).toBytes()

/** ESC i S — request the 32-byte status register. */
export const getStatus = () => op(ESC, 0x69, 0x53).toBytes()

/** ESC i a — switch command mode. */
export const useCommandSet = (set: CommandSet) => op(ESC, 0x69, 0x61, set).toBytes()

/** ESC i z — media and quality information for the next page. */
export function setPrintParameters(p: PrintParameters): Uint8Array {
  return op(ESC, 0x69, 0x7a)
    .u8(p.validFields, p.mediaType, p.widthMm, p.lengthMm)
    .u32le(p.rasterLines)
    .u8(p.pageIndex ?? 0, 0)
    .toBytes()
}

/** ESC i M — various mode settings ({@link PageModeFlag}). */
export const setPageMode = (flags: number) => op(ESC, 0x69, 0x4d, flags).toBytes()

/** ESC i K — advanced mode settings ({@link AdvancedModeFlag}). */
export const setPageModeAdvanced = (flags: number) => op(ESC, 0x69, 0x4b, flags).toBytes()

/** ESC i d — feed margin, in dots. */
export const setMargin = (dots: number) => op(ESC, 0x69, 0x64).u16le(dots).toBytes()

/** M — select raster compression mode. */
export const setCompression = (mode: Compression) => op(0x4d, mode).toBytes()

/** G — one raster line, optionally PackBits-compressed. */
export function rasterLine(line: Uint8Array, compress: boolean): Uint8Array {
  const payload = compress ? packbitsEncode(line) : line
  return op(0x47).u16le(payload.length).raw(payload).toBytes()
}

/** Z — a raster line with every dot off. */
export const zeroRasterLine = () => op(0x5a).toBytes()

/** FF — print the page without feeding (used between chained pages). */
export const printPage = () => op(0x0c).toBytes()

/** Control-Z — print the page and feed the tape. */
export const printAndFeed = () => op(0x1a).toBytes()
