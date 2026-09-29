<script setup lang="ts">
/** "New block", then one button per kind of block to add. */
import AppIcon from '@/components/ui/AppIcon.vue'
import type { BlockKind } from '@/core/label'
import { IconPlus, IconSpace, IconStar, IconTypography } from '@/icons'

const emit = defineEmits<{ add: [kind: BlockKind] }>()
</script>

<template>
  <div class="input-group input-group-sm w-auto" role="group" aria-label="New block">
    <span class="input-group-text"><AppIcon :icon="IconPlus" class="me-1" />New block</span>
    <button type="button" class="btn btn-outline-success" @click="emit('add', 'text')">
      <AppIcon :icon="IconTypography" class="me-1" />Text
    </button>
    <button type="button" class="btn btn-outline-success" @click="emit('add', 'icon')">
      <AppIcon :icon="IconStar" class="me-1" />Icon
    </button>
    <button type="button" class="btn btn-outline-success" @click="emit('add', 'space')">
      <AppIcon :icon="IconSpace" class="me-1" />Space
    </button>
  </div>
</template>
