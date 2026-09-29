<script setup lang="ts">
/**
 * Number input with an icon label, optionally with a slider before it and a
 * unit after it. Values typed within the limits apply at once; when the edit
 * is committed the value is clamped and rounded to the step, so a half-typed
 * "0.9" is not clamped at the intermediate "0". The slider moves in coarser
 * `sliderStep`s; the box takes any value to `step`.
 */
import { computed, useId } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import type { IconPath } from '@/icons'

const props = withDefaults(
  defineProps<{
    icon: IconPath
    /** Accessible name of the field. */
    label: string
    min: number
    max: number
    step?: number
    /** Shows a slider moving in these steps. */
    sliderStep?: number
    /** Shown after the box, e.g. "mm". */
    unit?: string
    title?: string
    disabled?: boolean
  }>(),
  { step: 1, sliderStep: undefined, unit: undefined, title: undefined, disabled: false },
)

const model = defineModel<number>({ required: true })
const id = useId()

const decimals = computed(() => (String(props.step).split('.')[1] ?? '').length)
const round = (value: number) => Number(value.toFixed(decimals.value))
const inRange = (value: number) => value >= props.min && value <= props.max

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber
  if (inRange(value)) model.value = round(value)
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.valueAsNumber
  if (Number.isFinite(value)) model.value = round(Math.min(props.max, Math.max(props.min, value)))
  input.value = String(model.value)
}
</script>

<template>
  <div class="input-group flex-nowrap" :title="title">
    <label class="input-group-text" :for="id">
      <AppIcon :icon="icon" />
      <span class="visually-hidden">{{ label }}</span>
    </label>
    <span v-if="sliderStep" class="input-group-text flex-grow-1 bg-body">
      <!-- min/max before value: Vue applies attributes in this order. -->
      <input
        type="range"
        class="form-range"
        :min="min"
        :max="max"
        :step="sliderStep"
        :value="model"
        :disabled="disabled"
        :aria-label="label"
        @input="onInput"
      />
    </span>
    <input
      :id="id"
      type="number"
      class="form-control"
      :class="{ 'flex-grow-0 number-beside-slider': sliderStep }"
      :min="min"
      :max="max"
      :step="step"
      :value="model"
      :disabled="disabled"
      @input="onInput"
      @change="onChange"
    />
    <span v-if="unit" class="input-group-text">{{ unit }}</span>
  </div>
</template>

<style scoped>
.number-beside-slider {
  width: 6rem;
}
</style>
