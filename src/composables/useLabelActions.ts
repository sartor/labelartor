import { computed, ref, watch } from 'vue'

import { useHistoryStore } from '@/stores/history'
import { useLabelStore } from '@/stores/label'
import { useLabelRenderStore } from '@/stores/labelRender'
import { usePrinterStore } from '@/stores/printer'

/** Printing the label in the editor on its own. */
export function useLabelActions() {
  const label = useLabelStore()
  const render = useLabelRenderStore()
  const printer = usePrinterStore()
  const history = useHistoryStore()

  /** The last print of this exact label succeeded. */
  const printed = ref(false)
  // The success note refers to the label that was printed; clear it on edits.
  watch(
    () => render.raster,
    () => (printed.value = false),
  )

  const printing = computed(() => printer.activity === 'printing')

  const blockedReason = computed(() => {
    if (!printer.supported) return 'This browser cannot access serial ports.'
    if (!printer.isConnected) return 'Connect the printer first.'
    if (!render.raster) return 'Type some text first.'
    if (printer.activity === 'status') return 'Reading printer status…'
    return null
  })

  /** One-line note on the label's situation, for the panel header. */
  const hint = computed(() => blockedReason.value ?? (printed.value ? 'Label printed' : null))

  async function printLabel() {
    if (!render.raster) return
    printed.value = false
    printed.value = await printer.print(render.raster)
    if (printed.value) history.add(label.document)
  }

  return { printing, blockedReason, hint, printLabel }
}
