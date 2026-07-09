'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  text: string;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast = ({ message, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    error: <XCircle className="h-5 w-5 text-error" />,
  };

  const borderColors = {
    success: 'border-success/30 shadow-[0_0_15px_rgba(34,211,166,0.15)]',
    warning: 'border-warning/30 shadow-[0_0_15px_rgba(255,176,32,0.15)]',
    error: 'border-error/30 shadow-[0_0_15px_rgba(255,77,109,0.15)]',
  };

  return (
    <div className={`flex items-center gap-3 bg-bg-elevated border rounded-xl p-4 min-w-[280px] max-w-sm transition-all duration-300 transform translate-y-0 ${borderColors[message.type]}`}>
      {icons[message.type]}
      <p className="flex-1 text-sm font-medium text-text-primary">{message.text}</p>
      <button
        onClick={() => onClose(message.id)}
        className="text-text-disabled hover:text-text-primary transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer = ({
  toasts,
  onClose,
}: {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast} onClose={onClose} />
      ))}
    </div>
  );
};
