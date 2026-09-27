import { defineStore } from 'pinia'
import { computed } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { copyLabels, createProject, type Project } from '@/core/label'
import { PT_P300BT } from '@/core/printer'
import { useQueueStore } from '@/stores/queue'
import { useRasterCacheStore } from '@/stores/rasterCache'
import { useSettingsStore } from '@/stores/settings'

/** Named snapshots of the queue. */
export const useProjectsStore = defineStore('projects', () => {
  const items = usePersistedRef<Project[]>('projects.items', [])
  /** Project the queue was last saved to or loaded from; "Save" writes there. */
  const currentId = usePersistedRef<string | null>('projects.currentId', null)

  const queue = useQueueStore()
  const cache = useRasterCacheStore()
  const settings = useSettingsStore()

  const count = computed(() => items.value.length)
  const find = (id: string) => items.value.find((project) => project.id === id)
  const current = computed(() => (currentId.value ? (find(currentId.value) ?? null) : null))

  /** Tape the queue needs right now, lead included, once every label is rendered. */
  async function queueTapeMm(): Promise<number> {
    const renders = await Promise.all(queue.items.map((entry) => cache.ensure(entry.doc)))
    const lead = settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0
    const total = renders.reduce((sum, render) => sum + render.lengthMm, lead)
    return Math.round(total * 10) / 10
  }

  /** Creates a new project from the queue and makes it current. */
  async function saveAs(name: string): Promise<Project> {
    const project = createProject(name, copyLabels(queue.items), await queueTapeMm())
    items.value.unshift(project)
    currentId.value = project.id
    return project
  }

  /** Writes the queue into the current project. False when there is none. */
  async function save(): Promise<boolean> {
    const project = current.value
    if (!project) return false
    project.labels = copyLabels(queue.items)
    project.tapeMm = await queueTapeMm()
    project.savedAt = Date.now()
    return true
  }

  /** Replaces the queue with the project's labels and makes it current. */
  function load(id: string): boolean {
    const project = find(id)
    if (!project) return false
    queue.items = copyLabels(project.labels)
    currentId.value = id
    return true
  }

  function rename(id: string, name: string) {
    const project = find(id)
    if (project) project.name = name
  }

  function remove(id: string) {
    items.value = items.value.filter((project) => project.id !== id)
    if (currentId.value === id) currentId.value = null
  }

  /** Forgets which project the queue belongs to; the next Save asks for a name. */
  function unlink() {
    currentId.value = null
  }

  /** Adds a project, replacing an existing one with the same id. */
  function upsert(project: Project) {
    const index = items.value.findIndex((p) => p.id === project.id)
    if (index === -1) items.value.unshift(project)
    else items.value.splice(index, 1, project)
  }

  return {
    items,
    count,
    currentId,
    current,
    find,
    saveAs,
    save,
    load,
    rename,
    remove,
    unlink,
    upsert,
  }
})
