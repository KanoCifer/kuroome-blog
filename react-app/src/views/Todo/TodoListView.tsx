import { useNavVisibility } from '@/components/basic/NavVisibilityContext';
import type {
  CreateDevTaskPayload,
  DevTaskPriority,
  DevTaskStatus,
} from '@/services/todoService/types';
import { useTodoState, STATUS_LABELS } from '@/stores/todoState';
import type { DevTask } from '@/services/todoService/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

// Column definitions
interface ColumnDef {
  status: DevTaskStatus;
  title: string;
  dotClass: string;
  bgClass: string;
  emptyText: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: 'todo',
    title: '待办',
    dotClass: 'bg-blue-500',
    bgClass: 'bg-blue-50/40 dark:bg-blue-950/15',
    emptyText: '没有待开发任务',
  },
  {
    status: 'in-progress',
    title: '开发中',
    dotClass: 'bg-amber-500',
    bgClass: 'bg-amber-50/40 dark:bg-amber-950/15',
    emptyText: '没有开发中任务',
  },
  {
    status: 'done',
    title: '已完成',
    dotClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-50/40 dark:bg-emerald-950/15',
    emptyText: '没有已完成任务',
  },
];

function statusBadgeStyle(status: DevTaskStatus): React.CSSProperties {
  const colors: Record<DevTaskStatus, { bg: string; border: string; text: string }> = {
    todo: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
    'in-progress': { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
    done: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
  };
  const c = colors[status];
  return {
    backgroundColor: c.bg,
    borderColor: c.border,
    color: c.text,
  };
}

function priorityLabel(p: DevTaskPriority): string {
  return { low: '低', high: '高', default: '默认' }[p];
}

function priorityBadgeClass(p: DevTaskPriority): string {
  const map: Record<DevTaskPriority, string> = {
    low: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
    default:
      'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
  };
  return map[p];
}

// ----- Task Card -----
function TaskCard({
  task,
  onCycle,
  onEdit,
  onDelete,
}: {
  task: DevTask;
  onCycle: (id: string) => void;
  onEdit: (task: DevTask) => void;
  onDelete: (id: string) => void;
}) {
  const isDone = task.status === 'done';
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group rounded-xl border border-gray-200/60 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700/60 dark:bg-gray-900"
    >
      <div className="flex items-start gap-2.5">
        {/* Status badge */}
        <button
          onClick={() => onCycle(task.id)}
          className="mt-0.5 shrink-0 cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all duration-300 ease-out"
          style={statusBadgeStyle(task.status)}
        >
          {STATUS_LABELS[task.status]}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug ${
              isDone
                ? 'text-gray-400 line-through dark:text-gray-500'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {task.title}
          </p>

          {task.description && (
            <p
              className={`mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400 ${
                isDone ? 'opacity-60' : ''
              }`}
            >
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${priorityBadgeClass(task.priority || 'default')}`}
            >
              {priorityLabel(task.priority || 'default')}
            </span>
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 text-[10px] ${
                  isOverdue && !isDone
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
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
                {task.dueDate}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-sm:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="cursor-pointer rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
            title="编辑"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="cursor-pointer rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
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

// ----- Main Page -----
export default function TodoListView() {
  const { hideNav, showNav } = useNavVisibility();
  const todoState = useTodoState();
  const { tasks } = todoState;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<DevTaskPriority>('default');
  const [editDueDate, setEditDueDate] = useState('');

  // Quick-add state: which column has the active quick-add input
  const [addingStatus, setAddingStatus] = useState<DevTaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingStatus && quickInputRef.current) {
      quickInputRef.current.focus();
    }
  }, [addingStatus]);

  // Group tasks by status
  const grouped = useMemo(() => {
    const g: Record<DevTaskStatus, DevTask[]> = {
      todo: [],
      'in-progress': [],
      done: [],
    };
    for (const t of tasks) {
      g[t.status]?.push(t);
    }
    return g;
  }, [tasks]);

  // Edit
  const startEdit = (task: DevTask) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'default');
    setEditDueDate(task.dueDate || '');
  };

  const saveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await todoState.updateTask(editingId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        dueDate: editDueDate || undefined,
        priority: editPriority,
      });
    }
    setEditingId(null);
  };

  // Quick add
  const startQuickAdd = (status: DevTaskStatus) => {
    setAddingStatus(status);
    setQuickTitle('');
  };

  const submitQuickAdd = async () => {
    const title = quickTitle.trim();
    if (!title || !addingStatus) return;
    const payload: CreateDevTaskPayload = { title, status: addingStatus };
    await todoState.createTask(payload);
    setAddingStatus(null);
  };

  // Full add modal (mobile bottom sheet)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<DevTaskPriority>('default');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatus, setNewStatus] = useState<DevTaskStatus>('todo');

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    const payload: CreateDevTaskPayload = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      dueDate: newDueDate || undefined,
      priority: newPriority,
      status: newStatus,
    };
    await todoState.createTask(payload);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('default');
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
      transition={{ type: 'spring', ease: 'easeOut', duration: 0.5, delay: 0.1 }}
      className="relative min-h-dvh bg-linear-to-b from-blue-50 to-white pb-28 dark:from-slate-900 dark:to-slate-900"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/80 px-4 py-4 backdrop-blur-md dark:bg-slate-900/80">
        <div>
          <h1 className="ml-12 text-xl font-semibold text-gray-900 dark:text-gray-100">
            开发任务
          </h1>
          <p className="text-sm text-gray-500">{tasks.length} 项任务</p>
        </div>
      </div>

      {/* Horizontal scroll board */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-2">
        {COLUMNS.map((col) => {
          const colTasks = grouped[col.status];

          return (
            <div
              key={col.status}
              className={`flex w-[85vw] shrink-0 snap-center flex-col rounded-2xl p-4 sm:w-[320px] ${col.bgClass}`}
              style={{ minHeight: '60vh' }}
            >
              {/* Column header */}
              <div className="mb-4 flex shrink-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${col.dotClass}`}
                />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {col.title}
                </h3>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-500 dark:bg-white/10 dark:text-gray-400">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {/* Edit overlay */}
                {editingId && (
                  <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      autoFocus
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      placeholder="描述..."
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={editPriority}
                        onChange={(e) =>
                          setEditPriority(e.target.value as DevTaskPriority)
                        }
                        className="cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="default">默认</option>
                        <option value="low">低</option>
                        <option value="high">高</option>
                      </select>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <div className="ml-auto flex gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="cursor-pointer rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        >
                          取消
                        </button>
                        <button
                          onClick={saveEdit}
                          className="cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {colTasks.map((task) =>
                    editingId === task.id ? null : (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onCycle={todoState.cycleStatus}
                        onEdit={startEdit}
                        onDelete={todoState.deleteTask}
                      />
                    ),
                  )}
                </AnimatePresence>

                {/* Empty state */}
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      {col.emptyText}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick add */}
              <div className="mt-3 shrink-0 border-t border-gray-200/50 pt-3 dark:border-gray-700/50">
                {addingStatus !== col.status ? (
                  <button
                    onClick={() => startQuickAdd(col.status)}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    添加
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={quickInputRef}
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      type="text"
                      placeholder={`添加${col.title}任务...`}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitQuickAdd();
                        if (e.key === 'Escape') setAddingStatus(null);
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAddingStatus(null)}
                        className="cursor-pointer rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        取消
                      </button>
                      <button
                        onClick={submitQuickAdd}
                        disabled={!quickTitle.trim()}
                        className="cursor-pointer rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom FAB */}
      <div className="fixed right-4 bottom-24 z-10">
        <button
          onClick={showAddFrom}
          className="flex cursor-pointer items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 font-medium text-white shadow-lg transition-all hover:bg-gray-800 active:scale-[0.97] dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
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
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm"
            onClick={closeAddForm}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-0 left-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-6 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  添加任务
                </h2>
                <button
                  onClick={closeAddForm}
                  className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                  className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-base outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  autoFocus
                />

                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="添加描述... (可选)"
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      状态
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as DevTaskStatus)
                      }
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="todo">待办</option>
                      <option value="in-progress">开发中</option>
                      <option value="done">已完成</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      优先级
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) =>
                        setNewPriority(e.target.value as DevTaskPriority)
                      }
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="default">默认</option>
                      <option value="low">低</option>
                      <option value="high">高</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      截止日期
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateTask}
                  disabled={!newTitle.trim()}
                  className="w-full cursor-pointer rounded-xl bg-gray-900 py-4 font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
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
