<template>
  <header
    class="bg-background/70 sticky top-0 z-30 border-b border-white/40 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)] backdrop-blur-2xl dark:border-white/10 dark:shadow-none"
  >
    <div class="mx-auto flex max-w-6xl items-center justify-end px-6 py-4">
      <div class="flex items-center gap-3">
        <Button
          v-if="canEdit"
          variant="outline"
          size="sm"
          @click="$emit('toggle-edit')"
          class="border-border/60 h-9 gap-2 rounded-full px-4 shadow-sm transition-colors"
          :class="isEditMode ? 'bg-primary text-primary dark:bg-primary/30' : ''"
        >
          <component :is="isEditMode ? Check : Edit2" class="h-4 w-4" />
          {{ isEditMode ? '完成编辑' : '编辑模式' }}
        </Button>
        <TransitionGroup name="fade">
          <Button
            v-if="isEditMode && canEdit"
            key="shuffle-btn"
            variant="outline"
            size="sm"
            @click="$emit('shuffle')"
            class="border-border/60 h-9 gap-2 rounded-full px-4 shadow-sm"
          >
            <Shuffle class="h-4 w-4" />
            重排
          </Button>
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
        </TransitionGroup>
      </div>
    </div>
  </header>
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
