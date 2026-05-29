import { motion } from 'framer-motion';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function BentoCard({ children, className, onClick }: BentoCardProps) {
  const style = {
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={style}
      className={`card squircle rounded-[40px] border border-border/60 bg-card/50 p-6 shadow-sm ring ring-border/70 ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
