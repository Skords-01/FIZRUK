import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@shared/lib/apiUrl.js";

const PUSH_SUB_KEY = "hub_push_subscribed";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Хук для управління Web Push підпискою.
 * Повертає: { supported, permission, subscribed, loading, subscribe, unsubscribe }
 */
export function usePushNotifications() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [permission, setPermission] = useState(
    supported ? Notification.permission : "denied",
  );
  const [subscribed, setSubscribed] = useState(() => {
    try {
      return localStorage.getItem(PUSH_SUB_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const vapidRes = await fetch(apiUrl("/api/push/vapid-public"));
      if (!vapidRes.ok) throw new Error("VAPID not configured");
      const { publicKey } = await vapidRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = sub.toJSON();
      const res = await fetch(apiUrl("/api/push/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subJson),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      localStorage.setItem(PUSH_SUB_KEY, "1");
      setSubscribed(true);
    } catch (e) {
      console.warn("[push] subscribe failed:", e.message);
    } finally {
      setLoading(false);
    }
  }, [supported, loading]);

  const unsubscribe = useCallback(async () => {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch(apiUrl("/api/push/subscribe"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      localStorage.removeItem(PUSH_SUB_KEY);
      setSubscribed(false);
    } catch (e) {
      console.warn("[push] unsubscribe failed:", e.message);
    } finally {
      setLoading(false);
    }
  }, [supported, loading]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
