/** Small byte-buffer helpers shared by the protocol modules. */

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function isAllZero(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) if (bytes[i] !== 0) return false
  return true
}

/** Sequential little-endian writer used to build command packets. */
export class ByteWriter {
  private readonly bytes: number[] = []

  u8(...values: number[]): this {
    for (const v of values) this.bytes.push(v & 0xff)
    return this
  }

  u16le(value: number): this {
    return this.u8(value, value >>> 8)
  }

  u32le(value: number): this {
    return this.u8(value, value >>> 8, value >>> 16, value >>> 24)
  }

  raw(data: Uint8Array): this {
    for (const b of data) this.bytes.push(b)
    return this
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}
