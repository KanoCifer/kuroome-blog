<script setup lang="ts">
import MarkdownEditor from './components/MarkdownEditor.vue';
import MetaRow from './components/MetaRow.vue';
import { Button as UiButton, IconSave } from '@/components';
import { blogGateway } from '@readinglist/api';
import { useNotificationStore } from '@/stores';
import { AnimatePresence, Motion } from 'motion-v';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const notification = useNotificationStore();

// ----- Reduced motion gate (Apple §14) -----
// motion-v still ships its spring/bounce settings, but we tighten the
// transitions to short opacity cross-fades under this media query.
const reducedMotion = ref(false);
onMounted(() => {
  reducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
});

// Post state
const isEdit = ref(false);
const postId = ref<string | null>(null);
const title = ref('');
const summary = ref('');
const cover = ref('');
const tags = ref<string[]>([]);
const tagInput = ref('');
const pin = ref(false);
const loading = ref(false);
const error = ref('');

// Markdown state
const markdownBody = ref('');
const markdownEditorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null);

// Meta drawer (summary + cover): collapsed by default — the writing canvas
// is the focal point, metadata is peek-on-demand. Now rendered as an
// iOS-style side sheet anchored to the right edge.
const sheetOpen = ref(false);

const handleMetaUploadError = (message: string) => {
  notification.error(message);
};

// Draft management
const draftKey = computed(() => `blog-draft-${postId.value || 'new'}`);
const lastSavedAt = ref<Date | null>(null);
const hasUnsavedChanges = ref(false);
const autoSaveEnabled = ref(true);

// Tag input handling
const addTag = (raw: string) => {
  const value = raw.trim();
  if (value && !tags.value.includes(value)) {
    tags.value.push(value.slice(0, 50));
  }
  tagInput.value = '';
};

const removeTag = (tag: string) => {
  tags.value = tags.value.filter((t) => t !== tag);
};

const handleTagKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    if (tagInput.value.trim()) {
      addTag(tagInput.value);
    }
  } else if (
    event.key === 'Backspace' &&
    !tagInput.value &&
    tags.value.length
  ) {
    tags.value.pop();
  }
};

// Auto-save with debounce
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const saveDraft = () => {
  const draft = {
    title: title.value,
    summary: summary.value,
    cover: cover.value,
    markdownBody: markdownBody.value,
    tags: tags.value,
    pin: pin.value,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(draftKey.value, JSON.stringify(draft));
  lastSavedAt.value = new Date();
  hasUnsavedChanges.value = false;
};

watch(
  [title, summary, cover, markdownBody, tags, pin],
  () => {
    hasUnsavedChanges.value = true;
    if (autoSaveEnabled.value) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveDraft, 3000);
    }
  },
  { deep: true },
);

const restoreDraft = (): boolean => {
  const saved = localStorage.getItem(draftKey.value);
  if (!saved) return false;
  try {
    const draft = JSON.parse(saved);
    title.value = draft.title || '';
    summary.value = draft.summary || '';
    cover.value = draft.cover || '';
    markdownBody.value = draft.markdownBody || '';
    tags.value = Array.isArray(draft.tags) ? draft.tags : [];
    pin.value = draft.pinned ?? draft.pin ?? false;
    if (draft.savedAt) lastSavedAt.value = new Date(draft.savedAt);
    return true;
  } catch {
    return false;
  }
};

const clearDraft = () => {
  localStorage.removeItem(draftKey.value);
  lastSavedAt.value = null;
};

const hasDraft = computed(() => !!localStorage.getItem(draftKey.value));
const showDraftRestore = ref(false);

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

const getCurrentContent = (): string => markdownBody.value;

const handleSaveDraft = () => {
  saveDraft();
  notification.success('草稿已保存');
};

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    handleSaveDraft();
  }
};

