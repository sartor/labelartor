<script setup lang="ts">
/** Export / import of everything (open project, history, projects) as one JSON file. */
import { ref } from 'vue'

import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useBackup } from '@/composables/useBackup'
import { useOpenInEditor } from '@/composables/useOpenInEditor'
import { IconDatabase, IconDownload, IconUpload } from '@/icons'

const { exportAll, importAll } = useBackup()
const editor = useOpenInEditor()
const fileInput = ref<HTMLInputElement | null>(null)

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const added = await importAll(file)
    window.alert(
      `Imported ${added.openProject} ${added.openProject === 1 ? 'label' : 'labels'} into the open project, ` +
        `${added.history} into the history and ${added.projects} ` +
        `${added.projects === 1 ? 'project' : 'projects'}.`,
    )
    editor.scrollTo('project')
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error))
  }
}
</script>

<template>
  <AppDropdown align="end" toggle-class="btn btn-sm btn-outline-secondary" title="Backup">
    <template #toggle>
      <AppIcon :icon="IconDatabase" />
      <span class="visually-hidden">Backup</span>
    </template>
    <li>
      <button type="button" class="dropdown-item" @click="exportAll">
        <AppIcon :icon="IconDownload" class="me-2" />Export everything
      </button>
    </li>
    <li>
      <button type="button" class="dropdown-item" @click="fileInput?.click()">
        <AppIcon :icon="IconUpload" class="me-2" />Import from file…
      </button>
    </li>
  </AppDropdown>
  <input
    ref="fileInput"
    type="file"
    accept="application/json,.json"
    class="d-none"
    aria-hidden="true"
    tabindex="-1"
    @change="onFileChosen"
  />
</template>
