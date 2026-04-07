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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
