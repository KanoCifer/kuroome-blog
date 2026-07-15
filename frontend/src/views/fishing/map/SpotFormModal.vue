<script setup lang="ts">
/**
 * SpotFormModal —— 新增钓点弹窗。
 *
 * 两栏布局(≥md):左表单 + 右交互迷你地图选点。
 * · 全字段:名称 / 描述 / 标签 / 评分 / 图片(URL,每行一址) / 坐标(地图点选)
 * · 校验:名称 + 坐标必填,未满则禁用提交
 * · 提交 → fishingSpotsGateway.create → emit created(新钓点名称,供父组件刷新 + 打开详情)
 *
 * 交互模式复用 SpotMiniMap(interactive prop 选点),点击放置图钉并回写坐标。
 */
import UiModal from '@/components/ui/modal/Modal.vue';
import SpotMiniMap from '@/views/fishing/map/SpotMiniMap.vue';
import type { CreateFishingSpotPayload } from '@/api/fishing';
import { fishingSpotsGateway } from '@/api/fishing';
import { DEFAULT_MAP_CENTER } from '@/stores/fishingMap';
import { Loader2, MapPin, Star } from '@lucide/vue';
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** 地图初始聚焦位置(默认用户定位 / 默认中心) */
    initialCenter?: [number, number];
  }>(),
  { initialCenter: () => DEFAULT_MAP_CENTER },
);

const emit = defineEmits<{
  (e: 'close'): void;
  /** 创建成功,回传新钓点名称(后端 create 不返回实体,父组件按名称匹配刷新列表) */
  (e: 'created', name: string): void;
}>();

// ── 表单字段 ──
const name = ref('');
const description = ref('');
const tags = ref('');
const rating = ref(0);
const images = ref('');
const coordinate = ref<[number, number] | null>(null);

// ── 提交状态 ──
const submitting = ref(false);
const error = ref('');

// ── 校验(用于提交按钮禁用 + 字段错误提示) ──
const canSubmit = computed(
  () => name.value.trim().length > 0 && coordinate.value !== null,
);

/** 弹窗打开时重置草稿 */
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = '';
      description.value = '';
      tags.value = '';
      rating.value = 0;
      images.value = '';
      coordinate.value = null;
      error.value = '';
    }
  },
);

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  submitting.value = true;
  error.value = '';
  try {
    const tagsArr = tags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const imagesArr = images.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const payload: CreateFishingSpotPayload = {
      name: name.value.trim(),
      location: coordinate.value!,
      description: description.value.trim(),
      tags: tagsArr,
      rating: rating.value,
      images: imagesArr,
    };
    await fishingSpotsGateway.create(payload);
    const createdName = payload.name;
    emit('created', createdName);
    emit('close');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '创建钓点失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UiModal :open="open" size="xl" @close="emit('close')">
    <!-- 弹窗内部根容器:高度适中,内容区滚动 -->
    <div class="flex max-h-[80vh] flex-col">
      <!-- 头部 -->
      <div class="border-border border-b px-6 pt-6 pb-5">
        <h2 class="text-foreground font-serif text-2xl">新增钓点</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          在地图上选择位置，填写钓点信息
        </p>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="error"
        class="border-destructive/30 bg-destructive/10 text-destructive mx-6 mt-4 rounded-lg border px-3 py-2 text-sm"
      >
        {{ error }}
      </div>

      <!-- 两栏主体(≥md 并排;移动端堆叠:地图上、表单下) -->
      <div
        class="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2"
      >
        <!-- 左:表单 -->
        <div class="space-y-4">
          <!-- 名称(必填) -->
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium" for="spot-name">
              名称
            </label>
            <input
              id="spot-name"
              v-model="name"
              type="text"
              placeholder="例如:南沙天后宫矶钓位"
              class="bg-muted text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full rounded-xl border-0 px-4 py-3 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <!-- 描述 -->
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium" for="spot-desc">
              描述
            </label>
            <textarea
              id="spot-desc"
              v-model="description"
              rows="3"
              placeholder="水情、目标鱼、最佳出钓时段..."
              class="bg-muted text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full resize-none rounded-xl border-0 px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:outline-none"
            />
          </div>

          <!-- 标签 -->
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium" for="spot-tags">
              标签
            </label>
            <input
              id="spot-tags"
              v-model="tags"
              type="text"
              placeholder="矶钓, 海鲈, 夜钓(逗号分隔)"
              class="bg-muted text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full rounded-xl border-0 px-4 py-3 text-sm focus:ring-2 focus:outline-none"
            />
            <p class="text-muted-foreground mt-1 text-xs">多个标签以逗号分隔</p>
          </div>

          <!-- 评分 -->
          <div>
            <span class="text-foreground mb-1.5 block text-sm font-medium">评分</span>
            <div class="flex items-center gap-1">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="p-0.5"
                :aria-label="`${i} 星`"
                @click="rating = i"
              >
                <Star
                  class="h-5 w-5 transition-colors"
                  :class="
                    i <= rating
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground/30'
                  "
                />
              </button>
              <span
                v-if="rating > 0"
                class="text-muted-foreground ml-2 text-xs tabular-nums"
              >
                {{ rating.toFixed(1) }}
              </span>
            </div>
          </div>

          <!-- 图片(v1: URL 文本,每行一址) -->
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium" for="spot-images">
              图片
            </label>
            <textarea
              id="spot-images"
              v-model="images"
              rows="3"
              placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
              class="bg-muted text-foreground font-mono placeholder:text-muted-foreground/60 focus:ring-primary/30 w-full resize-none rounded-xl border-0 px-4 py-3 text-xs focus:ring-2 focus:outline-none"
            />
            <p class="text-muted-foreground mt-1 text-xs">每行一个图片地址</p>
          </div>
        </div>

        <!-- 右:交互迷你地图 + 坐标回读 -->
        <div class="flex flex-col gap-3">
          <div class="text-muted-foreground flex items-center gap-1.5">
            <MapPin class="h-3.5 w-3.5" />
            <span class="text-xs">点击地图选择钓点位置</span>
          </div>

          <SpotMiniMap
            :center="initialCenter"
            :position="coordinate ?? undefined"
            interactive
            class="md:h-[320px]"
            @update:position="coordinate = $event"
          />

          <!-- 坐标回读 -->
          <div
            class="bg-muted flex items-center justify-between rounded-xl px-4 py-2.5"
          >
            <span class="text-muted-foreground text-xs">坐标</span>
            <span
              class="text-foreground font-mono text-xs tabular-nums"
              :class="{ 'text-muted-foreground/50': !coordinate }"
            >
              {{
                coordinate
                  ? `${coordinate[0].toFixed(6)}, ${coordinate[1].toFixed(6)}`
                  : '点击右侧地图选点'
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div
        class="border-border flex items-center justify-end gap-2 border-t px-6 py-4"
      >
        <button
          type="button"
          class="text-muted-foreground hover:bg-muted rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :disabled="submitting"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          {{ submitting ? '创建中...' : '添加钓点' }}
        </button>
      </div>
    </div>
  </UiModal>
</template>
