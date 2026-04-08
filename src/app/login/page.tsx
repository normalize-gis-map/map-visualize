import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AUTH_COOKIE_NAME } from "@/features/auth/constants/auth.constants";

export const metadata: Metadata = {
  title: "Login | Flood Warning GIS Platform",
  description:
    "Secure login page for flood warning GIS operators and emergency monitoring users.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage() {
  const cookieStore = await cookies();

  if (cookieStore.has(AUTH_COOKIE_NAME)) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-blue-950/80" />

      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden rounded-3xl border border-white/15 bg-white/5 p-8 text-white shadow-2xl backdrop-blur lg:block">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
            Flood Monitoring Platform
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold">
            Real-time mapping for resilient city operations.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-slate-200/90">
            Track flood risk, inspect 3D buildings, and coordinate response from
            one operational map workspace.
          </p>
        </div>

        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
