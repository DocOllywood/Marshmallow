import { AppShell } from "@/components/AppShell";
import { requireOnboardingSession } from "@/server/dal/auth";

export default async function OnboardingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingSession();
  return <AppShell>{children}</AppShell>;
}
