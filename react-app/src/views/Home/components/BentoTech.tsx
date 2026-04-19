import { BentoCard } from '@/components/bento/BentoCard';

export function BentoTech() {
  const techStack = [
    { name: 'Python', color: 'blue' },
    { name: 'TaskIQ', color: 'green' },
    { name: 'Vue', color: 'rose' },
    { name: 'Postgre', color: 'indigo' },
    { name: 'SQLAlchemy', color: 'cyan' },
    { name: 'FastAPI', color: 'indigo' },
    { name: 'Redis', color: 'teal' },
    { name: 'MongoDB', color: 'fuchsia' },
    { name: 'React', color: 'blue' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50',
    yellow:
      'border-yellow-200 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50',
    green:
      'border-green-200 bg-green-100 text-green-700 hover:bg-green-200 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50',
    rose: 'border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50',
    teal: 'border-teal-200 bg-teal-100 text-teal-700 hover:bg-teal-200 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50',
    purple:
      'border-purple-200 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50',
    indigo:
      'border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
    cyan: 'border-cyan-200 bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50',
    fuchsia:
      'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:border-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/50',
  };

  return (
    <BentoCard>
      <div className="squircle p-2">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-sm font-bold text-slate-800 dark:text-slate-200">
          <svg
            className="h-5 w-5 text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Tech Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span
              key={tech.name}
              className={`cursor-default rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${colorClasses[tech.color]}`}
            >
              {tech.name}
            </span>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
