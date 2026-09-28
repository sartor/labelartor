import { defineStore } from 'pinia'
import { computed, watch } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { copyLabels, createEntry, createProject, sameEntries, type Project } from '@/core/label'
import { PT_P300BT } from '@/core/printer'
import { DEFAULT_DOCUMENT } from '@/stores/label'
import { useQueueStore } from '@/stores/queue'
import { useRasterCacheStore } from '@/stores/rasterCache'
import { useSettingsStore } from '@/stores/settings'
import { isoLocalDateTime } from '@/utils/format'

/**
 * Named projects. One is always open: its labels are the ones in the
 * project panel, and every change to them is saved into it at once.
 */
export const useProjectsStore = defineStore('projects', () => {
  const items = usePersistedRef<Project[]>('projects.items', [])
  /** The open project. */
  const currentId = usePersistedRef<string | null>('projects.currentId', null)

  const queue = useQueueStore()
  const cache = useRasterCacheStore()
  const settings = useSettingsStore()

  const count = computed(() => items.value.length)
  const find = (id: string) => items.value.find((project) => project.id === id)
  const current = computed(() => (currentId.value ? (find(currentId.value) ?? null) : null))

  const defaultName = () => `Project ${isoLocalDateTime(Date.now())}`

  /** Tape the open labels need right now, lead included, once every label is rendered. */
  async function queueTapeMm(): Promise<number> {
    const renders = await Promise.all(queue.items.map((entry) => cache.ensure(entry.doc)))
    const lead = settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0
    const total = renders.reduce((sum, render) => sum + render.lengthMm, lead)
    return Math.round(total * 10) / 10
  }

  /** Writes the open labels into the open project, unless they are already there. */
  async function persist() {
    const project = current.value
    if (!project || sameEntries(queue.items, project.labels)) return
    project.labels = copyLabels(queue.items)
    project.savedAt = Date.now()
    const tapeMm = await queueTapeMm()
    // The project may have been switched while the labels rendered.
    if (project.id === currentId.value) project.tapeMm = tapeMm
  }

  /** Replaces the open labels with the project's and makes it the open one. */
  function load(id: string): boolean {
    const project = find(id)
    if (!project) return false
    currentId.value = id
    queue.items = copyLabels(project.labels)
    return true
  }

  /** Creates a project with one default label and opens it. */
  function create(name = defaultName()): Project {
    const project = createProject(name, [createEntry({ ...DEFAULT_DOCUMENT })], 0)
    items.value.unshift(project)
    load(project.id)
    void queueTapeMm().then((mm) => (project.tapeMm = mm))
    return project
  }

  /**
   * Makes sure a project is open. Labels already on screen without one (as
   * left by an older build) become a new project rather than being dropped.
   */
  function ensureCurrent() {
    // Labels on screen win over an older copy in the project (left by a build without autosave).
    if (current.value) return void persist()
    if (queue.count) {
      const project = createProject(defaultName(), copyLabels(queue.items), 0)
      items.value.unshift(project)
      currentId.value = project.id
      void persist()
    } else {
      create()
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
  watch(() => queue.items, persist, { deep: true })

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
