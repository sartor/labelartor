import { FONT_GROUP_LABELS, type FontGroup, type FontOption } from './types'

/**
 * Fonts shipped with the app (Fontsource, served locally so they work
 * offline). All cover Latin and Cyrillic, including the Ukrainian letters.
 * Fonts download when they are chosen. The @font-face rules (regular and,
 * where available, bold) are imported in `src/styles/fonts.css` — keep both
 * lists in sync.
 */
export const BUNDLED_FONTS: readonly FontOption[] = [
  { family: 'Roboto Variable', label: 'Roboto', group: 'sans' },
  { family: 'Open Sans Variable', label: 'Open Sans', group: 'sans' },
  { family: 'PT Sans', label: 'PT Sans', group: 'sans' },
  { family: 'Golos Text Variable', label: 'Golos Text', group: 'sans' },
  { family: 'Didact Gothic', label: 'Didact Gothic', group: 'sans', regularOnly: true },
  { family: 'Russo One', label: 'Russo One', group: 'sans', regularOnly: true },
  { family: 'Gothic A1', label: 'Gothic A1', group: 'sans' },
  { family: 'Science Gothic Variable', label: 'Science Gothic', group: 'sans' },
  { family: 'Ysabeau Infant Variable', label: 'Ysabeau Infant', group: 'sans' },
  { family: 'Arsenal SC', label: 'Arsenal SC', group: 'sans' },
  { family: 'Finlandica Variable', label: 'Finlandica', group: 'sans' },
  { family: 'Tektur Variable', label: 'Tektur', group: 'sans' },

  { family: 'Roboto Condensed Variable', label: 'Roboto Condensed', group: 'condensed' },
  { family: 'Oswald Variable', label: 'Oswald', group: 'condensed' },
  { family: 'PT Sans Narrow', label: 'PT Sans Narrow', group: 'condensed' },
  { family: 'Fira Sans Condensed', label: 'Fira Sans Condensed', group: 'condensed' },
  { family: 'Cuprum Variable', label: 'Cuprum', group: 'condensed' },

  { family: 'Roboto Mono Variable', label: 'Roboto Mono', group: 'mono' },
  { family: 'Noto Mono', label: 'Noto Mono', group: 'mono', regularOnly: true },
  { family: 'Lilex Variable', label: 'Lilex', group: 'mono' },
  { family: 'Iosevka', label: 'Iosevka', group: 'mono' },
  { family: 'iA Writer Mono', label: 'iA Writer Mono', group: 'mono' },
  { family: 'Adwaita Mono', label: 'Adwaita Mono', group: 'mono' },

  { family: 'Tiny5', label: 'Tiny5', group: 'pixel', regularOnly: true },
  { family: 'Pixelify Sans Variable', label: 'Pixelify Sans', group: 'pixel' },
  { family: 'Press Start 2P', label: 'Press Start 2P', group: 'pixel', regularOnly: true },
  { family: 'Handjet Variable', label: 'Handjet', group: 'pixel' },
  { family: 'DotGothic16', label: 'DotGothic16', group: 'pixel', regularOnly: true },
  { family: 'Unifont', label: 'Unifont', group: 'pixel', regularOnly: true },
]

export const DEFAULT_FONT_FAMILY = BUNDLED_FONTS[0]!.family

export interface FontGroupOptions {
  id: FontGroup
  label: string
  fonts: readonly FontOption[]
}

/** The bundled fonts by group, in the order the selector shows them. */
export const BUNDLED_FONT_GROUPS: readonly FontGroupOptions[] = (
  Object.keys(FONT_GROUP_LABELS) as FontGroup[]
).map((id) => ({
  id,
  label: FONT_GROUP_LABELS[id],
  fonts: BUNDLED_FONTS.filter((font) => font.group === id),
}))

export function findBundledFont(family: string): FontOption | undefined {
  return BUNDLED_FONTS.find((font) => font.family === family)
}

export function isBundledFont(family: string): boolean {
  return findBundledFont(family) !== undefined
}

/** Whether a real bold face exists; unknown families are assumed to have one. */
export function fontHasBold(family: string): boolean {
  return !findBundledFont(family)?.regularOnly
}
