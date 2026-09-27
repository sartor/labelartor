export type TextAlign = 'left' | 'center' | 'right'

/**
 * The label being edited. Deliberately minimal for now; richer content
 * (multiple blocks, images, barcodes) will extend this model.
 */
export interface LabelDocument {
  text: string
  /** CSS font-family name as registered with the browser. */
  fontFamily: string
  bold: boolean
  /** Font size in dots; 0 means the largest size that fits the tape. */
  fontSizePx: number
  align: TextAlign
  /** Distance between baselines relative to the ink height of one line. */
  lineHeight: number
  /** Wanted total tape length in mm; 0 means as long as the text needs. */
  lengthMm: number
  /** Where the text sits on the tape when `lengthMm` leaves room to spare. */
  tapeAlign: TextAlign
}

export const LINE_HEIGHT = { min: 0.8, max: 3, step: 0.05, default: 1 } as const

/** A chosen font size may go down to this share of the largest size that fits. */
export const FONT_SIZE = { minRatio: 0.3 } as const

export const TAPE_LENGTH = { min: 0, max: 200, step: 1 } as const

/** Physical label area the document is rendered into. */
export interface LabelCanvasSpec {
  /** Label height in dots = printable dots across the tape. */
  heightDots: number
  /** Blank space before and after the content along the tape, in dots. */
  paddingDots: number
}
