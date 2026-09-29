<script setup lang="ts">
/**
 * A label icon shown as the exact dots it prints with: the 1-bit bitmap at
 * `size` dots, drawn as squares in the current text colour, `zoom` screen
 * pixels per dot. `box` pads it to a taller box, centred (to sit in text).
 */
import { computed } from 'vue'

import { bitmapPath, findLabelIcon, iconBitmap } from '@/core/label'

const props = withDefaults(
  defineProps<{ icon: string; size: number; zoom?: number; box?: number }>(),
  {
    zoom: 1,
    box: 0,
  },
)

const bitmap = computed(() => {
  const icon = findLabelIcon(props.icon)
  return icon ? iconBitmap(icon, props.size) : null
})
const path = computed(() => (bitmap.value ? bitmapPath(bitmap.value) : ''))
const boxHeight = computed(() => Math.max(props.box, props.size))
/** Whole dots of padding above, so the drawing stays on the pixel grid. */
const inset = computed(() => Math.floor((boxHeight.value - props.size) / 2))
</script>

<template>
  <svg
    v-if="bitmap"
    :width="bitmap.width * zoom"
    :height="boxHeight * zoom"
    :viewBox="`0 ${-inset} ${bitmap.width} ${boxHeight}`"
    fill="currentColor"
    shape-rendering="crispEdges"
    class="align-text-top"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>
