/**
 * Printer-ready 1-bit raster: one line per dot along the tape, each line
 * covering the full print head (MSB first, bit set = dot printed).
 */
export interface RasterImage {
  data: Uint8Array
  lines: number
  bytesPerLine: number
}

export function createRaster(lines: number, bytesPerLine: number): RasterImage {
  return { data: new Uint8Array(lines * bytesPerLine), lines, bytesPerLine }
}
