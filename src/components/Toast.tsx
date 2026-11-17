import { useEffect } from 'react';
import { clearToast, useUI } from '../store/uiStore';

/** Short-lived feedback banner ("CHECKPOINT!", "CRYSTAL +100"). */
export function Toast() {
  const toast = useUI((s) => s.toast);
  const toastId = toast?.id ?? 0;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.tone}`} key={toastId} role="status">
      {toast.text}
    </div>
  );
}
