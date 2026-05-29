import { type ReactNode } from 'react';

export function Modal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`animate-message-pop rounded-2xl p-2 shadow-lg ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
