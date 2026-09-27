<script setup lang="ts" generic="T extends string | number">
/**
 * Button group acting as a radio input (Bootstrap `.btn-check` pattern).
 * With `prefix` it becomes an input group whose first addon is that static text.
 */
import { computed, useId } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import type { IconPath } from '@/icons'

export interface SegmentedOption<V extends string | number> {
  value: V
  label: string
  /** When set, the label is visually hidden. */
  icon?: IconPath
}

const props = withDefaults(
  defineProps<{
    options: SegmentedOption<T>[]
    ariaLabel?: string
    size?: 'sm' | 'md'
    disabled?: boolean
    /** Static text shown before the buttons, e.g. "Width". */
    prefix?: string
  }>(),
  { ariaLabel: undefined, size: 'md', disabled: false, prefix: undefined },
)

const model = defineModel<T>({ required: true })
const name = useId()

const wrapperClass = computed(() =>
  props.prefix
    ? ['input-group', 'w-auto', { 'input-group-sm': props.size === 'sm' }]
    : ['btn-group', { 'btn-group-sm': props.size === 'sm' }],
)
</script>

<template>
  <div :class="wrapperClass" role="group" :aria-label="ariaLabel">
    <span v-if="prefix" class="input-group-text">{{ prefix }}</span>
    <template v-for="option in options" :key="option.value">
      <input
        :id="`${name}-${option.value}`"
        v-model="model"
        type="radio"
        class="btn-check"
        :name="name"
        :value="option.value"
        :disabled="disabled"
        autocomplete="off"
      />
      <label
        class="btn btn-outline-secondary"
        :for="`${name}-${option.value}`"
        :title="option.label"
      >
        <AppIcon v-if="option.icon" :icon="option.icon" :size="size === 'sm' ? 16 : 20" />
        <span :class="{ 'visually-hidden': option.icon }">{{ option.label }}</span>
      </label>
    </template>
  </div>
</template>
