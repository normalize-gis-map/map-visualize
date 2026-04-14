import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard/dashboard-shell";
import { AUTH_COOKIE_NAME } from "@/features/auth/constants/auth.constants";

export const metadata: Metadata = {
  title: "Flood Dashboard | Flood Warning GIS Platform",
  description:
    "Real-time flood map dashboard with 2D and 3D views, layer controls, and alert monitoring.",
};

export default async function Page() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has(AUTH_COOKIE_NAME);

  if (!isLoggedIn) {
    redirect("/login");
  }

  return <DashboardShell />;
}
