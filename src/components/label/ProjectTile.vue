<script setup lang="ts">
/** A saved project as a small card of facts; clicking it selects and offers to load it. */
import type { Project } from '@/core/label'
import { isoLocalDateTime } from '@/utils/format'

const props = defineProps<{
  project: Project
  /** Selected in the panel. */
  active?: boolean
  /** The queue currently belongs to this project. */
  current?: boolean
}>()

const emit = defineEmits<{ open: [] }>()

const labels = () =>
  `${props.project.labels.length} ${props.project.labels.length === 1 ? 'label' : 'labels'} · ${props.project.tapeMm.toFixed(1)} mm tape`
</script>

<template>
  <div
    class="d-inline-flex flex-column gap-1 border rounded-1 p-2 small"
    :class="{ 'border-primary': active }"
    role="button"
    tabindex="0"
    :aria-pressed="active"
    title="Click to load this project into the queue"
    @click="emit('open')"
    @keydown.enter="emit('open')"
  >
    <span class="d-flex align-items-center gap-2 fw-semibold">
      {{ project.name }}
      <span v-if="current" class="badge text-bg-primary">in queue</span>
    </span>
    <span class="text-body-secondary">{{ labels() }}</span>
    <span class="text-body-secondary">created {{ isoLocalDateTime(project.createdAt) }}</span>
    <span class="text-body-secondary">saved {{ isoLocalDateTime(project.savedAt) }}</span>
  </div>
</template>
