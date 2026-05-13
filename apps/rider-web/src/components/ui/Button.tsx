import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
  
  const variants = {
    primary:   'bg-gradient-to-br from-primary-700 via-primary-500 to-primary-700 text-white hover:opacity-95 shadow-lg shadow-primary-900/10 hover:shadow-primary-900/20 active:scale-[0.97]',
    secondary: 'bg-white text-foreground border border-border hover:bg-gray-50 focus:ring-border shadow-sm',
    accent:    'bg-gradient-to-br from-accent via-blue-500 to-accent text-white hover:opacity-95 shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-[0.97]',
    ghost:     'bg-transparent text-muted hover:text-foreground hover:bg-gray-100 focus:ring-gray-200',
    danger:    'bg-error/10 text-error border border-error/20 hover:bg-error/15 active:bg-error/20 focus:ring-error shadow-sm',
    outline:   'bg-transparent text-foreground border-2 border-border hover:bg-gray-50 hover:border-foreground focus:ring-border transition-all',
    success:   'bg-success/10 text-success border border-success/20 hover:bg-success/15 active:bg-success/20 focus:ring-success shadow-sm',
  };

  const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
}
