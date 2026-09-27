/**
 * Conversion between label pixels and the printer raster.
 *
 * The label is drawn left-to-right along the tape; the printer consumes one
 * raster line per label column. Label row `y` maps to print-head dot
 * `offset + y`, where the label is centred on the head.
 */

import { createRaster, type RasterImage } from '../printer/raster'

/** Minimal ImageData shape so tests can run without a DOM. */
export interface PixelImage {
  width: number
  height: number
  data: Uint8ClampedArray<ArrayBuffer>
}

export interface RasterizeOptions {
  headDots: number
  /** Pixels darker than this luminance (0-255) are printed. */
  threshold?: number
}

export const DEFAULT_THRESHOLD = 180

export function headOffset(labelHeight: number, headDots: number): number {
  return Math.floor((headDots - labelHeight) / 2)
}

function isInk(data: Uint8ClampedArray, i: number, threshold: number): boolean {
  const alpha = data[i + 3]! / 255
  // Composite over white so transparent pixels count as blank tape.
  const luma = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
  return luma * alpha + 255 * (1 - alpha) < threshold
}

export function rasterize(image: PixelImage, options: RasterizeOptions): RasterImage {
  const { headDots, threshold = DEFAULT_THRESHOLD } = options
  if (image.height > headDots) {
    throw new RangeError(`Label height ${image.height} exceeds print head (${headDots} dots)`)
  }
  const bytesPerLine = headDots / 8
  const raster = createRaster(image.width, bytesPerLine)
  const offset = headOffset(image.height, headDots)

  for (let x = 0; x < image.width; x++) {
    const line = x * bytesPerLine
    for (let y = 0; y < image.height; y++) {
      if (!isInk(image.data, (y * image.width + x) * 4, threshold)) continue
      const dot = offset + y
      raster.data[line + (dot >> 3)]! |= 0x80 >> (dot & 7)
    }
  }
  return raster
}

/**
 * Inverse of {@link rasterize}: rebuilds label pixels from the raster, so the
 * preview shows exactly what will be printed.
 */
export function rasterToPixels(
  raster: RasterImage,
  labelHeight: number,
  colors: { ink: [number, number, number]; tape: [number, number, number] },
): PixelImage {
  const width = raster.lines
  const data = new Uint8ClampedArray(width * labelHeight * 4)
  const offset = headOffset(labelHeight, raster.bytesPerLine * 8)

  for (let x = 0; x < width; x++) {
    const line = x * raster.bytesPerLine
    for (let y = 0; y < labelHeight; y++) {
      const dot = offset + y
      const on = (raster.data[line + (dot >> 3)]! & (0x80 >> (dot & 7))) !== 0
      const [r, g, b] = on ? colors.ink : colors.tape
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return { width, height: labelHeight, data }
}
