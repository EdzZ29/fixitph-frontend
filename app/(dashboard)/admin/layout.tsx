import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Admin",
  description: "FixItPH platform administration.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <DashboardShell role="ADMIN">{children}</DashboardShell>;
}
