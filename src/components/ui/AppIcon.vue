<script setup lang="ts">
/**
 * Inline SVG icon (Tabler) sized to sit in Bootstrap text and buttons.
 * Sizes are whole pixels so the strokes stay crisp: 16 in `btn-sm` and menu
 * items, 18 in regular text and buttons, 22 in `btn-lg`.
 */
import type { Component } from 'vue'

withDefaults(defineProps<{ icon: Component; size?: number }>(), { size: 18 })
</script>

<template>
  <!-- text-top keeps the icon centred on the text's capitals; middle sits ~1.5px low. -->
  <component :is="icon" :size="size" class="align-text-top" aria-hidden="true" />
</template>
