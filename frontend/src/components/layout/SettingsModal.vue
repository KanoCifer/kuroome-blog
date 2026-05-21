<template>
  <Teleport to="body">
    <!-- Background overlay -->
    <!-- <motion.div
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      v-if="modelValue"
      @click.self="close"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
    ></motion.div> -->
    <transition
      enter-active-class="transition-all duration-500 ease-out transform-gpu"
      enter-from-class="opacity-0 translate-x-full"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-300 ease-in transform-gpu"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-full"
    >
      <div v-if="modelValue" class="fixed inset-0 z-9999 flex justify-end" @click.self="close">
        <!-- Drawer content -->
        <div class="bg-card dark:bg-card relative z-10 h-full w-full max-w-md rounded-l-2xl">
          <!-- Header -->
          <div class="border-border flex items-center justify-between border-b px-6 py-4">
            <h3 class="text-foreground flex items-center gap-2 font-serif text-lg font-bold">
              <SettingIcon class="text-primary h-5 w-5" />
              偏好设置
            </h3>
            <button
              @click="close"
              class="text-muted-foreground hover:bg-accent hover:text-secondary-foreground dark:hover:bg-accent dark:hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-border flex border-b px-6">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="relative px-4 py-3 text-sm font-medium transition-colors"
              :class="activeTab === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ tab.label }}
              <span
                v-if="activeTab === tab.key"
                class="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
              />
            </button>
          </div>

          <!-- Content -->
          <div class="overflow-y-auto p-6" style="height: calc(100% - 120px)">
            <!-- Appearance Tab -->
            <div v-if="activeTab === 'appearance'" class="space-y-6">
              <!-- Footer Toggle -->
              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 页面元素 </label>
                <div
                  @click="themeStore.toggleFooter()"
                  class="border-border hover:border-primary dark:border-border flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all"
                >
                  <span class="text-sm font-medium">显示页脚</span>
                  <div
                    class="h-6 w-11 rounded-full p-0.5 transition-colors"
                    :class="themeStore.showFooter === 'true' ? 'bg-primary' : 'bg-muted-foreground/30'"
                  >
                    <div
                      class="h-5 w-5 rounded-full bg-white shadow-md transition-transform"
                      :class="themeStore.showFooter === 'true' ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 主题模式 </label>
                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="theme in themes"
                    :key="theme.value"
                    @click="selectTheme(theme.value as Theme, $event)"
                    class="border-border hover:border-primary dark:border-border flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all"
                    :class="{
                      'border-primary bg-primary/5': themeStore.theme === theme.value,
                    }"
                  >
                    <span v-html="theme.icon"></span>
                    <span class="text-xs font-medium">{{ theme.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Font Switcher -->
              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 字体 </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    @click="themeStore.applyFont('default')"
                    class="border-border hover:border-primary dark:border-border flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all"
                    :class="{
                      'border-primary bg-muted': themeStore.font === 'default',
                    }"
                  >
                    <span class="font-sans text-sm font-medium">默认字体</span>
                    <span class="text-muted-foreground font-sans text-xs">PingFang SC</span>
                  </button>
                  <button
                    @click="themeStore.applyFont('harmonyos')"
                    class="border-border hover:border-primary dark:border-border flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all"
                    :class="{
                      'border-primary bg-muted': themeStore.font === 'harmonyos',
                    }"
                  >
                    <span class="font-family-harmonyos text-sm font-medium" style="font-weight: 500"
                      >HarmonyOS Sans</span
                    >
                    <span class="text-muted-foreground font-family-harmonyos text-xs">鸿蒙字体</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 配色方案 </label>
                <div class="space-y-2">
                  <button
                    v-for="scheme in schemes"
                    :key="scheme.value"
                    @click="themeStore.setScheme(scheme.value)"
                    class="border-border hover:border-primary dark:border-border flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all"
                    :class="{
                      'border-primary bg-primary/5': themeStore.scheme === scheme.value,
                    }"
                  >
                    <div class="flex gap-1">
                      <span
                        v-for="(color, i) in scheme.colors"
                        :key="i"
                        class="h-5 w-5 rounded-full"
                        :style="{ backgroundColor: color }"
                      />
                    </div>
                    <span class="text-sm font-medium">{{ scheme.label }}</span>
                    <svg
                      v-if="themeStore.scheme === scheme.value"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-primary ml-auto"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Card Tab -->
            <div v-if="activeTab === 'card'" class="space-y-6">
              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 选择卡片配图 </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="(img, index) in cardImages"
                    :key="index"
                    @click="setCardIndex(index)"
                    class="border-border hover:border-primary dark:border-border relative overflow-hidden rounded-xl border-2 transition-all"
                    :class="{
                      'border-primary': cardIndex === index,
                    }"
                  >
                    <div
                      class="h-24 w-full bg-cover bg-center"
                      :style="{ backgroundImage: `url('${img}')` }"
                    />
                    <div
                      v-if="cardIndex === index"
                      class="absolute inset-0 flex items-center justify-center bg-black/30"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div class="bg-card/80 absolute right-2 bottom-2 rounded-md px-2 py-0.5 text-xs backdrop-blur-sm">
                      {{ index + 1 }}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Background Tab -->
            <div v-if="activeTab === 'background'" class="space-y-6">
              <!-- Blur Slider -->
              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium">
                  背景模糊：{{ themeStore.bgBlur }}px
                </label>
                <input
                  type="range"
                  min="5"
                  max="70"
                  step="1"
                  :value="themeStore.bgBlur"
                  @input="themeStore.saveBgBlur(Number(($event.target as HTMLInputElement).value))"
                  class="hocus:border-primary accent-primary w-full cursor-pointer appearance-none rounded-full bg-gray-200/70 py-0.5 dark:bg-gray-700/70"
                />
              </div>

              <!-- Brightness Slider -->
              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium">
                  背景亮度：{{ Math.round(themeStore.bgBrightness * 100) }}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  :value="Math.round(themeStore.bgBrightness * 100)"
                  @input="themeStore.saveBgBrightness(Number(($event.target as HTMLInputElement).value) / 100)"
                  class="hocus:border-primary accent-primary w-full cursor-pointer appearance-none rounded-full bg-gray-200/70 py-0.5 dark:bg-gray-700/70"
                />
              </div>

              <!-- Scale Slider -->
              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium">
                  背景缩放：{{ Math.round(themeStore.bgScale * 100) }}%
                </label>
                <input
                  type="range"
                  min="100"
                  max="130"
                  step="1"
                  :value="Math.round(themeStore.bgScale * 100)"
                  @input="themeStore.saveBgScale(Number(($event.target as HTMLInputElement).value) / 100)"
                  class="hocus:border-primary accent-primary w-full cursor-pointer appearance-none rounded-full bg-gray-200/70 py-0.5 dark:bg-gray-700/70"
                />
              </div>

              <div>
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 背景模式 </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    @click="backgroundStore.randomize()"
                    class="border-border hover:border-primary dark:border-border flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all"
                    :class="{
                      'border-primary bg-primary/5': backgroundStore.mode === 'random',
                    }"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                      <polyline points="21 16 21 21 16 21" />
                      <line x1="15" y1="15" x2="21" y2="21" />
                      <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                    <span class="text-sm font-medium">随机切换</span>
                  </button>
                  <button
                    @click="backgroundStore.mode = 'fixed'"
                    class="border-border hover:border-primary dark:border-border flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all"
                    :class="{
                      'border-primary bg-primary/5': backgroundStore.mode === 'fixed',
                    }"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span class="text-sm font-medium">固定背景</span>
                  </button>
                </div>
              </div>

              <!-- Auto-switch Interval (random mode only) -->
              <div v-if="backgroundStore.mode === 'random'">
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 自动切换 </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in autoSwitchOptions"
                    :key="opt.value"
                    @click="backgroundStore.saveAutoSwitch(opt.value)"
                    class="border-border hover:border-primary dark:border-border rounded-lg border-2 px-3 py-1.5 text-sm transition-all"
                    :class="{
                      'border-primary bg-primary/5': backgroundStore.autoSwitchInterval === opt.value,
                    }"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div v-if="backgroundStore.mode === 'fixed'">
                <label class="text-muted-foreground mb-3 block text-sm font-medium"> 选择背景 </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="(img, index) in backgroundStore.backgroundImages"
                    :key="index"
                    @click="backgroundStore.selectFixed(index)"
                    class="border-border hover:border-primary dark:border-border relative overflow-hidden rounded-xl border-2 transition-all"
                    :class="{
                      'border-primary': backgroundStore.fixedIndex === index,
                    }"
                  >
                    <div class="h-24 w-full bg-cover bg-center" :style="{ backgroundImage: `url('${img}')` }" />
                    <div
                      v-if="backgroundStore.fixedIndex === index"
                      class="absolute inset-0 flex items-center justify-center bg-black/30"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div class="bg-card/80 absolute right-2 bottom-2 rounded-md px-2 py-0.5 text-xs backdrop-blur-sm">
                      {{ index + 1 }}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useBackgroundStore } from "@/stores/background";
