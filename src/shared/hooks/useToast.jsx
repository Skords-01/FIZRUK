import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (msg, type = "success", duration = 3500) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const success = useCallback((msg, duration) => show(msg, "success", duration), [show]);
  const error = useCallback((msg, duration) => show(msg, "error", duration ?? 5000), [show]);
  const info = useCallback((msg, duration) => show(msg, "info", duration), [show]);
  const warning = useCallback((msg, duration) => show(msg, "warning", duration ?? 5000), [show]);

  const api = { show, success, error, info, warning, dismiss, toasts };

  return (
    <ToastContext.Provider value={api}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
