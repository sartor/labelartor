<script setup lang="ts">
import { computed } from 'vue'

import LabelListPanel from '@/components/label/LabelListPanel.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useOpenInEditor } from '@/composables/useOpenInEditor'
import type { PrintedEntry } from '@/core/label'
import { IconPlaylistAdd, IconX } from '@/icons'
import { useHistoryStore } from '@/stores/history'
import { useLabelStore } from '@/stores/label'
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'
import { isoLocalDateTime } from '@/utils/format'

const history = useHistoryStore()
const queue = useQueueStore()
const label = useLabelStore()
const settings = useSettingsStore()
const editor = useOpenInEditor()

const activeId = computed(() => (label.editing?.source === 'history' ? label.editing.id : null))

const printedAt = (entry: PrintedEntry) => `Printed ${isoLocalDateTime(entry.printedAt)}`

function queueSelected(entry: PrintedEntry) {
  queue.add(entry.doc)
  editor.scrollTo('queue')
}

function removeSelected(id: string) {
  history.remove(id)
  label.stopEditing()
}
</script>

<template>
  <LabelListPanel
    v-model:open="settings.openPanes.history"
    title="History"
    :items="history.items"
    :active-id="activeId"
    :detail="printedAt"
    :selected-info="(entry) => isoLocalDateTime(entry.printedAt)"
    clear-label="Clear history"
    empty-text="Nothing printed yet. Printed labels are kept here so you can print them again."
    @open="(entry) => editor.open(entry.doc, { source: 'history', id: entry.id })"
    @clear="history.clear()"
  >
    <template #selected-actions="{ entry }">
      <button
        type="button"
        class="btn btn-outline-primary"
        title="Add the selected label to the print queue"
        @click="queueSelected(entry)"
      >
        <AppIcon :icon="IconPlaylistAdd" class="me-1" />Add to queue
      </button>
      <button
        type="button"
        class="btn btn-outline-secondary"
        title="Remove the selected label from the history"
        @click="removeSelected(entry.id)"
      >
        <AppIcon :icon="IconX" class="me-1" />Remove
      </button>
    </template>
  </LabelListPanel>
</template>
