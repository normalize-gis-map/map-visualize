"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { persistAuthSession } from "@/features/auth/utils/auth-session";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(4, "Password must contain at least 4 characters"),
});

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const payload = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials");
      return;
    }

    setLoading(true);
    setError(null);

    persistAuthSession({
      name: payload.email.split("@")[0] || "Operator",
      email: payload.email,
      role: "Flood Monitor",
    });

    router.replace("/");
    router.refresh();
  }

  return (
    <form
      action={onSubmit}
      className="mx-auto flex h-full max-w-md flex-col justify-center rounded-[1.75rem] border border-white/12 bg-slate-950/55 p-6 shadow-[0_24px_90px_-40px_rgba(14,116,144,0.8)] backdrop-blur-2xl sm:p-8"
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-cyan-100 uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure Access
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Sign in to access the live flood map, critical layer controls, and
          response-routing workspace.
        </p>
      </div>

      <div className="mt-7 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-[0.12em] text-slate-300 uppercase">
            Work Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-slate-700/90 bg-slate-900/90 px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="you@company.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-[0.12em] text-slate-300 uppercase">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-700/90 bg-slate-900/90 px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="••••••••"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_42px_-24px_rgba(14,165,233,1)] transition hover:from-cyan-400 hover:via-blue-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Signing in..." : "Enter command center"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
