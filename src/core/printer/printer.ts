/**
 * High-level printer client: status queries and print jobs on top of a
 * {@link PrinterTransport}. Operations are serialised so a status refresh can
 * never interleave with a running print job.
 */

import {
  PrinterError,
  PrinterNotReadyError,
  PrinterReportedError,
  PrinterTimeoutError,
} from './errors'
import {
  STATUS_LENGTH,
  StatusType,
  concatBytes,
  hasError,
  isReady,
  jobSetupSequence,
  parseStatus,
  printCommand,
  rasterSequence,
  statusRequestSequence,
  type JobOptions,
  type PrinterStatus,
} from './protocol'
import type { RasterImage } from './raster'
import type { PrinterTransport } from './transport/types'

export interface PrintHooks {
  onProgress?: (sentLines: number, totalLines: number) => void
  /** Every status packet the printer sends during the job. */
  onStatus?: (status: PrinterStatus) => void
}

export interface BatchPrintHooks extends PrintHooks {
  onJobStart?: (index: number, count: number) => void
  /** The printer confirmed this label; it is safe to consider it printed. */
  onJobDone?: (index: number, count: number) => void
}

export interface PrintOptions extends JobOptions {
  /** Upload the job but skip the final print command (default: false). */
  dryRun?: boolean
  /** How long to wait for "printing completed", in ms (default: 60 s). */
  completionTimeoutMs?: number
}

export interface PrinterClientOptions {
  statusAttempts?: number
  statusTimeoutMs?: number
}

export class PtPrinter {
  private queue: Promise<unknown> = Promise.resolve()
  private readonly statusAttempts: number
  private readonly statusTimeoutMs: number

  constructor(
    readonly transport: PrinterTransport,
    options: PrinterClientOptions = {},
  ) {
    this.statusAttempts = options.statusAttempts ?? 6
    this.statusTimeoutMs = options.statusTimeoutMs ?? 1000
  }

  getStatus(): Promise<PrinterStatus> {
    return this.exclusive(() => this.queryStatus())
  }

  print(raster: RasterImage, options: PrintOptions = {}, hooks: PrintHooks = {}): Promise<void> {
    return this.printBatch([raster], options, hooks)
  }

  /**
   * Prints several labels back to back. All but the last are chained (no
   * feed after the page), so the tape lead is spent once per batch instead of
   * once per label. Stops at the first failure; `onJobDone` tells how far it got.
   */
  printBatch(
    rasters: readonly RasterImage[],
    options: PrintOptions = {},
    hooks: BatchPrintHooks = {},
  ): Promise<void> {
    return this.exclusive(async () => {
      for (const [index, raster] of rasters.entries()) {
        const last = index === rasters.length - 1
        hooks.onJobStart?.(index, rasters.length)
        await this.runPrintJob(
          raster,
          { ...options, chaining: last ? (options.chaining ?? false) : true },
          hooks,
        )
        hooks.onJobDone?.(index, rasters.length)
      }
    })
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }

  private async writeAll(packets: Iterable<Uint8Array>): Promise<void> {
    for (const packet of packets) await this.transport.write(packet)
  }

  private async queryStatus(onStatus?: PrintHooks['onStatus']): Promise<PrinterStatus> {
    for (let attempt = 1; attempt <= this.statusAttempts; attempt++) {
      this.transport.clearInput()
      await this.writeAll(statusRequestSequence())
      const reply = await this.transport.read(STATUS_LENGTH, this.statusTimeoutMs)
      if (reply.length === STATUS_LENGTH) {
        const status = parseStatus(reply)
        onStatus?.(status)
        return status
      }
    }
    throw new PrinterTimeoutError(
      'Printer did not respond to the status request. Check that it is on and paired.',
    )
  }

  private async runPrintJob(raster: RasterImage, options: PrintOptions, hooks: PrintHooks) {
    const compress = options.compress ?? true

    const status = await this.queryStatus(hooks.onStatus)
    if (!isReady(status)) throw new PrinterNotReadyError(status)

    const media = {
      type: status.mediaType,
      widthMm: status.mediaWidthMm,
      lengthMm: status.mediaLengthMm,
    }
    await this.writeAll(jobSetupSequence(raster.lines, media, { ...options, compress }))

    let sent = 0
    for (const packet of rasterSequence(raster.data, raster.bytesPerLine, compress)) {
      await this.transport.write(packet)
      hooks.onProgress?.(++sent, raster.lines)
    }

    if (options.dryRun) return

    await this.transport.write(printCommand())
    await this.waitForCompletion(options.completionTimeoutMs ?? 60_000, hooks.onStatus)
  }

  /** Consume spontaneous status packets until the printer reports completion. */
  private async waitForCompletion(timeoutMs: number, onStatus?: PrintHooks['onStatus']) {
    const deadline = Date.now() + timeoutMs
    let packet = new Uint8Array(0)
    while (Date.now() < deadline) {
      const chunk = await this.transport.read(STATUS_LENGTH - packet.length, 1000)
      packet = concatBytes([packet, chunk])
      if (packet.length < STATUS_LENGTH) continue

      const status = parseStatus(packet)
      packet = new Uint8Array(0)
      onStatus?.(status)
      if (hasError(status)) throw new PrinterReportedError(status)
      if (status.statusType === StatusType.printingCompleted) return
      if (status.statusType === StatusType.turnedOff) {
        throw new PrinterError('Printer turned off before completing the job.')
      }
    }
    throw new PrinterTimeoutError('Printer did not confirm completion in time.')
  }
}
