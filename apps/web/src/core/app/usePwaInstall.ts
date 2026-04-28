import { useCallback, useEffect, useRef, useState } from "react";
import { safeReadStringLS, safeWriteLS } from "@shared/lib/storage";

const PWA_SESSIONS_KEY = "pwa_session_count";
const PWA_DISMISSED_KEY = "pwa_install_dismissed";
const INSTALL_DELAY_MS = 30000;
const MIN_SESSIONS = 2;

export function usePwaInstall() {
  const [prompt, setPrompt] = useState(null);
  const [ready, setReady] = useState(false);
  const deferredRef = useRef(null);

  useEffect(() => {
    const count = parseInt(safeReadStringLS(PWA_SESSIONS_KEY) || "0", 10) + 1;
    safeWriteLS(PWA_SESSIONS_KEY, String(count));

    const handler = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!prompt) return;
    if (safeReadStringLS(PWA_DISMISSED_KEY) === "1") return;

    const sessions = parseInt(safeReadStringLS(PWA_SESSIONS_KEY) || "1", 10);

    if (sessions >= MIN_SESSIONS) {
      const timer = setTimeout(() => setReady(true), INSTALL_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [prompt]);

  const install = useCallback(async () => {
    const p = deferredRef.current;
    if (!p) return;
    p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === "accepted") {
      deferredRef.current = null;
      setPrompt(null);
      setReady(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    safeWriteLS(PWA_DISMISSED_KEY, "1");
    setReady(false);
    setPrompt(null);
  }, []);

  return { canInstall: !!prompt && ready, install, dismiss };
}
