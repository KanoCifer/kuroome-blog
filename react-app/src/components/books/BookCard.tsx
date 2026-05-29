import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { BookItem } from '@/types';

interface BookCardProps {
  book: BookItem;
  index?: number;
}

export function BookCard({ book, index = 0 }: BookCardProps) {
  const [coverError, setCoverError] = useState(false);

  const coverSrc = useMemo(() => {
    const raw = book.cover?.trim() || '';
    if (!raw) return '';

    if (raw.startsWith('/api/v1/rss/image-proxy?')) {
      return raw;
    }

    if (raw.startsWith('data:') || raw.startsWith('/')) {
      return raw;
    }

    if (/^https?:\/\//i.test(raw)) {
      return `/api/v1/rss/image-proxy?url=${encodeURIComponent(raw)}`;
    }

    return raw;
  }, [book.cover]);

  const badge = book.iscompleted
    ? {
        text: '已读',
        className:
          'bg-success/10 text-success',
      }
    : {
        text: '在读',
        className:
          'bg-primary/10 text-primary',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
      className="book-card-wrapper"
    >
      <div className="group overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {book.cover && !coverError ? (
            <img
              src={coverSrc}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-14 w-14 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.987 8.987 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.text}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3
            className="truncate text-base font-semibold text-foreground"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground opacity-70">
            {book.author}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
