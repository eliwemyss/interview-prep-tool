import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'orange' | 'blue';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#25272a] text-[#9ca3af] border-[rgba(255,255,255,0.1)]',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-[#FF9B42]/10 text-[#FF9B42] border-[#FF9B42]/20',
    blue: 'bg-[#1D4AFF]/10 text-[#1D4AFF] border-[#1D4AFF]/20',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-200',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
