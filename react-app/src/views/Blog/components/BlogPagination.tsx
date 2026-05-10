import type { BlogPagination } from '@/types';

export function BlogPagination({
  pagination,
  currentPage,
  onPageChange,
}: {
  pagination: BlogPagination;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const { page, pages: totalPages } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <nav className="flex justify-center gap-1" aria-label="分页">
      <button
        disabled={!pagination.has_prev}
        onClick={() => onPageChange(pagination.prev_num || 1)}
        className="disabled:text-muted-foreground/50 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {getVisiblePages().map((p, i) =>
        typeof p === 'number' ? (
          <button
            key={i}
            onClick={() => onPageChange(p)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              p === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            {p}
          </button>
        ) : (
          <span
            key={i}
            className="text-muted-foreground flex h-10 w-10 items-center justify-center"
          >
            {p}
          </span>
        ),
      )}

      <button
        disabled={!pagination.has_next}
        onClick={() => onPageChange(pagination.next_num || pagination.pages)}
        className="disabled:text-muted-foreground/50 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </nav>
  );
}
