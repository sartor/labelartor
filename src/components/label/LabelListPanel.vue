<script setup lang="ts" generic="T extends LabelEntry">
/**
 * A folding section of saved labels: count and tape total in the header, an
 * optional "clear" action behind a confirmation, the labels as tiles that
 * flow in rows. Actions for the selected label appear in the header while one is
 * selected. With `reorderable`, tiles can be dragged into a new order (or moved
 * with Alt + arrow keys).
 */
import { computed, nextTick, ref } from 'vue'

import LabelTile from '@/components/label/LabelTile.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CollapsibleCard from '@/components/ui/CollapsibleCard.vue'
import { useDragReorder } from '@/composables/useDragReorder'
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
    /** Label of a "clear the list" button (asks first); no button without it. */
    clearLabel?: string
    /** Entry currently selected (open in the editor). */
    activeId?: string | null
    /** Extra line for a tile's tooltip, e.g. when it was printed. */
    detail?: (entry: T) => string | undefined
    /** Show the tape length of the selected label in its group. */
    selectedLength?: boolean
    /** Extra text shown after the length in the selected-label group. */
    selectedInfo?: (entry: T) => string | undefined
    /** Tiles can be dragged into a new order; `move` reports each step. */
    reorderable?: boolean
  }>(),
  {
    extraMm: 0,
    clearLabel: undefined,
    activeId: null,
    detail: undefined,
    selectedLength: true,
    selectedInfo: undefined,
    reorderable: false,
  },
)

const emit = defineEmits<{ open: [entry: T]; clear: []; move: [id: string, toIndex: number] }>()

const open = defineModel<boolean>('open', { default: true })

const cache = useRasterCacheStore()

const selected = computed(() => props.items.find((entry) => entry.id === props.activeId) ?? null)

const totalMm = computed(() =>
  props.items.reduce((sum, entry) => sum + cache.get(entry.doc).lengthMm, props.extraMm),
)

const summary = computed(() => {
  const n = props.items.length
  if (!n) return 'empty'
  return `${n} ${n === 1 ? 'label' : 'labels'} · ${totalMm.value.toFixed(1)} mm tape`
})

const tiles = ref<HTMLElement | null>(null)
const drag = useDragReorder({
  container: tiles,
  ids: () => props.items.map((entry) => entry.id),
  move: (id, toIndex) => emit('move', id, toIndex),
  enabled: () => props.reorderable,
})

/** Keyboard reordering: Alt + Left / Right moves the focused tile by one. */
async function moveBy(id: string, step: number) {
  if (!props.reorderable) return
  const index = props.items.findIndex((entry) => entry.id === id)
  const to = index + step
  if (index === -1 || to < 0 || to >= props.items.length) return
  emit('move', id, to)
  // Moving the element in the page drops its focus; give it back.
  await nextTick()
  tiles.value?.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)?.focus()
}

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
        <span v-if="selectedLength" class="input-group-text" title="Tape length">
          {{ cache.get(selected.doc).lengthMm.toFixed(1) }} mm
        </span>
        <span v-if="selectedInfo?.(selected)" class="input-group-text">
          {{ selectedInfo(selected) }}
        </span>
      </div>
      <slot name="actions" />
      <button
        v-if="clearLabel"
        type="button"
        class="btn btn-sm btn-outline-danger"
        :title="items.length ? undefined : 'Nothing to clear: the list is empty.'"
        :disabled="!items.length"
        @click="confirmClear"
      >
        <AppIcon :icon="IconTrash" class="me-1" />{{ clearLabel }}
      </button>
    </template>

    <p v-if="!items.length" class="text-body-secondary mb-0">{{ emptyText }}</p>
    <!-- Positioned so tile offsets are measured from here (see useDragReorder). -->
    <div
      v-else
      ref="tiles"
      class="position-relative"
      :class="{ 'user-select-none dragging': drag.draggingId.value }"
      @click.capture="drag.onClickCapture"
    >
      <TransitionGroup tag="div" name="tile" class="d-flex flex-wrap align-items-start gap-2">
        <LabelTile
          v-for="entry in items"
          :key="entry.id"
          :data-entry-id="entry.id"
          :class="{ 'opacity-50': entry.id === drag.draggingId.value }"
          :doc="entry.doc"
          :detail="detail?.(entry)"
          :active="entry.id === activeId"
          @open="emit('open', entry)"
          @pointerdown="drag.onPointerDown($event, entry.id)"
          @keydown.alt.left.prevent="moveBy(entry.id, -1)"
          @keydown.alt.right.prevent="moveBy(entry.id, 1)"
        />
      </TransitionGroup>
    </div>
  </CollapsibleCard>
</template>

<!-- Motion only, which Bootstrap has no utility for: tiles slide to their new place. -->
<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .tile-move {
    transition: transform 150ms ease;
  }
}

.dragging [role='button'] {
  cursor: grabbing;
}
</style>
