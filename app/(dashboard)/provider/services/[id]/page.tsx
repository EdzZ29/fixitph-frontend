import { ServiceForm } from "@/components/dashboard/provider/service-form";

export default async function EditServicePage({
  params,
}: PageProps<"/provider/services/[id]">) {
  const { id } = await params;
  return <ServiceForm serviceId={id} />;
}
