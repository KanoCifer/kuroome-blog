<template>
  <Modal :open="open" size="xl" @close="emit('update:open', false)">
    <!-- 顶栏 -->
    <header
      class="border-border/40 bg-paper sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-6 py-4"
    >
      <div>
        <div
          class="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase"
        >
          {{ isEdit ? 'EDIT' : 'NEW' }} · {{ isEdit ? '编辑' : '写一句' }}
        </div>
        <h2 class="text-ink font-serif text-lg font-medium italic">
          {{ isEdit ? '改一改' : '碎碎念' }}
        </h2>
      </div>
      <button
        type="button"
        class="text-muted-foreground hover:text-ink border-border/40 inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
        aria-label="关闭"
        @click="emit('update:open', false)"
      >
        <IconClose class="h-3.5 w-3.5" />
      </button>
    </header>

    <!-- 主体：左表单 + 右侧设置 -->
    <div
      class="grid max-h-[calc(88vh-72px)] grid-cols-1 gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_220px]"
    >
      <form
        class="space-y-5 overflow-y-auto px-7 py-6"
        @submit.prevent="handleSubmit"
      >
        <!-- 内容 -->
        <div>
          <div class="mb-1.5 flex items-baseline gap-2">
            <label
              for="moment-content"
              class="text-ink font-serif text-sm font-medium"
              >内容</label
            >
            <span class="text-warning text-[11px]">*</span>
            <span class="text-muted-foreground text-[11px]"
              >必填 · 1~2000 字 · 支持 Markdown</span
            >
          </div>
          <textarea
            id="moment-content"
            ref="contentTextareaRef"
            v-model="form.content"
            rows="8"
            :maxlength="2000"
            placeholder="今天想到什么..."
            class="bg-paper border-input text-ink placeholder:text-muted-foreground/60 focus:border-accent focus:ring-ring/20 min-h-[180px] w-full resize-y rounded-lg border px-4 py-3 font-serif text-[15px] leading-loose focus:ring-2 focus:outline-none"
          />
          <div
            class="text-muted-foreground mt-1.5 flex items-center justify-between font-mono text-[10px] tracking-wide"
          >
            <span v-if="lastSavedAt">已保存草稿 · {{ lastSavedAt }}</span>
            <span v-else>&nbsp;</span>
            <span :class="form.content.length > 2000 ? 'text-destructive' : ''"
              >{{ form.content.length }} / 2000</span
            >
          </div>
        </div>

        <!-- 心情 -->
        <div>
          <div class="mb-1.5 flex items-baseline gap-2">
            <label class="text-ink font-serif text-sm font-medium"
              >心情</label
            >
            <span class="text-muted-foreground text-[11px]"
              >emoji 或一个词</span
            >
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="e in EMOJI_PRESETS"
              :key="e"
              type="button"
              :class="[
                'flex h-8 w-8 items-center justify-center rounded-lg border text-[16px] transition-colors',
                form.mood === e
                  ? 'border-accent bg-accent/10'
                  : 'border-border/40 bg-paper hover:bg-muted',
              ]"
              @click="toggleMood(e)"
            >
              {{ e }}
            </button>
          </div>
          <input
            v-model="form.mood"
            type="text"
            maxlength="50"
            placeholder="或自定义心情..."
            class="bg-paper border-input text-ink placeholder:text-muted-foreground/60 focus:border-accent focus:ring-ring/20 mt-2 w-full rounded-lg border px-3 py-1.5 text-[13px] focus:ring-2 focus:outline-none"
          />
        </div>

        <!-- 标签 -->
        <div>
          <div class="mb-1.5 flex items-baseline gap-2">
            <label class="text-ink font-serif text-sm font-medium"
              >标签</label
            >
            <span class="text-muted-foreground text-[11px]"
              >回车添加，× 删除 · ≤20</span
            >
          </div>
          <div
            class="bg-paper border-input flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5"
          >
            <span
              v-for="(tag, i) in form.tags"
              :key="tag + i"
              class="bg-muted text-ink inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px]"
            >
              <span class="text-accent/70 font-serif">#</span>{{ tag }}
              <button
                type="button"
                class="text-muted-foreground hover:text-ink"
                :aria-label="`删除标签 ${tag}`"
                @click="removeTag(i)"
              >
                ×
              </button>
            </span>
            <input
              v-model="tagInput"
              type="text"
              maxlength="50"
              placeholder="新标签..."
              class="text-ink min-w-[80px] flex-1 bg-transparent px-1 text-[12px] outline-none"
              @keydown.enter.prevent="addTag"
              @keydown.,.prevent="addTag"
            />
          </div>
        </div>
      </form>

      <!-- 右侧设置 -->
      <aside
        class="bg-muted/30 border-border/40 space-y-4 overflow-y-auto border-t px-5 py-6 md:border-t-0 md:border-l"
      >
        <div>
          <div
            class="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase"
          >
            可见性
          </div>
          <div class="space-y-1.5">
            <label
              v-for="[v, l, d] in VIS_OPTIONS"
              :key="v"
              :class="[
                'flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2',
                form.visibility === v
                  ? 'border-accent bg-accent/5'
                  : 'border-border/40 bg-paper hover:bg-muted',
              ]"
            >
              <input
                v-model="form.visibility"
                type="radio"
                :value="v"
                class="mt-1"
              />
              <div>
                <div class="text-ink text-[12px] font-medium">
                  {{ l }}
                </div>
                <div class="text-muted-foreground mt-0.5 text-[11px]">
                  {{ d }}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div
            class="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase"
          >
            状态
          </div>
          <select
            v-model="form.status"
            class="bg-paper border-input text-ink w-full rounded-lg border px-2.5 py-1.5 text-[13px]"
          >
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
            <option value="archived">归档</option>
          </select>
        </div>

        <div>
          <div
            class="text-muted-foreground mb-2 font-mono text-[10px] tracking-[0.15em] uppercase"
          >
            选项
          </div>
          <label
            class="text-ink mb-1.5 flex items-center gap-2 text-[12px]"
          >
            <input v-model="form.is_pinned" type="checkbox" /> 置顶
          </label>
          <label class="text-ink flex items-center gap-2 text-[12px]">
            <input v-model="form.allow_comment" type="checkbox" /> 允许评论
          </label>
        </div>

        <div class="space-y-2 pt-2">
          <button
            type="button"
            :disabled="submitting"
            class="bg-accent text-accent hover:bg-accent/90 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium shadow-sm transition-colors disabled:opacity-50"
            @click="handleSubmit"
          >
            {{ submitting ? '保存中…' : isEdit ? '保存修改' : '发布' }}
          </button>
          <button
            type="button"
            class="border-border/60 text-ink hover:bg-muted inline-flex w-full items-center justify-center rounded-lg border px-3 py-1.5 text-[12px] transition-colors"
            @click="emit('update:open', false)"
          >
            取消
          </button>
        </div>
        <div
          class="text-muted-foreground text-center font-mono text-[10px] tracking-wide"
        >
          ⌘ + S 保存
        </div>
      </aside>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { IconClose } from '@/components';
