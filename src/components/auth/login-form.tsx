"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      className="space-y-4 rounded-3xl bg-white p-7 shadow-xl"
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Login to access flood dashboard and 3D monitoring tools.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm ring-sky-200 outline-none focus:ring-2"
            placeholder="you@company.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm ring-sky-200 outline-none focus:ring-2"
            placeholder="••••••••"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
