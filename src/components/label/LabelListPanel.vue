<script setup lang="ts" generic="T extends LabelEntry">
/**
 * A folding section of saved labels: count and tape total in the header, a
 * "clear" action behind a confirmation, the labels as tiles that flow in
 * rows. Actions for the selected label appear in the header while one is
 * selected.
 */
import { computed } from 'vue'

import LabelTile from '@/components/label/LabelTile.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import type { LabelEntry } from '@/core/label'
import { IconTrash } from '@/icons'
import { useRasterCacheStore } from '@/stores/rasterCache'

const props = withDefaults(
  defineProps<{
    title: string
    items: T[]
    emptyText: string
    /** Tape counted once on top of the labels, e.g. the lead of a batch. */
    extraMm?: number
    clearLabel?: string
    clearDisabled?: boolean
    /** Entry currently selected (open in the editor). */
    activeId?: string | null
    /** Extra line for a tile's tooltip, e.g. when it was printed. */
    detail?: (entry: T) => string | undefined
    /** Extra text shown after the length in the selected-label group. */
    selectedInfo?: (entry: T) => string | undefined
    /** Appended to the header summary, e.g. the project the queue belongs to. */
    summaryNote?: string
  }>(),
  {
    extraMm: 0,
    clearLabel: 'Clear',
    clearDisabled: false,
    activeId: null,
    detail: undefined,
    selectedInfo: undefined,
    summaryNote: undefined,
  },
)

const emit = defineEmits<{ open: [entry: T]; clear: [] }>()

const open = defineModel<boolean>('open', { default: true })

const cache = useRasterCacheStore()

const selected = computed(() => props.items.find((entry) => entry.id === props.activeId) ?? null)

const totalMm = computed(() =>
  props.items.reduce((sum, entry) => sum + cache.get(entry.doc).lengthMm, props.extraMm),
)

const summary = computed(() => {
  const n = props.items.length
  const note = props.summaryNote ? ` · ${props.summaryNote}` : ''
  if (!n) return `empty${note}`
  return `${n} ${n === 1 ? 'label' : 'labels'} · ${totalMm.value.toFixed(1)} mm tape${note}`
})

function confirmClear() {
  const n = props.items.length
  if (window.confirm(`${props.clearLabel} (${n} ${n === 1 ? 'label' : 'labels'})?`)) emit('clear')
}
</script>

<template>
  <CollapsibleCard v-model:open="open" :title="title">
    <template #meta>{{ summary }}</template>
    <template #actions>
      <div
        v-if="selected"
        class="input-group input-group-sm w-auto"
        role="group"
        aria-label="Selected label"
      >
        <span class="input-group-text">Selected label:</span>
        <slot name="selected-actions" :entry="selected" />
        <span class="input-group-text" title="Tape length of the selected label">
          {{ cache.get(selected.doc).lengthMm.toFixed(1) }} mm
        </span>
        <span v-if="selectedInfo?.(selected)" class="input-group-text">
          {{ selectedInfo(selected) }}
        </span>
      </div>
      <slot name="actions" />
      <button
        type="button"
        class="btn btn-sm btn-outline-danger"
        :disabled="!items.length || clearDisabled"
        @click="confirmClear"
      >
        <AppIcon :icon="IconTrash" class="me-1" />{{ clearLabel }}
      </button>
    </template>

    <p v-if="!items.length" class="text-body-secondary mb-0">{{ emptyText }}</p>
    <div v-else class="d-flex flex-wrap align-items-start gap-2">
      <LabelTile
        v-for="entry in items"
        :key="entry.id"
        :doc="entry.doc"
        :detail="detail?.(entry)"
        :active="entry.id === activeId"
        @open="emit('open', entry)"
      />
    </div>
  </CollapsibleCard>
</template>
