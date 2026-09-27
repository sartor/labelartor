/** Hardware characteristics of the Brother PT-P300BT. */

export interface TapeSpec {
  widthMm: number
  /** Number of print-head dots that land on the tape (label height in dots). */
  printableDots: number
}

/**
 * Printable band per tape width. 12 mm tape gives a ~9 mm band of 64 dots,
 * smaller tapes scale linearly (values used by the reference implementation;
 * calibrate on real hardware if edges get clipped).
 */
export const TAPES: readonly TapeSpec[] = [
  { widthMm: 3.5, printableDots: 19 },
  { widthMm: 6, printableDots: 32 },
  { widthMm: 9, printableDots: 48 },
  { widthMm: 12, printableDots: 64 },
]

export const PT_P300BT = {
  name: 'PT-P300BT',
  modelCode: 0x72,
  dpi: 180,
  /** Dots across the print head; each raster line covers all of them. */
  headDots: 128,
  bytesPerLine: 16,
  defaultTape: TAPES[TAPES.length - 1]!,
  /** Tape fed out before the first printed dot (cutter-to-head distance). */
  unusedLeadMm: 25,
  serial: {
    baudRate: 9600,
    /** Standard Bluetooth Serial Port Profile service class. */
    sppServiceClassId: '00001101-0000-1000-8000-00805f9b34fb',
  },
} as const

/** Status reports whole millimetres, so 3.5 mm tape shows up as 4. */
export function tapeForReportedWidth(widthMm: number): TapeSpec | undefined {
  return TAPES.find((t) => Math.round(t.widthMm) === widthMm || t.widthMm === widthMm)
}

export function dotsToMm(dots: number, dpi: number = PT_P300BT.dpi): number {
  return (dots * 25.4) / dpi
}

export function mmToDots(mm: number, dpi: number = PT_P300BT.dpi): number {
  return Math.round((mm * dpi) / 25.4)
}
