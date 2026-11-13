import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage } from '../types/crm';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'error'
            ? AlertCircle
            : toast.variant === 'info'
              ? Info
              : CheckCircle2;

        const accentClasses =
          toast.variant === 'error'
            ? 'border-red-500/40 bg-slate-900 text-slate-100'
            : toast.variant === 'info'
              ? 'border-blue-500/40 bg-slate-900 text-slate-100'
              : 'border-emerald-500/40 bg-slate-900 text-slate-100';

        const iconColor =
          toast.variant === 'error'
            ? 'text-red-400'
            : toast.variant === 'info'
              ? 'text-blue-400'
              : 'text-emerald-400';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-3.5 py-2.5 shadow-lg transition-all duration-150 ${accentClasses}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <p className="text-sm font-medium text-slate-100 flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
