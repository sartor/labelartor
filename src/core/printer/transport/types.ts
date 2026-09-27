/** Byte-stream connection to a printer (Web Serial today, maybe WebBluetooth/USB later). */
export interface PrinterTransport {
  readonly isOpen: boolean
  open(): Promise<void>
  close(): Promise<void>
  write(data: Uint8Array): Promise<void>
  /** Resolves with exactly `length` bytes, or fewer if `timeoutMs` elapses first. */
  read(length: number, timeoutMs: number): Promise<Uint8Array>
  /** Drop any bytes received but not yet read. */
  clearInput(): void
  /** Called when the device goes away unexpectedly. Returns an unsubscribe function. */
  onDisconnect(listener: () => void): () => void
}
