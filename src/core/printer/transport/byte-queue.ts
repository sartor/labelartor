import { concatBytes } from '../protocol/bytes'

/**
 * Receive buffer fed by a transport's read loop. Readers await a byte count
 * with a timeout instead of racing individual stream reads, so no data is
 * lost when a read times out.
 */
export class ByteQueue {
  private buffer = new Uint8Array(0)
  private waiters = new Set<() => void>()

  get length(): number {
    return this.buffer.length
  }

  push(chunk: Uint8Array): void {
    if (!chunk.length) return
    this.buffer = concatBytes([this.buffer, chunk])
    for (const wake of this.waiters) wake()
  }

  clear(): void {
    this.buffer = new Uint8Array(0)
  }

  /** Take up to `length` bytes that are already buffered. */
  take(length: number): Uint8Array {
    const count = Math.min(length, this.buffer.length)
    const out = this.buffer.slice(0, count)
    this.buffer = this.buffer.slice(count)
    return out
  }

  async read(length: number, timeoutMs: number): Promise<Uint8Array> {
    const deadline = Date.now() + timeoutMs
    while (this.buffer.length < length) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) break
      await this.waitForData(remaining)
    }
    return this.take(length)
  }

  private waitForData(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const wake = () => {
        clearTimeout(timer)
        this.waiters.delete(wake)
        resolve()
      }
      const timer = setTimeout(wake, timeoutMs)
      this.waiters.add(wake)
    })
  }
}
