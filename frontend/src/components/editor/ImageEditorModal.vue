<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  isOpen: boolean;
  imageUrl: string;
  alt: string;
  title: string;
  width: string;
  height: string;
  align: "left" | "center" | "right";
}>();

const emit = defineEmits<{
  close: [];
  "update:alt": [value: string];
  "update:title": [value: string];
  "update:width": [value: string];
  "update:height": [value: string];
  "update:align": [value: "left" | "center" | "right"];
  "replace-image": [event: Event];
  "open-new-tab": [url: string];
}>();

const replaceInputRef = ref<HTMLInputElement | null>(null);
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="bg-card w-full max-w-md rounded-3xl shadow-2xl">
          <div class="border-border flex items-center justify-between border-b px-6 py-4">
            <h3 class="text-foreground text-base font-semibold">编辑图片</h3>
            <button
              type="button"
              class="text-muted-foreground hover:bg-accent bg-muted rounded-full px-3 py-1 text-xs font-semibold transition"
              @click="emit('close')"
            >
              关闭
            </button>
          </div>

          <div class="p-6">
            <div class="bg-muted mb-4 flex items-center justify-center rounded-2xl p-4">
              <img
                :src="imageUrl"
                :alt="alt"
                class="max-h-50 w-full rounded-xl object-contain"
                @click.stop="emit('open-new-tab', imageUrl)"
              />
            </div>

            <div class="space-y-3">
              <input
                :value="alt"
                type="text"
                placeholder="图片说明 (Alt)"
                class="text-foreground placeholder:text-muted-foreground focus:border-ring border-border bg-card w-full rounded-xl border px-3 py-2 text-sm outline-none"
                @input="emit('update:alt', ($event.target as HTMLInputElement).value)"
              />

              <div class="grid grid-cols-2 gap-3">
                <input
                  :value="width"
                  type="number"
                  min="0"
                  placeholder="宽度"
                  class="text-foreground placeholder:text-muted-foreground focus:border-ring border-border bg-card w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  @input="emit('update:width', ($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="height"
                  type="number"
                  min="0"
                  placeholder="高度"
                  class="text-foreground placeholder:text-muted-foreground focus:border-ring border-border bg-card w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  @input="emit('update:height', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>

          <div class="border-border flex items-center justify-between border-t px-6 py-4">
            <div>
              <input
                ref="replaceInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="(e) => emit('replace-image', e)"
              />
              <button
                type="button"
                class="text-muted-foreground hover:bg-accent border-border rounded-xl border px-3 py-2 text-xs font-semibold transition"
                @click="replaceInputRef?.click()"
              >
                替换图片
              </button>
            </div>
            <button
              type="button"
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-xs font-semibold transition"
              @click="emit('close')"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
