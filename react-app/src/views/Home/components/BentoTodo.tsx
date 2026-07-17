import { BentoCard } from '@/components/bento/BentoCard';
import { useTodoState, STATUS_LABELS } from '@/stores/todoState';
import type { DevTaskStatus } from '@/services/devtaskService/types';
import { BookCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SPRING } from '@/constants/springs';

function statusClass(status: DevTaskStatus): string {
  const map: Record<DevTaskStatus, string> = {
    '待评估': 'border-primary/20 bg-primary/5 text-primary',
    '待排期': 'border-warning/20 bg-warning/5 text-warning',
    '进行中': 'border-info/20 bg-info/5 text-info',
    '已搁置': 'border-muted-foreground/20 bg-muted-foreground/5 text-muted-foreground',
    '已完成': 'border-success/20 bg-success/5 text-success',
  };
  return map[status];
}

export function BentoTodo() {
  const todo = useTodoState();
  const title = '开发任务';
  const tasks = todo.tasks;
  const doneCount = tasks.filter((t) => t.status === '已完成').length;
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  const taskList = tasks.slice(0, 3).map((t) => (
    <motion.div
      key={t.slug}
      layout
      transition={SPRING.card}
      className="group flex items-start gap-3 py-2.5"
    >
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={SPRING.snappy}
        className={`mt-0.5 shrink-0 cursor-pointer rounded border px-1.5 py-0.5 text-xs font-medium ${statusClass(t.status)}`}
        onClick={() => todo.cycleStatus(t.slug)}
      >
        {STATUS_LABELS[t.status]}
      </motion.button>
      <span
        className={`text-sm leading-tight transition-colors duration-200 select-none ${
          t.status === '已完成'
            ? 'text-muted-foreground line-through'
            : 'text-foreground'
        }`}
      >
        {t.title}
      </span>
    </motion.div>
  ));

  return (
    <BentoCard className="h-full">
      <div className="flex h-full flex-col">
        {/* 标题行 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium tabular-nums">
              {doneCount} / {tasks.length}
            </span>
            <Link
              to="/todos"
              className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-2 outline-0 transition-colors"
              title="查看详情"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* 进度条 */}
        <div className="bg-muted mb-4 h-1.5 overflow-hidden rounded-full">
          <motion.div
            className="bg-primary h-full rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={SPRING.reveal}
          />
        </div>

        {/* 任务列表 */}
        <div className="contents">
          <div className="no-scrollbar mx-3 flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {taskList}
            </AnimatePresence>

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
