<script setup lang="ts" generic="T extends string | number">
/** Button group acting as a radio input (Bootstrap `.btn-check` pattern). */
import { useId, type Component } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'

export interface SegmentedOption<V extends string | number> {
  value: V
  label: string
  /** Icon component (Tabler). When set, the label is visually hidden. */
  icon?: Component
}

withDefaults(
  defineProps<{
    options: SegmentedOption<T>[]
    ariaLabel?: string
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  { ariaLabel: undefined, size: 'md', disabled: false },
)

const model = defineModel<T>({ required: true })
const name = useId()
</script>

<template>
  <div
    class="btn-group"
    :class="{ 'btn-group-sm': size === 'sm' }"
    role="group"
    :aria-label="ariaLabel"
  >
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
        <AppIcon v-if="option.icon" :icon="option.icon" :size="size === 'sm' ? 16 : 18" />
        <span :class="{ 'visually-hidden': option.icon }">{{ option.label }}</span>
      </label>
    </template>
  </div>
</template>
