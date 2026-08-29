import { notFound } from "next/navigation";

import { MoneyDay1Rehearsal } from "@/components/dev/MoneyDay1Rehearsal";
import { AppShell } from "@/components/AppShell";
import { isDevEnvironment } from "@/lib/env/dev-only";

export default function MoneyDay1RehearsalPage() {
  if (!isDevEnvironment()) {
    notFound();
  }

  return (
    <AppShell>
      <MoneyDay1Rehearsal />
    </AppShell>
  );
}
