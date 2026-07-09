import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-bg-elevated-2 border border-border rounded-xl px-4 py-3.5 text-text-primary placeholder:text-text-disabled text-base transition-all duration-200 outline-none focus:border-uv-purple focus:ring-1 focus:ring-uv-purple ${
            error ? 'border-error/50 focus:border-error focus:ring-error' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs font-semibold text-error mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
