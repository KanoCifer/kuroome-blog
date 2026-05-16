<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStorage } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const consentGiven = useStorage<boolean>("cookie_consent_given", false);

const showBanner = ref(false);
const showSettings = ref(false);
const showPrivacyPreview = ref(false);

const router = useRouter();

onMounted(() => {
  if (!consentGiven.value) {
    setTimeout(() => {
      showBanner.value = true;
    }, 800);
  }
});

interface CookieCategory {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

const cookieCategories = ref<CookieCategory[]>([
  {
    id: "essential",
    label: "必要",
    description: "网站运行必需，包括登录状态、安全验证等基础功能",
    required: true,
  },
  {
    id: "preferences",
    label: "偏好设置",
    description: "记住您的界面偏好，如背景图选择、主题模式等",
    required: false,
  },
]);

const settings = ref<Record<string, boolean>>({});

const initSettings = () => {
  settings.value = {};
  cookieCategories.value.forEach((c) => {
    settings.value[c.id] = c.required;
  });
};

const acceptAll = () => {
  cookieCategories.value.forEach((c) => {
    settings.value[c.id] = true;
  });
  consentGiven.value = true;
  showBanner.value = false;
  showPrivacyPreview.value = false;
};

const rejectAll = () => {
  initSettings();
  consentGiven.value = true;
  showBanner.value = false;
  showPrivacyPreview.value = false;
};

const openSettings = () => {
  initSettings();
  showSettings.value = true;
};

const saveSettings = () => {
  consentGiven.value = true;
  showSettings.value = false;
  showBanner.value = false;
};

const openPrivacy = () => {
  showPrivacyPreview.value = true;
};

const navigateToFullPolicy = () => {
  showPrivacyPreview.value = false;
  showBanner.value = false;
  router.push('/privacy');
};

// TODO(human): Implement privacy policy scroll tracking logic
// Track if the user has scrolled to the bottom of the privacy policy preview
// to enable the "Accept" button, ensuring they actually skimmed it.
const hasReadPrivacy = ref(true); 
const handlePrivacyScroll = (e: Event) => {
  // Your logic here
};

</script>

<template>
  <Teleport to="body">
    <!-- 右下角卡片 -->
    <Transition
      enter-active-class="transition-all transform-gpu duration-500 ease-out"
      enter-from-class="translate-y-6 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition-all transform-gpu duration-300 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="translate-y-6 scale-95 opacity-0"
    >
      <div
        v-if="showBanner && !consentGiven"
        class="group fixed right-4 bottom-6 z-50 w-[340px] sm:w-[380px] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/75 shadow-2xl shadow-amber-500/5 backdrop-blur-2xl transition-all duration-300 hover:border-white/[0.10] hover:shadow-amber-500/10 sm:right-8 sm:bottom-8"
      >
        <!-- 顶部装饰光晕 -->
        <div
          class="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-amber-500/10 blur-3xl"
        ></div>

        <div class="relative px-5 py-5">
          <!-- 标题行 -->
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-amber-400"
                >
                  <path d="M12 2a10 10 0 1 0 10 10h-10Z" />
                  <path d="M12 12 2.93 17.33" />
                  <path d="M17.33 2.93A10 10 0 0 1 22 12H12Z" />
                </svg>
              </span>
              <span class="text-[14px] font-semibold tracking-wide text-white/90">Cookie 与隐私设置</span>
            </div>
            <button 
              @click="openPrivacy"
              class="text-[12px] text-amber-400/80 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              隐私协议预览
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <!-- 说明文字 -->
          <p class="mb-4 text-[13px] leading-relaxed text-white/60">
            本站使用 Cookie 提升浏览体验。继续使用即表示您同意我们的 Cookie 政策与隐私协议。
          </p>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-2">
            <button
              class="flex-1 rounded-xl border border-white/[0.08] px-3 py-2 text-[12px] font-medium text-white/60 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.97]"
              @click="openSettings"
            >
              自定义
            </button>
            <button
              class="flex-1 rounded-xl border border-white/[0.08] px-3 py-2 text-[12px] font-medium text-white/60 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.97]"
              @click="rejectAll"
            >
              拒绝
            </button>
            <button
              class="flex-1 rounded-xl bg-amber-400/90 px-3 py-2 text-[12px] font-medium text-black/90 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-amber-400 active:scale-[0.97] active:shadow-amber-500/10"
              @click="acceptAll"
            >
              全部接受
            </button>
          </div>
        </div>

        <!-- 底部描边光晕 -->
        <div
          class="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-amber-500/8 blur-3xl"
        ></div>
      </div>
    </Transition>

    <!-- 隐私协议预览弹窗 -->
    <AlertDialog :open="showPrivacyPreview" @update:open="showPrivacyPreview = $event">
      <AlertDialogContent
        class="border-white/[0.06] bg-black/80 text-white shadow-2xl shadow-amber-500/5 backdrop-blur-2xl sm:max-w-[500px]"
      >
        <div class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-amber-500/8 blur-3xl"></div>
        
