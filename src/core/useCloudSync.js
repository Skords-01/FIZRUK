import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@shared/lib/apiUrl.js";

const SYNC_MODULES = {
  finyk: {
    keys: [
      "finyk_hidden", "finyk_budgets", "finyk_subs", "finyk_assets",
      "finyk_debts", "finyk_recv", "finyk_hidden_txs", "finyk_monthly_plan",
      "finyk_tx_cats", "finyk_mono_debt_linked", "finyk_networth_history",
      "finyk_tx_splits", "finyk_custom_cats_v1",
    ],
  },
  fizruk: {
    keys: [
      "fizruk_workouts_v1", "fizruk_custom_exercises_v1",
      "fizruk_measurements_v1", "fizruk_workout_templates_v1",
      "fizruk_selected_template_id_v1", "fizruk_active_workout_id_v1",
      "fizruk_plan_template_v1", "fizruk_monthly_plan_v1",
      "fizruk_wellbeing_v1",
    ],
  },
  routine: {
    keys: ["hub_routine_v1"],
  },
  nutrition: {
    keys: [
      "nutrition_log_v1", "nutrition_pantries_v1",
      "nutrition_active_pantry_v1", "nutrition_prefs_v1",
    ],
  },
};

export const SYNC_EVENT = "hub-cloud-sync-dirty";

const LAST_PUSH_TS_KEY = "hub_sync_last_push_ts";
const SYNC_VERSION_KEY = "hub_sync_versions";
const OFFLINE_QUEUE_KEY = "hub_sync_offline_queue";
const MIGRATION_DONE_KEY = "hub_sync_migrated_users";

