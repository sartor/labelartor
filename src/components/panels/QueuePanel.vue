<script setup lang="ts">
import { computed } from 'vue'

import LabelListPanel from '@/components/label/LabelListPanel.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useOpenInEditor } from '@/composables/useOpenInEditor'
import { PT_P300BT } from '@/core/printer'
import { IconDeviceFloppy, IconHistory, IconPrinter, IconX } from '@/icons'
import { useLabelStore } from '@/stores/label'
import { usePrinterStore } from '@/stores/printer'
import { useProjectsStore } from '@/stores/projects'
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'
import { isoLocalDateTime } from '@/utils/format'

const queue = useQueueStore()
const printer = usePrinterStore()
const projects = useProjectsStore()
const label = useLabelStore()
const settings = useSettingsStore()
const editor = useOpenInEditor()

const activeId = computed(() => (label.editing?.source === 'queue' ? label.editing.id : null))

const printLabel = computed(() => {
  const p = queue.printing
  return p ? `Printing ${p.index + 1}/${p.count}…` : `Print queue (${queue.count})`
})

const printBlocked = computed(() => {
  if (!printer.supported) return 'This browser cannot access serial ports.'
  if (!printer.isConnected) return 'Connect the printer first.'
  if (!queue.count) return 'The queue is empty.'
  if (!printer.canPrint) return 'The printer is busy.'
  return null
})

const projectNote = computed(() =>
  projects.current ? `project “${projects.current.name}”` : undefined,
)

/** The browser's own prompt; null when cancelled (or blocked by the host). */
function askName(fallback: string): string | null {
  const name = window.prompt('Project name', fallback)?.trim()
  return name || null
}

/** Saves into the current project, or asks for a name when there is none yet. */
async function save() {
  if (projects.current) {
    await projects.save()
  } else {
    const name = askName(`Labels ${isoLocalDateTime(Date.now())}`)
    if (!name) return
    await projects.saveAs(name)
  }
  editor.scrollTo('projects')
}

async function saveAs() {
  const name = askName(projects.current ? `${projects.current.name} copy` : '')
  if (!name) return
  await projects.saveAs(name)
  editor.scrollTo('projects')
}

function moveSelectedToHistory(id: string) {
  queue.moveToHistory(id)
  label.stopEditing()
}

function removeSelected(id: string) {
  queue.remove(id)
  label.stopEditing()
}

function clear() {
  if (label.editing?.source === 'queue') label.stopEditing()
  queue.clear()
  projects.unlink()
}
</script>

<template>
  <LabelListPanel
    v-model:open="settings.openPanes.queue"
    title="Print queue"
    :items="queue.items"
    :extra-mm="settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0"
    :summary-note="projectNote"
    :active-id="activeId"
    :clear-disabled="queue.isPrinting"
    clear-label="Clear queue"
    empty-text="No labels queued. Use “Add to queue” in the Text panel to collect labels and print them in one go."
    @open="(entry) => editor.open(entry.doc, { source: 'queue', id: entry.id })"
    @clear="clear"
  >
    <template #selected-actions="{ entry }">
      <button
        type="button"
        class="btn btn-outline-secondary"
        title="Move the selected label to the history without printing"
        :disabled="queue.isPrinting"
        @click="moveSelectedToHistory(entry.id)"
      >
        <AppIcon :icon="IconHistory" class="me-1" />Move to history
      </button>
      <button
        type="button"
        class="btn btn-outline-secondary"
        title="Remove the selected label from the queue"
        :disabled="queue.isPrinting"
        @click="removeSelected(entry.id)"
      >
        <AppIcon :icon="IconX" class="me-1" />Remove
      </button>
    </template>
    <template #actions>
      <span class="d-inline-block" :title="printBlocked ?? 'Print all queued labels back to back'">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          :disabled="!!printBlocked || queue.isPrinting"
          @click="queue.printAll()"
        >
          <span
            v-if="queue.isPrinting"
            class="spinner-border spinner-border-sm me-1"
            aria-hidden="true"
          />
          <AppIcon v-else :icon="IconPrinter" class="me-1" />{{ printLabel }}
        </button>
      </span>
      <div class="btn-group btn-group-sm" role="group" aria-label="Save the queue as a project">
        <button
          type="button"
          class="btn btn-outline-secondary"
          :title="
            projects.current
              ? `Save the queue into project “${projects.current.name}”`
              : 'Save the queue as a new project'
          "
          :disabled="!queue.count || queue.isPrinting"
          @click="save"
        >
          <AppIcon :icon="IconDeviceFloppy" class="me-1" />
          {{ projects.current ? 'Save' : 'Save as project…' }}
        </button>
        <button
          v-if="projects.current"
          type="button"
          class="btn btn-outline-secondary"
          title="Save the queue as a new project"
          :disabled="!queue.count || queue.isPrinting"
          @click="saveAs"
        >
          Save as…
        </button>
      </div>
    </template>
  </LabelListPanel>
</template>
