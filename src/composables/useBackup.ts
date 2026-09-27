import {
  backupFileName,
  createBackup,
  createProjectFile,
  mergeEntries,
  parseBackup,
  parseProjectFile,
  projectFileName,
  type Project,
} from '@/core/label'
import { useHistoryStore } from '@/stores/history'
import { useProjectsStore } from '@/stores/projects'
import { useQueueStore } from '@/stores/queue'

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/** JSON files in and out: the whole app data, or one project. */
export function useBackup() {
  const queue = useQueueStore()
  const history = useHistoryStore()
  const projects = useProjectsStore()

  function exportAll() {
    download(backupFileName(), createBackup(queue.items, history.items, projects.items))
  }

  /** Adds what the file has and the app lacks (by id); throws BackupError for bad files. */
  async function importAll(
    file: File,
  ): Promise<{ queue: number; history: number; projects: number }> {
    const backup = parseBackup(await file.text())
    const q = mergeEntries(queue.items, backup.queue)
    const h = mergeEntries(history.items, backup.history)
    const p = mergeEntries(projects.items, backup.projects)
    queue.items = q.merged
    history.items = h.merged.sort((a, b) => b.printedAt - a.printedAt)
    projects.items = p.merged
    return { queue: q.added, history: h.added, projects: p.added }
  }

  function exportProject(project: Project) {
    download(projectFileName(project), createProjectFile(project))
  }

  /** Adds the project, replacing one with the same id; throws BackupError for bad files. */
  async function importProject(file: File): Promise<Project> {
    const project = parseProjectFile(await file.text())
    projects.upsert(project)
    return project
  }

  return { exportAll, importAll, exportProject, importProject }
}
