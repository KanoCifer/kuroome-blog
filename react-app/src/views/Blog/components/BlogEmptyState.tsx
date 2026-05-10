export function BlogEmptyState({ hasCategory }: { hasCategory: boolean }) {
  return (
    <div className="border-border bg-muted/30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="text-muted-foreground/50 h-12 w-12"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
        />
      </svg>
      <p className="text-muted-foreground mt-4 text-base font-medium">
        暂无文章
      </p>
      <p className="text-muted-foreground/70 mt-1 text-sm">
        {hasCategory ? '该分类下还没有文章' : '稍后再来看看吧'}
      </p>
    </div>
  );
}
