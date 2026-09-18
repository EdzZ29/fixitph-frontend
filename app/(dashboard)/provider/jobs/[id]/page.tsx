import { BookingDetail } from "@/components/dashboard/customer/booking-detail";

export default async function ProviderJobDetailPage({
  params,
}: PageProps<"/provider/jobs/[id]">) {
  const { id } = await params;
  return <BookingDetail bookingId={id} perspective="provider" />;
}
