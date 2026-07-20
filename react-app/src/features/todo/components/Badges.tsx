import type {
  DevTaskKind,
  DevTaskPriority,
  DevTaskStatus,
  DevTaskType,
} from '@/features/todo/api/types';
import type { ReactNode } from 'react';

// ── 类型 chip ──
const TYPE_CLASS: Record<DevTaskType, string> = {
  问题: 'border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-400',
  功能需求:
    'border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-400',
  优化: 'border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400',
  技术债:
    'border-purple-200 bg-purple-50/60 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/30 dark:text-purple-400',
};

export function TypeBadge({ type }: { type: DevTaskType }) {
  return (
    <span
      className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${TYPE_CLASS[type] ?? 'border-border text-muted-foreground'}`}
    >
      {type}
    </span>
  );
}

// ── 优先级 chip ──
const PRIORITY_CLASS: Record<DevTaskPriority, string> = {
  'P0 紧急': 'border-destructive/40 bg-destructive/10 text-destructive',
  'P1 高':
    'border-orange-200 bg-orange-50/60 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/30 dark:text-orange-400',
  'P2 中': 'border-border text-muted-foreground',
  'P3 低': 'border-border text-muted-foreground/70',
};

export function PriorityBadge({ priority }: { priority: DevTaskPriority }) {
  return (
    <span
      className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${PRIORITY_CLASS[priority] ?? 'border-border text-muted-foreground'}`}
    >
      {priority}
    </span>
  );
}

// ── 状态 chip（带圆点） ──
const STATUS_CLASS: Record<DevTaskStatus, string> = {
  待评估: 'border-border text-muted-foreground',
  待排期: 'border-chart-3/40 bg-chart-3/10 text-chart-3',
  进行中: 'border-primary/40 bg-primary/10 text-primary',
  已搁置:
    'border-amber-300/50 bg-amber-50/60 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-400',
  已完成:
    'border-emerald-300/50 bg-emerald-50/60 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-400',
};

const STATUS_DOT: Record<DevTaskStatus, string> = {
  待评估: 'bg-muted-foreground',
  待排期: 'bg-chart-3',
  进行中: 'bg-primary',
  已搁置: 'bg-amber-500',
  已完成: 'bg-emerald-500',
};

export function StatusChip({ status }: { status: DevTaskStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[status] ?? 'border-border text-muted-foreground'}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-muted-foreground'}`}
      />
      {status}
    </span>
  );
}

// ── 任务角色 chip ──
const KIND_CLASS: Record<DevTaskKind, string> = {
  spec: 'border-border text-muted-foreground bg-warning/20',
  subtask: 'border-primary/30 bg-primary/5 text-primary',
};

export function KindBadge({ kind }: { kind?: DevTaskKind | '' | null }) {
  const k = kind === 'subtask' ? 'subtask' : 'spec';
  return (
    <span
      className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${KIND_CLASS[k]}`}
    >
      {k}
    </span>
  );
}

// ── 范围 chip ──
export function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="text-muted-foreground border-border rounded-full border px-1.5 py-px text-[10px]">
      {scope}
    </span>
  );
}

// ── slug chip ──
export function SlugBadge({ slug }: { slug: string }) {
  return (
    <span className="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[10px] font-medium">
      {slug}
    </span>
  );
}

// ── 可组合 badge 行 ──
export function BadgeRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}
