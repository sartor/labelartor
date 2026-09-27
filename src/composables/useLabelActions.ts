import { computed, ref, watch } from 'vue'

import { useOpenInEditor } from '@/composables/useOpenInEditor'
import { useHistoryStore } from '@/stores/history'
import { useLabelStore } from '@/stores/label'
import { useLabelRenderStore } from '@/stores/labelRender'
import { usePrinterStore } from '@/stores/printer'
import { useQueueStore } from '@/stores/queue'

/** What can be done with the label in the editor: print, queue, or save it back. */
export function useLabelActions() {
  const label = useLabelStore()
  const render = useLabelRenderStore()
  const printer = usePrinterStore()
  const queue = useQueueStore()
  const history = useHistoryStore()
  const editor = useOpenInEditor()

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

  const canQueue = computed(() => render.raster !== null)

  const editingFrom = computed(() =>
    label.editing?.source === 'queue'
      ? 'the queue'
      : label.editing?.source === 'history'
        ? 'the history'
        : null,
  )

  /** One-line note on the label's situation, for the panel header. */
  const hint = computed(() => {
    if (editingFrom.value) return `Editing a label from ${editingFrom.value}`
    if (blockedReason.value) return blockedReason.value
    return printed.value ? 'Label printed' : null
  })

  async function printLabel() {
    if (!render.raster) return
    printed.value = false
    printed.value = await printer.print(render.raster)
    if (printed.value) history.add(label.document)
  }

  function addToQueue() {
    queue.add(label.document)
    editor.scrollTo('queue')
  }

  /** Writes the changes back into the queued label being edited. */
  function saveAndReturn() {
    const from = label.editing
    if (from?.source !== 'queue') return
    if (!queue.update(from.id, label.document)) queue.add(label.document)
    label.stopEditing()
    editor.scrollTo('queue')
  }

  function cancelEditing() {
    label.stopEditing()
  }

  return {
    printing,
    blockedReason,
    editingFrom,
    hint,
    canQueue,
    printLabel,
    addToQueue,
    saveAndReturn,
    cancelEditing,
  }
}
