import { defineStore } from 'pinia'
import { computed, watch } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import {
  copyLabels,
  createDefaultDocument,
  createExampleProject,
  createEntry,
  createProject,
  isLabelEntry,
  sameEntries,
  type Project,
} from '@/core/label'
import { PT_P300BT } from '@/core/printer'
import { useProjectStore } from '@/stores/project'
import { useRasterCacheStore } from '@/stores/rasterCache'
import { useSettingsStore } from '@/stores/settings'
import { isoLocalDateTime } from '@/utils/format'

/**
 * Named projects. One is always open: its labels are the ones in the
 * project panel, and every change to them is saved into it at once.
 */
export const useProjectsStore = defineStore('projects', () => {
  const items = usePersistedRef<Project[]>('projects.items', [])
  // Projects holding labels in an older shape are dropped.
  items.value = items.value.filter(
    (project) => Array.isArray(project?.labels) && project.labels.every(isLabelEntry),
  )
  /** The open project. */
  const currentId = usePersistedRef<string | null>('projects.currentId', null)

  const openProject = useProjectStore()
  const cache = useRasterCacheStore()
  const settings = useSettingsStore()

  const count = computed(() => items.value.length)
  const find = (id: string) => items.value.find((project) => project.id === id)
  const current = computed(() => (currentId.value ? (find(currentId.value) ?? null) : null))

  // The open project's labels are stored on their own. When they are missing
  // (storage cleared), reopen the saved copy instead of saving an empty project over it.
  if (!openProject.items.length && current.value?.labels.length) {
    openProject.items = copyLabels(current.value.labels)
  }

  const defaultName = () => `Project ${isoLocalDateTime(Date.now())}`

  /** Tape the open labels need right now, lead included, once every label is rendered. */
  async function openProjectTapeMm(): Promise<number> {
    const renders = await Promise.all(openProject.items.map((entry) => cache.ensure(entry.doc)))
    const lead = settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0
    const total = renders.reduce((sum, render) => sum + render.lengthMm, lead)
    return Math.round(total * 10) / 10
  }

  /** Writes the open labels into the open project, unless they are already there. */
  async function persist() {
    const project = current.value
    if (!project || sameEntries(openProject.items, project.labels)) return
    project.labels = copyLabels(openProject.items)
    project.savedAt = Date.now()
    const tapeMm = await openProjectTapeMm()
    // The project may have been switched while the labels rendered.
    if (project.id === currentId.value) project.tapeMm = tapeMm
  }

  /** Replaces the open labels with the project's and makes it the open one. */
  function load(id: string): boolean {
    const project = find(id)
    if (!project) return false
    currentId.value = id
    openProject.items = copyLabels(project.labels)
    return true
  }

  /** Adds a new project at the top and opens it. */
  function start(project: Project): Project {
    items.value.unshift(project)
    load(project.id)
    void openProjectTapeMm().then((mm) => {
      const added = find(project.id)
      if (added) added.tapeMm = mm
    })
    return project
  }

  /** Creates a project with one default label and opens it. */
  function create(name = defaultName()): Project {
    return start(createProject(name, [createEntry(createDefaultDocument())], 0))
  }

  /**
   * Makes sure a project is open. Labels already on screen without one (as
   * left by an older build) become a new project rather than being dropped.
   */
  function ensureCurrent() {
    // Labels on screen win over an older copy in the project (left by a build without autosave).
    if (current.value) return void persist()
    if (openProject.count) {
      const project = createProject(defaultName(), copyLabels(openProject.items), 0)
      items.value.unshift(project)
      currentId.value = project.id
      void persist()
    } else if (items.value.length) {
      create()
    } else {
      // First visit: an example project shows what labels can hold.
      start(createExampleProject())
    }
  }

  function rename(id: string, name: string) {
    const project = find(id)
    if (project) project.name = name
  }

  /** Deletes a project; deleting the open one opens the most recent other, or a new one. */
  function remove(id: string) {
    items.value = items.value.filter((project) => project.id !== id)
    if (currentId.value !== id) return
    const next = [...items.value].sort((a, b) => b.savedAt - a.savedAt)[0]
    if (next) load(next.id)
    else create()
  }

  /** Adds a project, replacing one with the same id; the open one is reloaded. */
  function upsert(project: Project) {
    const index = items.value.findIndex((p) => p.id === project.id)
    if (index === -1) items.value.unshift(project)
    else items.value.splice(index, 1, project)
    if (project.id === currentId.value) load(project.id)
  }

  ensureCurrent()
  watch(() => openProject.items, persist, { deep: true })

  return {
    items,
    count,
    currentId,
    current,
    find,
    load,
    create,
    rename,
    remove,
    upsert,
  }
})
