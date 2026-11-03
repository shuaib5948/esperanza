import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    neutral: 'bg-amber-500/10 text-amber-200/60 border-amber-500/30',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] font-bold',
    md: 'px-2.5 py-0.5 text-xs font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bento rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
