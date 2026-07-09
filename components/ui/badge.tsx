import React from 'react';

interface BadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'live' | 'ended' | 'error';
  label?: string;
  className?: string;
}

export const Badge = ({ status, label, className = '' }: BadgeProps) => {
  let styles = '';
  let finalLabel = label || status;
  
  if (status === 'live') {
    styles = 'bg-uv-gradient text-text-primary border border-transparent shadow-[0_0_12px_rgba(123,47,247,0.3)] animate-live-pulse';
    finalLabel = label || 'LIVE NOW';
  } else if (status === 'approved') {
    styles = 'bg-success/10 text-success border border-success/30 shadow-[0_0_8px_rgba(34,211,166,0.1)]';
    finalLabel = label || 'APPROVED';
  } else if (status === 'pending' || status === 'scheduled') {
    styles = 'bg-warning/10 text-warning border border-warning/30 shadow-[0_0_8px_rgba(255,176,32,0.1)]';
    finalLabel = label || (status === 'scheduled' ? 'SCHEDULED' : 'PENDING');
  } else if (status === 'rejected' || status === 'ended' || status === 'error') {
    styles = 'bg-error/10 text-error border border-error/30 shadow-[0_0_8px_rgba(255,77,109,0.1)]';
    finalLabel = label || (status === 'ended' ? 'ENDED' : status.toUpperCase());
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-heading tracking-wider uppercase border ${styles} ${className}`}>
      {status === 'live' && (
        <span className="h-1.5 w-1.5 rounded-full bg-text-primary animate-indicator-pulse" />
      )}
      {finalLabel}
    </span>
  );
};
