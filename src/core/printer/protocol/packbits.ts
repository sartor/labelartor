/**
 * PackBits (TIFF) run-length encoding, the compression the printer expects when
 * compression mode is set to RLE.
 *
 * Header byte n (signed):
 *   0..127    -> copy the next n + 1 bytes literally
 *   -127..-1  -> repeat the next byte 1 - n times (2..128)
 *   -128      -> no-op (never emitted)
 */

const MAX_RUN = 128

export function packbitsEncode(data: Uint8Array): Uint8Array {
  const out: number[] = []
  const n = data.length
  let i = 0

  while (i < n) {
    let run = 1
    while (i + run < n && run < MAX_RUN && data[i + run] === data[i]) run++

    if (run >= 2) {
      out.push((257 - run) & 0xff, data[i]!)
      i += run
      continue
    }

    // Literal run: stop before 3 identical bytes (cheaper as a repeat) or at MAX_RUN.
    const start = i
    while (i < n && i - start < MAX_RUN) {
      if (i + 2 < n && data[i] === data[i + 1] && data[i] === data[i + 2]) break
      i++
    }
    out.push(i - start - 1)
    for (let k = start; k < i; k++) out.push(data[k]!)
  }

  return Uint8Array.from(out)
}

export function packbitsDecode(data: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < data.length) {
    const header = data[i++]!
    if (header < 128) {
      const count = header + 1
      if (i + count > data.length) throw new Error('PackBits: truncated literal run')
      for (let k = 0; k < count; k++) out.push(data[i++]!)
    } else if (header > 128) {
      if (i >= data.length) throw new Error('PackBits: truncated repeat run')
      const count = 257 - header
      const value = data[i++]!
      for (let k = 0; k < count; k++) out.push(value)
    }
  }
  return Uint8Array.from(out)
}
