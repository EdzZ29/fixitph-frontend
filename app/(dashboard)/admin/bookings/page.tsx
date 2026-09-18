import { AdminBookingsView } from "@/components/dashboard/admin/bookings-view";
import type { BookingStatus } from "@/lib/api/client";

const STATUSES = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_PROVIDER",
  "NO_SHOW_CUSTOMER",
  "NO_SHOW_PROVIDER",
  "DISPUTED",
] as const;

export default async function AdminBookingsPage({
  searchParams,
}: PageProps<"/admin/bookings">) {
  const { status } = await searchParams;
  const initialStatus = STATUSES.includes(status as (typeof STATUSES)[number])
    ? (status as BookingStatus)
    : "";

  return <AdminBookingsView initialStatus={initialStatus} />;
}
