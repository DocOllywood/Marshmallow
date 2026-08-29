import { AppShell } from "@/components/AppShell";
import { MoneyBrandHeader } from "@/components/MoneyBrandHeader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <MoneyBrandHeader />
      {children}
    </AppShell>
  );
}
