/**
 * 1-bit icon bitmaps: shrinking a 64-dot icon to a smaller height, and the
 * steps it shares with turning a picture into dots (see iconImport.ts).
 * Each dot prints when the ink under it covers at least half of it; then
 * lone dots and one-dot notches are cleaned up, and an icon that is
 * symmetric stays exactly symmetric.
 */

/** 1-bit image, row by row; 1 = dot printed. */
export interface IconBitmap {
  width: number
  height: number
  data: Uint8Array
}

/** Width in dots of a `width`-dot-wide 64-dot icon drawn `height` dots tall. */
export function scaledWidth(width: number, height: number, from = 64): number {
  return Math.max(1, Math.round((width * height) / from))
}

/**
 * x: left–right, y: top–bottom, d: across the main diagonal, a: across the
 * other one (d and a need a square), turn: a half turn.
 */
export type Axis = 'x' | 'y' | 'd' | 'a' | 'turn'

export function scaleIcon(src: IconBitmap, height: number): IconBitmap {
  if (height === src.height) return src
  const w = scaledWidth(src.width, height, src.height)
  // Stretch x by w / width (not height / 64), so the centre stays the centre.
  const cov = coverage(src.data, src.width, src.height, {
    x: 0,
    y: 0,
    dotWidth: src.width / w,
    dotHeight: src.height / height,
    columns: w,
    rows: height,
  })
  // Square icons can also mirror across a diagonal (diagonal arrows); the
  // shrunk icon is square too, since both sides scale alike.
  const square = src.width === src.height && w === height
  const axes = (['x', 'y', 'd', 'a'] as const).filter(
    (axis) => (square || axis === 'x' || axis === 'y') && symmetric(src, axis),
  )
  return { width: w, height, data: dotsFromCoverage(cov, w, height, axes) }
}

/** Where a grid of dots samples a picture: its corner and the size of each dot, in pixels. */
export interface Sampling {
  x: number
  y: number
  dotWidth: number
  dotHeight: number
  columns: number
  rows: number
}

/**
 * How much of each dot of the grid the ink covers (0..1): the area-weighted
 * mean of `ink` (0..1 per pixel, `w` × `h`) under it. Outside the picture
 * counts as blank.
 */
export function coverage(
  ink: ArrayLike<number>,
  w: number,
  h: number,
  { x: left, y: top, dotWidth, dotHeight, columns, rows }: Sampling,
): Float32Array {
  const cov = new Float32Array(columns * rows)
  const area = dotWidth * dotHeight
  for (let row = 0; row < rows; row++) {
    const y0 = top + row * dotHeight
    const y1 = y0 + dotHeight
    for (let col = 0; col < columns; col++) {
      const x0 = left + col * dotWidth
      const x1 = x0 + dotWidth
      let sum = 0
      for (let py = Math.max(0, Math.floor(y0)); py < Math.min(h, Math.ceil(y1)); py++) {
        const fy = Math.min(y1, py + 1) - Math.max(y0, py)
        for (let px = Math.max(0, Math.floor(x0)); px < Math.min(w, Math.ceil(x1)); px++) {
          const value = ink[py * w + px]!
          if (value) sum += value * fy * (Math.min(x1, px + 1) - Math.max(x0, px))
        }
      }
      cov[row * columns + col] = sum / area
    }
  }
  return cov
}

/**
 * Dots from coverage: made symmetric across `axes` (coverage averaged with
 * the mirror image first, one half copied onto the other last), printed from
 * half coverage up, and cleaned. Thin lines can cover less than half of
 * every dot when shrunk a lot; rather than print nothing, the dots covered at
 * least half as much as the most covered one are kept then.
 */
export function dotsFromCoverage(
  cov: Float32Array,
  w: number,
  h: number,
  axes: readonly Axis[],
): Uint8Array {
  for (const axis of axes) averageMirror(cov, w, h, axis)
  const data = new Uint8Array(w * h)
  for (let i = 0; i < data.length; i++) data[i] = cov[i]! >= 0.5 ? 1 : 0
  cleanDots(data, cov, w, h)
  if (!data.includes(1)) {
    const most = cov.reduce((a, c) => Math.max(a, c), 0)
    for (let i = 0; i < data.length; i++) data[i] = most > 0 && cov[i]! >= most / 2 ? 1 : 0
  }
  for (const axis of axes) copyMirror(data, w, h, axis)
  return data
}

/** Calls `run` for each horizontal run of printed dots. */
export function forEachRun(
  bitmap: IconBitmap,
  run: (x: number, y: number, length: number) => void,
) {
  const { width, height, data } = bitmap
  for (let y = 0; y < height; y++) {
    let x = 0
    while (x < width) {
      if (!data[y * width + x]) {
        x++
        continue
      }
      const start = x
      while (x < width && data[y * width + x]) x++
      run(start, y, x - start)
    }
  }
}

/** Index of the dot mirroring dot (x, y) across `axis` in a w × h bitmap. */
function mirrorOf(x: number, y: number, w: number, h: number, axis: Axis): number {
  switch (axis) {
    case 'x':
      return y * w + (w - 1 - x)
    case 'y':
      return (h - 1 - y) * w + x
    case 'd':
      return x * w + y
    case 'a':
      return (w - 1 - x) * w + (w - 1 - y)
    case 'turn':
      return (h - 1 - y) * w + (w - 1 - x)
  }
}

function symmetric(b: IconBitmap, axis: Axis): boolean {
  for (let y = 0; y < b.height; y++)
    for (let x = 0; x < b.width; x++) {
      if (b.data[y * b.width + x] !== b.data[mirrorOf(x, y, b.width, b.height, axis)]) return false
    }
  return true
}

function averageMirror(cov: Float32Array, w: number, h: number, axis: Axis) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const m = mirrorOf(x, y, w, h, axis)
      if (m <= i) continue
      const mean = (cov[i]! + cov[m]!) / 2
      cov[i] = mean
      cov[m] = mean
    }
}

function copyMirror(bits: Uint8Array, w: number, h: number, axis: Axis) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const m = mirrorOf(x, y, w, h, axis)
      if (m > i) bits[m] = bits[i]!
    }
}

/** Drops lone dots and spurs, fills one-dot holes and notches. */
function cleanDots(bits: Uint8Array, cov: Float32Array, w: number, h: number) {
  const on = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x]!)
  const next = bits.slice()
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const side = on(x - 1, y) + on(x + 1, y) + on(x, y - 1) + on(x, y + 1)
      const corner = on(x - 1, y - 1) + on(x + 1, y - 1) + on(x - 1, y + 1) + on(x + 1, y + 1)
      const c = cov[y * w + x]!
      if (bits[y * w + x]) {
        if (side + corner === 0 || (side <= 1 && corner === 0 && c < 0.75)) next[y * w + x] = 0
      } else if (side === 4 || (side === 3 && c > 0.3)) next[y * w + x] = 1
    }
  bits.set(next)
}
