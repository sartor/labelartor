/** Human-readable names for the numeric codes found in the status register. */

export const MODEL_NAMES: Readonly<Record<number, string>> = {
  0x38: 'QL-800',
  0x39: 'QL-810W',
  0x41: 'QL-820NWB',
  0x66: 'PT-E550W',
  0x68: 'PT-P750W',
  0x6f: 'PT-P900W',
  0x70: 'PT-P950NW',
  0x72: 'PT-P300BT',
}

export const POWER_NAMES: Readonly<Record<number, string>> = {
  0x00: 'Battery full',
  0x01: 'Battery half',
  0x02: 'Battery low',
  0x03: 'Battery critical',
  0x04: 'AC adapter',
}

/**
 * Error flags: bit index in the 16-bit big-endian error word
 * (bits 0-7 = "error information 2", bits 8-15 = "error information 1").
 */
export const ERROR_FLAG_NAMES: Readonly<Record<number, string>> = {
  0: 'Replace media',
  1: 'Expansion buffer full',
  2: 'Communication error',
  3: 'Communication buffer full',
  4: 'Cover open',
  5: 'Overheating or cancelled on printer',
  6: 'Media cannot be fed',
  7: 'System error',
  8: 'No media loaded',
  9: 'End of media',
  10: 'Cutter jam',
  11: 'Low battery',
  12: 'Printer in use',
  13: 'Printer turned off',
  14: 'High-voltage adapter',
  15: 'Fan error',
}

export const MEDIA_TYPE_NAMES: Readonly<Record<number, string>> = {
  0x00: 'No media',
  0x01: 'Laminated tape (TZe)',
  0x03: 'Non-laminated tape (TZeN)',
  0x11: 'Heat-shrink tube (HSe)',
  0x4a: 'Continuous tape',
  0x4b: 'Die-cut labels',
  0xff: 'Incompatible tape',
}

export const STATUS_TYPE_NAMES: Readonly<Record<number, string>> = {
  0x00: 'Reply to status request',
  0x01: 'Printing completed',
  0x02: 'Error occurred',
  0x03: 'Exit IF mode',
  0x04: 'Turned off',
  0x05: 'Notification',
  0x06: 'Phase change',
}

/** Keyed by `(phaseType << 16) | phase`. */
export const PHASE_NAMES: Readonly<Record<number, string>> = {
  0x000000: 'Ready',
  0x000001: 'Feeding',
  0x010000: 'Printing',
  0x010014: 'Cover open while receiving',
}

export const NOTIFICATION_NAMES: Readonly<Record<number, string>> = {
  0x00: 'None',
  0x01: 'Cover open',
  0x02: 'Cover closed',
}

export const TAPE_BACKGROUND_NAMES: Readonly<Record<number, string>> = {
  0x00: 'None',
  0x01: 'White',
  0x02: 'Other',
  0x03: 'Clear',
  0x04: 'Red',
  0x05: 'Blue',
  0x06: 'Yellow',
  0x07: 'Green',
  0x08: 'Black',
  0x09: 'Clear (white text)',
  0x20: 'Matte white',
  0x21: 'Matte clear',
  0x22: 'Matte silver',
  0x23: 'Satin gold',
  0x24: 'Satin silver',
  0x30: 'Blue (D)',
  0x31: 'Red (D)',
  0x40: 'Fluorescent orange',
  0x41: 'Fluorescent yellow',
  0x50: 'Berry pink (S)',
  0x51: 'Light gray (S)',
  0x52: 'Lime green (S)',
  0x60: 'Yellow (F)',
  0x61: 'Pink (F)',
  0x62: 'Blue (F)',
  0x70: 'White (heat-shrink tube)',
  0x90: 'White (Flex ID)',
  0x91: 'Yellow (Flex ID)',
  0xf0: 'Cleaning',
  0xf1: 'Stencil',
  0xff: 'Incompatible',
}

export const TAPE_TEXT_COLOR_NAMES: Readonly<Record<number, string>> = {
  0x00: 'None',
  0x01: 'White',
  0x02: 'Other',
  0x04: 'Red',
  0x05: 'Blue',
  0x08: 'Black',
  0x0a: 'Gold',
  0x62: 'Blue (F)',
  0xf0: 'Cleaning',
  0xf1: 'Stencil',
  0xff: 'Incompatible',
}

export function codeName(table: Readonly<Record<number, string>>, code: number): string {
  return table[code] ?? `Unknown (0x${code.toString(16).padStart(2, '0')})`
}
