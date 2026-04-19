import { lazy, Suspense } from "react";
import { ErrorBoundary } from "../ErrorBoundary";

const HubSearch = lazy(() =>
  import("../HubSearch.jsx").then((m) => ({ default: m.HubSearch })),
);
const HubChat = lazy(() => import("../HubChat"));

// Модалки огортаємо в ErrorBoundary, щоб непередбачений збій у HubChat
// або HubSearch не ламав увесь хаб — просто закриваємо модалку, а хаб
// залишається робочим. `fallback={null}` = тихий no-op: користувач
// ще має closeChat/closeSearch через зовнішні хендлери, а Sentry
// отримає exception через lazy-forward у `captureException`.
export function HubModals({
  chatOpen,
  onCloseChat,
  chatInitialMessage,
  searchOpen,
  onCloseSearch,
  onOpenModule,
}) {
  return (
    <>
      {chatOpen && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <HubChat
              onClose={onCloseChat}
              initialMessage={chatInitialMessage}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {searchOpen && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <HubSearch onClose={onCloseSearch} onOpenModule={onOpenModule} />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
