import { createAuthClient } from "better-auth/react";
import { apiUrl } from "@shared/lib/apiUrl.js";

const base = apiUrl("");

export const authClient = createAuthClient({
  baseURL: base || window.location.origin,
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
