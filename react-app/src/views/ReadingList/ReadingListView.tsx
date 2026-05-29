import { useCallback, useEffect, useMemo, useState } from 'react';
import { bookService } from '@/services/bookService';
import { useNotificationStore } from '@/stores/notificationState';
import type { BookItem, Pagination } from '@/types';

export default function ReadingListView() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBookId, setPendingBookId] = useState<number | null>(null);
  const notifier = useNotificationStore();
  const service = useMemo(() => bookService(), []);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fetchBooks = useCallback(
    async (page: number = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const data = await service.getBooks({ page, per_page: 20 });
        setBooks(data.books ?? []);
        setPagination(data.pagination ?? null);
      } catch (err) {
        setError('加载书籍失败，请稍后重试。');
        notifier.error(
          err instanceof Error ? err.message : '加载书籍失败，请稍后重试。',
        );
        setBooks([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    },
    [notifier, service],
  );

  useEffect(() => {
    void fetchBooks(1);
  }, [fetchBooks]);

  const stats = useMemo(() => {
    const total = books.length;
    const done = books.filter((b) => b.iscompleted).length;
    return { total, done, reading: Math.max(total - done, 0) };
  }, [books]);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsCompleted(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !author.trim()) {
      setError('请输入书名与作者');
      return;
    }

    const payload = {
      title: title.trim(),
      author: author.trim(),
      iscompleted: isCompleted,
    };

    const execute = async () => {
      try {
        if (editingId) {
          await service.updateBook(editingId, payload);
          notifier.success('更新成功');
        } else {
          await service.createBook(payload);
          notifier.success('添加成功');
        }
        resetForm();
        await fetchBooks(pagination?.page ?? 1);
      } catch (err) {
        notifier.error(err instanceof Error ? err.message : '保存失败');
      }
    };

    void execute();
  };

  const toggleStatus = (book: BookItem) => {
    const execute = async () => {
      setPendingBookId(book.id);
      try {
        await service.patchBookStatus(book.id, {
          iscompleted: !book.iscompleted,
        });
        setBooks((prev) =>
          prev.map((item) =>
            item.id === book.id
              ? { ...item, iscompleted: !item.iscompleted }
              : item,
          ),
        );
      } catch (err) {
        notifier.error(err instanceof Error ? err.message : '更新阅读状态失败');
      } finally {
        setPendingBookId(null);
      }
    };
    void execute();
  };

  const startEdit = (book: BookItem) => {
    setTitle(book.title);
    setAuthor(book.author);
    setIsCompleted(book.iscompleted);
    setEditingId(book.id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeBook = (book: BookItem) => {
    const execute = async () => {
      setPendingBookId(book.id);
      try {
        await service.deleteBook(book.id);
        notifier.success('删除成功');
        const nextBooks = books.filter((item) => item.id !== book.id);
        if (nextBooks.length === 0 && pagination?.has_prev) {
          await fetchBooks(pagination.prev_num ?? 1);
          return;
        }
        setBooks(nextBooks);
      } catch (err) {
        notifier.error(err instanceof Error ? err.message : '删除失败');
      } finally {
        setPendingBookId(null);
      }
    };
    void execute();
  };

  const visiblePages = useMemo(() => {
    if (!pagination) return [];
    const totalPages = pagination.pages;
    const current = pagination.page;
    const pages: number[] = [];
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(totalPages - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }
    return pages;
  }, [pagination]);

  const goToPage = (page: number) => {
    if (!pagination) return;
    if (page < 1 || page > pagination.pages) return;
    void fetchBooks(page);
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-orange-500 uppercase">
              Reading List
            </p>
            <h1 className="text-xl font-semibold text-foreground">
              我的阅读清单
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
              {stats.reading} Reading
            </span>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">
              {stats.done} Done
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6">
        <section className="rounded-3xl border border-warning/20 bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-6"
                aria-hidden="true"
              >
                <path
                  d="M4 6.5C4 5.119 5.119 4 6.5 4H18a2 2 0 012 2v12a2 2 0 01-2 2H6.5A2.5 2.5 0 014 17.5v-11z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 7.5h8M8 11h8M8 14.5h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                轻量记录你的阅读节奏
              </h2>
              <p className="text-sm text-muted-foreground">
                新增书籍、更新状态，全部在手机端也能快速完成。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/80 bg-card p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="书名"
                className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground transition outline-none focus:border-warning focus:bg-card"
              />
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="作者"
                className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground transition outline-none focus:border-warning focus:bg-card"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setIsCompleted((prev) => !prev)}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  isCompleted
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                }`}
              >
                {isCompleted ? '标记为已读' : '标记为在读'}
              </button>
              {editingId && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  正在编辑
                </span>
              )}
              {error && <span className="text-destructive">{error}</span>}
              <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent"
                  >
                    取消
                  </button>
                )}
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
                >
                  {editingId ? '保存修改' : '添加到清单'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            书籍列表
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-3xl bg-card shadow-sm" />
              <div className="h-20 animate-pulse rounded-3xl bg-card shadow-sm" />
              <div className="h-20 animate-pulse rounded-3xl bg-card shadow-sm" />
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              暂无书籍，先添加一本吧。
            </div>
          ) : (
            <ul className="space-y-3">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-4 shadow-sm transition hover:border-warning/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {book.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {book.author}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        book.iscompleted
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {book.iscompleted ? 'Done' : 'Reading'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => toggleStatus(book)}
                      disabled={pendingBookId === book.id}
                      className="rounded-full border border-border px-3 py-1 text-muted-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      切换状态
                    </button>
                    <button
                      onClick={() => startEdit(book)}
                      disabled={pendingBookId === book.id}
                      className="rounded-full border border-border px-3 py-1 text-muted-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => removeBook(book)}
                      disabled={pendingBookId === book.id}
                      className="rounded-full border border-transparent bg-destructive/10 px-3 py-1 text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pagination && pagination.pages > 1 && (
          <section className="flex items-center justify-center gap-2 pb-4 text-xs text-muted-foreground">
            <button
              type="button"
              disabled={!pagination.has_prev}
              onClick={() => goToPage(pagination.prev_num ?? 1)}
              className="rounded-full border border-border px-3 py-1 transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              上一页
            </button>
            {pagination.page > 2 && (
              <button
                type="button"
                onClick={() => goToPage(1)}
                className="rounded-full border border-transparent px-3 py-1 hover:bg-accent"
              >
                1
              </button>
            )}
            {pagination.page > 3 && <span className="px-1">...</span>}
            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`rounded-full px-3 py-1 ${
                  page === pagination.page
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-transparent hover:bg-accent'
                }`}
              >
                {page}
              </button>
            ))}
            {pagination.page < pagination.pages - 2 && (
              <span className="px-1">...</span>
            )}
            {pagination.page < pagination.pages - 1 && (
              <button
                type="button"
                onClick={() => goToPage(pagination.pages)}
                className="rounded-full border border-transparent px-3 py-1 hover:bg-accent"
              >
                {pagination.pages}
              </button>
            )}
            <button
              type="button"
              disabled={!pagination.has_next}
              onClick={() => goToPage(pagination.next_num ?? pagination.pages)}
              className="rounded-full border border-border px-3 py-1 transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一页
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
