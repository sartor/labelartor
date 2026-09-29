<script setup lang="ts">
/** Left / centre / right alignment of a text block's lines. */
import SegmentedControl, { type SegmentedOption } from '@/components/ui/SegmentedControl.vue'
import type { TextAlign } from '@/core/label'
import { IconAlignCenter, IconAlignLeft, IconAlignRight } from '@/icons'

const model = defineModel<TextAlign>({ required: true })

const options: SegmentedOption<TextAlign>[] = [
  { value: 'left', label: 'Align left', icon: IconAlignLeft },
  { value: 'center', label: 'Align center', icon: IconAlignCenter },
  { value: 'right', label: 'Align right', icon: IconAlignRight },
]
</script>

<template>
  <SegmentedControl v-model="model" :options="options" aria-label="Text alignment" />
</template>
