import { useCallback, useEffect, useState } from "react";

export type HubView = "dashboard" | "reports" | "settings";

const VALID_VIEWS = new Set<string>(["dashboard", "reports", "settings"]);

function readViewFromURL(): HubView {
  try {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param && VALID_VIEWS.has(param)) return param as HubView;
  } catch {
    /* SSR / non-browser */
  }
  return "dashboard";
}

/** Options for `openChat`. */
export interface OpenChatOptions {
  /**
   * If true, the assistant immediately sends `message` instead of
   * prefilling it into the input. Used by the catalogue page when the
   * user taps a `requiresInput=false` capability.
   */
  autoSend?: boolean;
}

// Onboarding is now a URL-addressable route (`/welcome`) owned by
// `AppInner`; it no longer lives in hub UI state. The router handles
// gating and redirects, so this hook only tracks chat/search/hub-view.
export interface HubUIState {
  chatOpen: boolean;
  /**
   * When `true`, the chat dialog is mounted but visually collapsed to a
   * floating "minimize FAB" — the conversation, draft input, and active
   * request are preserved so the user can consult other modules without
   * losing context. Independent of `chatOpen` so the chat can be fully
   * dismissed (`closeChat`) without going through a minimized state.
   */
  chatMinimized: boolean;
  /** Number of assistant replies that arrived while minimized; surfaces as a
   *  badge on the FAB. Reset to 0 when the chat is restored. */
  chatUnseenCount: number;
  chatInitialMessage: string | null;
  chatAutoSend: boolean;
  searchOpen: boolean;
  hubView: HubView;
  setHubView: (view: HubView) => void;
  setSearchOpen: (value: boolean) => void;
  openChat: (message?: string | null, options?: OpenChatOptions) => void;
  closeChat: () => void;
  minimizeChat: () => void;
  restoreChat: () => void;
  setChatUnseenCount: (count: number) => void;
  closeSearch: () => void;
}

export function useHubUIState(): HubUIState {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatUnseenCount, setChatUnseenCount] = useState(0);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | null>(
    null,
  );
  const [chatAutoSend, setChatAutoSend] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hubView, setHubViewRaw] = useState<HubView>(readViewFromURL);

  const setHubView = useCallback((view: HubView) => {
    setHubViewRaw(view);

    // Sync the tab to URL search params so deep-links and back button work.
    const url = new URL(window.location.href);
    if (view === "dashboard") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", view);
    }
    window.history.pushState(null, "", url.toString());

    // Scroll to top when switching tabs.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Listen for back/forward navigation.
  useEffect(() => {
    const onPopState = () => {
      setHubViewRaw(readViewFromURL());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openChat = useCallback(
    (message: string | null = null, options: OpenChatOptions = {}) => {
      setChatInitialMessage(message || null);
      setChatAutoSend(Boolean(options.autoSend && message));
      setChatOpen(true);
      setChatMinimized(false);
      setChatUnseenCount(0);
    },
    [],
  );

  const closeChat = useCallback(() => {
    setChatOpen(false);
    setChatMinimized(false);
    setChatUnseenCount(0);
    setChatInitialMessage(null);
    setChatAutoSend(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setChatMinimized(true);
  }, []);

  const restoreChat = useCallback(() => {
    setChatMinimized(false);
    setChatUnseenCount(0);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return {
    chatOpen,
    chatMinimized,
    chatUnseenCount,
    chatInitialMessage,
    chatAutoSend,
    searchOpen,
    hubView,
    setHubView,
    setSearchOpen,
    openChat,
    closeChat,
    minimizeChat,
    restoreChat,
    setChatUnseenCount,
    closeSearch,
  };
}
