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
import { useProjectStore } from '@/stores/project'
import { useUserIconsStore } from '@/stores/userIcons'

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
  const openProject = useProjectStore()
  const history = useHistoryStore()
  const projects = useProjectsStore()
  const userIcons = useUserIconsStore()

  function exportAll() {
    download(
      backupFileName(),
      createBackup(openProject.items, history.items, projects.items, userIcons.items),
    )
  }

  /** Adds what the file has and the app lacks (by id); throws BackupError for bad files. */
  async function importAll(
    file: File,
  ): Promise<{ openProject: number; history: number; projects: number }> {
    const backup = parseBackup(await file.text())
    // Icons first, so the labels that use them render with them.
    userIcons.merge(backup.userIcons)
    const o = mergeEntries(openProject.items, backup.openProject)
    const h = mergeEntries(history.items, backup.history)
    const p = mergeEntries(projects.items, backup.projects)
    openProject.items = o.merged
    history.items = h.merged.sort((a, b) => b.printedAt - a.printedAt)
    projects.items = p.merged
    return { openProject: o.added, history: h.added, projects: p.added }
  }

  function exportProject(project: Project) {
    download(projectFileName(project), createProjectFile(project, userIcons.items))
  }

  /** Adds the project, replacing one with the same id; throws BackupError for bad files. */
  async function importProject(file: File): Promise<Project> {
    const { project, userIcons: icons } = parseProjectFile(await file.text())
    userIcons.merge(icons)
    projects.upsert(project)
    return project
  }

  return { exportAll, importAll, exportProject, importProject }
}
