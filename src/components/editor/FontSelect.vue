<script setup lang="ts">
import { IconTypography } from '@tabler/icons-vue'
import { useId } from 'vue'

import AppIcon from '@/components/ui/AppIcon.vue'
import { BUNDLED_FONT_GROUPS } from '@/core/fonts'

const model = defineModel<string>({ required: true })
const id = useId()
</script>

<template>
  <div class="input-group">
    <label class="input-group-text" :for="id" title="Font">
      <AppIcon :icon="IconTypography" />
      <span class="visually-hidden">Font</span>
    </label>
    <select :id="id" v-model="model" class="form-select">
      <optgroup v-for="group in BUNDLED_FONT_GROUPS" :key="group.id" :label="group.label">
        <option v-for="font in group.fonts" :key="font.family" :value="font.family">
          {{ font.label }}
        </option>
      </optgroup>
    </select>
  </div>
</template>
