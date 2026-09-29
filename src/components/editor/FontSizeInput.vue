<script setup lang="ts">
/**
 * Font size in dots. The largest value is what fits the tape ("auto", stored
 * as 0 so it keeps following the text); the smallest is a share of it.
 */
import { computed } from 'vue'

import NumberField from '@/components/ui/NumberField.vue'
import { clampFontSize, minFontSize } from '@/core/label'
import { IconTextSize } from '@/icons'

const props = defineProps<{
  /** Largest size that fits the tape for the current text. */
  max: number
  disabled?: boolean
}>()

const model = defineModel<number>({ required: true })

const min = computed(() => minFontSize(props.max))

/** The field shows the effective size; the maximum is stored as auto (0). */
const shown = computed({
  get: () => (model.value > 0 ? clampFontSize(model.value, props.max) : props.max),
  set: (value: number) => (model.value = value >= props.max ? 0 : value),
})

const title = computed(() =>
  props.max ? `Font size, dots: ${min.value}–${props.max}` : 'Font size: type some text first.',
)
</script>

<template>
  <NumberField
    v-model="shown"
    :icon="IconTextSize"
    label="Font size"
    :min="min"
    :max="max"
    :title="title"
    :disabled="disabled || !max"
  />
</template>
