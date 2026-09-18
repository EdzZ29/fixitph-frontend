import { BookingsView } from "@/components/dashboard/customer/bookings-view";

export default function CustomerBookingsPage() {
  return (
    <BookingsView
      perspective="customer"
      title="My bookings"
      description="Every job you have booked, from waiting on the provider through to done."
    />
  );
}
