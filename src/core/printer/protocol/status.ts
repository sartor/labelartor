/**
 * 32-byte status register sent by the printer in reply to ESC i S and
 * spontaneously while printing. Multi-byte fields are big-endian.
 */

import {
  ERROR_FLAG_NAMES,
  MEDIA_TYPE_NAMES,
  MODEL_NAMES,
  NOTIFICATION_NAMES,
  PHASE_NAMES,
  POWER_NAMES,
  STATUS_TYPE_NAMES,
  TAPE_BACKGROUND_NAMES,
  TAPE_TEXT_COLOR_NAMES,
  codeName,
} from './status-codes'

export const STATUS_LENGTH = 32

/** Print head mark, size (32), "B" (Brother), "0" (series code). */
const STATUS_HEADER = [0x80, 0x20, 0x42, 0x30] as const

export const StatusType = {
  reply: 0x00,
  printingCompleted: 0x01,
  error: 0x02,
  exitIfMode: 0x03,
  turnedOff: 0x04,
  notification: 0x05,
  phaseChange: 0x06,
} as const

export interface PrinterStatus {
  model: number
  country: number
  extendedError: number
  power: number
  /** 16-bit error word, see {@link ERROR_FLAG_NAMES}. */
  errors: number
  /** Tape width in whole millimetres (3.5 mm tape reports 4). */
  mediaWidthMm: number
  mediaType: number
  mode: number
  density: number
  /** Fixed label length in mm; 0 for continuous tape. */
  mediaLengthMm: number
  statusType: number
  phaseType: number
  phase: number
  notification: number
  expansionArea: number
  tapeBackground: number
  tapeTextColor: number
  hardwareSettings: number
}

export class StatusParseError extends Error {
  override name = 'StatusParseError'
}

export function parseStatus(bytes: Uint8Array): PrinterStatus {
  if (bytes.length !== STATUS_LENGTH) {
    throw new StatusParseError(`Status must be ${STATUS_LENGTH} bytes, got ${bytes.length}`)
  }
  if (!STATUS_HEADER.every((b, i) => bytes[i] === b)) {
    throw new StatusParseError('Invalid status header')
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    model: dv.getUint8(4),
    country: dv.getUint8(5),
    extendedError: dv.getUint8(6),
    power: dv.getUint8(7),
    errors: dv.getUint16(8),
    mediaWidthMm: dv.getUint8(10),
    mediaType: dv.getUint8(11),
    // 12-14: number of colours, fonts, reserved
    mode: dv.getUint8(15),
    density: dv.getUint8(16),
    mediaLengthMm: dv.getUint8(17),
    statusType: dv.getUint8(18),
    phaseType: dv.getUint8(19),
    phase: dv.getUint16(20),
    notification: dv.getUint8(22),
    expansionArea: dv.getUint8(23),
    tapeBackground: dv.getUint8(24),
    tapeTextColor: dv.getUint8(25),
    hardwareSettings: dv.getUint32(26),
  }
}

/** True when the printer is idle and has no error — safe to start a job. */
export function isReady(status: PrinterStatus): boolean {
  return status.errors === 0 && status.phaseType === 0 && status.phase === 0
}

export function hasError(status: PrinterStatus): boolean {
  return status.errors !== 0 || status.statusType === StatusType.error
}

export function errorMessages(errors: number): string[] {
  const messages: string[] = []
  for (let bit = 0; bit < 16; bit++) {
    if (errors & (1 << bit)) messages.push(ERROR_FLAG_NAMES[bit] ?? `Error bit ${bit}`)
  }
  return messages
}

/** Human-readable view of a status, for the UI and logs. */
export function describeStatus(status: PrinterStatus) {
  const errors = errorMessages(status.errors)
  return {
    model: codeName(MODEL_NAMES, status.model),
    power: codeName(POWER_NAMES, status.power),
    errors: errors.length ? errors.join(', ') : 'None',
    media: `${status.mediaWidthMm} mm ${codeName(MEDIA_TYPE_NAMES, status.mediaType)}`,
    tapeColors: `${codeName(TAPE_TEXT_COLOR_NAMES, status.tapeTextColor)} on ${codeName(
      TAPE_BACKGROUND_NAMES,
      status.tapeBackground,
    )}`,
    statusType: codeName(STATUS_TYPE_NAMES, status.statusType),
    phase: codeName(PHASE_NAMES, (status.phaseType << 16) | status.phase),
    notification: codeName(NOTIFICATION_NAMES, status.notification),
  }
}

export type StatusDescription = ReturnType<typeof describeStatus>
