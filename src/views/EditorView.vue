<script setup lang="ts">
import { IconAlertTriangle } from '@tabler/icons-vue'

import HistoryPanel from '@/components/panels/HistoryPanel.vue'
import PreviewPanel from '@/components/panels/PreviewPanel.vue'
import ProjectsPanel from '@/components/panels/ProjectsPanel.vue'
import QueuePanel from '@/components/panels/QueuePanel.vue'
import TextPanel from '@/components/panels/TextPanel.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { usePrinterStore } from '@/stores/printer'

const printer = usePrinterStore()
</script>

<template>
  <div class="container-lg py-4 d-flex flex-column gap-4">
    <div v-if="!printer.supported" class="alert alert-warning mb-0" role="alert">
      <AppIcon :icon="IconAlertTriangle" class="me-2" />
      This browser does not support Web Serial, so it cannot talk to the printer. You can still
      design labels; use Chrome or Edge to print.
    </div>

    <PreviewPanel id="preview" />
    <TextPanel id="text" />
    <QueuePanel id="queue" />
    <ProjectsPanel id="projects" />
    <HistoryPanel id="history" />
  </div>
</template>
