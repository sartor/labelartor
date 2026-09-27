<script setup lang="ts">
import logoUrl from '@/assets/logo.svg'
import BackupMenu from '@/components/layout/BackupMenu.vue'
import ColorModeToggle from '@/components/layout/ColorModeToggle.vue'
import TapeColorToggle from '@/components/layout/TapeColorToggle.vue'
import PrinterStatusControl from '@/components/printer/PrinterStatusControl.vue'
</script>

<template>
  <nav class="navbar border-bottom bg-body-tertiary">
    <div class="container-lg">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="navbar-brand fw-semibold d-flex align-items-center gap-2 me-2">
          <img :src="logoUrl" alt="" width="32" height="32" />
          Labelartor
        </span>
        <PrinterStatusControl />
      </div>
      <div class="d-flex align-items-center gap-2">
        <BackupMenu />
        <TapeColorToggle />
        <ColorModeToggle />
      </div>
    </div>
  </nav>
</template>
