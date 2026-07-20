<template>
  <div>
    <AnimatePresence mode="popLayout">
      <motion.div
        v-if="props.isMobileWarningVisible"
        :initial="{ opacity: 0, scale: 0.95, y: -20 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :exit="{ opacity: 0, scale: 0.95, y: -20 }"
        :transition="SPRING"
        class="fixed inset-0 z-9999 flex items-center justify-center"
      >
        <!-- 背景遮罩 -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="closeMobileWarning"
        ></div>

        <!-- 弹窗内容 -->
        <div
          class="bg-background dark:bg-background relative z-10 w-11/12 max-w-md transform-gpu rounded-2xl p-8 shadow-2xl"
        >
          <!-- 警告图标 -->
          <div class="mb-6 flex justify-center">
            <div
              class="bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning flex h-20 w-20 items-center justify-center rounded-full"
            >
              <svg
                class="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <!-- 标题 -->
          <h2
            class="text-foreground dark:text-foreground mb-4 text-center font-serif text-2xl font-bold"
          >
            暂未适配移动端
          </h2>

          <!-- 说明文字 -->
          <p
            class="text-muted-foreground dark:text-muted-foreground mb-8 text-center"
          >
            为了获得最佳体验，请使用桌面设备访问本网站。
            移动端功能正在开发中，敬请期待！
          </p>

          <!-- 确认按钮 -->
          <button
            @click="closeMobileWarning"
            class="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 w-full transform-gpu rounded-xl py-4 font-serif text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            知道了
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v';
import { SPRING } from '@/shared/constants/motionPresets';
const emit = defineEmits(['close', 'update:isMobileWarningVisible']);
const props = defineProps<{
  isMobileWarningVisible: boolean;
}>();

const closeMobileWarning = () => {
  // 触发父组件事件，关闭警告
  emit('update:isMobileWarningVisible', false);
};
</script>
