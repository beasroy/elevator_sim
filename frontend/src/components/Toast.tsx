import { useEffect, useState } from 'react';

interface ToastProps {
  readonly message: string;
  readonly visible: boolean;
  readonly durationMs?: number;
  readonly onDismiss: () => void;
}

export default function Toast({
  message,
  visible,
  durationMs = 5000,
  onDismiss,
}: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    // Small delay so the enter transition plays
    const enterTimer = requestAnimationFrame(() => setShow(true));
    const dismissTimer = setTimeout(() => {
      setShow(false);
      setTimeout(onDismiss, 300);
    }, durationMs);
    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [visible, durationMs, onDismiss]);

  if (!visible && !show) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border transition-all duration-300
          bg-amber-950/90 border-amber-700/60 text-amber-200
          ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
      >
        <span className="text-lg">⚡</span>
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setShow(false);
            setTimeout(onDismiss, 300);
          }}
          className="ml-2 text-amber-400/70 hover:text-amber-200 transition-colors text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
