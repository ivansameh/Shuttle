import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, leftIcon, rightIcon, fullWidth = true, ...props }, ref) => {
    
    const wrapperWidth = fullWidth ? 'w-full' : '';
    
    return (
      <div className={`${wrapperWidth} flex flex-col gap-1.5`}>
        {label && (
          <label className="text-xs font-semibold text-muted uppercase tracking-widest">
            {label}
          </label>
        )}
        
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-4 text-muted/70 flex items-center justify-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full bg-input-bg border border-border rounded-xl text-foreground placeholder-muted/70 text-sm font-medium shadow-sm transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[48px]
              ${leftIcon ? 'pl-11' : 'pl-4'}
              ${rightIcon ? 'pr-11' : 'pr-4'}
              ${error ? 'border-error/50 focus:ring-error/20 focus:border-error' : ''}
              ${className}
            `}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-4 text-muted/70 flex items-center justify-center pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-error font-medium mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
