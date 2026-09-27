import { STATUS_LENGTH, type PrinterTransport } from '..'

export interface StatusFields {
  model?: number
  errors?: number
  mediaWidthMm?: number
  mediaType?: number
  mediaLengthMm?: number
  statusType?: number
  phaseType?: number
  phase?: number
  tapeBackground?: number
  tapeTextColor?: number
}

/** Builds a raw 32-byte status register as the printer would send it. */
export function statusBytes(f: StatusFields = {}): Uint8Array {
  const b = new Uint8Array(STATUS_LENGTH)
  b.set([0x80, 0x20, 0x42, 0x30])
  b[4] = f.model ?? 0x72
  b[8] = ((f.errors ?? 0) >> 8) & 0xff
  b[9] = (f.errors ?? 0) & 0xff
  b[10] = f.mediaWidthMm ?? 12
  b[11] = f.mediaType ?? 0x01
  b[17] = f.mediaLengthMm ?? 0
  b[18] = f.statusType ?? 0x00
  b[19] = f.phaseType ?? 0x00
  b[20] = ((f.phase ?? 0) >> 8) & 0xff
  b[21] = (f.phase ?? 0) & 0xff
  b[24] = f.tapeBackground ?? 0x01
  b[25] = f.tapeTextColor ?? 0x08
  return b
}

/**
 * In-memory transport. `respond` is called for every write and may return
 * bytes the "printer" sends back.
 */
export class FakeTransport implements PrinterTransport {
  readonly writes: Uint8Array[] = []
  private inbox: number[] = []
  isOpen = true

  constructor(private readonly respond: (packet: Uint8Array) => Uint8Array | void = () => {}) {}

  async open() {
    this.isOpen = true
  }

  async close() {
    this.isOpen = false
  }

  async write(data: Uint8Array) {
    this.writes.push(data)
    const reply = this.respond(data)
    if (reply) this.inbox.push(...reply)
  }

  async read(length: number) {
    return Uint8Array.from(this.inbox.splice(0, length))
  }

  clearInput() {
    this.inbox = []
  }

  onDisconnect() {
    return () => {}
  }
}

export const isGetStatus = (p: Uint8Array) =>
  p.length === 3 && p[0] === 0x1b && p[1] === 0x69 && p[2] === 0x53
