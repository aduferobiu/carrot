import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSessionToken } from "@/server/adminAuth";
import { UsersList } from "@/components/admin/UsersList";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return <UsersList />;
}
