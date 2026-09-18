import { BookingsView } from "@/components/dashboard/customer/bookings-view";

export default function ProviderJobsPage() {
  return (
    <BookingsView
      perspective="provider"
      title="My jobs"
      description="Accept the work, start it when you are on site, and mark it complete when it is done."
    />
  );
}