// Fetch existing post
const fetchPost = async (id: string) => {
  loading.value = true;
  try {
    const post = await blogGateway.getLegacyPost(id);
    title.value = post.title || '';
    summary.value = post.summary || '';
    cover.value = post.cover || '';
    tags.value = Array.isArray(post.tags) ? post.tags : [];
    pin.value = Boolean(post.is_pinned);
    markdownBody.value = post.body || '';
    // Auto-open the side sheet if cover or summary is set on an existing post
    if (post.summary || post.cover) sheetOpen.value = true;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '加载文章失败';
    notification.error(error.value);
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const formRef = ref<HTMLElement | null>(null);

const handleSubmit = async () => {
  if (!formRef.value || !document.body.contains(formRef.value)) {
    console.warn('Form submission canceled because the form is not connected');
    return;
  }

  if (!title.value.trim()) {
    error.value = '标题不能为空';
    notification.error(error.value);
    return;
  }

  let currentContent: string;
  if (markdownEditorRef.value) {
    try {
      currentContent = await markdownEditorRef.value.getContentForPublish();
    } catch (err) {
      error.value = '图片上传失败';
      notification.error(error.value);
      console.error(err);
      return;
    }
  } else {
    currentContent = getCurrentContent();
  }

  if (!currentContent.trim()) {
    error.value = '内容不能为空';
    notification.error(error.value);
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const payload = {
      title: title.value,
      body: currentContent,
      summary: summary.value,
      cover: cover.value.trim() || null,
      tags: tags.value,
      is_pinned: pin.value,
    };

    if (isEdit.value && postId.value) {
      const updatePayload = { ...payload, _id: postId.value };
      await blogGateway.updateLegacyPost(updatePayload);
      notification.success('文章更新成功');
    } else {
      await blogGateway.createLegacyPost(payload);
      notification.success('文章发布成功');
    }

    clearDraft();
    router.back();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '保存文章失败';
    notification.error(error.value);
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.back();
};

const discardDraftAndLoadServer = async () => {
  showDraftRestore.value = false;
  if (postId.value) await fetchPost(postId.value);
};

const adoptDraft = () => {
  restoreDraft();
  showDraftRestore.value = false;
  notification.success('已恢复草稿');
};

const wordCount = computed(() => {
  const text = markdownBody.value.trim();
  if (!text) return 0;
  const stripped = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_>~-]+/g, ' ');
  const cjkChars = (stripped.match(/[一-鿿㐀-䶿]/g) || []).length;
  const latinWords = (
    stripped.replace(/[一-鿿㐀-䶿]/g, ' ').match(/[A-Za-z0-9]+/g) || []
  ).length;
  return cjkChars + latinWords;
});

const readingMinutes = computed(() =>
  Math.max(1, Math.round(wordCount.value / 400)),
);

const savedAtLabel = computed(() => {
  if (hasUnsavedChanges.value) return '未保存的更改';
  if (lastSavedAt.value) {
    const t = lastSavedAt.value.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `草稿已存 · ${t}`;
  }
  return '准备就绪';
});

// ----- Spring presets following Apple's table (Apple §4) -----
// Default UI spring: critically damped (bounce 0) — graceful non-bouncy settle.
// Momentum / commit spring: bounce 0.2 — used when a tap is a real commit.
const SPRING_DEFAULT = { type: 'spring', bounce: 0, duration: 0.45 } as const;
const SPRING_SHEET = { type: 'spring', bounce: 0.15, duration: 0.45 } as const;
const SPRING_PIN = { type: 'spring', bounce: 0.2, duration: 0.4 } as const;

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('beforeunload', handleBeforeUnload);

  const id = route.params.id;

  if (id && id !== 'new') {
    isEdit.value = true;
    postId.value = String(id);

    if (hasDraft.value) {
      showDraftRestore.value = true;
    } else {
      await fetchPost(postId.value);
    }
  } else {
    if (hasDraft.value && restoreDraft()) {
      showDraftRestore.value = false;
      notification.success('已恢复上次草稿');
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});
</script>

<template>
  <!--
    写作台 · Spotlight 版
    一个工具页，不是详情页。BasicDetail 那种 hero 折纸壳子被剥离了 —
    标题就是输入框，编辑器就是主角，元数据折叠在右侧 iOS 风格 sheet 中。

    视觉策略：
    · 页面底色 = bg-page (warm-gray)，背景叠一层"dim world"卡片来退后景
    · 编辑器在它之上浮起 = bg-surface (paper)，靠 inset highlight + 软阴影分层
    · 底部悬浮 dock = backdrop-blur 半透明，按钮气泡按 Apple §12 的层级编码
    · 侧栏 sheet 用 damping 0.85 spring 进入（Apple sheet 表格的推荐值）
    · 置顶按钮在 commit 时获得 360° 旋转 + bounce 0.2，因为它有 momentum 含义
    · 所有动画 honor prefers-reduced-motion
  -->
  <div class="spot-root">
    <!-- 暗化背景世界：让编辑器成为页面上最亮的对象 (Spotlight) -->
    <div class="spot-world" aria-hidden="true">
      <div class="spot-world__bg"></div>
      <div class="spot-world__cards">
        <div class="spot-world__card"></div>
        <div class="spot-world__card"></div>
        <div class="spot-world__card"></div>
      </div>
    </div>

    <form
      v-if="!loading || !isEdit"
      ref="formRef"
      class="spot-stage"
      @submit.prevent="handleSubmit"
    >
      <!-- ─── Top bar: breadcrumb · status ─── -->
      <Motion
        as="header"
        class="spot-head"
        :initial="reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 14, scale: 0.985 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="
          reducedMotion
            ? { duration: 0.2 }
            : { ...SPRING_DEFAULT }
        "
      >
        <button
          type="button"
          class="spot-back"
          @click="router.back()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clip-rule="evenodd"
            />
          </svg>
          <span>书房</span>
        </button>

        <span aria-hidden="true" class="text-border">/</span>

        <span class="text-ink/80 font-serif">
          {{ isEdit ? '校样' : '新篇' }}
        </span>

        <span v-if="isEdit && postId" class="text-muted/60 font-mono">
          #{{ postId }}
        </span>

        <span class="spot-head__spacer"></span>

        <span class="spot-head__status">
          <span class="spot-head__status-dot" aria-hidden="true"></span>
          <span class="font-serif italic">{{ savedAtLabel }}</span>
        </span>
      </Motion>

      <!-- ─── Draft restore: iOS-style top-anchored sheet ─── -->
      <AnimatePresence>
        <Motion
          v-if="showDraftRestore"
          as="div"
          class="spot-draft"
          :initial="
            reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }
          "
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -12, scale: 0.97 }
          "
          :transition="
            reducedMotion ? { duration: 0.2 } : SPRING_DEFAULT
          "
        >
          <span class="spot-draft__icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="h-3.5 w-3.5"
            >
              <path
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
              />
            </svg>
          </span>
          <div class="spot-draft__text">
            <strong>上次留有未完的草稿</strong>
            <span>
              {{
                lastSavedAt
                  ? `保存于 ${lastSavedAt.toLocaleString('zh-CN', { hour12: false })}`
                  : '时间不明'
              }}
            </span>
          </div>
          <button
            type="button"
            class="spot-draft__btn"
            @click="discardDraftAndLoadServer"
          >
            放弃
          </button>
          <button
            type="button"
            class="spot-draft__btn spot-draft__btn--primary"
            @click="adoptDraft"
          >
            续写
          </button>
        </Motion>
      </AnimatePresence>

      <!-- ─── Error: 内联短条 ─── -->
      <AnimatePresence>
        <Motion
          v-if="error"
          as="div"
          class="spot-error"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :exit="{ opacity: 0 }"
          :transition="{ duration: 0.2 }"
          role="alert"
        >
          <span class="font-serif italic">{{ error }}</span>
        </Motion>
      </AnimatePresence>

      <!-- ─── Title: 大字 serif，spring 入场 (Apple §7 anchored origin) ─── -->
      <Motion
        as="h1"
        class="spot-title"
        :initial="
          reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }
        "
        :animate="{ opacity: 1, y: 0 }"
        :transition="
          reducedMotion
            ? { duration: 0.2 }
            : { ...SPRING_DEFAULT, delay: 0.05 }
        "
      >
        <input
          v-model="title"
          type="text"
          required
          maxlength="120"
          :placeholder="isEdit ? '校订标题' : '无题'"
          aria-label="文章标题"
          class="spot-title__input"
        />
      </Motion>

      <!-- ─── Tags · Pin · Sheet trigger ─── -->
      <Motion
        as="div"
        class="spot-tagrow"
        :initial="
          reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }
        "
        :animate="{ opacity: 1, y: 0 }"
        :transition="
          reducedMotion
            ? { duration: 0.2 }
            : { ...SPRING_DEFAULT, delay: 0.12 }
        "
      >
        <!-- Tags chip cloud: 每个 chip spring 进入 (Apple §7 anchored origin) -->
        <div class="spot-tags">
          <AnimatePresence>
            <Motion
              v-for="(t, i) in tags"
              :key="t"
              as="span"
              class="spot-chip"
              :initial="
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.6, y: -4 }
              "
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :exit="
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.6 }
              "
              :transition="
                reducedMotion
                  ? { duration: 0.2 }
                  : { ...SPRING_DEFAULT, delay: 0.18 + i * 0.05 }
              "
            >
              #{{ t }}
              <button
                type="button"
                class="spot-chip__x"
                :aria-label="`删除标签 ${t}`"
                @click="removeTag(t)"
              >
                ×
              </button>
            </Motion>
          </AnimatePresence>
          <input
            v-model="tagInput"
            type="text"
            placeholder="+ 标签"
            class="spot-tags__input"
            @keydown="handleTagKeydown"
            @blur="
              () => {
                if (tagInput.trim()) addTag(tagInput);
              }
            "
          />
        </div>

        <!-- Pin: 唯一获得 bounce 0.2 的控件，因为 tap 是真正的 commit (Apple §4) -->
        <Motion
          as="button"
          type="button"
          class="spot-pin"
          :class="{ 'spot-pin--on': pin }"
          :animate="{ rotate: pin ? 360 : 0 }"
          :transition="
            reducedMotion
              ? { duration: 0 }
              : SPRING_PIN
          "
          :aria-pressed="pin"
          aria-label="置顶"
          @click="pin = !pin"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
            />
            <path
              d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
            />
          </svg>
          <span>{{ pin ? '已置顶' : '置顶' }}</span>
        </Motion>

        <button
          type="button"
          class="spot-sheetbtn"
          :aria-expanded="sheetOpen"
          aria-controls="meta-sheet"
          @click="sheetOpen = !sheetOpen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm.75 4.5a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75z"
              clip-rule="evenodd"
            />
          </svg>
          <span>摘要 · 封面</span>
          <span
            v-if="summary || cover"
            class="text-ink/60 ml-0.5 font-serif italic"
            aria-hidden="true"
          >
            ·
            {{
              [summary, cover].filter(Boolean).length === 1
                ? '已填一项'
                : '已填两项'
            }}
          </span>
        </button>
      </Motion>

      <!-- ─── The writing canvas: 浮起的纸 ─── -->
      <Motion
        as="section"
        class="spot-canvas"
        :initial="
          reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 24, scale: 0.985 }
        "
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="
          reducedMotion
            ? { duration: 0.2 }
            : { ...SPRING_DEFAULT, delay: 0.2 }
        "
      >
        <MarkdownEditor
          ref="markdownEditorRef"
          v-model="markdownBody"
          :post-id="postId ?? undefined"
          :title="title"
          :cover="cover"
          :tags="tags"
        />
      </Motion>

      <!-- ─── Meta data lives in the existing MetaRow component, wrapped
              in an iOS-style side sheet anchored to the right edge. ─── -->
      <AnimatePresence>
        <Motion
          v-if="sheetOpen"
          as="aside"
          id="meta-sheet"
          class="spot-sheet"
          :initial="
            reducedMotion ? { opacity: 0 } : { x: 480, opacity: 0 }
          "
          :animate="{ x: 0, opacity: 1 }"
          :exit="
            reducedMotion
              ? { opacity: 0 }
              : { x: 480, opacity: 0 }
          "
          :transition="
            reducedMotion ? { duration: 0.2 } : SPRING_SHEET
          "
        >
          <header class="spot-sheet__head">
            <span>摘要与封面</span>
            <button
              type="button"
              class="spot-sheet__close"
              aria-label="关闭"
              @click="sheetOpen = false"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-3.5 w-3.5"
              >
                <path
                  d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                />
              </svg>
            </button>
          </header>
          <div class="spot-sheet__body">
            <!-- MetaRow owns the v-model + emit-error business; we mount
                 it in expanded state inside the sheet and use it as a
                 pure summary/cover form. -->
            <MetaRow
              open
              :summary="summary"
              :cover="cover"
              :title="title"
              @update:summary="summary = $event"
              @update:cover="cover = $event"
              @upload-error="handleMetaUploadError"
            />
          </div>
        </Motion>
      </AnimatePresence>
    </form>

    <!-- Loading state for editing an existing post -->
    <div v-else-if="loading && isEdit" class="spot-loading">
      <div
        class="border-t-ink mx-auto h-7 w-7 animate-spin rounded-full border-2 motion-reduce:animate-none"
        aria-hidden="true"
      ></div>
      <p class="text-muted mt-3 font-serif text-xs italic">正取文稿…</p>
    </div>

    <!-- ─── Translucent floating dock (Apple §12 material weight) ─── -->
    <Motion
      as="nav"
      class="spot-dock"
      :initial="
        reducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 }
      "
      :animate="{ opacity: 1, y: 0 }"
      :transition="
        reducedMotion
          ? { duration: 0.2 }
          : { ...SPRING_DEFAULT, delay: 0.4 }
      "
      aria-label="作者工具栏"
    >
      <span class="spot-dock__meter font-serif">
        <span>{{ wordCount }} 字</span>
        <span aria-hidden="true" class="text-border">·</span>
        <span class="italic">约 {{ readingMinutes }} 分钟</span>
      </span>

      <button
        type="button"
        class="spot-dock__bubble"
        :aria-pressed="autoSaveEnabled"
        :aria-label="autoSaveEnabled ? '关闭自动保存' : '开启自动保存'"
        :title="
          autoSaveEnabled ? '自动保存 · ⌘S 手动触发' : '自动保存已关闭'
        "
        @click="autoSaveEnabled = !autoSaveEnabled"
      >
        <span
          :class="[
            'h-1.5 w-1.5 rounded-full transition-colors',
            autoSaveEnabled ? 'bg-ink/70' : 'bg-border',
          ]"
          aria-hidden="true"
        ></span>
        <span class="ml-1 tracking-wide">{{
          autoSaveEnabled ? '自动' : '手动'
        }}</span>
      </button>

      <button
        type="button"
        class="spot-dock__bubble"
        title="保存草稿 (⌘S)"
        aria-label="保存草稿"
        @click="handleSaveDraft"
      >
        <IconSave class="h-3 w-3" />
        <span class="ml-1 tracking-wide">存草</span>
      </button>

      <span class="spot-dock__divider" aria-hidden="true"></span>

      <button
        type="button"
        class="spot-dock__bubble spot-dock__bubble--ghost"
        @click="handleCancel"
      >
        取消
      </button>

      <UiButton
        type="submit"
        :disabled="loading"
        size="sm"
        class="spot-dock__publish"
        @click="handleSubmit"
      >
        <svg
          v-if="loading"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {{ isEdit ? '保存校样' : '发布新篇' }}
      </UiButton>
    </Motion>
  </div>
