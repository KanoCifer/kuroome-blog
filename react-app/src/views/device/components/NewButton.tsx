export function NewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-primary text-primary-foreground shadow-primary/50 hover:bg-primary/90 focus:ring-ring flex w-full items-center justify-center gap-2 rounded-full px-4 py-4 font-bold shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      新增设备
    </button>
  );
}
