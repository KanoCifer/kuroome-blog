<template>
  <Teleport to="body">
    <!-- 背景遮罩 -->
    <motion.div
      v-if="open"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :exit="{ opacity: 0 }"
      :transition="{ duration: 0.18 }"
      class="bg-ink/35 fixed inset-0 z-[9998] backdrop-blur-[6px]"
      @click="$emit('close')"
    />

    <!-- 抽屉面板 -->
    <AnimatePresence>
      <motion.aside
        v-if="open"
        :initial="{ x: '100%' }"
        :animate="{ x: 0 }"
        :exit="{ x: '100%' }"
        :transition="{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }"
        class="bg-background border-border fixed top-0 right-0 z-[9999] flex h-full w-full max-w-[420px] flex-col border-l shadow-[0_12px_32px_color-mix(in_oklch,var(--ink)_10%,transparent)] max-sm:max-w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <!-- header -->
        <header class="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
          <h2 id="detail-title" class="text-foreground font-serif text-lg font-medium leading-tight">
            {{ task?.title || '任务详情' }}
          </h2>
          <button
            class="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-1.5 transition-colors"
            aria-label="关闭"
            @click="$emit('close')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- body -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <template v-if="task">
            <!-- 状态选择器 -->
            <div class="mb-5">
              <span class="text-muted-foreground mb-2 block text-[10px] font-medium tracking-widest uppercase"
                >状态</span
              >
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="s in STATUSES"
                  :key="s"
                  class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
                  :class="
                    task.status === s
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  "
                  :aria-pressed="task.status === s"
                  @click="$emit('set-status', task.id, s)"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <!-- 类型 / 优先级 badges -->
            <div class="mb-5">
              <span class="text-muted-foreground mb-2 block text-[10px] font-medium tracking-widest uppercase"
                >标签</span
              >
              <div class="flex flex-wrap gap-1.5">
                <TypeBadge :type="task.type" />
                <PriorityBadge :priority="task.priority" />
                <span
                  v-if="task.scope"
                  class="text-muted-foreground border-border rounded-full border px-1.5 py-px text-[10px]"
                >
                  {{ task.scope }}
                </span>
                <span
                  v-if="task.slug"
                  class="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[10px] font-medium"
                >
                  {{ task.slug }}
                </span>
                <span
                  v-if="task.blocked_by && task.blocked_by.length"
                  class="rounded-full border px-1.5 py-px text-[10px] font-medium"
                  style="border-color: var(--warning); color: var(--warning)"
                >
                  ⛔ 依赖 {{ task.blocked_by.length }} 项
                </span>
              </div>
            </div>

            <!-- 描述 -->
            <div v-if="task.description" class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >描述</span
              >
              <div
                class="prose prose-sm max-w-none text-foreground"
                v-html="renderMarkdown(task.description)"
              />
            </div>

            <!-- 详情 -->
            <div v-if="task.detail" class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >详情</span
              >
              <div
                class="prose prose-sm max-w-none text-foreground"
                v-html="renderMarkdown(task.detail)"
              />
            </div>

            <!-- 截止日 -->
            <div v-if="task.due_date" class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >截止日</span
              >
              <p class="text-foreground text-sm">{{ task.due_date }}</p>
            </div>

            <!-- 验收标准 -->
            <div v-if="task.acceptance_criteria" class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >验收标准</span
              >
              <div
                class="prose prose-sm max-w-none text-foreground"
                v-html="renderMarkdown(task.acceptance_criteria)"
              />
            </div>

            <!-- 约束 -->
            <div v-if="task.constraints" class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >约束</span
              >
              <div
                class="prose prose-sm max-w-none text-foreground"
                v-html="renderMarkdown(task.constraints)"
              />
            </div>

            <!-- 上下文指针 -->
            <div v-if="task.context_pointers" class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >上下文指针</span
              >
              <p class="text-foreground font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                {{ task.context_pointers }}
              </p>
            </div>

            <!-- 元数据 -->
            <div class="mb-5">
              <span class="text-muted-foreground mb-1 block text-[10px] font-medium tracking-widest uppercase"
                >元数据</span
              >
              <p class="text-muted-foreground font-mono text-[11px] leading-relaxed">
                ID: {{ task.id }}<br />
                创建于 {{ (task.created_at || '').slice(0, 10) }}<br />
                更新于 {{ (task.updated_at || '').slice(0, 10) }}
              </p>
            </div>
          </template>
        </div>

        <!-- footer -->
        <footer class="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
          <button
            class="text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            @click="$emit('delete', task!.id)"
          >
            永久删除
          </button>
          <div class="flex items-center gap-2">
            <button
              class="text-muted-foreground hover:bg-muted focus-visible:ring-ring cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              @click="$emit('close')"
            >
              关闭
            </button>
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              @click="$emit('edit', task!.id)"
            >
              编辑
            </button>
          </div>
        </footer>
      </motion.aside>
    </AnimatePresence>
  </Teleport>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v';
import type { DevTask, DevTaskStatus } from '@/api/devtask';
import { renderMarkdown } from '@/composables/shared';
import TypeBadge from './TypeBadge.vue';
import PriorityBadge from './PriorityBadge.vue';

const STATUSES: DevTaskStatus[] = ['待评估', '待排期', '进行中', '已搁置', '已完成'];

defineProps<{
  open: boolean;
  task: DevTask | null;
}>();

defineEmits<{
  close: [];
  'set-status': [id: string, status: DevTaskStatus];
  edit: [id: string];
  delete: [id: string];
}>();
</script>
