/**
 * Floating sync-status pill. Lives at the root of every screen so the
 * user sees offline / syncing / error state regardless of which tab
 * they're on. Reads `syncError` + `pullAll` from the surrounding
 * `CloudSyncProvider` context — re-invoking `useCloudSync` here would
 * double-attach the scheduler, NetInfo listeners and periodic retry
 * timer. `pointerEvents="box-none"` keeps the safe-area wrapper from
 * intercepting touches outside the pill itself.
 */
import { SafeAreaView } from "react-native-safe-area-context";

import { useCloudSyncContext } from "@/sync/CloudSyncProvider";

import { SyncStatusIndicator } from "./SyncStatusIndicator";

export function SyncStatusOverlay() {
  const sync = useCloudSyncContext();
  return (
    <SafeAreaView
      edges={["top"]}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        alignItems: "center",
      }}
    >
      <SyncStatusIndicator
        variant="silent-when-idle"
        error={sync?.syncError ?? null}
        onRetry={sync ? () => void sync.pullAll() : undefined}
      />
    </SafeAreaView>
  );
}