import { Modal } from '@/components';
import type {
  Moment,
  MomentStatus,
  MomentUpdatePayload,
  MomentVisibility,
} from '@/features/moments/types';
import { computed, reactive, ref, watch } from 'vue';

const EMOJI_PRESETS = [
  '🌿',
  '☕',
  '🌧',
  '📖',
  '🐟',
  '🌙',
  '☀',
  '🍃',
  '🎣',
  '✏',
  '💭',
  '🪴',
] as const;

const VIS_OPTIONS: [MomentVisibility, string, string][] = [
  ['public', '公开', '任何访客可见'],
  ['unlisted', '不列出', '链接可访问，但不在列表'],
  ['private', '不公开', '仅自己'],
];

export interface MomentFormState {
  content: string;
  mood: string;
  tags: string[];
  visibility: MomentVisibility;
  status: MomentStatus;
  is_pinned: boolean;
  allow_comment: boolean;
}

const props = defineProps<{
  open: boolean;
  /** 编辑模式下传入；新建模式传 null */
  moment: Moment | null;
  submitting?: boolean;
  lastSavedAt?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: MomentUpdatePayload): void;
  (e: 'save-draft'): void;
}>();

const isEdit = computed(() => !!props.moment);

const form = reactive<MomentFormState>({
  content: '',
  mood: '',
  tags: [],
  visibility: 'public',
  status: 'published',
  is_pinned: false,
  allow_comment: true,
});

const tagInput = ref('');

const contentTextareaRef = ref<HTMLTextAreaElement | null>(null);

// 同步 props.moment → form
watch(
  () => props.moment,
  (m) => {
    if (m) {
      form.content = m.content;
      form.mood = m.mood ?? '';
      form.tags = [...m.tags];
      form.visibility = m.visibility;
      form.status = m.status;
      form.is_pinned = m.is_pinned;
      form.allow_comment = m.allow_comment;
    } else {
      form.content = '';
      form.mood = '';
      form.tags = [];
      form.visibility = 'public';
      form.status = 'published';
      form.is_pinned = false;
      form.allow_comment = true;
    }
    tagInput.value = '';
  },
  { immediate: true },
);

function toggleMood(emoji: string) {
  form.mood = form.mood === emoji ? '' : emoji;
}

function addTag() {
  const v = tagInput.value.trim().slice(0, 50);
  if (!v) return;
  if (form.tags.includes(v)) {
    tagInput.value = '';
    return;
  }
  if (form.tags.length >= 20) return;
  form.tags.push(v);
  tagInput.value = '';
}

function removeTag(idx: number) {
  form.tags.splice(idx, 1);
}

function handleSubmit() {
  const trimmed = form.content.trim();
  if (!trimmed || trimmed.length > 2000) return;
  const payload: MomentUpdatePayload = {
    content: trimmed,
    mood: form.mood || null,
    tags: form.tags,
    visibility: form.visibility,
    status: form.status,
    is_pinned: form.is_pinned,
    allow_comment: form.allow_comment,
  };
  emit('submit', payload);
}
</script>
