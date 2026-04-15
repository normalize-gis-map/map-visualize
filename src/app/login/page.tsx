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
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-slate-950 px-4 py-6 sm:px-6 md:py-10 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(37,99,235,0.2),transparent_40%),radial-gradient(circle_at_50%_105%,rgba(30,41,59,0.72),transparent_62%)]" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2200&auto=format&fit=crop')] bg-cover bg-center opacity-15" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/88 to-blue-950/75" />

      <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/65 shadow-[0_45px_120px_-40px_rgba(2,132,199,0.6)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative flex min-h-[260px] flex-col justify-between border-b border-white/10 p-6 sm:min-h-[320px] sm:p-8 lg:min-h-[620px] lg:border-r lg:border-b-0 lg:p-10">
          <div className="absolute -top-24 left-12 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-4 bottom-8 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10">
            <p className="text-xs font-semibold tracking-[0.2em] text-cyan-200/90 uppercase">
              Flood command platform
            </p>
            <h1 className="mt-4 max-w-md text-3xl leading-tight font-semibold text-white sm:text-4xl xl:text-5xl">
              Situational awareness for high-risk weather operations.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
              Visualize flood extents, inspect exposed assets, and coordinate
              routing decisions from a single resilient geospatial workspace.
            </p>
          </div>

          <div className="relative z-10 mt-5 rounded-3xl border border-cyan-100/15 bg-slate-950/55 p-4 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-cyan-200/85 uppercase">
              Live map preview
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-3 sm:p-4">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 15 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-8 rounded-lg sm:h-9 ${
                      index % 4 === 0
                        ? "bg-cyan-400/25"
                        : index % 3 === 0
                          ? "bg-blue-500/22"
                          : "bg-slate-700/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px] p-4 sm:p-6 lg:p-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
