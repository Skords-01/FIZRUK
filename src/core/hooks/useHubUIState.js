import { useCallback, useState } from "react";
import { shouldShowOnboarding } from "../OnboardingWizard.jsx";

export function useHubUIState() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hubView, setHubView] = useState("dashboard");
  const [onboarding, setOnboarding] = useState(() => shouldShowOnboarding());

  const openChat = useCallback((message = null) => {
    setChatInitialMessage(message || null);
    setChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
    setChatInitialMessage(null);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return {
    chatOpen,
    chatInitialMessage,
    searchOpen,
    hubView,
    onboarding,
    setHubView,
    setOnboarding,
    setSearchOpen,
    openChat,
    closeChat,
    closeSearch,
  };
}
