/**
 * Higher-level command sequences built from the individual packets:
 * printer initialisation, job setup and raster transfer.
 */

import { isAllZero } from './bytes'
import {
  AdvancedModeFlag,
  CommandSet,
  Compression,
  PageModeFlag,
  PrintParamField,
  getStatus,
  invalidate,
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
} from './commands'

export interface Media {
  type: number
  widthMm: number
  lengthMm: number
}

export interface JobOptions {
  /** RLE-compress raster lines (default: true). */
  compress?: boolean
  /** Chain labels: skip the feed after printing (default: false). */
  chaining?: boolean
  /** Auto cut; the PT-P300BT prints a cut mark instead (default: false). */
  autoCut?: boolean
  /** Feed margin in dots (default: 0). */
  marginDots?: number
}

/** Clear the buffer, reset, and switch to raster mode. */
export function initializeSequence(): Uint8Array[] {
  return [invalidate(), reset(), useCommandSet(CommandSet.raster)]
}

export function statusRequestSequence(): Uint8Array[] {
  return [...initializeSequence(), getStatus()]
}

export function jobSetupSequence(rasterLines: number, media: Media, opts: JobOptions = {}) {
  const { compress = true, chaining = false, autoCut = false, marginDots = 0 } = opts

  let mode = 0
  if (autoCut) mode |= PageModeFlag.autoCut

  let advanced = 0
  if (!chaining) advanced |= AdvancedModeFlag.noChaining

  return [
    ...initializeSequence(),
    setPrintParameters({
      validFields: PrintParamField.width | PrintParamField.quality | PrintParamField.recovery,
      mediaType: media.type,
      widthMm: media.widthMm,
      lengthMm: media.lengthMm,
      rasterLines,
    }),
    setPageModeAdvanced(advanced),
    setPageMode(mode),
    setMargin(marginDots),
    setCompression(compress ? Compression.rle : Compression.none),
  ]
}

/** One packet per raster line; all-blank lines use the short Z command. */
export function* rasterSequence(
  data: Uint8Array,
  bytesPerLine: number,
  compress = true,
): Generator<Uint8Array> {
  for (let offset = 0; offset < data.length; offset += bytesPerLine) {
    const line = data.subarray(offset, offset + bytesPerLine)
    yield line.length === bytesPerLine && isAllZero(line)
      ? zeroRasterLine()
      : rasterLine(line, compress)
  }
}

/**
 * Ends a page. The last page of a job uses Control-Z; earlier pages of a
 * multi-page job use FF. Whether the tape feeds is decided by `chaining`.
 */
export function printCommand(lastPage = true): Uint8Array {
  return lastPage ? printAndFeed() : printPage()
}
