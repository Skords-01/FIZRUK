import { syncApi } from "@shared/api";
import { applyModuleData } from "../state/moduleData";
import { setModuleVersion } from "../state/versions";
import type { CurrentUser, PullAllResponse } from "../types";

export interface PullArgs {
  user: CurrentUser | null | undefined;
  onStart(): void;
  onSuccess(when: Date): void;
  onError(message: string): void;
  onSettled(): void;
}

export async function pullAll(args: PullArgs): Promise<boolean> {
  const { user, onStart, onSuccess, onError, onSettled } = args;
  onStart();
  try {
    const { modules } = (await syncApi.pullAll()) as PullAllResponse;
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
    onSuccess(new Date());
    return true;
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    onSettled();
  }
}
