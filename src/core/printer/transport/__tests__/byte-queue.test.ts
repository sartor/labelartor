import { describe, expect, test } from 'bun:test'

import { ByteQueue } from '../byte-queue'

describe('ByteQueue', () => {
  test('resolves once enough bytes arrive', async () => {
    const queue = new ByteQueue()
    const pending = queue.read(4, 1000)
    queue.push(Uint8Array.of(1, 2))
    setTimeout(() => queue.push(Uint8Array.of(3, 4, 5)), 5)
    expect(await pending).toEqual(Uint8Array.of(1, 2, 3, 4))
    expect(queue.length).toBe(1)
  })

  test('returns partial data on timeout without losing later bytes', async () => {
    const queue = new ByteQueue()
    queue.push(Uint8Array.of(9))
    expect(await queue.read(4, 10)).toEqual(Uint8Array.of(9))
    queue.push(Uint8Array.of(1, 2, 3, 4))
    expect(await queue.read(4, 10)).toEqual(Uint8Array.of(1, 2, 3, 4))
  })

  test('clear drops buffered data', () => {
    const queue = new ByteQueue()
    queue.push(Uint8Array.of(1, 2, 3))
    queue.clear()
    expect(queue.take(3)).toEqual(new Uint8Array(0))
  })
})
