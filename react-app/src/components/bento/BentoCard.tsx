import type { ReactNode } from 'react';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function BentoCard({ children, className, onClick }: BentoCardProps) {
  return (
    <div
      style={{
        boxShadow: `
          color-mix(in srgb, var(--color-foreground) 12%, transparent) 0px 40px 50px -32px,
          color-mix(in srgb, var(--color-foreground) 8%, transparent) 0px 60px 80px -48px,
          rgba(255, 255, 255, 0.35) 0px 0px 20px 0px inset
        `,
      }}
      className={`bento-card squircle rounded-[64px] border border-border/60 bg-card/75 p-6 ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
