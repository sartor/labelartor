import { describe, expect, test } from 'bun:test'

import {
  PrinterNotReadyError,
  PrinterReportedError,
  PrinterTimeoutError,
  PtPrinter,
  createRaster,
} from '..'
import { FakeTransport, isGetStatus, statusBytes } from './fixtures'

const PRINT = 0x1a

function rasterWithInk(lines: number) {
  const raster = createRaster(lines, 16)
  raster.data[16 * (lines - 1) + 8] = 0xff
  return raster
}

/** A transport whose printer is idle and confirms every print. */
const readyTransport = () =>
  new FakeTransport((p) => {
    if (isGetStatus(p)) return statusBytes()
    if (p.length === 1 && p[0] === PRINT) return statusBytes({ statusType: 0x01 })
  })

/** Flags byte of every ESC i K (advanced mode) packet sent, in order. */
const advancedModeFlags = (t: FakeTransport) =>
  t.writes
    .filter((p) => p.length === 4 && p[0] === 0x1b && p[1] === 0x69 && p[2] === 0x4b)
    .map((p) => p[3])

describe('PtPrinter', () => {
  test('getStatus sends the request and parses the reply', async () => {
    const transport = new FakeTransport((p) => (isGetStatus(p) ? statusBytes() : undefined))
    const status = await new PtPrinter(transport).getStatus()
    expect(status.mediaWidthMm).toBe(12)
    expect(transport.writes.some(isGetStatus)).toBe(true)
  })

  test('getStatus retries, then times out', async () => {
    const transport = new FakeTransport()
    const printer = new PtPrinter(transport, { statusAttempts: 2, statusTimeoutMs: 1 })
    await expect(printer.getStatus()).rejects.toThrow(PrinterTimeoutError)
    expect(transport.writes.filter(isGetStatus)).toHaveLength(2)
  })

  test('full print job', async () => {
    const transport = readyTransport()
    const progress: number[] = []
    await new PtPrinter(transport).print(
      rasterWithInk(3),
      {},
      {
        onProgress: (sent) => progress.push(sent),
      },
    )

    expect(progress).toEqual([1, 2, 3])
    const tail = transport.writes.slice(-4).map((p) => p[0])
    expect(tail).toEqual([0x5a, 0x5a, 0x47, PRINT])
    // A single label feeds the tape: "no chaining" flag set.
    expect(advancedModeFlags(transport)).toEqual([0x08])
  })

  test('refuses to print when the printer reports an error', async () => {
    const transport = new FakeTransport((p) =>
      isGetStatus(p) ? statusBytes({ errors: 0x0010 }) : undefined,
    )
    await expect(new PtPrinter(transport).print(rasterWithInk(1))).rejects.toThrow(
      PrinterNotReadyError,
    )
    expect(transport.writes.some((p) => p[0] === PRINT)).toBe(false)
  })

  test('surfaces errors reported while printing', async () => {
    const transport = new FakeTransport((p) => {
      if (isGetStatus(p)) return statusBytes()
      if (p[0] === PRINT) return statusBytes({ statusType: 0x02, errors: 0x0200 })
    })
    await expect(new PtPrinter(transport).print(rasterWithInk(1))).rejects.toThrow(
      PrinterReportedError,
    )
  })

  test('dry run skips the print command', async () => {
    const transport = new FakeTransport((p) => (isGetStatus(p) ? statusBytes() : undefined))
    await new PtPrinter(transport).print(rasterWithInk(1), { dryRun: true })
    expect(transport.writes.some((p) => p.length === 1 && p[0] === PRINT)).toBe(false)
  })

  test('printBatch chains every label but the last and reports each one', async () => {
    const transport = readyTransport()
    const done: number[] = []
    await new PtPrinter(transport).printBatch(
      [rasterWithInk(1), rasterWithInk(2), rasterWithInk(1)],
      {},
      { onJobDone: (i) => done.push(i) },
    )
    expect(done).toEqual([0, 1, 2])
    expect(transport.writes.filter((p) => p.length === 1 && p[0] === PRINT)).toHaveLength(3)
    expect(advancedModeFlags(transport)).toEqual([0x00, 0x00, 0x08])
  })

  test('printBatch stops at the first failed label', async () => {
    let jobs = 0
    const transport = new FakeTransport((p) => {
      if (isGetStatus(p)) return statusBytes()
      if (p.length === 1 && p[0] === PRINT) {
        return ++jobs === 2
          ? statusBytes({ statusType: 0x02, errors: 0x0100 })
          : statusBytes({ statusType: 0x01 })
      }
    })
    const done: number[] = []
    await expect(
      new PtPrinter(transport).printBatch(
        [rasterWithInk(1), rasterWithInk(1), rasterWithInk(1)],
        {},
        { onJobDone: (i) => done.push(i) },
      ),
    ).rejects.toThrow(PrinterReportedError)
    expect(done).toEqual([0])
    expect(jobs).toBe(2)
  })
})
