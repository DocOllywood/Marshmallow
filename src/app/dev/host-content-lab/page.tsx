import { notFound } from "next/navigation";

import { HostContentLab } from "@/components/dev/HostContentLab";
import { AppShell } from "@/components/AppShell";
import { isDevEnvironment } from "@/lib/env/dev-only";

export default function HostContentLabPage() {
  if (!isDevEnvironment()) {
    notFound();
  }

  return (
    <AppShell>
      <HostContentLab />
    </AppShell>
  );
}
