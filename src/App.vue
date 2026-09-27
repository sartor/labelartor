<script setup lang="ts">
import { onMounted } from 'vue'

import AppNavbar from '@/components/layout/AppNavbar.vue'
import { useColorMode } from '@/composables/useColorMode'
import { usePrinterStore } from '@/stores/printer'

useColorMode()

const printer = usePrinterStore()
// Reopen the printer used last time, if the browser still allows it.
onMounted(() => printer.reconnect())
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <AppNavbar />
    <main class="flex-grow-1">
      <RouterView />
    </main>
  </div>
</template>
