import { useNavVisibility } from '@/components/basic/NavVisibilityContext';
import type {
  CreateDevTaskPayload,
  DevTaskPriority,
  DevTaskStatus,
} from '@/services/devtaskService/types';
import { useTodoState, STATUS_LABELS } from '@/stores/todoState';
import type { DevTask } from '@/services/devtaskService/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

// Column definitions — v3 全量状态
interface ColumnDef {
  status: DevTaskStatus;
  title: string;
  dotClass: string;
  bgClass: string;
  emptyText: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: '待评估',
    title: '待评估',
    dotClass: 'bg-primary',
    bgClass: 'bg-primary/10',
    emptyText: '没有待评估任务',
  },
  {
    status: '待排期',
    title: '待排期',
    dotClass: 'bg-warning',
    bgClass: 'bg-warning/10',
    emptyText: '没有待排期任务',
  },
  {
    status: '进行中',
    title: '进行中',
    dotClass: 'bg-info',
    bgClass: 'bg-info/10',
    emptyText: '没有进行中任务',
  },
  {
    status: '已搁置',
    title: '已搁置',
    dotClass: 'bg-muted-foreground',
    bgClass: 'bg-muted-foreground/10',
    emptyText: '没有已搁置任务',
  },
  {
    status: '已完成',
    title: '已完成',
    dotClass: 'bg-success',
    bgClass: 'bg-success/10',
    emptyText: '没有已完成任务',
  },
];

// Semantic status badge styles
const STATUS_STYLES: Record<
  DevTaskStatus,
  { bg: string; border: string; text: string }
> = {
  '待评估': {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    text: 'text-primary',
  },
  '待排期': {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    text: 'text-warning',
  },
  '进行中': {
    bg: 'bg-info/10',
    border: 'border-info/30',
    text: 'text-info',
  },
  '已搁置': {
    bg: 'bg-muted-foreground/10',
    border: 'border-muted-foreground/30',
    text: 'text-muted-foreground',
  },
  '已完成': {
    bg: 'bg-success/10',
    border: 'border-success/30',
    text: 'text-success',
  },
};

function statusBadgeClasses(status: DevTaskStatus): string {
  const s = STATUS_STYLES[status];
  return `${s.bg} ${s.border} ${s.text}`;
}

function priorityLabel(p: DevTaskPriority): string {
  return { 'P0 紧急': '紧急', 'P1 高': '高', 'P2 中': '中', 'P3 低': '低' }[p];
}

function priorityBadgeClass(p: DevTaskPriority): string {
  const map: Record<DevTaskPriority, string> = {
    'P0 紧急': 'border-destructive/20 bg-destructive/10 text-destructive',
    'P1 高': 'border-warning/20 bg-warning/10 text-warning',
    'P2 中': 'border-primary/20 bg-primary/10 text-primary',
    'P3 低': 'border-border bg-secondary text-card-foreground',
  };
  return map[p];
}

// ----- Task Card -----
function TaskCard({
  task,
  onCycle,
  onCardClick,
  onDelete,
}: {
  task: DevTask;
  onCycle: (slug: string) => void;
  onCardClick: (task: DevTask) => void;
  onDelete: (slug: string) => void;
}) {
  const isDone = task.status === '已完成';
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => onCardClick(task)}
      className="group border-border/60 bg-background cursor-pointer rounded-xl border p-3.5 shadow-sm transition-shadow active:shadow-md"
    >
      <div className="flex items-start gap-2.5">
        {/* Status badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCycle(task.slug);
          }}
          className={`mt-0.5 shrink-0 cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all duration-300 ease-out ${statusBadgeClasses(task.status)}`}
        >
          {STATUS_LABELS[task.status]}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-snug font-medium ${
              isDone ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}
          >
            {task.title}
          </p>

          {task.description && (
            <p
              className={`text-muted-foreground mt-1 line-clamp-2 text-xs ${
                isDone ? 'opacity-60' : ''
              }`}
            >
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${priorityBadgeClass(task.priority)}`}
            >
              {priorityLabel(task.priority)}
            </span>
            {task.type && (
              <span className="rounded-full border border-border bg-secondary px-1.5 py-px text-[10px] font-medium text-card-foreground">
                {task.type}
              </span>
            )}
            {task.due_date && (
              <span
                className={`flex items-center gap-1 text-[10px] ${
                  isOverdue && !isDone
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                {task.due_date}
              </span>
            )}
          </div>
        </div>

        {/* Actions — always visible on mobile, hover on desktop */}
        <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.slug);
            }}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors"
            title="删除"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ----- Edit Bottom Sheet -----
