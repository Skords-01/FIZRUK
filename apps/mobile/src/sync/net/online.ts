/**
 * Online-status adapter built on `@react-native-community/netinfo`.
 *
 * Web's `useCloudSync` reads `navigator.onLine` and listens to the
 * browser `online`/`offline` events. React Native has no such globals;
 * NetInfo is the community-standard bridge to the OS connectivity APIs
 * (CoreTelephony / ConnectivityManager).
 *
 * This module exposes three primitives so the rest of the sync code
 * looks the same as web:
 *
 *   - `isOnline()`        — synchronous best-guess used inside engines
 *                            that need to decide "push vs. enqueue"
 *                            without awaiting. Seeded by the first
 *                            NetInfo event and kept up to date via the
 *                            subscription.
 *   - `onOnlineChange(cb)` — fires exactly when connectivity flips
 *                            offline → online (matching the browser
 *                            `online` event), NOT on every NetInfo tick.
 *   - `startOnlineTracker()` — one-call bootstrap that installs the
 *                            single process-wide NetInfo subscription;
 *                            idempotent.
 *
 * The "only fire on offline→online transitions" shape matches how
 * `useSyncRetry` on web hooks `window.addEventListener('online', …)` —
 * we explicitly do NOT want every background radio flap to trigger a
 * sync, only the transitions that restore connectivity.
 */
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

type Listener = () => void;

// Reference-count tracker subscriptions rather than using a boolean
// `started` flag: `startOnlineTracker()` is called from multiple hooks
// (`useCloudSync`, `useSyncStatus`), and React runs child effect
// cleanups before parent cleanups. A boolean flag would let the first
// unmounting caller tear down the NetInfo subscription for the entire
// app, silently disabling offline→online replay. The counter only
// removes the NetInfo listener when the last consumer unsubscribes.
let subscriberCount = 0;
let netInfoUnsubscribe: (() => void) | null = null;
// Default to `true` so first-render engines don't see a spurious
// "offline" before NetInfo delivers its first snapshot. NetInfo's own
// `fetch()` below corrects this immediately on mount.
let online = true;
const listeners = new Set<Listener>();

function applyState(state: NetInfoState): void {
  // `isInternetReachable` can legitimately be `null` on cold start
  // (NetInfo hasn't probed yet). Treat null as "assume reachable if
  // connected" so we don't over-report offline during the first
  // few hundred ms of app launch.
  const reachable =
    state.isConnected === true &&
    (state.isInternetReachable === true || state.isInternetReachable === null);
  const wasOnline = online;
  online = reachable;
  if (!wasOnline && online) {
    for (const l of listeners) {
      try {
        l();
      } catch {
        /* swallow */
      }
    }
  }
}

/**
 * Install the single NetInfo subscription. Safe to call multiple
 * times — each caller gets its own cleanup and the underlying
 * listener is only torn down when the final subscriber unmounts.
 */
export function startOnlineTracker(): () => void {
  subscriberCount += 1;
  if (subscriberCount === 1) {
    // Seed synchronously-ish: NetInfo.fetch is async, but the
    // subscription fires its current state almost immediately on most
    // platforms.
    NetInfo.fetch()
      .then(applyState)
      .catch(() => {
        /* swallow — default `online = true` stays */
      });
    netInfoUnsubscribe = NetInfo.addEventListener(applyState);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0 && netInfoUnsubscribe) {
      netInfoUnsubscribe();
      netInfoUnsubscribe = null;
    }
  };
}

export function isOnline(): boolean {
  return online;
}

export function onOnlineChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: reset module state between suites. */
export function _resetOnlineForTest(initial = true): void {
  subscriberCount = 0;
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
  online = initial;
  listeners.clear();
}
