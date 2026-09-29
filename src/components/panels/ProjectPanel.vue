<script setup lang="ts">
/**
 * The open project, titled with its name: its labels, one of which is always
 * being edited, printed as one batch. Every change is saved at once.
 */
import { computed, nextTick } from 'vue'

import LabelListPanel from '@/components/label/LabelListPanel.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import SegmentedControl, { type SegmentedOption } from '@/components/ui/SegmentedControl.vue'
import { PT_P300BT, TAPES } from '@/core/printer'
import { IconPlaylistAdd, IconPrinter, IconTrash } from '@/icons'
import { useLabelStore } from '@/stores/label'
import { usePrinterStore } from '@/stores/printer'
import { useProjectsStore } from '@/stores/projects'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { WHILE_PRINTING } from '@/utils/messages'

const openProject = useProjectStore()
const printer = usePrinterStore()
const projects = useProjectsStore()
const label = useLabelStore()
const settings = useSettingsStore()

const title = computed(() => projects.current?.name ?? 'Project')

/** Tape widths the app supports, widest first. */
const tapeOptions: SegmentedOption<number>[] = TAPES.filter((tape) => tape.widthMm >= 6)
  .map((tape) => ({ value: tape.widthMm, label: `${tape.widthMm} mm` }))
  .reverse()

const printLabel = computed(() => {
  const p = openProject.printing
  return p ? `Printing ${p.index + 1}/${p.count}…` : `Print all (${openProject.count})`
})

const printBlocked = computed(
  () => printer.printBlocked ?? (openProject.count ? null : 'There are no labels to print.'),
)

/** Title of a button that is disabled while the project prints. */
const unlessPrinting = (title: string) => (openProject.isPrinting ? WHILE_PRINTING : title)

/**
 * Adds a copy of the selected label at the end and selects its text, so
 * typing replaces it: a new label in the same style.
 */
async function newLabel(id: string) {
  label.clone(id)
  await nextTick()
  const input = document.querySelector<HTMLTextAreaElement>('#content textarea')
  input?.focus()
  input?.select()
}
</script>

<template>
  <LabelListPanel
    v-model:open="settings.openPanes.project"
    :title="title"
    :items="openProject.items"
    :extra-mm="settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0"
    :active-id="label.selectedId"
    :selected-length="false"
    :reorderable="!openProject.isPrinting"
    empty-text="No labels yet."
    @open="(entry) => label.select(entry.id)"
    @move="openProject.move"
  >
    <template #selected-actions="{ entry }">
      <button
        type="button"
        class="btn btn-outline-danger"
        :title="unlessPrinting('Delete this label')"
        :disabled="openProject.isPrinting"
        @click="openProject.remove(entry.id)"
      >
        <AppIcon :icon="IconTrash" class="me-1" />Delete
      </button>
    </template>
    <template #actions>
      <button
        type="button"
        class="btn btn-sm btn-outline-success"
        :title="unlessPrinting('Copy of the selected label')"
        :disabled="!label.selectedId || openProject.isPrinting"
        @click="label.selectedId && newLabel(label.selectedId)"
      >
        <AppIcon :icon="IconPlaylistAdd" class="me-1" />New label
      </button>
      <span class="d-inline-block" title="Follows the loaded tape">
        <SegmentedControl
          v-model="settings.tapeWidthMm"
          :options="tapeOptions"
          prefix="Tape width"
          size="sm"
          aria-label="Tape width"
        />
      </span>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        :title="printBlocked ?? 'Print every label of the project'"
        :disabled="!!printBlocked || openProject.isPrinting"
        @click="openProject.printAll()"
      >
        <span
          v-if="openProject.isPrinting"
          class="spinner-border spinner-border-sm me-1"
          aria-hidden="true"
        />
        <AppIcon v-else :icon="IconPrinter" class="me-1" />{{ printLabel }}
      </button>
    </template>
  </LabelListPanel>
</template>
