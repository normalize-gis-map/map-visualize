"use client";

import { useCallback, useState } from "react";

import type { AuthUser } from "@/features/auth/types/auth.types";
import {
  clearAuthSession,
  getStoredAuthUser,
} from "@/features/auth/utils/auth-session";

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  return { user, logout };
}
