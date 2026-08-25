import { AppShell } from "@/components/AppShell";
import { MarshmallowLogo } from "@/components/MarshmallowLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="pt-6">
        <MarshmallowLogo size="sm" />
      </div>
      {children}
    </AppShell>
  );
}