</template>

<style scoped>
/* ----- Spotlight's root: paper-tone, dim world layered behind ----- */
.spot-root {
  position: relative;
  min-height: 100dvh;
  font-family:
    'PingFang SC', 'HarmonyOS Sans', -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--ink);
  overflow-x: hidden;
}

/* ----- Dim world (退后景) ----- */
.spot-world {
  position: fixed;
  inset: 0;
  background: radial-gradient(
      circle at 50% 32%,
      oklch(from var(--page) calc(l + 0.03) c h) 0%,
      var(--page) 60%
    ),
    var(--page);
  filter: saturate(0.6) brightness(0.94);
  z-index: 0;
  pointer-events: none;
}
.spot-world__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, var(--page) 80%);
}
.spot-world__cards {
  position: absolute;
  top: 18%;
  left: 8%;
  right: 8%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  opacity: 0.18;
}
.spot-world__card {
  height: 220px;
  border-radius: 16px;
  background: var(--secondary);
  box-shadow: 0 1px 0 oklch(from var(--page) calc(l + 0.06) c h) inset;
}

/* ----- Bright stage: 编辑器在暗背景上浮起来 ----- */
.spot-stage {
  position: relative;
  z-index: 2;
  max-width: 56rem;
  margin: 0 auto;
  padding: 2.5rem 2rem 11rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ----- Top bar ----- */
.spot-head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.75rem;
  color: var(--muted-text);
  letter-spacing: 0.02em;
  margin-top: 1rem;
}
.spot-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border: 0;
  background: transparent;
  border-radius: 6px;
  color: var(--muted-text);
  cursor: pointer;
  transition: background 150ms ease-out;
  margin-left: -0.5rem;
}
.spot-back:hover {
  background: var(--secondary);
  color: var(--ink);
}
.spot-head__spacer {
  flex: 1;
}
.spot-head__status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.spot-head__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--ink);
  opacity: 0.7;
}

