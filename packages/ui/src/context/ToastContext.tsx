import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

export type ToastTone = 'info' | 'ok' | 'danger';

export interface ToastInput {
  message: string;
  detail?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface Toast extends ToastInput { id: number }

interface ToastContextType { notify: (toast: ToastInput) => void }

const ToastContext = createContext<ToastContextType>({ notify: () => {} });

const icons = { info: Info, ok: CircleCheck, danger: CircleAlert };

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = icons[toast.tone ?? 'info'];
  const paused = useRef(false);
  useEffect(() => {
    const ms = toast.tone === 'danger' ? 9000 : 4500;
    const timer = window.setTimeout(function tick() {
      if (paused.current) { window.setTimeout(tick, 1000); return; }
      onDismiss(toast.id);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  return (
    <div className="toast" data-tone={toast.tone ?? 'info'} role={toast.tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }} onBlur={() => { paused.current = false; }}>
      <Icon size={16} aria-hidden="true" />
      <div className="grow">
        <div>{toast.message}</div>
        {toast.detail && <div className="sub">{toast.detail}</div>}
        {toast.action && (
          <button type="button" className="link-btn" style={{ marginTop: 4 }}
            onClick={() => { toast.action?.onClick(); onDismiss(toast.id); }}>{toast.action.label}</button>
        )}
      </div>
      <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts(list => list.filter(t => t.id !== id)), []);
  const notify = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts(list => [...list.slice(-2), { ...toast, id }]);
  }, []);
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
