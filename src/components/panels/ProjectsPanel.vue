<script setup lang="ts">
/** All projects. Clicking one selects it; Open switches to it; New project starts one. */
import { computed, ref, watch } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import ProjectTile from '@/components/label/ProjectTile.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import { useBackup } from '@/composables/useBackup'
import { useOpenInEditor } from '@/composables/useOpenInEditor'
import type { Project } from '@/core/label'
import {
  IconDownload,
  IconFolder,
  IconPencil,
  IconPlaylistAdd,
  IconTrash,
  IconUpload,
} from '@/icons'
import { useProjectsStore } from '@/stores/projects'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { WHILE_PRINTING } from '@/utils/messages'
import { isoLocalDateTime } from '@/utils/format'

const projects = useProjectsStore()
const openProject = useProjectStore()
const settings = useSettingsStore()
const editor = useOpenInEditor()
const { exportProject, importProject } = useBackup()

/** A project picked in the list; without one, the open project is the selection. */
const selectedId = ref<string | null>(null)
const selected = computed(
  () => (selectedId.value ? projects.find(selectedId.value) : undefined) ?? projects.current,
)
// Switching projects (Open, New project, deleting the open one) selects the new open one.
watch(
  () => projects.currentId,
  () => (selectedId.value = null),
)
const fileInput = ref<HTMLInputElement | null>(null)

const sorted = computed(() => [...projects.items].sort((a, b) => b.savedAt - a.savedAt))

const summary = computed(() => {
  const n = projects.count
  return n ? `${n} ${n === 1 ? 'project' : 'projects'}` : 'empty'
})

/** Switches to `project`; nothing is lost, the open one is already saved. */
function open(project: Project) {
  projects.load(project.id)
  editor.scrollTo('project')
}

/** Starts a new project with one label and opens it. */
function createProject() {
  const name = window.prompt('Project name', `Project ${isoLocalDateTime(Date.now())}`)?.trim()
  if (!name) return
  projects.create(name)
  editor.scrollTo('project')
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
          class="btn btn-outline-primary"
          :title="openProject.isPrinting ? WHILE_PRINTING : 'Open this project'"
          :disabled="openProject.isPrinting"
          @click="open(selected)"
        >
          <AppIcon :icon="IconFolder" class="me-1" />Open
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          title="Save to a file"
          @click="exportProject(selected)"
        >
          <AppIcon :icon="IconDownload" class="me-1" />Export
        </button>
        <button type="button" class="btn btn-outline-secondary" @click="rename(selected)">
          <AppIcon :icon="IconPencil" class="me-1" />Rename
        </button>
        <button type="button" class="btn btn-outline-danger" @click="remove(selected)">
          <AppIcon :icon="IconTrash" class="me-1" />Delete
        </button>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline-success"
        :title="openProject.isPrinting ? WHILE_PRINTING : 'A new project with one label'"
        :disabled="openProject.isPrinting"
        @click="createProject"
      >
        <AppIcon :icon="IconPlaylistAdd" class="me-1" />New project
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="fileInput?.click()">
        <AppIcon :icon="IconUpload" class="me-1" />Import project…
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

    <div class="d-flex flex-wrap align-items-start gap-2">
      <ProjectTile
        v-for="project in sorted"
        :key="project.id"
        :project="project"
        :active="project.id === selected?.id"
        :current="project.id === projects.currentId"
        @select="selectedId = project.id"
      />
    </div>
  </CollapsibleCard>
</template>
