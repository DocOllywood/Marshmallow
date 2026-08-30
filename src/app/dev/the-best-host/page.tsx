import { notFound } from "next/navigation";

import { TheBestHostRehearsal } from "@/components/dev/TheBestHostRehearsal";
import { AppShell } from "@/components/AppShell";
import { isDevEnvironment } from "@/lib/env/dev-only";

export default function TheBestHostRehearsalPage() {
  if (!isDevEnvironment()) {
    notFound();
  }

  return (
    <AppShell>
      <TheBestHostRehearsal />
    </AppShell>
  );
}
