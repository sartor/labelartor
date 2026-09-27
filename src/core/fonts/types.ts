export type FontGroup = 'sans' | 'condensed' | 'mono' | 'pixel'

export const FONT_GROUP_LABELS: Readonly<Record<FontGroup, string>> = {
  sans: 'Sans',
  condensed: 'Condensed',
  mono: 'Monospace',
  pixel: 'Pixel',
}

export interface FontOption {
  /** CSS font-family used for rendering (e.g. "Roboto Variable"). */
  family: string
  /** Name shown in the UI. */
  label: string
  group: FontGroup
  /** The font has no bold face; bold is not offered for it. */
  regularOnly?: true
}