/* ----- Draft restore banner: iOS-style sheet, top-anchored ----- */
.spot-draft {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 24px -8px oklch(from var(--ink) l c h / 0.12);
}
.spot-draft__icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--muted-text);
  flex-shrink: 0;
}
.spot-draft__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 0.8125rem;
  line-height: 1.3;
  min-width: 0;
}
.spot-draft__text strong {
  font-weight: 500;
  color: var(--ink);
}
.spot-draft__text span {
  color: var(--muted-text);
  font-size: 0.75rem;
}
.spot-draft__btn {
  background: none;
  border: 0;
  padding: 0.25rem 0.625rem;
  font: inherit;
  color: var(--muted-text);
  cursor: pointer;
  border-radius: 6px;
  transition: background 150ms ease-out;
  font-size: 0.8125rem;
  flex-shrink: 0;
}
.spot-draft__btn:hover {
  background: var(--secondary);
  color: var(--ink);
}
.spot-draft__btn--primary {
  color: var(--ink);
}

/* ----- Inline error ----- */
.spot-error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  font-size: 0.875rem;
  color: var(--muted-text);
}

/* ----- Title ----- */
.spot-title {
  margin: 0;
  transform-origin: left center;
}
.spot-title__input {
  width: 100%;
  background: transparent;
  border: 0;
  outline: 0;
  padding: 0;
  font-family: 'Source Han Serif SC', 'Songti SC', 'Times New Roman', serif;
  font-size: clamp(2.5rem, 5.5vw, 3.75rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--ink);
  caret-color: var(--ink);
}
.spot-title__input::placeholder {
  color: var(--muted-text);
  opacity: 0.5;
}

