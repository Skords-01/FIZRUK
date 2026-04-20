/**
 * Mobile stub for the shared file-download contract.
 *
 * A real implementation (Phase 4+) will write the JSON payload to
 * `expo-file-system`'s `cacheDirectory` and hand the file URI to
 * `expo-sharing.shareAsync` so the user picks a target app (Files,
 * iMessage, email, Drive, …). Neither `expo-file-system` nor
 * `expo-sharing` is a current `apps/mobile` dependency yet, so this
 * module intentionally registers a warn-only adapter: no mobile
 * consumers call `downloadJson` today, and when Phase 4 lands we'll
 * replace this stub in one place without touching any consumer code.
 *
 * Importing this module has the side-effect of registering the stub.
 * Do this once from `app/_layout.tsx`, next to the haptic adapter.
 */

import {
  setFileDownloadAdapter,
  type FileDownloadAdapter,
} from "@sergeant/shared";

export const mobileFileDownloadAdapter: FileDownloadAdapter = {
  async downloadJson(filename) {
    console.warn(
      `[@sergeant/mobile] downloadJson("${filename}") is not wired up yet. ` +
        `The mobile adapter will land in Phase 4+ as a thin wrapper over ` +
        `expo-file-system.writeAsStringAsync + expo-sharing.shareAsync.`,
    );
  },
};

setFileDownloadAdapter(mobileFileDownloadAdapter);
