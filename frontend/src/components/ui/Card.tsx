import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-[20px] p-5 border border-slate-100/90 shadow-2xs font-bento text-slate-800 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
