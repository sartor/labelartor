<script setup lang="ts">
/**
 * Inline icon from `@/icons`. The drawing is always 16 px, on a 16-unit grid
 * with whole-number coordinates, so every straight edge lands on a pixel
 * boundary. `size` is the box it sits in: 16 for small buttons, menu items
 * and input-group addons; 20 for regular-size buttons, whose 20 px line box
 * would otherwise show a 16 px icon 2 px too high.
 */
import { computed } from 'vue'

import type { IconPath } from '@/icons'

const props = withDefaults(defineProps<{ icon: IconPath; size?: 16 | 20 }>(), { size: 16 })

// Centres the drawing in the box by a whole number of pixels.
const viewBox = computed(() => {
  const inset = (props.size - 16) / 2
  return `${-inset} ${-inset} ${props.size} ${props.size}`
})
</script>

<template>
  <!-- text-top: the box starts at the top of the line box, where its height centres the drawing. -->
  <svg
    :width="size"
    :height="size"
    :viewBox="viewBox"
    fill="currentColor"
    fill-rule="evenodd"
    class="align-text-top"
    aria-hidden="true"
  >
    <path :d="icon" />
  </svg>
</template>
