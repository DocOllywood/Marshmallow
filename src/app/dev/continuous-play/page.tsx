import { notFound } from "next/navigation";

import { ContinuousPlayRehearsalGuide } from "@/components/dev/ContinuousPlayRehearsalGuide";
import { AppShell } from "@/components/AppShell";
import { isDevEnvironment } from "@/lib/env/dev-only";

export default function ContinuousPlayRehearsalPage() {
  if (!isDevEnvironment()) {
    notFound();
  }

  return (
    <AppShell>
      <ContinuousPlayRehearsalGuide />
    </AppShell>
  );
}
