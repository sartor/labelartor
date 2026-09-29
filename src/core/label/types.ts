export type TextAlign = 'left' | 'center' | 'right'

/** How a text block's lines are set. */
export interface TextStyle {
  /** CSS font-family name as registered with the browser. */
  fontFamily: string
  bold: boolean
  /** Font size in dots; 0 means the largest size that fits the tape. */
  fontSizePx: number
  align: TextAlign
  /**
   * Space between the line boxes in dots: 0 = touching, negative =
   * overlapping. The layout keeps it within what fits the tape.
   */
  lineGap: number
}

/** Everything the text layout needs: the text and its style. */
export interface TextContent extends TextStyle {
  text: string
}

export interface TextBlock extends TextContent {
  kind: 'text'
  /** Unique within its label. */
  id: string
}

/** Icon heights in dots; the largest one that fits the tape is used. */
export const ICON_SIZES = [64, 48, 32, 24, 16] as const
export type IconSize = (typeof ICON_SIZES)[number]

export interface IconBlock {
  kind: 'icon'
  /** Unique within its label. */
  id: string
  /** Id of a curated icon (see `icons.ts`). */
  icon: string
  size: IconSize
}

/** Blank tape of a set length, e.g. to wrap a label around a cable. */
export interface SpaceBlock {
  kind: 'space'
  /** Unique within its label. */
  id: string
  lengthMm: number
}

export type LabelBlock = TextBlock | IconBlock | SpaceBlock
export type BlockKind = LabelBlock['kind']

/** A label: blocks side by side along the tape. */
export interface LabelDocument {
  /** Never empty. */
  blocks: LabelBlock[]
}

export const LINE_GAP = { default: 0, step: 1 } as const

/** A chosen font size may go down to this share of the largest size that fits. */
export const FONT_SIZE = { minRatio: 0.3 } as const

/** Length of a space block, mm. */
export const SPACE_LENGTH = { min: 0, max: 200, step: 0.1, sliderStep: 1, default: 10 } as const

/** Physical label area the document is rendered into. */
export interface LabelCanvasSpec {
  /** Label height in dots = printable dots across the tape. */
  heightDots: number
  /** Blank space before and after the content along the tape, in dots. */
  paddingDots: number
}
