import { safeReadStringLS, safeRemoveLS } from "@shared/lib/storage";

export const PWA_ACTION_KEY = "pwa_pending_action";

export function consumePwaAction() {
  const action = safeReadStringLS(PWA_ACTION_KEY);
  if (action) safeRemoveLS(PWA_ACTION_KEY);
  return action || null;
}
