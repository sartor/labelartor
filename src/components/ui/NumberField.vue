<script setup lang="ts">
/**
 * Number input with an icon label. Values typed within the limits apply at
 * once; when the edit is committed the value is clamped and rounded to the
 * step, so a half-typed "0.9" is not clamped at the intermediate "0".
 */
import { computed, useId, type Component } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    icon: Component
    /** Accessible name of the field. */
    label: string
    min: number
    max: number
    step?: number
    title?: string
    disabled?: boolean
  }>(),
  { step: 1, title: undefined, disabled: false },
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
  <div class="input-group" :title="title">
    <label class="input-group-text" :for="id">
      <AppIcon :icon="icon" />
      <span class="visually-hidden">{{ label }}</span>
    </label>
    <!-- min/max before value: Vue applies attributes in this order. -->
    <input
      :id="id"
      type="number"
      class="form-control"
      :min="min"
      :max="max"
      :step="step"
      :value="model"
      :disabled="disabled"
      @input="onInput"
      @change="onChange"
    />
  </div>
</template>
