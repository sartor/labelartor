<script setup lang="ts">
/** Bold on/off (Bootstrap `.btn-check` checkbox). */
import { IconBold } from '@tabler/icons-vue'
import { useId } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  /** The current font has no bold face. */
  disabled?: boolean
}>()

const model = defineModel<boolean>({ required: true })
const id = useId()
</script>

<template>
  <span class="d-inline-block" :title="disabled ? 'This font has no bold' : 'Bold'">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      class="btn-check"
      :disabled="disabled"
      autocomplete="off"
    />
    <label class="btn btn-outline-secondary" :for="id">
      <AppIcon :icon="IconBold" />
      <span class="visually-hidden">Bold</span>
    </label>
  </span>
</template>
