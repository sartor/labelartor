import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { DEFAULT_FONT_FAMILY, isBundledFont } from '@/core/fonts'
import {
  LABEL_ICONS,
  cloneDocument,
  createDefaultDocument,
  createIconBlock,
  createSpaceBlock,
  createTextBlock,
  findLabelIcon,
  insertBlock as insertInto,
  moveBlock as moveIn,
  nearestTextStyle,
  removeBlock,
  sameDocument,
  type BlockKind,
  type IconSize,
  type LabelBlock,
  type LabelDocument,
} from '@/core/label'
import { useProjectStore } from '@/stores/project'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'

/**
 * The label being edited: always one label of the open project, selected in
 * the project panel, and within it one block. Every edit is written into
 * that label at once. The project is never empty; when it would be, a label
 * is added.
 */
export const useLabelStore = defineStore('label', () => {
  const openProject = useProjectStore()
  // First, so the open project is restored from its saved copy before a label is picked.
  useProjectsStore()
  const settings = useSettingsStore()

  /** Working copy of the selected label; changes flow back into the project. */
  const doc = ref<LabelDocument>(createDefaultDocument())
  /** Id of the project label being edited; kept across reloads. */
  const selectedId = usePersistedRef<string | null>('label.selectedId', null)
  /** Id of the block being edited within it; kept across reloads. */
  const selectedBlockId = usePersistedRef<string | null>('label.selectedBlockId', null)

  /** A fresh copy on every change, so watchers see each edit. */
  const document = computed<LabelDocument>(() => cloneDocument(doc.value))

  const block = computed(
    () => doc.value.blocks.find((b) => b.id === selectedBlockId.value) ?? doc.value.blocks[0]!,
  )
  const textBlock = computed(() => (block.value.kind === 'text' ? block.value : null))
  const iconBlock = computed(() => (block.value.kind === 'icon' ? block.value : null))
  const spaceBlock = computed(() => (block.value.kind === 'space' ? block.value : null))

  function show(source: LabelDocument) {
    const next = cloneDocument(source)
    // A label may name a font the app no longer ships.
    for (const b of next.blocks) {
      if (b.kind === 'text' && !isBundledFont(b.fontFamily)) b.fontFamily = DEFAULT_FONT_FAMILY
    }
    doc.value = next
    if (!next.blocks.some((b) => b.id === selectedBlockId.value)) {
      // Start on the first text block, so typing goes straight into it.
      selectedBlockId.value = (next.blocks.find((b) => b.kind === 'text') ?? next.blocks[0]!).id
    }
  }

  /** Makes the project label with `id` the one being edited. */
  function select(id: string) {
    const entry = openProject.find(id)
    if (!entry) return
    if (id !== selectedId.value) selectedBlockId.value = null
    selectedId.value = id
    show(entry.doc)
  }

  /** Adds a copy of `source` to the project and selects it. */
  function addNew(source: LabelDocument): string {
    const entry = openProject.add(source)
    select(entry.id)
    return entry.id
  }

  /** Adds a copy of the label `id` at the end of the project and selects the copy. */
  function clone(id: string) {
    const source = openProject.find(id)
    if (source) addNew(source.doc)
  }

  function selectBlock(id: string) {
    if (doc.value.blocks.some((b) => b.id === id)) selectedBlockId.value = id
  }

  /** Icon a new icon block starts with: the one used last, else the first. */
  const defaultIcon = () => {
    const used = Object.entries(settings.iconLastUsed).sort((a, b) => b[1] - a[1])[0]
    return used && findLabelIcon(used[0]) ? used[0] : LABEL_ICONS[0]!.id
  }

  /** Inserts a new block after the selected one and selects it. */
  function insertBlock(kind: BlockKind) {
    const anchor = block.value.id
    const created: LabelBlock =
      kind === 'text'
        ? createTextBlock('', nearestTextStyle(doc.value, anchor))
        : kind === 'icon'
          ? createIconBlock(defaultIcon())
          : createSpaceBlock()
    if (created.kind === 'icon') settings.markIconUsed(created.icon)
    doc.value = insertInto(doc.value, created, anchor, 'after')
    selectedBlockId.value = created.id
  }

  /** Deletes a block (never the last one) and selects its neighbour. */
  function deleteBlock(id: string) {
    const index = doc.value.blocks.findIndex((b) => b.id === id)
    const next = removeBlock(doc.value, id)
    if (next === doc.value) return
    doc.value = next
    selectedBlockId.value = next.blocks[Math.min(index, next.blocks.length - 1)]!.id
  }

  function moveBlock(id: string, toIndex: number) {
    doc.value = moveIn(doc.value, id, toIndex)
  }

  function setIcon(icon: string) {
    if (!iconBlock.value) return
    iconBlock.value.icon = icon
    settings.markIconUsed(icon)
  }

  function setIconSize(size: IconSize) {
    if (iconBlock.value) iconBlock.value.size = size
  }

  /** Where the selected label was, to pick its neighbour when it goes away. */
  let lastIndex = 0

  /** Keeps a label selected: the neighbour of a removed one, or a new one in an empty project. */
  function ensureSelection() {
    if (!openProject.items.length) {
      const entry = openProject.add(createDefaultDocument())
      select(entry.id)
      return
    }
    const index = openProject.items.findIndex((entry) => entry.id === selectedId.value)
    if (index >= 0) {
      lastIndex = index
      // The label may have been replaced (a project opened, a backup merged).
      if (!sameDocument(openProject.items[index]!.doc, doc.value))
        show(openProject.items[index]!.doc)
      return
    }
    select(openProject.items[Math.min(lastIndex, openProject.items.length - 1)]!.id)
  }

  ensureSelection()
  watch(() => openProject.items.map((entry) => entry.id).join(), ensureSelection)

  // Live editing: every change goes straight into the selected label.
  watch(document, (current) => {
    const entry = selectedId.value ? openProject.find(selectedId.value) : undefined
    if (entry && !sameDocument(entry.doc, current)) openProject.update(entry.id, current)
  })

  return {
    doc,
    document,
    selectedId,
    selectedBlockId,
    block,
    textBlock,
    iconBlock,
    spaceBlock,
    select,
    addNew,
    clone,
    selectBlock,
    insertBlock,
    deleteBlock,
    moveBlock,
    setIcon,
    setIconSize,
  }
})
