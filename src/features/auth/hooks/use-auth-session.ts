"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { AuthUser } from "@/features/auth/types/auth.types";
import {
  clearAuthSession,
  getStoredAuthUser,
  subscribeAuthSession,
} from "@/features/auth/utils/auth-session";

export function useAuthSession() {
  const user = useSyncExternalStore<AuthUser | null>(
    subscribeAuthSession,
    getStoredAuthUser,
    () => null,
  );

  const logout = useCallback(() => {
    clearAuthSession();
  }, []);

  return { user, logout };
}
