import { computed } from 'vue'

import { useDelayedFlag } from '@/composables/useDelayedFlag'
import { errorMessages } from '@/core/printer'
import { useLabelRenderStore } from '@/stores/labelRender'
import { usePrinterStore } from '@/stores/printer'

export type StatusTone = 'busy' | 'ok' | 'idle' | 'warning' | 'danger'

export interface AppStatus {
  tone: StatusTone
  text: string
  /** Longer explanation for a tooltip. */
  detail?: string
}

/** One-line summary of what the app is doing, most important state first. */
export function useAppStatus() {
  const printer = usePrinterStore()
  const render = useLabelRenderStore()
  const fontLoading = useDelayedFlag(() => render.loadingFont !== null)

  return computed<AppStatus>(() => {
    if (printer.activity === 'printing') {
      const p = printer.progress
      const percent = p && p.total ? Math.round((100 * p.sent) / p.total) : 0
      const b = printer.batch
      const position = b && b.count > 1 ? ` ${b.index + 1}/${b.count} ·` : ''
      return { tone: 'busy', text: `Printing${position} ${percent}%` }
    }
    if (printer.connection === 'connecting') return { tone: 'busy', text: 'Connecting…' }
    if (printer.activity === 'status') return { tone: 'busy', text: 'Reading printer status…' }
    if (fontLoading.value) {
      return { tone: 'busy', text: `Loading font ${render.loadingFontLabel ?? ''}…` }
    }
    if (render.error) return { tone: 'danger', text: 'Render error', detail: render.error }
    if (printer.lastError) {
      return { tone: 'danger', text: 'Printer error', detail: printer.lastError }
    }
    if (!printer.supported) {
      return {
        tone: 'warning',
        text: 'Web Serial unavailable',
        detail: 'Use Chrome or Edge to print',
      }
    }
    if (!printer.isConnected) {
      return {
        tone: 'idle',
        text: 'Printer not connected',
        detail: 'Pair the printer in Bluetooth settings, then connect',
      }
    }
    const errors = printer.status ? errorMessages(printer.status.errors) : []
    if (errors.length) return { tone: 'danger', text: errors.join(', ') }
    return { tone: 'ok', text: 'Printer ready' }
  })
}
