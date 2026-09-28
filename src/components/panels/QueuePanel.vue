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
import { useQueueStore } from '@/stores/queue'
import { useSettingsStore } from '@/stores/settings'

const queue = useQueueStore()
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
  const p = queue.printing
  return p ? `Printing ${p.index + 1}/${p.count}…` : `Print all (${queue.count})`
})

const printBlocked = computed(() => {
  if (!printer.supported) return 'This browser cannot access serial ports.'
  if (!printer.isConnected) return 'Connect the printer first.'
  if (!queue.count) return 'There are no labels to print.'
  if (!printer.canPrint) return 'The printer is busy.'
  return null
})

/**
 * Adds a copy of the selected label at the end and selects its text, so
 * typing replaces it: a new label in the same style.
 */
async function newLabel(id: string) {
  label.clone(id)
  await nextTick()
  const input = document.querySelector<HTMLTextAreaElement>('#text textarea')
  input?.focus()
  input?.select()
}
</script>

<template>
  <LabelListPanel
    v-model:open="settings.openPanes.queue"
    :title="title"
    :items="queue.items"
    :extra-mm="settings.showTapeLead ? PT_P300BT.unusedLeadMm : 0"
    :active-id="label.selectedId"
    :selected-length="false"
    empty-text="No labels yet."
    @open="(entry) => label.select(entry.id)"
  >
    <template #selected-actions="{ entry }">
      <button
        type="button"
        class="btn btn-outline-danger"
        :disabled="queue.isPrinting"
        @click="queue.remove(entry.id)"
      >
        <AppIcon :icon="IconTrash" class="me-1" />Delete
      </button>
    </template>
    <template #actions>
      <button
        type="button"
        class="btn btn-sm btn-outline-success"
        title="Copy of the selected label"
        :disabled="!label.selectedId || queue.isPrinting"
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
      <span class="d-inline-block" :title="printBlocked ?? undefined">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          :disabled="!!printBlocked || queue.isPrinting"
          @click="queue.printAll()"
        >
          <span
            v-if="queue.isPrinting"
            class="spinner-border spinner-border-sm me-1"
            aria-hidden="true"
          />
          <AppIcon v-else :icon="IconPrinter" class="me-1" />{{ printLabel }}
        </button>
      </span>
    </template>
  </LabelListPanel>
</template>
