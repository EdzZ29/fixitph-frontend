import { BookingDetail } from "@/components/dashboard/customer/booking-detail";

export default async function CustomerBookingDetailPage({
  params,
}: PageProps<"/dashboard/bookings/[id]">) {
  const { id } = await params;
  return <BookingDetail bookingId={id} />;
}
