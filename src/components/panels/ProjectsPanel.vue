<script setup lang="ts">
/** Saved queues. Clicking one selects it and offers to load it into the queue. */
import { IconDownload, IconPencil, IconTrash, IconUpload } from '@tabler/icons-vue'
import { computed, ref } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import ProjectTile from '@/components/label/ProjectTile.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import { useBackup } from '@/composables/useBackup'
import { useOpenInEditor } from '@/composables/useOpenInEditor'
import type { Project } from '@/core/label'
import { useLabelStore } from '@/stores/label'
import { useProjectsStore } from '@/stores/projects'
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'

const projects = useProjectsStore()
const queue = useQueueStore()
const label = useLabelStore()
const settings = useSettingsStore()
const editor = useOpenInEditor()
const { exportProject, importProject } = useBackup()

const selectedId = ref<string | null>(null)
const selected = computed(() =>
  selectedId.value ? (projects.find(selectedId.value) ?? null) : null,
)
const fileInput = ref<HTMLInputElement | null>(null)

const sorted = computed(() => [...projects.items].sort((a, b) => b.savedAt - a.savedAt))

const summary = computed(() => {
  const n = projects.count
  return n ? `${n} ${n === 1 ? 'project' : 'projects'}` : 'empty'
})

const labelsOf = (project: Project) =>
  `${project.labels.length} ${project.labels.length === 1 ? 'label' : 'labels'} · ${project.tapeMm.toFixed(1)} mm tape`

/** Selects the project and, unless declined, replaces the queue with it. */
function select(project: Project) {
  selectedId.value = project.id
  const n = queue.count
  const question = `Load project “${project.name}”? The current queue (${n} ${n === 1 ? 'label' : 'labels'}) will be replaced.`
  if (n && !window.confirm(question)) return
  projects.load(project.id)
  label.stopEditing()
  editor.scrollTo('queue')
}

function rename(project: Project) {
  const name = window.prompt('Project name', project.name)?.trim()
  if (name) projects.rename(project.id, name)
}

function remove(project: Project) {
  if (!window.confirm(`Delete project “${project.name}”?`)) return
  projects.remove(project.id)
  selectedId.value = null
}

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    selectedId.value = (await importProject(file)).id
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error))
  }
}
</script>

<template>
  <CollapsibleCard v-model:open="settings.openPanes.projects" title="Projects">
    <template #meta>{{ summary }}</template>
    <template #actions>
      <div
        v-if="selected"
        class="input-group input-group-sm w-auto"
        role="group"
        aria-label="Selected project"
      >
        <span class="input-group-text">Selected project:</span>
        <button
          type="button"
          class="btn btn-outline-secondary"
          title="Save the selected project to a file"
          @click="exportProject(selected)"
        >
          <AppIcon :icon="IconDownload" :size="16" class="me-1" />Export
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          title="Rename the selected project"
          @click="rename(selected)"
        >
          <AppIcon :icon="IconPencil" :size="16" class="me-1" />Rename
        </button>
        <button
          type="button"
          class="btn btn-outline-danger"
          title="Delete the selected project"
          @click="remove(selected)"
        >
          <AppIcon :icon="IconTrash" :size="16" class="me-1" />Delete
        </button>
        <span class="input-group-text">{{ labelsOf(selected) }}</span>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        title="Add a project from a file"
        @click="fileInput?.click()"
      >
        <AppIcon :icon="IconUpload" :size="16" class="me-1" />Import project…
      </button>
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

    <p v-if="!projects.count" class="text-body-secondary mb-0">
      No projects yet. Use “Save as project…” in the print queue to keep a set of labels for later.
    </p>
    <div v-else class="d-flex flex-wrap align-items-start gap-2">
      <ProjectTile
        v-for="project in sorted"
        :key="project.id"
        :project="project"
        :active="project.id === selectedId"
        :current="project.id === projects.currentId"
        @open="select(project)"
      />
    </div>
  </CollapsibleCard>
</template>
