<template>
  <div>
    <AnimatePresence mode="popLayout">
      <motion.div
        v-if="props.isMobileWarningVisible"
        :initial="{ opacity: 0, scale: 0.95, y: -20 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :exit="{ opacity: 0, scale: 0.95, y: -20 }"
        :transition="{ type: 'spring' }"
        class="fixed inset-0 z-9999 flex items-center justify-center"
      >
        <!-- 背景遮罩 -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="closeMobileWarning"
        ></div>

        <!-- 弹窗内容 -->
        <div
          class="relative z-10 w-11/12 max-w-md transform-gpu rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-800"
        >
          <!-- 警告图标 -->
          <div class="mb-6 flex justify-center">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
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
            class="mb-4 text-center font-serif text-2xl font-bold text-gray-800 dark:text-gray-200"
          >
            暂未适配移动端
          </h2>

          <!-- 说明文字 -->
          <p class="mb-8 text-center text-gray-600 dark:text-gray-400">
            为了获得最佳体验，请使用桌面设备访问本网站。
            移动端功能正在开发中，敬请期待！
          </p>

          <!-- 确认按钮 -->
          <button
            @click="closeMobileWarning"
            class="w-full transform-gpu rounded-xl bg-blue-600 py-4 font-serif text-lg font-bold text-white transition-all hover:scale-[1.02] hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            知道了
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
const emit = defineEmits(["close", "update:isMobileWarningVisible"]);
const props = defineProps<{
  isMobileWarningVisible: boolean;
}>();

const closeMobileWarning = () => {
  // 触发父组件事件，关闭警告
  emit("update:isMobileWarningVisible", false);
};
</script>
