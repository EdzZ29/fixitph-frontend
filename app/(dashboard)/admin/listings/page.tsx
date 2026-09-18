import { AdminListingsView } from "@/components/dashboard/admin/listings-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminListingsPage({
  searchParams,
}: PageProps<"/admin/listings">) {
  const { providerId, q } = await searchParams;

  // Only a well-formed id is passed on: the API rejects anything else with a
  // 400, which would read as a broken page rather than an empty filter.
  const initialProviderId =
    typeof providerId === "string" && UUID.test(providerId) ? providerId : "";

  return (
    <AdminListingsView
      initialProviderId={initialProviderId}
      initialQuery={typeof q === "string" ? q : ""}
    />
  );
}
