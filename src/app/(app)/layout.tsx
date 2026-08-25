import { AppShell } from "@/components/AppShell";
import { requireOnboarded } from "@/server/dal/auth";
import { getReadyRevealCount } from "@/server/dal/home";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboarded();
  let readyCount = 0;
  try {
    readyCount = await getReadyRevealCount();
  } catch {
    readyCount = 0;
  }
  return (
    <AppShell showNav readyCount={readyCount}>
      {children}
    </AppShell>
  );
}
