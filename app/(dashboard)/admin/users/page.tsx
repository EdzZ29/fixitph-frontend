import { AdminUsersView } from "@/components/dashboard/admin/users-view";
import type { UserRole } from "@/lib/api/client";

const ROLES = ["CUSTOMER", "PROVIDER", "ADMIN"] as const;

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const { role } = await searchParams;
  // Links from elsewhere in the dashboard pre-filter this page. Anything the
  // role filter does not recognise is ignored rather than passed to the API.
  const initialRole = ROLES.includes(role as (typeof ROLES)[number])
    ? (role as UserRole)
    : "";

  return <AdminUsersView initialRole={initialRole} />;
}
