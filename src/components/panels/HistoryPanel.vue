<script setup lang="ts">
/** Printed labels. Clicking one selects it; it can be added back to the project. */
import { ref } from 'vue'

import LabelListPanel from '@/components/label/LabelListPanel.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useOpenInEditor } from '@/composables/useOpenInEditor'
import type { PrintedEntry } from '@/core/label'
import { IconPlaylistAdd, IconTrash } from '@/icons'
import { useHistoryStore } from '@/stores/history'
import { useLabelStore } from '@/stores/label'
import { useSettingsStore } from '@/stores/settings'
import { isoLocalDateTime } from '@/utils/format'

const history = useHistoryStore()
const label = useLabelStore()
const settings = useSettingsStore()
const editor = useOpenInEditor()

const selectedId = ref<string | null>(null)

const printedAt = (entry: PrintedEntry) => `Printed ${isoLocalDateTime(entry.printedAt)}`

/** Adds a copy to the open project and edits it there. */
function addToProject(entry: PrintedEntry) {
  label.addNew(entry.doc)
  selectedId.value = null
  editor.scrollTo('queue')
}

function removeSelected(id: string) {
  history.remove(id)
  selectedId.value = null
}
</script>

<template>
  <LabelListPanel
    v-model:open="settings.openPanes.history"
    title="History"
    :items="history.items"
    :active-id="selectedId"
    :detail="printedAt"
    :selected-info="(entry) => isoLocalDateTime(entry.printedAt)"
    clear-label="Clear history"
    empty-text="Nothing printed yet. Printed labels are kept here so you can print them again."
    @open="(entry) => (selectedId = entry.id)"
    @clear="history.clear()"
  >
    <template #selected-actions="{ entry }">
      <button type="button" class="btn btn-outline-primary" @click="addToProject(entry)">
        <AppIcon :icon="IconPlaylistAdd" class="me-1" />Add to project
      </button>
      <button type="button" class="btn btn-outline-danger" @click="removeSelected(entry.id)">
        <AppIcon :icon="IconTrash" class="me-1" />Delete
      </button>
    </template>
  </LabelListPanel>
</template>
