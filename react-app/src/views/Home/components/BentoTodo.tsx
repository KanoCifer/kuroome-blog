import { BentoCard } from '@/components/bento/BentoCard';
import { useTodoState, STATUS_LABELS } from '@/stores/todoState';
import type { DevTaskStatus } from '@/services/todoService/types';
import { BookCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

function statusClass(status: DevTaskStatus): string {
  const map: Record<DevTaskStatus, string> = {
    todo: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'in-progress':
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return map[status];
}

export function BentoTodo() {
  const todo = useTodoState();
  const title = '开发任务';
  const tasks = todo.tasks;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const taskList = tasks.slice(0, 3).map((t) => (
    <div key={t.id} className="group flex items-start gap-3 py-2.5">
      <button
        className={`mt-0.5 shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium border ${statusClass(t.status)}`}
        onClick={() => todo.cycleStatus(t.id)}
      >
        {STATUS_LABELS[t.status]}
      </button>
      <span
        className={`text-sm leading-tight transition-colors duration-200 select-none ${
          t.status === 'done'
            ? 'text-gray-400 line-through dark:text-gray-500'
            : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {t.title}
      </span>
    </div>
  ));

  return (
    <BentoCard>
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide text-neutral-500 uppercase transition-colors duration-300 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {doneCount} / {tasks.length}
            </span>
            <Link
              to="/todos"
              className="cursor-pointer rounded-md p-1 text-gray-400 outline-0 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              title="查看详情"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Link>
          </div>
        </div>

        <div className="contents">
          <div className="no-scrollbar mx-3 flex-1 overflow-y-auto">
            {taskList}

            {tasks.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-6">
                <p className="text-md flex flex-col items-center gap-2 font-medium tracking-wide text-gray-400 dark:text-gray-200">
                  <BookCheck className="size-12" />
                  暂无开发任务
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
