<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    <DeviceCard
      v-for="device in devices"
      :key="device.id"
      :device="device"
      :pending-id="pendingId"
      @toggle-status="(d) => emit('toggleStatus', d)"
      @delete="(d) => emit('delete', d)"
    />
  </div>
</template>

<script setup lang="ts">
import DeviceCard from "./DeviceCard.vue";
import type { Device } from "@/services/deviceService";

interface Props {
  devices: Device[];
  pendingId: number | null;
}

defineProps<Props>();

const emit = defineEmits<{
  toggleStatus: [device: Device];
  delete: [device: Device];
}>();
</script>
