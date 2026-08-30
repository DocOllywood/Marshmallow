import { notFound } from "next/navigation";

import { TheBestYouSureRehearsal } from "@/components/dev/TheBestYouSureRehearsal";
import { AppShell } from "@/components/AppShell";
import { isDevEnvironment } from "@/lib/env/dev-only";

export default function TheBestYouSureRehearsalPage() {
  if (!isDevEnvironment()) {
    notFound();
  }

  return (
    <AppShell>
      <TheBestYouSureRehearsal />
    </AppShell>
  );
}
