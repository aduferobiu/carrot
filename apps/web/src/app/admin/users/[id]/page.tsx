import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSessionToken } from "@/server/adminAuth";
import { UserDetail } from "@/components/admin/UserDetail";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }
  const { id } = await params;

  return <UserDetail userId={id} />;
}
