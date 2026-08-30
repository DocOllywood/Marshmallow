import { notFound } from "next/navigation";

import { TheBestRehearsal } from "@/components/dev/TheBestRehearsal";
import { AppShell } from "@/components/AppShell";
import { isDevEnvironment } from "@/lib/env/dev-only";

export default function TheBestRehearsalPage() {
  if (!isDevEnvironment()) {
    notFound();
  }

  return (
    <AppShell>
      <TheBestRehearsal />
    </AppShell>
  );
}
