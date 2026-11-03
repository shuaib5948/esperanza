import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-[#0A0A0A] rounded-[20px] p-5 border border-white/[0.08] shadow-xl font-bento text-slate-100 transition-all hover:border-white/[0.14] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
