import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Provider dashboard",
  description: "Manage your services, quotes and jobs on FixItPH.",
  robots: { index: false, follow: false },
};

export default function ProviderLayout({ children }: LayoutProps<"/provider">) {
  return <DashboardShell role="PROVIDER">{children}</DashboardShell>;
}
