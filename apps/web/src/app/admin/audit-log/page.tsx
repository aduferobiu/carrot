import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSessionToken } from "@/server/adminAuth";
import { AuditLog } from "@/components/admin/AuditLog";

export default async function AdminAuditLogPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return <AuditLog />;
}
