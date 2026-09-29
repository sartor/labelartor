<script setup lang="ts">
/**
 * The label's blocks in order, as one button group: click one to edit it,
 * drag one to reorder.
 */
import { ref } from 'vue'

import LabelIconImage from '@/components/editor/LabelIconImage.vue'
import { useDragReorder } from '@/composables/useDragReorder'
import { findLabelIcon, splitLines, type LabelBlock, type TextBlock } from '@/core/label'

const props = defineProps<{ blocks: LabelBlock[]; selectedId: string }>()

const emit = defineEmits<{
  select: [id: string]
  move: [id: string, toIndex: number]
}>()

const group = ref<HTMLElement | null>(null)
// The group is positioned (Bootstrap), so button offsets are measured from it.
const drag = useDragReorder({
  container: group,
  ids: () => props.blocks.map((block) => block.id),
  move: (id, toIndex) => emit('move', id, toIndex),
  enabled: () => props.blocks.length > 1,
})

/** First words of a text block, to tell several apart. */
function snippet(block: TextBlock): string {
  const first = splitLines(block.text)[0]!.trim()
  if (!first) return 'Text'
  return first.length > 12 ? `${first.slice(0, 11)}…` : first
}

/** A text block's snippet, in the page's font at the text field's size. */
const SNIPPET_STYLE = { fontSize: '24px', lineHeight: '30px' }

/** Every block button is this tall, whatever it shows; a space is a square of it. */
const BUTTON_HEIGHT = '48px'
const buttonStyle = (block: LabelBlock) =>
  block.kind === 'space' ? { height: BUTTON_HEIGHT, aspectRatio: '1' } : { height: BUTTON_HEIGHT }

const titleOf = (block: LabelBlock) =>
  block.kind === 'text'
    ? 'Text'
    : block.kind === 'space'
      ? `Space, ${block.lengthMm} mm`
      : (findLabelIcon(block.icon)?.name ?? 'Icon')
</script>

<template>
  <div
    ref="group"
    class="btn-group btn-group-lg flex-wrap"
    role="group"
    aria-label="Blocks"
    :class="{ 'user-select-none': drag.draggingId.value }"
    @click.capture="drag.onClickCapture"
  >
    <button
      v-for="block in blocks"
      :key="block.id"
      type="button"
      class="btn btn-outline-secondary d-flex align-items-center"
      :class="{
        active: block.id === selectedId,
        'opacity-50': block.id === drag.draggingId.value,
      }"
      :data-entry-id="block.id"
      :style="buttonStyle(block)"
      :aria-pressed="block.id === selectedId"
      :title="titleOf(block)"
      @click="emit('select', block.id)"
      @pointerdown="drag.onPointerDown($event, block.id)"
    >
      <template v-if="block.kind === 'text'">
        <span :style="SNIPPET_STYLE">{{ snippet(block) }}</span>
      </template>
      <!-- A space is blank tape, so its button is an empty square; the tooltip gives the length. -->
      <LabelIconImage
        v-else-if="block.kind === 'icon'"
        :icon="block.icon"
        :size="32"
        class="d-block"
      />
    </button>
  </div>
</template>
