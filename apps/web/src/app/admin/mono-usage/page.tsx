import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSessionToken } from "@/server/adminAuth";
import { MonoUsage } from "@/components/admin/MonoUsage";

export default async function AdminMonoUsagePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!verifyAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return <MonoUsage />;
}
