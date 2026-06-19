<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
      enter-from-class="opacity-0 backdrop-blur-none"
      enter-to-class="opacity-100 backdrop-blur-xl"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 backdrop-blur-xl"
      leave-to-class="opacity-0 backdrop-blur-none"
    >
      <div
        v-if="image"
        class="fixed inset-0 z-9999 flex items-center justify-center p-4 md:p-8"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>

        <!-- Modal Content -->
        <motion.div
          :initial="{ opacity: 0, scale: 0.95, y: 10 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :exit="{ opacity: 0, scale: 0.95, y: 10 }"
          :transition="{ type: 'spring', damping: 25, stiffness: 300 }"
          class="bg-background/95 relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/20 backdrop-blur-2xl md:flex-row dark:ring-white/10"
        >
          <!-- Close Button (mobile) -->
          <button
            @click="$emit('close')"
            class="text-muted-foreground absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/10 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/20 active:scale-95 md:hidden dark:bg-white/10 dark:hover:bg-white/20"
          >
            <X class="h-5 w-5" />
          </button>

          <!-- Image Area -->
          <div
            class="bg-muted/50 relative flex max-h-[70vh] w-full items-center justify-center p-4 md:max-h-[85vh] md:w-2/3 md:p-8"
          >
            <img
              :src="image.url"
              :alt="image.description"
              class="h-auto max-h-full w-auto max-w-full rounded-xl object-contain shadow-lg ring-1 ring-black/5 dark:ring-white/10"
            />
          </div>

          <!-- Details Area -->
          <div class="bg-background/50 flex w-full flex-col p-6 md:w-1/3 md:p-10">
            <div class="flex-1">
              <div class="mb-8 hidden justify-end md:flex">
                <button
                  @click="$emit('close')"
                  class="text-muted-foreground hover:bg-muted bg-muted/80 flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                >
                  <X class="h-5 w-5" />
                </button>
              </div>

              <div
                class="text-muted-foreground mb-8 flex items-center text-sm font-medium"
              >
                <Calendar class="mr-1.5 h-4 w-4" />
                {{ formattedDate }}
              </div>

              <!-- Edit Description -->
              <div v-if="editable" class="space-y-3">
                <label
                  class="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
                >
                  修改描述
                </label>
                <textarea
                  v-model="localDescription"
                  rows="3"
                  placeholder="输入新的描述..."
                  class="text-foreground placeholder:text-muted-foreground focus:border-foreground focus:ring-foreground border-border/80 bg-background w-full resize-none rounded-xl border px-4 py-3 text-sm shadow-sm transition-all focus:ring-1 focus:outline-none"
                ></textarea>
                <div class="flex justify-end gap-4 pt-2">
                  <Button
                    variant="ghost"
                    class="text-destructive hover:bg-destructive/10 rounded-full px-5 shadow-sm"
                    @click="$emit('delete', image.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                    删除图片
                  </Button>
                  <Button
                    variant="secondary"
                    class="rounded-full px-5 shadow-sm"
                    @click="$emit('update', image.id, localDescription)"
                  >
                    保存修改
                  </Button>
                </div>
              </div>

              <div
                v-else
                class="text-foreground bg-muted/80 rounded-md p-4 text-base whitespace-pre-wrap"
              >
                {{ image.description || '暂无描述' }}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Calendar, Trash2, X } from '@lucide/vue';
import { motion } from 'motion-v';
import { ref, watch } from 'vue';
import type { Picture } from '@/composables/pic';

const props = defineProps<{
  image: Picture | null;
  editable: boolean;
  formattedDate: string;
}>();

defineEmits<{
  close: [];
  update: [id: string, description: string];
  delete: [id: string];
}>();

// Local editable copy of description, synced when the selected image changes
const localDescription = ref('');

watch(
  () => props.image,
  (img) => {
    localDescription.value = img?.description ?? '';
  },
  { immediate: true },
);
</script>
