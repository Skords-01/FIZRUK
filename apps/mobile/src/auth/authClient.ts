import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { getApiBaseURL } from "@/api/apiUrl";

/**
 * Better Auth Expo client.
 *
 * - `baseURL` — URL API-сервера (той самий, що для web). Беремо з
 *   `EXPO_PUBLIC_API_BASE_URL`, див. `src/api/apiUrl.ts`.
 * - `expoClient` — плагін, що:
 *     • серіалізує cookie-стейт у `expo-secure-store`;
 *     • автоматично прикладає `Authorization: Bearer <token>` на
 *       наступні запити після `sign-in/email` (див. `docs/mobile/overview.md`);
 *     • підтримує redirect-и на `sergeant://` deep links.
 * - `scheme` має збігатися з `expo.scheme` у `app.json` (`sergeant`).
 */
const authClient = createAuthClient({
  baseURL: getApiBaseURL() || undefined,
  plugins: [
    expoClient({
      scheme: "sergeant",
      storagePrefix: "sergeant",
      storage: SecureStore,
    }),
  ],
});

// Публічний API мобільного Better Auth клієнта навмисно обмежений
// actions-ендпоінтами. `useSession` з `better-auth/react` НЕ
// реекспортується — замість нього у продакшн-коді використовуй
// `useUser()` з `@sergeant/api-client/react` (GET `/api/v1/me`), щоб
// mobile і web читали ту саму ідентичність. Див. `docs/mobile/overview.md` і
// `app/_layout.tsx`, де піднято `ApiClientProvider`.
export const { signIn, signUp, signOut, getSession, forgetPassword } =
  authClient;
export { authClient };
