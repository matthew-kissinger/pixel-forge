import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Simple global toast store
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];
let toastIdCounter = 0;

const nextId = () => `toast_${Date.now()}_${++toastIdCounter}`;

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toasts]));
};

// eslint-disable-next-line react-refresh/only-export-components -- toast is a utility object, not a component
export const toast = {
  success: (message: string, duration = 3000) => {
    const id = nextId();
    toasts = [...toasts, { id, type: 'success', message, duration }];
    notifyListeners();
  },
  error: (message: string, duration = 5000) => {
    const id = nextId();
    toasts = [...toasts, { id, type: 'error', message, duration }];
    notifyListeners();
  },
  info: (message: string, duration = 3000) => {
    const id = nextId();
    toasts = [...toasts, { id, type: 'info', message, duration }];
    notifyListeners();
  },
  remove: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  },
  clearAll: () => {
    toasts = [];
    toastIdCounter = 0;
    notifyListeners();
  },
};

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: 'border-[var(--success)] bg-green-900/50',
  error: 'border-[var(--error)] bg-red-900/50',
  info: 'border-[var(--accent)] bg-indigo-900/50',
};

const iconColors = {
  success: 'text-[var(--success)]',
  error: 'text-[var(--error)]',
  info: 'text-[var(--accent)]',
};

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = icons[t.type];

  useEffect(() => {
    if (t.duration) {
      const timer = setTimeout(onRemove, t.duration);
      return () => clearTimeout(timer);
    }
  }, [t.duration, onRemove]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-right-full duration-200',
        colors[t.type]
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', iconColors[t.type])} />
      <p className="flex-1 text-sm text-[var(--text-primary)]">{t.message}</p>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 rounded p-0.5 hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const handleRemove = useCallback((id: string) => {
    toast.remove(id);
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => handleRemove(t.id)} />
      ))}
    </div>
  );
}
