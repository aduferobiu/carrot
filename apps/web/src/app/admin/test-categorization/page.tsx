import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSessionToken } from "@/server/adminAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TestCategorizationWidget } from "@/components/admin/TestCategorizationWidget";
import * as s from "@/components/admin/adminStyles";

export default async function AdminTestCategorizationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return (
    <AdminLayout title="Test Categorization" subtitle="See exactly how the live engine would categorize a sample description">
      <div style={s.card}>
        <TestCategorizationWidget />
      </div>
    </AdminLayout>
  );
}