import { useThemeStore, type ColorScheme, type Theme } from "@/stores/theme";
import { useCardImage } from "@/composables/useCardImage";
import SettingIcon from "@/views/entry/icon/SettingIcon.vue";
import { ref } from "vue";

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const close = () => {
  emit("update:modelValue", false);
};

const themeStore = useThemeStore();
const backgroundStore = useBackgroundStore();
const { cardIndex, cardImages, setCardIndex } = useCardImage();

const activeTab = ref("appearance");

const autoSwitchOptions = [
  { label: "关闭", value: 0 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "120s", value: 120 },
];

const tabs = [
  { key: "appearance", label: "外观" },
  { key: "background", label: "背景" },
  { key: "card", label: "卡片" },
];

const themes: { value: Theme; label: string; icon: string }[] = [
  {
    value: "system",
    label: "系统",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  },
  {
    value: "light",
    label: "浅色",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  },
  {
    value: "dark",
    label: "深色",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  },
];

const schemes: { value: ColorScheme; label: string; colors: string[] }[] = [
  {
    value: "sky-blue",
    label: "Sky Blue",
    colors: ["#3b82f6", "#0ea5e9", "#6366f1"],
  },
  {
    value: "forest-green",
    label: "Forest Green",
    colors: ["#16a34a", "#0d9488", "#65a30d"],
  },
  { value: "paper", label: "Paper", colors: ["#c8713a", "#5a7a62", "#8a653f"] },
  { value: "sage", label: "Sage", colors: ["#4d6f57", "#8b7146", "#5e7072"] },
  { value: "mist", label: "Mist", colors: ["#4f687a", "#5d7569", "#927255"] },
  { value: "blush", label: "Blush", colors: ["#a5656f", "#6a7866", "#a06d4f"] },
  { value: "spring", label: "春暖 (Spring)", colors: ["#35bfab", "#f59e0b", "#10b981"] },
  { value: "autumn", label: "秋实 (Autumn)", colors: ["#de4331", "#eab308", "#3b82f6"] },
  { value: "clear-sky", label: "晴空 (Clear Sky)", colors: ["#2fcbe7", "#eab308", "#ffffff"] },
  { value: "midnight", label: "深夜 (Midnight)", colors: ["#2a48f3"] },
];

const selectTheme = (theme: Theme, event: MouseEvent) => {
  themeStore.setThemeWithAnimation(event, theme);
};
</script>