/* ----- Tags + Pin + Sheet trigger row ----- */
.spot-tagrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.spot-tags {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: var(--secondary);
  border-radius: 999px;
  min-height: 28px;
}
.spot-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  background: var(--page);
  border-radius: 999px;
  color: var(--ink);
  font-size: 0.75rem;
  transform-origin: center;
}
.spot-chip__x {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--muted-text);
  cursor: pointer;
  line-height: 1;
}
.spot-chip__x:hover {
  color: var(--ink);
}
.spot-tags__input {
  width: 5rem;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 0.75rem;
  color: var(--ink);
}
.spot-tags__input::placeholder {
  color: var(--muted-text);
}

.spot-pin {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--secondary);
  color: var(--muted-text);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 150ms ease-out, border-color 150ms ease-out;
}
.spot-pin:hover {
  color: var(--ink);
}
.spot-pin--on {
  background: var(--ink);
  color: var(--page);
  border-color: var(--ink);
}

.spot-sheetbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--secondary);
  color: var(--muted-text);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 150ms ease-out;
}
.spot-sheetbtn:hover {
  color: var(--ink);
}

/* ----- Writing canvas: 浮起的纸 ----- */
.spot-canvas {
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: 18px;
  min-height: 28rem;
  box-shadow:
    0 1px 0 0 oklch(from var(--page) calc(l + 0.06) c h / 0.6) inset,
    0 2px 4px -1px oklch(from var(--ink) l c h / 0.04),
    0 24px 48px -16px oklch(from var(--ink) l c h / 0.14);
  overflow: hidden;
}