function getLastPushTs() {
  try {
    const v = localStorage.getItem(LAST_PUSH_TS_KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

function setLastPushTs(dt) {
  try {
    localStorage.setItem(LAST_PUSH_TS_KEY, dt.toISOString());
  } catch {
  }
}

function getModuleVersions() {
  try {
    const raw = localStorage.getItem(SYNC_VERSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setModuleVersion(userId, moduleName, version) {
  try {
    const versions = getModuleVersions();
    if (!versions[userId]) versions[userId] = {};
    versions[userId][moduleName] = version;
    localStorage.setItem(SYNC_VERSION_KEY, JSON.stringify(versions));
  } catch {
  }
}

function getModuleVersion(userId, moduleName) {
  const versions = getModuleVersions();
  return versions[userId]?.[moduleName] ?? 0;
}

function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addToOfflineQueue(entry) {
  try {
    const queue = getOfflineQueue();
    queue.push({ ...entry, ts: new Date().toISOString() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
  }
}

function clearOfflineQueue() {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
  }
}

function isMigrationDone(userId) {
  try {
    const raw = localStorage.getItem(MIGRATION_DONE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return !!map[userId];
  } catch {
    return false;
  }
}

function markMigrationDone(userId) {
  try {
    const raw = localStorage.getItem(MIGRATION_DONE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[userId] = new Date().toISOString();
    localStorage.setItem(MIGRATION_DONE_KEY, JSON.stringify(map));
  } catch {
  }
}

function collectModuleData(moduleName) {
  const config = SYNC_MODULES[moduleName];
  if (!config) return null;
  const data = {};
  for (const key of config.keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    } catch {
    }
  }
  return data;
}

function hasLocalData(moduleName) {
  const config = SYNC_MODULES[moduleName];
  if (!config) return false;
  for (const key of config.keys) {
    try {
      if (localStorage.getItem(key) !== null) return true;
    } catch {
    }
  }
  return false;
}

function applyModuleData(moduleName, data) {
  if (!data || typeof data !== "object") return;
  const config = SYNC_MODULES[moduleName];
  if (!config) return;
  for (const key of config.keys) {
    if (key in data) {
      try {
        const val = data[key];
        localStorage.setItem(
          key,
          typeof val === "string" ? val : JSON.stringify(val),
        );
      } catch {
      }
    }
  }
}

export function notifySyncDirty() {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

export function useCloudSync(user) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const syncingRef = useRef(false);

  const replayOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const modulesToPush = {};
    for (const entry of queue) {
      if (entry.type === "push" && entry.modules) {
        Object.assign(modulesToPush, entry.modules);
      }
    }

    if (Object.keys(modulesToPush).length > 0) {
      const res = await fetch(apiUrl("/api/sync/push-all"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ modules: modulesToPush }),
      });
      if (res.ok) {
        clearOfflineQueue();
      }
    }
  }, []);

  const pushAll = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    try {
      const modules = {};
      for (const mod of Object.keys(SYNC_MODULES)) {
        const data = collectModuleData(mod);
        if (data && Object.keys(data).length > 0) {
          modules[mod] = { data, clientUpdatedAt: new Date().toISOString() };
        }
      }
      if (Object.keys(modules).length === 0) return;

      if (!navigator.onLine) {
        addToOfflineQueue({ type: "push", modules });
        return;
      }

      await replayOfflineQueue();

      const res = await fetch(apiUrl("/api/sync/push-all"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ modules }),
      });
      if (!res.ok) throw new Error("Push failed");

      const result = await res.json();
      if (user?.id && result?.results) {
        for (const [mod, r] of Object.entries(result.results)) {
          if (r?.version) setModuleVersion(user.id, mod, r.version);
        }
      }

      setLastPushTs(new Date());
      setLastSync(new Date());
    } catch (err) {
      addToOfflineQueue({
        type: "push",
        modules: (() => {
          const m = {};
          for (const mod of Object.keys(SYNC_MODULES)) {
            const data = collectModuleData(mod);
            if (data && Object.keys(data).length > 0) {
              m[mod] = { data, clientUpdatedAt: new Date().toISOString() };
            }
          }
          return m;
        })(),
      });
      setSyncError(err.message);
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [user, replayOfflineQueue]);

  const pullAll = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(apiUrl("/api/sync/pull-all"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Pull failed");
      const { modules } = await res.json();
      if (modules) {
        for (const [mod, payload] of Object.entries(modules)) {
          if (payload?.data) {
            applyModuleData(mod, payload.data);
            if (user?.id && payload.version) {
              setModuleVersion(user.id, mod, payload.version);
            }
          }
        }
      }
      setLastSync(new Date());
      return true;
    } catch (err) {
      setSyncError(err.message);
      return false;
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [user]);

  const uploadLocalData = useCallback(async () => {
    if (!user?.id) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const modules = {};
      for (const mod of Object.keys(SYNC_MODULES)) {
        const data = collectModuleData(mod);
        if (data && Object.keys(data).length > 0) {
          modules[mod] = { data, clientUpdatedAt: new Date().toISOString() };
        }
      }
      if (Object.keys(modules).length > 0) {
        await fetch(apiUrl("/api/sync/push-all"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ modules }),
        });
      }
      markMigrationDone(user.id);
      setLastPushTs(new Date());
      setLastSync(new Date());
      setMigrationPending(false);
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [user]);

  const skipMigration = useCallback(() => {
    if (!user?.id) return;
    markMigrationDone(user.id);
    setMigrationPending(false);
  }, [user]);

  const initialSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    try {
      await replayOfflineQueue();

      const res = await fetch(apiUrl("/api/sync/pull-all"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Initial sync failed");
      const { modules: cloudModules } = await res.json();

      const hasCloudData = cloudModules && Object.keys(cloudModules).some(
        (m) => cloudModules[m]?.data && Object.keys(cloudModules[m].data).length > 0,
      );
      const hasAnyLocalData = Object.keys(SYNC_MODULES).some(hasLocalData);
      const migrated = isMigrationDone(user?.id);

      if (hasCloudData && !hasAnyLocalData) {
        for (const [mod, payload] of Object.entries(cloudModules)) {
          if (payload?.data) {
            applyModuleData(mod, payload.data);
            if (user?.id && payload.version) {
              setModuleVersion(user.id, mod, payload.version);
            }
          }
        }
        if (!migrated) markMigrationDone(user?.id);
      } else if (hasAnyLocalData && !hasCloudData && !migrated) {
        setMigrationPending(true);
        return;
      } else if (hasCloudData && hasAnyLocalData) {
        const lastPush = getLastPushTs();
        for (const [mod, payload] of Object.entries(cloudModules)) {
          if (!payload?.data) continue;
          const cloudTs = payload.serverUpdatedAt
            ? new Date(payload.serverUpdatedAt)
            : null;
          const localVersion = user?.id ? getModuleVersion(user.id, mod) : 0;
          const cloudVersion = payload.version ?? 0;

          if (cloudVersion > localVersion || (cloudTs && lastPush && cloudTs > lastPush)) {
            applyModuleData(mod, payload.data);
          }
          if (user?.id && payload.version) {
            setModuleVersion(user.id, mod, payload.version);
          }
        }
        const modules = {};
        for (const mod of Object.keys(SYNC_MODULES)) {
          const data = collectModuleData(mod);
          if (data && Object.keys(data).length > 0) {
            modules[mod] = { data, clientUpdatedAt: new Date().toISOString() };
          }
        }
        if (Object.keys(modules).length > 0) {
          await fetch(apiUrl("/api/sync/push-all"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ modules }),
          });
        }
        if (!migrated) markMigrationDone(user?.id);
      } else {
        if (!migrated) markMigrationDone(user?.id);
      }

      setLastPushTs(new Date());
      setLastSync(new Date());
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [user, replayOfflineQueue]);

  const didInitialSync = useRef(false);
  const lastUserId = useRef(null);
  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid !== lastUserId.current) {
      didInitialSync.current = false;
      lastUserId.current = uid;
      setMigrationPending(false);
    }
    if (!user || didInitialSync.current) return;
    didInitialSync.current = true;
    initialSync();
  }, [user, initialSync]);

  useEffect(() => {
    if (!user) return;

    const onOnline = () => {
      replayOfflineQueue().then(() => pushAll());
    };
    window.addEventListener("online", onOnline);

    const debounceTimer = { id: null };

    const schedulePush = () => {
      clearTimeout(debounceTimer.id);
      debounceTimer.id = setTimeout(() => {
        pushAll();
      }, 5000);
    };

    const onStorage = (e) => {
      if (!e.key) return;
      const isTracked = Object.values(SYNC_MODULES).some((m) =>
        m.keys.includes(e.key),
      );
      if (!isTracked) return;
      schedulePush();
    };

    const onSyncDirty = () => schedulePush();

    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_EVENT, onSyncDirty);

    const periodicInterval = setInterval(() => {
      pushAll();
    }, 2 * 60 * 1000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SYNC_EVENT, onSyncDirty);
      clearTimeout(debounceTimer.id);
      clearInterval(periodicInterval);
    };
  }, [user, pushAll, replayOfflineQueue]);

  return {
    syncing,
    lastSync,
    syncError,
    pushAll,
    pullAll,
    migrationPending,
    uploadLocalData,
    skipMigration,
  };
}
