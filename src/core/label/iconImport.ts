/**
 * Turns a picture (pasted PNG, JPEG, or an SVG drawn to pixels) into a
 * 64-dot icon, much as the curated screenshot icons were made:
 *
 * - Darkness is a grey level per pixel (transparent counts as paper), so
 *   anti-aliased edges count by how dark they are. A picture that is light
 *   on dark (judged by its border) is inverted first.
 * - The ink is trimmed to its bounds and scaled to fill all 64 dots of height;
 *   the width follows its proportions (up to {@link IMPORT_MAX_WIDTH}).
 * - Mirror symmetry (left–right, top–bottom, a diagonal) or half-turn
 *   symmetry is found by trying axes and centres in half-pixel steps; a
 *   symmetric picture is cropped around its axis, mapped onto whole dots
 *   and made exactly symmetric.
 * - Each dot prints when at least half of its area is dark; then lone dots
 *   and one-dot notches are cleaned up.
 */
import { type Axis, type IconBitmap, coverage, dotsFromCoverage } from './iconScale'

/** Widest a pasted icon may be, in dots (it is always 64 tall). */
export const IMPORT_MAX_WIDTH = 256

/** Mirror or half-turn match needed to treat a picture as symmetric. */
const SYMMETRIC = 0.97

interface Ink {
  dark: Float32Array
  w: number
  h: number
  box: { x0: number; y0: number; x1: number; y1: number }
}

/** Grey-level darkness of RGBA pixels on white; null when there is no ink. */
function inkOf(rgba: Uint8ClampedArray, w: number, h: number): Ink | null {
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3]! / 255
    const l = 0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!
    lum[i] = l * a + 255 * (1 - a)
  }
  // A dark border means light ink on a dark background: invert.
  let border = 0
  for (let x = 0; x < w; x++) border += lum[x]! + lum[(h - 1) * w + x]!
  for (let y = 0; y < h; y++) border += lum[y * w]! + lum[y * w + w - 1]!
  const invert = border / (2 * (w + h)) < 128
  // Stretch paper (~235) to ink (~40) onto 0..1.
  const dark = new Float32Array(w * h)
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const l = invert ? 255 - lum[y * w + x]! : lum[y * w + x]!
      const d = Math.min(1, Math.max(0, (235 - l) / 195))
      dark[y * w + x] = d
      if (d >= 0.5) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    }
  if (x1 < 0) return null
  return { dark, w, h, box: { x0, y0, x1, y1 } }
}

/** An affine map of the plane: (x, y) → (a·x + b·y + c, d·x + e·y + f). */
type Affine = readonly [number, number, number, number, number, number]

/**
 * How well the ink matches itself under `map` (applied to pixel centres):
 * 1 = identical, 0 = no overlap. Looks at every `step`-th pixel each way.
 */
function score(ink: Ink, [a, b, c, d, e, f]: Affine, step = 1): number {
  const { dark, w, h, box } = ink
  let diff = 0
  let sum = 0
  for (let y = box.y0; y <= box.y1; y += step) {
    const cy = y + 0.5
    for (let x = box.x0; x <= box.x1; x += step) {
      const cx = x + 0.5
      const px = Math.floor(a * cx + b * cy + c)
      const py = Math.floor(d * cx + e * cy + f)
      const mirrored = px < 0 || py < 0 || px >= w || py >= h ? 0 : dark[py * w + px]!
      const value = dark[y * w + x]!
      diff += Math.abs(value - mirrored)
      sum += value + mirrored
    }
  }
  return sum ? 1 - diff / sum : 0
}

type Symmetry =
  | { kind: 'x'; cx: number }
  | { kind: 'y'; cy: number }
  | { kind: 'xy' | 'diagonal' | 'antidiagonal' | 'turn'; cx: number; cy: number }

const mirrorX = (cx: number): Affine => [-1, 0, 2 * cx, 0, 1, 0]
const mirrorY = (cy: number): Affine => [1, 0, 0, 0, -1, 2 * cy]
const TWO_CENTRE_MAPS = {
  diagonal: (cx: number, cy: number): Affine => [0, 1, cx - cy, 1, 0, cy - cx],
  antidiagonal: (cx: number, cy: number): Affine => [0, -1, cx + cy, -1, 0, cx + cy],
  turn: (cx: number, cy: number): Affine => [-1, 0, 2 * cx, 0, -1, 2 * cy],
} as const

