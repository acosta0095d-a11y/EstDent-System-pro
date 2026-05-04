import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============================================================
// TOAST SYSTEM — Reemplaza todos los alert() y window.confirm
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  success: { bg: '#f0fdf4', border: '#86efac', color: '#15803d', icon: <CheckCircle size={16} /> },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#b91c1c', icon: <XCircle size={16} /> },
  warning: { bg: '#fffbeb', border: '#fcd34d', color: '#b45309', icon: <AlertTriangle size={16} /> },
  info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', icon: <Info size={16} /> },
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => {
        const cfg = TOAST_COLORS[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              minWidth: 280,
              maxWidth: 420,
              pointerEvents: 'auto',
              animation: 'toastSlideIn 0.25s cubic-bezier(0.4,0,0.2,1)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1e293b', lineHeight: 1.4 }}>
              {toast.message}
            </span>
            <button
              onClick={() => onClose(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: 2,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toastSlideIn { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
};

// ============================================================
// Hook reutilizable
// ============================================================
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    removeToast,
    success: useCallback((msg: string) => addToast('success', msg, 3500), [addToast]),
    error:   useCallback((msg: string) => addToast('error',   msg, 6000), [addToast]),
    warning: useCallback((msg: string) => addToast('warning', msg, 5000), [addToast]),
    info:    useCallback((msg: string) => addToast('info',    msg, 4000), [addToast]),
  };
};

// ============================================================
// Confirm Dialog (reemplaza window.confirm)
// ============================================================
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'primary', onConfirm, onCancel,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const confirmBg = variant === 'danger' ? '#ef4444' : '#0071e3';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          fontFamily: "'Inter', system-ui, sans-serif",
          animation: 'toastSlideIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 18px', background: confirmBg, border: 'none',
              borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
