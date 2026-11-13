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
            ? 'border-[#DC2626]/30 bg-white text-[#0F172A]'
            : toast.variant === 'info'
              ? 'border-[#2563EB]/25 bg-white text-[#0F172A]'
              : 'border-[#16A34A]/30 bg-white text-[#0F172A]';

        const iconColor =
          toast.variant === 'error'
            ? 'text-[#DC2626]'
            : toast.variant === 'info'
              ? 'text-[#2563EB]'
              : 'text-[#16A34A]';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-3.5 py-2.5 shadow-sm transition-all duration-150 ${accentClasses}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <p className="text-sm font-medium text-[#0F172A] flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
              className="rounded p-1 text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
