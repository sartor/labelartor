/**
 * Web Serial transport. Chrome/Edge (117+) reach Bluetooth Classic RFCOMM/SPP
 * devices such as the PT-P300BT directly through Web Serial, no OS COM port
 * required; a paired printer exposed as a COM port works as well.
 */

import { PT_P300BT } from '../device'
import { ByteQueue } from './byte-queue'
import type { PrinterTransport } from './types'

export interface WebSerialOptions {
  baudRate?: number
}

export class WebSerialTransport implements PrinterTransport {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readLoop: Promise<void> | null = null
  private readonly queue = new ByteQueue()
  private readonly disconnectListeners = new Set<() => void>()
  /** `lost` = the device went away while open; resources still need releasing. */
  private state: 'closed' | 'open' | 'lost' = 'closed'

  constructor(
    readonly port: SerialPort,
    private readonly options: WebSerialOptions = {},
  ) {
    port.addEventListener('disconnect', this.handleDisconnect)
  }

  static isSupported(): boolean {
    // Some browsers expose `navigator.serial` without a working chooser.
    return (
      typeof navigator !== 'undefined' &&
      'serial' in navigator &&
      typeof navigator.serial.requestPort === 'function'
    )
  }

  /** Ports the user granted earlier; they can be opened without the chooser. */
  static grantedPorts(): Promise<SerialPort[]> {
    return WebSerialTransport.isSupported() ? navigator.serial.getPorts() : Promise.resolve([])
  }

  /** Shows the browser's port chooser. Must be called from a user gesture. */
  static async requestPort(): Promise<SerialPort> {
    try {
      return await navigator.serial.requestPort({
        allowedBluetoothServiceClassIds: [PT_P300BT.serial.sppServiceClassId],
      })
    } catch (error) {
      // Older Chromium builds reject the Bluetooth option; retry without it.
      if (error instanceof TypeError) return navigator.serial.requestPort()
      throw error
    }
  }

  get isOpen(): boolean {
    return this.state === 'open'
  }

  async open(): Promise<void> {
    if (this.state !== 'closed') return
    await this.port.open({ baudRate: this.options.baudRate ?? PT_P300BT.serial.baudRate })
    this.state = 'open'
    this.writer = this.port.writable!.getWriter()
    // Web Serial does not assert DTR/RTS on open (pyserial does); the printer
    // stays silent until they are set.
    try {
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true })
    } catch {
      // Not every port supports modem signals.
    }
    this.readLoop = this.runReadLoop()
  }

  async close(): Promise<void> {
    if (this.state === 'closed') return
    this.state = 'closed'
    try {
      await this.reader?.cancel()
    } catch {
      // Stream already errored.
    }
    await this.readLoop
    this.readLoop = null
    this.writer?.releaseLock()
    this.writer = null
    try {
      await this.port.close()
    } catch {
      // Port already gone (device disconnected).
    }
    this.queue.clear()
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error('Serial port is not open')
    await this.writer.write(data)
  }

  read(length: number, timeoutMs: number): Promise<Uint8Array> {
    return this.queue.read(length, timeoutMs)
  }

  clearInput(): void {
    this.queue.clear()
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener)
    return () => this.disconnectListeners.delete(listener)
  }

  /** Stop listening for port events; call when discarding the transport. */
  dispose(): void {
    this.port.removeEventListener('disconnect', this.handleDisconnect)
    this.disconnectListeners.clear()
  }

  private async runReadLoop(): Promise<void> {
    // A readable stream can be replaced after a non-fatal error (e.g. a
    // framing error), so keep reading while the port stays open.
    while (this.state === 'open' && this.port.readable) {
      this.reader = this.port.readable.getReader()
      try {
        for (;;) {
          const { value, done } = await this.reader.read()
          if (done) break
          if (value) this.queue.push(value)
        }
      } catch {
        // Non-fatal read error or cancellation; the loop condition decides.
      } finally {
        this.reader.releaseLock()
        this.reader = null
      }
    }
  }

  private readonly handleDisconnect = () => {
    if (this.state !== 'open') return
    this.state = 'lost'
    for (const listener of this.disconnectListeners) listener()
  }
}
