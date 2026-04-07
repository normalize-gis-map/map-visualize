"use client";

import { LogOut, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthSession();

  const displayName = user?.name ?? "Operator";
  const displayEmail = user?.email ?? "No email";
  const displayRole = user?.role ?? "Viewer";

  function onLogout() {
    logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
        aria-label="Account"
        onClick={() => setOpen((prev) => !prev)}
      >
        <UserCircle2 className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute top-12 right-0 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="text-xs text-slate-500">{displayEmail}</p>
            <p className="mt-1 text-xs font-medium text-sky-700">
              {displayRole}
            </p>
          </div>

          <button
            type="button"
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