/** Offsets of the centres tried, in half pixels. */
const SHIFTS = [-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
const NEAR_SHIFTS = SHIFTS.filter((d) => Math.abs(d) <= 2)

/**
 * The symmetry the ink has, if any. Candidates are compared on a sample of
 * about 128 pixels across; the best one must then match on every pixel.
 */
function findSymmetry(ink: Ink): Symmetry | null {
  const { box } = ink
  const mx = (box.x0 + box.x1 + 1) / 2
  const my = (box.y0 + box.y1 + 1) / 2
  const step = Math.max(1, Math.floor(Math.max(box.x1 - box.x0, box.y1 - box.y0) / 128))
  const bestShift = (map: (d: number) => Affine) => {
    let top = { d: 0, s: -1 }
    for (const d of SHIFTS) {
      const s = score(ink, map(d), step)
      if (s > top.s) top = { d, s }
    }
    return score(ink, map(top.d)) >= SYMMETRIC ? top.d : null
  }
  const dx = bestShift((d) => mirrorX(mx + d))
  const dy = bestShift((d) => mirrorY(my + d))
  if (dx !== null && dy !== null) return { kind: 'xy', cx: mx + dx, cy: my + dy }
  if (dx !== null) return { kind: 'x', cx: mx + dx }
  if (dy !== null) return { kind: 'y', cy: my + dy }
  // Diagonals and half turns: both centre coordinates, over a smaller range.
  let top: { kind: keyof typeof TWO_CENTRE_MAPS; cx: number; cy: number; s: number } | null = null
  for (const ox of NEAR_SHIFTS)
    for (const oy of NEAR_SHIFTS)
      for (const [kind, map] of Object.entries(TWO_CENTRE_MAPS)) {
        const s = score(ink, map(mx + ox, my + oy), step)
        if (!top || s > top.s)
          top = { kind: kind as keyof typeof TWO_CENTRE_MAPS, cx: mx + ox, cy: my + oy, s }
      }
  if (!top || score(ink, TWO_CENTRE_MAPS[top.kind](top.cx, top.cy)) < SYMMETRIC) return null
  return { kind: top.kind, cx: top.cx, cy: top.cy }
}

/** The picture as a 64-dot icon, or null when it has no ink. */
export function iconFromPixels(rgba: Uint8ClampedArray, w: number, h: number): IconBitmap | null {
  const ink = inkOf(rgba, w, h)
  if (!ink) return null
  const { box, dark } = ink
  const sym = findSymmetry(ink)

  // Crop: the ink bounds, widened to be centred on the symmetry.
  let cx0 = box.x0
  let cx1 = box.x1 + 1
  let cy0 = box.y0
  let cy1 = box.y1 + 1
  const aroundX = (c: number) => {
    const half = Math.max(c - box.x0, box.x1 + 1 - c)
    cx0 = c - half
    cx1 = c + half
  }
  const aroundY = (c: number) => {
    const half = Math.max(c - box.y0, box.y1 + 1 - c)
    cy0 = c - half
    cy1 = c + half
  }
  const square = sym?.kind === 'diagonal' || sym?.kind === 'antidiagonal'
  if (sym && sym.kind !== 'y') aroundX(sym.cx)
  if (sym && sym.kind !== 'x') aroundY(sym.cy)
  if (square) {
    const half = Math.max(cx1 - cx0, cy1 - cy0) / 2
    const cx = (cx0 + cx1) / 2
    const cy = (cy0 + cy1) / 2
    cx0 = cx - half
    cx1 = cx + half
    cy0 = cy - half
    cy1 = cy + half
  }
  const rw = cx1 - cx0
  const rh = cy1 - cy0
  // Full height; the width follows the picture's proportions.
  const s = Math.min(64 / rh, IMPORT_MAX_WIDTH / rw)
  const width = square ? 64 : Math.max(1, Math.min(IMPORT_MAX_WIDTH, Math.round(rw * s)))
  let rows = square ? 64 : Math.max(1, Math.min(64, Math.round(rh * s)))
  // Even margins, so a top–bottom symmetric icon's axis lands on the dot grid.
  if ((64 - rows) % 2) rows -= 1
  const cov = new Float32Array(width * 64)
  const sampling = {
    x: cx0,
    y: cy0,
    dotWidth: rw / width,
    dotHeight: rh / rows,
    columns: width,
    rows,
  }
  cov.set(coverage(dark, w, h, sampling), ((64 - rows) / 2) * width)

  const data = dotsFromCoverage(cov, width, 64, sym ? AXES[sym.kind] : [])
  return data.includes(1) ? { width, height: 64, data } : null
}

/** The dot-grid axes each symmetry mirrors across. */
const AXES: Record<Symmetry['kind'], Axis[]> = {
  x: ['x'],
  y: ['y'],
  xy: ['x', 'y'],
  diagonal: ['d'],
  antidiagonal: ['a'],
  turn: ['turn'],
}
