const fontSpec = (family: string, weight: number) =>
  `${weight} 16px "${family.replace(/"/g, '\\"')}"`

/** True when the glyphs of `sample` in `family` at `weight` can be drawn right away. */
export function isFontLoaded(family: string, sample: string, weight = 400): boolean {
  if (typeof document === 'undefined' || !document.fonts) return true
  try {
    return document.fonts.check(fontSpec(family, weight), sample || 'A')
  } catch {
    return true
  }
}

/**
 * Canvas text does not wait for web fonts, so make sure a family's glyphs for
 * `sample` are loaded before measuring or drawing. System fonts resolve
 * immediately.
 */
export async function ensureFontLoaded(family: string, sample: string, weight = 400) {
  if (isFontLoaded(family, sample, weight)) return
  try {
    await document.fonts.load(fontSpec(family, weight), sample || 'A')
  } catch {
    // Invalid family names reject; rendering falls back to the default font.
  }
}
