// Toast notification system — supports error, success, info, warning.
import { useEffect } from "react";

const TYPE_ICONS = { error:"❌", success:"✅", info:"ℹ️", warning:"⚠️" };

export default function Toast({ toasts = [], onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={`toast toast-${toast.type ?? "info"} pointer-events-auto`}
      onClick={() => onDismiss(toast.id)}
      style={{ cursor: "pointer" }}
    >
      <span className="mr-2">{TYPE_ICONS[toast.type ?? "info"]}</span>
      {toast.message}
    </div>
  );
}
