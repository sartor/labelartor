<script setup lang="ts">
/** Left / centre / right choice, for text lines or for the text's place on the tape. */
import { computed } from 'vue'

import SegmentedControl, { type SegmentedOption } from '@/components/ui/SegmentedControl.vue'
import type { TextAlign } from '@/core/label'
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconTapeCenter,
  IconTapeEnd,
  IconTapeStart,
} from '@/icons'

const props = withDefaults(defineProps<{ kind?: 'text' | 'tape'; disabled?: boolean }>(), {
  kind: 'text',
  disabled: false,
})

const model = defineModel<TextAlign>({ required: true })

const KINDS: Record<'text' | 'tape', { name: string; options: SegmentedOption<TextAlign>[] }> = {
  text: {
    name: 'Text alignment',
    options: [
      { value: 'left', label: 'Align left', icon: IconAlignLeft },
      { value: 'center', label: 'Align center', icon: IconAlignCenter },
      { value: 'right', label: 'Align right', icon: IconAlignRight },
    ],
  },
  tape: {
    name: 'Text position on the tape',
    options: [
      { value: 'left', label: 'Text at the start of the tape', icon: IconTapeStart },
      { value: 'center', label: 'Text centered on the tape', icon: IconTapeCenter },
      { value: 'right', label: 'Text at the end of the tape', icon: IconTapeEnd },
    ],
  },
}

const kind = computed(() => KINDS[props.kind])
</script>

<template>
  <SegmentedControl
    v-model="model"
    :options="kind.options"
    :disabled="disabled"
    :aria-label="kind.name"
  />
</template>
