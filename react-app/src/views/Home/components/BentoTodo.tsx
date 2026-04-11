import { BentoCard } from '@/components/bento/BentoCard';
import { useTodoState } from '@/stores/todoState';
import { BookCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BentoTodo() {
  const todo = useTodoState();
  const title = 'TODO List';
  const todos = todo.todos;
  const completedCount = todos.filter((t) => t.completed).length;

  const todoList = todos.slice(0, 3).map((t) => (
    <div key={t.id} className="group flex items-start gap-3 py-2.5">
      {/* Checkbox */}
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-200">
        {t.completed && (
          <svg
            className="h-3 w-3 text-white dark:text-gray-900"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* <!-- Text --> */}
      <span className="text-sm leading-tight transition-colors duration-200 select-none">
        {t.text}
      </span>
    </div>
  ));
  return (
    <BentoCard>
      {/* <!-- Inner wrapper --> */}
      <div className="flex h-full flex-col">
        {/* <!-- Header --> */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wide text-neutral-500 uppercase transition-colors duration-300 group-hover:text-neutral-600 dark:text-neutral-400 dark:group-hover:text-neutral-300">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {completedCount} / {todos.length}
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

        {/* <!-- Collapsible Content --> */}
        <div className="contents">
          {/* <!-- List area --> */}
          <div className="no-scrollbar mx-3 flex-1 overflow-y-auto">
            {todoList}

            {/* <!-- Empty state --> */}
            {todos.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-6 text-gray-100 dark:text-gray-600">
                <span className="text-md flex flex-col items-center gap-2 font-medium tracking-wide">
                  <BookCheck className="size-12" />
                  所有任务已完成
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
