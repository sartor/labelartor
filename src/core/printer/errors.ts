import { errorMessages, type PrinterStatus } from './protocol/status'

export class PrinterError extends Error {
  override name = 'PrinterError'
}

export class PrinterTimeoutError extends PrinterError {
  override name = 'PrinterTimeoutError'
}

/** The printer answered, but its status says it cannot take a job right now. */
export class PrinterNotReadyError extends PrinterError {
  override name = 'PrinterNotReadyError'
  constructor(readonly status: PrinterStatus) {
    const errors = errorMessages(status.errors)
    super(`Printer is not ready${errors.length ? `: ${errors.join(', ')}` : ' (busy)'}`)
  }
}

/** The printer reported an error while printing. */
export class PrinterReportedError extends PrinterError {
  override name = 'PrinterReportedError'
  constructor(readonly status: PrinterStatus) {
    const errors = errorMessages(status.errors)
    super(`Printer error: ${errors.length ? errors.join(', ') : 'unknown'}`)
  }
}
