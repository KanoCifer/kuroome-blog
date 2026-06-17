interface IconProps {
  className?: string;
}

export function MomentIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H6.75m6.75 0v3.75m-3.75-3.75v3.75m-3.75 0h10.5a2.25 2.25 0 002.25-2.25V9.621c0-.596-.237-1.169-.659-1.591l-5.871-5.872A2.25 2.25 0 0010.379 1.5H5.25A2.25 2.25 0 003 3.75v14.25A2.25 2.25 0 005.25 20.25z"
      />
    </svg>
  );
}