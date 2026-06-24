import { BentoCard } from '@/components/bento/BentoCard';
import { useTodoState, STATUS_LABELS } from '@/stores/todoState';
import type { DevTaskStatus } from '@/services/todoService/types';
import { BookCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

function statusClass(status: DevTaskStatus): string {
  const map: Record<DevTaskStatus, string> = {
    todo: 'border-primary/20 bg-primary/5 text-primary',
    'in-progress': 'border-warning/20 bg-warning/5 text-warning',
    done: 'border-success/20 bg-success/5 text-success',
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
        className={`mt-0.5 shrink-0 cursor-pointer rounded border px-1.5 py-0.5 text-xs font-medium ${statusClass(t.status)}`}
        onClick={() => todo.cycleStatus(t.id)}
      >
        {STATUS_LABELS[t.status]}
      </button>
      <span
        className={`text-sm leading-tight transition-colors duration-200 select-none ${
          t.status === 'done'
            ? 'text-muted-foreground line-through'
            : 'text-foreground'
        }`}
      >
        {t.title}
      </span>
    </div>
  ));

  return (
    <BentoCard className="h-full">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-muted-foreground group-hover:text-foreground text-xs font-bold tracking-wide uppercase transition-colors duration-300">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {doneCount} / {tasks.length}
            </span>
            <Link
              to="/todos"
              className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-1 outline-0 transition-colors"
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
                <p className="text-md text-muted-foreground flex flex-col items-center gap-2 font-medium tracking-wide">
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
