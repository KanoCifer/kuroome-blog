import { useNavVisibility } from '@/components/basic/NavVisibilityContext';
import type {
  CreateTodoPayload,
  TodoPriority,
} from '@/services/todoService/types';
import { useTodoState, type Todo } from '@/stores/todoState';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

// Icons
function CheckIcon({ completed }: { completed: boolean }) {
  return (
    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
        completed
          ? 'border-blue-500 bg-blue-500'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
      }`}
    >
      {completed && (
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </div>
  );
}

function ArchiveIcon({ archived }: { archived?: boolean }) {
  if (archived) {
    return (
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
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>
    );
  }
  return (
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
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function EditIcon() {
  return (
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
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
  );
}

function CalendarIcon() {
  return (
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const styles = {
    low: 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400',
    medium:
      'border-yellow-200 bg-yellow-50 text-yellow-600 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400',
    high: 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400',
  };
  const labels = { low: '低', medium: '中', high: '高' };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}

// Filter tabs
type FilterType = 'all' | 'active' | 'completed' | 'archived';
const filterLabels: Record<FilterType, string> = {
  all: '全部',
  active: '进行中',
  completed: '已完成',
  archived: '归档',
};

// Sort options
type SortMode = 'createdAt' | 'priority' | 'dueDate';

export default function TodoListView() {
  const { hideNav, showNav } = useNavVisibility();
  const todoState = useTodoState();
  const { todos } = todoState;

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortMode, setSortMode] = useState<SortMode>('createdAt');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [newText, setNewText] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TodoPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  // Edit form state
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TodoPriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  // Computed lists
  const nonArchivedTodos = useMemo(
    () => todos.filter((t) => !t.archived),
    [todos],
  );
  const activeTodos = useMemo(
    () => nonArchivedTodos.filter((t) => !t.completed),
    [nonArchivedTodos],
  );
  const completedTodos = useMemo(
    () => nonArchivedTodos.filter((t) => t.completed),
    [nonArchivedTodos],
  );
  const archivedTodos = useMemo(() => todos.filter((t) => t.archived), [todos]);

  const getFilterCount = (f: FilterType) => {
    if (f === 'all') return nonArchivedTodos.length;
    if (f === 'active') return activeTodos.length;
    if (f === 'completed') return completedTodos.length;
    if (f === 'archived') return archivedTodos.length;
    return 0;
  };

  const displayTodos = useMemo(() => {
    const list =
      filter === 'all'
        ? nonArchivedTodos
        : filter === 'active'
          ? activeTodos
          : filter === 'completed'
            ? completedTodos
            : archivedTodos;

    const priorityWeight: Record<TodoPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...list].sort((a, b) => {
      if (sortMode === 'priority') {
        const wA = priorityWeight[a.priority || 'medium'];
        const wB = priorityWeight[b.priority || 'medium'];
        if (wA !== wB) return wB - wA;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortMode === 'dueDate') {
        if (!a.dueDate && !b.dueDate)
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    activeTodos,
    archivedTodos,
    completedTodos,
    filter,
    nonArchivedTodos,
    sortMode,
  ]);

  const handleAddTodo = async () => {
    if (!newText.trim()) return;
    const payload: CreateTodoPayload = {
      text: newText.trim(),
      description: newDescription.trim() || undefined,
      dueDate: newDueDate || undefined,
      priority: newPriority,
    };
    await todoState.addTodo(payload);
    setNewText('');
    setNewDescription('');
    setNewPriority('medium');
    setNewDueDate('');
    closeAddForm();
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority || 'medium');
    setEditDueDate(todo.dueDate || '');
  };

  const saveEdit = async () => {
    if (editingId && editText.trim()) {
      await todoState.updateTodo(editingId, {
        text: editText.trim(),
        description: editDescription.trim() || undefined,
        dueDate: editDueDate || undefined,
        priority: editPriority,
      });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return isoString;
    }
  };

  const completedCount = completedTodos.length;

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
      className="relative min-h-dvh bg-linear-to-b from-blue-50 to-white pb-32 dark:from-slate-900 dark:to-slate-900"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 px-4 py-4 backdrop-blur-md dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="ml-12 text-xl flex flex-col font-semibold text-gray-900 dark:text-gray-100">
              待办事项
              <span className="text-sm text-gray-500">
                {getFilterCount('all')} 项待办
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {(Object.keys(filterLabels) as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              filter === f
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {filterLabels[f]} ({getFilterCount(f)})
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <span className="text-sm text-gray-500">排序:</span>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="createdAt">创建时间</option>
          <option value="priority">优先级</option>
          <option value="dueDate">截止日期</option>
        </select>
      </div>

      {/* Todo List */}
      <div className="space-y-3 px-4">
        <AnimatePresence mode="popLayout">
          {displayTodos.map((todo) => (
            <motion.div
              key={todo.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`group relative rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-900 ${
                todo.archived ? 'opacity-60' : ''
              } ${
                todo.completed
                  ? 'border-gray-200 dark:border-gray-800'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              {editingId === todo.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-lg font-medium outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    autoFocus
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    placeholder="描述..."
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={editPriority}
                      onChange={(e) =>
                        setEditPriority(e.target.value as TodoPriority)
                      }
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="cursor-pointer rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        取消
                      </button>
                      <button
                        onClick={saveEdit}
                        className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => todoState.toggleTodo(todo.id)}
                    className="mt-0.5 cursor-pointer"
                  >
                    <CheckIcon completed={todo.completed} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-base font-medium transition-all ${
                          todo.completed
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {todo.text}
                      </h3>
                      <PriorityBadge priority={todo.priority || 'medium'} />
                      {todo.dueDate && (
                        <span
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            isOverdue(todo.dueDate) && !todo.completed
                              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
                              : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          <CalendarIcon />
                          {todo.dueDate}
                        </span>
                      )}
                    </div>

                    {todo.description && (
                      <p
                        className={`mt-1.5 text-sm text-gray-600 dark:text-gray-400 ${
                          todo.completed ? 'opacity-60' : ''
                        }`}
                      >
                        {todo.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-400">
                      创建于 {formatDate(todo.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-sm:opacity-100">
                    <button
                      onClick={() =>
                        todo.archived
                          ? todoState.unarchiveTodo(todo.id)
                          : todoState.archiveTodo(todo.id)
                      }
                      className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                      title={todo.archived ? '取消归档' : '归档'}
                    >
                      <ArchiveIcon archived={todo.archived} />
                    </button>
                    <button
                      onClick={() => startEdit(todo)}
                      className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                      title="编辑"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => todoState.removeTodo(todo.id)}
                      className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      title="删除"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {displayTodos.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {filter === 'archived' ? '暂无归档' : '暂无事项'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'archived'
                ? '归档的任务会显示在这里'
                : '记录下你接下来的计划吧！'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-4 w-[30vw ] dark:bg-slate-900/80">
        {completedCount > 0 && (
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => todoState.archiveCompleted()}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
            >
              <ArchiveIcon />
              归档已完成 ({completedCount})
            </button>
            <button
              onClick={() => todoState.clearCompleted()}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <TrashIcon />
              清除 ({completedCount})
            </button>
          </div>
        )}

        <button
          onClick={() => showAddFrom()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-4 font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98] dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <PlusIcon />
          添加待办
        </button>
      </div>

      {/* Add Form Modal */}
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
              className="absolute left-0 right-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-6 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  添加待办
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
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  type="text"
                  placeholder="待办内容..."
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
                      优先级
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) =>
                        setNewPriority(e.target.value as TodoPriority)
                      }
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
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
                  onClick={handleAddTodo}
                  disabled={!newText.trim()}
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
