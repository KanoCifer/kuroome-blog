import { motion } from 'framer-motion';
import type { Category } from '@/types';

interface CategorySidebarProps {
  categories: Category[];
  categoryCounts: Record<number, number>;
  activeCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  isLoading?: boolean;
}

export function CategorySidebar({
  categories,
  categoryCounts,
  activeCategoryId,
  onSelectCategory,
  isLoading = false,
}: CategorySidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          分类
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        分类
      </h3>
      <div className="flex flex-wrap gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectCategory(null)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeCategoryId === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <span>全部</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs ${
              activeCategoryId === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
          </span>
        </motion.button>
        {categories.map((category) => {
          const count = categoryCounts[category.id] || 0;
          return (
            <motion.button
              key={category.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCategory(category.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategoryId === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span>{category.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeCategoryId === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