function EditBottomSheet({
  task,
  onClose,
  onSave,
}: {
  task: DevTask;
  onClose: () => void;
  onSave: (slug: string, data: Partial<DevTask>) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<DevTaskPriority>(task.priority);
  const [status, setStatus] = useState<DevTaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.due_date || '');

  const handleSave = () => {
    if (title.trim()) {
      onSave(task.slug, {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        status,
      });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background/50 fixed inset-0 z-20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background absolute right-0 bottom-0 left-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">编辑任务</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted cursor-pointer rounded-lg p-1"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="任务内容..."
            className="border-border bg-background focus:border-primary w-full rounded-xl border px-4 py-3 text-base outline-none"
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="添加描述... (可选)"
            className="border-border bg-background focus:border-primary w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none"
          />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-muted-foreground text-sm font-medium">
                状态
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DevTaskStatus)}
                className="border-border bg-background cursor-pointer rounded-lg border px-3 py-2 text-sm"
              >
                <option value="待评估">待评估</option>
                <option value="待排期">待排期</option>
                <option value="进行中">进行中</option>
                <option value="已搁置">已搁置</option>
                <option value="已完成">已完成</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-muted-foreground text-sm font-medium">
                优先级
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DevTaskPriority)}
                className="border-border bg-background cursor-pointer rounded-lg border px-3 py-2 text-sm"
              >
                <option value="P0 紧急">紧急</option>
                <option value="P1 高">高</option>
                <option value="P2 中">中</option>
                <option value="P3 低">低</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-muted-foreground text-sm font-medium">
                截止日期
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-border bg-background cursor-pointer rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="bg-secondary text-card-foreground hover:bg-secondary/80 flex-1 cursor-pointer rounded-xl py-3.5 font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="bg-foreground text-background hover:bg-foreground/90 flex-1 cursor-pointer rounded-xl py-3.5 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ----- Column content (shared between mobile tab and desktop grid) -----
function ColumnContent({
  col,
  tasks,
  onCycle,
  onCardClick,
  onDelete,
}: {
  col: ColumnDef;
  tasks: DevTask[];
  onCycle: (slug: string) => void;
  onCardClick: (task: DevTask) => void;
  onDelete: (slug: string) => void;
}) {
  return (
    <>
      {/* Cards */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.slug}
              task={task}
              onCycle={onCycle}
              onCardClick={onCardClick}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground text-sm">{col.emptyText}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ----- Main Page -----
export default function TodoListView() {
  const { hideNav, showNav } = useNavVisibility();
  const todoState = useTodoState();
  const { tasks } = todoState;

  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [activeTab, setActiveTab] = useState<DevTaskStatus>('待评估');

  // Group tasks by status
  const grouped = useMemo(() => {
    const g: Record<DevTaskStatus, DevTask[]> = {
      '待评估': [],
      '待排期': [],
      '进行中': [],
      '已搁置': [],
      '已完成': [],
    };
    for (const t of tasks) {
      if (!t.is_deleted && g[t.status]) {
        g[t.status].push(t);
      }
    }
    return g;
  }, [tasks]);

  // Edit
  const handleCardClick = (task: DevTask) => {
    hideNav();
    setEditingTask(task);
  };

  const handleSaveEdit = async (slug: string, data: Partial<DevTask>) => {
    await todoState.updateTask(slug, data);
    showNav();
    setEditingTask(null);
  };

  const handleCloseEdit = () => {
    showNav();
    setEditingTask(null);
  };

  // Full add modal (mobile bottom sheet)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<DevTaskPriority>('P2 中');
  const [newStatus, setNewStatus] = useState<DevTaskStatus>('待评估');
  const [newDueDate, setNewDueDate] = useState('');

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    const payload: CreateDevTaskPayload = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      due_date: newDueDate || undefined,
      priority: newPriority,
      status: newStatus,
      type: '功能需求',
      scope: '前端-React',
    };
    await todoState.createTask(payload);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('P2 中');
    setNewDueDate('');
    closeAddForm();
  };

  const showAddFrom = () => {
    hideNav();
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    showNav();
    setShowAddForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        ease: 'easeOut',
        duration: 0.5,
        delay: 0.1,
      }}
      className="bg-background relative min-h-dvh pb-24"
    >
      {/* Header */}
      <div className="bg-background sticky top-0 z-10 ml-12 flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold">开发任务</h1>
          <p className="text-muted-foreground text-sm">{tasks.filter((t) => !t.is_deleted).length} 项任务</p>
        </div>
      </div>

      {/* Edit bottom sheet */}
      <AnimatePresence>
        {editingTask && (
          <EditBottomSheet
            task={editingTask}
            onClose={handleCloseEdit}
            onSave={handleSaveEdit}
          />
        )}
      </AnimatePresence>

      {/* Tab layout */}
      <div className="flex flex-col">
        {/* Tab bar */}
        <div className="border-border/50 bg-background flex items-center gap-1 border-b px-4">
          {COLUMNS.map((col) => {
            const isActive = activeTab === col.status;
            const count = grouped[col.status].length;
            return (
              <button
                key={col.status}
                onClick={() => setActiveTab(col.status)}
                className={`relative flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground border-transparent'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                {col.title}
                <span className="bg-background/5 rounded-full px-1.5 py-px text-[10px] tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active column */}
        <div className="flex min-h-[60vh] flex-col px-4 pt-4 pb-2">
          {COLUMNS.filter((col) => col.status === activeTab).map((col) => (
            <ColumnContent
              key={col.status}
              col={col}
              tasks={grouped[col.status]}
              onCycle={todoState.cycleStatus}
              onCardClick={handleCardClick}
              onDelete={todoState.deleteTask}
            />
          ))}
        </div>
      </div>

      {/* Bottom FAB */}
      <div className="fixed right-4 bottom-24 z-10">
        <button
          onClick={showAddFrom}
          className="bg-foreground text-background hover:bg-foreground/90 flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-3 font-medium shadow-lg transition-all active:scale-[0.97]"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          添加任务
        </button>
      </div>

      {/* Full add modal (bottom sheet) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background/50 fixed inset-0 z-20 backdrop-blur-sm"
            onClick={closeAddForm}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background absolute right-0 bottom-0 left-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-lg font-semibold">
                  添加任务
                </h2>
                <button
                  onClick={closeAddForm}
                  className="text-muted-foreground hover:bg-muted cursor-pointer rounded-lg p-1"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  type="text"
                  placeholder="任务内容..."
                  className="border-border bg-background focus:border-primary w-full rounded-xl border px-4 py-3 text-base outline-none"
                  autoFocus
                />

                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="添加描述... (可选)"
                  className="border-border bg-background focus:border-primary w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none"
                />

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      状态
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as DevTaskStatus)
                      }
                      className="border-border bg-background cursor-pointer rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="待评估">待评估</option>
                      <option value="待排期">待排期</option>
                      <option value="进行中">进行中</option>
                      <option value="已搁置">已搁置</option>
                      <option value="已完成">已完成</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      优先级
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) =>
                        setNewPriority(e.target.value as DevTaskPriority)
                      }
                      className="border-border bg-background cursor-pointer rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="P0 紧急">紧急</option>
                      <option value="P1 高">高</option>
                      <option value="P2 中">中</option>
                      <option value="P3 低">低</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      截止日期
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="border-border bg-background cursor-pointer rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateTask}
                  disabled={!newTitle.trim()}
                  className="bg-foreground text-background hover:bg-foreground/90 w-full cursor-pointer rounded-xl py-4 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
