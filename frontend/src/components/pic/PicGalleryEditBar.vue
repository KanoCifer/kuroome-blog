<template>
  <div
    class="fixed bottom-4 left-1/2 z-30 w-fit -translate-x-1/2"
  >
    <div class="flex items-center gap-3">
      <Button
        v-if="canEdit"
        variant="outline"
        size="sm"
        @click="$emit('toggle-edit')"
        class="border-border/60 h-9 gap-2 rounded-full px-4 shadow-sm transition-all duration-300"
        :class="isEditMode ? 'bg-primary text-primary-foreground' : ''"
      >
        <component :is="isEditMode ? Check : Edit2" class="h-4 w-4" />
        {{ isEditMode ? '完成编辑' : '编辑模式' }}
      </Button>
      <button
        @click="$emit('shuffle')"
        class="border-border/60 h-9 gap-2 text-primary-foreground rounded-lg px-4 shadow-sm bg-secondary flex items-center"
      >
        <Shuffle class="h-4 w-4" />
        重排
      </button>
      <Transition
        enter-active-class="transition-all  duration-300 ease-in-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all  duration-300 ease-in-out"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="-translate-x-full opacity-0"
      >
        <Button
          v-if="isEditMode && canEdit"
          key="upload-btn"
          variant="default"
          size="sm"
          @click="$emit('upload')"
          class="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-2 rounded-full px-4 shadow-md"
        >
          <Upload class="h-4 w-4" />
          上传图片
        </Button>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Check, Edit2, Shuffle, Upload } from '@lucide/vue';

defineProps<{
  canEdit: boolean;
  isEditMode: boolean;
}>();

defineEmits<{
  'toggle-edit': [];
  shuffle: [];
  upload: [];
}>();
</script>