        <AlertDialogHeader>
          <AlertDialogTitle class="text-[16px] font-medium text-white/90">隐私协议核心摘要</AlertDialogTitle>
          <AlertDialogDescription class="sr-only">隐私协议预览</AlertDialogDescription>
        </AlertDialogHeader>

        <div 
          class="relative flex flex-col gap-3 py-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar"
          @scroll="handlePrivacyScroll"
        >
          <div class="space-y-4 text-[13px] leading-relaxed text-white/70">
            <div>
              <h4 class="text-white/90 font-medium mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                信息收集
              </h4>
              <p class="text-white/50">我们收集必要的网络身份标识(IP/UA)及浏览过程数据以保障服务运行。</p>
            </div>
            <div>
              <h4 class="text-white/90 font-medium mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                本地存储
              </h4>
              <p class="text-white/50">使用 Cookie 和 LocalStorage 保存您的登录状态及界面偏好设置。</p>
            </div>
            <div>
              <h4 class="text-white/90 font-medium mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                第三方服务
              </h4>
              <p class="text-white/50">接入 Gravatar (头像) 及 GitHub OAuth (快捷登录)，仅在您使用时生效。</p>
            </div>
            <div class="pt-2 border-t border-white/[0.06]">
              <button 
                @click="navigateToFullPolicy"
                class="text-amber-400/80 hover:text-amber-400 transition-colors text-[12px] inline-flex items-center gap-1"
              >
                阅读完整《隐私政策》
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
              </button>
            </div>
          </div>
        </div>

        <AlertDialogFooter class="mt-4">
          <AlertDialogCancel class="h-9 rounded-xl border border-white/[0.08] px-4 text-[12px] font-medium text-white/60 hover:bg-white/[0.04] hover:text-white/80">
            返回
          </AlertDialogCancel>
          <AlertDialogAction 
            class="h-9 rounded-xl bg-amber-400/90 px-4 text-[12px] font-medium text-black/90 shadow-lg shadow-amber-500/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="acceptAll"
            :disabled="!hasReadPrivacy"
          >
            我已阅读并同意
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 设置弹窗 -->
    <AlertDialog :open="showSettings" @update:open="showSettings = $event">
      <AlertDialogContent
        class="border-white/[0.06] bg-black/80 text-white shadow-2xl shadow-amber-500/5 backdrop-blur-2xl sm:max-w-[400px]"
      >
        <div class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-amber-500/8 blur-3xl"></div>
        <div class="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-amber-500/5 blur-3xl"></div>

        <AlertDialogHeader class="relative">
          <AlertDialogTitle class="text-[15px] font-medium text-white/90"> Cookie 偏好设置 </AlertDialogTitle>
          <AlertDialogDescription class="mt-1 text-[12.5px] leading-relaxed text-white/45">
            选择允许的 Cookie 类别。您可随时通过清除浏览器数据撤回同意。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="relative flex flex-col gap-2.5 py-1">
          <div
            v-for="cat in cookieCategories"
            :key="cat.id"
            class="flex items-start gap-3 rounded-xl border border-white/[0.06] px-3.5 py-3 transition-colors"
            :class="{ 'opacity-70': cat.required }"
          >
            <div class="flex h-5 items-center pt-0.5">
              <input
                :id="`cookie-${cat.id}`"
                type="checkbox"
                :checked="cat.required || (settings[cat.id] ?? false)"
                :disabled="cat.required"
                class="h-3.5 w-3.5 appearance-none rounded-[3px] border border-white/20 bg-white/5 transition-all duration-150 checked:border-amber-400 checked:bg-amber-400/90 focus:ring-1 focus:ring-amber-400/30 focus:ring-offset-0 disabled:opacity-60"
                @change="settings[cat.id] = !settings[cat.id]"
              />
            </div>
            <label :for="`cookie-${cat.id}`" class="flex-1 cursor-pointer">
              <span class="text-[13px] font-medium text-white/80">{{ cat.label }}</span>
              <p class="mt-0.5 text-[11.5px] text-white/40">
                {{ cat.description }}
              </p>
            </label>
            <span
              v-if="cat.required"
              class="mt-0.5 shrink-0 rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/30"
            >
              必需
            </span>
          </div>
        </div>

        <AlertDialogFooter class="relative">
          <AlertDialogCancel
            class="h-9 rounded-xl border border-white/[0.08] px-4 text-[12px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/70"
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            class="h-9 rounded-xl bg-amber-400/90 px-4 text-[12px] font-medium text-black/85 shadow-lg shadow-amber-500/15 transition-all duration-200 hover:bg-amber-400"
            @click="saveSettings"
          >
            保存设置
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
