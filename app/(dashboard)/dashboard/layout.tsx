import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "My bookings",
  description: "Track and manage the jobs you have booked on FixItPH.",
  robots: { index: false, follow: false },
};

export default function CustomerLayout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardShell role="CUSTOMER">{children}</DashboardShell>;
}
