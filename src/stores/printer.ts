import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import {
  PT_P300BT,
  PtPrinter,
  WebSerialTransport,
  describeStatus,
  tapeForReportedWidth,
  type BatchPrintHooks,
  type PrintOptions,
  type PrinterStatus,
  type RasterImage,
  type TapeSpec,
} from '@/core/printer'
import { useSettingsStore } from '@/stores/settings'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected'
export type PrinterActivity = 'idle' | 'status' | 'printing'
export type BatchHooks = Pick<BatchPrintHooks, 'onJobStart' | 'onJobDone'>

export const usePrinterStore = defineStore('printer', () => {
  const settings = useSettingsStore()
  const supported = WebSerialTransport.isSupported()
  const connection = ref<ConnectionState>('disconnected')
  const activity = ref<PrinterActivity>('idle')
  const status = shallowRef<PrinterStatus | null>(null)
  /** Raster lines sent of the label being printed. */
  const progress = ref<{ sent: number; total: number } | null>(null)
  /** Position within the batch being printed. */
  const batch = ref<{ index: number; count: number } | null>(null)
  /** Message of the last failed operation; cleared when the next one starts. */
  const lastError = ref<string | null>(null)
  /** Reopen the last printer on load; off after a deliberate disconnect. */
  const autoConnect = usePersistedRef('printer.autoConnect', true)

  // Device handles are not reactive state.
  let transport: WebSerialTransport | null = null
  let printer: PtPrinter | null = null
  let stopWatchingDisconnect: (() => void) | null = null

  const isConnected = computed(() => connection.value === 'connected')
  const canPrint = computed(() => isConnected.value && activity.value === 'idle')
  /** Why nothing can be printed right now (for disabled print buttons), or null. */
  const printBlocked = computed(() => {
    if (!supported) return 'This browser cannot access serial ports.'
    if (connection.value === 'connecting') return 'Connecting to the printer…'
    if (!isConnected.value) return 'The printer is not connected.'
    if (activity.value === 'printing') return 'Printing…'
    if (activity.value === 'status') return 'Reading the printer status…'
    return null
  })
  const statusInfo = computed(() => (status.value ? describeStatus(status.value) : null))
  /** Tape labels are designed for: the chosen width, which follows the printer's tape. */
  const tape = computed<TapeSpec>(
    () => tapeForReportedWidth(settings.tapeWidthMm) ?? PT_P300BT.defaultTape,
  )
  // The printer knows what is loaded; every status report updates the choice.
  watch(status, (current) => {
    const loaded = current && tapeForReportedWidth(current.mediaWidthMm)
    if (loaded) settings.tapeWidthMm = loaded.widthMm
  })

  function fail(error: unknown) {
    lastError.value = error instanceof Error ? error.message : String(error)
  }

  function releaseDevice() {
    const current = transport
    stopWatchingDisconnect?.()
    stopWatchingDisconnect = null
    transport = null
    printer = null
    status.value = null
    progress.value = null
    batch.value = null
    activity.value = 'idle'
    connection.value = 'disconnected'
    return current
  }

  /** Opens `port` and reads the first status. Resolves to false when opening fails. */
  async function open(port: SerialPort, { quiet = false } = {}): Promise<boolean> {
    connection.value = 'connecting'
    const candidate = new WebSerialTransport(port)
    try {
      await candidate.open()
    } catch (error) {
      candidate.dispose()
      connection.value = 'disconnected'
      if (!quiet) fail(error)
      return false
    }

    transport = candidate
    printer = new PtPrinter(candidate)
    stopWatchingDisconnect = candidate.onDisconnect(handleConnectionLost)
    connection.value = 'connected'
    autoConnect.value = true
    await refreshStatus()
    return true
  }

  /** Lets the user pick the printer in the browser's chooser. */
  async function connect() {
    if (!supported || connection.value !== 'disconnected') return
    lastError.value = null
    try {
      await open(await WebSerialTransport.requestPort())
    } catch (error) {
      // NotFoundError = the user closed the chooser without picking a port.
      if (!(error instanceof DOMException && error.name === 'NotFoundError')) fail(error)
    }
  }

  /**
   * Reopens a printer the browser already granted access to, without the
   * chooser. Quiet on failure (the printer may simply be off).
   */
  async function reconnect() {
    if (!supported || !autoConnect.value || connection.value !== 'disconnected') return
    const [port] = await WebSerialTransport.grantedPorts()
    if (port) await open(port, { quiet: true })
  }

  async function disconnect() {
    autoConnect.value = false
    const current = releaseDevice()
    if (!current) return
    await current.close()
    current.dispose()
  }

  function handleConnectionLost() {
    const current = releaseDevice()
    fail(new Error('Printer connection lost.'))
    void current?.close().finally(() => current.dispose())
  }

  /**
   * Asks the printer for its current status. `keepError` leaves the message
   * of a failed print in place when this runs right after it.
   */
  async function refreshStatus({ keepError = false } = {}) {
    if (!printer || activity.value !== 'idle') return
    activity.value = 'status'
    if (!keepError) lastError.value = null
    try {
      status.value = await printer.getStatus()
    } catch (error) {
      fail(error)
    } finally {
      if (activity.value === 'status') activity.value = 'idle'
    }
  }

  /**
   * Prints labels back to back (one tape lead for the whole batch).
   * Resolves to true when the printer confirmed every label; on failure
   * `lastError` says why and `onJobDone` told how many made it.
   */
  async function printBatch(
    rasters: readonly RasterImage[],
    hooks: BatchHooks = {},
    options: PrintOptions = {},
  ): Promise<boolean> {
    if (!printer || !canPrint.value || !rasters.length) return false
    activity.value = 'printing'
    lastError.value = null
    let ok = false
    try {
      await printer.printBatch(rasters, options, {
        onJobStart: (index, count) => {
          batch.value = { index, count }
          progress.value = { sent: 0, total: rasters[index]!.lines }
          hooks.onJobStart?.(index, count)
        },
        onJobDone: (index, count) => hooks.onJobDone?.(index, count),
        onProgress: (sent, total) => (progress.value = { sent, total }),
        onStatus: (s) => (status.value = s),
      })
      ok = true
    } catch (error) {
      fail(error)
    } finally {
      if (activity.value === 'printing') activity.value = 'idle'
      progress.value = null
      batch.value = null
    }
    // The packets received while printing still say "printing"; ask again.
    await refreshStatus({ keepError: true })
    return ok
  }

  /** Prints one label. Resolves to true when the printer confirmed it. */
  const print = (raster: RasterImage, options: PrintOptions = {}) =>
    printBatch([raster], {}, options)

  return {
    supported,
    connection,
    activity,
    status,
    statusInfo,
    tape,
    progress,
    batch,
    lastError,
    isConnected,
    canPrint,
    printBlocked,
    connect,
    reconnect,
    disconnect,
    refreshStatus,
    print,
    printBatch,
  }
})
