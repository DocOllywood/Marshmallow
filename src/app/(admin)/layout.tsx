import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/server/dal/auth";

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AppShell>{children}</AppShell>;
}
