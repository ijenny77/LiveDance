import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export const Card = ({ children, className = '', glow = false, ...props }: CardProps) => {
  return (
    <div
      className={`bg-bg-elevated border border-border rounded-2xl p-6 transition-all duration-300 ${
        glow ? 'shadow-[0_0_30px_rgba(123,47,247,0.12)] border-uv-purple/20' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