/* ----- iOS side sheet: anchored right edge ----- */
.spot-sheet {
  position: fixed;
  top: 4rem;
  right: 1.5rem;
  bottom: 6rem;
  width: 22rem;
  max-width: calc(100vw - 3rem);
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 1.25rem;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  box-shadow:
    0 0 0 1px oklch(from var(--page) calc(l + 0.06) c h) inset,
    0 32px 64px -16px oklch(from var(--ink) l c h / 0.18),
    0 12px 24px -8px oklch(from var(--ink) l c h / 0.1);
}
.spot-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  font-family: 'Source Han Serif SC', 'Songti SC', serif;
  color: var(--ink);
  border-bottom: 1px solid var(--border);
}
.spot-sheet__close {
  background: none;
  border: 0;
  padding: 0.25rem;
  border-radius: 6px;
  color: var(--muted-text);
  cursor: pointer;
  transition: background 150ms ease-out;
}
.spot-sheet__close:hover {
  background: var(--secondary);
}
.spot-sheet__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.25rem;
  overflow-y: auto;
}

/* ----- Loading ----- */
.spot-loading {
  position: relative;
  z-index: 2;
  padding: 8rem 2rem;
  text-align: center;
}

/* ----- Floating translucent dock (Apple §12) ----- */
.spot-dock {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: oklch(from var(--page) l c h / 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow:
    0 0 0 1px oklch(from var(--page) calc(l + 0.06) c h) inset,
    0 12px 24px -8px oklch(from var(--ink) l c h / 0.18),
    0 4px 8px -2px oklch(from var(--ink) l c h / 0.08);
  font-size: 0.8125rem;
  z-index: 6;
}
.spot-dock__meter {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.625rem;
  font-size: 0.75rem;
  color: var(--muted-text);
}
.spot-dock__bubble {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 32px;
  padding: 0 0.75rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted-text);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition:
    background 150ms ease-out,
    color 150ms ease-out,
    transform 100ms ease-out;
}
.spot-dock__bubble:hover {
  background: var(--secondary);
  color: var(--ink);
}
.spot-dock__bubble:active {
  transform: scale(0.94);
}
.spot-dock__bubble--ghost {
  font-size: 0.8125rem;
}
.spot-dock__divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}
.spot-dock__publish {
  border-radius: 999px !important;
  padding: 0.45rem 1.1rem !important;
  font-size: 0.8125rem !important;
}

/* ----- Reduced motion: cross-fade, not slide/spring (Apple §14) ----- */
@media (prefers-reduced-motion: reduce) {
  .spot-chip,
  .spot-pin {
    transition: none;
  }
}
</style>