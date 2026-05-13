import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export default function Card({
  className = '',
  padding = 'md',
  hoverable = false,
  children,
  ...props
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3 text-sm',
    md: 'p-5',
    lg: 'p-8',
  };

  const hoverStyles = hoverable
    ? 'cursor-pointer transition-all duration-200 hover:border-gray-300 hover:shadow-md active:scale-[0.99]'
    : '';

  return (
    <div
      className={`bg-surface rounded-2xl border border-border shadow-sm flex flex-col ${paddings[padding]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
