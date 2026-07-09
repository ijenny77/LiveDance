import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gradient' | 'outline' | 'ghost' | 'success' | 'error' | 'warning';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = '', variant = 'gradient', isLoading, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-heading tracking-wide uppercase font-bold rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-uv-purple/50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none px-6 py-3 cursor-pointer';
    
    let variantStyles = '';
    if (variant === 'gradient') {
      variantStyles = 'bg-uv-gradient text-text-primary border border-transparent shadow-[0_0_15px_rgba(123,47,247,0.3)] hover:shadow-[0_0_25px_rgba(123,47,247,0.5)]';
    } else if (variant === 'outline') {
      variantStyles = 'bg-transparent text-text-primary border border-border hover:bg-bg-elevated hover:border-text-secondary';
    } else if (variant === 'ghost') {
      variantStyles = 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated';
    } else if (variant === 'success') {
      variantStyles = 'bg-success/20 text-success border border-success/30 hover:bg-success/30 hover:shadow-[0_0_15px_rgba(34,211,166,0.3)]';
    } else if (variant === 'error') {
      variantStyles = 'bg-error/20 text-error border border-error/30 hover:bg-error/30 hover:shadow-[0_0_15px_rgba(255,77,109,0.3)]';
    } else if (variant === 'warning') {
      variantStyles = 'bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 hover:shadow-[0_0_15px_rgba(255,176,32,0.3)]';
    }
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
